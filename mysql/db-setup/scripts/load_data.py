import mysql.connector
import random
from datetime import date, timedelta
from faker import Faker
import os
import logging
from concurrent.futures import ThreadPoolExecutor
import time

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def generate_employee_batch(start_emp_no, batch_size, fake):
    employees = []
    salaries = []
    dept_assignments = []
    departments = ['d001', 'd002', 'd003', 'd004', 'd005', 'd006', 'd007', 'd008', 'd009', 'd010']
    
    for i in range(batch_size):
        emp_no = start_emp_no + i
        birth_date = fake.date_between(start_date='-65y', end_date='-25y')
        hire_date = fake.date_between(start_date='-20y', end_date='today')
        
        employees.append((
            emp_no,
            birth_date,
            fake.first_name(),
            fake.last_name(),
            random.choice(['M', 'F']),
            hire_date
        ))
        
        # Generate 2-4 salary records per employee
        current_date = hire_date
        for _ in range(random.randint(2, 4)):
            base_salary = random.randint(30000, 150000)
            # Add some outliers for interesting data
            if random.random() < 0.05:  # 5% chance
                base_salary *= random.uniform(1.5, 2.5)
            
            salaries.append((
                emp_no,
                int(base_salary),
                current_date,
                date(9999, 1, 1) if _ == 0 else current_date + timedelta(days=random.randint(365, 1095))
            ))
            current_date += timedelta(days=random.randint(365, 1095))
        
        # Assign to 1-2 departments
        num_departments = random.randint(1, 2)
        selected_departments = random.sample(departments, num_departments)
        for dept_no in selected_departments:
            dept_assignments.append((
                emp_no,
                dept_no,
                hire_date,
                date(9999, 1, 1)
            ))
    
    return employees, salaries, dept_assignments

def main():
    batch_size = int(os.getenv('BATCH_SIZE', 1000))
    total_employees = int(os.getenv('TOTAL_EMPLOYEES', 10000))
    
    db_config = {
        'host': os.getenv('MYSQL_HOST', 'localhost'),
        'user': os.getenv('MYSQL_USER', 'root'),
        'password': os.getenv('MYSQL_ROOT_PASSWORD', 'demo123'),
        'database': os.getenv('MYSQL_DATABASE', 'employees')
    }
    
    fake = Faker()
    
    logger.info(f"Starting data load: {total_employees} employees in batches of {batch_size}")
    
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()
        
        for batch_start in range(0, total_employees, batch_size):
            start_time = time.time()
            
            employees, salaries, dept_assignments = generate_employee_batch(
                batch_start + 1000000,  # Start emp_no at 1000000
                min(batch_size, total_employees - batch_start),
                fake
            )
            
            # Insert batch data
            cursor.executemany("""
                INSERT INTO employees 
                (emp_no, birth_date, first_name, last_name, gender, hire_date)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, employees)
            
            cursor.executemany("""
                INSERT INTO salaries 
                (emp_no, salary, from_date, to_date)
                VALUES (%s, %s, %s, %s)
            """, salaries)
            
            cursor.executemany("""
                INSERT INTO dept_emp 
                (emp_no, dept_no, from_date, to_date)
                VALUES (%s, %s, %s, %s)
            """, dept_assignments)
            
            conn.commit()
            
            elapsed = time.time() - start_time
            logger.info(
                f"Batch {batch_start//batch_size + 1}/{(total_employees+batch_size-1)//batch_size} "
                f"completed in {elapsed:.2f}s"
            )
            
    except Exception as e:
        logger.error(f"Error loading data: {str(e)}")
        conn.rollback()
        raise
    finally:
        if 'conn' in locals():
            cursor.close()
            conn.close()

if __name__ == "__main__":
    main()