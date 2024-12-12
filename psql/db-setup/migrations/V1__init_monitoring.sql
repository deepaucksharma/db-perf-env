-- Enable extensions for monitoring and create a monitoring user
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Create monitor user
DO $$
BEGIN
    CREATE USER ${POSTGRES_MONITOR_USER} WITH PASSWORD '${POSTGRES_MONITOR_PASSWORD}';
    EXCEPTION WHEN DUPLICATE_OBJECT THEN
    NULL;
END
$$;

GRANT CONNECT ON DATABASE ${POSTGRES_DB} TO ${POSTGRES_MONITOR_USER};
GRANT USAGE ON SCHEMA public TO ${POSTGRES_MONITOR_USER};
GRANT SELECT ON ALL TABLES IN SCHEMA public TO ${POSTGRES_MONITOR_USER};
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO ${POSTGRES_MONITOR_USER};
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO ${POSTGRES_MONITOR_USER};
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

-- Function to insert into the maintenance log
CREATE OR REPLACE FUNCTION log_maintenance(
    p_operation TEXT,
    p_start_time TIMESTAMP WITH TIME ZONE,
    p_end_time TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_success BOOLEAN DEFAULT FALSE
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO maintenance_log (operation, start_time, end_time, success)
    VALUES (p_operation, p_start_time, p_end_time, p_success);
END;
$$ LANGUAGE plpgsql;
