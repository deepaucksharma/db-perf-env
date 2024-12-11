#!/usr/bin/env python3
import os
import psycopg2
import random
import string
import sys

def random_string(length=10):
    return ''.join(random.choices(string.ascii_lowercase, k=length))

def main():
    # Connect to the database and insert test data.
    # The official postgres image sets POSTGRES_USER, POSTGRES_DB, POSTGRES_PASSWORD env vars.
    dbname = os.environ.get('POSTGRES_DB', 'postgres')
    user = os.environ.get('POSTGRES_USER', 'postgres')
    password = os.environ.get('POSTGRES_PASSWORD', '')
    host = 'localhost'  # the container uses localhost internally during init

    try:
        conn = psycopg2.connect(dbname=dbname, user=user, password=password, host=host)
        cur = conn.cursor()

        # Insert 1000 random users
        for _ in range(1000):
            username = random_string()
            cur.execute("INSERT INTO app.users (username) VALUES (%s)", (username,))

        conn.commit()
        cur.close()
        print("Data loaded successfully.")
    except Exception as e:
        print("Error loading data:", e, file=sys.stderr)
        sys.exit(1)
    finally:
        if conn:
            conn.close()

if __name__ == '__main__':
    main()
