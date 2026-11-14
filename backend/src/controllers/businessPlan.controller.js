// ================================================================
// MAK DC INVESTMENT — BUSINESS PLANS CONTROLLER
// ================================================================
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ================================================================
// HELPER: Sanitize plan kwa response (toa fileData kubwa)
// ================================================================
function sanitizePlan(plan, includeFileData = false) {
    if (!plan) return null;
    const { fileData, ...rest } = plan;
    if (includeFileData) return plan;
    return rest;
}

// ================================================================
// GET ALL PLANS
// ================================================================
exports.getAllPlans = async (req, res) => {
    try {
        const { status, year, projectType, search } = req.query;
        const where = {};

        if (status) where.status = status;
        if (projectType) where.projectType = projectType;
        if (year) {
            where.createdAt = {
                gte: new Date(`${year}-01-01`),
                lt: new Date(`${parseInt(year) + 1}-01-01`)
            };
        }
        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { summary: { contains: search, mode: 'insensitive' } },
                { department: { contains: search, mode: 'insensitive' } }
            ];
        }

        // 🆕 FIX: Managers wanaona plans zao tu (bila kujali status)
        const userRole = (req.user?.role || '').toLowerCase();
        const userId = req.user?.id;

        if (userRole.includes('manager') && userId) {
            // Manager anaweza kuona: Draft zake, Approved zote, na Active zote
            const managerFilter = {
                OR: [
                    { createdById: userId },
                    { status: 'Approved' },
                    { status: 'Active' }
                ]
            };

            // Kama kuna filter nyingine (status, year, n.k.), tuunganishe
            if (Object.keys(where).length > 0) {
                where.AND = [managerFilter];
            } else {
                where.OR = managerFilter.OR;
            }
        }

        console.log('🔍 Query filter for user:', req.user?.fullName, '| Role:', req.user?.role);
        console.log('🔍 Final where clause:', JSON.stringify(where, null, 2));

        const plans = await prisma.businessPlan.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        });

        console.log(`✅ Found ${plans.length} plans for this user`);
        res.json(plans.map(p => sanitizePlan(p, false)));
    } catch (err) {
        console.error('getAllPlans error:', err);
        res.status(500).json({ error: err.message });
    }
};

// ================================================================
// GET PLAN BY ID (pamoja na fileData kwa preview)
// ================================================================
exports.getPlanById = async (req, res) => {
    try {
        const { id } = req.params;
        const plan = await prisma.businessPlan.findUnique({
            where: { id: parseInt(id) }
        });

        if (!plan) return res.status(404).json({ error: 'Plan not found' });

        res.json(plan);
    } catch (err) {
        console.error('getPlanById error:', err);
        res.status(500).json({ error: err.message });
    }
};

// ================================================================
// CREATE PLAN
// ================================================================
exports.createPlan = async (req, res) => {
    try {
        const {
            title, projectType, department, summary,
            estimatedBudget, expectedRevenue, expectedRoi, breakEvenMonths,
            startDate, endDate,
            fileName, fileType, fileSize, fileData
        } = req.body;

        if (!title || !projectType) {
            return res.status(400).json({ error: 'Title and Project Type are required' });
        }

        // 🆕 DEBUG: Angalia kama req.user ipo
        console.log('🔍 req.user kwenye createPlan:', req.user);

        const plan = await prisma.businessPlan.create({
            data: {
                businessPlanId: `BP-${Date.now()}`,
                title,
                projectType,
                department: department || null,
                summary: summary || null,
                estimatedBudget: estimatedBudget ? parseFloat(estimatedBudget) : null,
                currency: req.body.currency || 'TZS',
                expectedRevenue: expectedRevenue ? parseFloat(expectedRevenue) : null,
                expectedRoi: expectedRoi ? parseFloat(expectedRoi) : null,
                breakEvenMonths: breakEvenMonths ? parseInt(breakEvenMonths) : null,
                startDate: startDate ? new Date(startDate) : null,
                endDate: endDate ? new Date(endDate) : null,
                fileName: fileName || null,
                fileType: fileType || null,
                fileSize: fileSize ? parseInt(fileSize) : null,
                fileData: fileData || null,
                status: 'Draft',
                createdBy: req.user?.fullName || 'Manager',
                // 🆕 HAKIKISHA ID INASAVE
                createdById: req.user?.id || req.user?.userId || null, 
            }
        });

        res.status(201).json(sanitizePlan(plan, false));
    } catch (err) {
        console.error('createPlan error:', err);
        res.status(500).json({ error: err.message });
    }
};

