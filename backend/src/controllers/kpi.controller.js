const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ============================================================
// 1. Get Available Metrics
// ============================================================
exports.getAvailableMetrics = async (req, res) => {
  try {
    const { department } = req.params;
    let metrics = [];
    
    if (department === 'Engineering and Production Department' || department === 'Engineering') {
      metrics = [
        { type: 'OUTPUT_UNITS', label: 'Output Units', unit: 'units' },
        { type: 'WASTE_PERCENT', label: 'Waste %', unit: '%' },
        { type: 'QC_PASS_RATE', label: 'QC Pass Rate', unit: '%' },
        { type: 'RELEASE_RATE', label: 'Release Rate', unit: '%' },
        { type: 'MATERIAL_EFFICIENCY', label: 'Material Efficiency', unit: 'units/kg' },
        { type: 'BATCHES_COMPLETED', label: 'Batches Completed', unit: 'batches' }
      ];
    } else if (department === 'Sales and Marketing Department') {
      metrics = [
        { type: 'REVENUE', label: 'Revenue', unit: 'TSh' },
        { type: 'ORDERS_COUNT', label: 'Orders Count', unit: 'orders' },
        { type: 'CONVERSION_RATE', label: 'Conversion Rate', unit: '%' }
      ];
    }

    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============================================================
// 2. Create KPI (Save as Draft)
// ============================================================
exports.createEmployeeKpi = async (req, res) => {
  try {
    const { employeeId, employeeName, department, role, kpis, period, periodLabel, periodType, notes, createdBy, createdById } = req.body;

    const createdKpis = await prisma.$transaction(
      kpis.map(kpi => 
        prisma.employeeKpi.create({
          data: {
            employeeId: parseInt(employeeId, 10),
            employeeName,
            department,
            role,
            metricType: kpi.metricType,
            metricLabel: kpi.metricLabel,
            metricUnit: kpi.metricUnit,
            targetValue: parseFloat(kpi.targetValue),
            period,
            periodLabel,
            periodType: periodType || 'monthly',
            status: 'draft',
            notes,
            createdBy,
            createdById,
          }
        })
      )
    );

    res.status(201).json({ 
      success: true, 
      message: `${createdKpis.length} target(s) saved as draft.`,
      kpis: createdKpis 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============================================================
// 3. Release KPI (Draft -> Released)
// ============================================================
exports.releaseEmployeeKpis = async (req, res) => {
    try {
        const { kpiIds, releasedBy, releasedById } = req.body;

        if (!kpiIds || !Array.isArray(kpiIds) || kpiIds.length === 0) {
            return res.status(400).json({ error: 'Invalid KPI IDs provided.' });
        }

        const numericIds = kpiIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id));

        if (numericIds.length === 0) {
            return res.status(400).json({ error: 'No valid numeric KPI IDs found.' });
        }

        const updateData = {
            status: 'released',
            releasedBy: releasedBy || 'CEO',
            releasedAt: new Date()
        };

        if (releasedById && !isNaN(parseInt(releasedById))) {
            updateData.releasedById = parseInt(releasedById);
        }

        const result = await prisma.employeeKpi.updateMany({
            where: { id: { in: numericIds } },
            data: updateData
        });

        res.json({ 
            success: true, 
            message: `${result.count} KPI(s) released successfully.`,
            releasedCount: result.count
        });

    } catch (error) {
        console.error('Error releasing KPIs:', error);
        res.status(500).json({ error: error.message || 'Failed to release KPIs' });
    }
};
// ============================================================
// 4. Update KPI (With History Log)
// ============================================================
exports.updateEmployeeKpi = async (req, res) => {
    try {
        const { id } = req.params;
        const { incrementValue, notes, status } = req.body; // Tumeita 'incrementValue' badala ya actualValue

        const existingKpi = await prisma.employeeKpi.findUnique({
            where: { id: parseInt(id, 10) }
        });

        if (!existingKpi) return res.status(404).json({ error: 'KPI not found' });

        // 🆕 HESABU MPYA: Ya awali + Aliyoongeza sasa
        const currentActual = Number(existingKpi.actualValue) || 0;
        const newIncrement = Number(incrementValue) || 0;
        const newActualTotal = currentActual + newIncrement;

        // Tengeneza Historia (Log)
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        
        let newLog = `[${dateStr} ${timeStr}] Added: +${newIncrement} ${existingKpi.metricUnit} (Total: ${newActualTotal})`;
        if (notes && notes.trim() !== '') {
            newLog += ` | Note: ${notes.trim()}`;
        }

        const oldNotes = existingKpi.notes ? existingKpi.notes + '\n' : '';
        const updatedNotes = oldNotes + newLog;

        const updateData = {
            actualValue: newActualTotal, // Hifadhi jumla mpya
            notes: updatedNotes.trim(),
            updatedAt: now
        };
        
        if (status !== undefined) updateData.status = status;

        const kpi = await prisma.employeeKpi.update({
            where: { id: parseInt(id, 10) },
            data: updateData
        });

        res.json({ success: true, message: "Progress added successfully", kpi });
    } catch (error) {
        console.error('Error updating KPI:', error);
        res.status(500).json({ error: error.message });
    }
};
// ============================================================
// 5. Get Employee KPIs
// ============================================================
exports.getEmployeeKpis = async (req, res) => {
    try {
        const { employeeId, period, status } = req.query;
        let whereClause = {};
        
        if (employeeId) {
            const parsedId = parseInt(employeeId, 10);
            if (!isNaN(parsedId)) whereClause.employeeId = parsedId; 
        }

        if (period) whereClause.period = period;
        if (status) whereClause.status = status;

        if (whereClause.employeeId && whereClause.period) {
            await exports.recalculateEngineerKpis(whereClause.employeeId, whereClause.period);
        }

        const kpis = await prisma.employeeKpi.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' }
        });

        res.json(kpis);
    } catch (error) {
        console.error('Error fetching employee KPIs:', error);
        res.status(500).json({ error: error.message });
    }
};

// ============================================================
// 🆕 Kikokotoo cha KPI (Auto-Calculate Engine)
// ============================================================
exports.recalculateEngineerKpis = async (employeeId, period) => {
    try {
        const [year, month] = period.split('-');
        const startDate = new Date(parseInt(year), parseInt(month) - 1, 1, 0, 0, 0);
        const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);

        const kpis = await prisma.employeeKpi.findMany({
            where: { 
                employeeId: parseInt(employeeId),
                period: period
            }
        });

        if (kpis.length === 0) return;

        const batches = await prisma.productionBatch.findMany({
            where: {
                reportedById: parseInt(employeeId),
                productionDate: {
                    gte: startDate,
                    lte: endDate
                }
            }
        });

        console.log(`🔍 [KPI Calc] Found ${batches.length} batches for Employee ${employeeId} in ${period}`);

        let totalBatches = batches.length;
        let totalProduced = 0;
        let totalDamaged = 0;
        let totalGood = 0;

        batches.forEach(b => {
            totalProduced += Number(b.quantityProduced || 0);
            totalDamaged += Number(b.quantityDamaged || 0);
            totalGood += Number(b.quantityGood || 0);
        });

        for (const kpi of kpis) {
            let actualValue = kpi.actualValue;

            if (kpi.metricType === 'OUTPUT_UNITS') {
                actualValue = totalGood;
            } 
            else if (kpi.metricType === 'BATCHES_COMPLETED') {
                actualValue = totalBatches;
            }
            else if (kpi.metricType === 'WASTE_PERCENT') {
                actualValue = totalProduced > 0 ? (totalDamaged / totalProduced) * 100 : 0;
            }

            await prisma.employeeKpi.update({
                where: { id: kpi.id },
                data: { 
                    actualValue: actualValue,
                    calculatedAt: new Date()
                }
            });
        }

        console.log(`✅ KPI recalculated for Employee ${employeeId} for ${period}`);

    } catch (error) {
        console.error('❌ Error recalculating KPIs:', error);
    }
};