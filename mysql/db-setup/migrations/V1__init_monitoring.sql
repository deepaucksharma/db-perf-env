SET @OLD_SQL_MODE = @@SQL_MODE;
SET SQL_MODE = 'TRADITIONAL,ALLOW_INVALID_DATES';

-- Create the monitoring user with proper root privileges first
CREATE USER IF NOT EXISTS '${MYSQL_MONITOR_USER}'@'%' IDENTIFIED BY '${MYSQL_MONITOR_PASSWORD}';

-- Grant basic privileges first
GRANT SELECT, PROCESS ON *.* TO '${MYSQL_MONITOR_USER}'@'%';

-- Enable performance schema
USE performance_schema;

-- Enable detailed performance monitoring
SET GLOBAL performance_schema_max_digest_length=4096;
SET GLOBAL performance_schema_max_sql_text_length=4096;

-- Enable all relevant instruments for maximum monitoring data
UPDATE setup_instruments 
SET ENABLED = 'YES', TIMED = 'YES'
WHERE NAME LIKE '%statement%' 
   OR NAME LIKE '%stage%'
   OR NAME LIKE '%wait%'
   OR NAME LIKE '%lock%'
   OR NAME LIKE '%memory%';

-- Enable all consumers for comprehensive data collection
UPDATE setup_consumers
SET ENABLED = 'YES'
WHERE NAME LIKE '%events%';

FLUSH PRIVILEGES;
SET SQL_MODE = @OLD_SQL_MODE;
