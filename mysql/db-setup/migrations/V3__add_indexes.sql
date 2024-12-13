USE ${MYSQL_DATABASE};

-- Employee indexes
CREATE INDEX idx_employees_gender ON employees(gender);
CREATE INDEX idx_employees_birth_month ON employees(birth_month);
CREATE INDEX idx_employees_hire_year ON employees(hire_year);
CREATE INDEX idx_emp_name1 ON employees(last_name, first_name);
CREATE INDEX idx_emp_name2 ON employees(first_name, last_name);
CREATE INDEX idx_emp_name3 ON employees(last_name, birth_date, first_name);
CREATE INDEX idx_salary_tier ON employees(salary_tier);

-- Salary indexes
CREATE INDEX idx_salaries_amount ON salaries(salary);
CREATE INDEX idx_salaries_dates ON salaries(from_date, to_date);
CREATE INDEX idx_salaries_emp_date ON salaries(emp_no, from_date);

-- Department indexes
CREATE INDEX idx_dept_emp_1 ON dept_emp(emp_no, dept_no, from_date);
CREATE INDEX idx_dept_emp_2 ON dept_emp(emp_no, from_date, dept_no);
CREATE INDEX idx_dept_emp_3 ON dept_emp(dept_no, emp_no, from_date);