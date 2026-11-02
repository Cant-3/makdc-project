// ================================================================
// MAK DC INVESTMENT — MARKETING PLANS DASHBOARD
// ================================================================

let allMarketingPlans = [];
let currentMarketingFilter = 'all';
let currentEditingPlanId = null;

// Available channels
const MARKETING_CHANNELS = [
    'Facebook', 'Instagram', 'WhatsApp', 'Radio', 'TV',
    'Flyers', 'Billboards', 'Events', 'Google Ads', 'Email'
];

// ================================================================
// LOAD MARKETING PLANS
// ================================================================
async function loadMarketingPlans() {
    const loading = document.getElementById('marketingLoading');
    const empty = document.getElementById('marketingEmpty');
    const grid = document.getElementById('marketingGrid');

    if (loading) loading.style.display = 'block';
    if (empty) empty.style.display = 'none';
    if (grid) grid.style.display = 'none';

    try {
        const response = await API.getMarketingPlans();
        allMarketingPlans = response.plans || [];

        // Update counts
        updateMarketingCounts();

        // Render
        renderMarketingPlans();

    } catch (err) {
        console.error('❌ Marketing plans error:', err);
        if (loading) {
            loading.innerHTML = `
                <div style="color:#dc2626;font-size:14px;font-weight:700;">
                    ❌ Failed to load marketing plans
                </div>
                <div style="font-size:12px;color:#94a3b8;margin-top:6px;">${err.message}</div>
            `;
        }
    }
}

// ================================================================
// UPDATE COUNTS
// ================================================================
function updateMarketingCounts() {
    const counts = {
        all: allMarketingPlans.length,
        draft: allMarketingPlans.filter(p => p.status === 'draft').length,
        active: allMarketingPlans.filter(p => p.status === 'active').length,
        completed: allMarketingPlans.filter(p => p.status === 'completed').length,
        cancelled: allMarketingPlans.filter(p => p.status === 'cancelled').length
    };

    setText('countAll', counts.all);
    setText('countDraft', counts.draft);
    setText('countActive', counts.active);
    setText('countCompleted', counts.completed);
    setText('countCancelled', counts.cancelled);
}

// ================================================================
// FILTER MARKETING PLANS
// ================================================================
function filterMarketingPlans(filter, btnEl) {
    currentMarketingFilter = filter;

    // Update button states
    document.querySelectorAll('.marketing-filter-btn').forEach(btn => btn.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');

    renderMarketingPlans();
}

// ================================================================
// RENDER MARKETING PLANS
// ================================================================
function renderMarketingPlans() {
    const loading = document.getElementById('marketingLoading');
    const empty = document.getElementById('marketingEmpty');
    const grid = document.getElementById('marketingGrid');

    if (loading) loading.style.display = 'none';

    // Filter
    let plans = allMarketingPlans;
    if (currentMarketingFilter !== 'all') {
        plans = plans.filter(p => p.status === currentMarketingFilter);
    }

    if (plans.length === 0) {
        if (empty) empty.style.display = 'block';
        if (grid) grid.style.display = 'none';
        return;
    }

    if (empty) empty.style.display = 'none';
    if (grid) {
        grid.style.display = 'grid';
        grid.innerHTML = plans.map(plan => renderMarketingCard(plan)).join('');
    }
}

// ================================================================
// RENDER SINGLE CARD
// ================================================================
function renderMarketingCard(plan) {
    const startDate = new Date(plan.periodStart).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric'
    });
    const endDate = new Date(plan.periodEnd).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric'
    });

    const channelsHtml = (plan.channels || []).slice(0, 4).map(ch =>
        `<span class="marketing-channel-tag">${esc(ch)}</span>`
    ).join('');

    const extraChannels = (plan.channels || []).length > 4
        ? `<span class="marketing-channel-tag">+${plan.channels.length - 4}</span>`
        : '';

    return `
        <div class="marketing-card">
            <div class="marketing-card-header">
                <div class="marketing-card-title">${esc(plan.title)}</div>
                <div class="marketing-card-status ${plan.status}">${plan.status}</div>
            </div>
            <div class="marketing-card-body">
                ${plan.description ? `<div class="marketing-card-desc">${esc(plan.description)}</div>` : ''}
                <div class="marketing-card-info">
                    <div class="marketing-info-row">
                        <span class="icon">📅</span>
                        <span class="value">${startDate} → ${endDate}</span>
                    </div>
                    <div class="marketing-info-row">
                        <span class="icon">💰</span>
                        <span class="label">Budget</span>
                        <span class="value">TSh ${Number(plan.budget).toLocaleString()}</span>
                    </div>
                </div>
                ${channelsHtml ? `<div class="marketing-channels">${channelsHtml}${extraChannels}</div>` : ''}
                <div class="marketing-progress-wrap">
                    <div class="marketing-progress-header">
                        <span>Progress</span>
                        <span class="marketing-progress-pct">${plan.progress}%</span>
                    </div>
                    <div class="marketing-progress-bar">
                        <div class="marketing-progress-fill" style="width:${plan.progress}%;"></div>
                    </div>
                </div>
            </div>
            <div class="marketing-card-footer">
                <button class="marketing-card-btn view" onclick="viewMarketingPlan(${plan.id})">
                    👁 View
                </button>
                <button class="marketing-card-btn edit" onclick="openMarketingModal(${plan.id})">
                    🖋️ Edit
                </button>
                <button class="marketing-card-btn delete" onclick="deleteMarketingPlan(${plan.id}, '${esc(plan.title)}')">
                    🗑
                </button>
            </div>
        </div>
    `;
}

// ================================================================
// OPEN CREATE/EDIT MODAL
// ================================================================
async function openMarketingModal(planId = null) {
    currentEditingPlanId = planId;

    const modal = document.getElementById('marketingModal');
    if (!modal) {
        // Create modal on first open
        createMarketingModal();
    }

    // Reset form
    resetMarketingForm();

    // Set title
    const titleEl = document.getElementById('marketingModalTitle');
    if (titleEl) {
        titleEl.textContent = planId ? '🖋️ Edit Marketing Plan' : '➕ Create Marketing Plan';
    }

    // Load data if editing
    if (planId) {
        try {
            const plan = await API.getMarketingPlan(planId);
            fillMarketingForm(plan);
        } catch (err) {
            showToast('Failed to load plan: ' + err.message, 'error');
            return;
        }
    }

    document.getElementById('marketingModal').classList.add('show');
}

