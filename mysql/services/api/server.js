// Load New Relic instrumentation first, before other modules
import 'newrelic';

import express from 'express';
import { createPool } from 'mysql2/promise';

const app = express();

// Database pool configuration
const pool = createPool({
    host: process.env.MYSQL_HOST,
    port: process.env.MYSQL_PORT,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 25,
    queueLimit: 0,
    namedPlaceholders: true,
    connectTimeout: 10000
});

// Health Check
app.get('/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.status(200).json({ 
            status: 'healthy',
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        console.error('Health check failed:', err);
        res.status(500).json({ 
            status: 'unhealthy', 
            error: err.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Slow Query - Complex Recursive CTE
app.get('/slow_query', async (req, res) => {
    try {
        console.log('Starting slow query execution:', new Date().toISOString());
        const query = `
            WITH RECURSIVE employee_hierarchy AS (
                SELECT 
                    e.emp_no,
                    e.first_name,
                    e.last_name,
                    d.dept_name,
                    s.salary,
                    1 as level
                FROM employees e
                JOIN dept_emp de ON e.emp_no = de.emp_no
                JOIN departments d ON de.dept_no = d.dept_no
                JOIN salaries s ON e.emp_no = s.emp_no
                WHERE s.to_date = '9999-01-01'
                
                UNION ALL
                
                SELECT 
                    e2.emp_no,
                    e2.first_name,
                    e2.last_name,
                    d2.dept_name,
                    s2.salary,
                    h.level + 1
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
                COUNT(DISTINCT emp_no) AS emp_count,
                AVG(salary) AS avg_salary,
                MAX(level) AS hierarchy_depth,
                GROUP_CONCAT(DISTINCT CONCAT(first_name, ' ', last_name) ORDER BY salary DESC) AS top_earners
            FROM employee_hierarchy
            GROUP BY dept_name
            HAVING avg_salary > (
                SELECT AVG(salary) FROM salaries WHERE to_date = '9999-01-01'
            )
            ORDER BY avg_salary DESC`;

        const [results] = await pool.query(query);
        console.log('Slow query completed:', new Date().toISOString());
        res.json(results);
    } catch (err) {
        console.error('Slow query error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Slow Query - Force Table Scan
app.get('/slow_query_force_table_scan', async (req, res) => {
    try {
        const query = `
            SELECT e.*, d.*, s.*
            FROM employees e
            JOIN dept_emp de ON e.emp_no = de.emp_no
            JOIN departments d ON de.dept_no = d.dept_no
            JOIN salaries s ON e.emp_no = s.emp_no
            WHERE e.birth_date > '1960-01-01'
              AND s.salary BETWEEN 40000 AND 100000
              AND e.last_name LIKE CONCAT(?, '%')
            ORDER BY s.salary DESC`;
        
        const [results] = await pool.query(query, ['A']);
        res.json(results);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Lock Contention Generator
app.get('/lock_contention', async (req, res) => {
    const connections = [];
    let transactionStarted = false;
    
    try {
        for (let i = 0; i < 5; i++) {
            connections.push(await pool.getConnection());
        }

        transactionStarted = true;
        
        const transactions = connections.map(async (conn, index) => {
            try {
                await conn.beginTransaction();
                
                const updateQuery = `
                    UPDATE departments d
                    JOIN dept_emp de ON d.dept_no = de.dept_no
                    JOIN employees e ON de.emp_no = e.emp_no
                    SET d.manager_budget = d.manager_budget * 1.1
                    WHERE e.gender = ?
                    AND e.hire_date >= DATE_SUB(CURDATE(), INTERVAL ? YEAR)`;

                await conn.query(updateQuery, [
                    index % 2 === 0 ? 'M' : 'F',
                    20 - index
                ]);
                
                await new Promise(resolve => setTimeout(resolve, 2000));
                await conn.commit();
            } catch (err) {
                await conn.rollback();
                throw err;
            }
        });

        await Promise.all(transactions);
        res.json({ status: 'success' });
    } catch (err) {
        console.error('Lock contention error:', err);
        if (transactionStarted) {
            await Promise.allSettled(connections.map(conn => conn.rollback().catch(console.error)));
        }
        res.status(500).json({ error: err.message });
    } finally {
        await Promise.allSettled(connections.map(conn => {
            try {
                conn.release();
            } catch (releaseErr) {
                console.error('Connection release error:', releaseErr);
            }
        }));
    }
});

// Additional Lock Contention
app.get('/lock_contention_create_lock_contention', async (req, res) => {
    const connections = [];
    try {
        for (let i = 0; i < 10; i++) {
            connections.push(await pool.getConnection());
        }

        const transactions = connections.map(async (conn, index) => {
            await conn.beginTransaction();
            
            const updateQuery = `
                UPDATE salaries s
                JOIN employees e ON s.emp_no = e.emp_no
                SET s.salary = s.salary * 1.1
                WHERE e.gender = ?
                AND s.salary BETWEEN ? AND ?`;
            
            const minSalary = 40000 + (index * 10000);
            const maxSalary = minSalary + 20000;
            
            await conn.query(updateQuery, [
                index % 2 === 0 ? 'M' : 'F',
                minSalary,
                maxSalary
            ]);
            
            await new Promise(resolve => setTimeout(resolve, 3000));
            await conn.commit();
        });

        await Promise.all(transactions);
        res.json({ status: 'success' });
    } catch (err) {
        await Promise.all(connections.map(conn => conn.rollback()));
        res.status(500).json({ error: err.message });
    } finally {
        connections.forEach(conn => conn.release());
    }
});

// Memory Pressure
app.get('/memory_pressure', async (req, res) => {
    let conn;
    const tempTableName = `tmp_memory_test_${Date.now()}`;
    
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        // Always drop the table if it exists just as a safety measure
        await conn.query(`DROP TEMPORARY TABLE IF EXISTS ${tempTableName}`);

        await conn.query(`
            CREATE TEMPORARY TABLE ${tempTableName} (
                id INT AUTO_INCREMENT PRIMARY KEY,
                employee_data TEXT,
                salary_history TEXT,
                department_history TEXT,
                INDEX(id)
            )`);

        await conn.query(`
            INSERT INTO ${tempTableName} (employee_data, salary_history, department_history)
            SELECT 
                GROUP_CONCAT(e.first_name ORDER BY e.emp_no) as employee_data,
                GROUP_CONCAT(s.salary ORDER BY s.emp_no) as salary_history,
                GROUP_CONCAT(d.dept_name) as department_history
            FROM employees e
            JOIN salaries s ON e.emp_no = s.emp_no
            JOIN dept_emp de ON e.emp_no = de.emp_no
            JOIN departments d ON de.dept_no = d.dept_no
            GROUP BY e.gender, YEAR(e.birth_date)`);

        const [results] = await conn.query(`
            SELECT * FROM ${tempTableName}
            ORDER BY employee_data, salary_history
            LIMIT 1000`);

        await conn.commit();
        res.json(results);
    } catch (err) {
        if (conn) await conn.rollback();
        console.error('Memory pressure error:', err);
        res.status(500).json({ error: err.message });
    } finally {
        if (conn) {
            try {
                await conn.query(`DROP TEMPORARY TABLE IF EXISTS ${tempTableName}`);
                conn.release();
            } catch (cleanupErr) {
                console.error('Cleanup error:', cleanupErr);
            }
        }
    }
});

// Additional Memory Pressure
app.get('/memory_pressure_generate_memory_pressure', async (req, res) => {
    const conn = await pool.getConnection();
    try {
        // Drop if exists to avoid the "table already exists" error
        await conn.query(`DROP TEMPORARY TABLE IF EXISTS large_temp_table`);
        
        await conn.query(`
            CREATE TEMPORARY TABLE large_temp_table (
                id INT AUTO_INCREMENT PRIMARY KEY,
                employee_data TEXT,
                salary_history TEXT,
                department_history TEXT,
                INDEX(id)
            )`);

        const insertQuery = `
            INSERT INTO large_temp_table (employee_data, salary_history, department_history)
            SELECT 
                GROUP_CONCAT(e.first_name ORDER BY e.emp_no) as employee_data,
                GROUP_CONCAT(s.salary ORDER BY s.emp_no) as salary_history,
                GROUP_CONCAT(d.dept_name) as department_history
            FROM employees e
            JOIN salaries s ON e.emp_no = s.emp_no
            JOIN dept_emp de ON e.emp_no = de.emp_no
            JOIN departments d ON de.dept_no = d.dept_no
            GROUP BY e.gender, YEAR(e.birth_date)`;

        await conn.query(insertQuery);
        
        const [results] = await conn.query(`
            SELECT * FROM large_temp_table
            ORDER BY employee_data, salary_history
            LIMIT 1000`);

        res.json(results);
    } catch (err) {
        console.error('Memory pressure generate error:', err);
        res.status(500).json({ error: err.message });
    } finally {
        // Ensure table cleanup
        try {
            await conn.query(`DROP TEMPORARY TABLE IF EXISTS large_temp_table`);
        } catch (cleanupErr) {
            console.error('Cleanup error:', cleanupErr);
        }
        conn.release();
    }
});

// Blocking Sessions
app.get('/blocking_sessions', async (req, res) => {
    const connections = [];
    let transactionStarted = false;

    try {
        for (let i = 0; i < 5; i++) {
            connections.push(await pool.getConnection());
        }

        transactionStarted = true;

        const promises = connections.map(async (conn) => {
            try {
                await conn.beginTransaction();
                
                const query = `
                    UPDATE employees e
                    JOIN dept_emp de ON e.emp_no = de.emp_no
                    SET e.last_modified = NOW()
                    WHERE de.dept_no IN (
                        SELECT dept_no 
                        FROM departments 
                        ORDER BY dept_name
                    )`;

                await conn.query(query);
                await new Promise(resolve => setTimeout(resolve, 5000));
                await conn.commit();
            } catch (err) {
                await conn.rollback();
                throw err;
            }
        });

        await Promise.all(promises);
        res.json({ status: 'success' });
    } catch (err) {
        console.error('Blocking session error:', err);
        if (transactionStarted) {
            await Promise.allSettled(connections.map(conn => conn.rollback().catch(console.error)));
        }
        res.status(500).json({ error: err.message });
    } finally {
        await Promise.allSettled(connections.map(conn => {
            try {
                conn.release();
            } catch (releaseErr) {
                console.error('Connection release error:', releaseErr);
            }
        }));
    }
});

// Error Handling Middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        message: err.message,
        timestamp: new Date().toISOString()
    });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port} in ${process.env.NODE_ENV || 'development'} mode`);
    console.log(`Health check endpoint: http://localhost:${port}/health`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received. Starting graceful shutdown...');
    await pool.end();
    process.exit(0);
});
