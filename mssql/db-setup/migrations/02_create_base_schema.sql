-- Ensure the database exists
IF NOT EXISTS(SELECT 1 FROM sys.databases WHERE name = 'employees')
BEGIN
    CREATE DATABASE [employees];
END;
GO

USE [employees];
GO

-- Check if app schema exists
IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'app')
BEGIN
    EXEC('CREATE SCHEMA app');
END;
GO

CREATE TABLE app.employees (
    emp_no INT IDENTITY(1,1) PRIMARY KEY,
    birth_date DATE NOT NULL,
    first_name NVARCHAR(50) NOT NULL,
    last_name NVARCHAR(50) NOT NULL,
    gender CHAR(1) NOT NULL,
    hire_date DATE NOT NULL,
    last_modified DATETIME2 DEFAULT SYSUTCDATETIME()
);

CREATE TABLE app.departments (
    dept_no CHAR(4) PRIMARY KEY,
    dept_name NVARCHAR(40) NOT NULL UNIQUE,
    manager_budget DECIMAL(15,2) DEFAULT 100000
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
    id INT IDENTITY(1,1) PRIMARY KEY,
    emp_no INT NOT NULL,
    salary INT NOT NULL,
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    FOREIGN KEY (emp_no) REFERENCES app.employees(emp_no)
);
GO
