-- Add indexes to improve performance
CREATE INDEX ON app.users (username);

-- Basic indexes
CREATE INDEX idx_employees_name ON employees(last_name, first_name);
CREATE INDEX idx_employees_hire ON employees(hire_date);
CREATE INDEX idx_employees_upper_name ON employees(name_upper);

-- Partial indexes for performance testing
CREATE INDEX idx_high_salary ON salaries(salary)
WHERE salary > 200000;

CREATE INDEX idx_current_emp ON dept_emp(emp_no)
WHERE to_date = '9999-12-31';

-- Competing composite indexes for performance analysis
CREATE INDEX idx_dept_emp_1 ON dept_emp(emp_no, dept_no);
CREATE INDEX idx_dept_emp_2 ON dept_emp(dept_no, emp_no);
CREATE INDEX idx_dept_emp_3 ON dept_emp(from_date, emp_no, dept_no);

-- Add index to materialized view
CREATE UNIQUE INDEX idx_dept_stats ON dept_stats(dept_no);