// ================================================================
// UPDATE PLAN (Draft / Revision Requested only)
// ================================================================
exports.updatePlan = async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await prisma.businessPlan.findUnique({
            where: { id: parseInt(id) }
        });

        if (!existing) return res.status(404).json({ error: 'Plan not found' });

        // Ruhusu update tu kama status ni Draft au Revision Requested
        if (!['Draft', 'Revision Requested'].includes(existing.status)) {
            return res.status(400).json({
                error: `Cannot edit plan with status "${existing.status}". Only Draft or Revision Requested plans can be edited.`
            });
        }

        const {
            title, projectType, department, summary,
            estimatedBudget, expectedRevenue, expectedRoi, breakEvenMonths,
            startDate, endDate,
            fileName, fileType, fileSize, fileData
        } = req.body;

        const updated = await prisma.businessPlan.update({
            where: { id: parseInt(id) },
            data: {
                ...(title && { title }),
                ...(projectType && { projectType }),
                ...(department !== undefined && { department }),
                ...(summary !== undefined && { summary }),
                ...(estimatedBudget !== undefined && {
                    estimatedBudget: estimatedBudget ? parseFloat(estimatedBudget) : null
                }),
                ...(expectedRevenue !== undefined && {
                    expectedRevenue: expectedRevenue ? parseFloat(expectedRevenue) : null
                }),
                ...(expectedRoi !== undefined && {
                    expectedRoi: expectedRoi ? parseFloat(expectedRoi) : null
                }),
                ...(breakEvenMonths !== undefined && {
                    breakEvenMonths: breakEvenMonths ? parseInt(breakEvenMonths) : null
                }),
                ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
                ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
                ...(fileName !== undefined && { fileName }),
                ...(fileType !== undefined && { fileType }),
                ...(fileSize !== undefined && { fileSize: fileSize ? parseInt(fileSize) : null }),
                ...(fileData !== undefined && { fileData })
            }
        });

        res.json(sanitizePlan(updated, false));
    } catch (err) {
        console.error('updatePlan error:', err);
        res.status(500).json({ error: err.message });
    }
};

// ================================================================
// DELETE PLAN
// ================================================================
exports.deletePlan = async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await prisma.businessPlan.findUnique({
            where: { id: parseInt(id) }
        });

        if (!existing) return res.status(404).json({ error: 'Plan not found' });

        // Zuia kufuta ikiwa Pending CEO au Approved
        if (['Pending CEO', 'Approved', 'Active'].includes(existing.status)) {
            return res.status(400).json({
                error: `Cannot delete plan with status "${existing.status}".`
            });
        }

        await prisma.businessPlan.delete({ where: { id: parseInt(id) } });
        res.json({ success: true, message: 'Plan deleted' });
    } catch (err) {
        console.error('deletePlan error:', err);
        res.status(500).json({ error: err.message });
    }
};

// ================================================================
// SUBMIT TO CEO
// ================================================================
exports.submitToCeo = async (req, res) => {
    try {
        const { id } = req.params;
        const plan = await prisma.businessPlan.findUnique({
            where: { id: parseInt(id) }
        });

        if (!plan) return res.status(404).json({ error: 'Plan not found' });

        // 🆕 LINDA DHIDI YA DOUBLE SUBMIT
        if (plan.status === 'Pending CEO') {
            return res.status(400).json({ error: 'Plan is already pending CEO approval.' });
        }
        if (plan.status === 'Approved' || plan.status === 'Active') {
            return res.status(400).json({ error: 'Plan is already approved and active.' });
        }
        
        // Hakikisha status ni sahihi kabla ya ku-submit
        if (!['Draft', 'Revision Requested', 'Rejected'].includes(plan.status)) {
            return res.status(400).json({
                error: `Cannot submit plan with status "${plan.status}"`
            });
        }

        if (!plan.fileData) {
            return res.status(400).json({
                error: 'Plan must have an attached document before submitting to CEO'
            });
        }

        const updated = await prisma.businessPlan.update({
            where: { id: parseInt(id) },
            data: {
                status: 'Pending CEO',
                submittedToCeoAt: new Date(),
                submittedToCeoBy: req.user?.fullName || 'Manager'
            }
        });

        res.json(sanitizePlan(updated, false));
    } catch (err) {
        console.error('submitToCeo error:', err);
        res.status(500).json({ error: err.message });
    }
};
// ================================================================
// CEO APPROVE
// ================================================================
exports.ceoApprove = async (req, res) => {
    try {
        const { id } = req.params;
        const { remarks } = req.body;
        const plan = await prisma.businessPlan.findUnique({
            where: { id: parseInt(id) }
        });

        if (!plan) return res.status(404).json({ error: 'Plan not found' });
        if (plan.status !== 'Pending CEO') {
            return res.status(400).json({ error: 'Plan must be Pending CEO to approve' });
        }

        const updated = await prisma.businessPlan.update({
            where: { id: parseInt(id) },
            data: {
                status: 'Approved',
                ceoRemarks: remarks || null,
                ceoApprovedAt: new Date(),
                ceoApprovedBy: req.user?.fullName || 'CEO',
                ceoApprovedById: req.user?.id || null
            }
        });

        res.json(sanitizePlan(updated, false));
    } catch (err) {
        console.error('ceoApprove error:', err);
        res.status(500).json({ error: err.message });
    }
};

