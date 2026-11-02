// ================================================================
// MAK DC INVESTMENT — AUDIT LOG CONTROLLER
// ================================================================

const { prisma } = require('../config/database');

const { query } = require('../db');

async function listAuditLogs(req, res) {
    try {
        const logs = await query(`
            SELECT 
                a.id,
                a.user_id,
                a.action,
                a.entity_type,
                a.entity_id,
                a.ip_address,
                a.created_at,
                u.full_name AS user_name
            FROM audit_logs a
            LEFT JOIN users u ON a.user_id = u.id
            ORDER BY a.created_at DESC
            LIMIT 100
        `);
        const formattedLogs = logs.map(log => ({
            id: log.id,
            userId: log.user_id,
            userName: log.user_name || log.user_id || 'System',
            action: log.action,
            entityType: log.entity_type,
            entityId: log.entity_id,
            ipAddress: log.ip_address,
            createdAt: log.created_at
        }));

        res.json(formattedLogs);

    } catch (err) {
        console.error('❌ List audit logs error:', err);
        res.status(500).json({ error: err.message });
    }
}

module.exports = { listAuditLogs };