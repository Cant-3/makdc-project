// ================================================================
// MAK DC INVESTMENT — PRISMA CLIENT
// ================================================================
// File hii inaunganisha na database kwa kutumia Prisma
// ================================================================

const { PrismaClient } = require('@prisma/client');

// Tumia single instance ya Prisma (best practice)
const prisma = global.prisma || new PrismaClient({
    log: process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error']
});

if (process.env.NODE_ENV === 'development') {
    global.prisma = prisma;
}

// ================================================================
// TEST CONNECTION
// ================================================================
async function connectDatabase() {
    try {
        await prisma.$connect();
        console.log('✅ Database imeunganishwa (PostgreSQL)');
    } catch (error) {
        console.error('❌ Database connection error:', error.message);
        process.exit(1);
    }
}

// ================================================================
// DISCONNECT
// ================================================================
async function disconnectDatabase() {
    await prisma.$disconnect();
    console.log('👋 Database imekatwa');
}

module.exports = {
    prisma,
    connectDatabase,
    disconnectDatabase
};