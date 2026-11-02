// ================================================================
// MAK DC INVESTMENT — SALES DASHBOARD (Home)
// ================================================================

let dashTrendChartInstance = null;
let dashStatusChartInstance = null;

// ================================================================
// LOAD DASHBOARD
// ================================================================
async function loadDashboard() {
    try {
        // 1. Render user info + date
        renderDashHeader();

        // 2. Fetch data in parallel
        const [orders, plansResponse] = await Promise.all([
            API.getOrders().catch(() => []),
            API.getMarketingPlans().catch(() => ({ plans: [] }))
        ]);

        const plans = plansResponse.plans || [];

        // 3. Update stats strip
        updateDashStats(orders, plans);

        // 4. Render charts
        renderDashTrendChart(orders);
        renderDashStatusChart(orders);

        // 5. Render recent orders list
        renderDashPendingOrders(orders);

        // 6. Render active plans list
        renderDashActivePlans(plans);

        // 7. Render activity feed
        renderDashActivity(orders, plans);

    } catch (err) {
        console.error('❌ Dashboard error:', err);
        showToast('Failed to load dashboard: ' + err.message, 'error');
    }
}

// ================================================================
// RENDER HEADER (User + Date)
// ================================================================
function renderDashHeader() {
    const user = Auth.getUser();
    if (!user) return;

    // User info
    const initials = user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    setText('dashUserName', user.fullName);
    setText('dashUserFullName', user.fullName);
    setText('dashUserRole', `📈 ${user.role}`);

    const avatarEl = document.getElementById('dashUserAvatar');
    if (avatarEl) {
        if (user.profilePic) {
            avatarEl.innerHTML = `<img src="${user.profilePic}" alt="Profile">`;
        } else {
            avatarEl.textContent = initials;
        }
    }

    // Date
    const now = new Date();
    const dayEl = document.getElementById('dashDay');
    const monthEl = document.getElementById('dashMonth');
    const subtitleEl = document.getElementById('dashSubtitle');

    if (dayEl) dayEl.textContent = String(now.getDate()).padStart(2, '0');
    if (monthEl) monthEl.textContent = now.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase();

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    if (subtitleEl) {
        subtitleEl.textContent = `Here's your complete business overview for ${dayNames[now.getDay()]}, ${now.getDate()} ${monthNames[now.getMonth()]} ${now.getFullYear()}`;
    }
}

// ================================================================
// UPDATE STATS STRIP
// ================================================================
function updateDashStats(orders, plans) {
    const totalOrders = orders.length;
    const pending = orders.filter(o => o.status === 'pending').length;
    const delivered = orders.filter(o => o.status === 'delivered' || o.status === 'completed').length;
    const rejected = orders.filter(o => o.status === 'rejected').length;
    const activePlans = plans.filter(p => p.status === 'active').length;

    setText('dashStatAllOrders', totalOrders);
    setText('dashStatPending', pending);
    setText('dashStatDelivered', delivered);
    setText('dashStatActivePlans', activePlans);
    setText('dashStatRejected', rejected);
}

