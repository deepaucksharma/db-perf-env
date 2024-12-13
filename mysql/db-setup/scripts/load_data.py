#!/usr/bin/env python3
import mysql.connector
import random
from datetime import date, timedelta
from faker import Faker
import os
import logging
import time
from mysql.connector import Error

logging.basicConfig(
    level=os.getenv('LOG_LEVEL', 'INFO'),
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def get_db_config():
    return {
        'host': os.getenv('MYSQL_HOST', 'localhost'),
        'user': os.getenv('MYSQL_USER'),
        'password': os.getenv('MYSQL_PASSWORD'),
        'database': os.getenv('MYSQL_DATABASE'),
        'raise_on_warnings': True,
        'connect_timeout': 30
    }

def generate_employee_batch(start_emp_no, batch_size, fake):
    employees = []
    salaries = []
    dept_assignments = []
    departments = ['d001', 'd002', 'd003', 'd004', 'd005', 
                  'd006', 'd007', 'd008', 'd009', 'd010']
    
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
        
        # Generate salary history with realistic progression
        current_date = hire_date
        base_salary = random.randint(30000, 70000)
        for year in range(random.randint(2, 4)):
            salary = base_salary * (1 + year * 0.05)  # 5% raise each year
            if random.random() < 0.05:  # 5% outliers
                salary *= random.uniform(1.5, 2.0)
            
            to_date = date(9999, 1, 1) if year == 0 else \
                     current_date + timedelta(days=365)
            
            salaries.append((emp_no, int(salary), current_date, to_date))
            current_date = to_date
        
        # Department assignments with realistic distribution
        num_depts = random.choices([1, 2], weights=[0.8, 0.2])[0]  # 80% in one dept, 20% in two
        selected_depts = random.sample(departments, num_depts)
        for dept_no in selected_depts:
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
    
    try:
        conn = mysql.connector.connect(**get_db_config())
        cursor = conn.cursor()
        
        fake = Faker()
        logger.info(f"Starting data load: {total_employees} employees")
        
        for batch_start in range(0, total_employees, batch_size):
            start_time = time.time()
            
            try:
                employees, salaries, dept_assignments = generate_employee_batch(
                    batch_start + 1000000,  # Starting emp_no
                    min(batch_size, total_employees - batch_start),
                    fake
                )
                
                cursor.executemany(
                    """INSERT INTO employees 
                       (emp_no, birth_date, first_name, last_name, gender, hire_date)
                       VALUES (%s, %s, %s, %s, %s, %s)""",
                    employees
                )
                
                cursor.executemany(
                    """INSERT INTO salaries 
                       (emp_no, salary, from_date, to_date)
                       VALUES (%s, %s, %s, %s)""",
                    salaries
                )
                
                cursor.executemany(
                    """INSERT INTO dept_emp 
                       (emp_no, dept_no, from_date, to_date)
                       VALUES (%s, %s, %s, %s)""",
                    dept_assignments
                )
                
                conn.commit()
                
                elapsed = time.time() - start_time
                logger.info(
                    f"Batch {batch_start//batch_size + 1} completed: "
                    f"{len(employees)} employees loaded in {elapsed:.2f}s"
                )
                
            except Error as e:
                logger.error(f"Error in batch starting at {batch_start}: {e}")
                conn.rollback()
                continue
            
    except Error as e:
        logger.error(f"Database error: {e}")
        raise
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    main()