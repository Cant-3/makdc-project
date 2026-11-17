// ================================================================
// MAK DC INVESTMENT — PRODUCTION CONTROLLER
// Engineer (Production Manager) Dashboard
// ================================================================

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ================================================================
// HELPER: Generate Batch Number
// ================================================================
async function generateBatchNo() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    
    const prefix = `BATCH-${year}${month}${day}`;
    
    const lastBatch = await prisma.productionBatch.findFirst({
        where: { batchNo: { startsWith: prefix } },
        orderBy: { id: 'desc' }
    });
    
    let counter = 1;
    if (lastBatch) {
        const parts = lastBatch.batchNo.split('-');
        counter = parseInt(parts[parts.length - 1]) + 1;
    }
    
    return `${prefix}-${String(counter).padStart(3, '0')}`;
}

// ================================================================
// HELPER: Safe number conversion
// ================================================================
function toNum(val, fallback = 0) {
    const n = parseFloat(val);
    return isNaN(n) ? fallback : n;
}

// ================================================================
// 1. DASHBOARD — KPIs & Charts
// GET /api/production/dashboard
// ================================================================
exports.getProductionDashboard = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const startOfYear = new Date(today.getFullYear(), 0, 1);
        
        // ===== KPI 1: Total Produced Today =====
        const todayBatches = await prisma.productionBatch.findMany({
            where: {
                productionDate: { gte: today },
                status: 'completed'
            }
        });
        const totalProducedToday = todayBatches.reduce((s, b) => s + b.quantityProduced, 0);
        
        // ===== KPI 2: Total Damaged Today =====
        const totalDamagedToday = todayBatches.reduce((s, b) => s + b.quantityDamaged, 0);
        
        // ===== KPI 3: Waste % Today =====
        const wastePercentToday = totalProducedToday > 0
            ? ((totalDamagedToday / totalProducedToday) * 100).toFixed(1)
            : 0;
        
        // ===== KPI 4: Total Stock (Products) =====
        const products = await prisma.product.findMany({
            where: { isActive: true }
        });
        const totalStock = products.reduce((s, p) => s + (p.stock || 0), 0);
        const totalDamagedStock = products.reduce((s, p) => s + (p.damagedStock || 0), 0);
        
        // ===== KPI 5: Raw Materials Stock =====
        const rawMaterials = await prisma.rawMaterial.findMany({
            where: { status: 'active' }
        });
        const lowStockMaterials = rawMaterials.filter(m => m.currentStock <= m.reorderLevel);
        
        // ===== KPI 6: Batches This Month =====
        const monthBatches = await prisma.productionBatch.findMany({
            where: {
                productionDate: { gte: startOfMonth },
                status: 'completed'
            }
        });
        const producedThisMonth = monthBatches.reduce((s, b) => s + b.quantityProduced, 0);
        
        // ===== KPI 7: Pending Release to Sales =====
        const pendingRelease = await prisma.productionBatch.count({
            where: {
                status: 'completed',
                releasedToSales: false,
                quantityGood: { gt: 0 }
            }
        });
        
        // ===== CHART 1: Production Trend (last 7 days) =====
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const nextDay = new Date(d);
            nextDay.setDate(nextDay.getDate() + 1);
            
            const batches = await prisma.productionBatch.findMany({
                where: {
                    productionDate: { gte: d, lt: nextDay },
                    status: 'completed'
                }
            });
            
            last7Days.push({
                date: d.toISOString().split('T')[0],
                label: d.toLocaleDateString('en-US', { weekday: 'short' }),
                produced: batches.reduce((s, b) => s + b.quantityProduced, 0),
                damaged: batches.reduce((s, b) => s + b.quantityDamaged, 0)
            });
        }
        
        // ===== CHART 2: Product Breakdown (this month) =====
        const productBreakdown = [];
        for (const p of products) {
            const batches = await prisma.productionBatch.findMany({
                where: {
                    productId: p.id,
                    productionDate: { gte: startOfMonth },
                    status: 'completed'
                }
            });
            const produced = batches.reduce((s, b) => s + b.quantityProduced, 0);
            if (produced > 0) {
                productBreakdown.push({
                    name: p.name,
                    produced,
                    unit: p.unit
                });
            }
        }
        
        // ===== CHART 3: Waste Trend (last 7 days) =====
        const wasteTrend = last7Days.map(d => ({
            label: d.label,
            wastePercent: d.produced > 0 ? ((d.damaged / d.produced) * 100).toFixed(1) : 0
        }));
        
        // ===== RECENT ACTIVITY =====
        const recentBatches = await prisma.productionBatch.findMany({
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: {
                product: { select: { name: true, unit: true } },
                reportedBy: { select: { fullName: true } }
            }
        });
        
        const recentReceipts = await prisma.rawMaterialReceipt.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: {
                material: { select: { name: true, unit: true } },
                receivedBy: { select: { fullName: true } }
            }
        });
        
        res.json({
            kpi: {
                totalProducedToday,
                totalDamagedToday,
                wastePercentToday: parseFloat(wastePercentToday),
                totalStock,
                totalDamagedStock,
                lowStockMaterialsCount: lowStockMaterials.length,
                producedThisMonth,
                pendingRelease,
                activeProducts: products.length,
                activeMaterials: rawMaterials.length
            },
            charts: {
                productionTrend: last7Days,
                productBreakdown,
                wasteTrend
            },
            lowStockMaterials: lowStockMaterials.map(m => ({
                name: m.name,
                currentStock: m.currentStock,
                reorderLevel: m.reorderLevel,
                unit: m.unit
            })),
            recentActivity: {
                batches: recentBatches.map(b => ({
                    batchNo: b.batchNo,
                    product: b.product.name,
                    produced: b.quantityProduced,
                    damaged: b.quantityDamaged,
                    unit: b.product.unit,
                    reportedBy: b.reportedBy.fullName,
                    createdAt: b.createdAt
                })),
                receipts: recentReceipts.map(r => ({
                    material: r.material.name,
                    quantity: r.quantity,
                    unit: r.material.unit,
                    receivedBy: r.receivedBy.fullName,
                    receivedAt: r.receivedAt
                }))
            }
        });
    } catch (err) {
        console.error('Production dashboard error:', err);
        res.status(500).json({ error: err.message });
    }
};

