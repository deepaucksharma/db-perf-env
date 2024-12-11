USE employees;

-- First check if columns exist
SET @birth_month_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'employees' 
    AND TABLE_NAME = 'employees' 
    AND COLUMN_NAME = 'birth_month'
);

SET @hire_year_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'employees' 
    AND TABLE_NAME = 'employees' 
    AND COLUMN_NAME = 'hire_year'
);

-- Add columns if they don't exist
SET @sql = '';
SELECT IF(@birth_month_exists = 0,
    'ALTER TABLE employees ADD COLUMN birth_month INT GENERATED ALWAYS AS (MONTH(birth_date)) STORED;',
    '') INTO @sql;
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = '';
SELECT IF(@hire_year_exists = 0,
    'ALTER TABLE employees ADD COLUMN hire_year INT GENERATED ALWAYS AS (YEAR(hire_date)) STORED;',
    '') INTO @sql;
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Create indexes
CREATE INDEX idx_employees_gender ON employees(gender);
CREATE INDEX idx_employees_birth_month ON employees(birth_month);
CREATE INDEX idx_employees_hire_year ON employees(hire_year);
CREATE INDEX idx_emp_name1 ON employees(last_name, first_name);
CREATE INDEX idx_emp_name2 ON employees(first_name, last_name);
CREATE INDEX idx_emp_name3 ON employees(last_name, birth_date, first_name);

-- Salary indexes
CREATE INDEX idx_salaries_amount ON salaries(salary);
CREATE INDEX idx_salaries_dates ON salaries(from_date, to_date);

-- Department indexes
CREATE INDEX idx_dept_emp_1 ON dept_emp(emp_no, dept_no, from_date);
CREATE INDEX idx_dept_emp_2 ON dept_emp(emp_no, from_date, dept_no);
CREATE INDEX idx_dept_emp_3 ON dept_emp(dept_no, emp_no, from_date);