// ================================================================
// RENDER TREND CHART
// ================================================================
function renderDashTrendChart(orders) {
    const canvas = document.getElementById('dashTrendChart');
    if (!canvas) return;

    if (dashTrendChartInstance) dashTrendChartInstance.destroy();

    // Build daily data for last 7 days
    const days = [];
    const revenueData = [];
    const ordersData = [];

    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        d.setHours(0, 0, 0, 0);

        const nextDay = new Date(d);
        nextDay.setDate(nextDay.getDate() + 1);

        const dayOrders = orders.filter(o => {
            const oDate = new Date(o.createdAt);
            return oDate >= d && oDate < nextDay;
        });

        const revenue = dayOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
        const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });

        days.push(dayName);
        revenueData.push(revenue / 1000000); // Convert to millions
        ordersData.push(dayOrders.length);
    }

    const ctx = canvas.getContext('2d');
    const goldGradient = ctx.createLinearGradient(0, 0, 0, 300);
    goldGradient.addColorStop(0, 'rgba(201, 162, 39, 0.35)');
    goldGradient.addColorStop(1, 'rgba(201, 162, 39, 0)');

    const blueGradient = ctx.createLinearGradient(0, 0, 0, 300);
    blueGradient.addColorStop(0, 'rgba(59, 130, 246, 0.25)');
    blueGradient.addColorStop(1, 'rgba(59, 130, 246, 0)');

    dashTrendChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: days,
            datasets: [
                {
                    label: 'Revenue (TSh M)',
                    data: revenueData,
                    borderColor: '#c9a227',
                    backgroundColor: goldGradient,
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#c9a227',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 3,
                    pointRadius: 6,
                    pointHoverRadius: 9
                },
                {
                    label: 'Orders',
                    data: ordersData,
                    borderColor: '#3b82f6',
                    backgroundColor: blueGradient,
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#3b82f6',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 3,
                    pointRadius: 6,
                    pointHoverRadius: 9,
                    yAxisID: 'y1'
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
                    align: 'end',
                    labels: {
                        font: { family: 'Inter', size: 12, weight: '700' },
                        usePointStyle: true,
                        pointStyle: 'circle',
                        padding: 20,
                        color: '#475569'
                    }
                },
                tooltip: {
                    backgroundColor: '#1e293b',
                    titleFont: { family: 'Inter', size: 13, weight: '800' },
                    bodyFont: { family: 'Inter', size: 12, weight: '600' },
                    padding: 14,
                    cornerRadius: 12,
                    usePointStyle: true
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(0,0,0,0.05)', drawTicks: false },
                    border: { display: false },
                    ticks: {
                        font: { family: 'JetBrains Mono', size: 11, weight: '600' },
                        color: '#94a3b8',
                        callback: v => v + 'M'
                    }
                },
                y1: {
                    position: 'right',
                    beginAtZero: true,
                    grid: { display: false },
                    border: { display: false },
                    ticks: {
                        font: { family: 'JetBrains Mono', size: 11, weight: '600' },
                        color: '#94a3b8'
                    }
                },
                x: {
                    grid: { display: false },
                    border: { display: false },
                    ticks: {
                        font: { family: 'Inter', size: 12, weight: '700' },
                        color: '#64748b'
                    }
                }
            }
        }
    });
}

// ================================================================
// RENDER STATUS DOUGHNUT
// ================================================================
function renderDashStatusChart(orders) {
    const canvas = document.getElementById('dashStatusChart');
    if (!canvas) return;

    if (dashStatusChartInstance) dashStatusChartInstance.destroy();

    const pending = orders.filter(o => o.status === 'pending').length;
    const readyForFinance = orders.filter(o => o.status === 'ready-for-finance').length;
    const paid = orders.filter(o => o.status === 'paid').length;
    const delivered = orders.filter(o => o.status === 'delivered' || o.status === 'completed').length;
    const rejected = orders.filter(o => o.status === 'rejected').length;

    const ctx = canvas.getContext('2d');

    dashStatusChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Pending', 'Ready for Finance', 'Paid', 'Delivered', 'Rejected'],
            datasets: [{
                data: [pending, readyForFinance, paid, delivered, rejected],
                backgroundColor: ['#f59e0b', '#14b8a6', '#22c55e', '#16a34a', '#ef4444'],
                borderWidth: 4,
                borderColor: '#ffffff',
                hoverOffset: 12
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '68%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        font: { family: 'Inter', size: 11.5, weight: '700' },
                        padding: 14,
                        usePointStyle: true,
                        pointStyle: 'circle',
                        color: '#475569'
                    }
                },
                tooltip: {
                    backgroundColor: '#1e293b',
                    titleFont: { family: 'Inter', size: 13, weight: '800' },
                    bodyFont: { family: 'Inter', size: 12, weight: '600' },
                    padding: 14,
                    cornerRadius: 12,
                    usePointStyle: true,
                    callbacks: {
                        label: function(ctx) {
                            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                            const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : 0;
                            return `  ${ctx.label}: ${ctx.parsed} (${pct}%)`;
                        }
                    }
                }
            }
        }
    });
}

