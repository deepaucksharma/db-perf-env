#!/usr/bin/env python3
import mysql.connector
import os
import logging
from mysql.connector import Error

logging.basicConfig(level=os.getenv('LOG_LEVEL', 'INFO'))
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

def get_db_config():
    return {
        'host': os.getenv('MYSQL_HOST', 'localhost'),
        'user': os.getenv('MYSQL_USER'),
        'password': os.getenv('MYSQL_PASSWORD'),
        'database': os.getenv('MYSQL_DATABASE'),
        'raise_on_warnings': True
    }

def main():
    try:
        conn = mysql.connector.connect(**get_db_config())
        cursor = conn.cursor()
        
        # Insert departments
        cursor.executemany(
            """INSERT INTO departments (dept_no, dept_name)
               VALUES (%s, %s)
               ON DUPLICATE KEY UPDATE dept_name = VALUES(dept_name)""",
            DEPARTMENTS
        )
        
        # Initialize manager_budget with realistic values
        cursor.execute("""
            UPDATE departments 
            SET manager_budget = 
                CASE 
                    WHEN dept_name IN ('IT', 'Sales', 'Research and Development')
                    THEN FLOOR(1500000 + RAND() * 500000)
                    ELSE FLOOR(800000 + RAND() * 400000)
                END
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