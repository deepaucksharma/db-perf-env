-- Basic indexes
CREATE INDEX idx_employees_name ON employees(last_name, first_name);
CREATE INDEX idx_employees_hire ON employees(hire_date);
CREATE INDEX idx_employees_upper_name ON employees(name_upper);

-- Partial indexes for performance testing
CREATE INDEX idx_high_salary ON salaries(salary) 
WHERE salary > 100000;

CREATE INDEX idx_current_emp ON dept_emp(emp_no) 
WHERE to_date = '9999-12-31';

-- Competing composite indexes for performance analysis
CREATE INDEX idx_dept_emp_1 ON dept_emp(emp_no, dept_no, from_date);
CREATE INDEX idx_dept_emp_2 ON dept_emp(dept_no, emp_no, from_date);
CREATE INDEX idx_dept_emp_3 ON dept_emp(from_date, emp_no, dept_no);

-- Create materialized view for department statistics
CREATE MATERIALIZED VIEW dept_stats AS
WITH salary_stats AS (
    SELECT 
        de.dept_no,
        d.dept_name,
        COUNT(DISTINCT e.emp_no) as emp_count,
        AVG(s.salary) as avg_salary,
        MIN(s.salary) as min_salary,
        MAX(s.salary) as max_salary,
        STDDEV(s.salary) as salary_stddev
    FROM departments d
    JOIN dept_emp de ON d.dept_no = de.dept_no
    JOIN employees e ON de.emp_no = e.emp_no
    JOIN salaries s ON e.emp_no = s.emp_no
    WHERE s.to_date = '9999-12-31'
    GROUP BY de.dept_no, d.dept_name
)
SELECT * FROM salary_stats;

CREATE UNIQUE INDEX idx_dept_stats ON dept_stats(dept_no);
