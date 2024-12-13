-- Enable ALL performance monitoring instruments
UPDATE performance_schema.setup_instruments 
SET ENABLED = 'YES', TIMED = 'YES';

-- Enable ALL consumers
UPDATE performance_schema.setup_consumers
SET ENABLED = 'YES';

-- Specific instrument categories (for clarity of what's being monitored)
UPDATE performance_schema.setup_instruments 
SET ENABLED = 'YES', TIMED = 'YES'
WHERE NAME LIKE 'wait/%'
   OR NAME LIKE 'stage/%'
   OR NAME LIKE 'statement/%'
   OR NAME LIKE 'transaction/%'
   OR NAME LIKE 'memory/%'
   OR NAME LIKE 'idle/%'
   OR NAME LIKE 'error/%'
   OR NAME LIKE 'lock/%'
   OR NAME LIKE 'metadata/%'
   OR NAME LIKE 'table/%'
   OR NAME LIKE 'socket/%'
   OR NAME LIKE 'prepared_statements/%'
   OR NAME LIKE 'program/%'
   OR NAME LIKE 'host_cache/%'
   OR NAME LIKE 'threads/%';

-- Enable thread monitoring
UPDATE performance_schema.setup_threads
SET ENABLED = 'YES', HISTORY = 'YES';

-- Enable index stats
UPDATE performance_schema.setup_objects 
SET ENABLED = 'YES', TIMED = 'YES'
WHERE OBJECT_TYPE = 'TABLE';

-- Set global variables for additional monitoring
SET GLOBAL log_output = 'TABLE,FILE';
SET GLOBAL general_log = 'ON';
SET GLOBAL slow_query_log = 'ON';

-- Create poor histograms (as before)
ANALYZE TABLE employees UPDATE HISTOGRAM ON 
    birth_date, hire_date, gender 
WITH 2 BUCKETS;

ANALYZE TABLE salaries UPDATE HISTOGRAM ON
    salary, from_date, to_date
WITH 2 BUCKETS;

-- Flush privileges to ensure changes take effect
FLUSH PRIVILEGES;
FLUSH STATUS;
