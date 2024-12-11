import mysql.connector
import random
import logging
from datetime import date, timedelta
from faker import Faker
import os

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
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
    try:
        # Get connection details from environment
        db_config = {
            'host': 'localhost',
            'user': os.getenv('MYSQL_USER', 'root'),
            'password': os.getenv('MYSQL_ROOT_PASSWORD', 'rootpass123'),
            'database': os.getenv('MYSQL_DATABASE', 'employees')
        }
        
        logger.info(f"Connecting to database {db_config['database']} on {db_config['host']}")
        conn = mysql.connector.connect(**db_config)
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
        
        logger.info("Inserting departments...")
        cursor.executemany(
            "INSERT IGNORE INTO departments (dept_no, dept_name, manager_budget) VALUES (%s, %s, %s)", 
            departments
        )
        conn.commit()

        # Check if we already have data
        cursor.execute("SELECT COUNT(*) FROM employees")
        count = cursor.fetchone()[0]
        if count > 0:
            logger.info(f"Database already contains {count} employees. Skipping data load.")
            return

        total_employees = 10000  # Reduced for testing
        batch_size = int(os.getenv('BATCH_SIZE', 1000))  # Make batch size configurable
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

            try:
                cursor.executemany("""
                    INSERT IGNORE INTO employees 
                    (emp_no, birth_date, first_name, last_name, gender, hire_date)
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, employees_data)

                cursor.executemany("""
                    INSERT IGNORE INTO salaries 
                    (emp_no, salary, from_date, to_date)
                    VALUES (%s, %s, %s, %s)
                """, salaries_data)

                cursor.executemany("""
                    INSERT IGNORE INTO dept_emp 
                    (emp_no, dept_no, from_date, to_date)
                    VALUES (%s, %s, %s, %s)
                """, dept_emp_data)

                conn.commit()
                logger.info(f"Inserted {len(employees_data)} employees, {len(salaries_data)} salaries, and {len(dept_emp_data)} department assignments in this batch.")
                logger.info(f"Completed batch {batch+1}/{total_employees // batch_size}")

            except mysql.connector.Error as sql_err:
                logger.error(f"SQL error in batch {batch}: {str(sql_err)}")
                conn.rollback()
                continue
            except Exception as e:
                logger.error(f"Error in batch {batch}: {str(e)}")
                conn.rollback()
                continue

        # Verify data load
        cursor.execute("SELECT COUNT(*) FROM employees")
        final_count = cursor.fetchone()[0]
        logger.info(f"Data load complete. Total employees: {final_count}")

    except Exception as e:
        logger.error(f"Database connection error: {str(e)}")
        raise
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    main()