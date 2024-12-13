const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
    logger.error('Error occurred', {
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
    });

    res.status(500).json({ status: 'error', message: 'Internal server error' });
};

module.exports = errorHandler;
