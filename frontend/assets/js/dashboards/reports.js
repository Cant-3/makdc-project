// ================================================================
// MAK DC INVESTMENT — REPORTS DASHBOARD
// ================================================================
// Handles: Department Reports (KPI, Charts, Tables)
// ================================================================

let trendChartInstance = null;
let statusChartInstance = null;
let paymentChartInstance = null;
let currentReportData = null;

// ================================================================
// MAIN LOAD
// ================================================================
async function loadReports() {
    const loading = document.getElementById('reportLoading');
    const content = document.getElementById('reportContent');
    const periodSelect = document.getElementById('reportPeriod');

    if (!periodSelect) return;

    if (loading) loading.style.display = 'block';
    if (content) content.style.display = 'none';

    try {
        const params = buildReportParams();

        const [summary, trend, products, regions, customers] = await Promise.all([
            API.getSalesSummary(params),
            API.getSalesTrend(params),
            API.getTopProducts({ ...params, limit: 10 }),
            API.getTopRegions(params),
            API.getTopCustomers({ ...params, limit: 10 })
        ]);

        currentReportData = { summary, trend, products, regions, customers };

        renderPeriodLabel(summary.period);
        renderKPIs(summary);
        renderTrendChart(trend.trend);
        renderStatusChart(summary.statusBreakdown);
        renderPaymentChart(summary.paymentBreakdown, summary.deliveryBreakdown);
        renderTopProducts(products.products);
        renderTopRegions(regions.regions);
        renderTopCustomers(customers.customers);

        if (loading) loading.style.display = 'none';
        if (content) content.style.display = 'block';

    } catch (err) {
        console.error('❌ Reports error:', err);
        if (loading) {
            loading.innerHTML = `
                <div style="color:#dc2626;font-size:14px;font-weight:700;">❌ Failed to load reports</div>
                <div style="font-size:12px;color:#94a3b8;margin-top:6px;">${err.message}</div>
            `;
        }
        if (typeof showToast === 'function') {
            showToast('Failed to load reports: ' + err.message, 'error');
        }
    }
}

// ================================================================
// BUILD PARAMS
// ================================================================
function buildReportParams() {
    const period = document.getElementById('reportPeriod')?.value || 'monthly';
    const params = { period };

    if (period === 'custom') {
        const from = document.getElementById('reportFromDate')?.value;
        const to = document.getElementById('reportToDate')?.value;
        if (from) params.from = from;
        if (to) params.to = to;
    } else {
        // NEW: Base date kwa period nyingine
        const baseDate = document.getElementById('reportBaseDate')?.value;
        if (baseDate) params.date = baseDate;
    }

    return params;
}

// ================================================================
// HANDLE PERIOD CHANGE
// ================================================================
function handleReportPeriodChange() {
    const period = document.getElementById('reportPeriod')?.value;
    const fromGroup = document.getElementById('reportCustomFromGroup');
    const toGroup = document.getElementById('reportCustomToGroup');
    const baseDateGroup = document.getElementById('reportBaseDateGroup');

    if (period === 'custom') {
        if (fromGroup) fromGroup.style.display = 'flex';
        if (toGroup) toGroup.style.display = 'flex';
        if (baseDateGroup) baseDateGroup.style.display = 'none';

        const fromInput = document.getElementById('reportFromDate');
        const toInput = document.getElementById('reportToDate');
        if (fromInput && !fromInput.value) {
            const d = new Date();
            d.setDate(1);
            fromInput.value = d.toISOString().split('T')[0];
        }
        if (toInput && !toInput.value) {
            toInput.value = new Date().toISOString().split('T')[0];
        }
    } else {
        if (fromGroup) fromGroup.style.display = 'none';
        if (toGroup) toGroup.style.display = 'none';
        if (baseDateGroup) baseDateGroup.style.display = 'flex';

        // Set default base date kama haipo
        const baseDateInput = document.getElementById('reportBaseDate');
        if (baseDateInput && !baseDateInput.value) {
            baseDateInput.value = new Date().toISOString().split('T')[0];
        }

        loadReports();
    }
}
// ================================================================
// NAVIGATE PERIOD (Previous/Next)
// ================================================================
function navigatePeriod(direction) {
    const baseInput = document.getElementById('reportBaseDate');
    if (!baseInput) return;

    const period = document.getElementById('reportPeriod')?.value || 'monthly';
    const current = baseInput.value ? new Date(baseInput.value) : new Date();
    let next = new Date(current);

    switch (period) {
        case 'daily':
            next.setDate(next.getDate() + direction);
            break;
        case 'weekly':
            next.setDate(next.getDate() + (7 * direction));
            break;
        case 'monthly':
            next.setMonth(next.getMonth() + direction);
            break;
        case 'quarterly':
            next.setMonth(next.getMonth() + (3 * direction));
            break;
        case 'yearly':
            next.setFullYear(next.getFullYear() + direction);
            break;
    }

    baseInput.value = next.toISOString().split('T')[0];
    loadReports();
}

