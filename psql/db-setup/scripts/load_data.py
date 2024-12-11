import psycopg2
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
    # Ensure some high salaries for testing partial index
    salary = random.randint(30000, 200000)
    if random.random() < 0.1:  # 10% chance of high salary
        salary += 100000
    return (emp_no, salary, from_date, date(9999,1,1))

def main():
    conn = psycopg2.connect(
        host='localhost',
        user='postgres',
        password='demo123',
        dbname='employees'
    )
    cursor = conn.cursor()
    fake = Faker()

    departments = [
        ('d001', 'Marketing'),
        ('d002', 'Finance'),
        ('d003', 'HR'),
        ('d004', 'Engineering'),
        ('d005', 'Sales')
    ]
    
    logger.info("Inserting departments...")
    cursor.executemany(
        "INSERT INTO departments (dept_no, dept_name) VALUES (%s, %s) ON CONFLICT DO NOTHING",
        departments
    )
    conn.commit()

    total_employees = 5000  # Reduced dataset size
    batch_size = 1000
    logger.info(f"Loading {total_employees} employees...")

    for batch in range(total_employees // batch_size):
        employees_data = []
        salaries_data = []
        dept_emp_data = []

        for _ in range(batch_size):
            emp_no = random.randint(1000000,9999999)
            emp = random_employee(emp_no, fake)
            employees_data.append(emp)
            salaries_data.append(random_salary(emp_no, emp[5]))
            dept_no = random.choice(departments)[0]
            dept_emp_data.append((emp_no, dept_no, emp[5], date(9999,1,1)))

        try:
            cursor.executemany("""
                INSERT INTO employees 
                (emp_no, birth_date, first_name, last_name, gender, hire_date)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT DO NOTHING
            """, employees_data)

            cursor.executemany("""
                INSERT INTO salaries 
                (emp_no, salary, from_date, to_date)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT DO NOTHING
            """, salaries_data)

            cursor.executemany("""
                INSERT INTO dept_emp 
                (emp_no, dept_no, from_date, to_date)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT DO NOTHING
            """, dept_emp_data)

            conn.commit()
            logger.info(f"Completed batch {batch+1}")

        except Exception as e:
            logger.error(f"Error in batch {batch}: {str(e)}")
            conn.rollback()
            continue

    logger.info("Refreshing materialized view...")
    cursor.execute("REFRESH MATERIALIZED VIEW dept_stats")
    
    logger.info("Running ANALYZE...")
    cursor.execute("ANALYZE")
    
    conn.commit()
    cursor.close()
    conn.close()
    logger.info("Data load complete!")

if __name__ == "__main__":
    main()
