// ================================================================
// MAK DC INVESTMENT — MARKETING CONTROLLER
// ================================================================
// Handles: Marketing Plans (Create, Read, Update, Delete)
// ================================================================

const { prisma } = require('../config/database');

// ================================================================
// HELPER: Parse channels JSON safely
// ================================================================
function parseChannels(channels) {
    if (!channels) return [];
    try {
        return typeof channels === 'string' ? JSON.parse(channels) : channels;
    } catch {
        return [];
    }
}
// ================================================================
// HELPER: Recalculate KPI from linked Orders
// ================================================================
async function recalculateKpiFromOrders(planId) {
    // Get all orders linked to this plan (excluding rejected)
    const orders = await prisma.order.findMany({
        where: {
            marketingPlanId: parseInt(planId),
            status: { not: 'rejected' }
        },
        select: {
            totalAmount: true,
            phone: true
        }
    });

    // Calculate actual revenue
    const actualRevenue = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
    
    // Calculate unique customers (by phone)
    const uniquePhones = new Set(orders.map(o => o.phone).filter(Boolean));
    const actualCustomers = uniquePhones.size;

    // Update plan
    const plan = await prisma.marketingPlan.findUnique({
        where: { id: parseInt(planId) }
    });

    if (!plan) return null;

    const updatedPlan = { ...plan, actualRevenue, actualCustomers };
    const newProgress = calculateKpiProgress(updatedPlan);

    await prisma.marketingPlan.update({
        where: { id: parseInt(planId) },
        data: {
            actualRevenue,
            actualCustomers,
            progress: newProgress
        }
    });

    return { 
        actualRevenue, 
        actualCustomers, 
        progress: newProgress,
        ordersCount: orders.length
    };
}

// ================================================================
// HELPER: Calculate KPI Progress (weighted)
// ================================================================
function calculateKpiProgress(plan) {
    const metrics = [];
    
    // Revenue metric
    if (plan.targetRevenue && Number(plan.targetRevenue) > 0) {
        const pct = Math.min(100, (Number(plan.actualRevenue) / Number(plan.targetRevenue)) * 100);
        metrics.push({ pct, weight: plan.weightRevenue || 50 });
    }
    
    // Customers metric
    if (plan.targetCustomers && plan.targetCustomers > 0) {
        const pct = Math.min(100, (plan.actualCustomers / plan.targetCustomers) * 100);
        metrics.push({ pct, weight: plan.weightCustomers || 30 });
    }
    
    // Leads metric
    if (plan.targetLeads && plan.targetLeads > 0) {
        const pct = Math.min(100, (plan.actualLeads / plan.targetLeads) * 100);
        metrics.push({ pct, weight: plan.weightLeads || 20 });
    }
    
    if (metrics.length === 0) return 0;
    
    const totalWeight = metrics.reduce((sum, m) => sum + m.weight, 0);
    const weightedSum = metrics.reduce((sum, m) => sum + (m.pct * m.weight), 0);
    
    return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
}

// ================================================================
// CREATE MARKETING PLAN
// POST /api/marketing-plans
// Role: Sales, Manager, CEO, SuperAdmin
// ================================================================
async function createMarketingPlan(req, res) {
    try {
        const {
            title, description, periodStart, periodEnd, budget,
            channels, goals, targetAudience, status,
            targetCustomers, targetRevenue, targetLeads
        } = req.body;

        // Validation
        if (!title || !periodStart || !periodEnd || budget === undefined) {
            return res.status(400).json({
                error: 'Title, periodStart, periodEnd, and budget are required.'
            });
        }

        // Validate dates
        const start = new Date(periodStart);
        const end = new Date(periodEnd);
        if (end < start) {
            return res.status(400).json({
                error: 'periodEnd must be after periodStart.'
            });
        }

        // Validate status
        const validStatuses = ['draft', 'active', 'completed', 'cancelled'];
        const finalStatus = status || 'draft';
        if (!validStatuses.includes(finalStatus)) {
            return res.status(400).json({ error: 'Invalid status.' });
        }

        // Calculate initial KPI progress
        const initialProgress = calculateKpiProgress({
            targetRevenue: targetRevenue ? parseFloat(targetRevenue) : null,
            actualRevenue: 0,
            targetCustomers: targetCustomers ? parseInt(targetCustomers) : null,
            actualCustomers: 0,
            targetLeads: targetLeads ? parseInt(targetLeads) : null,
            actualLeads: 0,
            weightRevenue: 50,
            weightCustomers: 30,
            weightLeads: 20
        });

        // Create
        const plan = await prisma.marketingPlan.create({
            data: {
                title,
                description: description || null,
                periodStart: start,
                periodEnd: end,
                budget: parseFloat(budget),
                channels: JSON.stringify(channels || []),
                goals: goals || null,
                targetAudience: targetAudience || null,
                status: finalStatus,
                targetCustomers: targetCustomers ? parseInt(targetCustomers) : null,
                targetRevenue: targetRevenue ? parseFloat(targetRevenue) : null,
                targetLeads: targetLeads ? parseInt(targetLeads) : null,
                progress: initialProgress,
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
                action: 'create_marketing_plan',
                entityType: 'marketing_plan',
                entityId: String(plan.id),
                details: { title, budget },
                ipAddress: req.ip || 'unknown'
            }
        });

        res.status(201).json({
            message: 'Marketing plan created successfully!',
            plan: {
                ...plan,
                channels: parseChannels(plan.channels)
            }
        });

    } catch (err) {
        console.error('❌ Create marketing plan error:', err);
        res.status(500).json({ error: 'Failed to create marketing plan.' });
    }
}