// ================================================================
// CEO REJECT
// ================================================================
exports.ceoReject = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        if (!reason || !reason.trim()) {
            return res.status(400).json({ error: 'Rejection reason is required' });
        }

        const plan = await prisma.businessPlan.findUnique({
            where: { id: parseInt(id) }
        });

        if (!plan) return res.status(404).json({ error: 'Plan not found' });
        if (plan.status !== 'Pending CEO') {
            return res.status(400).json({ error: 'Plan must be Pending CEO to reject' });
        }

        const updated = await prisma.businessPlan.update({
            where: { id: parseInt(id) },
            data: {
                status: 'Rejected',
                ceoRejectedAt: new Date(),
                ceoRejectedBy: req.user?.fullName || 'CEO',
                ceoRejectionReason: reason.trim()
            }
        });

        res.json(sanitizePlan(updated, false));
    } catch (err) {
        console.error('ceoReject error:', err);
        res.status(500).json({ error: err.message });
    }
};

// ================================================================
// CEO REQUEST REVISION
// ================================================================
exports.ceoRequestRevision = async (req, res) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;

        if (!notes || !notes.trim()) {
            return res.status(400).json({ error: 'Revision notes are required' });
        }

        const plan = await prisma.businessPlan.findUnique({
            where: { id: parseInt(id) }
        });

        if (!plan) return res.status(404).json({ error: 'Plan not found' });
        if (plan.status !== 'Pending CEO') {
            return res.status(400).json({ error: 'Plan must be Pending CEO to request revision' });
        }

        const updated = await prisma.businessPlan.update({
            where: { id: parseInt(id) },
            data: {
                status: 'Revision Requested',
                revisionNotes: notes.trim(),
                revisionRequestedAt: new Date(),
                revisionRequestedBy: req.user?.fullName || 'CEO'
            }
        });

        res.json(sanitizePlan(updated, false));
    } catch (err) {
        console.error('ceoRequestRevision error:', err);
        res.status(500).json({ error: err.message });
    }
};

// ================================================================
// LINK TO BUDGET
// ================================================================
exports.linkToBudget = async (req, res) => {
    try {
        const { id } = req.params;
        const { budgetId } = req.body;

        if (!budgetId) return res.status(400).json({ error: 'budgetId is required' });

        const updated = await prisma.businessPlan.update({
            where: { id: parseInt(id) },
            data: { budgetId: parseInt(budgetId) }
        });

        res.json(sanitizePlan(updated, false));
    } catch (err) {
        console.error('linkToBudget error:', err);
        res.status(500).json({ error: err.message });
    }
};

// ================================================================
// LINK TO PROCUREMENT
// ================================================================
exports.linkToProcurement = async (req, res) => {
    try {
        const { id } = req.params;
        const { procurementId } = req.body;

        if (!procurementId) return res.status(400).json({ error: 'procurementId is required' });

        const updated = await prisma.businessPlan.update({
            where: { id: parseInt(id) },
            data: { procurementId: parseInt(procurementId) }
        });

        res.json(sanitizePlan(updated, false));
    } catch (err) {
        console.error('linkToProcurement error:', err);
        res.status(500).json({ error: err.message });
    }
};

// ================================================================
// LINK TO TENDER
// ================================================================
exports.linkToTender = async (req, res) => {
    try {
        const { id } = req.params;
        const { tenderId } = req.body;

        if (!tenderId) return res.status(400).json({ error: 'tenderId is required' });

        const updated = await prisma.businessPlan.update({
            where: { id: parseInt(id) },
            data: { tenderId: parseInt(tenderId) }
        });

        res.json(sanitizePlan(updated, false));
    } catch (err) {
        console.error('linkToTender error:', err);
        res.status(500).json({ error: err.message });
    }
};