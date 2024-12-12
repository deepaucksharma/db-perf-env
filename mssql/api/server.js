require('newrelic');
const express = require('express');
const sql = require('mssql');
const newrelic = require('newrelic');

const app = express();

const config = {
    server: 'mssql-newrelic',
    port: 1433,
    user: process.env.MSSQL_USER,
    password: process.env.MSSQL_PASSWORD,
    database: process.env.MSSQL_DB,
    options: {
        encrypt: false
    }
};

let poolPromise = sql.connect(config);

// Health Check
app.get('/health', async (req, res) => {
    try {
        const pool = await poolPromise;
        await pool.request().query('SELECT 1');
        res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
    } catch (err) {
        console.error('Health check failed:', err);
        newrelic.noticeError(err);
        res.status(500).json({ status: 'unhealthy', error: err.message, timestamp: new Date().toISOString() });
    }
});

// Slow Query
app.get('/slow_query', async (req, res) => {
    try {
        const query = `
            WITH EmployeeHierarchy AS (
                SELECT 
                    e.emp_no,
                    e.first_name,
                    e.last_name,
                    d.dept_name,
                    s.salary,
                    1 AS level
                FROM app.employees e
                JOIN app.dept_emp de ON e.emp_no = de.emp_no
                JOIN app.departments d ON de.dept_no = d.dept_no
                JOIN app.salaries s ON e.emp_no = s.emp_no
                WHERE s.to_date = '9999-01-01'
                
                UNION ALL
                
                SELECT 
                    e2.emp_no,
                    e2.first_name,
                    e2.last_name,
                    d2.dept_name,
                    s2.salary,
                    eh.level + 1
                FROM EmployeeHierarchy eh
                JOIN app.dept_emp de2 ON eh.emp_no = de2.emp_no
                JOIN app.departments d2 ON de2.dept_no = d2.dept_no
                JOIN app.employees e2 ON de2.emp_no = e2.emp_no
                JOIN app.salaries s2 ON e2.emp_no = s2.emp_no
                WHERE s2.to_date = '9999-01-01'
                  AND eh.level < 3
            )
            SELECT 
                dept_name,
                COUNT(DISTINCT emp_no) AS emp_count,
                AVG(salary) AS avg_salary,
                MAX(level) AS hierarchy_depth
            FROM EmployeeHierarchy
            GROUP BY dept_name
            HAVING AVG(salary) > (
                SELECT AVG(salary) FROM app.salaries WHERE to_date = '9999-01-01'
            );

            WAITFOR DELAY '00:00:02';
        `;
        const pool = await poolPromise;
        const result = await pool.request().query(query);
        res.json(result.recordset);
    } catch (err) {
        console.error('Slow query error:', err);
        newrelic.noticeError(err);
        res.status(500).json({ error: err.message });
    }
});

// Slow Query - Force Table Scan
app.get('/slow_query_force_table_scan', async (req, res) => {
    try {
        const prefix = req.query.prefix || 'A%';
        const query = `
            SELECT e.*, d.*, s.*
            FROM app.employees e WITH (NOLOCK)
            JOIN app.dept_emp de ON e.emp_no = de.emp_no
            JOIN app.departments d ON de.dept_no = d.dept_no
            JOIN app.salaries s ON e.emp_no = s.emp_no
            WHERE e.birth_date > '1960-01-01'
              AND s.salary BETWEEN 40000 AND 100000
              AND e.last_name LIKE @prefix
            ORDER BY s.salary DESC
        `;
        const pool = await poolPromise;
        const result = await pool.request().input('prefix', sql.VarChar, prefix).query(query);
        res.json(result.recordset);
    } catch (err) {
        console.error('Table scan error:', err);
        newrelic.noticeError(err);
        res.status(500).json({ error: err.message });
    }
});

