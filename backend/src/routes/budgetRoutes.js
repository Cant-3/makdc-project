const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Middleware ya kuthibitisha mtumiaji (Kama unayo tayari, itumie)
// const { authenticateToken, requireRole } = require('./middleware/auth');

// ================================================================
// 1. POST: Manager kutengeneza Master Budget (Distribute Ceilings)
// ================================================================
router.post('/master', async (req, res) => {
    try {
        const { title, period, year, totalAmount, allocations, createdBy, createdById, status } = req.body;

        if (!title || !allocations || allocations.length === 0) {
            return res.status(400).json({ error: 'Title and allocations are required' });
        }

        const newBudget = await prisma.masterBudget.create({
            data: {
                title,
                period,
                year: parseInt(year),
                totalAmount: parseFloat(totalAmount),
                status: status || 'pending-departments',
                createdBy,
                createdById: createdById ? parseInt(createdById) : null,
                allocations: {
                    create: allocations.map(a => ({
                        department: a.department,
                        icon: a.icon,
                        ceilingAmount: parseFloat(a.ceilingAmount),
                        status: 'pending-department'
                    }))
                }
            },
            include: {
                allocations: true
            }
        });

        res.status(201).json(newBudget);
    } catch (error) {
        console.error('Error creating master budget:', error);
        res.status(500).json({ error: error.message || 'Failed to create master budget' });
    }
});

// ================================================================
// 2. GET: Manager kuvuta historia ya Master Budgets
// ================================================================
router.get('/master', async (req, res) => {
    try {
        const budgets = await prisma.masterBudget.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                allocations: {
                    include: { items: true } // 🆕 Ongeza hii
                }
            }
        });

        const formattedBudgets = budgets.map(b => ({
            ...b,
            totalAmount: Number(b.totalAmount),
            allocations: b.allocations.map(a => ({
                ...a,
                ceilingAmount: Number(a.ceilingAmount),
                items: (a.items || []).map(i => ({
                    ...i,
                    quantity: Number(i.quantity),
                    unitPrice: Number(i.unitPrice),
                    totalCost: Number(i.totalCost)
                }))
            }))
        }));

        res.json(formattedBudgets);
    } catch (error) {
        console.error('Error fetching master budgets:', error);
        res.status(500).json({ error: 'Failed to fetch budgets' });
    }
});

// ================================================================
// 3. GET: View specific Master Budget
// ================================================================
router.get('/master/:id', async (req, res) => {
    try {
        const budget = await prisma.masterBudget.findUnique({
            where: { id: parseInt(req.params.id) },
            include: { 
                allocations: {
                    include: { items: true } // 🆕 Muhimu sana!
                } 
            }
        });

        if (!budget) return res.status(404).json({ error: 'Budget not found' });

        budget.totalAmount = Number(budget.totalAmount);
        budget.allocations = budget.allocations.map(a => ({
            ...a,
            ceilingAmount: Number(a.ceilingAmount),
            items: (a.items || []).map(i => ({
                ...i,
                quantity: Number(i.quantity),
                unitPrice: Number(i.unitPrice),
                totalCost: Number(i.totalCost)
            }))
        }));

        res.json(budget);
    } catch (error) {
        console.error('Error fetching budget details:', error);
        res.status(500).json({ error: 'Failed to fetch budget details' });
    }
});

