USE ${MYSQL_DATABASE};

-- Add generated columns first
ALTER TABLE employees 
    ADD COLUMN IF NOT EXISTS birth_month INT GENERATED ALWAYS AS (MONTH(birth_date)) STORED,
    ADD COLUMN IF NOT EXISTS hire_year INT GENERATED ALWAYS AS (YEAR(hire_date)) STORED;

-- Basic indexes
CREATE INDEX IF NOT EXISTS idx_employees_gender ON employees(gender);
CREATE INDEX IF NOT EXISTS idx_employees_birth_month ON employees(birth_month);
CREATE INDEX IF NOT EXISTS idx_employees_hire_year ON employees(hire_year);

-- Competing name indexes
CREATE INDEX IF NOT EXISTS idx_emp_name1 ON employees(last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_emp_name2 ON employees(first_name, last_name);
CREATE INDEX IF NOT EXISTS idx_emp_name3 ON employees(last_name, birth_date, first_name);

-- Salary indexes
CREATE INDEX IF NOT EXISTS idx_salaries_amount ON salaries(salary);
CREATE INDEX IF NOT EXISTS idx_salaries_dates ON salaries(from_date, to_date);

-- Overlapping department indexes
CREATE INDEX IF NOT EXISTS idx_dept_emp_1 ON dept_emp(emp_no, dept_no, from_date);
CREATE INDEX IF NOT EXISTS idx_dept_emp_2 ON dept_emp(emp_no, from_date, dept_no);
CREATE INDEX IF NOT EXISTS idx_dept_emp_3 ON dept_emp(dept_no, emp_no, from_date);
