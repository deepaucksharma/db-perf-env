import mysql.connector
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_tables():
    db_config = {
        'host': os.getenv('MYSQL_HOST', 'localhost'),
        'user': os.getenv('MYSQL_USER', 'root'),
        'password': os.getenv('MYSQL_ROOT_PASSWORD', 'demo123'),
        'database': os.getenv('MYSQL_DATABASE', 'employees')
    }
    
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()
        
        # Create departments table if not exists
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS departments (
                dept_no CHAR(4) PRIMARY KEY,
                dept_name VARCHAR(40) NOT NULL,
                manager_budget DECIMAL(15,2),
                UNIQUE KEY uk_dept_name (dept_name)
            )
        """)
        
        # Create employees table if not exists
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS employees (
                emp_no INT PRIMARY KEY,
                birth_date DATE NOT NULL,
                first_name VARCHAR(50) NOT NULL,
                last_name VARCHAR(50) NOT NULL,
                gender ENUM('M','F') NOT NULL,
                hire_date DATE NOT NULL,
                birth_month INT GENERATED ALWAYS AS (MONTH(birth_date)) STORED,
                hire_year INT GENERATED ALWAYS AS (YEAR(hire_date)) STORED,
                salary_tier INT GENERATED ALWAYS AS (
                    CASE 
                        WHEN emp_no % 4 = 0 THEN 1
                        WHEN emp_no % 4 = 1 THEN 2
                        WHEN emp_no % 4 = 2 THEN 3
                        ELSE 4
                    END
                ) STORED
            )
        """)
        
        conn.commit()
        logger.info("Tables created successfully")
        
    except Exception as e:
        logger.error(f"Error creating tables: {str(e)}")
        conn.rollback()
        raise
    finally:
        if 'conn' in locals():
            cursor.close()
            conn.close()

if __name__ == "__main__":
    create_tables()