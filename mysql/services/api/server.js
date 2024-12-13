'use strict';

const newrelic = require('newrelic');
const express = require('express');
const { createPool } = require('mysql2/promise');
const asyncHandler = require('express-async-handler');
const app = express();

const pool = createPool({
    host: process.env.MYSQL_HOST,
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function executeQuery(query, params = [], customSegmentName = '') {
    return await newrelic.startSegment(
        customSegmentName || 'database-query',
        true,
        async () => {
            try {
                const [results] = await pool.query(query, params);
                return results;
            } catch (error) {
                console.error('Query Error:', error);
                throw error;
            }
        }
    );
}

// Random search - updated to handle current salaries
app.get('/random_search', asyncHandler(async (req, res) => {
    const month = Math.floor(Math.random() * 12) + 1;
    const results = await executeQuery(
        `SELECT 
            e.emp_no, 
            e.first_name, 
            e.last_name, 
            e.birth_date, 
            e.hire_date,
            s.salary as current_salary
         FROM employees e
         LEFT JOIN salaries s ON e.emp_no = s.emp_no 
         AND s.to_date = '9999-01-01'
         WHERE e.birth_month = ?
         ORDER BY e.last_name ASC
         LIMIT 100`,
        [month],
        'RandomSearchQuery'
    );
    
    res.json({ count: results.length, rows: results });
}));

// Aggregation - updated with proper joins and grouping
app.get('/aggregation', asyncHandler(async (req, res) => {
    const results = await executeQuery(
        `SELECT 
            e.hire_year,
            e.gender,
            e.salary_tier,
            COUNT(DISTINCT e.emp_no) as emp_count,
            AVG(s.salary) as avg_salary,
            MIN(s.salary) as min_salary,
            MAX(s.salary) as max_salary
         FROM employees e
         JOIN salaries s ON e.emp_no = s.emp_no 
         AND s.to_date = '9999-01-01'
         GROUP BY e.hire_year, e.gender, e.salary_tier
         HAVING emp_count > 10
         ORDER BY e.hire_year DESC, avg_salary DESC
         LIMIT 100`,
        [],
        'AggregationQuery'
    );
    
    res.json({ count: results.length, rows: results });
}));

// Complex join - updated with proper date conditions
app.get('/complex_join', asyncHandler(async (req, res) => {
    const results = await executeQuery(
        `SELECT 
            e.emp_no, 
            e.first_name, 
            e.last_name,
            d.dept_name, 
            s.salary, 
            e.hire_date,
            e.birth_date, 
            e.gender
         FROM employees e
         JOIN dept_emp de ON e.emp_no = de.emp_no 
         AND de.to_date = '9999-01-01'
         JOIN departments d ON d.dept_no = de.dept_no
         JOIN salaries s ON s.emp_no = e.emp_no 
         AND s.to_date = '9999-01-01'
         WHERE e.hire_year >= 2000
         AND d.dept_name IN ('IT', 'Sales', 'Research and Development')
         ORDER BY s.salary DESC
         LIMIT 100`,
        [],
        'ComplexJoinQuery'
    );
    
    res.json({ count: results.length, rows: results });
}));

// Health check - updated to include database verification
app.get('/health', asyncHandler(async (req, res) => {
    const healthcheck = {
        uptime: process.uptime(),
        timestamp: Date.now(),
        status: 'OK'
    };
    
    try {
        await pool.query('SELECT 1');
        healthcheck.database = 'connected';
    } catch (error) {
        healthcheck.status = 'ERROR';
        healthcheck.database = 'disconnected';
        throw error;
    }
    
    res.json(healthcheck);
}));

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    newrelic.noticeError(err);
    
    res.status(500).json({ 
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

const PORT = process.env.API_PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