// ================================================================
// RENDER PENDING ORDERS LIST
// ================================================================
function renderDashPendingOrders(orders) {
    const container = document.getElementById('dashPendingOrdersList');
    const countBadge = document.getElementById('dashPendingCount');
    if (!container) return;

    const pending = orders.filter(o => o.status === 'pending').slice(0, 5);

    if (countBadge) countBadge.textContent = orders.filter(o => o.status === 'pending').length;

    if (pending.length === 0) {
        container.innerHTML = `
            <div style="text-align:center;padding:40px 20px;color:#94a3b8;">
                <div style="font-size:40px;opacity:0.5;margin-bottom:8px;">✅</div>
                <div style="font-size:13px;font-weight:700;color:#64748b;">No pending orders</div>
                <div style="font-size:11.5px;color:#94a3b8;margin-top:4px;">All orders are up to date!</div>
            </div>
        `;
        return;
    }

    container.innerHTML = pending.map(o => `
        <div class="dash-list-row" onclick="viewOrder('${esc(o.orderId)}')">
            <div class="dash-list-row-left">
                <div class="dash-list-row-id">${esc(o.orderId)}</div>
                <div class="dash-list-row-title">${esc(o.customerName || '—')}</div>
                <div class="dash-list-row-meta">
                    <span>📞 ${esc(o.phone || '—')}</span>
                    <span>📦 ${o.totalItems || (o.items || []).length || 0} items</span>
                </div>
            </div>
            <div class="dash-list-row-right">
                <div class="dash-list-row-amount">TSh ${formatMoney(o.totalAmount)}</div>
                <span class="dash-status-badge pending">⏳ Pending</span>
            </div>
        </div>
    `).join('');
}

// ================================================================
// RENDER ACTIVE PLANS LIST
// ================================================================
function renderDashActivePlans(plans) {
    const container = document.getElementById('dashActivePlansList');
    const countBadge = document.getElementById('dashPlansCount');
    if (!container) return;

    const activePlans = plans.filter(p => p.status === 'active' || p.status === 'draft').slice(0, 5);

    if (countBadge) countBadge.textContent = plans.filter(p => p.status === 'active').length;

    if (activePlans.length === 0) {
        container.innerHTML = `
            <div style="text-align:center;padding:40px 20px;color:#94a3b8;">
                <div style="font-size:40px;opacity:0.5;margin-bottom:8px;">📊</div>
                <div style="font-size:13px;font-weight:700;color:#64748b;">No active plans</div>
                <div style="font-size:11.5px;color:#94a3b8;margin-top:4px;">Create your first campaign!</div>
            </div>
        `;
        return;
    }

    container.innerHTML = activePlans.map(p => {
        const startDate = p.periodStart ? new Date(p.periodStart).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
        const endDate = p.periodEnd ? new Date(p.periodEnd).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

        return `
            <div class="dash-list-row" onclick="viewMarketingPlan(${p.id})">
                <div class="dash-list-row-left">
                    <div class="dash-list-row-title">${esc(p.title)}</div>
                    <div class="dash-list-row-meta">
                        <span>📅 ${startDate} - ${endDate}</span>
                        <span>💰 TSh ${formatMoney(p.budget)}</span>
                    </div>
                    <div class="dash-mini-progress">
                        <div class="dash-mini-progress-fill" style="width: ${p.progress || 0}%;"></div>
                    </div>
                </div>
                <div class="dash-list-row-right">
                    <div class="dash-list-row-amount">${p.progress || 0}%</div>
                    <span class="dash-status-badge ${p.status}">${getStatusIcon(p.status)} ${p.status}</span>
                </div>
            </div>
        `;
    }).join('');
}

