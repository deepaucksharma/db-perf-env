ALTER TABLE employees 
ADD UNIQUE KEY uk_emp_no (emp_no);

-- Modify the tablespace creation from:
CREATE TABLESPACE perf_space

-- To:
CREATE TABLESPACE IF NOT EXISTS perf_space

-- Rest of the original SQL script content
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_dept_name (dept_name(2))  -- Intentionally poor prefix
);

-- Create employees table with performance-impacting design
CREATE TABLE IF NOT EXISTS employees (
    emp_no INT PRIMARY KEY,  -- Added PRIMARY KEY constraint
    birth_date DATE NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    gender ENUM('M','F') NOT NULL,
    hire_date DATE NOT NULL,
    employee_details TEXT,  -- Added for row size impact
    performance_history JSON,  -- Added for storage overhead
    birth_month INT GENERATED ALWAYS AS (MONTH(birth_date)) STORED,
    hire_year INT GENERATED ALWAYS AS (YEAR(hire_date)) STORED,
    birth_day INT GENERATED ALWAYS AS (DAY(birth_date)) STORED,  -- Additional generated column
    hire_month INT GENERATED ALWAYS AS (MONTH(hire_date)) STORED,  -- Additional generated column
    salary_tier INT GENERATED ALWAYS AS (
        CASE 
            WHEN emp_no % 4 = 0 THEN emp_no % 10
            WHEN emp_no % 4 = 1 THEN emp_no % 7
            WHEN emp_no % 4 = 2 THEN emp_no % 5
            ELSE emp_no % 3
        END
    ) STORED,
    last_modified TIMESTAMP,
    KEY idx_emp_prefix (first_name(1), last_name(1)),
    KEY idx_emp_suffixes (first_name(50), last_name(50)),
    KEY idx_emp_reversed (first_name, last_name)
);

-- Add before any foreign key references
ALTER TABLE employees 
ADD UNIQUE KEY uk_emp_no (emp_no);

-- Create salaries table with performance-impacting changes
CREATE TABLE IF NOT EXISTS salaries (
    id INT AUTO_INCREMENT,  -- Removed PRIMARY KEY
    emp_no INT NOT NULL,
    salary DECIMAL(15,4) NOT NULL,  -- Changed from INT
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    salary_details TEXT,
    audit_trail JSON,
    FOREIGN KEY (emp_no) REFERENCES employees (emp_no) ON DELETE CASCADE,
    KEY idx_salaries_composite (from_date, to_date, salary % 1000, emp_no)
);

-- Create dept_emp table with inefficient indexes
CREATE TABLE IF NOT EXISTS dept_emp (
    emp_no INT NOT NULL,
    dept_no CHAR(4) NOT NULL,
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    KEY idx_dates (from_date),  -- Single column instead of composite
    KEY idx_dept (dept_no(2)),  -- Poor prefix index
    FOREIGN KEY (emp_no) REFERENCES employees (emp_no) ON DELETE CASCADE,
    FOREIGN KEY (dept_no) REFERENCES departments (dept_no) ON DELETE CASCADE
);

-- Inefficient indexes for all tables
CREATE INDEX idx_emp_birth ON employees(birth_date, birth_month);
CREATE INDEX idx_emp_birth_full ON employees(birth_date, birth_month, hire_date);
CREATE INDEX idx_emp_birth_part ON employees(birth_date);

-- Create tablespace with small page size
CREATE TABLESPACE IF NOT EXISTS perf_space
ADD DATAFILE 'perf_space.ibd'
FILE_BLOCK_SIZE = 4096
ENGINE = InnoDB;

-- Move tables to shared tablespace
ALTER TABLE employees TABLESPACE perf_space;
ALTER TABLE salaries TABLESPACE perf_space;
ALTER TABLE dept_emp TABLESPACE perf_space;
ALTER TABLE departments TABLESPACE perf_space;

-- Disable persistent statistics
ALTER TABLE employees STATS_PERSISTENT = 0, STATS_AUTO_RECALC = 0;
ALTER TABLE salaries STATS_PERSISTENT = 0, STATS_AUTO_RECALC = 0;
ALTER TABLE dept_emp STATS_PERSISTENT = 0, STATS_AUTO_RECALC = 0;
ALTER TABLE departments STATS_PERSISTENT = 0, STATS_AUTO_RECALC = 0;
