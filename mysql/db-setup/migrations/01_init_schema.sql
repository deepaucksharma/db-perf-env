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

-- Essential indexes
CREATE INDEX idx_employees_gender ON employees(gender);
CREATE INDEX idx_employees_birth_month ON employees(birth_month);
CREATE INDEX idx_employees_hire_year ON employees(hire_year);
CREATE INDEX idx_salary_tier ON employees(salary_tier);
CREATE INDEX idx_salaries_amount ON salaries(salary);
CREATE INDEX idx_salaries_dates ON salaries(from_date, to_date);
CREATE INDEX idx_dept_emp_dates ON dept_emp(from_date, to_date);

-- Suboptimal indexes for performance analysis
CREATE INDEX idx_emp_birth_full ON employees(birth_date, birth_month);
CREATE INDEX idx_emp_birth_reverse ON employees(birth_month, birth_date);
CREATE INDEX idx_emp_gender_full ON employees(gender, birth_date, hire_date);
CREATE INDEX idx_emp_low_selective ON employees(salary_tier, gender);
CREATE INDEX idx_emp_specific_month ON employees(birth_month) WHERE birth_month = 6;
CREATE INDEX idx_emp_specific_tier ON employees(salary_tier) WHERE salary_tier = 1;
CREATE INDEX idx_emp_everything ON employees(
    first_name, 
    last_name, 
    birth_date, 
    hire_date, 
    gender, 
    salary_tier
);

-- Redundant salary indexes
CREATE INDEX idx_salary_basic ON salaries(salary);
CREATE INDEX idx_salary_emp_date ON salaries(emp_no, from_date, salary);
CREATE INDEX idx_salary_date_emp ON salaries(from_date, emp_no, salary);

-- Wide index on dept_emp
CREATE INDEX idx_dept_emp_dates_all ON dept_emp(
    to_date,
    from_date,
    emp_no,
    dept_no
);

-- Employee name index (kept for API queries)
CREATE INDEX idx_emp_name1 ON employees(last_name, first_name);