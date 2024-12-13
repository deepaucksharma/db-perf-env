#!/usr/bin/env python3
import mysql.connector
import random
import json
import decimal
from datetime import date, timedelta
from faker import Faker
import os
import logging
import time
from mysql.connector import Error, IntegrityError
from mysql.connector.errors import OperationalError, InterfaceError
from typing import List, Tuple, Dict, Any, Set
import sys

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def get_db_config() -> Dict[str, Any]:
    """Database configuration with retries and timeouts."""
    return {
        'host': os.getenv('MYSQL_HOST', 'localhost'),
        'user': os.getenv('MYSQL_USER'),
        'password': os.getenv('MYSQL_PASSWORD'),
        'database': os.getenv('MYSQL_DATABASE'),
        'raise_on_warnings': True,
        'connect_timeout': 30,
        'connection_timeout': 30,
        'pool_size': 5,
        'pool_name': 'data_loader',
        'pool_reset_session': True,
        'allow_local_infile': True
    }

def create_database_connection(max_retries: int = 5, retry_delay: int = 5) -> mysql.connector.MySQLConnection:
    """Create database connection with retry logic."""
    for attempt in range(max_retries):
        try:
            conn = mysql.connector.connect(**get_db_config())
            cursor = conn.cursor()
            
            # Configure session for performance testing
            cursor.execute("SET SESSION innodb_flush_log_at_trx_commit = 1")
            cursor.execute("SET SESSION foreign_key_checks = 0")
            cursor.execute("SET SESSION unique_checks = 0")
            cursor.execute("SET SESSION sql_log_bin = 1")
            
            cursor.close()
            return conn
            
        except mysql.connector.Error as err:
            if attempt == max_retries - 1:
                logger.error(f"Failed to connect to database after {max_retries} attempts")
                raise Exception("Max retries exceeded while trying to connect to the database.")
            logger.warning(f"Connection attempt {attempt + 1} failed: {err}")
            time.sleep(retry_delay)

def generate_employee_batch(
    start_emp_no: int,
    batch_size: int,
    fake: Faker,
    used_emp_nos: Set[int]
) -> Tuple[List[Tuple], List[Tuple], List[Tuple]]:
    """Generate a batch of employee data with related salary and department records."""
    employees = []
    salaries = []
    dept_assignments = []
    departments = ['d001', 'd002', 'd003', 'd004', 'd005', 
                  'd006', 'd007', 'd008', 'd009', 'd010']
    
    for i in range(batch_size):
        # Generate unique non-sequential employee number
        while True:
            emp_no = start_emp_no + random.randint(1, 1000)
            if emp_no not in used_emp_nos:
                used_emp_nos.add(emp_no)
                break

        # Generate dates with realistic constraints
        birth_date = fake.date_between(start_date='-65y', end_date='-25y')
        hire_date = fake.date_between(
            start_date=max(birth_date + timedelta(days=6570), date(2000, 1, 1)),
            end_date='today'
        )

        # Generate rich employee details
        employee_details = {
            'address': fake.address(),
            'phone': fake.phone_number(),
            'email': fake.email(),
            'emergency_contact': {
                'name': fake.name(),
                'relationship': random.choice(['Spouse', 'Parent', 'Sibling', 'Friend']),
                'phone': fake.phone_number()
            },
            'skills': [fake.job_skill() for _ in range(random.randint(3, 8))],
            'education': [
                {
                    'degree': fake.random_element(['BS', 'MS', 'PhD', 'BA', 'MBA']),
                    'field': fake.random_element(['Computer Science', 'Engineering', 'Business', 'Mathematics']),
                    'year': random.randint(1980, 2020),
                    'institution': fake.university()
                } for _ in range(random.randint(1, 3))
            ],
            'languages': [
                {
                    'language': lang,
                    'proficiency': random.choice(['Basic', 'Intermediate', 'Advanced', 'Native'])
                } for lang in random.sample(['English', 'Spanish', 'French', 'German', 'Chinese', 'Japanese'], 
                                         random.randint(1, 3))
            ]
        }

        # Generate detailed performance history
        performance_history = {
            'reviews': [
                {
                    'date': fake.date_time_between(start_date=hire_date).isoformat(),
                    'rating': random.randint(1, 5),
                    'feedback': fake.text(max_nb_chars=500),
                    'reviewer': fake.name(),
                    'categories': {
                        'technical_skills': random.randint(1, 5),
                        'communication': random.randint(1, 5),
                        'teamwork': random.randint(1, 5),
                        'initiative': random.randint(1, 5)
                    }
                } for _ in range(random.randint(3, 8))
            ],
            'promotions': [
                {
                    'date': fake.date_between(start_date=hire_date).isoformat(),
                    'new_title': fake.job_title(),
                    'previous_title': fake.job_title(),
                    'reason': fake.text(max_nb_chars=200),
                    'salary_impact': f"{random.randint(5, 25)}%"
                } for _ in range(random.randint(0, 3))
            ],
            'training': [
                {
                    'course': fake.random_element(['Leadership', 'Technical Skills', 'Soft Skills', 'Project Management']),
                    'completion_date': fake.date_between(start_date=hire_date).isoformat(),
                    'score': random.randint(70, 100)
                } for _ in range(random.randint(2, 6))
            ]
        }

        employees.append((
            emp_no,
            birth_date,
            fake.first_name(),
            fake.last_name(),
            random.choice(['M', 'F']),
            hire_date,
            json.dumps(employee_details),
            json.dumps(performance_history)
        ))

        # Generate salary history with more varied patterns
        current_date = hire_date
        base_salary = decimal.Decimal(random.randint(30000, 70000))
        
        for year in range(random.randint(3, 8)):
            # Allow for salary decreases and varied increases
            salary_change = decimal.Decimal(str(random.uniform(-0.1, 0.2)))
            salary = base_salary * (decimal.Decimal('1.0') + salary_change)
            
            from_date = current_date
            to_date = current_date + timedelta(days=random.randint(180, 720))
            
            salary_details = {
                'base_salary': float(base_salary),
                'bonus_percent': random.uniform(0.05, 0.15),
                'allowances': {
                    'housing': random.randint(5000, 15000),
                    'transportation': random.randint(1000, 3000),
                    'medical': random.randint(2000, 8000)
                },
                'deductions': {
                    'tax': random.uniform(0.15, 0.25),
                    'insurance': random.uniform(0.05, 0.1),
                    'pension': random.uniform(0.03, 0.08)
                },
                'performance_bonus': random.randint(0, 10000) if random.random() < 0.3 else 0
            }

            audit_trail = {
                'modified_by': fake.name(),
                'modified_at': fake.date_time().isoformat(),
                'reason': fake.text(max_nb_chars=100),
                'previous_salary': float(base_salary),
                'change_percent': float(salary_change * 100),
                'approval_chain': [fake.name() for _ in range(random.randint(1, 3))],
                'market_adjustment': random.choice([True, False]),
                'review_period': f"FY{random.randint(2000, 2024)}"
            }

            salaries.append((
                emp_no,
                salary.quantize(decimal.Decimal('.01')),
                from_date,
                to_date,
                json.dumps(salary_details),
                json.dumps(audit_trail)
            ))
            
            current_date = to_date - timedelta(days=random.randint(0, 30))  # Allow some overlap
            base_salary = salary

        # Generate overlapping department assignments
        num_assignments = random.randint(2, 4)
        available_departments = departments.copy()
        
        for _ in range(num_assignments):
            if not available_departments:
                break
                
            dept_no = random.choice(available_departments)
            available_departments.remove(dept_no)
            
            # Create intentionally overlapping dates
            from_date = hire_date + timedelta(days=random.randint(-30, 30))
            to_date = from_date + timedelta(days=random.randint(180, 720))
            
            dept_assignments.append((
                emp_no,
                dept_no,
                from_date,
                to_date
            ))

    return employees, salaries, dept_assignments

