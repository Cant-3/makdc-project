// ================================================================
// MAK DC INVESTMENT — MARKET RESEARCH CONTROLLER
// ================================================================
// Handles: Market Research (CRUD + Findings + Recommendations)
// ================================================================

const { prisma } = require('../config/database');

// ================================================================
// HELPER: Parse findings JSON safely
// ================================================================
function parseFindings(findings) {
    if (!findings) return [];
    try {
        return typeof findings === 'string' ? JSON.parse(findings) : findings;
    } catch {
        return [];
    }
}

// ================================================================
// CREATE RESEARCH
// POST /api/market-research
// ================================================================
async function createResearch(req, res) {
    try {
        const {
            title, researchType, description, conductedBy,
            periodStart, periodEnd, findings, summary,
            recommendations, attachmentName, attachmentData, status
        } = req.body;

        if (!title || !researchType) {
            return res.status(400).json({
                error: 'Title and research type are required.'
            });
        }

        const validTypes = ['competitor', 'survey', 'trend', 'pricing'];
        if (!validTypes.includes(researchType)) {
            return res.status(400).json({ error: 'Invalid research type.' });
        }

        const validStatuses = ['draft', 'ongoing', 'completed', 'cancelled'];
        const finalStatus = status || 'draft';
        if (!validStatuses.includes(finalStatus)) {
            return res.status(400).json({ error: 'Invalid status.' });
        }

        const research = await prisma.marketResearch.create({
            data: {
                title,
                researchType,
                description: description || null,
                conductedBy: conductedBy || null,
                periodStart: periodStart ? new Date(periodStart) : null,
                periodEnd: periodEnd ? new Date(periodEnd) : null,
                findings: findings ? JSON.stringify(findings) : null,
                summary: summary || null,
                recommendations: recommendations || null,
                attachmentName: attachmentName || null,
                attachmentData: attachmentData || null,
                status: finalStatus,
                createdBy: req.user.userId
            },
            include: {
                creator: {
                    select: { id: true, fullName: true, role: true }
                }
            }
        });

        // Audit log
        await prisma.auditLog.create({
            data: {
                userId: req.user.userId,
                action: 'create_market_research',
                entityType: 'market_research',
                entityId: String(research.id),
                details: { title, researchType },
                ipAddress: req.ip || 'unknown'
            }
        });

        res.status(201).json({
            message: 'Market research created!',
            research: {
                ...research,
                findings: parseFindings(research.findings)
            }
        });

    } catch (err) {
        console.error('❌ Create research error:', err);
        res.status(500).json({ error: 'Failed to create research.' });
    }
}

// ================================================================
// LIST RESEARCH
// GET /api/market-research?type=competitor&status=completed
// ================================================================
async function listResearch(req, res) {
    try {
        const { type, status, search } = req.query;

        const where = {};
        if (type && type !== 'all') where.researchType = type;
        if (status && status !== 'all') where.status = status;
        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } }
            ];
        }

        const research = await prisma.marketResearch.findMany({
            where,
            include: {
                creator: {
                    select: { id: true, fullName: true, role: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        const parsed = research.map(r => ({
            ...r,
            findings: parseFindings(r.findings),
            // Don't send attachmentData kwenye list (heavy)
            attachmentData: undefined
        }));

        res.json({
            count: parsed.length,
            research: parsed
        });

    } catch (err) {
        console.error('❌ List research error:', err);
        res.status(500).json({ error: 'Failed to fetch research.' });
    }
}

// ================================================================
// GET SINGLE RESEARCH
// GET /api/market-research/:id
// ================================================================
async function getResearch(req, res) {
    try {
        const { id } = req.params;

        const research = await prisma.marketResearch.findUnique({
            where: { id: parseInt(id) },
            include: {
                creator: {
                    select: { id: true, fullName: true, role: true }
                }
            }
        });

        if (!research) {
            return res.status(404).json({ error: 'Research not found.' });
        }

        res.json({
            ...research,
            findings: parseFindings(research.findings)
        });

    } catch (err) {
        console.error('❌ Get research error:', err);
        res.status(500).json({ error: 'Failed to fetch research.' });
    }
}

// ================================================================
// UPDATE RESEARCH
// PUT /api/market-research/:id
// ================================================================
async function updateResearch(req, res) {
    try {
        const { id } = req.params;
        const {
            title, researchType, description, conductedBy,
            periodStart, periodEnd, findings, summary,
            recommendations, attachmentName, attachmentData, status
        } = req.body;

        const existing = await prisma.marketResearch.findUnique({
            where: { id: parseInt(id) }
        });
        if (!existing) {
            return res.status(404).json({ error: 'Research not found.' });
        }

        const data = {};

        if (title !== undefined) data.title = title;
        if (researchType !== undefined) {
            const validTypes = ['competitor', 'survey', 'trend', 'pricing'];
            if (!validTypes.includes(researchType)) {
                return res.status(400).json({ error: 'Invalid research type.' });
            }
            data.researchType = researchType;
        }
        if (description !== undefined) data.description = description;
        if (conductedBy !== undefined) data.conductedBy = conductedBy;
        if (periodStart !== undefined) data.periodStart = periodStart ? new Date(periodStart) : null;
        if (periodEnd !== undefined) data.periodEnd = periodEnd ? new Date(periodEnd) : null;
        if (findings !== undefined) data.findings = JSON.stringify(findings);
        if (summary !== undefined) data.summary = summary;
        if (recommendations !== undefined) data.recommendations = recommendations;
        if (attachmentName !== undefined) data.attachmentName = attachmentName;
        if (attachmentData !== undefined) data.attachmentData = attachmentData;

        if (status !== undefined) {
            const validStatuses = ['draft', 'ongoing', 'completed', 'cancelled'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({ error: 'Invalid status.' });
            }
            data.status = status;
        }

        const research = await prisma.marketResearch.update({
            where: { id: parseInt(id) },
            data,
            include: {
                creator: {
                    select: { id: true, fullName: true, role: true }
                }
            }
        });

        await prisma.auditLog.create({
            data: {
                userId: req.user.userId,
                action: 'update_market_research',
                entityType: 'market_research',
                entityId: String(id),
                details: { updates: Object.keys(data) },
                ipAddress: req.ip || 'unknown'
            }
        });

        res.json({
            message: 'Research updated!',
            research: {
                ...research,
                findings: parseFindings(research.findings)
            }
        });

    } catch (err) {
        console.error('❌ Update research error:', err);
        res.status(500).json({ error: 'Failed to update research.' });
    }
}

// ================================================================
// DELETE RESEARCH
// DELETE /api/market-research/:id
// ================================================================
async function deleteResearch(req, res) {
    try {
        const { id } = req.params;

        const existing = await prisma.marketResearch.findUnique({
            where: { id: parseInt(id) }
        });
        if (!existing) {
            return res.status(404).json({ error: 'Research not found.' });
        }

        await prisma.marketResearch.delete({
            where: { id: parseInt(id) }
        });

        await prisma.auditLog.create({
            data: {
                userId: req.user.userId,
                action: 'delete_market_research',
                entityType: 'market_research',
                entityId: String(id),
                details: { title: existing.title },
                ipAddress: req.ip || 'unknown'
            }
        });

        res.json({ message: 'Research deleted.' });

    } catch (err) {
        console.error('❌ Delete research error:', err);
        res.status(500).json({ error: 'Failed to delete research.' });
    }
}

module.exports = {
    createResearch,
    listResearch,
    getResearch,
    updateResearch,
    deleteResearch
};