#!/usr/bin/env python3
import mysql.connector
import os
import logging
import json
from faker import Faker
from mysql.connector import Error

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DEPARTMENTS = [
    ('d001', 'Marketing'),
    ('d002', 'Finance'),
    ('d003', 'Human Resources'),
    ('d004', 'Research and Development'),
    ('d005', 'Quality Assurance'),
    ('d006', 'Sales'),
    ('d007', 'IT'),
    ('d008', 'Operations'),
    ('d009', 'Customer Support'),
    ('d010', 'Product Management')
]

def get_env_or_fail(var_name: str) -> str:
    value = os.getenv(var_name)
    if value is None:
        raise ValueError(f"Required environment variable {var_name} is not set")
    return value

def get_db_config():
    return {
        'host': os.getenv('MYSQL_HOST', 'localhost'),
        'user': get_env_or_fail('MYSQL_USER'),
        'password': get_env_or_fail('MYSQL_PASSWORD'),
        'database': get_env_or_fail('MYSQL_DATABASE'),
        'raise_on_warnings': True
    }

def main():
    fake = Faker()
    try:
        conn = mysql.connector.connect(**get_db_config())
        cursor = conn.cursor()
        
        # Insert departments with rich data
        enriched_departments = [
            (
                dept_no,
                dept_name,
                fake.text(max_nb_chars=500),  # department_description
                json.dumps({
                    'created_by': 'system',
                    'created_at': fake.date_time().isoformat(),
                    'metadata': {
                        'location': fake.city(),
                        'cost_center': fake.random_number(digits=6),
                        'reporting_line': fake.name()
                    }
                })  # audit_log
            )
            for dept_no, dept_name in DEPARTMENTS
        ]
        
        cursor.executemany(
            """INSERT INTO departments 
               (dept_no, dept_name, department_description, audit_log)
               VALUES (%s, %s, %s, %s)
               ON DUPLICATE KEY UPDATE 
               dept_name = VALUES(dept_name),
               department_description = VALUES(department_description),
               audit_log = VALUES(audit_log)""",
            enriched_departments
        )
        
        # Initialize manager_budget randomly
        cursor.execute("""
            UPDATE departments 
            SET manager_budget = FLOOR(1000000 + RAND() * 1000000)
            WHERE manager_budget IS NULL
        """)
        
        conn.commit()
        logger.info(f"Inserted {len(DEPARTMENTS)} departments successfully")
        
    except Error as e:
        logger.error(f"Error: {e}")
        if 'conn' in locals():
            conn.rollback()
        raise
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    main()