def main():
    # Cap batch size for manageability
    batch_size = min(int(os.getenv('BATCH_SIZE', 1000)), 5000)
    total_employees = int(os.getenv('TOTAL_EMPLOYEES', 10000))
    
    fake = Faker()
    used_emp_nos = set()
    
    try:
        conn = create_database_connection()
        cursor = conn.cursor()
        
        logger.info(f"Starting data load: target {total_employees} employees")
        start_time = time.time()
        
        for batch_start in range(0, total_employees, batch_size):
            batch_time = time.time()
            current_batch_size = min(batch_size, total_employees - batch_start)
            
            try:
                employees, salaries, dept_assignments = generate_employee_batch(
                    batch_start + 1000000,
                    current_batch_size,
                    fake,
                    used_emp_nos
                )
                
                # Insert with error handling
                try:
                    cursor.executemany(
                        """INSERT INTO employees 
                           (emp_no, birth_date, first_name, last_name, gender, hire_date, 
                            employee_details, performance_history)
                           VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
                        employees
                    )
                    
                    cursor.executemany(
                        """INSERT INTO salaries 
                           (emp_no, salary, from_date, to_date, salary_details, audit_trail)
                           VALUES (%s, %s, %s, %s, %s, %s)""",
                        salaries
                    )
                    
                    cursor.executemany(
                        """INSERT INTO dept_emp 
                           (emp_no, dept_no, from_date, to_date)
                           VALUES (%s, %s, %s, %s)""",
                        dept_assignments
                    )
                    
                    conn.commit()
                    
                except IntegrityError as e:
                    logger.warning(f"Integrity error in batch: {e}")
                    conn.rollback()
                    continue
                
                batch_elapsed = time.time() - batch_time
                total_elapsed = time.time() - start_time
                
                logger.info(
                    f"Batch {batch_start//batch_size + 1} completed: "
                    f"{len(employees)} employees, "
                    f"{len(salaries)} salary records, "
                    f"{len(dept_assignments)} department assignments. "
                    f"Batch time: {batch_elapsed:.2f}s, "
                    f"Total time: {total_elapsed:.2f}s"
                )
                
                # Occasionally analyze tables
                if random.random() < 0.1:
                    logger.info("Running table analysis...")
                    cursor.execute("ANALYZE TABLE employees, salaries, dept_emp")
                
            except Error as e:
                logger.error(f"Error in batch starting at {batch_start}: {e}")
                conn.rollback()
                continue
            
    except Error as e:
        logger.error(f"Database error: {e}")
        raise
    finally:
        if 'cursor' in locals():
            cursor.execute("SET SESSION foreign_key_checks = 1")
            cursor.execute("SET SESSION unique_checks = 1")
            cursor.close()
        if 'conn' in locals():
            conn.close()
            
    total_time = time.time() - start_time
    logger.info(f"Data load completed in {total_time:.2f} seconds")

if __name__ == "__main__":
    main()