import 'newrelic';
import express from 'express';
import { createPool } from 'mysql2/promise';
import asyncHandler from 'express-async-handler';

const app = express();

const pool = createPool({
    host: process.env.MYSQL_HOST,
    port: parseInt(process.env.MYSQL_PORT || '3306', 10),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 25,
    queueLimit: 0,
    enableKeepAlive: false
});

// Complex analytical query
app.get('/employee-analysis', asyncHandler(async (req, res) => {
    const query = `
        WITH RECURSIVE employee_hierarchy AS (
            SELECT 
                e.emp_no,
                e.first_name,
                e.last_name,
                d.dept_name,
                s.salary,
                1 as level,
                e.salary_tier,
                CAST(CONCAT(e.emp_no) AS CHAR(1000)) as path
            FROM employees e
            JOIN dept_emp de ON e.emp_no = de.emp_no
            JOIN departments d ON de.dept_no = d.dept_no
            JOIN salaries s ON e.emp_no = s.emp_no
            WHERE s.to_date = '9999-01-01'
            AND (e.last_name LIKE 'A%' OR e.last_name LIKE 'B%')
            
            UNION ALL
            
            SELECT 
                e2.emp_no,
                e2.first_name,
                e2.last_name,
                d2.dept_name,
                s2.salary,
                h.level + 1,
                e2.salary_tier,
                CONCAT(h.path, ',', e2.emp_no)
            FROM employee_hierarchy h
            JOIN dept_emp de2 ON h.emp_no = de2.emp_no
            JOIN departments d2 ON de2.dept_no = d2.dept_no
            JOIN employees e2 ON de2.emp_no = e2.emp_no
            JOIN salaries s2 ON e2.emp_no = s2.emp_no
            WHERE s2.to_date = '9999-01-01'
            AND h.level < 3
        )
        SELECT 
            dept_name,
            COUNT(DISTINCT emp_no) as emp_count,
            AVG(salary) as avg_salary,
            MAX(level) as hierarchy_depth,
            GROUP_CONCAT(DISTINCT CONCAT(first_name, ' ', last_name) 
                ORDER BY salary DESC SEPARATOR '; ' LIMIT 10) as top_earners,
            SUM(CASE WHEN salary_tier = 1 THEN 1 ELSE 0 END) as tier1_count,
            SUM(CASE WHEN salary_tier = 4 THEN 1 ELSE 0 END) as tier4_count,
            path
        FROM employee_hierarchy
        GROUP BY dept_name, path
        HAVING avg_salary > (
            SELECT AVG(salary) * 0.8 FROM salaries WHERE to_date = '9999-01-01'
        )
        ORDER BY avg_salary DESC`;

    const [results] = await pool.query(query);
    res.json(results);
}));

// Memory-intensive operation
app.get('/salary-distribution', asyncHandler(async (req, res) => {
    const detailed = req.query.detailed === 'true';
    const conn = await pool.getConnection();
    
    try {
        await conn.query('DROP TEMPORARY TABLE IF EXISTS salary_stats');
        await conn.query(`
            CREATE TEMPORARY TABLE salary_stats AS
            SELECT 
                d.dept_name,
                e.gender,
                e.birth_month,
                e.hire_year,
                e.salary_tier,
                s.salary,
                NTILE(100) OVER (PARTITION BY d.dept_name ORDER BY s.salary) as percentile,
                COUNT(*) OVER (PARTITION BY d.dept_name) as dept_count,
                AVG(s.salary) OVER (
                    PARTITION BY d.dept_name, e.gender
                    ORDER BY s.from_date
                    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
                ) as cumulative_avg_by_gender,
                DENSE_RANK() OVER (ORDER BY s.salary DESC) as salary_rank
            FROM employees e
            JOIN dept_emp de ON e.emp_no = de.emp_no
            JOIN departments d ON de.dept_no = d.dept_no
            JOIN salaries s ON e.emp_no = s.emp_no
            WHERE s.to_date = '9999-01-01'`);

        const query = detailed ? `
            SELECT 
                dept_name,
                gender,
                birth_month,
                hire_year,
                salary_tier,
                AVG(salary) as avg_salary,
                MIN(salary) as min_salary,
                MAX(salary) as max_salary,
                COUNT(*) as employee_count,
                AVG(cumulative_avg_by_gender) as avg_cumulative_by_gender,
                GROUP_CONCAT(DISTINCT percentile ORDER BY percentile) as percentile_distribution
            FROM salary_stats
            GROUP BY 
                dept_name, 
                gender, 
                birth_month,
                hire_year,
                salary_tier
            WITH ROLLUP` :
            `SELECT 
                dept_name,
                gender,
                AVG(salary) as avg_salary,
                COUNT(*) as employee_count
            FROM salary_stats
            GROUP BY dept_name, gender`;

        const [results] = await conn.query(query);
        res.json(results);
    } finally {
        conn.release();
    }
}));

// Lock contention generator
app.get('/update-salaries', asyncHandler(async (req, res) => {
    const connections = await Promise.all(Array(5).fill().map(() => pool.getConnection()));
    
    try {
        await Promise.all(connections.map(async (conn, index) => {
            await conn.beginTransaction();
            
            const targetTier = (index % 4) + 1;
            const query = `
                UPDATE salaries s
                JOIN employees e ON s.emp_no = e.emp_no
                JOIN dept_emp de ON e.emp_no = de.emp_no
                JOIN departments d ON de.dept_no = d.dept_no
                SET s.salary = s.salary * ?
                WHERE e.salary_tier = ?
                AND s.to_date = '9999-01-01'
                AND de.to_date = '9999-01-01'`;
            
            const multiplier = 1 + (Math.random() * 0.2 - 0.1); // ±10%
            
            await conn.query(query, [multiplier, targetTier]);
            await new Promise(resolve => setTimeout(resolve, 500));
            await conn.commit();
        }));
        
        res.json({ status: 'success' });
    } catch (error) {
        await Promise.all(connections.map(conn => conn.rollback()));
        throw error;
    } finally {
        connections.forEach(conn => conn.release());
    }
}));

// Health check
app.get('/health', asyncHandler(async (req, res) => {
    await pool.query('SELECT 1');
    res.json({ status: 'healthy' });
}));

app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: err.message });
});

const port = process.env.API_PORT || 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

process.on('SIGTERM', async () => {
    await pool.end();
    process.exit(0);
});