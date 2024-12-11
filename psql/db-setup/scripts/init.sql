-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Create monitor user
DO $$
BEGIN
    CREATE USER ${POSTGRES_MONITOR_USER} WITH PASSWORD '${POSTGRES_MONITOR_PASSWORD}';
    EXCEPTION WHEN DUPLICATE_OBJECT THEN
    NULL;
END
$$;

GRANT pg_monitor TO ${POSTGRES_MONITOR_USER};

-- Create maintenance logging table
CREATE TABLE IF NOT EXISTS maintenance_log (
    id SERIAL PRIMARY KEY,
    operation TEXT NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    success BOOLEAN DEFAULT false,
    duration INTERVAL GENERATED ALWAYS AS (end_time - start_time) STORED
);
