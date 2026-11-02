// ================================================================
// MAK DC INVESTMENT — MARKETING ACTIVITIES CONTROLLER
// ================================================================
// Handles: Activities (Tasks) ndani ya Marketing Plans
// ================================================================

const { prisma } = require('../config/database');

// ================================================================
// HELPER: Validate status transition
// ================================================================
function isValidStatusTransition(currentStatus, newStatus) {
    const validTransitions = {
        'pending': ['in-progress', 'done', 'cancelled'],
        'in-progress': ['done', 'cancelled'],
        'done': [],  // Done haiwezi kurudi nyuma
        'cancelled': []  // Cancelled haiwezi kurudi nyuma
    };
    
    if (currentStatus === newStatus) return true;
    return validTransitions[currentStatus]?.includes(newStatus) || false;
}

// ================================================================
// HELPER: Recalculate plan ACTIVITY progress (separate from KPI)
// ================================================================
async function recalculatePlanProgress(planId) {
    const activities = await prisma.marketingActivity.findMany({
        where: { planId: parseInt(planId) }
    });

    if (activities.length === 0) {
        // No activities — activityProgress = 0
        await prisma.marketingPlan.update({
            where: { id: parseInt(planId) },
            data: { activityProgress: 0 }
        });
        return 0;
    }

    const doneCount = activities.filter(a => a.status === 'done').length;
    const cancelledCount = activities.filter(a => a.status === 'cancelled').length;
    const activeActivities = activities.length - cancelledCount;

    const activityProgress = activeActivities > 0 
        ? Math.round((doneCount / activeActivities) * 100)
        : 0;

    // Update activityProgress (NOT progress — hiyo ni KPI)
    await prisma.marketingPlan.update({
        where: { id: parseInt(planId) },
        data: { activityProgress }
    });

    return activityProgress;
}

// ================================================================
// LIST ACTIVITIES FOR A PLAN
// GET /api/marketing-plans/:planId/activities
// ================================================================
async function listActivities(req, res) {
    try {
        const { planId } = req.params;

        const activities = await prisma.marketingActivity.findMany({
            where: { planId: parseInt(planId) },
            include: {
                assignee: {
                    select: { id: true, fullName: true, role: true }
                },
                completer: {
                    select: { id: true, fullName: true }
                }
            },
            orderBy: [
                { order: 'asc' },
                { createdAt: 'asc' }
            ]
        });

        res.json({
            count: activities.length,
            activities
        });

    } catch (err) {
        console.error('❌ List activities error:', err);
        res.status(500).json({ error: 'Failed to fetch activities.' });
    }
}

// ================================================================
// CREATE ACTIVITY
// POST /api/marketing-plans/:planId/activities
// ================================================================
async function createActivity(req, res) {
    try {
        const { planId } = req.params;
        const {
            title, description, assignedTo, dueDate,
            priority, notes
        } = req.body;

        // Validation
        if (!title) {
            return res.status(400).json({ error: 'Title is required.' });
        }

        // Check plan exists
        const plan = await prisma.marketingPlan.findUnique({
            where: { id: parseInt(planId) }
        });
        if (!plan) {
            return res.status(404).json({ error: 'Marketing plan not found.' });
        }

        // Get max order
        const maxOrder = await prisma.marketingActivity.aggregate({
            where: { planId: parseInt(planId) },
            _max: { order: true }
        });

        const activity = await prisma.marketingActivity.create({
            data: {
                planId: parseInt(planId),
                title,
                description: description || null,
                assignedTo: assignedTo ? parseInt(assignedTo) : null,
                dueDate: dueDate ? new Date(dueDate) : null,
                priority: priority || 'medium',
                notes: notes || null,
                order: (maxOrder._max.order || 0) + 1,
                status: 'pending'
            },
            include: {
                assignee: {
                    select: { id: true, fullName: true, role: true }
                }
            }
        });

        // Audit log
        await prisma.auditLog.create({
            data: {
                userId: req.user.userId,
                action: 'create_marketing_activity',
                entityType: 'marketing_activity',
                entityId: String(activity.id),
                details: { title, planId },
                ipAddress: req.ip || 'unknown'
            }
        });

        // Recalculate plan progress
        await recalculatePlanProgress(planId);

        res.status(201).json({
            message: 'Activity created!',
            activity
        });

    } catch (err) {
        console.error('❌ Create activity error:', err);
        res.status(500).json({ error: 'Failed to create activity.' });
    }
}

