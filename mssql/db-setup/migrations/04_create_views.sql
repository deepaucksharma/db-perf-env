USE [employees];
GO

CREATE OR ALTER VIEW app.employee_stats AS
SELECT 
    YEAR(birth_date) AS birth_year,
    gender,
    COUNT(*) AS total_count,
    AVG(CAST(MONTH(birth_date) AS FLOAT)) as avg_birth_month,
    SUM(CASE WHEN gender = 'M' THEN 1 ELSE 0 END) as male_count
FROM app.employees
GROUP BY YEAR(birth_date), gender;
GO

CREATE OR ALTER VIEW app.salary_metrics AS
SELECT 
    d.dept_name,
    YEAR(s.from_date) as year,
    COUNT(DISTINCT e.emp_no) as employee_count,
    AVG(s.salary) as avg_salary,
    MAX(s.salary) as max_salary,
    MIN(s.salary) as min_salary,
    STDEV(s.salary) as salary_stddev
FROM app.employees e
JOIN app.dept_emp de ON e.emp_no = de.emp_no
JOIN app.departments d ON de.dept_no = d.dept_no
JOIN app.salaries s ON e.emp_no = s.emp_no
WHERE s.to_date = '9999-01-01'
GROUP BY d.dept_name, YEAR(s.from_date);
GO
