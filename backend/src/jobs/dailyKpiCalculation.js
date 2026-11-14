const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { calculateEngineerActuals } = require('../services/kpi/engineerKpiService');

const runDailyCalculation = async () => {
  console.log('⏳ [CRON] Starting daily KPI calculation...');
  
  try {
    // 1. Pata KPI zote zilizo hai (released, active)
    const activeKpis = await prisma.employeeKpi.findMany({
      where: { status: { in: ['released', 'active'] } }
    });

    let count = 0;

    // 2. Hesabu kila KPI
    for (const kpi of activeKpis) {
      let actualValue = 0;
      
      if (kpi.department === 'Engineering and Production Department') {
        actualValue = await calculateEngineerActuals(kpi);
      }
      // (Hapa baadaye tutaongeza Sales, Finance, Procurement)

      // 3. Update database
      await prisma.employeeKpi.update({
        where: { id: kpi.id },
        data: {
          actualValue,
          calculatedAt: new Date()
        }
      });
      count++;
    }

    console.log(`✅ [CRON] Successfully calculated ${count} KPIs.`);
  } catch (error) {
    console.error('❌ [CRON] Error calculating KPIs:', error);
  }
};

// Panga i-run kila siku saa 1:00 usiku (0 1 * * *)
cron.schedule('0 1 * * *', () => {
  runDailyCalculation();
});

module.exports = { runDailyCalculation };