// ================================================================
// LIST MARKETING PLANS
// GET /api/marketing-plans?status=active
// ================================================================
async function listMarketingPlans(req, res) {
    try {
        const { status, search } = req.query;

        const where = {};
        if (status && status !== 'all') where.status = status;
        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } }
            ];
        }

        const plans = await prisma.marketingPlan.findMany({
            where,
            include: {
                creator: {
                    select: { id: true, fullName: true, role: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Parse channels
        const parsed = plans.map(p => ({
            ...p,
            channels: parseChannels(p.channels)
        }));

        res.json({
            count: parsed.length,
            plans: parsed
        });

    } catch (err) {
        console.error('❌ List marketing plans error:', err);
        res.status(500).json({ error: 'Failed to fetch marketing plans.' });
    }
}

// ================================================================
// GET SINGLE MARKETING PLAN
// GET /api/marketing-plans/:id
// ================================================================
async function getMarketingPlan(req, res) {
    try {
        const { id } = req.params;

        const plan = await prisma.marketingPlan.findUnique({
            where: { id: parseInt(id) },
            include: {
                creator: {
                    select: { id: true, fullName: true, role: true }
                }
            }
        });

        if (!plan) {
            return res.status(404).json({ error: 'Marketing plan not found.' });
        }

        res.json({
            ...plan,
            channels: parseChannels(plan.channels)
        });

    } catch (err) {
        console.error('❌ Get marketing plan error:', err);
        res.status(500).json({ error: 'Failed to fetch marketing plan.' });
    }
}

// ================================================================
// UPDATE MARKETING PLAN
// PUT /api/marketing-plans/:id
// ================================================================
async function updateMarketingPlan(req, res) {
    try {
        const { id } = req.params;
        const {
            title, description, periodStart, periodEnd, budget,
            channels, goals, targetAudience, status,
            targetCustomers, targetRevenue, targetLeads,
            weightRevenue, weightCustomers, weightLeads
        } = req.body;

        // Check exists
        const existing = await prisma.marketingPlan.findUnique({
            where: { id: parseInt(id) }
        });
        if (!existing) {
            return res.status(404).json({ error: 'Marketing plan not found.' });
        }

        // Build update data
        const data = {};

        if (title !== undefined) data.title = title;
        if (description !== undefined) data.description = description;
        if (periodStart !== undefined) data.periodStart = new Date(periodStart);
        if (periodEnd !== undefined) data.periodEnd = new Date(periodEnd);
        if (budget !== undefined) data.budget = parseFloat(budget);
        if (channels !== undefined) data.channels = JSON.stringify(channels);
        if (goals !== undefined) data.goals = goals;
        if (targetAudience !== undefined) data.targetAudience = targetAudience;

        if (status !== undefined) {
            const validStatuses = ['draft', 'active', 'completed', 'cancelled'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({ error: 'Invalid status.' });
            }
            data.status = status;
        }

        if (targetCustomers !== undefined) data.targetCustomers = targetCustomers ? parseInt(targetCustomers) : null;
        if (targetRevenue !== undefined) data.targetRevenue = targetRevenue ? parseFloat(targetRevenue) : null;
        if (targetLeads !== undefined) data.targetLeads = targetLeads ? parseInt(targetLeads) : null;

        if (weightRevenue !== undefined) data.weightRevenue = parseInt(weightRevenue) || 50;
        if (weightCustomers !== undefined) data.weightCustomers = parseInt(weightCustomers) || 30;
        if (weightLeads !== undefined) data.weightLeads = parseInt(weightLeads) || 20;

        // Update
        let plan = await prisma.marketingPlan.update({
            where: { id: parseInt(id) },
            data,
            include: {
                creator: {
                    select: { id: true, fullName: true, role: true }
                }
            }
        });

        // Recalculate KPI progress if targets or weights changed
        const shouldRecalculate = 
            targetCustomers !== undefined || 
            targetRevenue !== undefined || 
            targetLeads !== undefined ||
            weightRevenue !== undefined || 
            weightCustomers !== undefined || 
            weightLeads !== undefined;

        if (shouldRecalculate) {
            const newProgress = calculateKpiProgress(plan);
            if (newProgress !== plan.progress) {
                plan = await prisma.marketingPlan.update({
                    where: { id: parseInt(id) },
                    data: { progress: newProgress },
                    include: {
                        creator: { select: { id: true, fullName: true, role: true } }
                    }
                });
            }
        }

        // Audit log
        await prisma.auditLog.create({
            data: {
                userId: req.user.userId,
                action: 'update_marketing_plan',
                entityType: 'marketing_plan',
                entityId: String(id),
                details: { updates: Object.keys(data) },
                ipAddress: req.ip || 'unknown'
            }
        });

        res.json({
            message: 'Marketing plan updated!',
            plan: {
                ...plan,
                channels: parseChannels(plan.channels)
            }
        });

    } catch (err) {
        console.error('❌ Update marketing plan error:', err);
        res.status(500).json({ error: 'Failed to update marketing plan.' });
    }
}

// ================================================================
// DELETE MARKETING PLAN
// DELETE /api/marketing-plans/:id
// ================================================================
async function deleteMarketingPlan(req, res) {
    try {
        const { id } = req.params;

        const existing = await prisma.marketingPlan.findUnique({
            where: { id: parseInt(id) }
        });
        if (!existing) {
            return res.status(404).json({ error: 'Marketing plan not found.' });
        }

        await prisma.marketingPlan.delete({
            where: { id: parseInt(id) }
        });

        // Audit log
        await prisma.auditLog.create({
            data: {
                userId: req.user.userId,
                action: 'delete_marketing_plan',
                entityType: 'marketing_plan',
                entityId: String(id),
                details: { title: existing.title },
                ipAddress: req.ip || 'unknown'
            }
        });

        res.json({ message: 'Marketing plan deleted.' });

    } catch (err) {
        console.error('❌ Delete marketing plan error:', err);
        res.status(500).json({ error: 'Failed to delete marketing plan.' });
    }
}

// ================================================================
// UPDATE KPI PROGRESS (Manual Update of Actuals)
// PUT /api/marketing-plans/:id/progress
// Body: { actualRevenue, actualCustomers, actualLeads }
// ================================================================
async function updateProgress(req, res) {
    try {
        const { id } = req.params;
        const { actualRevenue, actualCustomers, actualLeads } = req.body;

        const existing = await prisma.marketingPlan.findUnique({
            where: { id: parseInt(id) }
        });
        if (!existing) {
            return res.status(404).json({ error: 'Marketing plan not found.' });
        }

        // Build update data (only update fields that are provided)
        const data = {};
        if (actualRevenue !== undefined) data.actualRevenue = parseFloat(actualRevenue) || 0;
        if (actualCustomers !== undefined) data.actualCustomers = parseInt(actualCustomers) || 0;
        if (actualLeads !== undefined) data.actualLeads = parseInt(actualLeads) || 0;

        // Calculate new KPI progress
        const updatedPlan = { ...existing, ...data };
        const newProgress = calculateKpiProgress(updatedPlan);
        data.progress = newProgress;

        const plan = await prisma.marketingPlan.update({
            where: { id: parseInt(id) },
            data,
            include: {
                creator: { select: { id: true, fullName: true, role: true } }
            }
        });

        // Audit log
        await prisma.auditLog.create({
            data: {
                userId: req.user.userId,
                action: 'update_marketing_progress',
                entityType: 'marketing_plan',
                entityId: String(id),
                details: { actuals: data, newProgress },
                ipAddress: req.ip || 'unknown'
            }
        });

        res.json({
            message: 'Progress updated!',
            plan: {
                ...plan,
                channels: parseChannels(plan.channels)
            },
            progress: newProgress
        });

    } catch (err) {
        console.error('❌ Update progress error:', err);
        res.status(500).json({ error: 'Failed to update progress.' });
    }
}
// ================================================================
// GET LINKED ORDERS FOR A PLAN
// GET /api/marketing-plans/:id/orders
// ================================================================
async function getLinkedOrders(req, res) {
    try {
        const { id } = req.params;

        const orders = await prisma.order.findMany({
            where: { marketingPlanId: parseInt(id) },
            select: {
                id: true,
                orderId: true,
                customerName: true,
                phone: true,
                totalAmount: true,
                status: true,
                createdAt: true,
                items: {
                    select: {
                        productName: true,
                        quantity: true,
                        subtotal: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Calculate totals
        const totalRevenue = orders
            .filter(o => o.status !== 'rejected')
            .reduce((sum, o) => sum + Number(o.totalAmount), 0);
        
        const uniqueCustomers = new Set(
            orders
                .filter(o => o.status !== 'rejected')
                .map(o => o.phone)
                .filter(Boolean)
        ).size;

        res.json({
            count: orders.length,
            totalRevenue,
            uniqueCustomers,
            orders
        });

    } catch (err) {
        console.error('❌ Get linked orders error:', err);
        res.status(500).json({ error: 'Failed to fetch linked orders.' });
    }
}
module.exports = {
    createMarketingPlan,
    listMarketingPlans,
    getMarketingPlan,
    updateMarketingPlan,
    deleteMarketingPlan,
    updateProgress,
    getLinkedOrders,
    recalculateKpiFromOrders
};