-- Enable performance schema instruments and consumers
USE performance_schema;

UPDATE performance_schema.setup_instruments
SET ENABLED='YES', TIMED='YES'
WHERE NAME LIKE 'statement/%' 
   OR NAME LIKE 'stage/%' 
   OR NAME LIKE 'wait/%';

UPDATE performance_schema.setup_consumers
SET ENABLED='YES'
WHERE NAME LIKE '%events_statements_history_long%'
   OR NAME LIKE '%events_stages_history_long%'
   OR NAME LIKE '%events_waits_history_long%';

-- Create monitoring user
CREATE USER IF NOT EXISTS 'newrelic'@'%' IDENTIFIED BY 'newrelicpass123';
GRANT REPLICATION CLIENT, PROCESS ON *.* TO 'newrelic'@'%';
GRANT SELECT ON performance_schema.* TO 'newrelic'@'%';
FLUSH PRIVILEGES;
