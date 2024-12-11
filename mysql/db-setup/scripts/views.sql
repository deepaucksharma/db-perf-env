USE employees;

-- Employee statistics view
CREATE OR REPLACE VIEW employee_stats AS
SELECT 
    YEAR(birth_date) as birth_year,
    gender,
    COUNT(*) as total_count,
    AVG(MONTH(birth_date)) as avg_birth_month,
    SUM(CASE WHEN gender = 'M' THEN 1 ELSE 0 END) as male_count
FROM employees
GROUP BY YEAR(birth_date), gender;

-- Salary metrics view
CREATE OR REPLACE VIEW salary_metrics AS
SELECT 
    d.dept_name,
    YEAR(s.from_date) as year,
    COUNT(DISTINCT e.emp_no) as employee_count,
    AVG(s.salary) as avg_salary,
    MAX(s.salary) as max_salary,
    MIN(s.salary) as min_salary,
    STDDEV(s.salary) as salary_stddev
FROM 
    employees e
    JOIN dept_emp de ON e.emp_no = de.emp_no
    JOIN departments d ON de.dept_no = d.dept_no
    JOIN salaries s ON e.emp_no = s.emp_no
WHERE 
    s.to_date = '9999-01-01'  -- Current salaries only
GROUP BY 
    d.dept_name,
    YEAR(s.from_date)
WITH ROLLUP;