// ================================================================
// RENDER PERIOD LABEL
// ================================================================
function renderPeriodLabel(period) {
    const title = document.getElementById('reportPeriodTitle');
    const subtitle = document.getElementById('reportPeriodSubtitle');
    const badge = document.getElementById('trendChartBadge');

    if (!period) return;

    const periodNames = {
        daily: 'Daily Report',
        weekly: 'Weekly Report',
        monthly: 'Monthly Report',
        quarterly: 'Quarterly Report',
        yearly: 'Yearly Report',
        custom: 'Custom Report'
    };

    if (title) title.textContent = `${periodNames[period.type] || 'Report'} — ${period.label}`;
    if (subtitle) {
        const from = new Date(period.from).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        const to = new Date(period.to).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        subtitle.textContent = `From ${from} to ${to}`;
    }
    if (badge) badge.textContent = period.label || period.type;
}

// ================================================================
// RENDER KPI CARDS
// ================================================================
function renderKPIs(data) {
    const { summary, growth } = data;

    setText('kpiTotalOrders', summary.totalOrders.toLocaleString());
    const ordersTrend = document.getElementById('kpiOrdersTrend');
    if (ordersTrend && growth) {
        const g = growth.orders || 0;
        ordersTrend.textContent = `${g >= 0 ? '↑' : '↓'} ${Math.abs(g).toFixed(1)}% vs prev`;
        ordersTrend.className = 'report-kpi-trend ' + (g >= 0 ? 'up' : 'down');
    }

    setText('kpiTotalRevenue', 'TSh ' + formatMoney(summary.totalRevenue));
    const revenueTrend = document.getElementById('kpiRevenueTrend');
    if (revenueTrend && growth) {
        const g = growth.revenue || 0;
        revenueTrend.textContent = `${g >= 0 ? '↑' : '↓'} ${Math.abs(g).toFixed(1)}% vs prev`;
        revenueTrend.className = 'report-kpi-trend ' + (g >= 0 ? 'up' : 'down');
    }

    setText('kpiCustomers', summary.totalCustomers.toLocaleString());
    const custTrend = document.getElementById('kpiCustomersTrend');
    if (custTrend) {
        custTrend.textContent = `${summary.newCustomers} new, ${summary.returningCustomers} returning`;
    }

    setText('kpiAvgOrder', 'TSh ' + formatMoney(summary.averageOrderValue));
}

// ================================================================
// RENDER TREND CHART (Line)
// ================================================================
function renderTrendChart(trend) {
    const canvas = document.getElementById('trendChart');
    if (!canvas) return;

    if (trendChartInstance) trendChartInstance.destroy();

    const labels = trend.map(t => {
        const d = new Date(t.date);
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    });

    trendChartInstance = new Chart(canvas, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Orders',
                    data: trend.map(t => t.orders),
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    yAxisID: 'y',
                    tension: 0.4,
                    fill: true,
                    borderWidth: 2
                },
                {
                    label: 'Revenue (TSh)',
                    data: trend.map(t => t.revenue),
                    borderColor: '#c9a227',
                    backgroundColor: 'rgba(201, 162, 39, 0.1)',
                    yAxisID: 'y1',
                    tension: 0.4,
                    fill: true,
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        font: { family: 'Inter', size: 12, weight: '700' },
                        usePointStyle: true,
                        padding: 16
                    }
                },
                tooltip: {
                    backgroundColor: '#1e293b',
                    titleFont: { family: 'Inter', size: 12, weight: '700' },
                    bodyFont: { family: 'Inter', size: 12 },
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            if (context.dataset.label === 'Revenue (TSh)') {
                                return ' Revenue: TSh ' + context.parsed.y.toLocaleString();
                            }
                            return ' Orders: ' + context.parsed.y;
                        }
                    }
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    beginAtZero: true,
                    grid: { color: 'rgba(0,0,0,0.04)' },
                    ticks: { font: { family: 'Inter', size: 11 } }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    beginAtZero: true,
                    grid: { drawOnChartArea: false },
                    ticks: {
                        font: { family: 'Inter', size: 11 },
                        callback: function(value) {
                            if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
                            if (value >= 1000) return (value / 1000).toFixed(0) + 'K';
                            return value;
                        }
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: { font: { family: 'Inter', size: 11 } }
                }
            }
        }
    });
}

