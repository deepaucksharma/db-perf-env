SET @OLD_SQL_MODE = @@SQL_MODE;
SET SQL_MODE = 'NO_ENGINE_SUBSTITUTION';
SET NAMES utf8mb4;

-- Create users with basic permissions for demo
CREATE USER IF NOT EXISTS '${MYSQL_USER}'@'%' IDENTIFIED BY '${MYSQL_PASSWORD}';
CREATE USER IF NOT EXISTS '${MYSQL_MONITOR_USER}'@'%' IDENTIFIED BY '${MYSQL_MONITOR_PASSWORD}';

-- Grant permissions to application user
GRANT ALL PRIVILEGES ON ${MYSQL_DATABASE}.* TO '${MYSQL_USER}'@'%';

-- Grant monitoring permissions
GRANT SELECT, PROCESS, REPLICATION CLIENT ON *.* TO '${MYSQL_MONITOR_USER}'@'%';
GRANT SELECT ON performance_schema.* TO '${MYSQL_MONITOR_USER}'@'%';
GRANT SELECT ON sys.* TO '${MYSQL_MONITOR_USER}'@'%';
GRANT SELECT ON information_schema.* TO '${MYSQL_MONITOR_USER}'@'%';

-- Enable performance monitoring
UPDATE performance_schema.setup_instruments 
SET ENABLED = 'YES', TIMED = 'YES'
WHERE NAME LIKE '%statement/%' 
   OR NAME LIKE '%stage/%'
   OR NAME LIKE '%wait/%'
   OR NAME LIKE '%memory/%';

UPDATE performance_schema.setup_consumers
SET ENABLED = 'YES'
WHERE NAME LIKE '%events%';

FLUSH PRIVILEGES;
SET SQL_MODE = @OLD_SQL_MODE;