// Lock Contention
app.get('/lock_contention', async (req, res) => {
    try {
        const pool = await poolPromise;
        let promises = [];
        for (let i = 0; i < 5; i++) {
            promises.push((async () => {
                const transaction = new sql.Transaction(pool);
                await transaction.begin();
                const request = new sql.Request(transaction);
                const gender = (i % 2 === 0) ? 'M' : 'F';
                await request.query(`
                    UPDATE app.departments
                    SET manager_budget = manager_budget * 1.1
                    WHERE dept_no IN (
                        SELECT de.dept_no
                        FROM app.dept_emp de
                        JOIN app.employees e ON de.emp_no = e.emp_no
                        WHERE e.gender = '${gender}'
                          AND e.hire_date >= DATEADD(YEAR, -20, GETDATE())
                    );
                    WAITFOR DELAY '00:00:02'; 
                `);
                await transaction.commit();
            })());
        }
        await Promise.all(promises);
        res.json({ status: 'success' });
    } catch (err) {
        console.error('Lock contention error:', err);
        newrelic.noticeError(err);
        res.status(500).json({ error: err.message });
    }
});

// Additional Lock Contention (Salaries)
app.get('/lock_contention_salaries', async (req, res) => {
    const connections = [];
    const pool = await poolPromise;
    try {
        for (let i = 0; i < 10; i++) {
            connections.push(await pool.connect());
        }

        const transactions = connections.map(async (conn, index) => {
            await conn.query('BEGIN');
            
            const updateQuery = `
                UPDATE app.salaries s
                SET salary = salary * 1.1
                WHERE s.emp_no IN (
                    SELECT e.emp_no
                    FROM app.employees e
                    WHERE e.gender = @gender
                )
                AND s.salary BETWEEN @minSalary AND @maxSalary`;

            const minSalary = 40000 + (index * 10000);
            const maxSalary = minSalary + 20000;
            
            await conn.request()
                      .input('gender', sql.VarChar, (index % 2 === 0 ? 'M' : 'F'))
                      .input('minSalary', sql.Int, minSalary)
                      .input('maxSalary', sql.Int, maxSalary)
                      .query(updateQuery);

            await new Promise(resolve => setTimeout(resolve, 3000));
            await conn.query('COMMIT');
        });

        await Promise.all(transactions);
        res.json({ status: 'success' });
    } catch (err) {
        console.error('Lock contention salaries error:', err);
        newrelic.noticeError(err);
        await Promise.all(connections.map(conn => conn.query('ROLLBACK')));
        res.status(500).json({ error: err.message });
    } finally {
        connections.forEach(conn => conn.release());
    }
});

// Memory Pressure
app.get('/memory_pressure', async (req, res) => {
    let conn;
    const tempTableName = `#tmp_memory_test_${Date.now()}`;
    try {
        const pool = await poolPromise;
        conn = await pool.connect();
        await conn.query('BEGIN');

        await conn.query(`IF OBJECT_ID('tempdb..${tempTableName}') IS NOT NULL DROP TABLE ${tempTableName}`);

        await conn.query(`
            CREATE TABLE ${tempTableName} (
                id INT IDENTITY(1,1) PRIMARY KEY,
                employee_data NVARCHAR(MAX),
                salary_history NVARCHAR(MAX),
                department_history NVARCHAR(MAX)
            )`);

        await conn.query(`
            INSERT INTO ${tempTableName} (employee_data, salary_history, department_history)
            SELECT 
                STRING_AGG(e.first_name, ', ') WITHIN GROUP (ORDER BY e.emp_no) as employee_data,
                STRING_AGG(CAST(s.salary AS NVARCHAR(10)), ', ') WITHIN GROUP (ORDER BY s.emp_no) as salary_history,
                STRING_AGG(d.dept_name, ', ') WITHIN GROUP (ORDER BY d.dept_no) as department_history
            FROM app.employees e
            JOIN app.salaries s ON e.emp_no = s.emp_no
            JOIN app.dept_emp de ON e.emp_no = de.emp_no
            JOIN app.departments d ON de.dept_no = d.dept_no
            GROUP BY e.gender, YEAR(e.birth_date)`);

        const result = await conn.query(`SELECT TOP 1000 * FROM ${tempTableName} ORDER BY employee_data, salary_history;`);
        await conn.query('COMMIT');
        res.json(result.recordset);
    } catch (err) {
        if (conn) await conn.query('ROLLBACK');
        console.error('Memory pressure error:', err);
        newrelic.noticeError(err);
        res.status(500).json({ error: err.message });
    } finally {
        if (conn) {
            try {
                await conn.query(`IF OBJECT_ID('tempdb..${tempTableName}') IS NOT NULL DROP TABLE ${tempTableName}`);
                conn.release();
            } catch (cleanupErr) {
                console.error('Cleanup error:', cleanupErr);
            }
        }
    }
});