// ================================================================
// UPDATE ACTIVITY (partial — respects rules)
// PUT /api/marketing-plans/:planId/activities/:id
// ================================================================
async function updateActivity(req, res) {
    try {
        const { planId, id } = req.params;
        const {
            title, description, assignedTo, dueDate,
            status, priority, notes
        } = req.body;

        const existing = await prisma.marketingActivity.findUnique({
            where: { id: parseInt(id) }
        });
        if (!existing) {
            return res.status(404).json({ error: 'Activity not found.' });
        }

        // ============================================================
        // SHERIA: Cannot edit done/cancelled activities
        // ============================================================
        if (existing.status === 'done' || existing.status === 'cancelled') {
            return res.status(400).json({
                error: `Cannot edit activity with status "${existing.status}". Only pending/in-progress activities can be edited.`
            });
        }

        const data = {};

        // Editable fields
        if (title !== undefined) data.title = title;
        if (description !== undefined) data.description = description;
        if (assignedTo !== undefined) data.assignedTo = assignedTo ? parseInt(assignedTo) : null;
        if (priority !== undefined) data.priority = priority;
        if (notes !== undefined) data.notes = notes;

        // Due date — can be edited only if not done
        if (dueDate !== undefined) {
            data.dueDate = dueDate ? new Date(dueDate) : null;
        }

        // ============================================================
        // STATUS — with transition validation
        // ============================================================
        if (status !== undefined) {
            if (!isValidStatusTransition(existing.status, status)) {
                return res.status(400).json({
                    error: `Invalid status transition: ${existing.status} → ${status}`
                });
            }
            data.status = status;

            // Kama inakuwa "done", set completedAt na completedBy
            if (status === 'done') {
                data.completedAt = new Date();
                data.completedBy = req.user.userId;
            }
        }

        const activity = await prisma.marketingActivity.update({
            where: { id: parseInt(id) },
            data,
            include: {
                assignee: {
                    select: { id: true, fullName: true, role: true }
                },
                completer: {
                    select: { id: true, fullName: true }
                }
            }
        });

        // Audit log
        await prisma.auditLog.create({
            data: {
                userId: req.user.userId,
                action: 'update_marketing_activity',
                entityType: 'marketing_activity',
                entityId: String(id),
                details: { updates: Object.keys(data) },
                ipAddress: req.ip || 'unknown'
            }
        });

        // Recalculate plan progress
        await recalculatePlanProgress(planId);

        res.json({
            message: 'Activity updated!',
            activity
        });

    } catch (err) {
        console.error('❌ Update activity error:', err);
        res.status(500).json({ error: 'Failed to update activity.' });
    }
}

// ================================================================
// UPDATE STATUS ONLY (quick action)
// PUT /api/marketing-plans/:planId/activities/:id/status
// ================================================================
async function updateStatus(req, res) {
    try {
        const { planId, id } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({ error: 'Status is required.' });
        }

        const existing = await prisma.marketingActivity.findUnique({
            where: { id: parseInt(id) }
        });
        if (!existing) {
            return res.status(404).json({ error: 'Activity not found.' });
        }

        // Validate transition
        if (!isValidStatusTransition(existing.status, status)) {
            return res.status(400).json({
                error: `Invalid status transition: ${existing.status} → ${status}`
            });
        }

        const data = { status };

        // Kama inakuwa "done", set completedAt na completedBy
        if (status === 'done') {
            data.completedAt = new Date();
            data.completedBy = req.user.userId;
        }

        const activity = await prisma.marketingActivity.update({
            where: { id: parseInt(id) },
            data,
            include: {
                assignee: { select: { id: true, fullName: true } },
                completer: { select: { id: true, fullName: true } }
            }
        });

        // Audit log
        await prisma.auditLog.create({
            data: {
                userId: req.user.userId,
                action: 'update_marketing_activity_status',
                entityType: 'marketing_activity',
                entityId: String(id),
                details: { from: existing.status, to: status },
                ipAddress: req.ip || 'unknown'
            }
        });

        // Recalculate plan progress
        const newProgress = await recalculatePlanProgress(planId);

        res.json({
            message: 'Status updated!',
            activity,
            planProgress: newProgress
        });

    } catch (err) {
        console.error('❌ Update status error:', err);
        res.status(500).json({ error: 'Failed to update status.' });
    }
}

// ================================================================
// DELETE ACTIVITY
// DELETE /api/marketing-plans/:planId/activities/:id
// ================================================================
async function deleteActivity(req, res) {
    try {
        const { planId, id } = req.params;

        const existing = await prisma.marketingActivity.findUnique({
            where: { id: parseInt(id) }
        });
        if (!existing) {
            return res.status(404).json({ error: 'Activity not found.' });
        }

        // ============================================================
        // SHERIA: Cannot delete done activities
        // ============================================================
        if (existing.status === 'done') {
            return res.status(400).json({
                error: 'Cannot delete completed activities. They are kept for audit trail.'
            });
        }

        await prisma.marketingActivity.delete({
            where: { id: parseInt(id) }
        });

        // Audit log
        await prisma.auditLog.create({
            data: {
                userId: req.user.userId,
                action: 'delete_marketing_activity',
                entityType: 'marketing_activity',
                entityId: String(id),
                details: { title: existing.title, planId },
                ipAddress: req.ip || 'unknown'
            }
        });

        // Recalculate plan progress
        await recalculatePlanProgress(planId);

        res.json({ message: 'Activity deleted.' });

    } catch (err) {
        console.error('❌ Delete activity error:', err);
        res.status(500).json({ error: 'Failed to delete activity.' });
    }
}

module.exports = {
    listActivities,
    createActivity,
    updateActivity,
    updateStatus,
    deleteActivity,
    recalculatePlanProgress
};