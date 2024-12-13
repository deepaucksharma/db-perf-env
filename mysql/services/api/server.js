import express from 'express';
import { createPool } from 'mysql2/promise';
import asyncHandler from 'express-async-handler';

const app = express();

const pool = createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 10
});

app.get('/health', asyncHandler(async (req, res) => {
    await pool.query('SELECT 1');
    res.json({ status: 'healthy' });
}));

app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
});

const port = process.env.API_PORT || 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});