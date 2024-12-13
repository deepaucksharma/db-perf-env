const mysql = require('mysql2/promise');
const logger = require('./logger');

const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 10000,
    timezone: 'Z'
});

const executeQuery = async (query, params = [], context = '') => {
    const start = process.hrtime();
    try {
        const [results] = await pool.execute(query, params);
        const elapsed = process.hrtime(start);
        const duration = (elapsed[0] * 1000) + (elapsed[1] / 1000000);
        
        logger.info('Query executed', {
            context,
            duration,
            rowCount: results.length
        });
        
        return results;
    } catch (error) {
        logger.error('Query failed', {
            context,
            error: error.message,
            query: query.substring(0, 200)
        });
        throw error;
    }
};

module.exports = {
    pool,
    executeQuery
};
