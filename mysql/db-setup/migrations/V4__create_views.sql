USE ${MYSQL_DATABASE};

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

-- Employee performance view with hierarchical data
CREATE OR REPLACE VIEW employee_performance AS
WITH RECURSIVE date_sequence AS (
    SELECT CURDATE() - INTERVAL 12 MONTH as date
    UNION ALL
    SELECT date + INTERVAL 1 MONTH 
    FROM date_sequence 
    WHERE date < CURDATE()
)
SELECT 
    d.dept_name,
    ds.date as month_date,
    COUNT(DISTINCT e.emp_no) as employee_count,
    AVG(s.salary) as avg_salary,
    SUM(s.salary) as total_salary,
    COUNT(DISTINCT de.dept_no) as dept_count
FROM 
    date_sequence ds
    CROSS JOIN departments d
    LEFT JOIN dept_emp de ON de.dept_no = d.dept_no
    LEFT JOIN employees e ON de.emp_no = e.emp_no
    LEFT JOIN salaries s ON e.emp_no = s.emp_no
        AND s.from_date <= ds.date 
        AND s.to_date >= ds.date
GROUP BY 
    d.dept_name,
    ds.date;