// ================================================================
// 🆕 4. POST: Department kuwasilisha breakdown (Mchanganuo)
// ================================================================
router.post('/master/:id/department/:dept/submit', async (req, res) => {
    try {
        const { id, dept } = req.params;
        const { items, status } = req.body; // 🆕 Pokea status

        if (!items || items.length === 0) {
            return res.status(400).json({ error: 'Items are required' });
        }

        const allocation = await prisma.budgetAllocation.findFirst({
            where: {
                budgetId: parseInt(id),
                department: dept
            }
        });

        if (!allocation) {
            return res.status(404).json({ error: 'Allocation not found for this department' });
        }

        await prisma.budgetActivity.deleteMany({
            where: { allocationId: allocation.id }
        });

        await prisma.budgetActivity.createMany({
            data: items.map(item => ({
                allocationId: allocation.id,
                activityName: item.activityName,
                itemName: item.itemName,
                quantity: parseFloat(item.quantity),
                unit: item.unit,
                unitPrice: parseFloat(item.unitPrice),
                totalCost: parseFloat(item.totalCost)
            }))
        });

        // 🆕 Tumia status iliyotumwa (draft au submitted)
        await prisma.budgetAllocation.update({
            where: { id: allocation.id },
            data: { status: status || 'submitted' }
        });

        // Kama ni submitted, angalia kama zote zimesubmit
        if (status !== 'draft') {
            const allAllocations = await prisma.budgetAllocation.findMany({
                where: { budgetId: parseInt(id) }
            });

            const allSubmitted = allAllocations.every(a => 
                a.status === 'submitted' || a.status === 'approved'
            );

            if (allSubmitted) {
                await prisma.masterBudget.update({
                    where: { id: parseInt(id) },
                    data: { status: 'pending-manager' }
                });
            }
        }

        res.json({ success: true, message: status === 'draft' ? 'Draft saved' : 'Breakdown submitted successfully' });

    } catch (error) {
        console.error('Submit breakdown error:', error);
        res.status(500).json({ error: error.message || 'Failed to submit breakdown' });
    }
});
// ================================================================
// 🆕 5. PUT: Manager kutuma Budget kwa CEO
// ================================================================
router.put('/master/:id/forward-to-ceo', async (req, res) => {
    try {
        const { id } = req.params;
        const { forwardedBy, forwardedById, forwardedAt } = req.body;

        // 1. Tafuta budget
        const budget = await prisma.masterBudget.findUnique({
            where: { id: parseInt(id) }
        });

        if (!budget) {
            return res.status(404).json({ error: 'Budget not found' });
        }

        // 2. Hakikisha iko kwenye hatua sahihi
        if (budget.status !== 'pending-manager' && budget.status !== 'pending-departments') {
            return res.status(400).json({ 
                error: `Haiwezi kutumwa. Status ya sasa ni "${budget.status}".` 
            });
        }

        // 3. Badilisha status kuwa pending-ceo
        const updatedBudget = await prisma.masterBudget.update({
            where: { id: parseInt(id) },
            data: {
                status: 'pending-ceo',
                // Kama una field za kuhifadhi nani alituma, unaweza kuziongeza kwenye schema yako
                // forwardedBy: forwardedBy,
                // forwardedToCeoAt: new Date(forwardedAt)
            }
        });

        res.json({ 
            success: true, 
            message: 'Budget forwarded to CEO successfully',
            budget: updatedBudget 
        });

    } catch (error) {
        console.error('Forward to CEO error:', error);
        res.status(500).json({ error: error.message || 'Failed to forward budget' });
    }
});
// ================================================================
// 6. PUT: CEO Approve Budget
// ================================================================
router.put('/master/:id/approve', async (req, res) => {
    try {
        const { id } = req.params;
        const { approvedBy } = req.body;

        const budget = await prisma.masterBudget.findUnique({ where: { id: parseInt(id) } });
        if (!budget) return res.status(404).json({ error: 'Budget not found' });

        const updatedBudget = await prisma.masterBudget.update({
            where: { id: parseInt(id) },
            data: { 
                status: 'approved',
                // Kama una field ya approvedBy kwenye schema, unaweza kuiongeza hapa
            }
        });

        res.json({ success: true, message: 'Budget approved', budget: updatedBudget });
    } catch (error) {
        console.error('Approve error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ================================================================
// 7. PUT: CEO Reject Budget
// ================================================================
router.put('/master/:id/reject', async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const budget = await prisma.masterBudget.findUnique({ where: { id: parseInt(id) } });
        if (!budget) return res.status(404).json({ error: 'Budget not found' });

        // 🆕 Ongeza field ya 'rejectionReason' kwenye schema.prisma kwanza!
        const updatedBudget = await prisma.masterBudget.update({
            where: { id: parseInt(id) },
            data: { 
                status: 'rejected',
                // rejectionReason: reason // Fungua hii baada ya kuongeza kwenye schema
            }
        });

        res.json({ success: true, message: 'Budget rejected', budget: updatedBudget });
    } catch (error) {
        console.error('Reject error:', error);
        res.status(500).json({ error: error.message });
    }
});
module.exports = router;