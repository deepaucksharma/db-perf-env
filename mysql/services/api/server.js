import newrelic from 'newrelic';
import express from 'express';
import { createPool } from 'mysql2/promise';
import asyncHandler from 'express-async-handler';

const app = express();

// Enhanced pool configuration for better performance monitoring
const pool = createPool({
    host: process.env.MYSQL_HOST,
    port: process.env.MYSQL_PORT,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

// Custom NewRelic event recording with enhanced attributes
function recordCustomEvent(eventType, attributes) {
    newrelic.recordCustomEvent(eventType, {
        ...attributes,
        timestamp: Date.now(),
        environment: process.env.NODE_ENV,
        serverInstance: process.env.HOSTNAME
    });
}

// Enhanced database query wrapper with NewRelic instrumentation
async function executeQuery(query, params = [], customSegmentName = '') {
    return await newrelic.startSegment(
        customSegmentName || 'database-query',
        true,
        async () => {
            const startTime = process.hrtime();
            try {
                const [results] = await pool.query(query, params);
                const [s, ns] = process.hrtime(startTime);
                const duration = s * 1000 + ns / 1000000;
                
                // Enhanced query metrics
                newrelic.recordMetric(
                    `Custom/Database/Query/${customSegmentName}`,
                    duration
                );
                
                // Record query execution details
                recordCustomEvent('DatabaseQuery', {
                    query: query.substring(0, 1000),
                    duration,
                    rowCount: results.length,
                    paramCount: params.length,
                    success: true,
                    customSegment: customSegmentName
                });
                
                return results;
            } catch (error) {
                // Enhanced error recording
                recordCustomEvent('DatabaseError', {
                    query: query.substring(0, 1000),
                    error: error.message,
                    code: error.code,
                    state: error.sqlState,
                    customSegment: customSegmentName
                });
                throw error;
            }
        }
    );
}

// Basic health check
app.get('/health', asyncHandler(async (req, res) => {
    await executeQuery('SELECT 1', [], 'HealthCheck');
    res.json({ status: 'healthy' });
}));

// Complex join query
app.get('/complex_join', asyncHandler(async (req, res) => {
    const results = await executeQuery(
        `SELECT e.emp_no, e.first_name, e.last_name, 
                d.dept_name, s.salary, e.hire_date,
                e.birth_date, e.gender
         FROM employees e
         JOIN dept_emp de ON e.emp_no = de.emp_no AND de.to_date = '9999-01-01'
         JOIN departments d ON d.dept_no = de.dept_no
         JOIN salaries s ON s.emp_no = e.emp_no AND s.to_date = '9999-01-01'
         WHERE e.hire_year >= 2000
         AND d.dept_name IN ('IT', 'Sales', 'Research and Development')
         ORDER BY s.salary DESC
         LIMIT 5000`,
        [],
        'ComplexJoinQuery'
    );
    
    newrelic.recordMetric('Custom/Results/ComplexJoin/RowCount', results.length);
    res.json({ count: results.length, rows: results });
}));

// Random search with varying patterns
app.get('/random_search', asyncHandler(async (req, res) => {
    const searchType = Math.random();
    let query, params, segmentName;

    if (searchType < 0.33) {
        const month = Math.floor(Math.random() * 12) + 1;
        query = `
            SELECT emp_no, first_name, last_name, birth_date, hire_date
            FROM employees 
            WHERE birth_month = ?
            ORDER BY last_name ASC
            LIMIT 1000
        `;
        params = [month];
        segmentName = 'BirthMonthSearch';
    } else if (searchType < 0.66) {
        const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
        query = `
            SELECT emp_no, first_name, last_name, birth_date, hire_date
            FROM employees
            WHERE last_name LIKE ?
            ORDER BY hire_date DESC
            LIMIT 1000
        `;
        params = [`${letter}%`];
        segmentName = 'LastNameSearch';
    } else {
        const year = 1990 + Math.floor(Math.random() * 30);
        query = `
            SELECT emp_no, first_name, last_name, birth_date, hire_date
            FROM employees
            WHERE hire_year = ?
            ORDER BY emp_no ASC
            LIMIT 1000
        `;
        params = [year];
        segmentName = 'HireYearSearch';
    }

    const results = await executeQuery(query, params, segmentName);
    res.json({ count: results.length, rows: results });
}));

// Heavy aggregation query
app.get('/huge_group_by', asyncHandler(async (req, res) => {
    const results = await executeQuery(
        `SELECT 
            e.hire_year,
            e.gender,
            e.salary_tier,
            COUNT(*) as emp_count,
            AVG(s.salary) as avg_salary,
            MIN(s.salary) as min_salary,
            MAX(s.salary) as max_salary,
            COUNT(DISTINCT d.dept_no) as dept_count
         FROM employees e
         JOIN salaries s ON e.emp_no = s.emp_no AND s.to_date = '9999-01-01'
         JOIN dept_emp d ON e.emp_no = d.emp_no AND d.to_date = '9999-01-01'
         GROUP BY e.hire_year, e.gender, e.salary_tier
         HAVING emp_count > 10
         ORDER BY hire_year DESC, avg_salary DESC`,
        [],
        'HugeGroupByQuery'
    );
    
    newrelic.recordMetric('Custom/Results/GroupBy/Groups', results.length);
    res.json({ count: results.length, rows: results });
}));

// Low selectivity query
app.get('/low_selectivity', asyncHandler(async (req, res) => {
    const gender = Math.random() < 0.5 ? 'M' : 'F';
    const results = await executeQuery(
        `SELECT 
            e.emp_no, e.first_name, e.last_name, e.gender,
            e.birth_date, e.hire_date, s.salary
         FROM employees e
         JOIN salaries s ON e.emp_no = s.emp_no
         WHERE e.birth_date > '1970-01-01'
         AND s.to_date = '9999-01-01'
         AND e.gender = ?
         ORDER BY e.birth_date ASC
         LIMIT 10000`,
        [gender],
        'LowSelectivityQuery'
    );
    
    res.json({ count: results.length, rows: results });
}));

// Memory pressure test
app.get('/memory_pressure', asyncHandler(async (req, res) => {
    const results = await executeQuery(
        `SELECT 
            e.emp_no, e.first_name, e.last_name, e.gender,
            e.birth_date, e.hire_date, s.salary,
            d.dept_name,
            COUNT(*) OVER (PARTITION BY e.salary_tier) as tier_count
         FROM employees e
         JOIN salaries s ON e.emp_no = s.emp_no AND s.to_date = '9999-01-01'
         JOIN dept_emp de ON e.emp_no = de.emp_no AND de.to_date = '9999-01-01'
         JOIN departments d ON de.dept_no = d.dept_no
         WHERE s.salary > 50000
         ORDER BY s.salary DESC
         LIMIT 10000`,
        [],
        'MemoryPressureQuery'
    );
    
    res.json({ count: results.length, rows: results });
}));

// Lock contention simulation
app.get('/lock_contention', asyncHandler(async (req, res) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        
        await executeQuery(
            `UPDATE salaries s
             JOIN employees e ON s.emp_no = e.emp_no
             SET s.salary = s.salary * 1.02
             WHERE e.gender = 'M' 
             AND s.to_date = '9999-01-01'
             AND e.salary_tier IN (1, 2)`,
            [],
            'LockContentionQuery'
        );
        
        // Hold locks for a while
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        await conn.commit();
        res.json({ status: 'completed' });
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
}));

// DDL lock simulation
app.get('/ddl_lock', asyncHandler(async (req, res) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        
        await executeQuery(
            `UPDATE departments 
             SET manager_budget = manager_budget * 1.001 
             WHERE dept_no IN ('d001', 'd002', 'd003')`,
            [],
            'DDLLockQuery'
        );
        
        // Simulate concurrent DDL operation
        setTimeout(async () => {
            const conn2 = await pool.getConnection();
            try {
                await executeQuery(
                    `ALTER TABLE salaries 
                     ADD INDEX idx_temp_salary (salary) ALGORITHM=INPLACE`,
                    [],
                    'DDLOperation'
                );
            } catch (error) {
                console.error("DDL error:", error);
            } finally {
                conn2.release();
            }
        }, 1000);

        await new Promise(resolve => setTimeout(resolve, 3000));
        
        await conn.commit();
        res.json({ status: 'completed' });
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
}));

// Enhanced error handling
app.use((err, req, res, next) => {
    newrelic.noticeError(err, {
        requestUrl: req.url,
        requestMethod: req.method,
        custom: {
            handler: req.route?.path,
            query: req.query,
            body: req.body
        }
    });
    
    console.error('Error:', err);
    
    res.status(500).json({ 
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Start server with enhanced logging
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    newrelic.recordCustomEvent('ServerStart', {
        port: PORT,
        environment: process.env.NODE_ENV,
        timestamp: Date.now()
    });
});