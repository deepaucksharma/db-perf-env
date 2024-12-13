#!/bin/bash

echo "Analyzing database performance..."

# Check slow queries
docker-compose exec mysql mysql -u"$MYSQL_MONITOR_USER" -p"$MYSQL_MONITOR_PASSWORD" -e "
    SELECT 
        CONVERT(SQL_TEXT USING utf8) as query,
        COUNT_STAR as count,
        AVG_TIMER_WAIT/1000000000 as avg_latency_ms,
        MAX_TIMER_WAIT/1000000000 as max_latency_ms
    FROM performance_schema.events_statements_summary_by_digest
    WHERE SCHEMA_NAME = '$MYSQL_DATABASE'
    ORDER BY avg_latency_ms DESC
    LIMIT 10
"

# Check lock contention
docker-compose exec mysql mysql -u"$MYSQL_MONITOR_USER" -p"$MYSQL_MONITOR_PASSWORD" -e "
    SELECT 
        EVENT_NAME,
        COUNT_STAR as count,
        AVG_TIMER_WAIT/1000000000 as avg_wait_ms
    FROM performance_schema.events_waits_summary_global_by_event_name
    WHERE EVENT_NAME LIKE 'wait/lock%'
    AND COUNT_STAR > 0
    ORDER BY avg_wait_ms DESC
"

# Check memory usage
docker-compose exec mysql mysql -u"$MYSQL_MONITOR_USER" -p"$MYSQL_MONITOR_PASSWORD" -e "
    SELECT 
        EVENT_NAME,
        CURRENT_NUMBER_OF_BYTES_USED/1024/1024 as current_mb,
        HIGH_NUMBER_OF_BYTES_USED/1024/1024 as high_mb
    FROM performance_schema.memory_summary_global_by_event_name
    WHERE CURRENT_NUMBER_OF_BYTES_USED > 0
    ORDER BY current_mb DESC
    LIMIT 10
"
