const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' 
        ? { rejectUnauthorized: false } 
        : false,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
});
pool.on('connect', () => {
    console.log('✅ PostgreSQL (Neon) connected');
});

pool.on('error', (err) => {
    console.error('❌ PostgreSQL pool error:', err.message);
});
async function query(sql, params = []) {
    const result = await pool.query(sql, params);
    return result.rows;
}
async function execute(sql, params = []) {
    const result = await pool.query(sql, params);
    return result;
}
pool.query('SELECT NOW()')
    .then(() => console.log('✅ Database test: OK'))
    .catch(err => console.error('❌ Database test failed:', err.message));

module.exports = { pool, query, execute };