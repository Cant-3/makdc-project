const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.calculateEngineerActuals = async (kpi) => {
  // Pata tarehe za mwanzo na mwisho kulingana na period (mfano: "2026-11")
  const startDate = new Date(`${kpi.period}-01T00:00:00.000Z`);
  const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0, 23, 59, 59);

  // Vuta batches zote za mfanyakazi huyu kwa kipindi hiki
  const batches = await prisma.productionBatch.findMany({
    where: {
      reportedById: kpi.employeeId,
      productionDate: { gte: startDate, lte: endDate }
    }
  });

  let actualValue = 0;

  switch (kpi.metricType) {
    case 'OUTPUT_UNITS':
      // Jumla ya bidhaa nzuri zilizozalishwa
      actualValue = batches.reduce((sum, b) => sum + b.quantityGood, 0);
      break;

    case 'WASTE_PERCENT':
      // (Jumla ya zilizoharibika / Jumla iliyozalishwa) * 100
      const totalProduced = batches.reduce((sum, b) => sum + b.quantityProduced, 0);
      const totalDamaged = batches.reduce((sum, b) => sum + b.quantityDamaged, 0);
      actualValue = totalProduced > 0 ? (totalDamaged / totalProduced) * 100 : 0;
      break;

    case 'QC_PASS_RATE':
      // (Zilizopita QC / Jumla ya Batches) * 100
      const totalBatches = batches.length;
      const passedQC = batches.filter(b => b.qcStatus === 'passed').length;
      actualValue = totalBatches > 0 ? (passedQC / totalBatches) * 100 : 0;
      break;

    case 'RELEASE_RATE':
      // (Zilizotolewa kwa Sales / Jumla ya Good) * 100
      const goodUnits = batches.reduce((sum, b) => sum + b.quantityGood, 0);
      const releasedUnits = batches.filter(b => b.releasedToSales).reduce((sum, b) => sum + b.quantityGood, 0);
      actualValue = goodUnits > 0 ? (releasedUnits / goodUnits) * 100 : 0;
      break;

    case 'BATCHES_COMPLETED':
      actualValue = batches.length;
      break;

    default:
      actualValue = 0;
  }

  // Round to 2 decimal places
  return Math.round(actualValue * 100) / 100;
};