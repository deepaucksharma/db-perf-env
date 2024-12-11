import mysql.connector
import random
import logging
from datetime import date, timedelta
from faker import Faker

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def random_employee(emp_no, fake):
    birth_date = fake.date_between(start_date='-65y', end_date='-20y')
    first_name = fake.first_name()
    last_name = fake.last_name()
    gender = random.choice(['M','F'])
    hire_date = fake.date_between(start_date='-20y', end_date='today')
    return (emp_no, birth_date, first_name, last_name, gender, hire_date)

def random_salary(emp_no, from_date):
    to_date = date(9999,1,1)
    salary = random.randint(30000, 200000)
    return (emp_no, salary, from_date, to_date)

def main():
    conn = mysql.connector.connect(
        host='localhost',
        user='root',
        password='Pass1234',
        database='employees'
    )
    cursor = conn.cursor()
    fake = Faker()

    # Insert departments
    departments = [
        ('d001', 'Marketing', 1000000),
        ('d002', 'Finance', 2000000),
        ('d003', 'HR', 800000),
        ('d004', 'Engineering', 3000000),
        ('d005', 'Sales', 2500000)
    ]
    cursor.executemany(
        "INSERT IGNORE INTO departments (dept_no, dept_name, manager_budget) VALUES (%s, %s, %s)", 
        departments
    )
    conn.commit()

    total_employees = 100000  # Adjust based on environment
    batch_size = 2000
    logger.info(f"Starting data load for {total_employees} employees...")

    for batch in range(total_employees // batch_size):
        employees_data = []
        salaries_data = []
        dept_emp_data = []

        for _ in range(batch_size):
            emp_no = random.randint(1000000,9999999)
            emp = random_employee(emp_no, fake)
            employees_data.append(emp)
            
            # Multiple salary records per employee
            current_date = emp[5]  # hire_date
            for _ in range(random.randint(1, 4)):
                salaries_data.append(random_salary(emp_no, current_date))
                current_date += timedelta(days=random.randint(365, 1095))

            # Department assignment
            dept_no = random.choice(departments)[0]
            dept_emp_data.append((emp_no, dept_no, emp[5], date(9999,1,1)))

        # Batch insert employees
        cursor.executemany("""
            INSERT IGNORE INTO employees 
            (emp_no, birth_date, first_name, last_name, gender, hire_date)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, employees_data)

        # Batch insert salaries
        cursor.executemany("""
            INSERT IGNORE INTO salaries 
            (emp_no, salary, from_date, to_date)
            VALUES (%s, %s, %s, %s)
        """, salaries_data)

        # Batch insert department assignments
        cursor.executemany("""
            INSERT IGNORE INTO dept_emp 
            (emp_no, dept_no, from_date, to_date)
            VALUES (%s, %s, %s, %s)
        """, dept_emp_data)

        conn.commit()
        logger.info(f"Completed batch {batch+1}/{total_employees // batch_size}")

    cursor.close()
    conn.close()
    logger.info("Data load complete.")

if __name__ == "__main__":
    main()