// ================================================================
// RENDER STATUS CHART (Doughnut)
// ================================================================
function renderStatusChart(status) {
    const canvas = document.getElementById('statusChart');
    if (!canvas) return;

    if (statusChartInstance) statusChartInstance.destroy();

    const labels = [];
    const values = [];
    const colors = [];

    const statusMap = {
        pending: { label: 'Pending', color: '#f59e0b' },
        readyForFinance: { label: 'Ready for Finance', color: '#14b8a6' },
        awaitingPayment: { label: 'Awaiting Payment', color: '#eab308' },
        paid: { label: 'Paid', color: '#22c55e' },
        delivered: { label: 'Delivered', color: '#16a34a' },
        completed: { label: 'Completed', color: '#059669' },
        rejected: { label: 'Rejected', color: '#ef4444' }
    };

    Object.keys(status).forEach(key => {
        if (status[key] > 0 && statusMap[key]) {
            labels.push(statusMap[key].label);
            values.push(status[key]);
            colors.push(statusMap[key].color);
        }
    });

    if (values.length === 0) {
        labels.push('No Data');
        values.push(1);
        colors.push('#e5e7eb');
    }

    statusChartInstance = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data: values,
                backgroundColor: colors,
                borderWidth: 3,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        font: { family: 'Inter', size: 11, weight: '600' },
                        padding: 10,
                        usePointStyle: true,
                        boxWidth: 8
                    }
                },
                tooltip: {
                    backgroundColor: '#1e293b',
                    titleFont: { family: 'Inter', size: 12, weight: '700' },
                    bodyFont: { family: 'Inter', size: 12 },
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const pct = ((context.parsed / total) * 100).toFixed(1);
                            return ` ${context.label}: ${context.parsed} (${pct}%)`;
                        }
                    }
                }
            }
        }
    });
}

// ================================================================
// RENDER PAYMENT CHART (Pie)
// ================================================================
function renderPaymentChart(payment, delivery) {
    const canvas = document.getElementById('paymentChart');
    if (!canvas) return;

    if (paymentChartInstance) paymentChartInstance.destroy();

    const labels = [];
    const values = [];
    const colors = [];

    if (payment.prepaid > 0) { labels.push('Prepaid'); values.push(payment.prepaid); colors.push('#22c55e'); }
    if (payment.postpaid > 0) { labels.push('Postpaid'); values.push(payment.postpaid); colors.push('#8b5cf6'); }
    if (payment.unspecified > 0) { labels.push('Unspecified'); values.push(payment.unspecified); colors.push('#94a3b8'); }

    if (values.length === 0) {
        labels.push('No Data');
        values.push(1);
        colors.push('#e5e7eb');
    }

    paymentChartInstance = new Chart(canvas, {
        type: 'pie',
        data: {
            labels,
            datasets: [{
                data: values,
                backgroundColor: colors,
                borderWidth: 3,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        font: { family: 'Inter', size: 11, weight: '600' },
                        padding: 10,
                        usePointStyle: true,
                        boxWidth: 8
                    }
                },
                tooltip: {
                    backgroundColor: '#1e293b',
                    titleFont: { family: 'Inter', size: 12, weight: '700' },
                    bodyFont: { family: 'Inter', size: 12 },
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const pct = ((context.parsed / total) * 100).toFixed(1);
                            return ` ${context.label}: ${context.parsed} (${pct}%)`;
                        }
                    }
                }
            }
        }
    });
}

// ================================================================
// RENDER TOP PRODUCTS TABLE
// ================================================================
function renderTopProducts(products) {
    const tbody = document.getElementById('topProductsBody');
    if (!tbody) return;

    if (!products || products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="report-empty">📭 No products in this period</td></tr>';
        return;
    }

    tbody.innerHTML = products.map((p, i) => `
        <tr>
            <td class="rank">#${i + 1}</td>
            <td><strong>${esc(p.productName)}</strong></td>
            <td class="qty" style="text-align:right;">${p.quantity.toLocaleString()}</td>
            <td class="revenue" style="text-align:right;">TSh ${formatMoney(p.revenue)}</td>
        </tr>
    `).join('');
}

