const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');

// Import utils
const { executeQuery } = require('../utils/database');
const logger = require('../utils/logger');

// HR Department APIs
router.get('/hr/employee-analytics', asyncHandler(async (req, res) => {
    const results = await executeQuery(`
        SELECT 
            e.hire_year,
            d.dept_name,
            COUNT(DISTINCT e.emp_no) as employee_count,
            ROUND(AVG(s.salary), 2) as avg_salary,
            COUNT(DISTINCT CASE WHEN s.salary > 75000 THEN e.emp_no END) as high_earners
        FROM employees e
        JOIN dept_emp de ON e.emp_no = de.emp_no AND de.to_date = '9999-01-01'
        JOIN departments d ON de.dept_no = d.dept_no
        JOIN salaries s ON e.emp_no = s.emp_no AND s.to_date = '9999-01-01'
        GROUP BY e.hire_year, d.dept_name
        ORDER BY e.hire_year DESC, d.dept_name
    `, [], 'HR Analytics');
    
    res.json({ status: 'success', data: results });
}));

// Department transfer with lock demonstration
router.post('/hr/department-transfer', asyncHandler(async (req, res) => {
    const { empNo, newDeptNo, salary } = req.body;
    const conn = await req.app.locals.pool.getConnection();
    
    try {
        await conn.beginTransaction();
        
        // Update existing department assignment
        await conn.execute(`
            UPDATE dept_emp 
            SET to_date = CURRENT_DATE()
            WHERE emp_no = ? AND to_date = '9999-01-01'
        `, [empNo]);
        
        // Insert new department assignment
        await conn.execute(`
            INSERT INTO dept_emp (emp_no, dept_no, from_date, to_date)
            VALUES (?, ?, CURRENT_DATE(), '9999-01-01')
        `, [empNo, newDeptNo]);
        
        // Update salary if provided
        if (salary) {
            await conn.execute(`
                UPDATE salaries 
                SET to_date = CURRENT_DATE()
                WHERE emp_no = ? AND to_date = '9999-01-01'
            `, [empNo]);
            
            await conn.execute(`
                INSERT INTO salaries (emp_no, salary, from_date, to_date)
                VALUES (?, ?, CURRENT_DATE(), '9999-01-01')
            `, [empNo, salary]);
        }
        
        // Simulate processing time for lock demonstration
        await conn.execute('DO SLEEP(1)');
        
        await conn.commit();
        res.json({ status: 'success', message: 'Transfer processed' });
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
}));

// Finance compliance audit
router.get('/finance/audit', asyncHandler(async (req, res) => {
    const { year, quarter } = req.query;
    
    const results = await executeQuery(`
        WITH salary_changes AS (
            SELECT 
                e.emp_no,
                d.dept_name,
                s1.salary as old_salary,
                s2.salary as new_salary,
                s2.from_date as change_date,
                ROUND((s2.salary - s1.salary) / s1.salary * 100, 2) as change_percentage
            FROM employees e
            JOIN dept_emp de ON e.emp_no = de.emp_no 
            JOIN departments d ON de.dept_no = d.dept_no
            JOIN salaries s1 ON e.emp_no = s1.emp_no
            JOIN salaries s2 ON e.emp_no = s2.emp_no
                AND s2.from_date > s1.from_date
                AND YEAR(s2.from_date) = ?
                AND QUARTER(s2.from_date) = ?
            WHERE de.to_date = '9999-01-01'
        )
        SELECT 
            dept_name,
            COUNT(*) as total_changes,
            ROUND(AVG(change_percentage), 2) as avg_increase
        FROM salary_changes
        GROUP BY dept_name
        ORDER BY avg_increase DESC
    `, [year || new Date().getFullYear(), quarter || 1], 'Finance Audit');
    
    res.json({ status: 'success', data: results });
}));

// Data science analysis
router.get('/analytics/retention', asyncHandler(async (req, res) => {
    const results = await executeQuery(`
        WITH employee_metrics AS (
            SELECT 
                e.emp_no,
                e.hire_year,
                e.salary_tier,
                COUNT(DISTINCT d.dept_no) as dept_changes,
                COUNT(DISTINCT s.salary) as salary_changes,
                DATEDIFF(COALESCE(MIN(CASE WHEN de.to_date != '9999-01-01' 
                    THEN de.to_date END), CURRENT_DATE), e.hire_date) as tenure_days
            FROM employees e
            LEFT JOIN dept_emp de ON e.emp_no = de.emp_no
            LEFT JOIN departments d ON de.dept_no = d.dept_no
            LEFT JOIN salaries s ON e.emp_no = s.emp_no
            GROUP BY e.emp_no, e.hire_year, e.salary_tier
        )
        SELECT 
            hire_year,
            salary_tier,
            COUNT(*) as employee_count,
            ROUND(AVG(dept_changes), 2) as avg_dept_changes,
            ROUND(AVG(tenure_days) / 365, 2) as avg_tenure_years
        FROM employee_metrics
        GROUP BY hire_year, salary_tier
        ORDER BY hire_year DESC, salary_tier
    `, [], 'Retention Analysis');
    
    res.json({ status: 'success', data: results });
}));

// Department dashboard
router.get('/dashboard/metrics', asyncHandler(async (req, res) => {
    const { deptNo } = req.query;
    
    const results = await executeQuery(`
        SELECT 
            d.dept_name,
            COUNT(DISTINCT de.emp_no) as current_employees,
            ROUND(AVG(s.salary), 2) as avg_salary,
            COUNT(DISTINCT CASE 
                WHEN DATEDIFF(CURRENT_DATE, de.from_date) <= 90 
                THEN de.emp_no 
            END) as recent_transfers,
            d.manager_budget,
            ROUND(SUM(s.salary) / d.manager_budget * 100, 2) as budget_utilization
        FROM departments d
        LEFT JOIN dept_emp de ON d.dept_no = de.dept_no AND de.to_date = '9999-01-01'
        LEFT JOIN salaries s ON de.emp_no = s.emp_no AND s.to_date = '9999-01-01'
        WHERE d.dept_no = ?
        GROUP BY d.dept_name, d.manager_budget
    `, [deptNo], 'Department Dashboard');
    
    res.json({ status: 'success', data: results });
}));

module.exports = router;
