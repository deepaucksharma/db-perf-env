-- Employee statistics view
CREATE OR REPLACE VIEW app.employee_stats AS
SELECT
    date_part('year', birth_date) as birth_year,
    gender,
    COUNT(*) as total_count,
    AVG(date_part('month', birth_date)) as avg_birth_month,
    SUM(CASE WHEN gender = 'M' THEN 1 ELSE 0 END) as male_count
FROM app.employees
GROUP BY date_part('year', birth_date), gender;

-- Salary metrics view (more complex to trigger more work)
CREATE OR REPLACE VIEW app.salary_metrics AS
SELECT
    d.dept_name,
    date_part('year', s.from_date) as year,
    COUNT(DISTINCT e.emp_no) as employee_count,
    AVG(s.salary) as avg_salary,
    MAX(s.salary) as max_salary,
    MIN(s.salary) as min_salary,
    STDDEV(s.salary) as salary_stddev
FROM
    app.employees e
    JOIN app.dept_emp de ON e.emp_no = de.emp_no
    JOIN app.departments d ON de.dept_no = d.dept_no
    JOIN app.salaries s ON e.emp_no = s.emp_no
WHERE
    s.to_date = '9999-01-01'  -- Current salaries only
GROUP BY
    d.dept_name,
    date_part('year', s.from_date)
ORDER BY d.dept_name, date_part('year', s.from_date) ;

-- Create materialized view for department statistics
CREATE MATERIALIZED VIEW app.dept_stats AS
WITH salary_stats AS (
    SELECT
        de.dept_no,
        d.dept_name,
        COUNT(DISTINCT e.emp_no) as emp_count,
        AVG(s.salary) as avg_salary,
        MIN(s.salary) as min_salary,
        MAX(s.salary) as max_salary,
        STDDEV(s.salary) as salary_stddev
    FROM app.departments d
    JOIN app.dept_emp de ON d.dept_no = de.dept_no
    JOIN app.employees e ON de.emp_no = e.emp_no
    JOIN app.salaries s ON e.emp_no = s.emp_no
    WHERE s.to_date = '9999-12-31'
    GROUP BY de.dept_no, d.dept_name
)
SELECT * FROM salary_stats;

-- Add index to materialized view
CREATE UNIQUE INDEX idx_dept_stats ON app.dept_stats(dept_no);