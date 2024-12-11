require('newrelic');
const express = require('express');
const mysql = require('mysql2/promise');

const {
  MYSQL_HOST = 'mysql-newrelic',
  MYSQL_USER = 'root',
  MYSQL_PASSWORD = 'Pass1234',
  MYSQL_DATABASE = 'employees',
  PORT = 3000
} = process.env;

let pool;
async function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: MYSQL_HOST,
      user: MYSQL_USER,
      password: MYSQL_PASSWORD,
      database: MYSQL_DATABASE,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  }
  return pool;
}

const app = express();

app.get('/health', (req, res) => {
  res.send('API is healthy');
});

// Complex query endpoint that generates interesting performance data
app.get('/complex_query', async (req, res) => {
  try {
    const p = await getPool();
    
    // Randomize conditions to vary execution plans
    const searchPattern = `${String.fromCharCode(65 + Math.floor(Math.random() * 26))}%`;
    const salaryThreshold = Math.floor(Math.random() * 100000) + 50000;
    const birthMonth = Math.floor(Math.random() * 12) + 1;
    
    const complexQuery = `
      WITH salary_stats AS (
        SELECT 
          dept_name,
          AVG(salary) as dept_avg_salary
        FROM salary_metrics
        GROUP BY dept_name
      ),
      employee_ranks AS (
        SELECT 
          e.emp_no,
          d.dept_name,
          s.salary,
          DENSE_RANK() OVER (PARTITION BY d.dept_name ORDER BY s.salary DESC) as salary_rank
        FROM 
          employees e
          JOIN dept_emp de ON e.emp_no = de.emp_no
          JOIN departments d ON de.dept_no = d.dept_no
          JOIN salaries s ON e.emp_no = s.emp_no
      )
      SELECT 
        e.emp_no,
        UPPER(e.last_name) as last_name,
        YEAR(e.hire_date) as hire_year,
        MONTH(e.birth_date) as birth_month,
        s.salary,
        d.dept_name,
        ss.dept_avg_salary,
        er.salary_rank,
        (s.salary - ss.dept_avg_salary) as salary_diff
      FROM 
        employees e
        LEFT JOIN dept_emp de ON e.emp_no = de.emp_no
        LEFT JOIN departments d ON de.dept_no = d.dept_no
        LEFT JOIN salaries s ON e.emp_no = s.emp_no
        LEFT JOIN salary_stats ss ON d.dept_name = ss.dept_name
        LEFT JOIN employee_ranks er ON e.emp_no = er.emp_no
      WHERE 
        MONTH(e.birth_date) = ?
        AND UPPER(e.last_name) LIKE ?
        AND s.salary > ?
      ORDER BY 
        salary_rank,
        YEAR(e.hire_date),
        salary_diff DESC
      LIMIT 5000
    `;

    const [rows] = await p.query(complexQuery, [birthMonth, searchPattern, salaryThreshold]);
    res.json({ status: 'success', count: rows.length });
  } catch (err) {
    console.error('Complex query error:', err);
    res.status(500).send('Error executing complex query');
  }
});

// Lock test endpoint that creates blocking scenarios
app.get('/lock_test', async (req, res) => {
  const p = await getPool();
  const conn1 = await p.getConnection();
  const conn2 = await p.getConnection();

  try {
    await conn1.query('START TRANSACTION');
    
    // Get random employee and department
    const [[emp]] = await conn1.query(
      'SELECT e.emp_no, de.dept_no FROM employees e JOIN dept_emp de ON e.emp_no = de.emp_no ORDER BY RAND() LIMIT 1'
    );

    // Multiple updates to increase lock complexity
    await conn1.query(
      'UPDATE employees SET last_name = CONCAT(last_name, "_updated") WHERE emp_no = ?',
      [emp.emp_no]
    );
    
    await conn1.query(
      'UPDATE departments SET manager_budget = manager_budget * 1.1 WHERE dept_no = ?',
      [emp.dept_no]
    );

    // Create blocking scenario with multiple selects
    const blocking = async () => {
      await conn2.query('START TRANSACTION');
      
      // Try to read with locks
      await conn2.query(
        `SELECT e.*, d.* 
         FROM employees e 
         JOIN dept_emp de ON e.emp_no = de.emp_no 
         JOIN departments d ON de.dept_no = d.dept_no 
         WHERE e.emp_no = ? 
         FOR UPDATE`,
        [emp.emp_no]
      );
      
      await conn2.query(
        'SELECT * FROM departments WHERE dept_no = ? FOR UPDATE',
        [emp.dept_no]
      );
    };

    const start = Date.now();
    const blockingPromise = blocking();

    // Hold the lock for a while
    await new Promise(resolve => setTimeout(resolve, 2000));
    await conn1.query('COMMIT');

    await blockingPromise;
    const lockTime = Date.now() - start;

    res.json({ 
      status: 'success', 
      lockTime,
      emp_no: emp.emp_no,
      dept_no: emp.dept_no
    });
  } catch (err) {
    console.error('Lock test error:', err);
    await conn1.query('ROLLBACK').catch(() => {});
    await conn2.query('ROLLBACK').catch(() => {});
    res.status(500).send('Error in lock test');
  } finally {
    conn1.release();
    conn2.release();
  }
});

app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
});