// Additional Memory Pressure
app.get('/memory_pressure_generate_memory_pressure', async (req, res) => {
    const pool = await poolPromise;
    const conn = await pool.connect();
    try {
        await conn.query(`IF OBJECT_ID('dbo.large_temp_table') IS NOT NULL DROP TABLE large_temp_table`);

        await conn.query(`
            CREATE TABLE large_temp_table (
                id INT IDENTITY(1,1) PRIMARY KEY,
                employee_data NVARCHAR(MAX),
                salary_history NVARCHAR(MAX),
                department_history NVARCHAR(MAX)
            )`);

        const insertQuery = `
            INSERT INTO large_temp_table (employee_data, salary_history, department_history)
            SELECT 
                STRING_AGG(e.first_name, ', ') WITHIN GROUP (ORDER BY e.emp_no) as employee_data,
                STRING_AGG(CAST(s.salary AS NVARCHAR(10)), ', ') WITHIN GROUP (ORDER BY s.emp_no) as salary_history,
                STRING_AGG(d.dept_name, ', ') WITHIN GROUP (ORDER BY d.dept_no) as department_history
            FROM app.employees e
            JOIN app.salaries s ON e.emp_no = s.emp_no
            JOIN app.dept_emp de ON e.emp_no = de.emp_no
            JOIN app.departments d ON de.dept_no = d.dept_no
            GROUP BY e.gender, YEAR(e.birth_date)`;

        await conn.query(insertQuery);

        const result = await conn.query(`SELECT TOP 1000 * FROM large_temp_table ORDER BY employee_data, salary_history;`);
        res.json(result.recordset);
    } catch (err) {
        console.error('Memory pressure generate error:', err);
        newrelic.noticeError(err);
        res.status(500).json({ error: err.message });
    } finally {
        try {
            await conn.query(`IF OBJECT_ID('dbo.large_temp_table') IS NOT NULL DROP TABLE large_temp_table`);
        } catch (cleanupErr) {
            console.error('Cleanup error:', cleanupErr);
        }
        conn.release();
    }
});

// Blocking Sessions
app.get('/blocking_sessions', async (req, res) => {
    const pool = await poolPromise;
    const connections = [];
    let transactionStarted = false;
    try {
        for (let i = 0; i < 5; i++) {
            connections.push(await pool.connect());
        }

        transactionStarted = true;

        const promises = connections.map(async (conn) => {
            try {
                await conn.query('BEGIN');
                
                const query = `
                    UPDATE app.employees e
                    SET last_modified = GETDATE()
                    WHERE e.emp_no IN (
                        SELECT de.emp_no
                        FROM app.dept_emp de
                        WHERE de.dept_no IN (
                            SELECT dept_no 
                            FROM app.departments 
                            ORDER BY dept_name
                        )
                    )`;
                await conn.query(query);
                await new Promise(resolve => setTimeout(resolve, 5000));
                await conn.query('COMMIT');
            } catch (err) {
                await conn.query('ROLLBACK');
                throw err;
            }
        });

        await Promise.all(promises);
        res.json({ status: 'success' });
    } catch (err) {
        console.error('Blocking session error:', err);
        newrelic.noticeError(err);
        if (transactionStarted) {
            await Promise.allSettled(connections.map(conn => conn.query('ROLLBACK').catch(console.error)));
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

app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    newrelic.noticeError(err);
    res.status(500).json({ error: 'Internal server error', message: err.message, timestamp: new Date().toISOString() });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`MSSQL Perf API running on port ${port} in ${process.env.NODE_ENV || 'development'} mode`);
    console.log(`Health check endpoint: http://localhost:${port}/health`);
});
