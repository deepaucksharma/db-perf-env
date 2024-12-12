USE [employees];
GO

-- Basic and additional indexes
CREATE NONCLUSTERED INDEX idx_employees_name ON app.employees(last_name, first_name);
CREATE NONCLUSTERED INDEX idx_employees_hire ON app.employees(hire_date);

CREATE NONCLUSTERED INDEX idx_dept_emp_1 ON app.dept_emp(emp_no, dept_no);
CREATE NONCLUSTERED INDEX idx_dept_emp_2 ON app.dept_emp(dept_no, emp_no);
CREATE NONCLUSTERED INDEX idx_dept_emp_3 ON app.dept_emp(from_date, emp_no, dept_no);
GO