// ================================================================
// 2. RAW MATERIALS — List
// GET /api/production/raw-materials
// ================================================================
exports.getRawMaterials = async (req, res) => {
    try {
        const materials = await prisma.rawMaterial.findMany({
            where: { status: 'active' },
            orderBy: { name: 'asc' }
        });
        res.json(materials);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ================================================================
// 3. CREATE RAW MATERIAL
// POST /api/production/raw-materials
// ================================================================
exports.createRawMaterial = async (req, res) => {
    try {
        const { name, unit, reorderLevel, unitCost, description } = req.body;
        
        if (!name || !unit) {
            return res.status(400).json({ error: 'Name na unit ni lazima' });
        }
        
        const existing = await prisma.rawMaterial.findUnique({ where: { name } });
        if (existing) {
            return res.status(400).json({ error: 'Malighafi hii ipo tayari' });
        }
        
        const material = await prisma.rawMaterial.create({
            data: {
                name: name.trim(),
                unit: unit.trim(),
                reorderLevel: toNum(reorderLevel),
                unitCost: unitCost ? toNum(unitCost) : null,
                description: description || null
            }
        });
        
        res.status(201).json({ message: 'Malighafi imeundwa', material });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.receiveRawMaterial = async (req, res) => {
    try {
        const { materialName, specs, unit, quantity, unitCost, supplier, invoiceNo, notes } = req.body;
        const userId = req.user?.id || 1;
        
        if (!materialName || !quantity || !unit) {
            return res.status(400).json({ error: 'Jina, unit, na quantity ni lazima' });
        }
        
        const qty = toNum(quantity);
        if (qty <= 0) return res.status(400).json({ error: 'Quantity lazima iwe zaidi ya 0' });

        // 1. Tafuta kama material ipo kwa jina (case-insensitive)
        let material = await prisma.rawMaterial.findFirst({
            where: { name: { equals: materialName.trim(), mode: 'insensitive' } }
        });

        // 2. Kama haipo, unda mpya
        if (!material) {
            material = await prisma.rawMaterial.create({
                data: {
                    name: materialName.trim(),
                    unit: unit.trim(),
                    specs: specs || null, // Hifadhi specs
                    reorderLevel: 10, // Weka default
                    status: 'active'
                }
            });
        }

        const cost = unitCost ? toNum(unitCost) : toNum(material.unitCost);
        const totalCost = qty * cost;
        
        const result = await prisma.$transaction(async (tx) => {
            const receipt = await tx.rawMaterialReceipt.create({
                data: {
                    materialId: material.id,
                    quantity: qty,
                    unitCost: cost,
                    totalCost,
                    supplier: supplier || null,
                    invoiceNo: invoiceNo || null,
                    notes: notes || null,
                    receivedById: userId
                }
            });
            
            const updated = await tx.rawMaterial.update({
                where: { id: material.id },
                data: { currentStock: { increment: qty } }
            });
            
            return { receipt, updated, material };
        });
        
        res.status(201).json({
            message: `Imepokelewa: ${qty} ${material.unit} ya ${material.name}`,
            receipt: result.receipt, 
            newStock: result.updated.currentStock
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
// ================================================================
// 5. RAW MATERIAL RECEIPTS — History
// GET /api/production/raw-materials/receipts
// ================================================================
exports.getRawMaterialReceipts = async (req, res) => {
    try {
        const { materialId } = req.query;
        const where = materialId ? { materialId: parseInt(materialId) } : {};
        
        const receipts = await prisma.rawMaterialReceipt.findMany({
            where,
            take: 50,
            orderBy: { receivedAt: 'desc' },
            include: {
                material: { select: { name: true, unit: true } },
                receivedBy: { select: { fullName: true } }
            }
        });
        
        res.json(receipts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ================================================================
// 6. PRODUCTION BATCHES — List
// GET /api/production/batches
// ================================================================
exports.getProductionBatches = async (req, res) => {
    try {
        const { productId, status, released, limit } = req.query;
        const where = {};
        if (productId) where.productId = parseInt(productId);
        if (status) where.status = status;
        if (released === 'true') where.releasedToSales = true;
        if (released === 'false') where.releasedToSales = false;
        
        const batches = await prisma.productionBatch.findMany({
            where,
            take: limit ? parseInt(limit) : 50,
            orderBy: { productionDate: 'desc' },
            include: {
                product: { select: { name: true, unit: true, price: true } },
                reportedBy: { select: { fullName: true } },
                usages: {
                    include: {
                        material: { select: { name: true, unit: true } }
                    }
                }
            }
        });
        
        res.json(batches);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ================================================================
// 7. CREATE PRODUCTION BATCH
// POST /api/production/batches
// Body: { productId, quantityProduced, quantityGood, quantityDamaged,
//         damagedReason, shift, workersCount, machineUsed, productionDate,
//         usages: [{ materialId, quantityUsed }] }
// ================================================================
exports.createProductionBatch = async (req, res) => {
    try {
        const {
            productId,
            quantityProduced,
            quantityGood,
            quantityDamaged,
            damagedReason,
            shift,
            workersCount,
            machineUsed,
            productionDate,
            usages
        } = req.body;
        const userId = req.user?.id || 1;
        
        if (!productId || !quantityProduced) {
            return res.status(400).json({ error: 'Product na quantityProduced ni lazima' });
        }
        
        const produced = toNum(quantityProduced);
        const good = toNum(quantityGood) || produced;
        const damaged = toNum(quantityDamaged);
        
        if (produced <= 0) {
            return res.status(400).json({ error: 'Quantity lazima iwe zaidi ya 0' });
        }
        
        // Validate product
        const product = await prisma.product.findUnique({
            where: { id: parseInt(productId) }
        });
        if (!product) {
            return res.status(404).json({ error: 'Bidhaa haipo' });
        }
        
        // Validate usages — check stock
        const usageList = Array.isArray(usages) ? usages : [];
        for (const u of usageList) {
            if (!u.materialId || !u.quantityUsed) continue;
            const mat = await prisma.rawMaterial.findUnique({
                where: { id: parseInt(u.materialId) }
            });
            if (!mat) {
                return res.status(404).json({ error: `Malighafi ID ${u.materialId} haipo` });
            }
            if (mat.currentStock < toNum(u.quantityUsed)) {
                return res.status(400).json({
                    error: `Stock ya ${mat.name} haitoshi. Iliyopo: ${mat.currentStock} ${mat.unit}, inahitajika: ${u.quantityUsed}`
                });
            }
        }
        
        const batchNo = await generateBatchNo();
        const wastePercent = produced > 0 ? (damaged / produced) * 100 : 0;
        
        const result = await prisma.$transaction(async (tx) => {
            // Create batch
            const batch = await tx.productionBatch.create({
                data: {
                    batchNo,
                    productId: parseInt(productId),
                    quantityProduced: produced,
                    quantityGood: good,
                    quantityDamaged: damaged,
                    wastePercent,
                    damagedReason: damagedReason || null,
                    productionDate: productionDate ? new Date(productionDate) : new Date(),
                    shift: shift || null,
                    workersCount: toNum(workersCount),
                    machineUsed: machineUsed || null,
                    status: 'completed',
                    qcStatus: 'pending',
                    reportedById: userId
                }
            });
            
            // Create usages + deduct stock
            for (const u of usageList) {
                if (!u.materialId || !u.quantityUsed) continue;
                const qty = toNum(u.quantityUsed);
                if (qty <= 0) continue;
                
                await tx.productionUsage.create({
                    data: {
                        batchId: batch.id,
                        materialId: parseInt(u.materialId),
                        quantityUsed: qty
                    }
                });
                
                await tx.rawMaterial.update({
                    where: { id: parseInt(u.materialId) },
                    data: { currentStock: { decrement: qty } }
                });
            }
            
            return batch;
        });
        
        res.status(201).json({
            message: `Batch ${batchNo} imeundwa: ${good} ${product.unit} nzuri, ${damaged} zilizoharibika`,
            batch: result
        });
        const kpiController = require('./kpi.controller');
        const periodOfBatch = new Date(productionDate || new Date()).toISOString().slice(0, 7); // Mfano "2026-11"

        kpiController.recalculateEngineerKpis(userId, periodOfBatch)
            .then(() => console.log(`KPI updated for user ${userId} on ${periodOfBatch}`))
            .catch(err => console.error("KPI recalculation failed:", err));
        } catch (err) {
            console.error('Create batch error:', err);
            res.status(500).json({ error: err.message });
        }
};
exports.submitQC = async (req, res) => {
    try {
        const { id } = req.params;
        const { result, notes } = req.body; 
        
        const userId = req.user?.id ? parseInt(req.user.id) : 1;
        
        const dbUser = await prisma.user.findUnique({ where: { id: userId } });
        const userName = dbUser ? dbUser.fullName : 'Production Manager'; 

        if (!result || !notes) return res.status(400).json({ error: 'Result and notes are required' });

        const batch = await prisma.productionBatch.findUnique({
            where: { id: parseInt(id) }, include: { product: true }
        });

        if (!batch) return res.status(404).json({ error: 'Batch not found' });
        if (batch.qcStatus === 'passed') return res.status(400).json({ error: 'Batch already passed QC' });

        // 🆕 FIX: Tengeneza Notice No kwa kutumia Batch No na Timestamp ili isigongane na nyingine
        const timestamp = Date.now().toString().slice(-4); // Namba 4 za mwisho za muda
        const noticeNo = `QC-${batch.batchNo.replace('BATCH-', '')}-${timestamp}`;

        const resultTx = await prisma.$transaction(async (tx) => {
            if (result === 'passed') {
                const updatedBatch = await tx.productionBatch.update({
                    where: { id: batch.id },
                    data: {
                        qcStatus: 'passed',
                        qcNotes: notes,
                        qcCheckedBy: userId,
                        qcCheckedAt: new Date(),
                        qcNoticeNo: noticeNo,           
                        qcInspectorName: userName,      
                    }
                });
                return updatedBatch;
            } else {
                const updatedBatch = await tx.productionBatch.update({
                    where: { id: batch.id },
                    data: {
                        qcStatus: 'failed',
                        qcNotes: notes,
                        qcCheckedBy: userId,
                        qcCheckedAt: new Date(),
                        qcNoticeNo: noticeNo,           
                        qcInspectorName: userName,      
                        quantityDamaged: batch.quantityDamaged + batch.quantityGood,
                        quantityGood: 0,
                        wastePercent: 100.0,
                        damagedReason: `QC Failed: ${notes}`
                    }
                });
                await tx.product.update({
                    where: { id: batch.productId },
                    data: { damagedStock: { increment: batch.quantityGood } }
                });
                return updatedBatch;
            }
        }, { timeout: 30000,maxWait: 10000 });

        res.json({ message: `QC ${result.toUpperCase()}! Notice issued: ${noticeNo}`, batch: resultTx });
    } catch (err) {
        console.error('QC Submit error:', err);
        res.status(500).json({ error: err.message });
    }
};
exports.getReportMaterials = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const start = new Date(startDate); start.setHours(0,0,0,0);
        const end = new Date(endDate); end.setHours(23,59,59,999);

        const usages = await prisma.productionUsage.findMany({
            where: { batch: { productionDate: { gte: start, lte: end } } },
            include: { material: { select: { name: true, unit: true } } }
        });

        const summary = {};
        usages.forEach(u => {
            const key = u.material.name;
            if (!summary[key]) summary[key] = { name: u.material.name, unit: u.material.unit, quantity: 0 };
            summary[key].quantity += u.quantityUsed;
        });
        res.json(Object.values(summary));
    } catch (err) { res.status(500).json({ error: err.message }); }
};
exports.releaseToSales = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id || 1;
        
        const batch = await prisma.productionBatch.findUnique({
            where: { id: parseInt(id) },
            include: { product: true }
        });
        
        if (!batch) {
            return res.status(404).json({ error: 'Batch haipo' });
        }
        if (batch.qcStatus !== 'passed' && batch.qcStatus !== 'pending' && batch.qcStatus !== null) {
            return res.status(400).json({ error: 'Cannot release. Batch must pass Quality Check first.' });
        }
        if (batch.releasedToSales) {
            return res.status(400).json({ error: 'Batch hii tayari imetolewa kwa sales' });
        }
        if (batch.quantityGood <= 0) {
            return res.status(400).json({ error: 'Hakuna bidhaa nzuri ya kutolewa' });
        }
        
        const result = await prisma.$transaction(async (tx) => {
            // Update batch
            const updatedBatch = await tx.productionBatch.update({
                where: { id: batch.id },
                data: {
                    releasedToSales: true,
                    releasedAt: new Date(),
                    releasedBy: userId
                }
            });
            
            // Update product stock + mark available
            const updatedProduct = await tx.product.update({
                where: { id: batch.productId },
                data: {
                    stock: { increment: batch.quantityGood },
                    availableForSale: true
                }
            });
            
            return { updatedBatch, updatedProduct };
        });
        
        res.json({
            message: `Batch ${batch.batchNo} imetolewa kwa sales. ${batch.quantityGood} ${batch.product.unit} zimeongezwa kwenye stock.`,
            batch: result.updatedBatch,
            productStock: result.updatedProduct.stock
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ================================================================
// 9. STOCK OVERVIEW — Bidhaa zote na stock
// GET /api/production/stock
// ================================================================
exports.getStockOverview = async (req, res) => {
    try {
        const products = await prisma.product.findMany({
            where: { isActive: true },
            orderBy: { name: 'asc' }
        });
        
        const stockList = products.map(p => ({
            id: p.id,
            name: p.name,
            unit: p.unit,
            category: p.category,
            currentStock: p.stock,
            damagedStock: p.damagedStock,
            minStockLevel: p.minStockLevel,
            availableForSale: p.availableForSale,
            price: p.price,
            status: p.stock <= p.minStockLevel ? 'LOW' :
                    p.stock === 0 ? 'OUT' : 'OK'
        }));
        
        const summary = {
            totalProducts: products.length,
            totalStock: products.reduce((s, p) => s + p.stock, 0),
            totalDamaged: products.reduce((s, p) => s + p.damagedStock, 0),
            lowStockCount: stockList.filter(s => s.status === 'LOW').length,
            outOfStockCount: stockList.filter(s => s.status === 'OUT').length,
            availableCount: products.filter(p => p.availableForSale).length
        };
        
        res.json({ summary, products: stockList });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ================================================================
// 10. DAMAGED PRODUCTS — List
// GET /api/production/damaged
// ================================================================
exports.getDamagedProducts = async (req, res) => {
    try {
        // Damaged batches
        const damagedBatches = await prisma.productionBatch.findMany({
            where: { quantityDamaged: { gt: 0 } },
            take: 100,
            orderBy: { productionDate: 'desc' },
            include: {
                product: { select: { name: true, unit: true } },
                reportedBy: { select: { fullName: true } }
            }
        });
        
        // Products with damagedStock
        const products = await prisma.product.findMany({
            where: { damagedStock: { gt: 0 } },
            select: {
                id: true,
                name: true,
                unit: true,
                damagedStock: true
            }
        });
        
        const totalDamagedValue = damagedBatches.reduce((s, b) => {
            return s + (b.quantityDamaged * parseFloat(b.product.price || 0));
        }, 0);
        
        const totalDamagedQty = damagedBatches.reduce((s, b) => s + b.quantityDamaged, 0);
        
        res.json({
            summary: {
                totalDamagedBatches: damagedBatches.length,
                totalDamagedQty,
                totalDamagedValue
            },
            batches: damagedBatches,
            productDamagedStock: products
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ================================================================
// 11. DISPOSE DAMAGED PRODUCT
// POST /api/production/damaged/dispose
// Body: { productId, quantity, reason }
// ================================================================
exports.disposeDamaged = async (req, res) => {
    try {
        const { productId, quantity, reason } = req.body;
        const userId = req.user?.id || 1;
        
        if (!productId || !quantity) {
            return res.status(400).json({ error: 'Product na quantity ni lazima' });
        }
        
        const qty = toNum(quantity);
        const product = await prisma.product.findUnique({
            where: { id: parseInt(productId) }
        });
        
        if (!product) return res.status(404).json({ error: 'Bidhaa haipo' });
        if (product.damagedStock < qty) {
            return res.status(400).json({
                error: `Damaged stock haitoshi. Iliyopo: ${product.damagedStock}`
            });
        }
        
        const updated = await prisma.product.update({
            where: { id: product.id },
            data: { damagedStock: { decrement: qty } }
        });
        
        res.json({
            message: `Bidhaa ${qty} ${product.unit} zimeondolewa kama waste`,
            newDamagedStock: updated.damagedStock,
            reason: reason || 'Not specified'
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ================================================================
// 12. DAILY REPORTS — List
// GET /api/production/reports/daily
// ================================================================
exports.getDailyReports = async (req, res) => {
    try {
        const { date, limit } = req.query;
        
        let where = { status: 'completed' };
        if (date) {
            const d = new Date(date);
            d.setHours(0, 0, 0, 0);
            const next = new Date(d);
            next.setDate(next.getDate() + 1);
            where.productionDate = { gte: d, lt: next };
        }
        
        const batches = await prisma.productionBatch.findMany({
            where,
            take: limit ? parseInt(limit) : 30,
            orderBy: { productionDate: 'desc' },
            include: {
                product: { select: { name: true, unit: true } },
                reportedBy: { select: { fullName: true } },
                usages: {
                    include: {
                        material: { select: { name: true, unit: true } }
                    }
                }
            }
        });
        
        // Group by date
        const byDate = {};
        for (const b of batches) {
            const dateKey = b.productionDate.toISOString().split('T')[0];
            if (!byDate[dateKey]) {
                byDate[dateKey] = {
                    date: dateKey,
                    batches: [],
                    totalProduced: 0,
                    totalGood: 0,
                    totalDamaged: 0
                };
            }
            byDate[dateKey].batches.push(b);
            byDate[dateKey].totalProduced += b.quantityProduced;
            byDate[dateKey].totalGood += b.quantityGood;
            byDate[dateKey].totalDamaged += b.quantityDamaged;
        }
        
        res.json(Object.values(byDate));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ================================================================
// 13. PRODUCT LIST (kwa dropdown)
// GET /api/production/products
// ================================================================
exports.getProductsForProduction = async (req, res) => {
    try {
        const products = await prisma.product.findMany({
            where: { isActive: true },
            select: { id: true, name: true, unit: true, price: true, category: true },
            orderBy: { name: 'asc' }
        });
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
// ================================================================
// GET MATERIAL USAGE HISTORY (Outflow)
// GET /api/production/raw-materials/:id/usage
// ================================================================
exports.getMaterialUsage = async (req, res) => {
    try {
        const { id } = req.params;
        const materialId = parseInt(id);

        // Tafuta usages zote za malighafi hii
        const usages = await prisma.productionUsage.findMany({
            where: { materialId: materialId },
            include: {
                batch: {
                    select: {
                        batchNo: true,
                        productionDate: true,
                        product: { select: { name: true, unit: true } },
                        reportedBy: { select: { fullName: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(usages);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
// ================================================================
// 14. PRODUCTION SUMMARY REPORT
// GET /api/production/reports/summary
// ================================================================
exports.getProductionSummary = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const end = endDate ? new Date(endDate) : new Date();
        end.setHours(23, 59, 59, 999);
        
        const batches = await prisma.productionBatch.findMany({
            where: {
                productionDate: { gte: start, lte: end },
                status: 'completed'
            },
            include: {
                product: { select: { name: true, unit: true, price: true } }
            }
        });
        
        const totalProduced = batches.reduce((s, b) => s + b.quantityProduced, 0);
        const totalGood = batches.reduce((s, b) => s + b.quantityGood, 0);
        const totalDamaged = batches.reduce((s, b) => s + b.quantityDamaged, 0);
        const totalReleased = batches.filter(b => b.releasedToSales).reduce((s, b) => s + b.quantityGood, 0);
        const wastePercent = totalProduced > 0 ? ((totalDamaged / totalProduced) * 100).toFixed(1) : 0;
        
        // By product
        const byProduct = {};
        for (const b of batches) {
            if (!byProduct[b.product.name]) {
                byProduct[b.product.name] = {
                    name: b.product.name,
                    unit: b.product.unit,
                    produced: 0,
                    good: 0,
                    damaged: 0,
                    released: 0
                };
            }
            byProduct[b.product.name].produced += b.quantityProduced;
            byProduct[b.product.name].good += b.quantityGood;
            byProduct[b.product.name].damaged += b.quantityDamaged;
            if (b.releasedToSales) byProduct[b.product.name].released += b.quantityGood;
        }
        
        res.json({
            period: { start, end },
            totals: {
                totalBatches: batches.length,
                totalProduced,
                totalGood,
                totalDamaged,
                totalReleased,
                wastePercent: parseFloat(wastePercent),
                pendingRelease: totalGood - totalReleased
            },
            byProduct: Object.values(byProduct)
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};