// ================================================================
// RENDER TOP REGIONS TABLE
// ================================================================
function renderTopRegions(regions) {
    const tbody = document.getElementById('topRegionsBody');
    if (!tbody) return;

    if (!regions || regions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="report-empty">📭 No regions in this period</td></tr>';
        return;
    }

    tbody.innerHTML = regions.slice(0, 10).map(r => `
        <tr>
            <td><strong>${esc(r.region)}</strong></td>
            <td style="text-align:right;">${r.orders}</td>
            <td class="revenue" style="text-align:right;">TSh ${formatMoney(r.revenue)}</td>
            <td style="text-align:right;">
                <span class="pct-bar" style="width:${Math.min(r.percentage * 1.2, 60)}px;"></span>
                <strong>${r.percentage}%</strong>
            </td>
        </tr>
    `).join('');
}

// ================================================================
// RENDER TOP CUSTOMERS TABLE
// ================================================================
function renderTopCustomers(customers) {
    const tbody = document.getElementById('topCustomersBody');
    if (!tbody) return;

    if (!customers || customers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="report-empty">📭 No customers in this period</td></tr>';
        return;
    }

    tbody.innerHTML = customers.map((c, i) => `
        <tr>
            <td class="rank">#${i + 1}</td>
            <td><strong>${esc(c.customerName || '—')}</strong></td>
            <td>${esc(c.phone || '—')}</td>
            <td>${esc(c.region || '—')}</td>
            <td style="text-align:right;">${c.orders}</td>
            <td class="revenue" style="text-align:right;">TSh ${formatMoney(c.totalSpent)}</td>
        </tr>
    `).join('');
}

// ================================================================
// HELPERS
// ================================================================
function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function formatMoney(num) {
    const n = Number(num) || 0;
    if (n >= 1000000) return (n / 1000000).toFixed(2) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(0) + 'K';
    return n.toLocaleString();
}

function esc(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ================================================================
// EXPORT — PDF
// ================================================================
function exportReportPDF() {
    window.print();
}

// ================================================================
// EXPORT — EXCEL (CSV fallback)
// ================================================================
function exportReportExcel() {
    if (!currentReportData) {
        if (typeof showToast === 'function') showToast('No data to export', 'warning');
        return;
    }

    const { summary, products, regions, customers } = currentReportData;
    const period = summary.period.label;

    let csv = '';

    // Header
    csv += `MAK DC INVESTMENT — SALES REPORT\n`;
    csv += `Period: ${period}\n`;
    csv += `Generated: ${new Date().toLocaleString()}\n\n`;

    // Summary
    csv += `SUMMARY\n`;
    csv += `Total Orders,${summary.summary.totalOrders}\n`;
    csv += `Total Revenue,TSh ${summary.summary.totalRevenue}\n`;
    csv += `Unique Customers,${summary.summary.totalCustomers}\n`;
    csv += `New Customers,${summary.summary.newCustomers}\n`;
    csv += `Avg Order Value,TSh ${summary.summary.averageOrderValue}\n\n`;

    // Top Products
    csv += `TOP PRODUCTS\n`;
    csv += `Product,Quantity,Revenue\n`;
    products.products.forEach(p => {
        csv += `"${p.productName}",${p.quantity},${p.revenue}\n`;
    });
    csv += `\n`;

    // Regions
    csv += `REVENUE BY REGION\n`;
    csv += `Region,Orders,Revenue,Percentage\n`;
    regions.regions.forEach(r => {
        csv += `"${r.region}",${r.orders},${r.revenue},${r.percentage}%\n`;
    });
    csv += `\n`;

    // Customers
    csv += `TOP CUSTOMERS\n`;
    csv += `Name,Phone,Region,Orders,Total Spent\n`;
    customers.customers.forEach(c => {
        csv += `"${c.customerName || ''}","${c.phone || ''}","${c.region || ''}",${c.orders},${c.totalSpent}\n`;
    });

    // Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `MAKDC-Report-${period.replace(/\s+/g, '-')}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    if (typeof showToast === 'function') showToast('✅ Report downloaded!', 'success');
}