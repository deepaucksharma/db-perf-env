-- Initialize database
CREATE DATABASE IF NOT EXISTS ${MYSQL_DATABASE};
USE ${MYSQL_DATABASE};

-- Create departments table
CREATE TABLE IF NOT EXISTS departments (
    dept_no CHAR(4) PRIMARY KEY,
    dept_name VARCHAR(40) NOT NULL,
    manager_budget DECIMAL(15,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_dept_name (dept_name)
);

-- Create employees table
CREATE TABLE IF NOT EXISTS employees (
    emp_no INT PRIMARY KEY,
    birth_date DATE NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    gender ENUM('M','F') NOT NULL,
    hire_date DATE NOT NULL,
    birth_month INT GENERATED ALWAYS AS (MONTH(birth_date)) STORED,
    hire_year INT GENERATED ALWAYS AS (YEAR(hire_date)) STORED,
    salary_tier INT GENERATED ALWAYS AS (
        CASE 
            WHEN emp_no % 4 = 0 THEN 1
            WHEN emp_no % 4 = 1 THEN 2
            WHEN emp_no % 4 = 2 THEN 3
            ELSE 4
        END
    ) STORED,
    last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create salaries table
CREATE TABLE IF NOT EXISTS salaries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    emp_no INT NOT NULL,
    salary INT NOT NULL,
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    FOREIGN KEY (emp_no) REFERENCES employees (emp_no) ON DELETE CASCADE
);

-- Create dept_emp table
CREATE TABLE IF NOT EXISTS dept_emp (
    emp_no INT NOT NULL,
    dept_no CHAR(4) NOT NULL,
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    PRIMARY KEY (emp_no, dept_no),
    FOREIGN KEY (emp_no) REFERENCES employees (emp_no) ON DELETE CASCADE,
    FOREIGN KEY (dept_no) REFERENCES departments (dept_no) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX idx_employees_gender ON employees(gender);
CREATE INDEX idx_employees_birth_month ON employees(birth_month);
CREATE INDEX idx_employees_hire_year ON employees(hire_year);
CREATE INDEX idx_emp_name1 ON employees(last_name, first_name);
CREATE INDEX idx_salary_tier ON employees(salary_tier);
CREATE INDEX idx_salaries_amount ON salaries(salary);
CREATE INDEX idx_salaries_dates ON salaries(from_date, to_date);
CREATE INDEX idx_dept_emp_dates ON dept_emp(from_date, to_date);