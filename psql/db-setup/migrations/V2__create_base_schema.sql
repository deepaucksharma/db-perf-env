-- Create a base schema and a sample table
CREATE SCHEMA IF NOT EXISTS app;

-- Create base tables
CREATE TABLE app.employees (
    emp_no INT PRIMARY KEY,
    birth_date DATE NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    gender CHAR(1) CHECK (gender IN ('M', 'F')),
    hire_date DATE NOT NULL,
    name_upper TEXT GENERATED ALWAYS AS (UPPER(last_name)) STORED
);

CREATE TABLE app.departments (
    dept_no CHAR(4) PRIMARY KEY,
    dept_name VARCHAR(40) NOT NULL UNIQUE
);

CREATE TABLE app.dept_emp (
    emp_no INT NOT NULL,
    dept_no CHAR(4) NOT NULL,
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    PRIMARY KEY (emp_no, dept_no),
    FOREIGN KEY (emp_no) REFERENCES app.employees(emp_no),
    FOREIGN KEY (dept_no) REFERENCES app.departments(dept_no)
);

CREATE TABLE app.salaries (
    emp_no INT NOT NULL,
    salary INT NOT NULL,
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    CONSTRAINT pk_salaries PRIMARY KEY (emp_no, from_date),
    CONSTRAINT fk_salaries_employees FOREIGN KEY (emp_no) REFERENCES app.employees(emp_no)
) PARTITION BY RANGE (from_date);

-- Create salary partitions
CREATE TABLE app.salaries_historical PARTITION OF app.salaries
    FOR VALUES FROM (MINVALUE) TO ('2020-01-01');

CREATE TABLE app.salaries_current PARTITION OF app.salaries
    FOR VALUES FROM ('2020-01-01') TO (MAXVALUE);
