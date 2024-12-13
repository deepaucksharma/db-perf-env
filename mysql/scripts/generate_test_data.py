#!/usr/bin/env python3
import mysql.connector
import random
import argparse
from datetime import datetime, timedelta
import os

def create_salary_variations(conn, cursor):
    """Create salary variations for performance testing"""
    cursor.execute("""
        UPDATE salaries s
        JOIN employees e ON s.emp_no = e.emp_no
        SET s.salary = 
            CASE 
                WHEN e.salary_tier = 1 THEN s.salary * 1.5
                WHEN e.salary_tier = 2 THEN s.salary * 1.2
                ELSE s.salary
            END
        WHERE s.to_date = '9999-01-01'
    """)
    conn.commit()

def create_department_transfers(conn, cursor):
    """Create department transfer history"""
    cursor.execute("""
        INSERT INTO dept_emp (emp_no, dept_no, from_date, to_date)
        SELECT 
            e.emp_no,
            d.dept_no,
            DATE_SUB(CURRENT_DATE, INTERVAL FLOOR(RAND() * 365) DAY),
            '9999-01-01'
        FROM employees e
        CROSS JOIN departments d
        WHERE RAND() < 0.1
        AND NOT EXISTS (
            SELECT 1 FROM dept_emp de 
            WHERE de.emp_no = e.emp_no 
            AND de.dept_no = d.dept_no
        )
        LIMIT 1000
    """)
    conn.commit()

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--variations', choices=['salaries', 'transfers', 'all'], 
                       default='all', help='Type of variations to generate')
    
    args = parser.parse_args()
    
    conn = mysql.connector.connect(
        host=os.getenv('MYSQL_HOST'),
        user=os.getenv('MYSQL_USER'),
        password=os.getenv('MYSQL_PASSWORD'),
        database=os.getenv('MYSQL_DATABASE')
    )
    
    cursor = conn.cursor()
    
    try:
        if args.variations in ['salaries', 'all']:
            print("Generating salary variations...")
            create_salary_variations(conn, cursor)
            
        if args.variations in ['transfers', 'all']:
            print("Generating department transfers...")
            create_department_transfers(conn, cursor)
            
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    main()
