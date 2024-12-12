-- Basic indexes
CREATE INDEX idx_employees_name ON app.employees(last_name, first_name);
CREATE INDEX idx_employees_hire ON app.employees(hire_date);
CREATE INDEX idx_employees_upper_name ON app.employees(name_upper);

-- Partial indexes for performance testing
CREATE INDEX idx_high_salary ON app.salaries(salary)
WHERE salary > 200000;

CREATE INDEX idx_current_emp ON app.dept_emp(emp_no)
WHERE to_date = '9999-12-31';

-- Competing composite indexes for performance analysis
CREATE INDEX idx_dept_emp_1 ON app.dept_emp(emp_no, dept_no);
CREATE INDEX idx_dept_emp_2 ON app.dept_emp(dept_no, emp_no);
CREATE INDEX idx_dept_emp_3 ON app.dept_emp(from_date, emp_no, dept_no);