// ================================================================
// RENDER ACTIVITY FEED
// ================================================================
function renderDashActivity(orders, plans) {
    const container = document.getElementById('dashActivityFeed');
    if (!container) return;

    // Build activity from recent orders + plans
    const activities = [];

    // Recent orders (delivered / sent to finance)
    orders.slice(0, 5).forEach(o => {
        if (o.status === 'delivered' || o.status === 'completed') {
            activities.push({
                icon: '✅',
                iconClass: 'green',
                text: `Order <strong>${esc(o.orderId)}</strong> was <strong>delivered</strong>`,
                time: o.deliveredAt ? getTimeAgo(o.deliveredAt) : 'recently',
                timestamp: new Date(o.deliveredAt || o.updatedAt).getTime()
            });
        } else if (o.status === 'ready-for-finance') {
            activities.push({
                icon: '📤',
                iconClass: 'blue',
                text: `Order <strong>${esc(o.orderId)}</strong> was sent to <strong>Finance</strong>`,
                time: o.reviewedAtSales ? getTimeAgo(o.reviewedAtSales) : 'recently',
                timestamp: new Date(o.reviewedAtSales || o.updatedAt).getTime()
            });
        } else if (o.status === 'pending') {
            activities.push({
                icon: '⏳',
                iconClass: 'gold',
                text: `New order <strong>${esc(o.orderId)}</strong> is <strong>waiting for review</strong>`,
                time: getTimeAgo(o.createdAt),
                timestamp: new Date(o.createdAt).getTime()
            });
        }
    });

    // Recent plans
    plans.slice(0, 3).forEach(p => {
        if (p.status === 'completed') {
            activities.push({
                icon: '🎯',
                iconClass: 'green',
                text: `Marketing Plan <strong>${esc(p.title)}</strong> was <strong>completed</strong>`,
                time: getTimeAgo(p.updatedAt),
                timestamp: new Date(p.updatedAt).getTime()
            });
        } else if (p.progress > 0) {
            activities.push({
                icon: '📊',
                iconClass: 'violet',
                text: `Plan <strong>${esc(p.title)}</strong> progress updated to <strong>${p.progress}%</strong>`,
                time: getTimeAgo(p.updatedAt),
                timestamp: new Date(p.updatedAt).getTime()
            });
        }
    });

    // Sort by timestamp (newest first)
    activities.sort((a, b) => b.timestamp - a.timestamp);

    if (activities.length === 0) {
        container.innerHTML = `
            <div style="text-align:center;padding:40px 20px;color:#94a3b8;">
                <div style="font-size:40px;opacity:0.5;margin-bottom:8px;">📭</div>
                <div style="font-size:13px;font-weight:700;color:#64748b;">No recent activity</div>
            </div>
        `;
        return;
    }

    container.innerHTML = activities.slice(0, 5).map(a => `
        <div class="dash-activity-item">
            <div class="dash-activity-icon ${a.iconClass}">${a.icon}</div>
            <div class="dash-activity-content">
                <div class="dash-activity-text">${a.text}</div>
                <div class="dash-activity-time">${a.time}</div>
            </div>
        </div>
    `).join('');
}

// ================================================================
// HELPERS
// ================================================================
function formatMoney(num) {
    const n = Number(num) || 0;
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(0) + 'K';
    return n.toLocaleString();
}

function getStatusIcon(status) {
    const icons = {
        draft: '📝',
        active: '🟢',
        completed: '✅',
        cancelled: '❌'
    };
    return icons[status] || '📊';
}

function getTimeAgo(dateStr) {
    if (!dateStr) return 'recently';
    const date = new Date(dateStr);
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    return date.toLocaleDateString();
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
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