// ================================================================
// DATABASE CONNECTION — Railway PostgreSQL (Cloud)
// ================================================================
const { Pool } = require('pg');
require('dotenv').config();

// Railway inatoa DATABASE_URL moja tu — tunaitumia moja kwa moja
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' 
        ? { rejectUnauthorized: false } 
        : false,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
});

// Log connection
pool.on('connect', () => {
    console.log('✅ PostgreSQL (Railway) connected');
});

pool.on('error', (err) => {
    console.error('❌ PostgreSQL pool error:', err.message);
});

// Helper: Fanya query kirahisi
async function query(sql, params = []) {
    const result = await pool.query(sql, params);
    return result.rows;
}

// Helper: Fanya query na kurudisha result kamili
async function execute(sql, params = []) {
    const result = await pool.query(sql, params);
    return result;
}

// Test connection on startup
pool.query('SELECT NOW()')
    .then(() => console.log('✅ Database test: OK'))
    .catch(err => console.error('❌ Database test failed:', err.message));

module.exports = { pool, query, execute };