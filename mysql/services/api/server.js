'use strict';

require('newrelic');
const express = require('express');
const asyncHandler = require('express-async-handler');

// Import utils
const { pool } = require('./src/utils/database');
const logger = require('./src/utils/logger');

// Import routes
const enterpriseRoutes = require('./src/routes/enterprise');
const healthRoutes = require('./src/routes/health');

// Import middleware
const errorHandler = require('./src/middleware/errorHandler');

// Create Express app
const app = express();

// Request logging middleware
app.use((req, res, next) => {
    const requestStart = Date.now();
    const requestId = Math.random().toString(36).substring(7);
    
    logger.info('Request started', {
        requestId,
        method: req.method,
        url: req.url
    });

    res.on('finish', () => {
        logger.info('Request completed', {
            requestId,
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            duration: Date.now() - requestStart
        });
    });

    next();
});

// Database connection pool
app.locals.pool = pool;

// Use JSON middleware
app.use(express.json());

// Health check endpoint
app.use('/health', healthRoutes);

// Enterprise routes
app.use('/enterprise', enterpriseRoutes);

// Error handler
app.use(errorHandler);

// Start server
const PORT = process.env.API_PORT || 3000;
app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
});
