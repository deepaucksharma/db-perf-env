import mysql.connector
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def insert_departments():
    db_config = {
        'host': os.getenv('MYSQL_HOST', 'localhost'),
        'user': os.getenv('MYSQL_USER', 'root'),
        'password': os.getenv('MYSQL_ROOT_PASSWORD', 'demo123'),
        'database': os.getenv('MYSQL_DATABASE', 'employees')
    }
    
    departments = [
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
    
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()
        
        cursor.executemany("""
            INSERT INTO departments (dept_no, dept_name)
            VALUES (%s, %s)
            ON DUPLICATE KEY UPDATE dept_name = VALUES(dept_name)
        """, departments)
        
        # Initialize manager_budget randomly
        cursor.execute("""
            UPDATE departments 
            SET manager_budget = FLOOR(1000000 + RAND() * 1000000)
            WHERE manager_budget IS NULL
        """)
        
        conn.commit()
        logger.info(f"Inserted {len(departments)} departments successfully")
        
    except Exception as e:
        logger.error(f"Error inserting departments: {str(e)}")
        conn.rollback()
        raise
    finally:
        if 'conn' in locals():
            cursor.close()
            conn.close()

if __name__ == "__main__":
    insert_departments()