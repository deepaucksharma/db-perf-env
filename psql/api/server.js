require('newrelic');
const express = require('express');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

const app = express();

// Middleware to track all requests
app.use((req, res, next) => {
  const startTime = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    newrelic.recordMetric('Custom/API/RequestDuration', duration);
  });
  next();
});

// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'healthy' });
  } catch (err) {
    res.status(500).json({ status: 'unhealthy', error: err.message });
  }
});

// Complex query endpoint
app.get('/query/complex', async (req, res) => {
  const client = await pool.connect();
  try {
    const searchPattern = `${['A','B','C'][Math.floor(Math.random() * 3)]}%`;
    const salaryThreshold = 50000 + Math.floor(Math.random() * 50000);

    const { rows } = await client.query(`
      WITH RankedEmployees AS (
        SELECT 
          e.emp_no,
          e.name_upper,
          d.dept_name,
          s.salary,
          ROW_NUMBER() OVER (PARTITION BY d.dept_no ORDER BY s.salary DESC) as salary_rank
        FROM employees e
        JOIN dept_emp de ON e.emp_no = de.emp_no
        JOIN departments d ON de.dept_no = d.dept_no
        JOIN salaries s ON e.emp_no = s.emp_no
        WHERE 
          e.name_upper LIKE $1
          AND s.salary > $2
          AND de.to_date = '9999-12-31'
      )
      SELECT * FROM RankedEmployees WHERE salary_rank <= 10
    `, [searchPattern, salaryThreshold]);

    res.json({ rows });
  } catch (err) {
    newrelic.noticeError(err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Lock generation endpoint
app.get('/query/lock', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { rows: [employee] } = await client.query(`
      SELECT emp_no FROM employees 
      WHERE emp_no IN (
        SELECT emp_no FROM salaries 
        WHERE salary > 100000
      )
      ORDER BY RANDOM() 
      LIMIT 1
    `);

    if (!employee) {
      await client.query('ROLLBACK');
      throw new Error('No suitable employee found');
    }

    await client.query('SELECT pg_sleep(1)');
    await client.query(`
      UPDATE employees 
      SET last_name = last_name || '_updated' 
      WHERE emp_no = $1
    `, [employee.emp_no]);
    
    await client.query('COMMIT');
    res.json({ status: 'success', emp_no: employee.emp_no });
  } catch (err) {
    await client.query('ROLLBACK');
    newrelic.noticeError(err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Stats refresh endpoint
app.get('/query/stats', async (req, res) => {
  const client = await pool.connect();
  try {
    const startTime = Date.now();
    await client.query('REFRESH MATERIALIZED VIEW dept_stats');
    const duration = Date.now() - startTime;
    
    res.json({ 
      status: 'success', 
      duration,
      refreshed: new Date().toISOString() 
    });
  } catch (err) {
    newrelic.noticeError(err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`API running on port ${port}`));
