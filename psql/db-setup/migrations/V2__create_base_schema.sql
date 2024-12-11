-- Create a base schema and a sample table
CREATE SCHEMA IF NOT EXISTS app;

CREATE TABLE app.users (
    user_id SERIAL PRIMARY KEY,
    username TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT now()
);
