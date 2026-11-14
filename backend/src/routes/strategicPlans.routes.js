// backend/src/routes/strategicPlans.routes.js
const express = require('express');
const router = express.Router();

// 👇 Import Prisma kama inavyofanya kwenye budgetRoutes
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 👇 Import middleware kama inavyofanya kwenye user.routes
const { authenticate } = require('../middleware/auth');

// ================================================================
// GET /api/strategic-plans (Orodhesha zote)
// ================================================================
router.get('/', authenticate, async (req, res) => {
    try {
        const plans = await prisma.strategicPlan.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(plans);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ================================================================
// GET /api/strategic-plans/:id (Mmoja)
// ================================================================
router.get('/:id', authenticate, async (req, res) => {
    try {
        const plan = await prisma.strategicPlan.findUnique({
            where: { id: parseInt(req.params.id) }
        });
        if (!plan) return res.status(404).json({ error: 'Not found' });
        res.json(plan);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ================================================================
// POST /api/strategic-plans (Unda mpya)
// ================================================================
router.post('/', authenticate, async (req, res) => {
    try {
        const body = req.body;
        
        // Hakikisha strategicId ipo (kama haipo, itengeneze)
        if (!body.strategicId) {
            body.strategicId = body.id || `SP-${Date.now()}`;
        }

        const plan = await prisma.strategicPlan.create({
            data: {
                strategicId: body.strategicId,
                title: body.title,
                year: String(body.year),
                department: body.department || null,
                summary: body.summary || null,
                fileName: body.fileName || null,
                fileType: body.fileType || null,
                fileSize: body.fileSize ? parseInt(body.fileSize) : null,
                fileData: body.fileData || null,
                status: 'Draft',
                managerId: req.user.id,
                managerName: req.user.fullName,
                createdBy: req.user.fullName
            }
        });
        res.status(201).json(plan);
    } catch (err) {
        console.error('Create plan error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ================================================================
// PUT /api/strategic-plans/:id (Sasisha)
// ================================================================
router.put('/:id', authenticate, async (req, res) => {
    try {
        const plan = await prisma.strategicPlan.update({
            where: { id: parseInt(req.params.id) },
            data: req.body
        });
        res.json(plan);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ================================================================
// PUT /api/strategic-plans/:id/submit-to-ceo
// ================================================================
router.put('/:id/submit-to-ceo', authenticate, async (req, res) => {
    try {
        const plan = await prisma.strategicPlan.update({
            where: { id: parseInt(req.params.id) },
            data: {
                status: 'Pending CEO',
                submittedToCeoAt: new Date(),
                submittedToCeoBy: req.user.fullName // req.user inatoka kwenye authenticate
            }
        });
        res.json(plan);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ================================================================
// PUT /api/strategic-plans/:id/ceo-approve
// ================================================================
router.put('/:id/ceo-approve', authenticate, async (req, res) => {
    try {
        const plan = await prisma.strategicPlan.update({
            where: { id: parseInt(req.params.id) },
            data: {
                status: 'Approved by CEO',
                ceoRemarks: req.body.remarks || '',
                ceoApprovedAt: new Date(),
                ceoApprovedBy: req.user.fullName,
                ceoApprovedById: req.user.id
            }
        });
        res.json(plan);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ================================================================
// PUT /api/strategic-plans/:id/ceo-reject
// ================================================================
router.put('/:id/ceo-reject', authenticate, async (req, res) => {
    try {
        const plan = await prisma.strategicPlan.update({
            where: { id: parseInt(req.params.id) },
            data: {
                status: 'Rejected by CEO',
                ceoRejectedAt: new Date(),
                ceoRejectedBy: req.user.fullName,
                ceoRejectionReason: req.body.reason
            }
        });
        res.json(plan);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ================================================================
// PUT /api/strategic-plans/:id/ceo-request-revision
// ================================================================
router.put('/:id/ceo-request-revision', authenticate, async (req, res) => {
    try {
        const plan = await prisma.strategicPlan.update({
            where: { id: parseInt(req.params.id) },
            data: {
                status: 'Revision Requested',
                revisionNotes: req.body.notes,
                revisionRequestedAt: new Date(),
                revisionRequestedBy: req.user.fullName
            }
        });
        res.json(plan);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ================================================================
// DELETE /api/strategic-plans/:id
// ================================================================
router.delete('/:id', authenticate, async (req, res) => {
    try {
        await prisma.strategicPlan.delete({
            where: { id: parseInt(req.params.id) }
        });
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;