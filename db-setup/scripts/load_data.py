import os
import pyodbc
from faker import Faker
from datetime import date, timedelta
import random
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

server = 'mssql'
database = os.getenv('MSSQL_DB', 'employees')
username = os.getenv('MSSQL_USER', 'appuser')
password = os.getenv('MSSQL_PASSWORD', 'AppUserStrongPass!123')
total_employees = int(os.getenv('TOTAL_EMPLOYEES', 100000))
batch_size = int(os.getenv('BATCH_SIZE', 1000))

conn_str = f"DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={server};DATABASE={database};UID={username};PWD={password}"
conn = pyodbc.connect(conn_str, autocommit=False)
cursor = conn.cursor()
fake = Faker()

departments = [
    ('d001', 'Marketing', 1000000),
    ('d002', 'Finance', 2000000),
    ('d003', 'HR', 800000),
    ('d004', 'Engineering', 3000000),
    ('d005', 'Sales', 2500000)
]

for dept in departments:
    try:
        cursor.execute("IF NOT EXISTS (SELECT 1 FROM app.departments WHERE dept_no = ?) INSERT INTO app.departments (dept_no, dept_name, manager_budget) VALUES (?, ?, ?)", dept[0], *dept)
    except pyodbc.Error as ex:
        logger.error(f"Failed to insert department {dept[0]}: {ex}")
        conn.rollback()
        raise
conn.commit()

def random_employee():
    birth_date = fake.date_between(start_date='-65y', end_date='-20y')
    first_name = fake.first_name()
    last_name = fake.last_name()
    gender = random.choice(['M','F'])
    hire_date = fake.date_between(start_date='-20y', end_date='today')
    return (first_name, last_name, gender, birth_date, hire_date)

def random_salary(emp_no, from_date):
    to_date = date(9999,1,1)
    salary = random.randint(30000, 200000)
    return (emp_no, salary, from_date, to_date)

logger.info(f"Loading {total_employees} employees...")
emp_count = 0

while emp_count < total_employees:
    batch_salaries = []
    batch_dept_emp = []

    for _ in range(min(batch_size, total_employees - emp_count)):
        e = random_employee()
        try:
            cursor.execute("INSERT INTO app.employees (first_name, last_name, gender, birth_date, hire_date) OUTPUT inserted.emp_no VALUES (?, ?, ?, ?, ?)", e)
            new_emp_no = cursor.fetchone()[0]
        except pyodbc.Error as ex:
            logger.error(f"Failed to insert employee {e}: {ex}")
            conn.rollback()
            continue

        current_date = e[4]
        for __ in range(random.randint(1,4)):
            sal = random_salary(new_emp_no, current_date)
            batch_salaries.append(sal)
            current_date += timedelta(days=random.randint(365,1095))

        dept_no = random.choice(departments)[0]
        batch_dept_emp.append((new_emp_no, dept_no, e[4], date(9999,1,1)))

        emp_count += 1

    try:
        for s in batch_salaries:
            cursor.execute("INSERT INTO app.salaries (emp_no, salary, from_date, to_date) VALUES (?, ?, ?, ?)", s)
        for de in batch_dept_emp:
            cursor.execute("INSERT INTO app.dept_emp (emp_no, dept_no, from_date, to_date) VALUES (?, ?, ?, ?)", de)
        conn.commit()
        logger.info(f"Loaded {emp_count}/{total_employees} employees...")
    except pyodbc.Error as ex:
        logger.error(f"Failed in batch insert: {ex}")
        conn.rollback()

cursor.close()
conn.close()
logger.info("Data load complete.")