// ================================================================
// CREATE MODAL HTML
// ================================================================
function createMarketingModal() {
    const channelsHtml = MARKETING_CHANNELS.map(ch => `
        <label class="marketing-channel-checkbox" onclick="toggleChannelCheckbox(this)">
            <input type="checkbox" value="${ch}">
            ${ch}
        </label>
    `).join('');

    const modalHTML = `
        <div class="modal-overlay" id="marketingModal">
            <div class="modal-box marketing-modal-box">
                <div class="marketing-modal-header">
                    <h3 id="marketingModalTitle">➕ Create Marketing Plan</h3>
                    <button class="modal-close" onclick="closeModal('marketingModal')">✕</button>
                </div>
                <div class="marketing-modal-body">
                    <div class="marketing-form-row">
                        <div class="marketing-form-group full">
                            <label>Plan Title <span class="req">*</span></label>
                            <input type="text" id="mpTitle" placeholder="e.g., Q1 2026 — Facebook Campaign">
                        </div>
                    </div>
                    <div class="marketing-form-row">
                        <div class="marketing-form-group full">
                            <label>Description</label>
                            <textarea id="mpDescription" placeholder="Brief description of the campaign..."></textarea>
                        </div>
                    </div>
                    <div class="marketing-form-row">
                        <div class="marketing-form-group">
                            <label>Start Date <span class="req">*</span></label>
                            <input type="date" id="mpPeriodStart">
                        </div>
                        <div class="marketing-form-group">
                            <label>End Date <span class="req">*</span></label>
                            <input type="date" id="mpPeriodEnd">
                        </div>
                    </div>
                    <div class="marketing-form-row">
                        <div class="marketing-form-group">
                            <label>Budget (TSh) <span class="req">*</span></label>
                            <input type="number" id="mpBudget" placeholder="0" min="0">
                        </div>
                        <div class="marketing-form-group">
                            <label>Status</label>
                            <select id="mpStatus">
                                <option value="draft">📝 Draft</option>
                                <option value="active">🟢 Active</option>
                                <option value="completed">✅ Completed</option>
                                <option value="cancelled">❌ Cancelled</option>
                            </select>
                        </div>
                    </div>
                    <div class="marketing-form-row">
                        <div class="marketing-form-group full">
                            <label>Channels</label>
                            <div class="marketing-channel-checkboxes" id="mpChannels">
                                ${channelsHtml}
                            </div>
                        </div>
                    </div>
                    <div class="marketing-form-row">
                        <div class="marketing-form-group full">
                            <label>Goals</label>
                            <textarea id="mpGoals" placeholder="What do you want to achieve? e.g., Get 100 new customers"></textarea>
                        </div>
                    </div>
                    <div class="marketing-form-row">
                        <div class="marketing-form-group full">
                            <label>Target Audience</label>
                            <textarea id="mpTargetAudience" placeholder="e.g., Contractors in Dar es Salaam" style="min-height:50px;"></textarea>
                        </div>
                    </div>
                    <div class="marketing-form-row">
                        <div class="marketing-form-group">
                            <label>Target Customers</label>
                            <input type="number" id="mpTargetCustomers" placeholder="0" min="0">
                        </div>
                        <div class="marketing-form-group">
                            <label>Target Leads</label>
                            <input type="number" id="mpTargetLeads" placeholder="0" min="0">
                        </div>
                    </div>
                    <div class="marketing-form-row">
                        <div class="marketing-form-group full">
                            <label>Target Revenue (TSh)</label>
                            <input type="number" id="mpTargetRevenue" placeholder="0" min="0">
                        </div>
                    </div>
                    <div id="marketingModalStatus" class="status-msg"></div>
                </div>
                <div class="marketing-modal-footer">
                    <button class="btn-cancel" onclick="closeModal('marketingModal')">Cancel</button>
                    <button class="btn-save" onclick="saveMarketingPlan()">💾 Save Plan</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// ================================================================
// TOGGLE CHANNEL CHECKBOX
// ================================================================
function toggleChannelCheckbox(label) {
    const checkbox = label.querySelector('input[type="checkbox"]');
    if (checkbox) {
        checkbox.checked = !checkbox.checked;
        label.classList.toggle('checked', checkbox.checked);
    }
}

// ================================================================
// RESET FORM
// ================================================================
function resetMarketingForm() {
    const fields = ['mpTitle', 'mpDescription', 'mpPeriodStart', 'mpPeriodEnd',
                    'mpBudget', 'mpGoals', 'mpTargetAudience',
                    'mpTargetCustomers', 'mpTargetLeads', 'mpTargetRevenue'];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const statusEl = document.getElementById('mpStatus');
    if (statusEl) statusEl.value = 'draft';

    // Reset channel checkboxes
    document.querySelectorAll('#mpChannels .marketing-channel-checkbox').forEach(label => {
        const cb = label.querySelector('input');
        if (cb) cb.checked = false;
        label.classList.remove('checked');
    });

    // Reset status message
    const statusMsg = document.getElementById('marketingModalStatus');
    if (statusMsg) {
        statusMsg.className = 'status-msg';
        statusMsg.textContent = '';
    }
}

// ================================================================
// FILL FORM (for editing)
// ================================================================
function fillMarketingForm(plan) {
    setInputValue('mpTitle', plan.title);
    setInputValue('mpDescription', plan.description);
    setInputValue('mpPeriodStart', plan.periodStart?.split('T')[0]);
    setInputValue('mpPeriodEnd', plan.periodEnd?.split('T')[0]);
    setInputValue('mpBudget', plan.budget);
    setInputValue('mpStatus', plan.status);
    setInputValue('mpGoals', plan.goals);
    setInputValue('mpTargetAudience', plan.targetAudience);
    setInputValue('mpTargetCustomers', plan.targetCustomers);
    setInputValue('mpTargetLeads', plan.targetLeads);
    setInputValue('mpTargetRevenue', plan.targetRevenue);

    // Check channels
    const channels = plan.channels || [];
    document.querySelectorAll('#mpChannels .marketing-channel-checkbox').forEach(label => {
        const cb = label.querySelector('input');
        if (cb) {
            cb.checked = channels.includes(cb.value);
            label.classList.toggle('checked', cb.checked);
        }
    });
}

// ================================================================
// SAVE MARKETING PLAN
// ================================================================
async function saveMarketingPlan() {
    const statusMsg = document.getElementById('marketingModalStatus');
    const status = (msg, type = 'error') => {
        statusMsg.className = 'status-msg ' + type;
        statusMsg.textContent = msg;
    };

    // Collect data
    const title = document.getElementById('mpTitle')?.value.trim();
    const periodStart = document.getElementById('mpPeriodStart')?.value;
    const periodEnd = document.getElementById('mpPeriodEnd')?.value;
    const budget = document.getElementById('mpBudget')?.value;

    // Validate
    if (!title) return status('⚠ Title is required');
    if (!periodStart) return status('⚠ Start date is required');
    if (!periodEnd) return status('⚠ End date is required');
    if (!budget) return status('⚠ Budget is required');
    if (new Date(periodEnd) < new Date(periodStart)) {
        return status('⚠ End date must be after start date');
    }

    // Collect channels
    const channels = [];
    document.querySelectorAll('#mpChannels input[type="checkbox"]:checked').forEach(cb => {
        channels.push(cb.value);
    });

    // Build payload
    const payload = {
        title,
        description: document.getElementById('mpDescription')?.value.trim() || null,
        periodStart,
        periodEnd,
        budget: parseFloat(budget),
        channels,
        goals: document.getElementById('mpGoals')?.value.trim() || null,
        targetAudience: document.getElementById('mpTargetAudience')?.value.trim() || null,
        status: document.getElementById('mpStatus')?.value || 'draft',
        targetCustomers: document.getElementById('mpTargetCustomers')?.value || null,
        targetLeads: document.getElementById('mpTargetLeads')?.value || null,
        targetRevenue: document.getElementById('mpTargetRevenue')?.value || null
    };

    try {
        if (currentEditingPlanId) {
            await API.updateMarketingPlan(currentEditingPlanId, payload);
            showToast('✅ Plan updated!', 'success');
        } else {
            await API.createMarketingPlan(payload);
            showToast('✅ Plan created!', 'success');
        }

        closeModal('marketingModal');
        loadMarketingPlans();

    } catch (err) {
        status('⚠ ' + err.message, 'error');
    }
}

// ================================================================
// VIEW MARKETING PLAN
// ================================================================
async function viewMarketingPlan(planId) {
    try {
        const plan = await API.getMarketingPlan(planId);
        showMarketingViewModal(plan);
    } catch (err) {
        showToast('Failed to load plan: ' + err.message, 'error');
    }
}
async function showMarketingViewModal(plan) {
    // Remove existing
    const existing = document.getElementById('marketingViewModal');
    if (existing) existing.remove();

    const startDate = new Date(plan.periodStart).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric'
    });
    const endDate = new Date(plan.periodEnd).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric'
    });

    const channelsHtml = (plan.channels || []).map(ch =>
        `<span class="marketing-channel-tag">${esc(ch)}</span>`
    ).join('');

    const modalHTML = `
        <div class="modal-overlay" id="marketingViewModal">
            <div class="modal-box marketing-view-modal-box" style="max-width: 780px;">
                <div class="marketing-view-header">
                    <button class="modal-close" onclick="closeModal('marketingViewModal')">✕</button>
                    <h2>${esc(plan.title)}</h2>
                    <div class="meta">
                        <span>📅 ${startDate} → ${endDate}</span>
                        <span>💰 TSh ${Number(plan.budget).toLocaleString()}</span>
                        <span class="marketing-card-status ${plan.status}" style="display:inline-block;">${plan.status}</span>
                    </div>
                </div>
                <div class="marketing-view-body">
                    ${plan.description ? `
                        <div class="marketing-view-section">
                            <div class="marketing-view-section-title">📝 Description</div>
                            <div style="font-size:13.5px;color:#475569;line-height:1.6;">${esc(plan.description)}</div>
                        </div>
                    ` : ''}

                    <div class="marketing-view-section">
                        <div class="marketing-view-section-title">📊 Progress (Hybrid)</div>
                        
                        <!-- KPI Progress -->
                        <div style="margin-bottom:16px;">
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                                <div>
                                    <div style="font-size:12px;font-weight:900;color:var(--primary);text-transform:uppercase;letter-spacing:1px;">🎯 KPI Progress</div>
                                    <div style="font-size:11px;color:var(--gray-500);">How much the goals are being achieved</div>
                                </div>
                                <span style="font-size:22px;font-weight:900;color:var(--primary);font-family:'Courier New',monospace;" id="kpiProgressPct">${plan.progress}%</span>
                            </div>
                            <div class="marketing-progress-bar" style="height:14px;">
                                <div class="marketing-progress-fill" id="kpiProgressFill" style="width:${plan.progress}%;"></div>
                            </div>
                            
                            <!-- KPI Breakdown -->
                            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px;">
                                <div style="background:var(--gray-50);padding:10px;border-radius:8px;border-left:3px solid #22c55e;">
                                    <div style="font-size:9.5px;font-weight:900;color:var(--gray-500);text-transform:uppercase;">💰 Revenue</div>
                                    <div style="font-size:13px;font-weight:800;color:var(--gray-800);margin-top:2px;">TSh ${formatMoneyCompact(plan.actualRevenue)}</div>
                                    <div style="font-size:10px;color:var(--gray-500);">of TSh ${formatMoneyCompact(plan.targetRevenue)}</div>
                                    <div style="font-size:11px;font-weight:800;color:#22c55e;margin-top:4px;">${plan.targetRevenue > 0 ? Math.round((plan.actualRevenue / plan.targetRevenue) * 100) : 0}%</div>
                                </div>
                                <div style="background:var(--gray-50);padding:10px;border-radius:8px;border-left:3px solid #8b5cf6;">
                                    <div style="font-size:9.5px;font-weight:900;color:var(--gray-500);text-transform:uppercase;">👥 Customers</div>
                                    <div style="font-size:13px;font-weight:800;color:var(--gray-800);margin-top:2px;">${plan.actualCustomers || 0}</div>
                                    <div style="font-size:10px;color:var(--gray-500);">of ${plan.targetCustomers || 0}</div>
                                    <div style="font-size:11px;font-weight:800;color:#8b5cf6;margin-top:4px;">${plan.targetCustomers > 0 ? Math.round((plan.actualCustomers / plan.targetCustomers) * 100) : 0}%</div>
                                </div>
                                <div style="background:var(--gray-50);padding:10px;border-radius:8px;border-left:3px solid #f59e0b;">
                                    <div style="font-size:9.5px;font-weight:900;color:var(--gray-500);text-transform:uppercase;">🎯 Leads</div>
                                    <div style="font-size:13px;font-weight:800;color:var(--gray-800);margin-top:2px;">${plan.actualLeads || 0}</div>
                                    <div style="font-size:10px;color:var(--gray-500);">of ${plan.targetLeads || 0}</div>
                                    <div style="font-size:11px;font-weight:800;color:#f59e0b;margin-top:4px;">${plan.targetLeads > 0 ? Math.round((plan.actualLeads / plan.targetLeads) * 100) : 0}%</div>
                                </div>
                            </div>
                            
                            <button onclick="openUpdateProgressModal(${plan.id}, ${plan.actualRevenue}, ${plan.actualCustomers}, ${plan.actualLeads})" style="margin-top:10px;padding:8px 16px;background:linear-gradient(135deg,#14b8a6,#0f766e);color:white;border:none;border-radius:8px;font-weight:700;font-size:12px;cursor:pointer;font-family:inherit;width:100%;">
                                📊 Update Actuals (Revenue / Customers / Leads)
                            </button>
                        </div>
                        
                        <!-- Activity Progress -->
                        <div>
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                                <div>
                                    <div style="font-size:12px;font-weight:900;color:var(--gold);text-transform:uppercase;letter-spacing:1px;">📌 Activity Progress</div>
                                    <div style="font-size:11px;color:var(--gray-500);">How much work is being done</div>
                                </div>
                                <span style="font-size:22px;font-weight:900;color:var(--gold);font-family:'Courier New',monospace;" id="activityProgressPct">${plan.activityProgress || 0}%</span>
                            </div>
                            <div class="marketing-progress-bar" style="height:14px;">
                                <div style="height:100%;background:linear-gradient(90deg,var(--gold),var(--gold-light));border-radius:4px;transition:width 0.6s cubic-bezier(0.16,1,0.3,1);" id="activityProgressFill" style="width:${plan.activityProgress || 0}%;"></div>
                            </div>
                            <div style="font-size:11px;color:var(--gray-500);margin-top:6px;text-align:center;">
                                <span id="activityCountText">${plan.activitiesDone || 0} activities done</span>
                            </div>
                        </div>
                    </div>

                    <div class="marketing-view-section">
                        <div class="marketing-view-section-title">📢 Channels</div>
                        <div class="marketing-channels">
                            ${channelsHtml || '<span style="color:#94a3b8;font-size:12px;">No channels selected</span>'}
                        </div>
                    </div>

                    ${plan.goals || plan.targetAudience ? `
                        <div class="marketing-view-section">
                            <div class="marketing-view-section-title">🎯 Goals & Audience</div>
                            <div class="marketing-view-grid">
                                ${plan.goals ? `
                                    <div class="marketing-view-item full">
                                        <div class="label">Goals</div>
                                        <div class="value">${esc(plan.goals)}</div>
                                    </div>
                                ` : ''}
                                ${plan.targetAudience ? `
                                    <div class="marketing-view-item full">
                                        <div class="label">Target Audience</div>
                                        <div class="value">${esc(plan.targetAudience)}</div>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    ` : ''}

                    ${(plan.targetCustomers || plan.targetLeads || plan.targetRevenue) ? `
                        <div class="marketing-view-section">
                            <div class="marketing-view-section-title">🎯 KPI Targets</div>
                            <div class="marketing-kpi-grid">
                                ${plan.targetCustomers ? `
                                    <div class="marketing-kpi-mini">
                                        <div class="label">Customers</div>
                                        <div class="target">${plan.targetCustomers}</div>
                                        <div class="actual">${plan.actualCustomers || 0}</div>
                                    </div>
                                ` : ''}
                                ${plan.targetLeads ? `
                                    <div class="marketing-kpi-mini">
                                        <div class="label">Leads</div>
                                        <div class="target">${plan.targetLeads}</div>
                                        <div class="actual">${plan.actualLeads || 0}</div>
                                    </div>
                                ` : ''}
                                ${plan.targetRevenue ? `
                                    <div class="marketing-kpi-mini">
                                        <div class="label">Revenue</div>
                                        <div class="target">TSh ${Number(plan.targetRevenue).toLocaleString()}</div>
                                        <div class="actual">TSh ${Number(plan.actualRevenue || 0).toLocaleString()}</div>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    ` : ''}

                    <!-- ============================================ -->
                    <!-- ACTIVITIES SECTION (NEW) -->
                    <!-- ============================================ -->
                    <div class="marketing-view-section">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid var(--gray-100);">
                            <div class="marketing-view-section-title" style="margin:0;padding:0;border:none;">📌 Activities / Tasks</div>
                            <button onclick="openAddActivityModal(${plan.id})" style="padding:6px 14px;background:linear-gradient(135deg,#14b8a6,#0f766e);color:white;border:none;border-radius:6px;font-weight:700;font-size:12px;cursor:pointer;font-family:inherit;">
                                ➕ Add Activity
                            </button>
                        </div>
                        <div id="activitiesListContainer" style="min-height:60px;">
                            <div style="text-align:center;padding:30px;color:var(--gray-400);">
                                ⏳ Loading activities...
                            </div>
                        </div>
                    </div>
                    <!-- ============================================ -->
                    <!-- LINKED ORDERS SECTION (NEW) -->
                    <!-- ============================================ -->
                    <div class="marketing-view-section">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid var(--gray-100);">
                            <div class="marketing-view-section-title" style="margin:0;padding:0;border:none;">📦 Linked Orders / Revenue</div>
                            <span style="font-size:11px;color:var(--gray-500);font-style:italic;">Auto-hesabiwa kutoka Orders</span>
                        </div>
                        <div id="linkedOrdersContainer" style="min-height:60px;">
                            <div style="text-align:center;padding:30px;color:var(--gray-400);">
                                ⏳ Loading linked orders...
                            </div>
                        </div>
                    </div>

                    <div class="marketing-view-section">
                        <div class="marketing-view-section-title">ℹ️ Meta</div>
                        <div class="marketing-view-grid">
                            <div class="marketing-view-item">
                                <div class="label">Status</div>
                                <div class="value" style="text-transform:uppercase;">${plan.status}</div>
                            </div>
                            <div class="marketing-view-item">
                                <div class="label">Created By</div>
                                <div class="value">${esc(plan.creator?.fullName || '—')}</div>
                            </div>
                            <div class="marketing-view-item full">
                                <div class="label">Created At</div>
                                <div class="value">${new Date(plan.createdAt).toLocaleString()}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.getElementById('marketingViewModal').classList.add('show');

    // Load activities
    await loadActivities(plan.id);
    await loadLinkedOrders(plan.id);
}
// ================================================================
// DELETE MARKETING PLAN
// ================================================================
async function deleteMarketingPlan(planId, title) {
    if (!confirm(`Delete marketing plan "${title}"?\n\nThis action cannot be undone.`)) return;

    try {
        await API.deleteMarketingPlan(planId);
        showToast('✅ Plan deleted', 'success');
        loadMarketingPlans();
    } catch (err) {
        showToast('Failed: ' + err.message, 'error');
    }
}
// ================================================================
// ACTIVITIES — LOAD
// ================================================================
async function loadActivities(planId) {
    const container = document.getElementById('activitiesListContainer');
    if (!container) return;

    container.innerHTML = '<div style="text-align:center;padding:30px;color:var(--gray-400);">⏳ Loading activities...</div>';

    try {
        const response = await API.getMarketingActivities(planId);
        const activities = response.activities || [];

        if (activities.length === 0) {
            container.innerHTML = `
                <div style="text-align:center;padding:40px 20px;background:var(--gray-50);border-radius:12px;border:2px dashed var(--gray-200);">
                    <div style="font-size:40px;margin-bottom:8px;opacity:0.5;">📌</div>
                    <div style="font-weight:700;color:var(--gray-600);margin-bottom:4px;">No Activities Yet</div>
                    <div style="font-size:12px;color:var(--gray-500);">Click "Add Activity" to start planning tasks.</div>
                </div>
            `;
            return;
        }

        container.innerHTML = activities.map(a => renderActivityCard(planId, a)).join('');

    } catch (err) {
        console.error('❌ Load activities error:', err);
        container.innerHTML = `
            <div style="text-align:center;padding:30px;color:#dc2626;font-size:13px;">
                ❌ Failed to load activities: ${esc(err.message)}
            </div>
        `;
    }
}
// ================================================================
// LOAD LINKED ORDERS
// ================================================================
async function loadLinkedOrders(planId) {
    const container = document.getElementById('linkedOrdersContainer');
    if (!container) return;

    container.innerHTML = '<div style="text-align:center;padding:30px;color:var(--gray-400);">⏳ Loading linked orders...</div>';

    try {
        const response = await API.getLinkedOrders(planId);
        const orders = response.orders || [];
        const totalRevenue = response.totalRevenue || 0;
        const uniqueCustomers = response.uniqueCustomers || 0;

        if (orders.length === 0) {
            container.innerHTML = `
                <div style="text-align:center;padding:40px 20px;background:var(--gray-50);border-radius:12px;border:2px dashed var(--gray-200);">
                    <div style="font-size:40px;margin-bottom:8px;opacity:0.5;">📦</div>
                    <div style="font-weight:700;color:var(--gray-600);margin-bottom:4px;">No Orders Linked Yet</div>
                    <div style="font-size:12px;color:var(--gray-500);">Orders tagged kwa plan hii zitaonekana hapa.</div>
                </div>
            `;
            return;
        }

        // Summary
        let html = `
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px;">
                <div style="background:linear-gradient(135deg,#3d5a3d,#2a3d2a);padding:12px;border-radius:10px;color:white;">
                    <div style="font-size:10px;font-weight:800;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:1px;">📦 Orders</div>
                    <div style="font-size:20px;font-weight:900;color:var(--gold);margin-top:2px;">${orders.length}</div>
                </div>
                <div style="background:linear-gradient(135deg,#3d5a3d,#2a3d2a);padding:12px;border-radius:10px;color:white;">
                    <div style="font-size:10px;font-weight:800;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:1px;">💰 Revenue</div>
                    <div style="font-size:14px;font-weight:900;color:var(--gold);margin-top:2px;">TSh ${formatMoneyCompact(totalRevenue)}</div>
                </div>
                <div style="background:linear-gradient(135deg,#3d5a3d,#2a3d2a);padding:12px;border-radius:10px;color:white;">
                    <div style="font-size:10px;font-weight:800;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:1px;">👥 Customers</div>
                    <div style="font-size:20px;font-weight:900;color:var(--gold);margin-top:2px;">${uniqueCustomers}</div>
                </div>
            </div>
        `;

        // Orders list
        html += orders.map(order => {
            const statusColors = {
                'pending': '#f59e0b',
                'ready-for-finance': '#14b8a6',
                'awaiting-payment': '#f59e0b',
                'postpaid-approved': '#4f46e5',
                'paid': '#22c55e',
                'delivered': '#22c55e',
                'completed': '#16a34a',
                'rejected': '#ef4444'
            };
            const statusColor = statusColors[order.status] || '#64748b';

            return `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px;background:var(--gray-50);border-radius:10px;margin-bottom:8px;border-left:3px solid ${statusColor};">
                    <div style="flex:1;">
                        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                            <strong style="font-family:monospace;color:var(--primary);font-size:13px;">${esc(order.orderId)}</strong>
                            <span style="padding:2px 8px;border-radius:10px;font-size:9.5px;font-weight:900;text-transform:uppercase;background:${statusColor}20;color:${statusColor};">${order.status}</span>
                        </div>
                        <div style="font-size:12px;color:var(--gray-600);">
                            👤 ${esc(order.customerName || '—')} · 📞 ${esc(order.phone || '—')}
                        </div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-size:15px;font-weight:900;color:var(--primary);font-family:'Courier New',monospace;">TSh ${Number(order.totalAmount).toLocaleString()}</div>
                        <div style="font-size:10px;color:var(--gray-500);">${new Date(order.createdAt).toLocaleDateString()}</div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;

    } catch (err) {
        console.error('❌ Load linked orders error:', err);
        container.innerHTML = `
            <div style="text-align:center;padding:30px;color:#dc2626;font-size:13px;">
                ❌ Failed to load orders: ${esc(err.message)}
            </div>
        `;
    }
}

// ================================================================
// ACTIVITIES — RENDER CARD
// ================================================================
function renderActivityCard(planId, activity) {
    const statusConfig = {
        'pending': { icon: '⏳', label: 'Pending', bg: 'rgba(148,163,184,0.15)', color: '#64748b' },
        'in-progress': { icon: '🔄', label: 'In Progress', bg: 'rgba(59,130,246,0.15)', color: '#2563eb' },
        'done': { icon: '✅', label: 'Done', bg: 'rgba(34,197,94,0.15)', color: '#16a34a' },
        'cancelled': { icon: '❌', label: 'Cancelled', bg: 'rgba(239,68,68,0.15)', color: '#dc2626' }
    };
    const priorityConfig = {
        'low': { icon: '🟢', label: 'Low' },
        'medium': { icon: '🟡', label: 'Medium' },
        'high': { icon: '🔴', label: 'High' }
    };

    const sc = statusConfig[activity.status] || statusConfig['pending'];
    const pc = priorityConfig[activity.priority] || priorityConfig['medium'];

    const dueDate = activity.dueDate
        ? new Date(activity.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        : '—';

    const isDone = activity.status === 'done' || activity.status === 'cancelled';
    const assignedName = activity.assignee?.fullName || 'Unassigned';

    // Actions
    let actions = '';

    if (activity.status === 'pending') {
        actions += `<button onclick="changeActivityStatus(${planId}, ${activity.id}, 'in-progress')" style="padding:6px 12px;background:rgba(59,130,246,0.1);color:#2563eb;border:none;border-radius:6px;font-weight:700;font-size:11px;cursor:pointer;font-family:inherit;">▶️ Start</button>`;
    }
    if (activity.status === 'in-progress') {
        actions += `<button onclick="changeActivityStatus(${planId}, ${activity.id}, 'done')" style="padding:6px 12px;background:rgba(34,197,94,0.1);color:#16a34a;border:none;border-radius:6px;font-weight:700;font-size:11px;cursor:pointer;font-family:inherit;">✅ Done</button>`;
    }
    if (!isDone) {
        actions += `<button onclick="openEditActivityModal(${planId}, ${activity.id})" style="padding:6px 10px;background:rgba(245,158,11,0.1);color:#d97706;border:none;border-radius:6px;font-weight:700;font-size:11px;cursor:pointer;font-family:inherit;">🖋️</button>`;
        actions += `<button onclick="deleteActivity(${planId}, ${activity.id}, '${esc(activity.title)}')" style="padding:6px 10px;background:rgba(239,68,68,0.1);color:#dc2626;border:none;border-radius:6px;font-weight:700;font-size:11px;cursor:pointer;font-family:inherit;">🗑</button>`;
    }
    if (activity.status === 'pending' || activity.status === 'in-progress') {
        actions += `<button onclick="changeActivityStatus(${planId}, ${activity.id}, 'cancelled')" style="padding:6px 10px;background:rgba(148,163,184,0.1);color:#64748b;border:none;border-radius:6px;font-weight:700;font-size:11px;cursor:pointer;font-family:inherit;" title="Cancel">⊘</button>`;
    }

    return `
        <div class="activity-card" style="background:white;border:1px solid var(--gray-200);border-radius:12px;padding:14px 16px;margin-bottom:10px;transition:all 0.2s;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:8px;">
                <div style="flex:1;">
                    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px;">
                        <span style="font-size:14px;">${sc.icon}</span>
                        <span style="font-weight:800;color:var(--gray-800);font-size:14px;">${esc(activity.title)}</span>
                        <span style="padding:2px 8px;border-radius:10px;font-size:9.5px;font-weight:900;text-transform:uppercase;background:${sc.bg};color:${sc.color};">${sc.label}</span>
                        <span style="font-size:11px;">${pc.icon}</span>
                    </div>
                    ${activity.description ? `<div style="font-size:12px;color:var(--gray-600);line-height:1.5;margin-bottom:6px;">${esc(activity.description)}</div>` : ''}
                    <div style="display:flex;gap:14px;flex-wrap:wrap;font-size:11.5px;color:var(--gray-500);">
                        <span>📅 Due: <strong style="color:var(--gray-700);">${dueDate}</strong></span>
                        <span>👤 Assigned: <strong style="color:var(--gray-700);">${esc(assignedName)}</strong></span>
                        ${activity.completedAt ? `<span>✅ Done: <strong style="color:#16a34a;">${new Date(activity.completedAt).toLocaleDateString()}</strong></span>` : ''}
                    </div>
                    ${activity.notes ? `<div style="font-size:11.5px;color:var(--gray-600);margin-top:6px;padding:8px 10px;background:var(--gray-50);border-radius:6px;border-left:3px solid var(--gold);"><strong>Notes:</strong> ${esc(activity.notes)}</div>` : ''}
                </div>
            </div>
            <div style="display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap;padding-top:8px;border-top:1px solid var(--gray-100);">
                ${actions || '<span style="font-size:11px;color:var(--gray-400);font-style:italic;">No actions available</span>'}
            </div>
        </div>
    `;
}

// ================================================================
// ACTIVITIES — CHANGE STATUS
// ================================================================
async function changeActivityStatus(planId, activityId, newStatus) {
    try {
        const result = await API.updateMarketingActivityStatus(planId, activityId, newStatus);
        showToast('✅ Status updated!', 'success');

        // 1. Reload activities in the modal
        await loadActivities(planId);

        // 2. Reload plan — update progress bar in the modal
        const planResponse = await API.getMarketingPlan(planId);
        const progressPct = document.querySelector('#marketingViewModal .marketing-progress-pct');
        const progressFill = document.querySelector('#marketingViewModal .marketing-progress-fill');
        if (progressPct) progressPct.textContent = `${planResponse.progress}%`;
        if (progressFill) progressFill.style.width = `${planResponse.progress}%`;

        // 3. UPDATE CARD IN THE GRID
        updatePlanCardProgress(planId, planResponse.progress);

    } catch (err) {
        console.error('❌ Change status error:', err);
        showToast('Failed: ' + err.message, 'error');
    }
}

// ================================================================
// UPDATE PLAN CARD PROGRESS
// ================================================================
function updatePlanCardProgress(planId, progress) {
    // Find card in the grid
    const cards = document.querySelectorAll('.marketing-card');
    cards.forEach(card => {
        const viewBtn = card.querySelector('.marketing-card-btn.view');
        if (!viewBtn) return;
        
        // Extract planId from onclick="viewMarketingPlan(ID)"
        const onclickAttr = viewBtn.getAttribute('onclick') || '';
        const match = onclickAttr.match(/viewMarketingPlan\((\d+)\)/);
        if (!match) return;
        
        if (parseInt(match[1]) === planId) {
            // Update progress text and bar in the card
            const pctEl = card.querySelector('.marketing-progress-pct');
            const fillEl = card.querySelector('.marketing-progress-fill');
            if (pctEl) pctEl.textContent = `${progress}%`;
            if (fillEl) fillEl.style.width = `${progress}%`;
        }
    });
}

// ================================================================
// ACTIVITIES — DELETE
// ================================================================
async function deleteActivity(planId, activityId, title) {
    if (!confirm(`Delete activity "${title}"?\n\nThis action cannot be undone.`)) return;

    try {
        await API.deleteMarketingActivity(planId, activityId);
        showToast('✅ Activity deleted', 'success');

        // Reload activities
        await loadActivities(planId);

        // Update plan progress in the card
        const planResponse = await API.getMarketingPlan(planId);
        updatePlanCardProgress(planId, planResponse.progress);

        // Update modal progress
        const progressPct = document.querySelector('#marketingViewModal .marketing-progress-pct');
        const progressFill = document.querySelector('#marketingViewModal .marketing-progress-fill');
        if (progressPct) progressPct.textContent = `${planResponse.progress}%`;
        if (progressFill) progressFill.style.width = `${planResponse.progress}%`;

    } catch (err) {
        console.error('❌ Delete activity error:', err);
        showToast('Failed: ' + err.message, 'error');
    }
}

// ================================================================
// ACTIVITIES — OPEN ADD MODAL
// ================================================================
function openAddActivityModal(planId) {
    openActivityFormModal(planId, null);
}

// ================================================================
// ACTIVITIES — OPEN EDIT MODAL
// ================================================================
async function openEditActivityModal(planId, activityId) {
    try {
        const response = await API.getMarketingActivities(planId);
        const activity = response.activities.find(a => a.id === activityId);
        if (!activity) {
            showToast('Activity not found', 'error');
            return;
        }
        openActivityFormModal(planId, activity);
    } catch (err) {
        showToast('Failed to load: ' + err.message, 'error');
    }
}
// ================================================================
// ACTIVITIES — FORM MODAL (Add/Edit)
// ================================================================
function openActivityFormModal(planId, activity) {
    const isEdit = !!activity;
    const existing = document.getElementById('activityFormModal');
    if (existing) existing.remove();

    const priorities = [
        { value: 'low', label: '🟢 Low' },
        { value: 'medium', label: '🟡 Medium' },
        { value: 'high', label: '🔴 High' }
    ];

    const users = window._cachedUsers || [];

    const modalHTML = `
        <div class="modal-overlay" id="activityFormModal" style="z-index: 2000;">
            <div class="modal-box" style="max-width: 560px; padding: 0; overflow: hidden; max-height: 92vh; display: flex; flex-direction: column;">
                <div style="background:linear-gradient(135deg,#3d5a3d,#2a3d2a);padding:20px 26px;color:white;display:flex;justify-content:space-between;align-items:center;">
                    <h3 style="font-size:17px;font-weight:800;color:white;margin:0;">
                        ${isEdit ? '🖋️ Edit Activity' : '➕ Add Activity'}
                    </h3>
                    <button onclick="closeModal('activityFormModal')" style="background:rgba(255,255,255,0.15);border:none;color:white;width:34px;height:34px;border-radius:50%;font-size:18px;cursor:pointer;">✕</button>
                </div>
                <div style="padding:22px 26px;overflow-y:auto;flex:1;">
                    <div style="margin-bottom:14px;">
                        <label style="font-size:11px;font-weight:800;color:#334155;text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:6px;">Title <span style="color:#dc2626;">*</span></label>
                        <input type="text" id="actTitle" value="${isEdit ? esc(activity.title) : ''}" placeholder="e.g., Design Facebook ads" style="width:100%;padding:10px 14px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13.5px;font-family:inherit;background:#f8fafc;">
                    </div>

                    <div style="margin-bottom:14px;">
                        <label style="font-size:11px;font-weight:800;color:#334155;text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:6px;">Description</label>
                        <textarea id="actDescription" placeholder="What needs to be done?" style="width:100%;padding:10px 14px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13.5px;font-family:inherit;background:#f8fafc;min-height:70px;resize:vertical;">${isEdit ? esc(activity.description || '') : ''}</textarea>
                    </div>

                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;">
                        <div>
                            <label style="font-size:11px;font-weight:800;color:#334155;text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:6px;">Due Date</label>
                            <input type="date" id="actDueDate" value="${isEdit && activity.dueDate ? activity.dueDate.split('T')[0] : ''}" style="width:100%;padding:10px 14px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13.5px;font-family:inherit;background:#f8fafc;">
                        </div>
                        <div>
                            <label style="font-size:11px;font-weight:800;color:#334155;text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:6px;">Priority</label>
                            <select id="actPriority" style="width:100%;padding:10px 14px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13.5px;font-family:inherit;background:#f8fafc;">
                                ${priorities.map(p => `<option value="${p.value}" ${isEdit && activity.priority === p.value ? 'selected' : (!isEdit && p.value === 'medium' ? 'selected' : '')}>${p.label}</option>`).join('')}
                            </select>
                        </div>
                    </div>

                    <div style="margin-bottom:14px;">
                        <label style="font-size:11px;font-weight:800;color:#334155;text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:6px;">Assigned To</label>
                        <select id="actAssignedTo" style="width:100%;padding:10px 14px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13.5px;font-family:inherit;background:#f8fafc;">
                            <option value="">— Unassigned —</option>
                            ${users.map(u => `<option value="${u.id}" ${isEdit && activity.assignedTo === u.id ? 'selected' : ''}>${esc(u.fullName)} (${u.role})</option>`).join('')}
                        </select>
                    </div>

                    <div style="margin-bottom:14px;">
                        <label style="font-size:11px;font-weight:800;color:#334155;text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:6px;">Notes (Optional)</label>
                        <textarea id="actNotes" placeholder="Additional notes..." style="width:100%;padding:10px 14px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13.5px;font-family:inherit;background:#f8fafc;min-height:60px;resize:vertical;">${isEdit ? esc(activity.notes || '') : ''}</textarea>
                    </div>

                    <div id="activityFormStatus" class="status-msg"></div>
                </div>
                <div style="padding:14px 26px;background:#f8fafc;border-top:1px solid #e5e7eb;display:flex;gap:12px;justify-content:flex-end;">
                    <button onclick="closeModal('activityFormModal')" style="padding:11px 24px;background:#e5e7eb;color:#475569;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-family:inherit;font-size:13px;">Cancel</button>
                    <button onclick="saveActivity(${planId}, ${isEdit ? activity.id : 'null'})" style="padding:11px 24px;background:linear-gradient(135deg,#3d5a3d,#2a3d2a);color:white;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-family:inherit;font-size:13px;">
                        ${isEdit ? '💾 Save Changes' : '➕ Add Activity'}
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.getElementById('activityFormModal').classList.add('show');
}
// ================================================================
// ACTIVITIES — SAVE
// ================================================================
async function saveActivity(planId, activityId) {
    const statusDiv = document.getElementById('activityFormStatus');
    const status = (msg, type = 'error') => {
        statusDiv.className = 'status-msg ' + type;
        statusDiv.textContent = msg;
    };

    const title = document.getElementById('actTitle')?.value.trim();
    if (!title) return status('⚠ Title is required');

    const payload = {
        title,
        description: document.getElementById('actDescription')?.value.trim() || null,
        dueDate: document.getElementById('actDueDate')?.value || null,
        priority: document.getElementById('actPriority')?.value || 'medium',
        notes: document.getElementById('actNotes')?.value.trim() || null
    };

       try {
        if (activityId) {
            await API.updateMarketingActivity(planId, activityId, payload);
            showToast('✅ Activity updated!', 'success');
        } else {
            await API.createMarketingActivity(planId, payload);
            showToast('✅ Activity added!', 'success');
        }

        closeModal('activityFormModal');

        // Reload activities
        await loadActivities(planId);

        // Update plan progress in the card
        const planResponse = await API.getMarketingPlan(planId);
        updatePlanCardProgress(planId, planResponse.progress);

        // Update modal progress bar as well
        const progressPct = document.querySelector('#marketingViewModal .marketing-progress-pct');
        const progressFill = document.querySelector('#marketingViewModal .marketing-progress-fill');
        if (progressPct) progressPct.textContent = `${planResponse.progress}%`;
        if (progressFill) progressFill.style.width = `${planResponse.progress}%`;

    } catch (err) {
        console.error('❌ Save activity error:', err);
        status('⚠ ' + err.message, 'error');
        }   
}
function formatMoneyCompact(num) {
    const n = Number(num) || 0;
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(0) + 'K';
    return n.toLocaleString();
}
// ================================================================
// UPDATE PROGRESS MODAL (KPI Actuals)
// ================================================================
function openUpdateProgressModal(planId, actualRevenue, actualCustomers, actualLeads) {
    const existing = document.getElementById('updateProgressModal');
    if (existing) existing.remove();

    const modalHTML = `
        <div class="modal-overlay" id="updateProgressModal" style="z-index: 2500;">
            <div class="modal-box" style="max-width: 520px; padding: 0; overflow: hidden;">
                <div style="background:linear-gradient(135deg,#14b8a6,#0f766e);padding:20px 26px;color:white;display:flex;justify-content:space-between;align-items:center;">
                    <div>
                        <h3 style="font-size:17px;font-weight:800;color:white;margin:0 0 2px 0;">📊 Update Progress</h3>
                        <p style="font-size:12px;color:rgba(255,255,255,0.85);margin:0;">Enter actual values from the campaign</p>
                    </div>
                    <button onclick="closeModal('updateProgressModal')" style="background:rgba(255,255,255,0.15);border:none;color:white;width:34px;height:34px;border-radius:50%;font-size:18px;cursor:pointer;">✕</button>
                </div>
                <div style="padding:22px 26px;">
                    <div style="background:rgba(20,184,166,0.06);border-left:4px solid #14b8a6;padding:12px 16px;border-radius:8px;margin-bottom:18px;font-size:12px;color:#0f766e;line-height:1.5;">
                        💡 <strong>Tip:</strong> Enter the total revenue, customers, and leads obtained so far. Progress will be calculated automatically.
                    </div>

                    <div style="margin-bottom:16px;">
                        <label style="font-size:11px;font-weight:800;color:#334155;text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:6px;">💰 Actual Revenue (TSh)</label>
                        <input type="number" id="updActualRevenue" value="${actualRevenue || 0}" min="0" style="width:100%;padding:10px 14px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:14px;font-family:inherit;background:#f8fafc;">
                    </div>

                    <div style="margin-bottom:16px;">
                        <label style="font-size:11px;font-weight:800;color:#334155;text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:6px;">👥 Actual Customers</label>
                        <input type="number" id="updActualCustomers" value="${actualCustomers || 0}" min="0" style="width:100%;padding:10px 14px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:14px;font-family:inherit;background:#f8fafc;">
                    </div>

                    <div style="margin-bottom:16px;">
                        <label style="font-size:11px;font-weight:800;color:#334155;text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:6px;">🎯 Actual Leads</label>
                        <input type="number" id="updActualLeads" value="${actualLeads || 0}" min="0" style="width:100%;padding:10px 14px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:14px;font-family:inherit;background:#f8fafc;">
                    </div>

                    <div id="updateProgressStatus" class="status-msg"></div>
                </div>
                <div style="padding:14px 26px;background:#f8fafc;border-top:1px solid #e5e7eb;display:flex;gap:12px;justify-content:flex-end;">
                    <button onclick="closeModal('updateProgressModal')" style="padding:11px 24px;background:#e5e7eb;color:#475569;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-family:inherit;font-size:13px;">Cancel</button>
                    <button onclick="saveUpdatedProgress(${planId})" style="padding:11px 24px;background:linear-gradient(135deg,#14b8a6,#0f766e);color:white;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-family:inherit;font-size:13px;">💾 Save Progress</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.getElementById('updateProgressModal').classList.add('show');
}

// ================================================================
// SAVE UPDATED PROGRESS
// ================================================================
async function saveUpdatedProgress(planId) {
    const statusDiv = document.getElementById('updateProgressStatus');
    const status = (msg, type = 'error') => {
        statusDiv.className = 'status-msg ' + type;
        statusDiv.textContent = msg;
    };

    const actualRevenue = parseFloat(document.getElementById('updActualRevenue')?.value) || 0;
    const actualCustomers = parseInt(document.getElementById('updActualCustomers')?.value) || 0;
    const actualLeads = parseInt(document.getElementById('updActualLeads')?.value) || 0;

    try {
        const result = await API.updateMarketingProgress(planId, {
            actualRevenue,
            actualCustomers,
            actualLeads
        });

        showToast('✅ Progress updated! ' + result.progress + '%', 'success');

        closeModal('updateProgressModal');

        // Refresh plan in the modal
        const planResponse = await API.getMarketingPlan(planId);
        
        // Update KPI progress in the modal
        const kpiPct = document.getElementById('kpiProgressPct');
        const kpiFill = document.getElementById('kpiProgressFill');
        if (kpiPct) kpiPct.textContent = `${planResponse.progress}%`;
        if (kpiFill) kpiFill.style.width = `${planResponse.progress}%`;

        // Refresh marketing plans list
        loadMarketingPlans();

    } catch (err) {
        console.error('❌ Save progress error:', err);
        status('⚠ ' + err.message, 'error');
    }
}
// ================================================================
// HELPERS
// ================================================================
function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function setInputValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value ?? '';
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