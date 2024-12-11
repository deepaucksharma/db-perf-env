-- Enable performance schema instruments and consumers after root user is set up
SET @OLD_SQL_MODE = @@SQL_MODE;
SET SQL_MODE = 'TRADITIONAL,ALLOW_INVALID_DATES';

-- Create monitoring user using environment variables
CREATE USER IF NOT EXISTS '${MYSQL_MONITOR_USER}'@'%' IDENTIFIED BY '${MYSQL_MONITOR_PASSWORD}';

-- Grant permissions for monitoring
GRANT REPLICATION CLIENT ON *.* TO '${MYSQL_MONITOR_USER}'@'%';
GRANT PROCESS ON *.* TO '${MYSQL_MONITOR_USER}'@'%';
GRANT SELECT ON performance_schema.* TO '${MYSQL_MONITOR_USER}'@'%';
GRANT SELECT ON information_schema.* TO '${MYSQL_MONITOR_USER}'@'%';

-- Enable performance schema after grants
USE performance_schema;

UPDATE setup_instruments 
SET ENABLED = 'YES', TIMED = 'YES'
WHERE NAME LIKE 'statement/%' 
   OR NAME LIKE 'stage/%' 
   OR NAME LIKE 'wait/%';

UPDATE setup_consumers
SET ENABLED = 'YES'
WHERE NAME LIKE '%events_statements_history_long%'
   OR NAME LIKE '%events_stages_history_long%'
   OR NAME LIKE '%events_waits_history_long%';

FLUSH PRIVILEGES;
SET SQL_MODE = @OLD_SQL_MODE;