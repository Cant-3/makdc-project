
let currentUser = null;
let currentDeptUser = null;
let currentProfilePic = null;
let itemCounter = 0;
let allOrders = [];
let currentProducts = [];
// ===== PROCUREMENT STATE =====
let deptRequestItemCounter = 0;
let pendingDeptRequestData = null;
let currentMsgReqId = null;
let currentFollowUpReqId = null;
window.deptRequestAttachments = [];

// ===== TANZANIA REGIONS =====
const TANZANIA_REGIONS = {
    'Arusha': ['Arusha City', 'Arusha District', 'Karatu', 'Longido', 'Meru', 'Monduli', 'Ngorongoro'],
    'Dar es Salaam': ['Ilala', 'Kinondoni', 'Temeke', 'Ubungo', 'Kigamboni'],
    'Dodoma': ['Bahi', 'Chamwino', 'Chemba', 'Dodoma City', 'Kondoa', 'Kongwa', 'Mpwapwa'],
    'Geita': ['Bukombe', 'Chato', 'Geita', 'Mbogwe', 'Nyang\'hwale'],
    'Iringa': ['Iringa District', 'Iringa Municipal', 'Kilolo', 'Mafinga Town', 'Mufindi'],
    'Kagera': ['Biharamulo', 'Bukoba District', 'Bukoba Municipal', 'Karagwe', 'Kyerwa', 'Missenyi', 'Muleba', 'Ngara'],
    'Katavi': ['Mlele', 'Mpanda District', 'Mpanda Municipal', 'Tanganyika'],
    'Kigoma': ['Buhigwe', 'Kakonko', 'Kasulu District', 'Kasulu Town', 'Kibondo', 'Kigoma District', 'Kigoma-Ujiji', 'Uvinza'],
    'Kilimanjaro': ['Hai', 'Moshi District', 'Moshi Municipal', 'Mwanga', 'Rombo', 'Same', 'Siha'],
    'Lindi': ['Kilwa', 'Lindi District', 'Lindi Municipal', 'Liwale', 'Nachingwea', 'Ruangwa'],
    'Manyara': ['Babati District', 'Babati Town', 'Hanang', 'Kiteto', 'Mbulu', 'Simanjiro'],
    'Mara': ['Bunda', 'Butiama', 'Musoma District', 'Musoma Municipal', 'Rorya', 'Serengeti', 'Tarime'],
    'Mbeya': ['Busokelo', 'Chunya', 'Kyela', 'Mbarali', 'Mbeya City', 'Mbeya District', 'Mbozi', 'Rungwe'],
    'Morogoro': ['Gairo', 'Kilombero', 'Kilosa', 'Morogoro District', 'Morogoro Municipal', 'Mvomero', 'Ulanga', 'Malinyi', 'Ifakara'],
    'Mtwara': ['Masasi District', 'Masasi Town', 'Mtwara District', 'Mtwara Municipal', 'Nanyumbu', 'Newala', 'Tandahimba'],
    'Mwanza': ['Buchosa', 'Ilemela', 'Kwimba', 'Magu', 'Misungwi', 'Nyamagana', 'Sengerema', 'Ukerewe'],
    'Njombe': ['Ludewa', 'Makambako Town', 'Makete', 'Njombe District', 'Njombe Town', 'Wanging\'ombe'],
    'Pwani': ['Bagamoyo', 'Kibaha District', 'Kibaha Town', 'Kisarawe', 'Mafia', 'Mkuranga', 'Rufiji'],
    'Rukwa': ['Kalambo', 'Nkasi', 'Sumbawanga District', 'Sumbawanga Municipal'],
    'Ruvuma': ['Mbinga', 'Namtumbo', 'Nyasa', 'Songea District', 'Songea Municipal', 'Tunduru'],
    'Shinyanga': ['Kahama District', 'Kahama Town', 'Kishapu', 'Shinyanga District', 'Shinyanga Municipal', 'Ushetu'],
    'Simiyu': ['Bariadi', 'Busega', 'Itilima', 'Maswa', 'Meatu'],
    'Singida': ['Ikungi', 'Iramba', 'Manyoni', 'Mkalama', 'Singida District', 'Singida Municipal'],
    'Songwe': ['Ileje', 'Mbozi', 'Momba', 'Songwe', 'Tunduma'],
    'Tabora': ['Igunga', 'Kaliua', 'Nzega', 'Sikonge', 'Tabora Municipal', 'Urambo', 'Uyui'],
    'Tanga': ['Handeni District', 'Handeni Town', 'Kilindi', 'Korogwe District', 'Korogwe Town', 'Lushoto', 'Mkinga', 'Muheza', 'Pangani', 'Tanga City'],
    'Zanzibar': ['Kaskazini A', 'Kaskazini B', 'Kati', 'Kusini', 'Mjini'],
};

// ================================================================
// INIT
// ================================================================
document.addEventListener('DOMContentLoaded', async function() {
    if (!protectPage('Sales', 'SuperAdmin', 'CEO', 'Manager')) return;
    
    currentUser = Auth.getUser();
    
    renderSalesProfile();
    initSidebar();
    populateOrderRegions();
    await loadProductsForSales();
    await loadMarketingPlansForOrder();
    await loadSalesDashboard();
    await loadSalesProducts();
    if (typeof loadDashboard === 'function') await loadDashboard();
    
    // 🆕 Pre-load budget count for badge (BADILISHWA - Usiite loadAllMyBudgets hapa)
    updateBudgetBadgeCount(); 
    
    startMessagePolling();
});

// ================================================================
// PROFILE RENDER
// ================================================================
function renderSalesProfile() {
    if (!currentUser) return;
    
    const user = currentUser;
    const initials = (user.fullName || 'SM')
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    
    setText('sidebarUserName', user.fullName);
    setAvatar('sidebarUserAvatar', user.profilePic, initials);
    setText('udName', user.fullName);
    setText('udRole', `📈 ${user.role || 'Sales'}`);
    setAvatar('udAvatar', user.profilePic, initials);
    setText('udpName', user.fullName);
    setText('udpRole', `📈 ${user.role || 'Sales'}`);
    setText('udpEmail', user.email || '—');
    setText('udpPhone', user.phone || '—');
    setText('udpDepartment', user.department || '—');
    setText('udpEmployeeId', user.employeeId || '—');
    setAvatar('udpPic', user.profilePic, initials);
    
    // Dashboard header
    setText('dashUserName', user.fullName?.split(' ')[0] || 'User');
    setText('dashUserFullName', user.fullName || 'User');
    setText('dashUserRole', `📈 ${user.role || 'Sales'}`);
    setAvatar('dashUserAvatar', user.profilePic, initials);
    
    // Date
    const now = new Date();
    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    setText('dashDay', days[now.getDay()]);
    setText('dashMonth', `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`);
}

// ================================================================
// HELPERS
// ================================================================
function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function setAvatar(id, pic, initials) {
    const el = document.getElementById(id);
    if (!el) return;
    if (pic) {
        el.innerHTML = `<img src="${pic}" alt="Profile" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    } else {
        el.innerHTML = `<span>${initials || 'U'}</span>`;
    }
}

function esc(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function normalizePhone(phone) {
    return (phone || '').replace(/\s+/g, '').replace(/^\+?255/, '0');
}

function getItemCount(order) {
    if (!order) return 0;
    if (Array.isArray(order.items)) return order.items.length;
    if (typeof order.totalItems === 'number') return order.totalItems;
    if (typeof order.totalItems === 'string') return parseInt(order.totalItems) || 0;
    return 0;
}

function showToast(message, type = 'success') {
    if (typeof Toast !== 'undefined' && typeof Toast[type] === 'function') {
        Toast[type](message);
    } else {
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
}

// ================================================================
// 🆕 LOADING STATE HELPERS (Kuzuia double-click)
// ================================================================
function setButtonLoading(btn, loadingText = '⏳ Processing...') {
    if (!btn) return null;
    const original = {
        html: btn.innerHTML,
        disabled: btn.disabled,
        className: btn.className
    };
    btn.disabled = true;
    btn.innerHTML = loadingText;
    btn.style.opacity = '0.7';
    btn.style.cursor = 'not-allowed';
    return original;
}

function restoreButton(btn, original) {
    if (!btn || !original) return;
    btn.disabled = original.disabled;
    btn.innerHTML = original.html;
    btn.className = original.className;
    btn.style.opacity = '';
    btn.style.cursor = '';
}

// ================================================================
// SIDEBAR
// ================================================================
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    const isMobile = window.innerWidth <= 768;
    const isCollapsed = sidebar.classList.toggle('collapsed');
    
    if (!isMobile) localStorage.setItem('makdc_sales_sidebar_collapsed', isCollapsed);
    
    if (isMobile && !isCollapsed) {
        backdrop.classList.add('show');
        document.body.style.overflow = 'hidden';
    } else {
        backdrop.classList.remove('show');
        document.body.style.overflow = '';
    }
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    if (sidebar) sidebar.classList.add('collapsed');
    if (backdrop) backdrop.classList.remove('show');
    document.body.style.overflow = '';
}

function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
        sidebar.classList.add('collapsed');
    } else {
        const wasCollapsed = localStorage.getItem('makdc_sales_sidebar_collapsed') === 'true';
        if (wasCollapsed) sidebar.classList.add('collapsed');
    }
}

function toggleSidebarDropdown(parentEl, event) {
    if (event) event.stopPropagation();
    const submenu = parentEl.nextElementSibling;
    if (!submenu) return;
    const isOpen = parentEl.classList.contains('open');
    
    document.querySelectorAll('.sidebar-nav-parent.open').forEach(el => {
        if (el !== parentEl) {
            el.classList.remove('open');
            const sub = el.nextElementSibling;
            if (sub) sub.classList.remove('open');
        }
    });
    
    parentEl.classList.toggle('open', !isOpen);
    submenu.classList.toggle('open', !isOpen);
}

function switchSidebarTab(targetId, event) {
    if (!targetId) return;

    // 🆕 MY REQUESTS
    if (targetId === 'my-requests') {
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.sub-tab-content').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.sidebar-submenu a').forEach(link => link.classList.remove('active'));

        const target = document.getElementById('my-requests');
        if (target) target.classList.add('active');

        if (event && event.target) {
            const link = event.target.closest('a');
            if (link) link.classList.add('active');
        }

        loadMyRequests();
        if (window.innerWidth <= 768) closeSidebar();
        return;
    }

    // 🆕 MY BUDGET (Current)
    if (targetId === 'tab-my-budget') {
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.sub-tab-content').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.sidebar-submenu a').forEach(link => link.classList.remove('active'));

        const target = document.getElementById('tab-my-budget');
        if (target) target.classList.add('active');

        if (event && event.target) {
            const link = event.target.closest('a');
            if (link) link.classList.add('active');
        }

        loadMyBudget();
        if (window.innerWidth <= 768) closeSidebar();
        return;
    }

    // 🆕 ALL MY BUDGETS (History)
    if (targetId === 'tab-all-my-budgets') {
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.sub-tab-content').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.sidebar-submenu a').forEach(link => link.classList.remove('active'));

        const target = document.getElementById('tab-all-my-budgets');
        if (target) target.classList.add('active');

        if (event && event.target) {
            const link = event.target.closest('a');
            if (link) link.classList.add('active');
        }

        loadAllBudgetsPage();
        if (window.innerWidth <= 768) closeSidebar();
        return;
    }

    // Sub-tab parents
    const subTabParents = {
        'sub-all-orders': 'tab1','sub-create-order': 'tab1','sub-waiting-approval': 'tab1',
        'sub-approved': 'tab1','sub-rejected': 'tab1','sub-pending-delivery': 'tab-delivery',
        'sub-in-transit': 'tab-delivery','sub-delivered': 'tab-delivery','sub-self-pickup': 'tab-delivery'
    };

    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.sub-tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.sidebar-submenu a').forEach(link => link.classList.remove('active'));

    if (subTabParents[targetId]) {
        const parentTab = document.getElementById(subTabParents[targetId]);
        if (parentTab) parentTab.classList.add('active');
        const subTarget = document.getElementById(targetId);
        if (subTarget) subTarget.classList.add('active');
    } else {
        const mainTarget = document.getElementById(targetId);
        if (mainTarget) mainTarget.classList.add('active');
        if (targetId === 'tab1') {
            const def = document.getElementById('sub-all-orders');
            if (def) def.classList.add('active');
        } else if (targetId === 'tab-delivery') {
            const def = document.getElementById('sub-pending-delivery');
            if (def) def.classList.add('active');
        }
    }

    if (event && event.target) {
        const link = event.target.closest('.sidebar-submenu a');
        if (link) link.classList.add('active');
    }
    if (targetId === 'tab-my-submitted-reports') loadMySubmittedReports();
    if (targetId === 'sub-create-order') {
        loadProductsForSales().then(() => {
            const tbody = document.getElementById('itemsTableBody');
            if (tbody && tbody.children.length === 0) {
                itemCounter = 0;
                addItemRow();
            }
        });
        loadMarketingPlansForOrder();
    }
    // 🆕 MY KPIs
    if (targetId === 'tab-my-kpis') {
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.sub-tab-content').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.sidebar-submenu a').forEach(link => link.classList.remove('active'));

        const target = document.getElementById('tab-my-kpis');
        if (target) target.classList.add('active');

        if (event && event.target) {
            const link = event.target.closest('a');
            if (link) link.classList.add('active');
        }

        loadSalesKpis();
        if (window.innerWidth <= 768) closeSidebar();
        return;
    }
    if (targetId === 'tab4') loadSalesProducts();
    if (targetId === 'tab6' && typeof loadReports === 'function') loadReports();
    if (targetId === 'tab2' && typeof loadMarketingPlans === 'function') loadMarketingPlans();
    if (targetId === 'tab-research' && typeof loadMarketResearch === 'function') loadMarketResearch();
    if (targetId === 'tab-dashboard' && typeof loadDashboard === 'function') loadDashboard();

    if (window.innerWidth <= 768) closeSidebar();
}
// ================================================================
// USER DROPDOWN
// ================================================================
function toggleUserDropdown(event) {
    if (event) event.stopPropagation();
    const wrap = document.getElementById('userDropdownWrap');
    if (wrap) wrap.classList.toggle('open');
}

function closeUserDropdown() {
    const wrap = document.getElementById('userDropdownWrap');
    if (wrap) wrap.classList.remove('open');
}

document.addEventListener('click', function(e) {
    const wrap = document.getElementById('userDropdownWrap');
    if (wrap && wrap.classList.contains('open') && !wrap.contains(e.target)) {
        wrap.classList.remove('open');
    }
});

// ================================================================
// LOGOUT
// ================================================================
function handleLogoutClick(event) {
    if (event) event.preventDefault();
    document.getElementById('logoutConfirmModal')?.classList.add('show');
    closeUserDropdown();
}

function closeLogoutDialog() {
    document.getElementById('logoutConfirmModal')?.classList.remove('show');
}

function confirmLogout() {
    closeLogoutDialog();
    showToast('👋 Logging out...', 'info');
    setTimeout(() => Auth.logout(), 400);
}

// ================================================================
// MODAL HELPERS
// ================================================================
function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('show');
}

document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('show');
    }
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeUserDropdown();
        document.querySelectorAll('.modal-overlay.show').forEach(m => m.classList.remove('show'));
        document.querySelectorAll('.confirm-overlay.show').forEach(m => m.classList.remove('show'));
    }
});

// ================================================================
// CHANGE PASSWORD
// ================================================================
function openChangePasswordModal() {
    document.getElementById('cpCurrentPassword').value = '';
    document.getElementById('cpNewPassword').value = '';
    document.getElementById('cpConfirmPassword').value = '';
    document.getElementById('cpStatusMsg').className = 'status-msg';
    document.getElementById('cpStatusMsg').textContent = '';
    document.getElementById('changePasswordModal').classList.add('show');
}

async function submitChangePassword() {
    const currentPassword = document.getElementById('cpCurrentPassword').value;
    const newPassword = document.getElementById('cpNewPassword').value;
    const confirmPassword = document.getElementById('cpConfirmPassword').value;
    const statusDiv = document.getElementById('cpStatusMsg');
    const saveBtn = document.getElementById('cpSaveBtn');
    
    if (!currentPassword || !newPassword || !confirmPassword) {
        statusDiv.className = 'status-msg error';
        statusDiv.textContent = '⚠ Please fill in all password fields';
        return;
    }
    
    if (newPassword.length < 6) {
        statusDiv.className = 'status-msg error';
        statusDiv.textContent = '⚠ New password must be at least 6 characters';
        return;
    }
    
    if (newPassword !== confirmPassword) {
        statusDiv.className = 'status-msg error';
        statusDiv.textContent = '⚠ New passwords do not match';
        return;
    }
    
    const original = setButtonLoading(saveBtn, '⏳ Updating...');
    statusDiv.className = 'status-msg';
    
    try {
        const response = await fetch(`${CONFIG.API_URL}/auth/change-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Auth.getToken()}`
            },
            body: JSON.stringify({ currentPassword, newPassword })
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to change password');
        
        showToast('✅ Password changed!', 'success');
        closeModal('changePasswordModal');
        setTimeout(() => Auth.logout(), 2000);
        
    } catch (err) {
        statusDiv.className = 'status-msg error';
        statusDiv.textContent = '⚠ ' + err.message;
        restoreButton(saveBtn, original);
    }
}

// ================================================================
// EDIT PROFILE
// ================================================================
function openEditProfileModal() {
    if (!currentUser) {
        currentUser = Auth.getUser();
        if (!currentUser) { showToast('User data not found', 'error'); return; }
    }
    
    setInputValue('editProfileName', currentUser.fullName);
    setInputValue('editProfileTitle', currentUser.role);
    setInputValue('editProfileEmail', currentUser.email);
    setInputValue('editProfilePhone', currentUser.phone);
    setInputValue('editProfileDepartment', currentUser.department);
    setInputValue('editProfileEmployeeId', currentUser.employeeId);
    
    const preview = document.getElementById('editPicPreview');
    if (preview) {
        const initials = (currentUser.fullName || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        if (currentUser.profilePic) {
            preview.innerHTML = `<img src="${currentUser.profilePic}" alt="Profile">`;
        } else {
            preview.innerHTML = `<span>${initials}</span>`;
        }
    }
    
    currentProfilePic = currentUser.profilePic || null;
    
    const status = document.getElementById('editProfileStatus');
    if (status) { status.className = 'status-msg'; status.textContent = ''; }
    
    document.getElementById('editProfileModal').classList.add('show');
}

function setInputValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value || '';
}

function handleProfilePicUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showToast('Image too large (max 2MB)', 'error'); return; }
    if (!file.type.startsWith('image/')) { showToast('Please select an image', 'error'); return; }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        currentProfilePic = e.target.result;
        const preview = document.getElementById('editPicPreview');
        if (preview) {
            preview.innerHTML = `<img src="${currentProfilePic}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" alt="Profile">`;
        }
        showToast('📷 Photo uploaded!', 'info');
    };
    reader.readAsDataURL(file);
}

function removeProfilePic() {
    currentProfilePic = null;
    if (!currentUser) return;
    const initials = (currentUser.fullName || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const preview = document.getElementById('editPicPreview');
    if (preview) preview.innerHTML = `<span>${initials}</span>`;
    showToast('🗑️ Photo removed.', 'warning');
}

async function saveUserProfile() {
    const statusDiv = document.getElementById('editProfileStatus');
    const phone = document.getElementById('editProfilePhone')?.value.trim();
    const saveBtn = document.querySelector('#editProfileModal .btn-action.primary');
    
    if (!phone) {
        statusDiv.className = 'status-msg error';
        statusDiv.textContent = '⚠ Please enter Phone Number.';
        return;
    }
    
    const phoneRegex = /^\+?[\d\s\-()]{9,}$/;
    if (!phoneRegex.test(phone)) {
        statusDiv.className = 'status-msg error';
        statusDiv.textContent = '⚠ Invalid phone number.';
        return;
    }
    
    const original = setButtonLoading(saveBtn, '⏳ Saving...');
    
    try {
        const payload = { phone };
        if (currentProfilePic !== currentUser.profilePic) payload.profilePic = currentProfilePic;
        
        const response = await API.updateOwnProfile(payload);
        currentUser = { ...currentUser, ...response.user };
        
        Auth.saveSession(Auth.getToken(), currentUser);
        renderSalesProfile();
        
        statusDiv.className = 'status-msg success';
        statusDiv.textContent = '✓ Profile updated!';
        showToast('✅ Profile saved!', 'success');
        
        setTimeout(() => closeModal('editProfileModal'), 1000);
        
    } catch (err) {
        statusDiv.className = 'status-msg error';
        statusDiv.textContent = '⚠ ' + err.message;
    } finally {
        restoreButton(saveBtn, original);
    }
}

// ================================================================
// REGIONS
// ================================================================
function populateOrderRegions() {
    const regionSelect = document.getElementById('orderRegion');
    if (!regionSelect) return;

    const regions = Object.keys(TANZANIA_REGIONS).sort();
    regionSelect.innerHTML = '<option value="">-- Select Region --</option>';
    
    regions.forEach(region => {
        const option = document.createElement('option');
        option.value = region;
        option.textContent = region;
        regionSelect.appendChild(option);
    });
}

function updateOrderDistricts() {
    const regionSelect = document.getElementById('orderRegion');
    const districtSelect = document.getElementById('orderDistrict');
    if (!regionSelect || !districtSelect) return;

    const selectedRegion = regionSelect.value;
    districtSelect.innerHTML = '<option value="">-- Select District --</option>';
    
    if (selectedRegion && TANZANIA_REGIONS[selectedRegion]) {
        TANZANIA_REGIONS[selectedRegion].sort().forEach(district => {
            const option = document.createElement('option');
            option.value = district;
            option.textContent = district;
            districtSelect.appendChild(option);
        });
    }
}

// ================================================================
// PROCUREMENT — DEPT REQUESTS
// ================================================================
function getDeptStatusInfo(status) {
    const map = {
        'pending':         { icon: '⏳', label: 'Awaiting Procurement', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
        'pending-manager': { icon: '👔', label: 'With Manager', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
        'pending-ceo':     { icon: '🏢', label: 'With CEO', color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)' },
        'approved':        { icon: '✅', label: 'Approved', color: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
        'purchasing':      { icon: '🛒', label: 'In Purchasing', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
        'pending-finance': { icon: '💰', label: 'With Finance', color: '#14b8a6', bg: 'rgba(20,184,166,0.15)' },
        'paid':            { icon: '💵', label: 'Paid', color: '#16a34a', bg: 'rgba(22,163,74,0.15)' },
        'completed':       { icon: '🎉', label: 'Completed', color: '#16a34a', bg: 'rgba(22,163,74,0.15)' },
        'returned':        { icon: '🔄', label: 'Returned', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
        'rejected':        { icon: '❌', label: 'Rejected', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' }
    };
    return map[status] || { icon: '❓', label: status || 'Unknown', color: '#64748b', bg: 'rgba(100,116,139,0.15)' };
}

// ================================================================
// OPEN REQUEST MODAL
// ================================================================
function openDeptRequestModal() {
    currentDeptUser = Auth.getUser();
    
    document.getElementById('deptRequestTitle').value = '';
    document.getElementById('deptRequestJustification').value = '';
    document.getElementById('deptRequestUrgency').value = 'normal';
    document.getElementById('deptRequestRequiredBy').value = '';
    document.getElementById('deptRequestItemsBody').innerHTML = '';
    document.getElementById('deptRequestStatus').className = 'status-msg';
    document.getElementById('deptRequestStatus').textContent = '';

    const msgSubjectEl = document.getElementById('deptRequestMsgSubject');
    const msgBodyEl = document.getElementById('deptRequestMsgBody');
    if (msgSubjectEl) msgSubjectEl.value = '';
    if (msgBodyEl) msgBodyEl.value = '';

    window.deptRequestAttachments = [];
    renderDeptAttachments();

    deptRequestItemCounter = 0;
    addDeptRequestItemRow();

    document.getElementById('deptRequestModal').classList.add('show');
}

function closeDeptRequestModal() {
    document.getElementById('deptRequestModal').classList.remove('show');
}

function addDeptRequestItemRow() {
    const tbody = document.getElementById('deptRequestItemsBody');
    if (!tbody) return;
    
    const rowId = 'dept-item-' + deptRequestItemCounter++;
    const row = document.createElement('tr');
    row.id = rowId;
    row.style.borderBottom = '1px solid #e2e8f0';
    row.innerHTML = `
        <td style="padding:6px;"><input type="text" class="dept-item-name" placeholder="Item name" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;background:white;"></td>
        <td style="padding:6px;"><input type="text" class="dept-item-spec" placeholder="Spec" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;background:white;"></td>
        <td style="padding:6px;"><input type="number" class="dept-item-qty" placeholder="0" min="1" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;background:white;" oninput="calculateDeptTotal()"></td>
        <td style="padding:6px;">
            <select class="dept-item-unit" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;background:white;">
                <option value="pcs">Pcs</option>
                <option value="bags">Bags</option>
                <option value="blocks">Blocks</option>
                <option value="tons">Tons</option>
                <option value="kg">Kg</option>
                <option value="litres">Litres</option>
                <option value="boxes">Boxes</option>
                <option value="sheets">Sheets</option>
            </select>
        </td>
        <td style="padding:6px;"><input type="number" class="dept-item-price" placeholder="0" min="0" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;background:white;" oninput="calculateDeptTotal()"></td>
        <td style="padding:6px;text-align:center;">
            <button type="button" onclick="document.getElementById('${rowId}').remove(); calculateDeptTotal();" style="background:#ef4444;color:white;border:none;border-radius:6px;padding:6px 10px;cursor:pointer;font-size:12px;font-weight:700;">✕</button>
        </td>
    `;
    tbody.appendChild(row);
}

function calculateDeptTotal() {
    let total = 0;
    document.querySelectorAll('#deptRequestItemsBody tr').forEach(row => {
        const qty = parseFloat(row.querySelector('.dept-item-qty')?.value) || 0;
        const price = parseFloat(row.querySelector('.dept-item-price')?.value) || 0;
        total += qty * price;
    });
    const totalEl = document.getElementById('deptRequestTotalDisplay');
    if (totalEl) totalEl.textContent = 'TSh ' + total.toLocaleString();
}

// ===== ATTACHMENTS =====
function handleDeptAttachments(event) {
    const files = Array.from(event.target.files);
    const maxSize = 5 * 1024 * 1024;

    files.forEach(file => {
        if (file.size > maxSize) {
            showToast(`❌ ${file.name} ni kubwa mno (max 5MB)`, 'error');
            return;
        }
        if (!window.deptRequestAttachments.find(f => f.name === file.name && f.size === file.size)) {
            window.deptRequestAttachments.push(file);
        }
    });

    renderDeptAttachments();
    event.target.value = '';
}

function renderDeptAttachments() {
    const list = document.getElementById('deptAttachmentsList');
    if (!list) return;

    if (window.deptRequestAttachments.length === 0) {
        list.innerHTML = `<span style="font-size:12px;color:#9aa38b;">No files attached yet.</span>`;
        return;
    }

    list.innerHTML = window.deptRequestAttachments.map((file, index) => `
        <div style="display:flex;align-items:center;gap:8px;background:white;border:1px solid #dde1d6;border-radius:8px;padding:6px 10px;font-size:12px;color:#252a1e;">
            <span>${getFileIcon(file.name)}</span>
            <span style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${file.name}">${file.name}</span>
            <span style="color:#9aa38b;font-size:10px;">${(file.size/1024).toFixed(0)}KB</span>
            <button type="button" onclick="removeDeptAttachment(${index})" style="background:none;border:none;color:#dc2626;cursor:pointer;font-size:14px;padding:0 2px;line-height:1;">✕</button>
        </div>
    `).join('');
}

function removeDeptAttachment(index) {
    window.deptRequestAttachments.splice(index, 1);
    renderDeptAttachments();
}

function getFileIcon(filename) {
    const ext = (filename || '').split('.').pop().toLowerCase();
    const icons = {
        pdf: '📄', doc: '📝', docx: '📝',
        xls: '📊', xlsx: '📊',
        jpg: '🖼️', jpeg: '🖼️', png: '🖼️',
        zip: '🗜️'
    };
    return icons[ext] || '📎';
}

// ================================================================
// SUBMIT DEPT REQUEST (Preview)
// ================================================================
function submitDeptRequest() {
    const statusDiv = document.getElementById('deptRequestStatus');
    const showStatus = (msg) => {
        statusDiv.className = 'status-msg error';
        statusDiv.textContent = msg;
    };

    const title = document.getElementById('deptRequestTitle').value.trim();
    const justification = document.getElementById('deptRequestJustification').value.trim();

    if (!title) return showStatus('⚠ Tafadhali weka kichwa cha ombi');
    if (!justification) return showStatus('⚠ Tafadhali weka sababu (Justification)');

    const items = [];
    document.querySelectorAll('#deptRequestItemsBody tr').forEach(row => {
        const name = row.querySelector('.dept-item-name')?.value.trim();
        const spec = row.querySelector('.dept-item-spec')?.value.trim();
        const qty = parseFloat(row.querySelector('.dept-item-qty')?.value) || 0;
        const unit = row.querySelector('.dept-item-unit')?.value || 'pcs';
        const price = parseFloat(row.querySelector('.dept-item-price')?.value) || 0;

        if (name && qty > 0) {
            items.push({ itemName: name, specification: spec, quantity: qty, unit, estimatedPrice: price });
        }
    });

    if (items.length === 0) return showStatus('⚠ Ongeza angalau kitu kimoja');

    const attachments = window.deptRequestAttachments || [];
    const msgSubject = document.getElementById('deptRequestMsgSubject')?.value.trim() || '';
    const msgBody = document.getElementById('deptRequestMsgBody')?.value.trim() || '';

    // Convert files to base64
    const attachmentPromises = attachments.map(file => new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = e => resolve({
            name: file.name,
            type: file.type,
            size: file.size,
            data: e.target.result
        });
        reader.readAsDataURL(file);
    }));

    Promise.all(attachmentPromises).then(attachmentData => {
        pendingDeptRequestData = {
            department: (Auth.getUser()?.department) || 'Unknown',
            items: items,
            notes: justification,
            title: title,
            urgency: document.getElementById('deptRequestUrgency').value,
            requiredBy: document.getElementById('deptRequestRequiredBy').value || null,
            attachments: attachmentData,
            message: msgBody ? { subject: msgSubject, body: msgBody } : null
        };

        showDeptRequestPreview(pendingDeptRequestData);
        closeDeptRequestModal();
    });
}

// ================================================================
// PREVIEW MODAL
// ================================================================
function showDeptRequestPreview(data) {
    document.getElementById('previewDeptName').textContent = data.department;
    document.getElementById('previewDeptTitle').textContent = data.title;
    document.getElementById('previewDeptJustification').textContent = data.notes;
    document.getElementById('previewDeptUrgency').textContent =
        data.urgency === 'urgent' ? '🔴 Urgent' : data.urgency === 'high' ? '🟡 High' : '🟢 Normal';
    document.getElementById('previewDeptRequiredBy').textContent = data.requiredBy || '—';

    const body = document.getElementById('previewDeptItemsBody');
    let total = 0;
    body.innerHTML = data.items.map(item => {
        const sub = (item.estimatedPrice || 0) * item.quantity;
        total += sub;
        return `
            <tr style="border-bottom:1px solid #e2e8f0;">
                <td style="padding:8px;font-weight:600;">${esc(item.itemName)}</td>
                <td style="padding:8px;color:#64748b;font-size:11px;">${esc(item.specification || '—')}</td>
                <td style="padding:8px;">${item.quantity} ${item.unit}</td>
                <td style="padding:8px;text-align:right;font-weight:700;color:#022908;">TSh ${sub.toLocaleString()}</td>
            </tr>
        `;
    }).join('');
    document.getElementById('previewDeptTotal').textContent = 'TSh ' + total.toLocaleString();

    // Attachments
    const atts = data.attachments || [];
    const attContainer = document.getElementById('previewAttachments');
    if (attContainer) {
        if (atts.length === 0) {
            attContainer.innerHTML = '<span style="font-size:12px;color:#9aa38b;">No attachments</span>';
        } else {
            attContainer.innerHTML = atts.map(f => `
                <span style="display:inline-flex;align-items:center;gap:4px;background:#f8fafc;
                             border:1px solid #e2e8f0;border-radius:6px;padding:4px 10px;font-size:12px;margin:3px;">
                    ${getFileIcon(f.name)} ${esc(f.name)}
                </span>
            `).join('');
        }
    }

    // Message
    const msgContainer = document.getElementById('previewMessage');
    if (msgContainer) {
        if (!data.message || !data.message.body) {
            msgContainer.innerHTML = '<span style="font-size:12px;color:#9aa38b;">No message</span>';
        } else {
            msgContainer.innerHTML = `
                ${data.message.subject ? `<div style="font-weight:700;font-size:12px;margin-bottom:4px;">${esc(data.message.subject)}</div>` : ''}
                <div style="font-size:12px;color:#475569;">${esc(data.message.body)}</div>
            `;
        }
    }

    const btn = document.getElementById('previewDeptConfirmBtn');
    btn.disabled = false;
    btn.textContent = '✅ Confirm & Send to Procurement';
    btn.style.opacity = '';
    btn.style.cursor = '';

    document.getElementById('previewDeptRequestModal').classList.add('show');
}

function closeDeptRequestPreview() {
    document.getElementById('previewDeptRequestModal').classList.remove('show');
}

// ================================================================
// CONFIRM & SUBMIT
// ================================================================
async function confirmDeptRequestSubmit() {
    if (!pendingDeptRequestData) return;
    
    const btn = document.getElementById('previewDeptConfirmBtn');
    const original = setButtonLoading(btn, '⏳ Sending... Please wait');
    
    try {
        await API.createProcurementRequest(pendingDeptRequestData);
        
        btn.innerHTML = '✅ Sent Successfully!';
        btn.style.background = 'linear-gradient(135deg, #22c55e, #16a34a)';
        btn.style.opacity = '1';
        
        showToast('✅ Request sent to Procurement!', 'success');
        
        setTimeout(() => {
            closeDeptRequestPreview();
            pendingDeptRequestData = null;
            loadMyRequests();
        }, 1500);
        
    } catch (err) {
        btn.innerHTML = original.html;
        btn.disabled = false;
        btn.style.opacity = '';
        btn.style.cursor = '';
        showToast('❌ Failed: ' + err.message, 'error');
    }
}

// ================================================================
// LOAD MY REQUESTS
// ================================================================
async function loadMyRequests() {
    const tbody = document.getElementById('myRequestsTableBody');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:30px;color:#9aa38b;">⏳ Loading requests...</td></tr>`;

    try {
        const all = await API.getProcurementRequests('/all');
        const user = Auth.getUser();
        const list = Array.isArray(all) ? all : (all?.requests || all?.data || []);
        
        const myRequests = list.filter(r => {
            if (r.requested_by_id && user.userId) return r.requested_by_id === user.userId;
            return r.requested_by === user.fullName;
        });

        if (myRequests.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:30px;color:#9aa38b;">📭 Hujatuma ombi lolote bado.</td></tr>`;
            return;
        }

        tbody.innerHTML = myRequests.map(r => {
            const statusInfo = getDeptStatusInfo(r.status);

            const atts = r.attachments || [];
            const attHtml = atts.length
                ? `<span title="${atts.map(a => a.name || a).join(', ')}" style="cursor:pointer;color:#3d5a3d;font-weight:600;">📎 ${atts.length}</span>`
                : `<span style="color:#c4cab8;">—</span>`;

            const fups = r.followUps || r.follow_ups || [];
            const lastFU = fups.length ? fups[fups.length - 1] : null;
            const fuHtml = lastFU
                ? `<span title="${esc(lastFU.note)}" style="color:#3d5a3d;font-size:12px;">✅ ${new Date(lastFU.created_at || lastFU.date).toLocaleDateString('en-GB')}</span>`
                : `<span style="color:#c4cab8;">—</span>`;

            const unread = Number(r.unread_messages || 0);
            const msgBadge = unread
                ? `<span style="background:#dc2626;color:#fff;border-radius:10px;padding:0 6px;font-size:10px;margin-left:3px;">${unread}</span>`
                : '';

            return `
            <tr style="border-bottom:1px solid #eef0ea;">
                <td style="padding:10px 12px;"><strong style="font-family:monospace;color:#3d5a3d;">${esc(r.request_number || '—')}</strong></td>
                <td style="padding:10px 12px;">${esc(r.title || '—')}</td>
                <td style="padding:10px 12px;">TSh ${Number(r.total_amount || 0).toLocaleString()}</td>
                <td style="padding:10px 12px;">
                    <span style="display:inline-flex;align-items:center;gap:4px;background:${statusInfo.bg};color:${statusInfo.color};padding:4px 10px;border-radius:12px;font-size:11px;font-weight:800;text-transform:uppercase;">
                        ${statusInfo.icon} ${statusInfo.label}
                    </span>
                </td>
                <td style="padding:10px 12px;">${r.created_at ? new Date(r.created_at).toLocaleDateString('en-GB') : '—'}</td>
                <td style="padding:10px 12px;text-align:center;">${attHtml}</td>
                <td style="padding:10px 12px;text-align:center;">
                    ${fuHtml}
                    <button onclick="openFollowUpModal(${r.id}, '${esc(r.title || '').replace(/'/g, "\\'")}')"
                            style="margin-left:6px;padding:4px 8px;background:#eef0ea;color:#3d5a3d;
                                   border:1px solid #dde1d6;border-radius:6px;font-size:11px;
                                   cursor:pointer;font-weight:600;">+ FU</button>
                </td>
                <td style="padding:10px 12px;text-align:center;white-space:nowrap;">
                    <button onclick="viewDeptRequest(${r.id})"
                            style="padding:4px 10px;background:#2563eb;color:#fff;border:none;
                                   border-radius:6px;cursor:pointer;font-size:11px;font-weight:700;">👁</button>
                    <button onclick="openMessages(${r.id}, '${esc(r.title || '').replace(/'/g, "\\'")}')"
                            style="padding:4px 10px;background:#e0f2fe;color:#0369a1;
                                   border:1px solid #7dd3fc;border-radius:6px;font-size:11px;
                                   cursor:pointer;font-weight:700;margin-left:4px;">
                        💬 ${msgBadge}
                    </button>
                </td>
            </tr>`;
        }).join('');

    } catch (err) {
        console.error('❌ loadMyRequests error:', err);
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:30px;color:#dc2626;">
            ❌ Kosa: ${esc(err.message)}<br>
            <small style="color:#9aa38b;">Angalia Console (F12)</small>
        </td></tr>`;
    }
}

// ================================================================
// VIEW REQUEST DETAILS
// ================================================================
async function viewDeptRequest(id) {
    try {
        const request = await API.getProcurementRequestById(id);
        const statusInfo = getDeptStatusInfo(request.status);
        
        let itemsHtml = (request.items || []).map(item => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; background:white; border:1px solid #e2e8f0; border-radius:8px; margin-bottom:8px;">
                <div>
                    <div style="font-weight:700; color:#1e293b; font-size:14px;">${esc(item.item_name)}</div>
                    <div style="font-size:11px; color:#64748b; margin-top:2px;">Spec: ${esc(item.specification || '—')}</div>
                </div>
                <div style="text-align:right;">
                    <div style="font-weight:800; color:var(--primary); font-size:14px;">TSh ${Number(item.estimated_price || 0).toLocaleString()}</div>
                    <div style="font-size:11px; font-weight:600; color:#64748b;">Qty: ${item.quantity} ${item.unit}</div>
                </div>
            </div>
        `).join('');

        const rejectedHtml = request.rejection_reason ? `
            <div style="background:rgba(239,68,68,0.05); border-left:4px solid #ef4444; padding:14px; border-radius:8px; margin-top:16px;">
                <div style="font-size:11px; font-weight:800; color:#b91c1c; text-transform:uppercase; margin-bottom:4px;">❌ Rejection Reason</div>
                <div style="font-size:13px; color:#7f1d1d; font-weight:500;">${esc(request.rejection_reason)}</div>
            </div>
        ` : '';

        let modalHTML = `
            <div class="modern-modal-overlay show" id="viewRequestModal" style="z-index: 50000;">
                <div class="modern-modal" style="max-width: 650px;">
                    
                    <div class="modern-modal-header" style="background: linear-gradient(135deg, #2a3d2a 0%, #3d5a3d 100%);">
                        <div class="modern-modal-header-left">
                            <div class="modern-modal-icon" style="background:rgba(255,255,255,0.1); border-radius:12px;">
                                <span style="font-size:28px;">📋</span>
                            </div>
                            <div>
                                <h3 style="font-size:20px; margin-bottom:2px;">Request Details</h3>
                                <p style="color:rgba(255,255,255,0.8); font-size:13px; font-family:monospace;">${esc(request.request_number)}</p>
                            </div>
                        </div>
                        <button class="modern-modal-close" onclick="document.getElementById('viewRequestModal').remove()">✕</button>
                    </div>

                    <div class="modern-modal-body" style="background:#f8fafc;">
                        
                        <div style="background:white; border:1px solid #e2e8f0; border-radius:12px; padding:16px; margin-bottom:16px; display:grid; grid-template-columns: 1fr 1fr; gap:16px;">
                            <div>
                                <div style="font-size:10px; font-weight:800; color:#94a3b8; text-transform:uppercase; letter-spacing:1px;">Status</div>
                                <div style="margin-top:4px;">
                                    <span style="display:inline-flex;align-items:center;gap:6px;background:${statusInfo.bg};color:${statusInfo.color};padding:6px 12px;border-radius:20px;font-size:12px;font-weight:800;text-transform:uppercase;">
                                        ${statusInfo.icon} ${statusInfo.label}
                                    </span>
                                </div>
                            </div>
                            <div>
                                <div style="font-size:10px; font-weight:800; color:#94a3b8; text-transform:uppercase; letter-spacing:1px;">Department</div>
                                <div style="font-size:14px; font-weight:700; color:#1e293b; margin-top:4px;">${esc(request.department || '—')}</div>
                            </div>
                            <div>
                                <div style="font-size:10px; font-weight:800; color:#94a3b8; text-transform:uppercase; letter-spacing:1px;">Requested By</div>
                                <div style="font-size:14px; font-weight:700; color:#1e293b; margin-top:4px;">${esc(request.requested_by || '—')}</div>
                            </div>
                            <div>
                                <div style="font-size:10px; font-weight:800; color:#94a3b8; text-transform:uppercase; letter-spacing:1px;">Date Requested</div>
                                <div style="font-size:14px; font-weight:700; color:#1e293b; margin-top:4px;">${new Date(request.created_at).toLocaleDateString('en-GB', {day: '2-digit', month: 'long', year: 'numeric'})}</div>
                            </div>
                        </div>

                        <h4 style="font-size:13px; font-weight:800; color:var(--primary-dark); text-transform:uppercase; margin-bottom:10px; display:flex; align-items:center; gap:6px;">🛒 Requested Items</h4>
                        <div style="max-height:200px; overflow-y:auto; padding-right:4px;">
                            ${itemsHtml}
                        </div>

                        <div style="background:var(--primary-dark); border-radius:12px; padding:16px; margin-top:16px; display:flex; justify-content:space-between; align-items:center; color:white;">
                            <span style="font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:1px; color:rgba(255,255,255,0.8);">Grand Total</span>
                            <span style="font-size:22px; font-weight:900; color:var(--gold);">TSh ${Number(request.total_amount || 0).toLocaleString()}</span>
                        </div>

                        ${rejectedHtml}
                    </div>

                    <div class="modern-modal-footer" style="background:white; border-top:1px solid #e2e8f0; padding:16px 24px;">
                        <button class="modern-btn-cancel" onclick="document.getElementById('viewRequestModal').remove()">Close</button>
                        
                        ${request.status === 'rejected' ? `
                            <button class="modern-btn-primary" onclick="document.getElementById('viewRequestModal').remove(); openEditRequestModal(${request.id})" style="background:linear-gradient(135deg, #f59e0b, #d97706); box-shadow:0 4px 12px rgba(245,158,11,0.3);">
                                🖊️ Edit & Resubmit
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
    } catch (err) {
        showToast('Failed to load request: ' + err.message, 'error');
    }
}

// ================================================================
// EDIT REQUEST
// ================================================================
async function openEditRequestModal(id) {
    try {
        const request = await API.getProcurementRequestById(id);
        
        if (typeof openDeptRequestModal === 'function') {
            openDeptRequestModal();
            
            document.getElementById('deptRequestTitle').value = request.title || '';
            document.getElementById('deptRequestJustification').value = request.rejection_reason ? `(Ilikataliwa: ${request.rejection_reason}) ` : '';
            document.getElementById('deptRequestUrgency').value = request.urgency || 'normal';
            document.getElementById('deptRequestRequiredBy').value = request.required_by || '';
            
            document.getElementById('deptRequestItemsBody').innerHTML = '';
            deptRequestItemCounter = 0;
            
            if (request.items && request.items.length > 0) {
                request.items.forEach(item => {
                    addDeptRequestItemRow();
                    const rows = document.querySelectorAll('#deptRequestItemsBody tr');
                    const lastRow = rows[rows.length - 1];
                    
                    lastRow.querySelector('.dept-item-name').value = item.item_name || '';
                    lastRow.querySelector('.dept-item-spec').value = item.specification || '';
                    lastRow.querySelector('.dept-item-qty').value = item.quantity || 1;
                    lastRow.querySelector('.dept-item-unit').value = item.unit || 'pcs';
                    lastRow.querySelector('.dept-item-price').value = item.estimated_price || 0;
                });
                calculateDeptTotal();
            } else {
                addDeptRequestItemRow();
            }
        }
    } catch (err) {
        showToast('Failed to load request for editing: ' + err.message, 'error');
    }
}

// ================================================================
// MESSAGES
// ================================================================
function openMessages(reqId, reqTitle) {
    currentMsgReqId = reqId;
    document.getElementById('msgReqLabel').textContent = `${reqTitle} (${reqId})`;
    document.getElementById('messagesModal').style.display = 'flex';
    document.getElementById('msgSubject').value = '';
    document.getElementById('msgBody').value = '';
    
    unreadMessageCount = 0;
    updateMessageBadges();
    startTypingCheck();
    loadMessages(reqId);
}

function closeMessages() {
    if (currentMsgReqId) {
        API.setTypingStatus(currentMsgReqId, false).catch(() => {});
    }
    stopTypingCheck();
    
    document.getElementById('messagesModal').style.display = 'none';
    currentMsgReqId = null;
    isCurrentlyTyping = false;
    clearTimeout(typingTimeout);
}

// ================================================================
// LOAD MESSAGES (Modern UI + Read Status)
// ================================================================
function loadMessages(reqId) {
    const thread = document.getElementById('msgThread');
    thread.innerHTML = `
        <div style="text-align:center;color:#9aa38b;padding:40px 20px;">
            <div style="font-size:36px;margin-bottom:8px;opacity:0.4;">💬</div>
            <div style="font-size:13px;">Loading messages...</div>
        </div>`;

    API.getRequestMessages(reqId)
    .then(msgs => {
        if (!msgs || msgs.length === 0) {
            thread.innerHTML = `
                <div style="text-align:center;color:#9aa38b;padding:50px 20px;">
                    <div style="font-size:48px;margin-bottom:12px;opacity:0.4;">💬</div>
                    <div style="font-size:14px;font-weight:700;color:#64748b;">No messages yet</div>
                    <div style="font-size:12px;margin-top:6px;">Start the conversation below</div>
                </div>`;
            return;
        }

        const user = Auth.getUser();
        const myId = Number(user?.userId || user?.id);
        let lastDate = null;

        thread.innerHTML = msgs.map(m => {
            const rawSenderId = m.sender_id !== undefined ? m.sender_id : m.senderId;
            const senderId = Number(rawSenderId);
            const mine = senderId === myId;
            
            const initials = (m.sender_name || m.senderName || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
            
            const msgDate = new Date(m.created_at || m.createdAt);
            const dateKey = msgDate.toDateString();
            let dateSep = '';
            if (dateKey !== lastDate) {
                const today = new Date();
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                
                let label = msgDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                if (msgDate.toDateString() === today.toDateString()) label = 'Today';
                else if (msgDate.toDateString() === yesterday.toDateString()) label = 'Yesterday';
                
                dateSep = `<div class="chat-date-sep"><span>${label}</span></div>`;
                lastDate = dateKey;
            }
            
            const time = msgDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
            
            let statusHtml = '';
            if (mine) {
                const isRead = m.is_read === true || m.isRead === true;
                if (isRead) {
                    statusHtml = `<span class="msg-status read" title="Read">✓✓</span>`;
                } else {
                    statusHtml = `<span class="msg-status sent" title="Sent">✓</span>`;
                }
            }
            
            return `
            ${dateSep}
            <div class="chat-msg-row ${mine ? 'mine' : ''}">
                <div class="chat-avatar ${mine ? 'mine' : 'other'}">${initials}</div>
                <div class="chat-bubble-wrap">
                    <div class="chat-bubble ${mine ? 'mine' : 'other'}">
                        ${m.subject ? `<div class="chat-subject">${esc(m.subject)}</div>` : ''}
                        ${esc(m.body)}
                    </div>
                    <div class="chat-meta">
                        ${mine ? 'You' : `<strong>${esc(m.sender_name || m.senderName || 'Unknown')}</strong>`} • ${time}
                        ${statusHtml}
                    </div>
                </div>
            </div>`;
        }).join('');

        thread.scrollTop = thread.scrollHeight;
        API.markMessagesAsRead(reqId).catch(() => {});
    })
    .catch(err => {
        thread.innerHTML = `
            <div style="text-align:center;color:#dc2626;padding:40px 20px;">
                <div style="font-size:40px;margin-bottom:8px;">❌</div>
                <div style="font-size:13px;font-weight:600;">${esc(err.message)}</div>
            </div>`;
    });
}

// ================================================================
// TYPING INDICATOR
// ================================================================
let typingTimeout = null;
let isCurrentlyTyping = false;
let typingCheckInterval = null;

function handleTypingInput() {
    if (!currentMsgReqId) return;
    
    if (!isCurrentlyTyping) {
        isCurrentlyTyping = true;
        API.setTypingStatus(currentMsgReqId, true).catch(() => {});
    }
    
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        isCurrentlyTyping = false;
        API.setTypingStatus(currentMsgReqId, false).catch(() => {});
    }, 2000);
}

function startTypingCheck() {
    stopTypingCheck();
    typingCheckInterval = setInterval(async () => {
        if (!currentMsgReqId) return;
        
        try {
            const result = await API.getTypingStatus(currentMsgReqId);
            const indicator = document.getElementById('typingIndicator');
            const text = document.getElementById('typingText');
            
            if (result.typing && result.typing.length > 0) {
                const names = result.typing.map(t => t.name).join(', ');
                text.textContent = `${names} ${result.typing.length === 1 ? 'is' : 'are'} typing...`;
                indicator.style.display = 'block';
            } else {
                indicator.style.display = 'none';
            }
        } catch (e) {
            // ignore
        }
    }, 2000);
}

function stopTypingCheck() {
    if (typingCheckInterval) {
        clearInterval(typingCheckInterval);
        typingCheckInterval = null;
    }
    const indicator = document.getElementById('typingIndicator');
    if (indicator) indicator.style.display = 'none';
}

// ================================================================
// SEND MESSAGE (Imeunganishwa kuwa moja tu)
// ================================================================
async function sendMessage(btnEl) {
    const subject = document.getElementById('msgSubject').value.trim();
    const body = document.getElementById('msgBody').value.trim();
    
    if (!body) {
        document.getElementById('msgBody').focus();
        return;
    }

    // Kama btnEl haijapitishwa, tafuta kitufe kwenye modal
    const btn = btnEl || document.querySelector('#messagesModal button[onclick^="sendMessage"]');
    const original = setButtonLoading(btn, '⏳ Sending...');

    try {
        await API.sendRequestMessage(currentMsgReqId, { subject, body });
        document.getElementById('msgBody').value = '';
        document.getElementById('msgSubject').value = '';
        API.setTypingStatus(currentMsgReqId, false).catch(() => {});
        loadMessages(currentMsgReqId);
    } catch (err) {
        alert('Failed to send: ' + err.message);
    } finally {
        restoreButton(btn, original);
    }
}

// ================================================================
// MESSAGE NOTIFICATIONS
// ================================================================
let lastSeenMessageCount = {};
let unreadMessageCount = 0;

async function checkNewMessages() {
    try {
        const user = Auth.getUser();
        if (!user) return;
        
        const all = await API.getProcurementRequests('/all');
        const list = Array.isArray(all) ? all : (all?.requests || all?.data || []);
        const myRequests = list.filter(r => 
            (r.requested_by_id && r.requested_by_id === user.userId) ||
            r.requested_by === user.fullName
        );

        let totalNew = 0;
        let latestNewMsg = null;

        for (const req of myRequests) {
            try {
                const msgs = await API.getRequestMessages(req.id);
                if (!msgs || msgs.length === 0) continue;
                
                const otherMsgs = msgs.filter(m => m.sender_id !== user.userId);
                if (otherMsgs.length === 0) continue;
                
                const lastMsg = otherMsgs[otherMsgs.length - 1];
                const lastMsgId = lastMsg.id;
                
                const prevSeen = lastSeenMessageCount[req.id];
                if (prevSeen === undefined) {
                    lastSeenMessageCount[req.id] = lastMsgId;
                    continue;
                }
                
                if (lastMsgId > prevSeen) {
                    totalNew++;
                    if (!latestNewMsg || new Date(lastMsg.created_at) > new Date(latestNewMsg.created_at)) {
                        latestNewMsg = {
                            ...lastMsg,
                            requestNumber: req.request_number,
                            requestId: req.id,
                            requestTitle: req.title
                        };
                    }
                    lastSeenMessageCount[req.id] = lastMsgId;
                }
            } catch (e) {
                // ignore
            }
        }

        if (totalNew > 0 && latestNewMsg) {
            unreadMessageCount += totalNew;
            updateMessageBadges();
            showNewMessageToast(latestNewMsg, totalNew);
        }
    } catch (err) {
        console.error('checkNewMessages error:', err);
    }
}

function updateMessageBadges() {
    const myReqLink = document.querySelector('a[onclick*="my-requests"]');
    if (myReqLink) {
        let badge = myReqLink.querySelector('.msg-badge');
        if (unreadMessageCount > 0) {
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'msg-badge';
                myReqLink.style.position = 'relative';
                myReqLink.appendChild(badge);
            }
            badge.textContent = unreadMessageCount > 99 ? '99+' : unreadMessageCount;
        } else if (badge) {
            badge.remove();
        }
    }
}

function showNewMessageToast(msg, count) {
    document.querySelectorAll('.new-msg-toast').forEach(t => t.remove());

    const toast = document.createElement('div');
    toast.className = 'new-msg-toast';
    toast.innerHTML = `
        <div class="nmt-icon">💬</div>
        <div class="nmt-content">
            <div class="nmt-title">
                ${count > 1 ? `${count} new messages` : 'New message'} from ${esc(msg.sender_name)}
            </div>
            <div class="nmt-text">${esc(msg.body).substring(0, 60)}${msg.body.length > 60 ? '...' : ''}</div>
        </div>
        <button class="nmt-close" onclick="event.stopPropagation();this.parentElement.remove();">×</button>
    `;
    
    toast.onclick = () => {
        openMessages(msg.requestId, msg.requestTitle || msg.requestNumber);
        toast.remove();
        unreadMessageCount = 0;
        updateMessageBadges();
    };
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        if (toast.parentElement) {
            toast.style.transform = 'translateX(400px)';
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 400);
        }
    }, 8000);
}

function startMessagePolling() {
    setTimeout(checkNewMessages, 5000);
    setInterval(checkNewMessages, 30000);
}

// ================================================================
// FOLLOW-UP
// ================================================================
function openFollowUpModal(reqId, reqTitle) {
    currentFollowUpReqId = reqId;
    document.getElementById('followUpReqLabel').textContent = `Request: ${reqTitle} (${reqId})`;
    document.getElementById('followUpNote').value = '';
    document.getElementById('followUpModal').style.display = 'flex';
}

function closeFollowUpModal() {
    document.getElementById('followUpModal').style.display = 'none';
    currentFollowUpReqId = null;
}

async function saveFollowUp() {
    const note = document.getElementById('followUpNote').value.trim();
    const saveBtn = document.querySelector('#followUpModal button[onclick="saveFollowUp()"]');
    
    if (!note) { alert('Write a follow-up note.'); return; }
    
    const original = setButtonLoading(saveBtn, '⏳ Saving...');
    
    try {
        await API.saveRequestFollowUp(currentFollowUpReqId, note);
        closeFollowUpModal();
        showToast('✅ Follow-up saved!', 'success');
        loadMyRequests();
    } catch (err) {
        alert('Failed: ' + err.message);
    } finally {
        restoreButton(saveBtn, original);
    }
}

// ================================================================
// ORDERS DASHBOARD
// ================================================================
async function loadSalesDashboard() {
    try {
        const rawResponse = await API.getOrders().catch(() => []);

        let orders = [];
        if (Array.isArray(rawResponse)) orders = rawResponse;
        else if (rawResponse && Array.isArray(rawResponse.orders)) orders = rawResponse.orders;
        else if (rawResponse && Array.isArray(rawResponse.data)) orders = rawResponse.data;

        allOrders = orders;

        const pending = orders.filter(o => o.status === 'pending');
        const readyForFinance = orders.filter(o => o.status === 'ready-for-finance');
        const paid = orders.filter(o => o.status === 'paid');
        const delivered = orders.filter(o => o.status === 'delivered' || o.status === 'completed');
        const rejected = orders.filter(o => o.status === 'rejected');

        const customerOrders = orders.filter(o =>
            o.source === 'Customer Portal' || o.source === 'customer-portal' || o.source === 'Customer'
        );

        const selfPickupOrders = orders.filter(o =>
            o.deliveryType === 'Self Pickup' || o.deliveryType === 'self-pickup' || o.deliveryType === 'SelfPickup'
        );

        // Badges
        setText('navAllOrdersBadge', orders.length);
        setText('navCustomerOrdersBadge', customerOrders.length);
        setText('navWaitingBadge', pending.length);
        setText('navApprovedBadge', readyForFinance.length);
        setText('navRejectedBadge', rejected.length);
        setText('navPendingDeliveryBadge', paid.length);
        setText('navInTransitBadge', 0);
        setText('navDeliveredBadge', delivered.length);
        setText('navSelfPickupBadge', selfPickupOrders.length);

        // Render
        renderAllOrders(orders);
        renderPendingOrders(pending);
        renderReadyForFinanceOrders(readyForFinance);
        renderRejectedOrders(rejected);
        renderPaidOrdersForDelivery(paid);
        renderDeliveredOrders(delivered);
        renderCustomerOrders(customerOrders);
        renderSelfPickupOrders(selfPickupOrders);

        // Counts
        setText('allOrdersCount', orders.length);
        setText('waitingCount', pending.length);
        setText('approvedCount', readyForFinance.length);
        setText('rejectedCount', rejected.length);

    } catch (err) {
        console.error('Sales dashboard error:', err);
        showToast('Failed to load: ' + err.message, 'error');
    }
}

// ================================================================
// ORDER RENDERERS
// ================================================================
function renderAllOrders(orders) {
    const tbody = document.getElementById('allOrdersTableBody');
    if (!tbody) return;

    if (orders.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--gray-400);">📭 No orders yet.</td></tr>`;
        return;
    }

    tbody.innerHTML = orders.map(order => {
        const statusColors = {
            'pending': 'rgba(245,158,11,0.15)|#f59e0b',
            'ready-for-finance': 'rgba(20,184,166,0.15)|#14b8a6',
            'awaiting-payment': 'rgba(245,158,11,0.15)|#f59e0b',
            'postpaid-approved': 'rgba(79,70,229,0.15)|#4f46e5',
            'paid': 'rgba(34,197,94,0.15)|#22c55e',
            'delivered': 'rgba(34,197,94,0.15)|#22c55e',
            'completed': 'rgba(34,197,94,0.15)|#22c55e',
            'rejected': 'rgba(239,68,68,0.15)|#ef4444'
        };
        const [bg, color] = (statusColors[order.status] || statusColors['pending']).split('|');

        let actions = `<button onclick="viewOrder('${order.orderId}')" style="padding:5px 10px;background:linear-gradient(135deg,#3b82f6,#2563eb);color:white;border:none;border-radius:6px;cursor:pointer;font-size:11px;font-weight:700;">👁 View</button>`;

        if (order.status === 'pending') {
            actions += ` <button onclick="openEditOrderModal('${order.orderId}')" style="padding:5px 10px;background:linear-gradient(135deg,#f59e0b,#d97706);color:white;border:none;border-radius:6px;cursor:pointer;font-size:11px;font-weight:700;">🖋️ Edit</button>`;
            actions += ` <button onclick="openSendToFinanceModal('${order.orderId}')" style="padding:5px 10px;background:linear-gradient(135deg,#14b8a6,#0f766e);color:white;border:none;border-radius:6px;cursor:pointer;font-size:11px;font-weight:700;">📤 Send</button>`;
        }
        if (order.status === 'paid') {
            actions += ` <button onclick="openDeliveryModal('${order.orderId}')" style="padding:5px 10px;background:linear-gradient(135deg,#22c55e,#16a34a);color:white;border:none;border-radius:6px;cursor:pointer;font-size:11px;font-weight:700;">🚚 Deliver</button>`;
        }
        if (order.receiptNumber) {
            actions += ` <span class="receipt-badge">🧾 ${order.receiptNumber}</span>`;
        }

        return `
            <tr>
                <td><strong style="font-family:monospace;">${esc(order.orderId)}</strong></td>
                <td>
                    <div style="font-weight:700;">${esc(order.customerName || '—')}</div>
                    <div style="font-size:11px;color:#64748b;">${esc(order.phone || '')}</div>
                </td>
                <td>${getItemCount(order)} items</td>
                <td><strong>TSh ${Number(order.totalAmount || 0).toLocaleString()}</strong></td>
                <td><span style="padding:3px 10px;border-radius:12px;font-size:10px;font-weight:700;background:${bg};color:${color};text-transform:uppercase;">${esc(order.status)}</span></td>
                <td>${order.createdAt ? new Date(order.createdAt).toLocaleDateString() : '—'}</td>
                <td>${actions}</td>
            </tr>
        `;
    }).join('');
}

function renderPendingOrders(orders) {
    const container = document.getElementById('waitingApprovalContainer');
    if (!container) return;

    if (orders.length === 0) {
        container.innerHTML = `<div class="empty-state"><span class="empty-icon">⏳</span><div class="empty-title">No Orders Waiting</div><div class="empty-desc">Orders that need review will appear here.</div></div>`;
        return;
    }
    container.innerHTML = orders.map(order => `
        <div class="incoming-card" style="margin-bottom:12px;">
            <div class="inc-header">
                <span class="inc-id">${esc(order.orderId)}</span>
                <span class="inc-status" style="background:rgba(245,158,11,0.15);color:#f59e0b;">⏳ PENDING</span>
            </div>
            <div class="inc-name">${esc(order.customerName || '—')}</div>
            <div class="inc-info">
                <div>📞 ${esc(order.phone || '—')}</div>
                <div>📧 ${esc(order.email || '—')}</div>
                <div>📍 ${esc(order.district || '—')}, ${esc(order.region || '—')}</div>
                <div>📦 ${order.totalItems || (order.items || []).length || 0} items</div>
            </div>
            <div class="inc-total">
                <span class="inc-total-label">TOTAL</span>
                <span class="inc-total-amount">TSh ${Number(order.totalAmount || 0).toLocaleString()}</span>
            </div>
            <div class="inc-actions">
                <button class="btn-view" onclick="viewOrder('${order.orderId}')">👁 View</button>
                <button class="btn-accept" onclick="openSendToFinanceModal('${order.orderId}')">📤 Send to Finance</button>
                <button class="btn-reject" onclick="openRejectOrderModal('${order.orderId}')">❌ Reject</button>
            </div>
        </div>
    `).join('');
}

function renderReadyForFinanceOrders(orders) {
    const container = document.getElementById('approvedOrdersContainer');
    if (!container) return;

    if (orders.length === 0) {
        container.innerHTML = `<div class="empty-state"><span class="empty-icon">📤</span><div class="empty-title">No Orders Sent to Finance</div></div>`;
        return;
    }

    container.innerHTML = orders.map(order => `
        <div class="incoming-card" style="margin-bottom:12px;">
            <div class="inc-header">
                <span class="inc-id">${esc(order.orderId)}</span>
                <span class="inc-status" style="background:rgba(20,184,166,0.15);color:#14b8a6;">📤 SENT TO FINANCE</span>
            </div>
            <div class="inc-name">${esc(order.customerName || '—')}</div>
            <div class="inc-info">
                <div>📞 ${esc(order.phone || '—')}</div>
                <div>📍 ${esc(order.district || '—')}, ${esc(order.region || '—')}</div>
            </div>
            <div class="inc-total">
                <span class="inc-total-label">TOTAL</span>
                <span class="inc-total-amount">TSh ${Number(order.totalAmount || 0).toLocaleString()}</span>
            </div>
            <div class="inc-actions">
                <button class="btn-view" onclick="viewOrder('${order.orderId}')">👁 View</button>
            </div>
        </div>
    `).join('');
}

function renderPaidOrdersForDelivery(orders) {
    const container = document.getElementById('pendingDeliveryContainer');
    if (!container) return;

    if (orders.length === 0) {
        container.innerHTML = `<div class="empty-state"><span class="empty-icon">📦</span><div class="empty-title">No Orders Ready for Delivery</div></div>`;
        return;
    }

    container.innerHTML = orders.map(order => `
        <div class="incoming-card" style="margin-bottom:12px;">
            <div class="inc-header">
                <span class="inc-id">${esc(order.orderId)}</span>
                <span class="inc-status" style="background:rgba(34,197,94,0.15);color:#22c55e;">✅ PAID</span>
            </div>
            <div class="inc-name">${esc(order.customerName || '—')}</div>
            <div class="inc-info">
                <div>📞 ${esc(order.phone || '—')}</div>
                <div>🚚 ${esc(order.deliveryType || '—')}</div>
                <div>📍 ${esc(order.deliveryAddress || '—')}</div>
                <div>🧾 ${esc(order.receiptNumber || '—')}</div>
            </div>
            <div class="inc-total">
                <span class="inc-total-label">TOTAL</span>
                <span class="inc-total-amount">TSh ${Number(order.totalAmount || 0).toLocaleString()}</span>
            </div>
            <div class="inc-actions">
                <button class="btn-view" onclick="viewOrder('${order.orderId}')">👁 View</button>
                <button class="btn-accept" onclick="openDeliveryModal('${order.orderId}')">🚚 Set Delivery</button>
            </div>
        </div>
    `).join('');
}

function renderDeliveredOrders(orders) {
    const container = document.getElementById('deliveredOrdersContainer');
    if (!container) return;

    if (orders.length === 0) {
        container.innerHTML = `<div class="empty-state"><span class="empty-icon">✅</span><div class="empty-title">No Delivered Orders</div></div>`;
        return;
    }

    container.innerHTML = orders.map(order => `
        <div class="incoming-card" style="margin-bottom:12px;">
            <div class="inc-header">
                <span class="inc-id">${esc(order.orderId)}</span>
                <span class="inc-status" style="background:rgba(34,197,94,0.15);color:#22c55e;">✅ DELIVERED</span>
            </div>
            <div class="inc-name">${esc(order.customerName || '—')}</div>
            <div class="inc-info">
                <div>📞 ${esc(order.phone || '—')}</div>
                <div>🧾 ${esc(order.receiptNumber || '—')}</div>
                <div>📅 ${order.deliveredAt ? new Date(order.deliveredAt).toLocaleDateString() : '—'}</div>
            </div>
            <div class="inc-actions">
                <button class="btn-view" onclick="viewOrder('${order.orderId}')">👁 View</button>
            </div>
        </div>
    `).join('');
}

function renderCustomerOrders(orders) {
    const container = document.getElementById('customerOrdersContainer');
    if (!container) return;

    if (orders.length === 0) {
        container.innerHTML = `<div class="empty-state"><span class="empty-icon">📭</span><div class="empty-title">No Customer Orders Yet</div><div class="empty-desc">Orders placed through the customer portal will appear here.</div></div>`;
        return;
    }

    container.innerHTML = orders.map(order => `
        <div class="incoming-card" style="margin-bottom:12px;">
            <div class="inc-header">
                <span class="inc-id">${esc(order.orderId)}</span>
                <span class="inc-status" style="background:rgba(107,125,63,0.15);color:#6b7d3f;">🌐 CUSTOMER PORTAL</span>
            </div>
            <div class="inc-name">${esc(order.customerName || '—')}</div>
            <div class="inc-info">
                <div>📞 ${esc(order.phone || '—')}</div>
                <div>📧 ${esc(order.email || '—')}</div>
                <div>📍 ${esc(order.district || '—')}, ${esc(order.region || '—')}</div>
                <div>📦 ${order.totalItems || (order.items || []).length || 0} items</div>
            </div>
            <div class="inc-total">
                <span class="inc-total-label">TOTAL</span>
                <span class="inc-total-amount">TSh ${Number(order.totalAmount || 0).toLocaleString()}</span>
            </div>
            <div class="inc-actions">
                <button class="btn-view" onclick="viewOrder('${order.orderId}')">👁 View</button>
                ${order.status === 'pending' ? `
                    <button class="btn-accept" onclick="openSendToFinanceModal('${order.orderId}')">📤 Send to Finance</button>
                    <button class="btn-reject" onclick="openRejectOrderModal('${order.orderId}')">❌ Reject</button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

function renderRejectedOrders(orders) {
    const container = document.getElementById('rejectedOrdersContainer');
    if (!container) return;

    if (orders.length === 0) {
        container.innerHTML = `<div class="empty-state"><span class="empty-icon">❌</span><div class="empty-title">No Rejected Orders</div></div>`;
        return;
    }

    container.innerHTML = orders.map(order => `
        <div class="incoming-card" style="margin-bottom:12px;">
            <div class="inc-header">
                <span class="inc-id">${esc(order.orderId)}</span>
                <span class="inc-status" style="background:rgba(239,68,68,0.15);color:#ef4444;">❌ REJECTED</span>
            </div>
            <div class="inc-name">${esc(order.customerName || '—')}</div>
            <div class="inc-info">
                <div>📞 ${esc(order.phone || '—')}</div>
                <div>📍 ${esc(order.district || '—')}, ${esc(order.region || '—')}</div>
            </div>
            ${order.rejectionReason ? `
                <div style="background:rgba(239,68,68,0.08); padding:10px 12px; border-radius:8px; border-left:3px solid #ef4444; margin-bottom:10px; font-size:12px; color:#7f1d1d;">
                    <strong>Reason:</strong> ${esc(order.rejectionReason)}
                </div>
            ` : ''}
            <div class="inc-total" style="background:linear-gradient(135deg,#dc2626 0%,#b91c1c 100%);">
                <span class="inc-total-label">TOTAL</span>
                <span class="inc-total-amount">TSh ${Number(order.totalAmount || 0).toLocaleString()}</span>
            </div>
            <div class="inc-actions">
                <button class="btn-view" onclick="viewOrder('${order.orderId}')">👁 View</button>
            </div>
        </div>
    `).join('');
}

function renderSelfPickupOrders(orders) {
    const container = document.getElementById('selfPickupContainer');
    if (!container) return;

    if (orders.length === 0) {
        container.innerHTML = `<div class="empty-state"><span class="empty-icon">🚗</span><div class="empty-title">No Self Pickup Orders</div></div>`;
        return;
    }

    container.innerHTML = orders.map(order => `
        <div class="incoming-card" style="margin-bottom:12px;">
            <div class="inc-header">
                <span class="inc-id">${esc(order.orderId)}</span>
                <span class="inc-status" style="background:rgba(139,92,246,0.15);color:#8b5cf6;">🚗 SELF PICKUP</span>
            </div>
            <div class="inc-name">${esc(order.customerName || '—')}</div>
            <div class="inc-info">
                <div>📞 ${esc(order.phone || '—')}</div>
                <div>📍 ${esc(order.district || '—')}, ${esc(order.region || '—')}</div>
                <div>🧾 ${esc(order.receiptNumber || '—')}</div>
                <div>📅 ${order.expectedDate ? new Date(order.expectedDate).toLocaleDateString() : '—'}</div>
            </div>
            <div class="inc-total" style="background:linear-gradient(135deg,#8b5cf6 0%,#7c3aed 100%);">
                <span class="inc-total-label">TOTAL</span>
                <span class="inc-total-amount">TSh ${Number(order.totalAmount || 0).toLocaleString()}</span>
            </div>
            <div class="inc-actions">
                <button class="btn-view" onclick="viewOrder('${order.orderId}')">👁 View</button>
            </div>
        </div>
    `).join('');
}

// ================================================================
// CREATE ORDER
// ================================================================
async function loadProductsForSales() {
    try {
        const products = await API.getProducts();
        currentProducts = products || [];
    } catch (err) {
        console.error('Failed to load products:', err);
        currentProducts = [];
    }
}

async function loadMarketingPlansForOrder() {
    const select = document.getElementById('orderMarketingPlan');
    if (!select) return;

    try {
        const response = await API.getMarketingPlans({ status: 'active' });
        const plans = response.plans || [];

        select.innerHTML = '<option value="">— No Campaign (Walk-in / Organic) —</option>';

        plans.forEach(plan => {
            const option = document.createElement('option');
            option.value = plan.id;
            option.textContent = `📊 ${plan.title} (${plan.progress}% progress)`;
            select.appendChild(option);
        });
    } catch (err) {
        console.error('Failed to load marketing plans:', err);
    }
}

function addItemRow() {
    const tbody = document.getElementById('itemsTableBody');
    if (!tbody) return;

    const rowId = 'sales-item-' + itemCounter;

    let options = '';
    if (currentProducts && currentProducts.length > 0) {
        options = currentProducts.map(p =>
            `<option value="${esc(p.name)}" data-price="${p.price}">${esc(p.name)} — TSh ${Number(p.price).toLocaleString()} ${p.unit ? '/ ' + p.unit.replace('per ', '') : ''}</option>`
        ).join('');
    }

    const row = document.createElement('tr');
    row.id = rowId;
    row.innerHTML = `
        <td>
            <select class="product-select" onchange="updateSalesTotals()" style="width:100%;padding:6px 10px;border:1.5px solid var(--gray-200);border-radius:4px;font-size:13px;font-family:inherit;background:var(--gray-50);">
                <option value="">-- Select Product --</option>
                ${options}
            </select>
        </td>
        <td>
            <input type="number" class="qty-input" min="1" value="1" onchange="updateSalesTotals()" oninput="updateSalesTotals()" style="width:100%;padding:6px 10px;border:1.5px solid var(--gray-200);border-radius:4px;font-size:13px;font-family:inherit;background:var(--gray-50);">
        </td>
        <td>
            <span class="item-subtotal" style="font-weight:700;color:var(--primary);">TSh 0</span>
        </td>
        <td>
            <button class="remove-item" onclick="removeSalesItemRow('${rowId}')" style="background:var(--red);color:white;border:none;border-radius:4px;padding:4px 10px;cursor:pointer;font-size:12px;">✕</button>
        </td>
    `;
    tbody.appendChild(row);
    itemCounter++;
}

function removeSalesItemRow(rowId) {
    const row = document.getElementById(rowId);
    if (row) {
        row.remove();
        updateSalesTotals();
    }
}

function updateSalesTotals() {
    const rows = document.querySelectorAll('#itemsTableBody tr');
    let totalItems = 0;
    let totalQuantity = 0;
    let grandTotal = 0;

    rows.forEach(row => {
        const select = row.querySelector('.product-select');
        const qtyInput = row.querySelector('.qty-input');
        const subtotalEl = row.querySelector('.item-subtotal');

        if (!subtotalEl) return;

        if (select && select.value) {
            const selectedOption = select.options[select.selectedIndex];
            const price = parseFloat(selectedOption.dataset.price) || 0;
            const qty = parseInt(qtyInput.value) || 0;
            const subtotal = price * qty;

            subtotalEl.textContent = `TSh ${subtotal.toLocaleString()}`;
            totalItems++;
            totalQuantity += qty;
            grandTotal += subtotal;
        } else {
            subtotalEl.textContent = 'TSh 0';
        }
    });

    setText('itemCount', totalItems);
    setText('totalQuantity', totalQuantity);
    setText('orderTotal', 'TSh ' + grandTotal.toLocaleString());
}

function selectSalesDelivery(label) {
    document.querySelectorAll('.delivery-radio').forEach(opt => opt.classList.remove('selected'));
    label.classList.add('selected');

    const radio = label.querySelector('input[type="radio"]');
    if (radio) radio.checked = true;
}

function clearOrderForm() {
    const fields = ['orderCustomerName', 'orderPhone', 'orderEmail', 'orderDeliveryAddress', 'orderExpectedDate', 'orderTimeSlot', 'orderNotes'];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    const region = document.getElementById('orderRegion');
    if (region) region.value = '';

    const district = document.getElementById('orderDistrict');
    if (district) district.innerHTML = '<option value="">-- Select District --</option>';

    const marketingPlan = document.getElementById('orderMarketingPlan');
    if (marketingPlan) marketingPlan.value = '';

    const tbody = document.getElementById('itemsTableBody');
    if (tbody) tbody.innerHTML = '';

    document.querySelectorAll('input[name="salesDeliveryType"]').forEach(r => r.checked = false);
    document.querySelectorAll('.delivery-radio').forEach(o => o.classList.remove('selected'));

    itemCounter = 0;
    addItemRow();
    updateSalesTotals();
}

async function submitSalesOrder() {
    const submitBtn = document.querySelector('button[onclick="submitSalesOrder()"]');
    
    const name = document.getElementById('orderCustomerName').value.trim();
    const phoneRaw = document.getElementById('orderPhone').value.trim();
    const phone = normalizePhone(phoneRaw);
    const email = document.getElementById('orderEmail').value.trim();
    const region = document.getElementById('orderRegion').value;
    const district = document.getElementById('orderDistrict').value;
    const deliveryAddress = document.getElementById('orderDeliveryAddress').value.trim();
    const expectedDate = document.getElementById('orderExpectedDate').value;
    const timeSlot = document.getElementById('orderTimeSlot').value;
    const notes = document.getElementById('orderNotes').value.trim();
    const deliveryType = document.querySelector('input[name="salesDeliveryType"]:checked');

    if (!name || !phone || !email) {
        alert('⚠️ Please fill in Name, Phone, and Email.');
        return;
    }
    if (!region || !district) {
        alert('⚠️ Please select Region and District.');
        return;
    }
    if (!deliveryType) {
        alert('⚠️ Please select a delivery type.');
        return;
    }

    const rows = document.querySelectorAll('#itemsTableBody tr');
    const items = [];

    rows.forEach(row => {
        const select = row.querySelector('.product-select');
        const qtyInput = row.querySelector('.qty-input');

        if (select && select.value) {
            const selectedOption = select.options[select.selectedIndex];
            const price = parseFloat(selectedOption.dataset.price) || 0;
            const qty = parseInt(qtyInput.value) || 0;

            if (qty > 0 && !isNaN(price) && price >= 0) {
                items.push({ productName: select.value, unitPrice: price, quantity: qty });
            }
        }
    });

    if (items.length === 0) {
        alert('⚠️ Please add at least one product.');
        return;
    }

    const original = setButtonLoading(submitBtn, '⏳ Saving...');

    try {
        const marketingPlanId = document.getElementById('orderMarketingPlan')?.value;

        const orderPayload = {
            customerName: name,
            phone,
            email,
            region,
            district,
            deliveryAddress: deliveryAddress || 'Self Pickup',
            deliveryType: deliveryType.value === 'company' ? 'Company Delivery' : 'Self Pickup',
            expectedDate: expectedDate || null,
            timeSlot: timeSlot || null,
            notes: notes || null,
            items,
            source: 'Sales Dashboard'
        };

        if (marketingPlanId) {
            orderPayload.marketingPlanId = parseInt(marketingPlanId);
        }

        const response = await API.createOrder(orderPayload);
        const createdOrder = response?.order || response?.data || response;
        const orderId = createdOrder?.orderId || createdOrder?.id || 'N/A';

        showToast('✅ Order created! Tracking: ' + orderId, 'success');
        clearOrderForm();

        Object.keys(sessionStorage).forEach(key => {
            if (key.startsWith('order_cache_')) sessionStorage.removeItem(key);
        });

        await loadSalesDashboard();

    } catch (err) {
        console.error('❌ Order creation failed:', err);
        showToast('❌ Failed: ' + err.message, 'error');
    } finally {
        restoreButton(submitBtn, original);
    }
}

// ================================================================
// SEND TO FINANCE
// ================================================================
let currentSendOrderId = null;

async function openSendToFinanceModal(orderId) {
    currentSendOrderId = orderId;

    let order = (allOrders || []).find(o => o.orderId === orderId);

    if (!order) {
        try {
            const rawOrder = await API.getOrder(orderId);
            order = rawOrder?.order || rawOrder?.data || rawOrder;
        } catch (err) {
            modernToast('Error', 'Order not found: ' + err.message, 'error');
            return;
        }
    }

    if (!order) {
        modernToast('Error', 'Order not found', 'error');
        return;
    }

    document.getElementById('sendFinanceOrderId').textContent = orderId;
    document.getElementById('sendFinanceCustomer').textContent = `${order.customerName || '—'} • ${order.phone || '—'}`;
    document.getElementById('sendFinanceAmount').textContent = 'TSh ' + Number(order.totalAmount || 0).toLocaleString();
    document.getElementById('sendFinanceNotesModern').value = '';

    const btn = document.getElementById('sendFinanceBtnModern');
    if (btn) {
        btn.disabled = false;
        btn.textContent = '📤 Send to Finance';
        btn.style.opacity = '';
        btn.style.cursor = '';
    }

    const modal = document.getElementById('sendToFinanceModalModern');
    if (modal) modal.classList.add('show');
}

function closeSendToFinanceModern() {
    document.getElementById('sendToFinanceModalModern').classList.remove('show');
}

async function confirmSendToFinanceModern() {
    const btn = document.getElementById('sendFinanceBtnModern');
    const notes = document.getElementById('sendFinanceNotesModern').value.trim();
    const original = setButtonLoading(btn, '⏳ Sending...');

    try {
        await API.sendOrderToFinance(currentSendOrderId, notes);
        
        closeSendToFinanceModern();
        modernToast('✅ Sent to Finance', 'Order sent successfully to Finance department.', 'success');
        
        setTimeout(() => loadSalesDashboard(), 500);

    } catch (err) {
        modernToast('Failed', err.message, 'error');
        restoreButton(btn, original);
    }
}

// ================================================================
// DELIVERY
// ================================================================
let currentDeliveryOrderId = null;

function openDeliveryModal(orderId) {
    currentDeliveryOrderId = orderId;

    const modal = document.getElementById('deliveryModal');
    if (!modal) {
        const modalHTML = `
            <div class="modal-overlay" id="deliveryModal">
                <div class="modal-box" style="max-width: 580px; padding: 0; overflow: hidden; max-height: 92vh; display: flex; flex-direction: column;">
                    <div style="background:linear-gradient(135deg,#22c55e 0%,#16a34a 100%); padding:20px 26px; color:white; display:flex; justify-content:space-between; align-items:center; flex-shrink:0;">
                        <div style="display:flex;align-items:center;gap:14px;">
                            <div style="width:48px;height:48px;border-radius:12px;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;font-size:24px;">🚚</div>
                            <div>
                                <h3 style="font-size:18px;font-weight:800;color:white;margin:0 0 2px 0;">Set Delivery</h3>
                                <p style="font-size:12px;color:rgba(255,255,255,0.85);margin:0;">Confirm delivery & dispatch</p>
                            </div>
                        </div>
                        <button onclick="closeModal('deliveryModal')" style="background:rgba(255,255,255,0.2);border:none;color:white;width:34px;height:34px;border-radius:50%;font-size:18px;cursor:pointer;">✕</button>
                    </div>
                    <div style="padding:22px 26px; overflow-y:auto; flex:1;">
                        <div style="background:rgba(34,197,94,0.06); border-left:4px solid #22c55e; border-radius:10px; padding:14px 18px; margin-bottom:18px;">
                            <div style="font-size:10px; color:#166534; text-transform:uppercase; letter-spacing:1.5px; font-weight:800; margin-bottom:4px;">Order</div>
                            <div style="font-family:monospace; font-size:15px; font-weight:800; color:#14532d;" id="deliveryOrderIdDisplay">—</div>
                        </div>

                        <label style="font-size:12px; font-weight:700; color:#334155; display:block; margin-bottom:6px;">Delivery Notes / Instructions</label>
                        <textarea id="deliveryNotesInput" placeholder="Delivery details, vehicle number, driver info..." style="width:100%; padding:12px 14px; border:1.5px solid #e5e7eb; border-radius:10px; font-size:13px; font-family:inherit; min-height:90px; resize:vertical; background:#f8fafc;"></textarea>

                        <label style="font-size:12px; font-weight:700; color:#334155; display:block; margin-top:14px; margin-bottom:6px;">Delivery Date</label>
                        <input type="date" id="deliveryDateInput" style="width:100%; padding:12px 14px; border:1.5px solid #e5e7eb; border-radius:10px; font-size:13px; font-family:inherit; background:#f8fafc;">

                        <label style="font-size:12px; font-weight:700; color:#334155; display:block; margin-top:14px; margin-bottom:6px;">Delivered By (Name)</label>
                        <input type="text" id="deliveredByInput" placeholder="Your name" value="${currentUser?.fullName || ''}" style="width:100%; padding:12px 14px; border:1.5px solid #e5e7eb; border-radius:10px; font-size:13px; font-family:inherit; background:#f8fafc;">

                        <div id="deliveryStatus" class="status-msg"></div>
                    </div>
                    <div style="padding:14px 26px; background:#f8fafc; border-top:1px solid #e5e7eb; display:flex; gap:12px; justify-content:flex-end; flex-shrink:0;">
                        <button onclick="closeModal('deliveryModal')" style="padding:11px 24px; background:#e5e7eb; color:#475569; border:none; border-radius:8px; font-weight:700; cursor:pointer; font-family:inherit; font-size:13px;">Cancel</button>
                        <button onclick="confirmDelivery(this)" style="padding:11px 24px; background:linear-gradient(135deg,#22c55e,#16a34a); color:white; border:none; border-radius:8px; font-weight:700; cursor:pointer; font-family:inherit; font-size:13px;">🚚 Mark Delivered</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    document.getElementById('deliveryOrderIdDisplay').textContent = orderId;
    document.getElementById('deliveryNotesInput').value = '';
    document.getElementById('deliveryDateInput').value = new Date().toISOString().split('T')[0];
    if (document.getElementById('deliveredByInput')) {
        document.getElementById('deliveredByInput').value = currentUser?.fullName || '';
    }
    document.getElementById('deliveryStatus').className = 'status-msg';
    document.getElementById('deliveryStatus').textContent = '';

    document.getElementById('deliveryModal').classList.add('show');
}

async function confirmDelivery(btn) {
    const deliveryInfo = document.getElementById('deliveryNotesInput').value.trim();
    const deliveryDate = document.getElementById('deliveryDateInput').value;
    const deliveredBy = document.getElementById('deliveredByInput')?.value.trim();
    const statusDiv = document.getElementById('deliveryStatus');

    let fullDeliveryInfo = deliveryInfo || '';
    if (deliveredBy) {
        fullDeliveryInfo = `Delivered by: ${deliveredBy}\n${fullDeliveryInfo}`.trim();
    }

    const original = setButtonLoading(btn, '⏳ Processing...');

    try {
        await API.setDeliveryInfo(currentDeliveryOrderId, {
            deliveryInfo: fullDeliveryInfo,
            deliveryDate: deliveryDate || null
        });
        await API.markOrderDelivered(currentDeliveryOrderId);

        sessionStorage.removeItem(`order_cache_${currentDeliveryOrderId}`);

        statusDiv.className = 'status-msg success';
        statusDiv.textContent = '✓ Order delivered!';
        showToast('✅ Order marked as delivered!', 'success');

        setTimeout(() => {
            closeModal('deliveryModal');
            loadSalesDashboard();
        }, 1000);

    } catch (err) {
        statusDiv.className = 'status-msg error';
        statusDiv.textContent = '⚠ ' + err.message;
        restoreButton(btn, original);
    }
}

// ================================================================
// REJECT ORDER
// ================================================================
let currentRejectOrderId = null;

function openRejectOrderModal(orderId) {
    currentRejectOrderId = orderId;

    document.getElementById('rejectOrderIdModern').textContent = orderId;
    document.getElementById('rejectReasonModern').value = '';

    const btn = document.getElementById('rejectOrderBtnModern');
    btn.disabled = false;
    btn.textContent = '❌ Reject Order';
    btn.style.opacity = '';
    btn.style.cursor = '';

    document.getElementById('rejectOrderModalModern').classList.add('show');
}

function closeRejectOrderModern() {
    document.getElementById('rejectOrderModalModern').classList.remove('show');
}

async function confirmRejectOrderModern() {
    const reason = document.getElementById('rejectReasonModern').value.trim();
    const btn = document.getElementById('rejectOrderBtnModern');

    if (!reason) {
        modernToast('Required', 'Please provide a rejection reason.', 'warning');
        document.getElementById('rejectReasonModern').focus();
        return;
    }

    const original = setButtonLoading(btn, '⏳ Rejecting...');

    try {
        await API.rejectOrder(currentRejectOrderId, reason);
        sessionStorage.removeItem(`order_cache_${currentRejectOrderId}`);
        
        closeRejectOrderModern();
        modernToast('Order Rejected', 'The order has been rejected.', 'warning');
        
        setTimeout(() => loadSalesDashboard(), 500);

    } catch (err) {
        modernToast('Failed', err.message, 'error');
        restoreButton(btn, original);
    }
}

// ================================================================
// EDIT ORDER
// ================================================================
let currentEditOrderId = null;
let editItemCounter = 0;

async function openEditOrderModal(orderId) {
    currentEditOrderId = orderId;

    try {
        const order = await API.getOrder(orderId);
        if (!order) {
            showToast('Order not found', 'error');
            return;
        }

        if (!currentProducts || currentProducts.length === 0) {
            await loadProductsForSales();
        }

        let modal = document.getElementById('editOrderModal');
        if (!modal) {
            const modalHTML = `
                <div class="modal-overlay" id="editOrderModal">
                    <div class="modal-box" style="max-width: 780px; padding: 0; overflow: hidden; max-height: 92vh; display: flex; flex-direction: column;">
                        <div style="background:linear-gradient(135deg,#3d5a3d 0%,#2a3d2a 100%); padding:20px 26px; color:white; display:flex; justify-content:space-between; align-items:center; flex-shrink:0;">
                            <div style="display:flex; align-items:center; gap:14px;">
                                <div style="width:48px; height:48px; border-radius:12px; background:rgba(255,255,255,0.15); display:flex; align-items:center; justify-content:center; font-size:24px;">🖋️</div>
                                <div>
                                    <h3 style="font-size:18px; font-weight:800; color:white; margin:0 0 2px 0;">Edit Order</h3>
                                    <p style="font-size:12px; color:rgba(255,255,255,0.75); margin:0;">Adjust items, prices, or specifications</p>
                                </div>
                            </div>
                            <button onclick="closeModal('editOrderModal')" style="background:rgba(255,255,255,0.15); border:none; color:white; width:34px; height:34px; border-radius:50%; font-size:18px; cursor:pointer;">✕</button>
                        </div>
                        <div style="padding:20px 26px; overflow-y:auto; flex:1;">
                            <div style="background:rgba(245,158,11,0.08); border-left:4px solid #f59e0b; border-radius:10px; padding:12px 16px; margin-bottom:18px;">
                                <div style="font-size:11px; color:#92400e; text-transform:uppercase; letter-spacing:1px; font-weight:800; margin-bottom:4px;">Order ID</div>
                                <div style="font-family:monospace; font-size:16px; font-weight:800; color:#78350f;" id="editOrderIdDisplay">—</div>
                            </div>
                            
                            <h4 style="font-size:13px; font-weight:800; color:#1a4d3c; text-transform:uppercase; letter-spacing:1px; margin-bottom:12px; padding-bottom:8px; border-bottom:2px solid #e5e7eb;">🛒 Order Items</h4>
                            
                            <table style="width:100%; border-collapse:collapse; margin-bottom:16px;">
                                <thead>
                                    <tr style="background:#f0f7f3;">
                                        <th style="padding:8px; text-align:left; font-size:11px; font-weight:800; color:#475569; text-transform:uppercase;">Product</th>
                                        <th style="padding:8px; text-align:left; font-size:11px; font-weight:800; color:#475569; text-transform:uppercase; width:100px;">Qty</th>
                                        <th style="padding:8px; text-align:left; font-size:11px; font-weight:800; color:#475569; text-transform:uppercase; width:130px;">Unit Price</th>
                                        <th style="padding:8px; text-align:right; font-size:11px; font-weight:800; color:#475569; text-transform:uppercase; width:130px;">Subtotal</th>
                                        <th style="width:50px;"></th>
                                    </tr>
                                </thead>
                                <tbody id="editItemsBody"></tbody>
                            </table>
                            
                            <button onclick="addEditItemRow()" style="padding:8px 18px; background:linear-gradient(135deg,#14b8a6,#0f766e); color:white; border:none; border-radius:8px; font-weight:700; font-size:12px; cursor:pointer; font-family:inherit; margin-bottom:18px;">➕ Add Item</button>
                            
                            <div style="background:#f0f7f3; border-radius:12px; padding:16px 20px; margin-bottom:18px; border:1.5px solid #d1e0d9;">
                                <div style="display:flex; justify-content:space-between; padding:6px 0; font-size:13px;">
                                    <span style="color:#475569;">Total Items:</span>
                                    <strong id="editTotalItems" style="color:#1a4d3c;">0</strong>
                                </div>
                                <div style="display:flex; justify-content:space-between; padding:6px 0; font-size:13px;">
                                    <span style="color:#475569;">Total Quantity:</span>
                                    <strong id="editTotalQty" style="color:#1a4d3c;">0</strong>
                                </div>
                                <div style="display:flex; justify-content:space-between; padding:12px 0 0; margin-top:8px; border-top:2px solid #c6a12a; font-size:18px;">
                                    <span style="font-weight:800; color:#1a4d3c;">GRAND TOTAL:</span>
                                    <strong id="editGrandTotal" style="color:#c6a12a; font-family:'Courier New',monospace;">TSh 0</strong>
                                </div>
                            </div>
                            
                            <h4 style="font-size:13px; font-weight:800; color:#1a4d3c; text-transform:uppercase; letter-spacing:1px; margin-bottom:12px; padding-bottom:8px; border-bottom:2px solid #e5e7eb;">📝 Notes</h4>
                            
                            <label style="font-size:12px; font-weight:600; color:#334155; display:block; margin-bottom:6px;">Sales Review Notes (Optional)</label>
                            <textarea id="editOrderNotes" placeholder="Any adjustments made..." style="width:100%; padding:10px 14px; border:1.5px solid #e5e7eb; border-radius:8px; font-size:13px; font-family:inherit; min-height:70px; resize:vertical;"></textarea>
                            
                            <div id="editOrderStatus" class="status-msg"></div>
                        </div>
                        <div style="padding:14px 26px; background:#f8fafc; border-top:1px solid #e5e7eb; display:flex; gap:12px; justify-content:flex-end; flex-shrink:0;">
                            <button onclick="closeModal('editOrderModal')" style="padding:11px 24px; background:#e5e7eb; color:#475569; border:none; border-radius:8px; font-weight:700; cursor:pointer; font-family:inherit; font-size:13px;">Cancel</button>
                            <button onclick="saveSalesEditedOrder(this)" style="padding:11px 24px; background:linear-gradient(135deg,#3d5a3d,#2a3d2a); color:white; border:none; border-radius:8px; font-weight:700; cursor:pointer; font-family:inherit; font-size:13px;">💾 Save Changes</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHTML);
        }

        document.getElementById('editOrderIdDisplay').textContent = orderId;
        document.getElementById('editOrderNotes').value = order.salesReviewNotes || '';
        document.getElementById('editOrderStatus').className = 'status-msg';
        document.getElementById('editOrderStatus').textContent = '';

        const tbody = document.getElementById('editItemsBody');
        tbody.innerHTML = '';
        editItemCounter = 0;

        (order.items || []).forEach(item => {
            addEditItemRow(item.productName, item.quantity, Number(item.unitPrice));
        });

        if (!order.items || order.items.length === 0) {
            addEditItemRow();
        }

        updateEditTotals();
        document.getElementById('editOrderModal').classList.add('show');

    } catch (err) {
        showToast('Failed: ' + err.message, 'error');
    }
}

function addEditItemRow(productName = '', qty = 1, unitPrice = 0) {
    const tbody = document.getElementById('editItemsBody');
    if (!tbody) return;

    const rowId = 'edit-item-' + editItemCounter++;

    let options = '';
    if (currentProducts && currentProducts.length > 0) {
        options = currentProducts.map(p =>
            `<option value="${esc(p.name)}" data-price="${p.price}" ${p.name === productName ? 'selected' : ''}>${esc(p.name)}</option>`
        ).join('');
    }

    const row = document.createElement('tr');
    row.id = rowId;
    row.style.borderBottom = '1px solid #e5e7eb';
    row.innerHTML = `
        <td style="padding:8px 6px;">
            <select class="edit-product-select" onchange="updateEditTotals()" style="width:100%; padding:7px 10px; border:1.5px solid #e5e7eb; border-radius:6px; font-size:12px; font-family:inherit; background:white;">
                <option value="">-- Select --</option>
                ${options}
            </select>
        </td>
        <td style="padding:8px 6px;">
            <input type="number" class="edit-qty-input" min="1" value="${qty}" onchange="updateEditTotals()" oninput="updateEditTotals()" style="width:100%; padding:7px 10px; border:1.5px solid #e5e7eb; border-radius:6px; font-size:12px; font-family:inherit; background:white;">
        </td>
        <td style="padding:8px 6px;">
            <input type="number" class="edit-price-input" min="0" value="${unitPrice}" onchange="updateEditTotals()" oninput="updateEditTotals()" style="width:100%; padding:7px 10px; border:1.5px solid #e5e7eb; border-radius:6px; font-size:12px; font-family:inherit; background:white;">
        </td>
        <td style="padding:8px 6px; text-align:right;">
            <span class="edit-subtotal" style="font-weight:700; color:#c6a12a; font-family:'Courier New',monospace; font-size:12px;">TSh 0</span>
        </td>
        <td style="padding:8px 6px;">
            <button onclick="removeEditItemRow('${rowId}')" style="background:#ef4444; color:white; border:none; border-radius:6px; padding:6px 10px; cursor:pointer; font-size:11px; font-weight:700;">✕</button>
        </td>
    `;
    tbody.appendChild(row);

    if (productName) {
        const select = row.querySelector('.edit-product-select');
        const priceInput = row.querySelector('.edit-price-input');
        if (select && !unitPrice) {
            const opt = Array.from(select.options).find(o => o.value === productName);
            if (opt) priceInput.value = opt.dataset.price || 0;
        }
    }

    updateEditTotals();
}

function removeEditItemRow(rowId) {
    const row = document.getElementById(rowId);
    if (row) {
        row.remove();
        updateEditTotals();
    }
}

function updateEditTotals() {
    const rows = document.querySelectorAll('#editItemsBody tr');
    let totalItems = 0;
    let totalQty = 0;
    let grandTotal = 0;

    rows.forEach(row => {
        const select = row.querySelector('.edit-product-select');
        const qtyInput = row.querySelector('.edit-qty-input');
        const priceInput = row.querySelector('.edit-price-input');
        const subtotalEl = row.querySelector('.edit-subtotal');

        if (!select || !subtotalEl) return;

        if (select.value && priceInput && !priceInput.value) {
            const opt = select.options[select.selectedIndex];
            priceInput.value = opt.dataset.price || 0;
        }

        if (select.value) {
            const qty = parseInt(qtyInput.value) || 0;
            const price = parseFloat(priceInput.value) || 0;
            const subtotal = qty * price;

            subtotalEl.textContent = `TSh ${subtotal.toLocaleString()}`;
            totalItems++;
            totalQty += qty;
            grandTotal += subtotal;
        }
    });

    document.getElementById('editTotalItems').textContent = totalItems;
    document.getElementById('editTotalQty').textContent = totalQty;
    document.getElementById('editGrandTotal').textContent = 'TSh ' + grandTotal.toLocaleString();
}

async function saveSalesEditedOrder(btn) {
    const statusDiv = document.getElementById('editOrderStatus');
    const notes = document.getElementById('editOrderNotes').value.trim();

    const rows = document.querySelectorAll('#editItemsBody tr');
    const items = [];

    rows.forEach(row => {
        const select = row.querySelector('.edit-product-select');
        const qtyInput = row.querySelector('.edit-qty-input');
        const priceInput = row.querySelector('.edit-price-input');

        if (select && select.value) {
            const qty = parseInt(qtyInput.value) || 0;
            const price = parseFloat(priceInput.value) || 0;

            if (qty > 0) {
                items.push({ productName: select.value, unitPrice: price, quantity: qty });
            }
        }
    });

    if (items.length === 0) {
        statusDiv.className = 'status-msg error';
        statusDiv.textContent = '⚠ At least one item is required.';
        return;
    }

    const original = setButtonLoading(btn, '⏳ Saving...');

    try {
        await API.salesEditOrder(currentEditOrderId, { items, notes });
        sessionStorage.removeItem(`order_cache_${currentEditOrderId}`);

        statusDiv.className = 'status-msg success';
        statusDiv.textContent = '✓ Order updated!';
        showToast('✅ Order updated!', 'success');

        setTimeout(() => {
            closeModal('editOrderModal');
            loadSalesDashboard();
        }, 1000);

    } catch (err) {
        statusDiv.className = 'status-msg error';
        statusDiv.textContent = '⚠ ' + err.message;
        restoreButton(btn, original);
    }
}

// ================================================================
// VIEW ORDER
// ================================================================
async function viewOrder(orderId) {
    const modal = document.getElementById('viewOrderModal');
    const body = document.getElementById('viewOrderBody');
    const title = document.getElementById('viewOrderTitleId');
    const statusPill = document.getElementById('viewOrderStatusPill');

    if (title) title.textContent = orderId;
    if (modal) modal.classList.add('show');

    const cacheKey = `order_cache_${orderId}`;
    const cached = sessionStorage.getItem(cacheKey);

    if (cached) {
        try {
            const order = JSON.parse(cached);
            const cacheAge = Date.now() - order._cachedAt;
            if (cacheAge < 2 * 60 * 1000) {
                renderOrderView(order);
                return;
            }
        } catch (e) {}
    }

    if (body) {
        body.innerHTML = `
            <div style="text-align:center; padding:60px 20px;">
                <div style="display:inline-block; width:48px; height:48px; border:4px solid #e5e7eb; border-top-color:#0f766e; border-radius:50%; animation: spin 0.8s linear infinite;"></div>
                <div style="margin-top:16px; color:#64748b; font-size:13px; font-weight:600;">⏳ Loading order details...</div>
            </div>
            <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
        `;
    }

    if (statusPill) {
        statusPill.textContent = 'LOADING...';
        statusPill.style.cssText = 'background:#94a3b8;color:white;';
    }

    try {
        const order = await API.getOrder(orderId);
        if (!order) {
            if (body) body.innerHTML = '<div style="text-align:center;padding:40px;color:#ef4444;">❌ Order not found</div>';
            return;
        }

        order._cachedAt = Date.now();
        sessionStorage.setItem(cacheKey, JSON.stringify(order));

        renderOrderView(order);

    } catch (err) {
        if (body) {
            body.innerHTML = `
                <div style="text-align:center; padding:40px 20px; color:#ef4444;">
                    <div style="font-size:40px; margin-bottom:12px;">❌</div>
                    <div style="font-weight:700; margin-bottom:6px;">Failed to Load Order</div>
                    <div style="font-size:12px; color:#94a3b8;">${esc(err.message)}</div>
                </div>
            `;
        }
        showToast('Failed: ' + err.message, 'error');
    }
}

function renderOrderView(order) {
    const body = document.getElementById('viewOrderBody');
    const statusPill = document.getElementById('viewOrderStatusPill');

    if (statusPill) {
        statusPill.textContent = (order.status || 'pending').toUpperCase();
        const colors = {
            'pending': 'background:#f59e0b;color:white;',
            'ready-for-finance': 'background:#14b8a6;color:white;',
            'awaiting-payment': 'background:#f59e0b;color:white;',
            'postpaid-approved': 'background:#4f46e5;color:white;',
            'paid': 'background:#22c55e;color:white;',
            'delivered': 'background:#22c55e;color:white;',
            'completed': 'background:#16a34a;color:white;',
            'rejected': 'background:#ef4444;color:white;'
        };
        statusPill.style.cssText = colors[order.status] || 'background:#f59e0b;color:white;';
    }

    if (!body) return;

    const itemsHtml = (order.items || []).map(item => `
        <div class="order-item-row">
            <span class="item-name"><span class="item-qty">${item.quantity}×</span>${esc(item.productName)}</span>
            <span class="item-price">TSh ${Number(item.subtotal || 0).toLocaleString()}</span>
        </div>
    `).join('') || '<div style="padding:10px;color:var(--gray-400);text-align:center;">No items</div>';

    body.innerHTML = `
        <div class="order-section">
            <div class="order-section-title">👤 Customer Information</div>
            <div class="order-info-grid">
                <div class="order-info-item"><span class="label">Name</span><span class="value">${esc(order.customerName || '—')}</span></div>
                <div class="order-info-item"><span class="label">Phone</span><span class="value">${esc(order.phone || '—')}</span></div>
                <div class="order-info-item"><span class="label">Email</span><span class="value">${esc(order.email || '—')}</span></div>
                <div class="order-info-item"><span class="label">Location</span><span class="value">${esc(order.region || '—')}, ${esc(order.district || '—')}</span></div>
                <div class="order-info-item"><span class="label">Source</span><span class="value">${esc(order.source || '—')}</span></div>
                <div class="order-info-item"><span class="label">Payment Type</span><span class="value">${esc(order.paymentType || '—')}</span></div>
            </div>
        </div>
        <div class="order-section">
            <div class="order-section-title">🛒 Order Items</div>
            <div class="order-items-list">${itemsHtml}</div>
            <div class="order-grand-total">
                <span class="label">Grand Total</span>
                <span class="amount">TSh ${Number(order.totalAmount || 0).toLocaleString()}</span>
            </div>
        </div>
        ${order.receiptNumber ? `
        <div class="order-section">
            <div class="order-section-title">🧾 Receipt</div>
            <div style="background:rgba(34,197,94,0.08);padding:12px;border-radius:8px;border-left:4px solid #22c55e;">
                <strong style="font-family:monospace;color:#16a34a;">${esc(order.receiptNumber)}</strong>
            </div>
        </div>
        ` : ''}
    `;
}

// ================================================================
// PRODUCTS MANAGEMENT
// ================================================================
let currentSalesProductId = null;
let salesProductPhoto = '';

async function loadSalesProducts() {
    const container = document.getElementById('salesProductListContainer');
    if (!container) return;

    container.innerHTML = '<div class="empty-state"><span class="empty-icon">⏳</span><div class="empty-title">Loading products...</div></div>';

    try {
        const products = await API.getProductsAdmin();

        if (!products || products.length === 0) {
            container.innerHTML = `<div class="empty-state"><span class="empty-icon">📦</span><div class="empty-title">No Products Found</div></div>`;
            return;
        }

        container.innerHTML = `
            <table class="orders-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Product</th>
                        <th>Category</th>
                        <th>Price</th>
                        <th>Stock</th>
                        <th>Status</th> 
                        <th>Sales Ready</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${products.map((p, index) => `
                        <tr>
                            <td><strong>${String(index + 1).padStart(2, '0')}</strong></td>
                            <td>
                                <div style="display:flex;align-items:center;gap:10px;">
                                    ${p.image
                                        ? `<img src="${p.image}" style="width:40px;height:40px;border-radius:8px;object-fit:cover;">`
                                        : `<div style="width:40px;height:40px;border-radius:8px;background:var(--gray-100);display:flex;align-items:center;justify-content:center;font-size:18px;">📦</div>`
                                    }
                                    <div>
                                        <div style="font-weight:700;">${esc(p.name)}</div>
                                        <div style="font-size:11px;color:var(--gray-500);">${esc(p.tag || '')}</div>
                                    </div>
                                </div>
                            </td>
                            <td><span style="padding:3px 10px;border-radius:12px;font-size:10px;font-weight:700;background:rgba(61,90,61,0.15);color:var(--primary);">${esc(p.category || 'N/A')}</span></td>
                            <td><strong>TSh ${Number(p.price).toLocaleString()}</strong> <small style="color:var(--gray-500);">${esc(p.unit)}</small></td>
                            <td>${p.stock}</td>
                            <td>
                                <span style="padding:3px 10px;border-radius:12px;font-size:10px;font-weight:700;background:${p.isActive ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'};color:${p.isActive ? '#22c55e' : '#ef4444'};">
                                    ${p.isActive ? 'ACTIVE' : 'INACTIVE'}
                                </span>
                            </td>
                            <td>
                                <span style="padding:3px 10px;border-radius:12px;font-size:10px;font-weight:700;background:${p.availableForSale ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)'};color:${p.availableForSale ? '#22c55e' : '#f59e0b'};">
                                    ${p.availableForSale ? '✅ READY' : '⏳ PENDING'}
                                </span>
                            </td>
                            <td>
                                <button onclick="openSalesEditProductModal(${p.id})" style="padding:5px 10px;background:linear-gradient(135deg,#3b82f6,#2563eb);color:white;border:none;border-radius:6px;cursor:pointer;font-size:11px;font-weight:700;margin-right:4px;">🖋️</button>
                                <button onclick="deleteSalesProduct(${p.id}, '${esc(p.name)}')" style="padding:5px 10px;background:linear-gradient(135deg,#ef4444,#dc2626);color:white;border:none;border-radius:6px;cursor:pointer;font-size:11px;font-weight:700;">🗑️</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

    } catch (err) {
        container.innerHTML = `<div class="empty-state"><span class="empty-icon">❌</span><div class="empty-title">Failed to Load Products</div><div class="empty-desc">${esc(err.message)}</div></div>`;
    }
}

function openSalesProductModal() {
    currentSalesProductId = null;
    salesProductPhoto = '';

    setText('salesProductModalTitle', '📦 Add Product');
    const fields = ['spName', 'spPrice', 'spTag', 'spDescription', 'spImage'];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    if (document.getElementById('spUnit')) document.getElementById('spUnit').value = 'per piece';
    if (document.getElementById('spCategory')) document.getElementById('spCategory').value = '';
    if (document.getElementById('spStock')) document.getElementById('spStock').value = '0';
    if (document.getElementById('spOrder')) document.getElementById('spOrder').value = '0';
    if (document.getElementById('spIsActive')) document.getElementById('spIsActive').value = 'true';
    if (document.getElementById('spPhotoPreview')) document.getElementById('spPhotoPreview').innerHTML = '<span>📦</span>';

    const status = document.getElementById('spStatus');
    if (status) { status.className = 'status-msg'; status.textContent = ''; }

    document.getElementById('salesProductModal').classList.add('show');
}

async function openSalesEditProductModal(id) {
    currentSalesProductId = id;

    try {
        const products = await API.getProductsAdmin();
        const product = products.find(p => p.id === id);

        if (!product) { showToast('Product not found', 'error'); return; }

        setText('salesProductModalTitle', '🖋️ Edit Product');
        if (document.getElementById('spName')) document.getElementById('spName').value = product.name;
        if (document.getElementById('spPrice')) document.getElementById('spPrice').value = product.price;
        if (document.getElementById('spUnit')) document.getElementById('spUnit').value = product.unit;
        if (document.getElementById('spCategory')) document.getElementById('spCategory').value = product.category || '';
        if (document.getElementById('spTag')) document.getElementById('spTag').value = product.tag || '';
        if (document.getElementById('spStock')) document.getElementById('spStock').value = product.stock;
        if (document.getElementById('spOrder')) document.getElementById('spOrder').value = product.order;
        if (document.getElementById('spIsActive')) document.getElementById('spIsActive').value = product.isActive ? 'true' : 'false';
        if (document.getElementById('spDescription')) document.getElementById('spDescription').value = product.description || '';
        if (document.getElementById('spImage')) document.getElementById('spImage').value = product.image || '';
        salesProductPhoto = product.image || '';

        const preview = document.getElementById('spPhotoPreview');
        if (preview) {
            if (product.image) {
                preview.innerHTML = `<img src="${product.image}" style="width:100%;height:100%;object-fit:cover;">`;
            } else {
                preview.innerHTML = '<span>📦</span>';
            }
        }

        const status = document.getElementById('spStatus');
        if (status) { status.className = 'status-msg'; status.textContent = ''; }

        document.getElementById('salesProductModal').classList.add('show');

    } catch (err) {
        showToast('Failed to load product: ' + err.message, 'error');
    }
}

function handleSalesProductPhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
        showToast('Image too large (max 2MB)', 'error');
        event.target.value = '';
        return;
    }
    if (!file.type.startsWith('image/')) {
        showToast('Please select an image', 'error');
        event.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        salesProductPhoto = e.target.result;
        if (document.getElementById('spImage')) document.getElementById('spImage').value = salesProductPhoto;
        if (document.getElementById('spPhotoPreview')) {
            document.getElementById('spPhotoPreview').innerHTML = `<img src="${salesProductPhoto}" style="width:100%;height:100%;object-fit:cover;">`;
        }
    };
    reader.readAsDataURL(file);
}

function removeSalesProductPhoto() {
    salesProductPhoto = '';
    if (document.getElementById('spImage')) document.getElementById('spImage').value = '';
    if (document.getElementById('spPhotoInput')) document.getElementById('spPhotoInput').value = '';
    if (document.getElementById('spPhotoPreview')) document.getElementById('spPhotoPreview').innerHTML = '<span>📦</span>';
}

async function saveSalesProduct() {
    const statusDiv = document.getElementById('spStatus');
    const saveBtn = document.getElementById('spSaveBtn');

    const data = {
        name: document.getElementById('spName')?.value.trim() || '',
        description: document.getElementById('spDescription')?.value.trim() || '',
        price: parseFloat(document.getElementById('spPrice')?.value) || 0,
        unit: document.getElementById('spUnit')?.value || 'per piece',
        category: document.getElementById('spCategory')?.value || '',
        tag: document.getElementById('spTag')?.value.trim() || '',
        image: document.getElementById('spImage')?.value || '',
        stock: parseInt(document.getElementById('spStock')?.value) || 0,
        order: parseInt(document.getElementById('spOrder')?.value) || 0,
        isActive: document.getElementById('spIsActive')?.value === 'true'
    };

    if (!data.name || !data.price) {
        statusDiv.className = 'status-msg error';
        statusDiv.textContent = '⚠ Name and Price are required';
        return;
    }

    const original = setButtonLoading(saveBtn, '⏳ Saving...');

    try {
        if (currentSalesProductId) {
            await API.updateProduct(currentSalesProductId, data);
            showToast('✅ Product updated!', 'success');
        } else {
            await API.createProduct(data);
            showToast('✅ Product created!', 'success');
        }

        statusDiv.className = 'status-msg success';
        statusDiv.textContent = '✓ Saved successfully!';

        setTimeout(() => {
            closeModal('salesProductModal');
            loadSalesProducts();
        }, 800);

    } catch (err) {
        statusDiv.className = 'status-msg error';
        statusDiv.textContent = '⚠ ' + err.message;
        showToast('Failed to save', 'error');
    } finally {
        restoreButton(saveBtn, original);
    }
}

async function deleteSalesProduct(id, name) {
    const confirmed = confirm(`Delete product "${name}"? This cannot be undone.`);
    if (!confirmed) return;
    
    try {
        await API.deleteProduct(id);
        showToast('Product deleted successfully', 'success');
        loadSalesProducts();
    } catch (err) {
        showToast('Failed to delete: ' + err.message, 'error');
    }
}

// ================================================================
// REFRESH
// ================================================================
function refreshAll() {
    Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('order_cache_')) sessionStorage.removeItem(key);
    });
    loadSalesDashboard();
    showToast('🔄 Refreshed! Cache cleared.', 'info');
}

// ================================================================
// STUB FUNCTIONS
// ================================================================
function switchTab(tabId) { switchSidebarTab(tabId); }

function switchSubTab(subTabId) {
    document.querySelectorAll('.sub-tab-content').forEach(sub => sub.classList.remove('active'));
    const target = document.getElementById(subTabId);
    if (target) target.classList.add('active');

    document.querySelectorAll('.sub-tab-btn').forEach(btn => btn.classList.remove('active'));
    const targetBtn = document.querySelector(`.sub-tab-btn[data-subtab="${subTabId}"]`);
    if (targetBtn) targetBtn.classList.add('active');

    if (subTabId === 'sub-create-order') {
        loadProductsForSales().then(() => {
            const tbody = document.getElementById('itemsTableBody');
            if (tbody && tbody.children.length === 0) {
                itemCounter = 0;
                addItemRow();
            }
        });
    }
}

// ================================================================
// MY BUDGET — Sales & Marketing Department View
// ================================================================
let currentDeptBudget = null;
let bdActivityCounter = 0;

const STANDARD_ACTIVITIES = [
    "Safari / Field Work",
    "Mafunzo (Training)",
    "Ujenzi / Renovation",
    "Ununuzi wa Vifaa",
    "Matengenezo (Maintenance)",
    "Uendeshaji (Operations)",
    "Masoko (Marketing)",
    "Ushauri (Consultancy)",
    "Nyingine (Other)"
];

const STANDARD_ITEMS = [
    "Perdiem (Posho ya Safari)",
    "Mafuta (Fuel)",
    "Extraduty Allowance",
    "Kodi ya Gari (Car Hire)",
    "Nauli (Transport)",
    "Malazi (Accommodation)",
    "Chakula (Meals)",
    "Saruji (Cement)",
    "Mbao (Timber)",
    "Misumari (Nails)",
    "Rangi (Paint)",
    "Umeme (Electricity)",
    "Maji (Water)",
    "Karatasi (Stationery)",
    "Wino (Ink)",
    "Vifaa vya Ofisi",
    "Nyingine (Other)"
];

async function loadMyBudget() {
    const container = document.getElementById('myBudgetContent');
    const badge = document.getElementById('myBudgetStatusBadge');
    
    if (!container) return;

    container.innerHTML = `<div style="text-align:center;padding:40px;color:#64748b;">⏳ Loading budget...</div>`;

    try {
        const user = Auth.getUser();
        const departmentName = user?.department || user?.departmentName;

        if (!departmentName) {
            container.innerHTML = `<div style="text-align:center;padding:40px;"><div style="font-size:40px;margin-bottom:10px;">⚠️</div><div style="font-weight:800;color:#64748b;">No Department Assigned</div></div>`;
            if (badge) badge.textContent = '—';
            return;
        }

        const budgets = await API.getMasterBudgets();
        
        const myBudgets = (budgets || []).filter(b => 
            b.allocations && b.allocations.some(a => a.department === departmentName)
        );

        if (myBudgets.length === 0) {
            container.innerHTML = `
                <div style="text-align:center;padding:50px 20px;">
                    <div style="font-size:56px;margin-bottom:14px;opacity:0.6;">💰</div>
                    <div style="font-size:17px;font-weight:800;color:#334155;margin-bottom:6px;">No Budget Assigned Yet</div>
                    <div style="font-size:13px;color:#64748b;">Your department (<strong>${esc(departmentName)}</strong>) has not been allocated a budget yet.</div>
                </div>`;
            if (badge) badge.textContent = '—';
            return;
        }

        const latest = myBudgets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
        const myAllocation = latest.allocations.find(a => a.department === departmentName);
        
        currentDeptBudget = { ...latest, myAllocation };

        const allocStatus = myAllocation.status;
        let badgeText = '';
        let buttonHtml = '';

        if (allocStatus === 'draft') {
            badgeText = '📝 Draft Saved';
            buttonHtml = `<button onclick="openBudgetBreakdownPage()" style="padding:12px 24px; background:linear-gradient(135deg,#c9a227,#e0b93a); color:#2a3d2a; border:none; border-radius:10px; font-weight:800; cursor:pointer; font-family:inherit; font-size:13px; box-shadow:0 4px 12px rgba(201,162,39,0.3);">✏️ Continue Draft</button>`;
        } 
        else if (allocStatus === 'submitted' || allocStatus === 'approved') {
            badgeText = '✅ Submitted';
            buttonHtml = `
                <button onclick="viewSubmittedBreakdown()" style="padding:12px 24px; background:linear-gradient(135deg,#3d5a3d,#2a3d2a); color:white; border:none; border-radius:10px; font-weight:800; cursor:pointer; font-family:inherit; font-size:13px; border: 1.5px solid #c9a227;">👁️ View Details</button>
                <span style="display:inline-flex; align-items:center; padding:0 16px; background:#f1f5f9; color:#94a3b8; border-radius:10px; font-weight:800; font-size:12px; margin-left:8px;">🔒 Locked</span>
            `;
        }
        else {
            badgeText = '⏳ Action Required';
            buttonHtml = `<button onclick="openBudgetBreakdownPage()" style="padding:12px 24px; background:linear-gradient(135deg,#3d5a3d,#2a3d2a); color:white; border:none; border-radius:10px; font-weight:800; cursor:pointer; font-family:inherit; font-size:13px; border: 1.5px solid #c9a227;">➕ Prepare Breakdown</button>`;
        }

        if (allocStatus === 'approved' || allocStatus === 'submitted') {
            buttonHtml += `<button onclick="openMyDeptBudgetBook()" style="padding:12px 24px; background:linear-gradient(135deg,#16a34a,#15803d); color:white; border:none; border-radius:10px; font-weight:800; cursor:pointer; font-family:inherit; font-size:13px; margin-left:8px; box-shadow:0 4px 12px rgba(22,163,74,0.3);">📖 Open Budget Book</button>`;
        }

        if (badge) badge.textContent = badgeText;

        const isSubmitted = allocStatus === 'submitted' || allocStatus === 'approved';
        
        container.innerHTML = `
            <div style="background:linear-gradient(135deg, #3d5a3d, #2a3d2a); padding:24px 28px; border-radius:14px; color:white; margin-bottom:20px; border-left: 5px solid #c9a227;">
                <div style="font-size:11px; font-weight:800; color:rgba(255,255,255,0.6); text-transform:uppercase; letter-spacing:1.5px; margin-bottom:6px;">Ceiling Allocated</div>
                <div style="font-size:32px; font-weight:900; font-family:'Courier New',monospace; color:#e0b93a;">TSh ${Number(myAllocation.ceilingAmount).toLocaleString()}</div>
                <div style="font-size:12px; color:rgba(255,255,255,0.7); margin-top:8px;">${esc(latest.title)} • ${esc(latest.period)}</div>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:20px;">
                <div style="background:#f7f8f5; border-radius:10px; padding:16px; border:1px solid #dde1d6; border-left: 4px solid #3d5a3d;">
                    <div style="font-size:10px; font-weight:800; color:#6e7a5e; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">Status</div>
                    <div style="font-size:14px; font-weight:800; color:${isSubmitted ? '#22c55e' : allocStatus === 'draft' ? '#f59e0b' : '#6e7a5e'};">
                        ${isSubmitted ? '✅ Submitted' : allocStatus === 'draft' ? '📝 Draft Saved' : '⏳ Pending'}
                    </div>
                </div>
                <div style="background:#f7f8f5; border-radius:10px; padding:16px; border:1px solid #dde1d6; border-left: 4px solid #c9a227;">
                    <div style="font-size:10px; font-weight:800; color:#6e7a5e; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">Activities</div>
                    <div style="font-size:14px; font-weight:800; color:#252a1e;">${(myAllocation.items || []).length} items listed</div>
                </div>
            </div>

            <div style="display:flex; gap:10px; flex-wrap:wrap;">
                ${buttonHtml}
            </div>
        `;

    } catch (err) {
        container.innerHTML = `<div style="text-align:center;padding:40px;color:#dc2626;">❌ ${esc(err.message)}</div>`;
    }
}

function openBudgetBreakdownPage() {
    if (!currentDeptBudget) {
        showToast('⚠ No budget loaded', 'error');
        return;
    }

    const { myAllocation, title, period } = currentDeptBudget;
    
    document.getElementById('bdTitle').textContent = title;
    document.getElementById('bdMeta').textContent = `${period} • ${myAllocation.department}`;
    document.getElementById('bdCeiling').textContent = 'TSh ' + Number(myAllocation.ceilingAmount).toLocaleString();

    document.getElementById('myBudgetContent').parentElement.style.display = 'none';
    document.getElementById('budgetBreakdownPage').style.display = 'block';

    const container = document.getElementById('bdActivitiesList');
    container.innerHTML = '';
    bdActivityCounter = 0;

    if (myAllocation.items && myAllocation.items.length > 0) {
        const grouped = {};
        myAllocation.items.forEach(item => {
            const key = item.activityName || 'Unnamed Activity';
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(item);
        });

        Object.keys(grouped).forEach(activityName => {
            addNewActivity(activityName, grouped[activityName]);
        });
    } else {
        addNewActivity();
    }

    updateGrandTotal();
}

function closeBudgetBreakdownPage() {
    document.getElementById('budgetBreakdownPage').style.display = 'none';
    document.getElementById('myBudgetContent').parentElement.style.display = 'block';
}

function addNewActivity(activityName = '', items = []) {
    const container = document.getElementById('bdActivitiesList');
    const activityId = 'bd-activity-' + (bdActivityCounter++);

    const activityOptions = STANDARD_ACTIVITIES.map(act => 
        `<option value="${act}" ${act === activityName ? 'selected' : ''}>${act}</option>`
    ).join('');

    const activityHtml = `
        <div id="${activityId}" style="background:white; border-radius:14px; border:1.5px solid #dde1d6; margin-bottom:16px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.04); border-left: 4px solid #3d5a3d;">
            <div style="background:#f7f8f5; padding:16px 20px; border-bottom:1px solid #dde1d6; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
                <div style="flex:1; min-width:250px;">
                    <label style="font-size:10px; font-weight:800; color:#6e7a5e; text-transform:uppercase; letter-spacing:1px; display:block; margin-bottom:6px;">Activity / Kipengele</label>
                    <select class="bd-activity-name" style="width:100%; padding:10px 14px; border:1.5px solid #c4cab8; border-radius:8px; font-size:14px; font-weight:700; font-family:inherit; background:white; outline:none;">
                        ${activityOptions}
                        <option value="__custom__" ${!STANDARD_ACTIVITIES.includes(activityName) ? 'selected' : ''}>Nyingine (Andika Mwenyewe)...</option>
                    </select>
                    <input type="text" class="bd-activity-custom" value="${!STANDARD_ACTIVITIES.includes(activityName) ? esc(activityName) : ''}" placeholder="Andika jina la Activity..." style="display:${!STANDARD_ACTIVITIES.includes(activityName) ? 'block' : 'none'}; width:100%; padding:10px 14px; border:1.5px solid #c4cab8; border-radius:8px; font-size:14px; font-weight:700; font-family:inherit; margin-top:8px; outline:none;">
                </div>
                <div style="text-align:right;">
                    <div style="font-size:10px; font-weight:800; color:#6e7a5e; text-transform:uppercase; letter-spacing:1px;">Activity Total</div>
                    <div class="bd-activity-total" style="font-size:20px; font-weight:900; color:#3d5a3d; font-family:'Courier New',monospace;">TSh 0</div>
                </div>
                <button onclick="document.getElementById('${activityId}').remove(); updateGrandTotal();" style="padding:8px 14px; background:rgba(239,68,68,0.1); color:#dc2626; border:none; border-radius:8px; font-weight:700; cursor:pointer; font-family:inherit; font-size:12px;">🗑️ Remove</button>
            </div>

            <div style="padding:16px 20px;">
                <table style="width:100%; border-collapse:collapse; font-size:13px;">
                    <thead>
                        <tr style="background:#f7f8f5;">
                            <th style="padding:10px; text-align:left; font-size:10px; font-weight:800; color:#6e7a5e; text-transform:uppercase; border-bottom:1px solid #dde1d6;">Item</th>
                            <th style="padding:10px; text-align:left; font-size:10px; font-weight:800; color:#6e7a5e; text-transform:uppercase; border-bottom:1px solid #dde1d6; width:80px;">Qty</th>
                            <th style="padding:10px; text-align:left; font-size:10px; font-weight:800; color:#6e7a5e; text-transform:uppercase; border-bottom:1px solid #dde1d6; width:90px;">Unit</th>
                            <th style="padding:10px; text-align:left; font-size:10px; font-weight:800; color:#6e7a5e; text-transform:uppercase; border-bottom:1px solid #dde1d6; width:130px;">Unit Price</th>
                            <th style="padding:10px; text-align:right; font-size:10px; font-weight:800; color:#6e7a5e; text-transform:uppercase; border-bottom:1px solid #dde1d6; width:130px;">Subtotal</th>
                            <th style="width:40px; border-bottom:1px solid #dde1d6;"></th>
                        </tr>
                    </thead>
                    <tbody class="bd-items-body"></tbody>
                </table>
                <button onclick="addItemToActivity('${activityId}')" style="margin-top:12px; padding:8px 16px; background:rgba(201,162,39,0.15); color:#8a7019; border:1px solid rgba(201,162,39,0.3); border-radius:8px; font-weight:700; cursor:pointer; font-family:inherit; font-size:12px;">➕ Add Item</button>
            </div>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', activityHtml);

    const activitySelect = document.querySelector(`#${activityId} .bd-activity-name`);
    const activityCustom = document.querySelector(`#${activityId} .bd-activity-custom`);
    if (activitySelect && activityCustom) {
        activitySelect.addEventListener('change', function() {
            if (this.value === '__custom__') {
                activityCustom.style.display = 'block';
                activityCustom.focus();
            } else {
                activityCustom.style.display = 'none';
                activityCustom.value = '';
            }
        });
    }

    const activityEl = document.getElementById(activityId);
    const tbody = activityEl.querySelector('.bd-items-body');
    
    if (items.length > 0) {
        items.forEach(item => {
            addItemRowToTable(tbody, item.itemName, item.quantity, item.unit, item.unitPrice);
        });
    } else {
        addItemRowToTable(tbody);
    }

    updateActivityTotal(activityId);
}

function addItemToActivity(activityId) {
    const activityEl = document.getElementById(activityId);
    if (!activityEl) return;
    const tbody = activityEl.querySelector('.bd-items-body');
    addItemRowToTable(tbody);
    updateActivityTotal(activityId);
}

function addItemRowToTable(tbody, itemName = '', quantity = '', unit = 'pcs', unitPrice = '') {
    const row = document.createElement('tr');
    row.style.borderBottom = '1px solid #f1f5f9';

    const itemOptions = STANDARD_ITEMS.map(item => 
        `<option value="${item}" ${item === itemName ? 'selected' : ''}>${item}</option>`
    ).join('');

    row.innerHTML = `
        <td style="padding:8px 6px;">
            <select class="bd-item-name" style="width:100%; padding:8px 10px; border:1.5px solid #dde1d6; border-radius:6px; font-size:12px; font-family:inherit; background:white; outline:none;">
                <option value="">-- Chagua Item --</option>
                ${itemOptions}
                <option value="__custom__" ${itemName && !STANDARD_ITEMS.includes(itemName) ? 'selected' : ''}>Nyingine (Andika)...</option>
            </select>
            <input type="text" class="bd-item-custom" value="${itemName && !STANDARD_ITEMS.includes(itemName) ? esc(itemName) : ''}" placeholder="Andika jina la item..." style="display:${itemName && !STANDARD_ITEMS.includes(itemName) ? 'block' : 'none'}; width:100%; padding:6px 10px; border:1.5px solid #dde1d6; border-radius:6px; font-size:12px; font-family:inherit; margin-top:6px; outline:none;">
        </td>
        <td style="padding:8px 6px;">
            <input type="number" class="bd-item-qty" placeholder="0" value="${quantity}" oninput="this.closest('tr').closest('tbody').closest('div[id^=bd-activity]') && updateActivityTotal(this.closest('div[id^=bd-activity]').id)" style="width:100%; padding:8px 10px; border:1.5px solid #dde1d6; border-radius:6px; font-size:12px; font-family:inherit; background:white; outline:none;">
        </td>
        <td style="padding:8px 6px;">
            <select class="bd-item-unit" style="width:100%; padding:8px 10px; border:1.5px solid #dde1d6; border-radius:6px; font-size:12px; font-family:inherit; background:white; outline:none;">
                <option value="pcs" ${unit === 'pcs' ? 'selected' : ''}>pcs</option>
                <option value="bags" ${unit === 'bags' ? 'selected' : ''}>bags</option>
                <option value="tons" ${unit === 'tons' ? 'selected' : ''}>tons</option>
                <option value="kg" ${unit === 'kg' ? 'selected' : ''}>kg</option>
                <option value="litres" ${unit === 'litres' ? 'selected' : ''}>litres</option>
                <option value="blocks" ${unit === 'blocks' ? 'selected' : ''}>blocks</option>
                <option value="sheets" ${unit === 'sheets' ? 'selected' : ''}>sheets</option>
                <option value="boxes" ${unit === 'boxes' ? 'selected' : ''}>boxes</option>
                <option value="days" ${unit === 'days' ? 'selected' : ''}>days</option>
                <option value="person" ${unit === 'persons' ? 'selected' : ''}>person</option>
                <option value="hours" ${unit === 'hours' ? 'selected' : ''}>hours</option>
                <option value="months" ${unit === 'months' ? 'selected' : ''}>months</option>
            </select>
        </td>
        <td style="padding:8px 6px;">
            <input type="number" class="bd-item-price" placeholder="0" value="${unitPrice}" oninput="this.closest('tr').closest('tbody').closest('div[id^=bd-activity]') && updateActivityTotal(this.closest('div[id^=bd-activity]').id)" style="width:100%; padding:8px 10px; border:1.5px solid #dde1d6; border-radius:6px; font-size:12px; font-family:inherit; background:white; outline:none;">
        </td>
        <td style="padding:8px 6px; text-align:right;">
            <span class="bd-item-subtotal" style="font-family:'Courier New',monospace; font-weight:800; color:#3d5a3d; font-size:12px;">TSh 0</span>
        </td>
        <td style="padding:8px 6px;">
            <button onclick="this.closest('tr').remove(); this.closest('div[id^=bd-activity]') && updateActivityTotal(this.closest('div[id^=bd-activity]').id);" style="background:rgba(239,68,68,0.1); color:#dc2626; border:none; border-radius:6px; padding:6px 10px; cursor:pointer; font-size:12px; font-weight:700;">✕</button>
        </td>
    `;
    tbody.appendChild(row);

    const itemSelect = row.querySelector('.bd-item-name');
    const itemCustom = row.querySelector('.bd-item-custom');
    if (itemSelect && itemCustom) {
        itemSelect.addEventListener('change', function() {
            if (this.value === '__custom__') {
                itemCustom.style.display = 'block';
                itemCustom.focus();
            } else {
                itemCustom.style.display = 'none';
                itemCustom.value = '';
            }
        });
    }
}

function updateActivityTotal(activityId) {
    const activityEl = document.getElementById(activityId);
    if (!activityEl) return;

    let activityTotal = 0;
    activityEl.querySelectorAll('.bd-items-body tr').forEach(row => {
        const qty = parseFloat(row.querySelector('.bd-item-qty')?.value) || 0;
        const price = parseFloat(row.querySelector('.bd-item-price')?.value) || 0;
        const subtotal = qty * price;
        
        const subtotalEl = row.querySelector('.bd-item-subtotal');
        if (subtotalEl) subtotalEl.textContent = 'TSh ' + subtotal.toLocaleString();
        
        activityTotal += subtotal;
    });

    const totalEl = activityEl.querySelector('.bd-activity-total');
    if (totalEl) totalEl.textContent = 'TSh ' + activityTotal.toLocaleString();

    updateGrandTotal();
}

function updateGrandTotal() {
    let grandTotal = 0;
    document.querySelectorAll('.bd-activity-total').forEach(el => {
        const value = parseFloat(el.textContent.replace(/[^0-9.-]+/g, '')) || 0;
        grandTotal += value;
    });
    
    const el = document.getElementById('bdGrandTotal');
    if (el) el.textContent = 'TSh ' + grandTotal.toLocaleString();
}

function viewSubmittedBreakdown() {
    if (!currentDeptBudget) return;
    
    const { myAllocation, title, period } = currentDeptBudget;
    const items = myAllocation.items || [];

    if (items.length === 0) {
        showToast('No items to view', 'info');
        return;
    }

    const grouped = {};
    items.forEach(item => {
        const key = item.activityName || 'Unnamed Activity';
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(item);
    });

    let activitiesHtml = '';
    let grandTotal = 0;

    Object.keys(grouped).forEach((activityName, idx) => {
        const activityItems = grouped[activityName];
        let activityTotal = 0;
        
        const itemsHtml = activityItems.map(item => {
            const subtotal = Number(item.quantity) * Number(item.unitPrice);
            activityTotal += subtotal;
            return `
                <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px dashed #dde1d6; font-size:13px;">
                    <div>
                        <span style="font-weight:600; color:#252a1e;">${esc(item.itemName)}</span>
                        <span style="color:#6e7a5e; font-size:12px; margin-left:6px;">(${item.quantity} ${item.unit} × TSh ${Number(item.unitPrice).toLocaleString()})</span>
                    </div>
                    <span style="font-weight:700; color:#3d5a3d; font-family:'Courier New',monospace;">TSh ${subtotal.toLocaleString()}</span>
                </div>
            `;
        }).join('');

        grandTotal += activityTotal;

        activitiesHtml += `
            <div style="background:white; border:1px solid #dde1d6; border-radius:10px; margin-bottom:12px; overflow:hidden;">
                <div style="background:#f7f8f5; padding:12px 16px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #dde1d6;">
                    <div style="font-weight:800; color:#3d5a3d; font-size:14px;">${idx + 1}. ${esc(activityName)}</div>
                    <div style="font-weight:900; color:#3d5a3d; font-family:'Courier New',monospace; font-size:14px;">TSh ${activityTotal.toLocaleString()}</div>
                </div>
                <div style="padding:8px 16px;">
                    ${itemsHtml}
                </div>
            </div>
        `;
    });

    let modal = document.getElementById('viewBreakdownModal');
    if (modal) modal.remove();

    modal = document.createElement('div');
    modal.id = 'viewBreakdownModal';
    modal.style.cssText = 'position:fixed; inset:0; background:rgba(15,23,42,0.7); backdrop-filter:blur(6px); z-index:50000; display:flex; align-items:center; justify-content:center; padding:20px;';
    
    modal.innerHTML = `
        <div style="background:white; border-radius:20px; max-width:700px; width:100%; max-height:90vh; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 30px 80px rgba(0,0,0,0.4);">
            <div style="background:linear-gradient(135deg,#3d5a3d,#2a3d2a); padding:20px 26px; color:white; display:flex; justify-content:space-between; align-items:center; flex-shrink:0; border-bottom: 3px solid #c9a227;">
                <div>
                    <h3 style="font-size:20px; font-weight:900; margin:0 0 4px 0;">🔒 Submitted Breakdown</h3>
                    <div style="font-size:12px; color:rgba(255,255,255,0.7);">${esc(title)} • ${esc(period)}</div>
                </div>
                <button onclick="document.getElementById('viewBreakdownModal').remove()" style="background:rgba(255,255,255,0.2); border:none; color:white; width:36px; height:36px; border-radius:50%; font-size:18px; cursor:pointer;">✕</button>
            </div>

            <div style="padding:24px 26px; overflow-y:auto; flex:1; background:#f7f8f5;">
                <div style="background:rgba(201,162,39,0.08); border-left:4px solid #c9a227; border-radius:8px; padding:12px 16px; margin-bottom:20px; font-size:13px; color:#78350f;">
                    👁️ This is a read-only view. Your breakdown has been submitted and cannot be edited.
                </div>

                <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:20px;">
                    <div style="background:white; padding:14px 18px; border-radius:10px; border:1px solid #dde1d6; border-left: 3px solid #3d5a3d;">
                        <div style="font-size:10px; font-weight:800; color:#6e7a5e; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">Your Ceiling</div>
                        <div style="font-size:18px; font-weight:900; color:#3d5a3d; font-family:'Courier New',monospace;">TSh ${Number(myAllocation.ceilingAmount).toLocaleString()}</div>
                    </div>
                    <div style="background:white; padding:14px 18px; border-radius:10px; border:1px solid #dde1d6; border-left: 3px solid #22c55e;">
                        <div style="font-size:10px; font-weight:800; color:#6e7a5e; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">Total Submitted</div>
                        <div style="font-size:18px; font-weight:900; color:#16a34a; font-family:'Courier New',monospace;">TSh ${grandTotal.toLocaleString()}</div>
                    </div>
                </div>

                <div style="font-size:11px; font-weight:800; color:#6e7a5e; text-transform:uppercase; letter-spacing:1px; margin-bottom:12px;">📋 Activities (${Object.keys(grouped).length})</div>
                ${activitiesHtml}
            </div>

            <div style="padding:16px 26px; background:white; border-top:1px solid #dde1d6; display:flex; justify-content:flex-end; flex-shrink:0;">
                <button onclick="document.getElementById('viewBreakdownModal').remove()" style="padding:12px 28px; background:linear-gradient(135deg,#3d5a3d,#2a3d2a); color:white; border:none; border-radius:8px; font-weight:800; cursor:pointer; font-family:inherit; font-size:13px; border: 1.5px solid #c9a227;">Close</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

async function submitBudgetBreakdown(isDraft = false) {
    if (!currentDeptBudget) return;

    const { myAllocation, id: budgetId } = currentDeptBudget;
    const items = [];

    document.querySelectorAll('#bdActivitiesList > div').forEach(activityEl => {
        const activitySelect = activityEl.querySelector('.bd-activity-name');
        const activityCustom = activityEl.querySelector('.bd-activity-custom');
        let activityName = activitySelect.value === '__custom__' 
            ? (activityCustom?.value.trim() || 'Unnamed Activity') 
            : activitySelect.value;

        activityEl.querySelectorAll('.bd-items-body tr').forEach(row => {
            const itemSelect = row.querySelector('.bd-item-name');
            const itemCustom = row.querySelector('.bd-item-custom');
            let itemName = itemSelect.value === '__custom__' 
                ? (itemCustom?.value.trim() || '') 
                : itemSelect.value;

            const quantity = parseFloat(row.querySelector('.bd-item-qty')?.value) || 0;
            const unit = row.querySelector('.bd-item-unit')?.value || 'pcs';
            const unitPrice = parseFloat(row.querySelector('.bd-item-price')?.value) || 0;

            if (itemName && quantity > 0) {
                items.push({ activityName, itemName, quantity, unit, unitPrice, totalCost: quantity * unitPrice });
            }
        });
    });

    if (items.length === 0) {
        showToast('⚠ Add at least one item with quantity', 'error');
        return;
    }

    const totalAllocated = items.reduce((sum, i) => sum + i.totalCost, 0);
    const ceiling = Number(myAllocation.ceilingAmount);

    if (!isDraft && totalAllocated > ceiling) {
        showToast(`⚠ Over budget! Total (TSh ${totalAllocated.toLocaleString()}) exceeds ceiling (TSh ${ceiling.toLocaleString()})`, 'error');
        return;
    }

    if (!isDraft) {
        const confirmed = confirm(`Submit ${items.length} items totaling TSh ${totalAllocated.toLocaleString()} to your Manager?`);
        if (!confirmed) return;
    }

    const btn = document.querySelector(isDraft 
        ? 'button[onclick="submitBudgetBreakdown(true)"]' 
        : 'button[onclick="openBudgetReviewModal()"]');
    let originalHtml = '';
    if (btn) {
        originalHtml = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '⏳ Saving...';
        btn.style.opacity = '0.7';
    }

    try {
        await API.submitDepartmentBreakdown(budgetId, myAllocation.department, { 
            items: items,
            status: isDraft ? 'draft' : 'submitted'
        });
        
        showBudgetSuccessDialog(
            isDraft ? '💾 Draft Saved!' : '✅ Breakdown Submitted!', 
            isDraft 
                ? 'Your work has been saved as a draft. You can continue later.' 
                : 'Your breakdown has been successfully sent to the Manager for review.'
        );

        closeBudgetBreakdownPage();
        loadMyBudget();

    } catch (err) {
        showToast('❌ ' + err.message, 'error');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalHtml;
            btn.style.opacity = '1';
        }
    }
}

function openBudgetReviewModal() {
    if (!currentDeptBudget) return;

    const { myAllocation } = currentDeptBudget;
    const ceiling = Number(myAllocation.ceilingAmount);

    const activities = [];
    let grandTotal = 0;

    document.querySelectorAll('#bdActivitiesList > div').forEach(activityEl => {
        const activitySelect = activityEl.querySelector('.bd-activity-name');
        const activityCustom = activityEl.querySelector('.bd-activity-custom');
        let activityName = activitySelect.value === '__custom__' 
            ? (activityCustom?.value.trim() || 'Unnamed Activity') 
            : activitySelect.value;

        const items = [];
        let activityTotal = 0;

        activityEl.querySelectorAll('.bd-items-body tr').forEach(row => {
            const itemSelect = row.querySelector('.bd-item-name');
            const itemCustom = row.querySelector('.bd-item-custom');
            let itemName = itemSelect.value === '__custom__' 
                ? (itemCustom?.value.trim() || '') 
                : itemSelect.value;

            const quantity = parseFloat(row.querySelector('.bd-item-qty')?.value) || 0;
            const unit = row.querySelector('.bd-item-unit')?.value || 'pcs';
            const unitPrice = parseFloat(row.querySelector('.bd-item-price')?.value) || 0;
            const subtotal = quantity * unitPrice;

            if (itemName && quantity > 0) {
                items.push({ itemName, quantity, unit, unitPrice, subtotal });
                activityTotal += subtotal;
            }
        });

        if (items.length > 0) {
            activities.push({ activityName, items, activityTotal });
            grandTotal += activityTotal;
        }
    });

    if (activities.length === 0) {
        showToast('⚠ Add at least one activity with items', 'error');
        return;
    }

    const activitiesHtml = activities.map((act, idx) => `
        <div style="background:white; border:1px solid #dde1d6; border-radius:10px; margin-bottom:12px; overflow:hidden;">
            <div style="background:#f7f8f5; padding:12px 16px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #dde1d6;">
                <div style="font-weight:800; color:#3d5a3d; font-size:14px;">${idx + 1}. ${esc(act.activityName)}</div>
                <div style="font-weight:900; color:#3d5a3d; font-family:'Courier New',monospace; font-size:14px;">TSh ${act.activityTotal.toLocaleString()}</div>
            </div>
            <div style="padding:8px 16px;">
                ${act.items.map(item => `
                    <div style="display:flex; justify-content:space-between; padding:6px 0; font-size:12px; border-bottom:1px dashed #f1f5f9;">
                        <span style="color:#505a44;">${esc(item.itemName)} <span style="color:#9aa38b;">(${item.quantity} ${item.unit} × TSh ${item.unitPrice.toLocaleString()})</span></span>
                        <span style="font-weight:700; color:#252a1e; font-family:'Courier New',monospace;">TSh ${item.subtotal.toLocaleString()}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');

    let modal = document.getElementById('budgetReviewModal');
    if (modal) modal.remove();

    modal = document.createElement('div');
    modal.id = 'budgetReviewModal';
    modal.style.cssText = 'position:fixed; inset:0; background:rgba(15,23,42,0.7); backdrop-filter:blur(6px); z-index:50000; display:flex; align-items:center; justify-content:center; padding:20px; opacity:0; transition:opacity 0.3s;';
    
    modal.innerHTML = `
        <div style="background:white; border-radius:20px; max-width:750px; width:100%; max-height:92vh; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 30px 80px rgba(0,0,0,0.4); transform:scale(0.95); transition:transform 0.3s;">
            <div style="background:linear-gradient(135deg,#3d5a3d,#2a3d2a); padding:20px 28px; color:white; display:flex; justify-content:space-between; align-items:center; flex-shrink:0; border-bottom: 3px solid #c9a227;">
                <div>
                    <h3 style="font-size:20px; font-weight:900; margin:0 0 4px 0;">👁️ Review Your Breakdown</h3>
                    <div style="font-size:12px; color:rgba(255,255,255,0.7);">Please verify everything is correct before submitting</div>
                </div>
                <button onclick="document.getElementById('budgetReviewModal').remove()" style="background:rgba(255,255,255,0.2); border:none; color:white; width:36px; height:36px; border-radius:50%; font-size:18px; cursor:pointer;">✕</button>
            </div>

            <div style="padding:24px 28px; overflow-y:auto; flex:1; background:#f7f8f5;">
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:20px;">
                    <div style="background:white; padding:16px 20px; border-radius:10px; border:1px solid #dde1d6; border-left: 3px solid #3d5a3d;">
                        <div style="font-size:10px; font-weight:800; color:#6e7a5e; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">Your Ceiling</div>
                        <div style="font-size:20px; font-weight:900; color:#3d5a3d; font-family:'Courier New',monospace;">TSh ${ceiling.toLocaleString()}</div>
                    </div>
                    <div style="background:white; padding:16px 20px; border-radius:10px; border:1px solid #dde1d6; border-left: 3px solid ${grandTotal > ceiling ? '#dc2626' : '#22c55e'};">
                        <div style="font-size:10px; font-weight:800; color:#6e7a5e; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">Your Total</div>
                        <div style="font-size:20px; font-weight:900; color:${grandTotal > ceiling ? '#dc2626' : '#16a34a'}; font-family:'Courier New',monospace;">TSh ${grandTotal.toLocaleString()}</div>
                    </div>
                </div>

                ${grandTotal > ceiling 
                    ? `<div style="background:rgba(239,68,68,0.08); border-left:4px solid #dc2626; padding:12px 16px; border-radius:8px; margin-bottom:20px; font-size:13px; color:#7f1d1d;">
                        ❌ <strong>Over Budget!</strong> Your total (TSh ${grandTotal.toLocaleString()}) exceeds your ceiling by TSh ${(grandTotal - ceiling).toLocaleString()}. Please adjust before submitting.
                    </div>` 
                    : `<div style="background:rgba(34,197,94,0.08); border-left:4px solid #16a34a; padding:12px 16px; border-radius:8px; margin-bottom:20px; font-size:13px; color:#14532d;">
                        ✅ <strong>Within Budget!</strong> You have TSh ${(ceiling - grandTotal).toLocaleString()} remaining.
                    </div>`
                }

                <div style="font-size:11px; font-weight:800; color:#6e7a5e; text-transform:uppercase; letter-spacing:1px; margin-bottom:12px;">📋 Activities (${activities.length})</div>
                ${activitiesHtml}
            </div>

            <div style="padding:16px 28px; background:white; border-top:1px solid #dde1d6; display:flex; justify-content:space-between; gap:12px; flex-shrink:0;">
                <button onclick="document.getElementById('budgetReviewModal').remove()" style="padding:12px 24px; background:#eef0ea; color:#505a44; border:1.5px solid #c4cab8; border-radius:8px; font-weight:700; cursor:pointer; font-family:inherit; font-size:13px;">← Edit</button>
                <button onclick="confirmAndSubmitBudget()" ${grandTotal > ceiling ? 'disabled' : ''} style="padding:12px 28px; background:linear-gradient(135deg,#c9a227,#e0b93a); color:#2a3d2a; border:none; border-radius:8px; font-weight:800; cursor:pointer; font-family:inherit; font-size:13px; box-shadow:0 4px 12px rgba(201,162,39,0.3); ${grandTotal > ceiling ? 'opacity:0.5; cursor:not-allowed;' : ''}">✅ Confirm & Submit to Manager</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    
    setTimeout(() => {
        modal.style.opacity = '1';
        modal.querySelector('div').style.transform = 'scale(1)';
    }, 10);
}

async function confirmAndSubmitBudget() {
    if (!currentDeptBudget) return;

    const modal = document.getElementById('budgetReviewModal');
    if (modal) modal.remove();

    setTimeout(() => {
        submitBudgetBreakdown();
    }, 100);
}

function showBudgetSuccessDialog(title, message) {
    const existing = document.getElementById('budgetSuccessModal');
    if (existing) existing.remove();

    const modalHTML = `
        <div class="modal-overlay show" id="budgetSuccessModal" style="z-index: 60000;">
            <div style="background:white; border-radius:20px; max-width:400px; width:100%; text-align:center; padding:32px 28px; box-shadow:0 25px 60px rgba(0,0,0,0.3); animation: modalIn 0.3s ease;">
                <div style="width:80px; height:80px; border-radius:50%; background:linear-gradient(135deg, #3d5a3d, #2a3d2a); display:flex; align-items:center; justify-content:center; margin:0 auto 20px; box-shadow:0 8px 24px rgba(61,90,61,0.4); border: 3px solid #c9a227;">
                    <span style="font-size:40px; color:#e0b93a;">✔</span>
                </div>
                <h3 style="font-size:22px; font-weight:900; color:#3d5a3d; margin:0 0 10px 0;">${title}</h3>
                <p style="font-size:14px; color:#6e7a5e; line-height:1.6; margin:0 0 24px 0;">${message}</p>
                <button onclick="document.getElementById('budgetSuccessModal').remove()" 
                        style="width:100%; padding:14px; background:linear-gradient(135deg, #3d5a3d, #2a3d2a); color:white; border:none; border-radius:12px; font-size:14px; font-weight:800; cursor:pointer; transition:transform 0.2s; border: 1.5px solid #c9a227;"
                        onmouseover="this.style.transform='translateY(-2px)'" 
                        onmouseout="this.style.transform='translateY(0)'">
                    Understood
                </button>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function closeAllSidebarDropdowns() {
    document.querySelectorAll('.sidebar-nav-parent.open').forEach(el => {
        el.classList.remove('open');
        const sub = el.nextElementSibling;
        if (sub) sub.classList.remove('open');
    });
}
// ================================================================
// 🆕 MY ALL BUDGETS — Universal Budget History (Kwa Kuona Bajeti za Nyuma)
// ================================================================
let allMyBudgets = [];
let currentBudgetFilter = {
    search: '',
    year: '',
    status: '',
    department: ''
};
// ===== 1. UPDATE BADGE COUNT (Nyepesi - haitaji container) =====
async function updateBudgetBadgeCount() {
    try {
        const user = Auth.getUser();
        const myDept = user?.department || user?.departmentName;
        if (!myDept) return;

        const budgets = await API.getMasterBudgets();
        const list = Array.isArray(budgets) ? budgets : [];
        const count = list.filter(b => 
            b.allocations && b.allocations.some(a => a.department === myDept)
        ).length;

        const badge = document.getElementById('navAllBudgetsBadge');
        if (badge) badge.textContent = count;
    } catch (e) {
        console.log("Badge count failed", e);
    }
}
// ===== 2. LOAD ALL MY BUDGETS (Inaitwa unapoingia kwenye Tab) =====
async function loadAllMyBudgets() {
    const container = document.getElementById('allBudgetsContainer');
    if (!container) {
        console.error("Container 'allBudgetsContainer' haipo kwenye HTML!");
        return;
    }

    container.innerHTML = `<div style="text-align:center;padding:40px;color:#64748b;">⏳ Loading your budgets...</div>`;

    try {
        const user = Auth.getUser();
        const myDept = user?.department || user?.departmentName;

        if (!myDept) {
            container.innerHTML = `<div style="text-align:center;padding:40px;color:#dc2626;">⚠️ Hauna Department iliyowekwa kwenye profile yako.</div>`;
            return;
        }

        // Chukua budgets zote kutoka API
        const budgets = await API.getMasterBudgets();
        const list = Array.isArray(budgets) ? budgets : [];

        // Chuja (Filter) kuchukua zile tu zinazohusu department yako
        allMyBudgets = list.filter(b => 
            b.allocations && b.allocations.some(a => a.department === myDept)
        ).map(b => {
            const myAllocation = b.allocations.find(a => a.department === myDept);
            return { ...b, myAllocation, department: myDept };
        });

        // Panga kuanzia mpya hadi ya zamani
        allMyBudgets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // Update badge kwenye sidebar
        const badge = document.getElementById('navAllBudgetsBadge');
        if (badge) badge.textContent = allMyBudgets.length;

        // RENDER UI
        renderBudgetsFilters();

    } catch (err) {
        console.error('loadAllMyBudgets error:', err);
        container.innerHTML = `
            <div style="text-align:center;padding:40px;color:#dc2626;">
                <div style="font-size:40px;margin-bottom:10px;">❌</div>
                <div style="font-weight:800;">Imeshindwa Kupakia Budgets</div>
                <div style="font-size:12px;color:#64748b;margin-top:8px;">${err.message}</div>
                <button onclick="loadAllMyBudgets()" style="margin-top:16px;padding:10px 20px;background:#3d5a3d;color:white;border:none;border-radius:8px;cursor:pointer;">🔄 Jaribu Tena</button>
            </div>`;
    }
}
// ===== 3. RENDER FILTERS & LAYOUT =====
function renderBudgetsFilters() {
    const container = document.getElementById('allBudgetsContainer');
    if (!container) return;
        // 🆕 Tengeneza orodha ya miaka (Kuanzia 2023 hadi Mwaka Ujao)
    const currentYear = new Date().getFullYear();
    const years = [];
    // Tunajaza miaka kuanzia 2023 hadi 2030 (au zaidi)
    for (let y = 2023; y <= currentYear + 2; y++) {
        years.push(y);
    }
    // Panga kuanzia mwaka mpya kuja chini
    years.sort((a, b) => b - a);
    const primary = '#3d5a3d';
    const accent = '#c9a227';

    container.innerHTML = `
        <!-- Stats Cards -->
        <div id="budgetsStatsGrid" style="display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:20px;"></div>

        <!-- Filters Bar -->
        <div style="background:white; border-radius:12px; padding:16px 20px; border:1px solid #e2e8f0; margin-bottom:20px; display:flex; gap:12px; flex-wrap:wrap; align-items:center;">
            <input type="text" id="budgetSearchInput" placeholder="🔍 Search budget..." oninput="filterBudgets()" style="flex:1; min-width:200px; padding:10px 14px; border:1.5px solid #e2e8f0; border-radius:8px; font-size:13px; font-family:inherit; outline:none;">
            <div style="position:relative; display:flex; align-items:center;">
                <input type="date" id="budgetDateFilter" onchange="filterBudgets()" 
                       style="padding:10px 14px; border:1.5px solid #e2e8f0; border-radius:8px; font-size:13px; font-family:inherit; background:white; outline:none; cursor:pointer; color:#334155; font-weight:600;">
                <button onclick="clearDateFilter()" id="clearDateBtn" style="display:none; position:absolute; right:8px; background:#f1f5f9; border:none; width:22px; height:22px; border-radius:50%; cursor:pointer; color:#64748b; font-size:12px; font-weight:800;" title="Clear Date">✕</button>
            </div>

            <select id="budgetStatusFilter" onchange="filterBudgets()" style="padding:10px 14px; border:1.5px solid #e2e8f0; border-radius:8px; font-size:13px; font-family:inherit; background:white; outline:none; cursor:pointer;">
                <option value="">🚦 All Status</option>
                <option value="pending">⏳ Pending</option>
                <option value="submitted">✅ Submitted</option>
                <option value="approved">🟢 Approved</option>
                <option value="rejected">❌ Rejected</option>
            </select>

            <button onclick="resetBudgetsFilters()" style="padding:10px 18px; background:rgba(239,68,68,0.1); color:#dc2626; border:1px solid rgba(239,68,68,0.2); border-radius:8px; font-weight:700; font-size:12px; cursor:pointer; font-family:inherit;">🔄 Reset</button>
        </div>

        <!-- List Container -->
        <div id="budgetsListContainer"></div>
    `;

    renderBudgetsStats();
    renderBudgetsList();
}
// ===== 4. RENDER STATS (Summary Cards) =====
function renderBudgetsStats() {
    const statsContainer = document.getElementById('budgetsStatsGrid');
    if (!statsContainer) return;

    const total = allMyBudgets.length;
    const pending = allMyBudgets.filter(b => 
        b.myAllocation?.status === 'pending-department' || 
        b.myAllocation?.status === 'pending' ||
        b.status === 'pending-departments'
    ).length;
    const submitted = allMyBudgets.filter(b => 
        b.myAllocation?.status === 'submitted' || 
        b.myAllocation?.status === 'approved'
    ).length;
    const rejected = allMyBudgets.filter(b => 
        b.myAllocation?.status === 'rejected'
    ).length;

    const totalValue = allMyBudgets.reduce((sum, b) => 
        sum + Number(b.myAllocation?.ceilingAmount || 0), 0
    );

    const primary = '#3d5a3d';

    statsContainer.innerHTML = `
        <div style="background:white; border-radius:14px; padding:18px 20px; border-left:4px solid ${primary}; border:1px solid #e2e8f0;">
            <div style="font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">📊 Total</div>
            <div style="font-size:24px; font-weight:900; color:${primary}; font-family:'Courier New',monospace;">${total}</div>
            <div style="font-size:10px; color:#94a3b8; margin-top:2px;">TSh ${totalValue.toLocaleString()}</div>
        </div>
        <div style="background:white; border-radius:14px; padding:18px 20px; border-left:4px solid #f59e0b; border:1px solid #e2e8f0;">
            <div style="font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">⏳ Pending</div>
            <div style="font-size:24px; font-weight:900; color:#f59e0b; font-family:'Courier New',monospace;">${pending}</div>
            <div style="font-size:10px; color:#94a3b8; margin-top:2px;">Awaiting</div>
        </div>
        <div style="background:white; border-radius:14px; padding:18px 20px; border-left:4px solid #16a34a; border:1px solid #e2e8f0;">
            <div style="font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">✅ Approved</div>
            <div style="font-size:24px; font-weight:900; color:#16a34a; font-family:'Courier New',monospace;">${submitted}</div>
            <div style="font-size:10px; color:#94a3b8; margin-top:2px;">Approved</div>
        </div>
        <div style="background:white; border-radius:14px; padding:18px 20px; border-left:4px solid #dc2626; border:1px solid #e2e8f0;">
            <div style="font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">❌ Rejected</div>
            <div style="font-size:24px; font-weight:900; color:#dc2626; font-family:'Courier New',monospace;">${rejected}</div>
            <div style="font-size:10px; color:#94a3b8; margin-top:2px;">Rejected</div>
        </div>
    `;
}
// ===== 5. RENDER BUDGETS LIST (Compact & Modern Design) =====
function renderBudgetsList() {
    const container = document.getElementById('budgetsListContainer');
    if (!container) return;

    let filtered = [...allMyBudgets];

    // Filter by Search
    if (currentBudgetFilter.search) {
        const s = currentBudgetFilter.search;
        filtered = filtered.filter(b =>
            (b.title || '').toLowerCase().includes(s) ||
            (b.period || '').toLowerCase().includes(s) ||
            (b.createdBy || '').toLowerCase().includes(s)
        );
    }

    // Filter by Custom Date
    if (currentBudgetFilter.date) {
        const selectedDate = new Date(currentBudgetFilter.date);
        const selectedYearMonth = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`;
        filtered = filtered.filter(b => {
            if (!b.createdAt) return false;
            const bDate = new Date(b.createdAt);
            const bYearMonth = `${bDate.getFullYear()}-${String(bDate.getMonth() + 1).padStart(2, '0')}`;
            return bYearMonth === selectedYearMonth;
        });
    }

    // Filter by Status
    if (currentBudgetFilter.status) {
        filtered = filtered.filter(b => {
            const s = b.myAllocation?.status || 'pending';
            if (currentBudgetFilter.status === 'pending') {
                return s === 'pending-department' || s === 'pending';
            }
            if (currentBudgetFilter.status === 'submitted') return s === 'submitted';
            if (currentBudgetFilter.status === 'approved') return s === 'approved';
            if (currentBudgetFilter.status === 'rejected') return s === 'rejected';
            return true;
        });
    }

    if (filtered.length === 0) {
        container.innerHTML = `
            <div style="text-align:center;padding:60px 20px;background:white;border-radius:14px;border:1px solid #e2e8f0;">
                <div style="font-size:56px;margin-bottom:14px;opacity:0.5;">📭</div>
                <div style="font-size:17px;font-weight:800;color:#334155;margin-bottom:6px;">No Budgets Found</div>
                <div style="font-size:13px;color:#64748b;">${allMyBudgets.length === 0 ? 'No budgets yet. Wait for Manager allocation.' : 'Try adjusting your filters.'}</div>
            </div>`;
        return;
    }

    const primary = '#3d5a3d';
    const accent = '#c9a227';

    container.innerHTML = `
        <div style="background:white; border-radius:14px; border:1px solid #e2e8f0; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.03);">
            
            <div class="budget-list-header" style="display:grid; grid-template-columns: 2fr 1fr 1fr 100px 160px; gap:16px; padding:16px 24px; background:#f8fafc; border-bottom:2px solid #e2e8f0; font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:1px;">
                <div>Budget Details</div>
                <div>Period</div>
                <div>Ceiling Amount</div>
                <div>Status</div>
                <div style="text-align:right;">Actions</div>
            </div>

            <div id="budgetListBody">
                ${filtered.map(b => {
                    const alloc = b.myAllocation || {};
                    const status = alloc.status || 'pending';
                    const ceiling = Number(alloc.ceilingAmount || 0);
                    const itemCount = (alloc.items || []).length;
                    const createdDate = b.createdAt ? new Date(b.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

                    const statusInfo = {
                        'pending': { icon: '⏳', label: 'Pending', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
                        'pending-department': { icon: '⏳', label: 'Pending', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
                        'draft': { icon: '📝', label: 'Draft', color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
                        'submitted': { icon: '✅', label: 'Submitted', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
                        'approved': { icon: '🟢', label: 'Approved', color: '#16a34a', bg: 'rgba(22,163,74,0.1)' },
                        'rejected': { icon: '❌', label: 'Rejected', color: '#dc2626', bg: 'rgba(239,68,68,0.1)' }
                    }[status] || { icon: '❓', label: status, color: '#64748b', bg: 'rgba(100,116,139,0.1)' };
                    
                   // 🆕 Action Buttons
                    let btnAction = `<button onclick="viewBudgetDetailsFromAll('${b.id}')" style="padding:6px 12px; background:white; color:${primary}; border:1.5px solid ${primary}; border-radius:6px; font-weight:700; font-size:11px; cursor:pointer; font-family:inherit;">👁 View</button>`;

                    // Kama bajeti imekamilika (submitted/approved), weka kitufe cha Book na Breakdown
                    if (status === 'submitted' || status === 'approved') {
                        btnAction += `<button onclick="openBudgetBookForDept('${b.id}')" style="padding:6px 12px; background:linear-gradient(135deg,#16a34a,#15803d); color:white; border:none; border-radius:6px; font-weight:700; font-size:11px; cursor:pointer; font-family:inherit; margin-left:4px;">📖 Book</button>`;
                        btnAction += `<button onclick="viewBudgetDetailsFromAll('${b.id}')" style="padding:6px 12px; background:linear-gradient(135deg,${primary},#2a3d2a); color:white; border:none; border-radius:6px; font-weight:700; font-size:11px; cursor:pointer; font-family:inherit; border:1.5px solid ${accent}; margin-left:4px;">📋 Breakdown</button>`;
                    } 
                    // Kama bajeti inasubiri (pending), weka kitufe cha Add
                    else if (status === 'pending' || status === 'pending-department') {
                        btnAction += `<button onclick="openBudgetForDepartment('${b.id}', '${status}')" style="padding:6px 12px; background:linear-gradient(135deg,${primary},#2a3d2a); color:white; border:none; border-radius:6px; font-weight:700; font-size:11px; cursor:pointer; font-family:inherit; margin-left:4px;">➕ Add</button>`;
                    } 
                    // Kama ni draft, weka kitufe cha Edit
                    else if (status === 'draft') {
                        btnAction += `<button onclick="openBudgetForDepartment('${b.id}', 'draft')" style="padding:6px 12px; background:linear-gradient(135deg,${accent},#e0b93a); color:#2a3d2a; border:none; border-radius:6px; font-weight:700; font-size:11px; cursor:pointer; font-family:inherit; margin-left:4px;">✏️ Edit</button>`;
                    }
                    // Rejection reason ikiwa ipo
                    const rejectionHtml = (status === 'rejected' && alloc.rejectionReason) ? `
                        <div style="font-size:10px; color:#dc2626; margin-top:4px; background:rgba(220,38,38,0.05); padding:4px 8px; border-radius:4px; border-left:2px solid #dc2626;">
                            <strong>Reason:</strong> ${esc(alloc.rejectionReason)}
                        </div>
                    ` : '';

                    return `
                        <div class="budget-row" style="display:grid; grid-template-columns: 2fr 1fr 1fr 100px 160px; gap:16px; padding:16px 24px; border-bottom:1px solid #f1f5f9; align-items:center; transition:background 0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">
                            
                            <!-- Column 1: Details -->
                            <div>
                                <div style="font-weight:900; color:${primary}; font-size:14px; margin-bottom:2px;">${esc(b.title)}</div>
                                <div style="font-size:11px; color:#64748b; display:flex; align-items:center; gap:6px;">
                                    <span>🏢 ${esc(b.department)}</span>
                                    <span>•</span>
                                    <span>👤 ${esc(b.createdBy || '—')}</span>
                                </div>
                                ${rejectionHtml}
                            </div>

                            <!-- Column 2: Period -->
                            <div>
                                <div style="font-size:12px; font-weight:700; color:#334155;">${esc(b.period)}</div>
                                <div style="font-size:10px; color:#94a3b8;">📆 ${createdDate}</div>
                            </div>

                            <!-- Column 3: Amount -->
                            <div>
                                <div style="font-size:14px; font-weight:900; color:${primary}; font-family:'Courier New',monospace;">TSh ${ceiling.toLocaleString()}</div>
                                <div style="font-size:10px; color:#94a3b8; font-weight:600;">${itemCount} ${itemCount === 1 ? 'Item' : 'Items'}</div>
                            </div>

                            <!-- Column 4: Status -->
                            <div>
                                <span style="display:inline-flex; align-items:center; gap:4px; padding:4px 10px; border-radius:20px; font-size:10px; font-weight:800; background:${statusInfo.bg}; color:${statusInfo.color}; text-transform:uppercase;">
                                    ${statusInfo.icon} ${statusInfo.label}
                                </span>
                            </div>

                            <!-- Column 5: Actions -->
                            <div style="text-align:right; display:flex; gap:4px; justify-content:flex-end;">
                                ${btnAction}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>

        <!-- Ongeza CSS ndogo kwa ajili ya Mobile (Ili isivunjike kwenye simu) -->
        <style>
            @media (max-width: 900px) {
                .budget-list-header { display: none !important; }
                .budget-row { 
                    display: flex !important; 
                    flex-direction: column !important; 
                    align-items: flex-start !important; 
                    gap: 10px !important; 
                    padding: 16px !important;
                    border-left: 4px solid ${primary} !important;
                    border-radius: 8px;
                    margin-bottom: 10px;
                    border: 1px solid #e2e8f0;
                    background: white;
                }
                .budget-row > div { width: 100%; text-align: left !important; }
                .budget-row > div:last-child { justify-content: flex-start !important; margin-top: 8px; }
            }
        </style>
    `;
}
function resetBudgetsFilters() {
    if(document.getElementById('budgetSearchInput')) document.getElementById('budgetSearchInput').value = '';
    if(document.getElementById('budgetDateFilter')) document.getElementById('budgetDateFilter').value = ''; // 🆕 Safisha Kalenda
    if(document.getElementById('budgetStatusFilter')) document.getElementById('budgetStatusFilter').value = '';
    
    const clearBtn = document.getElementById('clearDateBtn');
    if(clearBtn) clearBtn.style.display = 'none'; // 🆕 Ficha kitufe cha X
    
    filterBudgets();
    showToast('🔄 Filters reset', 'info');
}
// ===== 6. OPEN BUDGET FOR DEPARTMENT (Start Breakdown) =====
async function openBudgetForDepartment(budgetId, status) {
    try {
        const b = await API.getMasterBudgetById(budgetId);
        if (!b) { showToast('❌ Budget not found', 'error'); return; }

        const user = Auth.getUser();
        const myDept = user?.department || user?.departmentName;
        const myAllocation = b.allocations.find(a => a.department === myDept);

        if (!myAllocation) {
            showToast('❌ You have no allocation in this budget', 'error');
            return;
        }

        currentDeptBudget = { ...b, myAllocation };
        openBudgetBreakdownPage();

    } catch (err) {
        showToast('❌ ' + err.message, 'error');
    }
}
// ===== 7. VIEW BUDGET DETAILS (Read-Only) =====
async function viewBudgetDetailsFromAll(budgetId) {
    try {
        const b = await API.getMasterBudgetById(budgetId);
        if (!b) return;

        const user = Auth.getUser();
        const myDept = user?.department || user?.departmentName;
        const myAllocation = b.allocations.find(a => a.department === myDept);

        if (!myAllocation) {
            showToast('❌ You have no allocation in this budget', 'error');
            return;
        }

        currentDeptBudget = { ...b, myAllocation };
        viewSubmittedBreakdown();

    } catch (err) {
        showToast('❌ ' + err.message, 'error');
    }
}
// ===== 8. INIT — Enter Tab =====
function loadAllBudgetsPage() {
    // 1. Kwanza tengeneza UI (Filters na Container)
    renderBudgetsFilters();
    
    // 2. Kisha pakia data (Baada ya container kuwa tayari)
    setTimeout(() => {
        loadAllMyBudgets();
    }, 100);
}
function filterBudgets() {
    currentBudgetFilter.search = (document.getElementById('budgetSearchInput')?.value || '').toLowerCase().trim();
    
    // 🆕 Chukua tarehe kutoka kwenye kalenda
    const dateVal = document.getElementById('budgetDateFilter')?.value || '';
    currentBudgetFilter.date = dateVal; 
    
    currentBudgetFilter.status = document.getElementById('budgetStatusFilter')?.value || '';
    
    // Onyesha au ficha kitufe cha 'X' (Clear) kama tarehe imechaguliwa
    const clearBtn = document.getElementById('clearDateBtn');
    if(clearBtn) clearBtn.style.display = dateVal ? 'block' : 'none';

    renderBudgetsList();
}
function clearDateFilter() {
    const dateInput = document.getElementById('budgetDateFilter');
    if (dateInput) dateInput.value = '';
    filterBudgets();
}
// ================================================================
// 🆕 OPEN DEPARTMENT BUDGET BOOK (Premium Redesign - No Stats)
// ================================================================
async function openMyDeptBudgetBook(budgetData = null) {
    const b = budgetData || currentDeptBudget;

    if (!b || !b.myAllocation) {
        showToast('⚠ No budget data available to generate book', 'error');
        return;
    }

    const alloc = b.myAllocation;
    
    // Hesabu jumla ya matumizi
    let totalItemsCost = 0;
    if (alloc.items && alloc.items.length > 0) {
        totalItemsCost = alloc.items.reduce((sum, item) => sum + Number(item.totalCost || 0), 0);
    }

    // 🆕 Panga vitu kwa Makundi ya Shughuli (Group by ActivityName)
    const groupedActivities = {};
    (alloc.items || []).forEach(item => {
        const actName = item.activityName || 'General Activity';
        if (!groupedActivities[actName]) {
            groupedActivities[actName] = {
                items: [],
                total: 0
            };
        }
        groupedActivities[actName].items.push(item);
        groupedActivities[actName].total += Number(item.totalCost || 0);
    });

    // Tengeneza HTML ya Makundi (Cards)
    let activitiesHtml = '';
    let activityIndex = 1;

    Object.keys(groupedActivities).forEach(actName => {
        const group = groupedActivities[actName];
        
        // Tengeneza HTML ya vitu vilivyomo ndani ya shughuli hii
        const itemsRows = group.items.map((item, idx) => `
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding:10px 14px; font-size:12px; color:#64748b; text-align:center; width:40px;">${idx + 1}</td>
                <td style="padding:10px 14px; font-size:13px; color:#0f172a; font-weight:500;">
                    ${esc(item.itemName)}
                </td>
                <td style="padding:10px 14px; font-size:12px; color:#475569; text-align:center; width:100px;">${item.quantity} ${item.unit}</td>
                <td style="padding:10px 14px; font-size:12px; color:#475569; text-align:right; width:120px;">TSh ${Number(item.unitPrice).toLocaleString()}</td>
                <td style="padding:10px 14px; font-size:13px; color:#0f172a; font-weight:700; text-align:right; width:130px;">TSh ${Number(item.totalCost).toLocaleString()}</td>
            </tr>
        `).join('');

        activitiesHtml += `
            <div style="margin-bottom:25px; border:1px solid #e2e8f0; border-radius:10px; overflow:hidden; page-break-inside:avoid; box-shadow: 0 2px 8px rgba(0,0,0,0.02);">
                <!-- Kichwa cha Shughuli -->
                <div style="background:#f8fafc; padding:14px 18px; border-bottom:2px solid #0f172a; display:flex; justify-content:space-between; align-items:center;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span style="background:#0f172a; color:white; width:24px; height:24px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:bold;">${activityIndex++}</span>
                        <strong style="font-size:14px; color:#0f172a; text-transform:uppercase; letter-spacing:0.5px;">${esc(actName)}</strong>
                    </div>
                    <div style="font-size:13px; font-weight:800; color:#16a34a; background:rgba(22,163,74,0.1); padding:4px 10px; border-radius:6px;">
                        TSh ${group.total.toLocaleString()}
                    </div>
                </div>
                
                <!-- Jedwali la Vitu ndani ya Shughuli -->
                <table style="width:100%; border-collapse:collapse;">
                    <thead style="background:#ffffff; border-bottom:1px solid #e2e8f0;">
                        <tr>
                            <th style="padding:8px 14px; text-align:center; font-size:10px; color:#94a3b8; font-weight:800; text-transform:uppercase;">#</th>
                            <th class="lang-sw" style="padding:8px 14px; text-align:left; font-size:10px; color:#94a3b8; font-weight:800; text-transform:uppercase;">Kitu / Maelezo</th>
                            <th class="lang-en" style="display:none; padding:8px 14px; text-align:left; font-size:10px; color:#94a3b8; font-weight:800; text-transform:uppercase;">Item / Description</th>
                            <th class="lang-sw" style="padding:8px 14px; text-align:center; font-size:10px; color:#94a3b8; font-weight:800; text-transform:uppercase;">Idadi</th>
                            <th class="lang-en" style="display:none; padding:8px 14px; text-align:center; font-size:10px; color:#94a3b8; font-weight:800; text-transform:uppercase;">Qty</th>
                            <th class="lang-sw" style="padding:8px 14px; text-align:right; font-size:10px; color:#94a3b8; font-weight:800; text-transform:uppercase;">Bei</th>
                            <th class="lang-en" style="display:none; padding:8px 14px; text-align:right; font-size:10px; color:#94a3b8; font-weight:800; text-transform:uppercase;">Unit Price</th>
                            <th class="lang-sw" style="padding:8px 14px; text-align:right; font-size:10px; color:#94a3b8; font-weight:800; text-transform:uppercase;">Jumla</th>
                            <th class="lang-en" style="display:none; padding:8px 14px; text-align:right; font-size:10px; color:#94a3b8; font-weight:800; text-transform:uppercase;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsRows}
                    </tbody>
                </table>
            </div>
        `;
    });

    // Unda Modal
    let modal = document.getElementById('myBudgetBookModal');
    if (modal) modal.remove();

    modal = document.createElement('div');
    modal.id = 'myBudgetBookModal';
    modal.style.cssText = 'position:fixed; inset:0; background:rgba(15,23,42,0.85); z-index:60000; display:flex; align-items:flex-start; justify-content:center; padding:20px; overflow-y:auto;';
    
    modal.innerHTML = `
        <div style="background:white; border-radius:12px; max-width:1000px; width:100%; box-shadow:0 20px 50px rgba(0,0,0,0.5); position:relative; margin: 20px auto; overflow:hidden;">
            
            <!-- Action Bar (Top) - Hidden on Print -->
            <div class="no-print" style="background:#1e293b; padding:16px 24px; display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #cbd5e1;">
                <div style="color:white; font-size:14px; font-weight:600;">📄 Preview Mode</div>
                <div style="display:flex; gap:12px; align-items:center;">
                    
                    <!-- Language Toggle -->
                    <div style="display:flex; background:#334155; border-radius:8px; padding:4px; margin-right:16px;">
                        <button id="btnLangSw" onclick="toggleBookLanguage('sw')" style="padding:8px 16px; border:none; border-radius:6px; font-weight:800; font-size:12px; cursor:pointer; background:#0f172a; color:white; transition:0.2s;">🇹🇿 Kiswahili</button>
                        <button id="btnLangEn" onclick="toggleBookLanguage('en')" style="padding:8px 16px; border:none; border-radius:6px; font-weight:800; font-size:12px; cursor:pointer; background:transparent; color:#94a3b8; transition:0.2s;">🇬🇧 English</button>
                    </div>

                    <button onclick="printBudgetBook()" style="padding:10px 20px; background:#16a34a; color:white; border:none; border-radius:8px; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:6px; box-shadow:0 4px 12px rgba(22,163,74,0.3);">
                        🖨️ Print / Save as PDF
                    </button>
                    <button onclick="document.getElementById('myBudgetBookModal').remove()" style="padding:10px 20px; background:#ef4444; color:white; border:none; border-radius:8px; font-weight:700; cursor:pointer;">
                        ✕ Close
                    </button>
                </div>
            </div>

            <!-- Printable Area -->
            <div id="budgetBookPrintArea" style="padding:50px 60px; background:white;">
                
                <!-- Header -->
                <div style="text-align:center; border-bottom:4px double #0f172a; padding-bottom:25px; margin-bottom:30px;">
                    <img src="assets/makdc-logo.jpg" alt="Logo" style="height:90px; margin-bottom:15px;">
                    <h1 style="font-size:26px; font-weight:900; color:#0f172a; margin:0; font-family: 'Times New Roman', serif; letter-spacing:1px;">MAK DC INVESTMENT COMPANY LTD</h1>
                    <h2 class="lang-sw" style="font-size:18px; font-weight:700; color:#334155; margin:10px 0 5px 0; text-transform:uppercase; letter-spacing:2px;">KITABU RASMI CHA BAJETI YA IDARA</h2>
                    <h2 class="lang-en" style="display:none; font-size:18px; font-weight:700; color:#334155; margin:10px 0 5px 0; text-transform:uppercase; letter-spacing:2px;">OFFICIAL DEPARTMENTAL BUDGET BOOK</h2>
                    
                    <div style="font-size:14px; margin-top:15px; color:#475569; font-weight:600;">
                        <span class="lang-sw">Idara:</span><span class="lang-en" style="display:none;">Department:</span>
                        <span style="color:#0f172a;">${esc(alloc.department)}</span>
                        &nbsp;|&nbsp; 
                        <span class="lang-sw">Kipindi:</span><span class="lang-en" style="display:none;">Period:</span>
                        <span style="color:#0f172a;">${esc(b.period)}</span>
                        &nbsp;|&nbsp; 
                        <span class="lang-sw">Mwaka:</span><span class="lang-en" style="display:none;">Year:</span>
                        <span style="color:#0f172a;">${b.year || '—'}</span>
                    </div>
                </div>

                <!-- Narrative Section -->
                <div style="margin-bottom:35px; background:#f8fafc; padding:30px; border-radius:10px; border-left:6px solid #0f172a; box-shadow:0 4px 15px rgba(0,0,0,0.02); page-break-inside:avoid;">
                    
                    <!-- Swahili Narrative -->
                    <div class="lang-sw">
                        <h3 style="font-size:16px; font-weight:900; color:#0f172a; margin-bottom:15px; text-transform:uppercase; letter-spacing:1px;">Muhtasari wa Bajeti</h3>
                        <p style="font-size:14px; line-height:1.8; margin-bottom:15px; text-align:justify; color:#334155;">
                            Hiki ni Kitabu Rasmi cha Bajeti kwa ajili ya idara ya <strong>${esc(alloc.department)}</strong> kwa kipindi cha <strong>${esc(b.period)}</strong>. Kitabu hiki kinaeleza kwa kina jinsi kiasi cha <strong>TSh ${Number(alloc.ceilingAmount).toLocaleString()}</strong> kilichotengwa na Menejimenti kwa ajili ya idara hii kimetumika. 
                        </p>
                        <p style="font-size:14px; line-height:1.8; margin-bottom:15px; text-align:justify; color:#334155;">
                            Bajeti hii imeandaliwa kwa kuzingatia mahitaji halisi ya uendeshaji wa idara ili kuhakikisha kuwa malengo ya kimkakati yanafikiwa kwa wakati. Jumla ya matumizi yaliyopendekezwa na kupitishwa ni <strong>TSh ${totalItemsCost.toLocaleString()}</strong>. Kiasi hiki kimetumika katika shughuli mbalimbali muhimu zikiwemo safari za kikazi, ununuzi wa vifaa vya ofisi, na uendeshaji wa jumla. 
                        </p>
                        <p style="font-size:14px; line-height:1.8; text-align:justify; color:#334155;">
                            Tunatarajia kuwa utekelezaji wa bajeti hii utaleta tija na kuongeza ufanisi katika utendaji kazi wa kila siku. Hati hii imesainiwa na kupelekwa kwa Ofisi ya Mkurugenzi Mtendaji (CEO) kwa ajili ya uhakiki wa mwisho na matumizi.
                        </p>
                    </div>

                    <!-- English Narrative -->
                    <div class="lang-en" style="display:none;">
                        <h3 style="font-size:16px; font-weight:900; color:#0f172a; margin-bottom:15px; text-transform:uppercase; letter-spacing:1px;">Executive Summary</h3>
                        <p style="font-size:14px; line-height:1.8; margin-bottom:15px; text-align:justify; color:#334155;">
                            This document serves as the Official Budget Book for the <strong>${esc(alloc.department)}</strong> for the period of <strong>${esc(b.period)}</strong>. It provides a detailed breakdown of how the allocated ceiling of <strong>TSh ${Number(alloc.ceilingAmount).toLocaleString()}</strong> is being utilized to support the department's operational needs.
                        </p>
                        <p style="font-size:14px; line-height:1.8; margin-bottom:15px; text-align:justify; color:#334155;">
                            The budget has been carefully prepared to align with the strategic goals of the company. The total proposed and approved expenditure amounts to <strong>TSh ${totalItemsCost.toLocaleString()}</strong>. These funds are allocated to essential activities including field operations, procurement of necessary office supplies, and general administrative operations.
                        </p>
                        <p style="font-size:14px; line-height:1.8; text-align:justify; color:#334155;">
                            We anticipate that the execution of this budget will significantly improve efficiency and productivity within the department. This document is hereby submitted for final review and utilization by the Office of the Chief Executive Officer (CEO).
                        </p>
                    </div>
                </div>

                <!-- Table Section (Grouped Activities) -->
                <div class="lang-sw">
                    <h3 style="font-size:16px; font-weight:900; color:#0f172a; margin-bottom:20px; border-bottom:2px solid #cbd5e1; padding-bottom:8px; text-transform:uppercase; letter-spacing:1px;">Mgawanyo wa Kina wa Matumizi</h3>
                </div>
                <div class="lang-en" style="display:none;">
                    <h3 style="font-size:16px; font-weight:900; color:#0f172a; margin-bottom:20px; border-bottom:2px solid #cbd5e1; padding-bottom:8px; text-transform:uppercase; letter-spacing:1px;">Detailed Breakdown of Expenses</h3>
                </div>
                
                <!-- Hapa ndipo Kadi za Shughuli (Activity Cards) zinatokea -->
                ${activitiesHtml || '<p style="text-align:center; color:#64748b; padding:20px;">Hakuna data ya matumizi.</p>'}

                <!-- Overall Grand Total Box -->
                <div style="margin-top:20px; background:#0f172a; border-radius:10px; padding:20px 30px; display:flex; justify-content:space-between; align-items:center; page-break-inside:avoid;">
                    <div>
                        <div class="lang-sw" style="font-size:12px; font-weight:800; color:#94a3b8; text-transform:uppercase; letter-spacing:1px;">Jumla Kuu ya Matumizi Yote</div>
                        <div class="lang-en" style="display:none; font-size:12px; font-weight:800; color:#94a3b8; text-transform:uppercase; letter-spacing:1px;">Overall Grand Total</div>
                    </div>
                    <div style="font-size:28px; font-weight:900; color:#2ecc71; font-family:'Courier New', monospace;">
                        TSh ${totalItemsCost.toLocaleString()}
                    </div>
                </div>

                <!-- Signatures -->
                <div style="display:flex; justify-content:space-between; margin-top:80px; page-break-inside:avoid;">
                    <div style="text-align:center; width:250px;">
                        <div class="lang-sw" style="font-size:12px; font-weight:bold; color:#475569; margin-bottom:50px;">Imeandaliwa Na:</div>
                        <div class="lang-en" style="display:none; font-size:12px; font-weight:bold; color:#475569; margin-bottom:50px;">Prepared By:</div>
                        <div style="border-bottom:2px solid #000; height:30px;"></div>
                        <div style="font-size:13px; font-weight:bold; margin-top:10px;">${esc(b.createdBy || 'Manager')}</div>
                        <div class="lang-sw" style="font-size:11px; color:#64748b;">(Meneja)</div>
                        <div class="lang-en" style="display:none; font-size:11px; color:#64748b;">(Manager)</div>
                    </div>
                    <div style="text-align:center; width:250px;">
                        <div class="lang-sw" style="font-size:12px; font-weight:bold; color:#475569; margin-bottom:50px;">Imeidhinishwa Na:</div>
                        <div class="lang-en" style="display:none; font-size:12px; font-weight:bold; color:#475569; margin-bottom:50px;">Approved By:</div>
                        <div style="border-bottom:2px solid #000; height:30px;"></div>
                        <div style="font-size:13px; font-weight:bold; margin-top:10px;">CEO</div>
                        <div class="lang-sw" style="font-size:11px; color:#64748b;">(Mkurugenzi Mtendaji)</div>
                        <div class="lang-en" style="display:none; font-size:11px; color:#64748b;">(Chief Executive Officer)</div>
                    </div>
                </div>

                <!-- Footer -->
                <div style="text-align:center; margin-top:60px; font-size:10px; color:#94a3b8; border-top:1px solid #e2e8f0; padding-top:15px;">
                    <span class="lang-sw">Hati hii imetengenezwa na mfumo wa kompyuta. Ilizalishwa tarehe ${new Date().toLocaleString()}.</span>
                    <span class="lang-en" style="display:none;">This is a computer-generated document. Generated on ${new Date().toLocaleString()}.</span>
                    <br>MAK DC Investment Company LTD &copy; ${new Date().getFullYear()}
                </div>

            </div>
        </div>
    `;

    document.body.appendChild(modal);
    window.currentBookLang = 'sw'; // Lugha ya kwanza ni Kiswahili
}
function toggleBookLanguage(lang) {
    window.currentBookLang = lang;
    
    // Chagua vitu vyote vyenye class ya lugha
    const swElements = document.querySelectorAll('#myBudgetBookModal .lang-sw');
    const enElements = document.querySelectorAll('#myBudgetBookModal .lang-en');
    
    const btnSw = document.getElementById('btnLangSw');
    const btnEn = document.getElementById('btnLangEn');

    if (lang === 'sw') {
        // Onyesha Kiswahili, Ficha Kiingereza
        swElements.forEach(el => {
            el.style.display = (el.tagName === 'TD' || el.tagName === 'TH') ? 'table-cell' : (el.tagName === 'TR' ? 'table-row' : 'block');
        });
        enElements.forEach(el => el.style.display = 'none');
        
        // Badilisha rangi ya vitufe
        if(btnSw) { btnSw.style.background = '#0f172a'; btnSw.style.color = 'white'; }
        if(btnEn) { btnEn.style.background = 'transparent'; btnEn.style.color = '#94a3b8'; }
    } else {
        // Onyesha Kiingereza, Ficha Kiswahili
        swElements.forEach(el => el.style.display = 'none');
        enElements.forEach(el => {
            el.style.display = (el.tagName === 'TD' || el.tagName === 'TH') ? 'table-cell' : (el.tagName === 'TR' ? 'table-row' : 'block');
        });
        
        // Badilisha rangi ya vitufe
        if(btnEn) { btnEn.style.background = '#0f172a'; btnEn.style.color = 'white'; }
        if(btnSw) { btnSw.style.background = 'transparent'; btnSw.style.color = '#94a3b8'; }
    }
}
function printBudgetBook() {
    // 1. Chukua maudhui ya kitabu
    const printContents = document.getElementById('budgetBookPrintArea').innerHTML;
    const lang = window.currentBookLang || 'sw';

    // 2. Fungua dirisha jipya la kuchapisha (Window mpya inazuia CSS ya dashboard kuingilia)
    const printWindow = window.open('', '_blank', 'width=900,height=800');
    
    // 3. Andika HTML kamili kwenye dirisha jipya
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Budget Book - MAK DC</title>
            <style>
                /* CSS Maalum kwa ajili ya PDF/Print */
                @page {
                    size: A4 portrait;
                    margin: 15mm;
                }
                body {
                    font-family: 'Inter', Arial, sans-serif;
                    color: #0f172a;
                    background: white;
                    margin: 0;
                    padding: 0;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                
                /* Ficha vitufe vyote vya rangi na sehemu zisizohitajika */
                .no-print, button, .action-bar {
                    display: none !important;
                }

                /* Mpangilio wa lugha */
                .lang-sw { display: ${lang === 'sw' ? 'block' : 'none'} !important; }
                .lang-en { display: ${lang === 'en' ? 'block' : 'none'} !important; }
                
                /* Kwa ajili ya vitu vya ndani ya table */
                td.lang-sw, th.lang-sw { display: ${lang === 'sw' ? 'table-cell' : 'none'} !important; }
                td.lang-en, th.lang-en { display: ${lang === 'en' ? 'table-cell' : 'none'} !important; }

                /* Kila kadi ya shughuli isivunjike katikati */
                .activity-card {
                    page-break-inside: avoid;
                    margin-bottom: 20px !important;
                }
                
                /* Jedwali lisitoke nje ya ukurasa */
                table {
                    width: 100% !important;
                    max-width: 100% !important;
                    border-collapse: collapse !important;
                }
                
                /* Rudisha ukubwa wa picha na fonts */
                img { max-width: 100%; height: auto; }
            </style>
        </head>
        <body>
            ${printContents}
        </body>
        </html>
    `);

    // 4. Subiri kidogo kisha chapisha
    setTimeout(() => {
        printWindow.document.close(); // Muhimu kwa baadhi ya browsers
        printWindow.focus();
        printWindow.print();
        // printWindow.close(); // Kama unataka ifunge baada ya kuchapisha, ondoa alama ya //
    }, 500);
}
async function openBudgetBookForDept(budgetId) {
    try {
        // 1. Vuta taarifa za bajeti husika
        const budget = await API.getMasterBudgetById(budgetId);
        if (!budget) {
            showToast('⚠ Budget not found', 'error');
            return;
        }

        // 2. Tafuta mgao (allocation) wa idara yako kwenye bajeti hiyo
        const user = Auth.getUser();
        const myDept = user?.department || user?.departmentName;
        const myAllocation = budget.allocations.find(a => a.department === myDept);

        if (!myAllocation) {
            showToast('❌ You have no allocation in this budget', 'error');
            return;
        }

        // 3. Weka data kwenye variable ya muda
        const tempBudgetData = { ...budget, myAllocation };

        // 4. Fungua Kitabu kwa kutumia data hiyo
        await openMyDeptBudgetBook(tempBudgetData);

    } catch (err) {
        showToast('❌ ' + err.message, 'error');
    }
}
// ================================================================
// 🆕 SALES KPI DASHBOARD
// 🎨 RANGI: #3d5a3d (Dark Green) + #c9a227 (Gold)
// ================================================================
let isLoadingSalesKpis = false;
let allSalesKpisData = [];
let currentUpdateSalesKpiId = null;
let currentSalesKpiData = null;

// ===== LOAD KPIs =====
async function loadSalesKpis() {
    const container = document.getElementById('salesKpiContainer');
    const periodLabel = document.getElementById('salesKpiPeriodLabel');
    if (!container) return;

    if (isLoadingSalesKpis) return;
    isLoadingSalesKpis = true;

    const periodSelect = document.getElementById('filterSalesKpiPeriod');
    if (periodSelect && periodSelect.options.length === 0) {
        populateSalesKpiPeriodSelector();
    }

    const selectedPeriod = periodSelect?.value;
    const now = new Date();
    const currentPeriod = selectedPeriod || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    container.innerHTML = `
        <div style="text-align: center; padding: 50px; color: #6e7a5e;">
            <div style="font-size: 40px; margin-bottom: 10px; opacity: 0.5;">⏳</div>
            <div style="font-weight: 700;">Loading targets for ${currentPeriod}...</div>
        </div>`;

    try {
        const user = Auth.getUser();
        // 🆕 FIX: Tumia userId au id tu
        const empId = user.userId || user.id;
        
        if (!empId) throw new Error("User ID not found in session.");

        const kpis = await API.getEmployeeKpis({ 
            employeeId: Number(empId), 
            period: currentPeriod,
            status: 'released'
        });

        let rawData = kpis || [];

        // 🆕 FIX: Kichujio cha Usalama (Frontend Filter)
        const myFullName = (user.fullName || '').toLowerCase().trim();
        allSalesKpisData = rawData.filter(kpi => {
            if (kpi.employeeName) {
                return kpi.employeeName.toLowerCase().trim() === myFullName;
            }
            if (kpi.employeeId) {
                return String(kpi.employeeId) === String(empId);
            }
            return true;
        });

        if (allSalesKpisData.length === 0) {
            periodLabel.textContent = 'No Targets';
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #6e7a5e;">
                    <div style="font-size: 40px; margin-bottom: 10px;">🎯</div>
                    <div style="font-size: 16px; font-weight: 800; color: #505a44;">No Targets Assigned</div>
                    <div style="font-size: 13px; color: #6e7a5e; margin-top: 4px;">CEO has not assigned any KPIs for <strong>${currentPeriod}</strong>.</div>
                </div>
            `;
            return;
        }

        periodLabel.textContent = allSalesKpisData[0].periodLabel || currentPeriod;
        renderSalesKpiTable(allSalesKpisData);

    } catch (err) {
        console.error("KPI Load Error:", err);
        container.innerHTML = `<div style="text-align: center; padding: 40px; color: #dc2626;">❌ Failed to load KPIs: ${err.message}</div>`;
    } finally {
        isLoadingSalesKpis = false; 
    }
}
// ===== RENDER TABLE =====
function renderSalesKpiTable(kpis) {
    const container = document.getElementById('salesKpiContainer');
    if (!container) return;

    if (kpis.length === 0) {
        container.innerHTML = `<div style="text-align: center; padding: 40px; color: #6e7a5e;">No targets match your search.</div>`;
        return;
    }

    // 🎨 RANGI ZA SALES
    const PRIMARY = '#3d5a3d';
    const ACCENT = '#c9a227';

    let rowsHtml = '';

    kpis.forEach((kpi) => {
        let percentage = 0;
        let statusColor = '#6e7a5e'; 
        let statusText = 'Pending';
        let bgStatus = '#f7f8f5';
        let isOver = false;

        if (kpi.actualValue !== null && kpi.actualValue !== undefined) {
            if (kpi.metricType === 'WASTE_PERCENT') {
                percentage = kpi.actualValue <= kpi.targetValue ? 100 : (kpi.targetValue / kpi.actualValue) * 100;
            } else {
                percentage = (kpi.actualValue / kpi.targetValue) * 100;
            }
            percentage = Math.round(percentage);
            
            if (percentage > 100) {
                isOver = true;
                statusColor = ACCENT;
                bgStatus = 'rgba(201,162,39,0.15)';
                statusText = `🔥 Over (${percentage}%)`;
            } else if (percentage >= 100) {
                statusColor = '#16a34a'; bgStatus = '#f0fdf4'; statusText = 'Achieved';
            } else if (percentage >= 80) {
                statusColor = '#d97706'; bgStatus = '#fffbeb'; statusText = 'On Track';
            } else {
                statusColor = '#dc2626'; bgStatus = '#fef2f2'; statusText = 'Below Target';
            }
        }
        
        const barWidth = Math.min(percentage, 100);
        const valText = kpi.actualValue !== null ? kpi.actualValue.toLocaleString() : '—';
        const tarText = kpi.targetValue ? kpi.targetValue.toLocaleString() : '—';

        // History from notes
        let historyHtml = '';
        if (kpi.notes && kpi.notes.includes('[')) {
            const historyLines = kpi.notes.split('\n').filter(l => l.includes('['));
            const recentHistory = historyLines.slice(-3).reverse();
            historyHtml = `
                <div style="margin-top: 8px; background: #f7f8f5; padding: 8px 12px; border-radius: 8px; border-left: 3px solid ${PRIMARY};">
                    <div style="font-size: 9px; font-weight: 800; color: ${PRIMARY}; text-transform: uppercase; margin-bottom: 4px;">📅 Recent Progress Log</div>
                    ${recentHistory.map(line => `<div style="font-size: 11px; color: #505a44; margin-bottom: 2px;">${esc(line.trim())}</div>`).join('')}
                </div>
            `;
        }

        rowsHtml += `
            <tr style="border-bottom: 1px solid #eef0ea; transition: background 0.2s;" onmouseover="this.style.background='#f7f8f5'" onmouseout="this.style.background='white'">
                <td style="padding: 16px; font-weight: 800; color: #252a1e; font-size: 14px;">
                    ${kpi.metricLabel}
                    ${historyHtml}
                </td>
                <td style="padding: 16px; text-align: center;">
                    <div style="display: inline-flex; align-items: center; gap: 8px; background: #f7f8f5; padding: 4px 12px; border-radius: 8px; border: 1px solid #dde1d6;">
                        <span style="font-size: 13px; font-weight: 800; color: #6e7a5e;">${tarText}</span>
                        <span style="color: #c4cab8; font-size: 14px;">➔</span>
                        <span style="font-size: 13px; font-weight: 900; color: ${statusColor};">${valText}</span>
                        <span style="font-size: 10px; font-weight: 700; color: #9aa38b; margin-left: 2px;">${kpi.metricUnit}</span>
                    </div>
                </td>
                <td style="padding: 16px; width: 200px;">
                    <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: 800; color: #505a44; margin-bottom: 6px;">
                        <span>Progress</span>
                        <span style="color: ${statusColor};">${percentage}%</span>
                    </div>
                    <div style="width: 100%; height: 6px; background: #dde1d6; border-radius: 3px; overflow: hidden;">
                        <div style="width: ${barWidth}%; height: 100%; background: ${statusColor}; border-radius: 3px;"></div>
                    </div>
                </td>
                <td style="padding: 16px; text-align: right;">
                    <span style="display: inline-block; padding: 4px 10px; border-radius: 12px; background: ${bgStatus}; color: ${statusColor}; font-size: 10px; font-weight: 800; text-transform: uppercase;">
                        ${statusText}
                    </span>
                </td>
                <td style="padding: 16px; text-align: center;">
                    <button onclick="openUpdateSalesActualModal(${kpi.id}, '${kpi.metricLabel}', '${kpi.metricUnit}', ${kpi.actualValue || 0}, ${kpi.targetValue || 0}, \`${(kpi.notes || '').replace(/`/g, '\\`')}\`)" 
                            style="padding: 6px 12px; background: rgba(61,90,61,0.1); color: ${PRIMARY}; border: 1px solid rgba(61,90,61,0.2); border-radius: 6px; font-weight: 700; font-size: 11px; cursor: pointer; font-family: inherit;">
                        ✏️ Update
                    </button>
                </td>
            </tr>
        `;
    });

    container.innerHTML = `
        <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; text-align: left;">
                <thead style="background: #f7f8f5; border-bottom: 2px solid #dde1d6;">
                    <tr>
                        <th style="padding: 14px 16px; font-size: 11px; font-weight: 800; color: #6e7a5e; text-transform: uppercase; letter-spacing: 1px;">Metric</th>
                        <th style="padding: 14px 16px; font-size: 11px; font-weight: 800; color: #6e7a5e; text-transform: uppercase; letter-spacing: 1px; text-align: center;">Target ➔ Actual</th>
                        <th style="padding: 14px 16px; font-size: 11px; font-weight: 800; color: #6e7a5e; text-transform: uppercase; letter-spacing: 1px;">Completion</th>
                        <th style="padding: 14px 16px; font-size: 11px; font-weight: 800; color: #6e7a5e; text-transform: uppercase; letter-spacing: 1px; text-align: right;">Status</th>
                        <th style="padding: 14px 16px; font-size: 11px; font-weight: 800; color: #6e7a5e; text-transform: uppercase; letter-spacing: 1px; text-align: center;">Action</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>
        </div>
    `;
}

// ===== FILTER =====
function filterSalesKpis() {
    const searchTerm = (document.getElementById('searchSalesKpi')?.value || '').toLowerCase().trim();
    const statusFilter = document.getElementById('filterSalesKpiStatus')?.value || '';

    const filteredData = allSalesKpisData.filter(kpi => {
        const matchName = kpi.metricLabel.toLowerCase().includes(searchTerm);
        
        let matchStatus = true;
        if (statusFilter) {
            let percentage = 0;
            let statusKey = 'pending';
            if (kpi.actualValue !== null && kpi.actualValue !== undefined) {
                if (kpi.metricType === 'WASTE_PERCENT') {
                    percentage = kpi.actualValue <= kpi.targetValue ? 100 : (kpi.targetValue / kpi.actualValue) * 100;
                } else {
                    percentage = (kpi.actualValue / kpi.targetValue) * 100;
                }
                percentage = Math.round(percentage);
                if (percentage >= 100) statusKey = 'achieved';
                else if (percentage >= 80) statusKey = 'ontrack';
                else statusKey = 'below';
            }
            matchStatus = statusKey === statusFilter;
        }

        return matchName && matchStatus;
    });

    renderSalesKpiTable(filteredData);
}

// ===== PERIOD SELECTOR =====
function populateSalesKpiPeriodSelector() {
    const select = document.getElementById('filterSalesKpiPeriod');
    if (!select) return;

    const now = new Date();
    const currentYear = now.getFullYear();
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    let options = '';

    for (let year = currentYear; year >= currentYear - 1; year--) {
        for (let m = 11; m >= 0; m--) {
            const monthValue = `${year}-${String(m + 1).padStart(2, '0')}`;
            const label = `${monthNames[m]} ${year}`;
            const isCurrent = (year === currentYear && m === now.getMonth());
            
            options += `<option value="${monthValue}" ${isCurrent ? 'selected' : ''}>${label}</option>`;
        }
    }

    select.innerHTML = options;
}

// ===== UPDATE ACTUAL MODAL =====
function openUpdateSalesActualModal(kpiId, metricLabel, metricUnit, currentActual, targetValue, historyNotes) {
    currentUpdateSalesKpiId = kpiId;
    currentSalesKpiData = { currentActual, targetValue, metricUnit };
    
    document.getElementById('salesUaKpiName').textContent = metricLabel;
    document.getElementById('salesUaKpiUnit').textContent = metricUnit;
    document.getElementById('salesUaTargetDisplay').textContent = `${Number(targetValue).toLocaleString()} ${metricUnit}`;
    document.getElementById('salesUaIncrementValue').value = '';
    document.getElementById('salesUaNotes').value = '';
    document.getElementById('salesUaLivePreview').style.display = 'none';
    
    // Historia
    const historyContainer = document.getElementById('salesUaHistory');
    if (historyNotes && historyNotes.includes('[')) {
        const historyLines = historyNotes.split('\n').filter(l => l.includes('[')).reverse();
        historyContainer.innerHTML = historyLines.map(line => `
            <div style="font-size: 11.5px; color: #505a44; padding: 6px 0; border-bottom: 1px dashed #dde1d6;">
                ${line}
            </div>
        `).join('');
    } else {
        historyContainer.innerHTML = `<div style="font-size: 12px; color: #9aa38b; font-style: italic;">No history yet.</div>`;
    }

    document.getElementById('salesUaStatus').className = 'status-msg';
    document.getElementById('salesUaStatus').textContent = '';
    
    const btn = document.getElementById('salesUaSaveBtn');
    btn.disabled = false;
    btn.textContent = '🚀 Save Progress';

    document.getElementById('updateSalesActualModal').classList.add('show');
}

function updateSalesPreviewTotal() {
    const increment = parseFloat(document.getElementById('salesUaIncrementValue').value) || 0;
    const previewDiv = document.getElementById('salesUaLivePreview');
    const display = document.getElementById('salesUaNewTotalDisplay');

    if (increment > 0) {
        const newTotal = currentSalesKpiData.currentActual + increment;
        display.textContent = `${newTotal.toLocaleString()} ${currentSalesKpiData.metricUnit}`;
        previewDiv.style.display = 'block';
    } else {
        previewDiv.style.display = 'none';
    }
}

async function saveSalesActualValue() {
    const statusDiv = document.getElementById('salesUaStatus');
    const saveBtn = document.getElementById('salesUaSaveBtn');
    const incrementValue = parseFloat(document.getElementById('salesUaIncrementValue').value);
    const notes = document.getElementById('salesUaNotes').value.trim();

    if (isNaN(incrementValue) || incrementValue <= 0) {
        statusDiv.className = 'status-msg error';
        statusDiv.textContent = '⚠ Please enter a valid number greater than 0.';
        return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = '⏳ Saving...';
    saveBtn.style.opacity = '0.7';

    try {
        await API.updateEmployeeKpi(currentUpdateSalesKpiId, { 
            incrementValue: incrementValue,
            notes: notes 
        });

        statusDiv.className = 'status-msg success';
        statusDiv.textContent = '✓ Progress saved successfully!';

        setTimeout(() => {
            closeModal('updateSalesActualModal');
            loadSalesKpis();
        }, 800);

    } catch (err) {
        statusDiv.className = 'status-msg error';
        statusDiv.textContent = '⚠ ' + err.message;
        saveBtn.disabled = false;
        saveBtn.textContent = '🚀 Save Progress';
        saveBtn.style.opacity = '1';
    }
}
// ================================================================
// MAIL SYSTEM — SALES DASHBOARD
// ================================================================

let allMailUsers = [];
let mailListCache = {};
let mailListCacheTime = {};
const MAIL_CACHE_TTL = 30000;
let selectedSendTo = [];
let selectedCC = [];
let currentMailAttachments = [];
let currentMailBoxType = 'inbox';
let cachedMailList = [];
let currentMailId = null;

// ================= 1. LOAD BADGES =================
async function loadMailBadges() {
    try {
        const counts = await API.getMailUnreadCount().catch(() => null);
        
        if (counts) {
            if(document.getElementById('inboxBadge')) document.getElementById('inboxBadge').textContent = counts.inbox || 0;
            if(document.getElementById('pendingBadge')) document.getElementById('pendingBadge').textContent = counts.pending || 0;
            if(document.getElementById('minutesBadge')) document.getElementById('minutesBadge').textContent = counts.minutes || 0;
            
            if(document.getElementById('mailHeaderBadge')) {
                const total = (counts.inbox || 0) + (counts.pending || 0);
                const badge = document.getElementById('mailHeaderBadge');
                if (total > 0) {
                    badge.textContent = total;
                    badge.style.display = 'flex';
                } else {
                    badge.style.display = 'none';
                }
            }
        }
    } catch (err) { 
        console.error('Badge error:', err); 
    }
}

// ================= 2. SWITCH MAILBOX =================
async function switchMailBox(type) {
    currentMailBoxType = type;
    closeMailDetailView(); 
    
    const titles = {
        'inbox': 'Inbox', 'pending': 'Pending Actions', 'minutes': 'Minutes',
        'sent': 'Sent Messages', 'drafts': 'Drafts', 'starred': 'Starred', 'documents': 'Attachments'
    };
    document.getElementById('mailListTitle').textContent = titles[type] || 'Inbox';

    const navIds = ['inbox', 'pending', 'minutes', 'sent', 'drafts', 'starred'];
    navIds.forEach(nav => {
        const btn = document.getElementById(`mail-nav-${nav}`);
        if (btn) btn.classList.remove('active');
    });
    
    const activeBtn = document.getElementById(`mail-nav-${type}`);
    if (activeBtn) activeBtn.classList.add('active');

    await loadMailboxMessages(type);
}

// ================= 3. LOAD MESSAGES =================
async function loadMailboxMessages(type) {
    const container = document.getElementById('mailListContainer');

    const now = Date.now();
    if (mailListCache[type] && (now - (mailListCacheTime[type] || 0) < MAIL_CACHE_TTL)) {
        cachedMailList = mailListCache[type];
        renderMailList(cachedMailList);
        return;
    }

    container.innerHTML = `<div style="text-align: center; padding: 60px; color: #6e7a5e;"><div style="font-size: 40px; margin-bottom: 10px; opacity: 0.5;">⏳</div><div style="font-weight: 700;">Fetching messages...</div></div>`;

    try {
        const messages = await API.getMailboxMessages(type);
        cachedMailList = messages || [];

        mailListCache[type] = cachedMailList;
        mailListCacheTime[type] = now;

        if (cachedMailList.length === 0) {
            container.innerHTML = `<div class="mail-empty"><div class="mail-empty-icon">📭</div><div class="mail-empty-title">No Messages Found</div><div class="mail-empty-desc">Your ${type} is empty.</div></div>`;
            return;
        }
        renderMailList(cachedMailList);
    } catch (err) {
        console.error('Mail load error:', err);
        container.innerHTML = `<div style="text-align: center; padding: 40px; background: #fef2f2; border-radius: 12px; color: #b91c1c;"><div style="font-size: 30px; margin-bottom: 10px;">❌</div><div style="font-weight: 800;">Failed to load messages</div><div style="font-size: 13px;">${err.message}</div></div>`;
    }
}

// ================= 4. RENDER MAIL LIST =================
function renderMailList(messages) {
    const container = document.getElementById('mailListContainer');
    const countEl = document.getElementById('mailListCount');
    
    if (countEl) countEl.textContent = `${messages.length} message${messages.length !== 1 ? 's' : ''}`;
    
    if (messages.length === 0) {
        container.innerHTML = `
            <div class="mail-empty">
                <div class="mail-empty-icon">📭</div>
                <div class="mail-empty-title">No Messages</div>
                <div class="mail-empty-desc">Your ${currentMailBoxType} is empty.</div>
            </div>
        `;
        return;
    }

    container.innerHTML = messages.map(msg => {
        const isUnread = msg.status === 'unread';
        const isClosed = msg.status === 'closed';
        const isPending = msg.status === 'pending' || (msg.assignedTo && msg.assignedTo.length > 0 && !isClosed);
        
        const displayName = currentMailBoxType === 'sent' 
            ? (msg.receiverName || 'Unknown')
            : (msg.senderName || 'Unknown');
        const prefix = currentMailBoxType === 'sent' ? 'To: ' : '';
        
        const dateStr = msg.createdAt 
            ? new Date(msg.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
            : '';
            
        const initials = (displayName || 'U').substring(0, 2).toUpperCase();
        
        const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#14b8a6'];
        const colorIndex = displayName.length % colors.length;
        const avatarColor = colors[colorIndex];

        let badges = '';
        if (msg.isMinute) {
            badges += `<span style="font-size: 9px; font-weight: 900; padding: 2px 6px; border-radius: 4px; background: rgba(139,92,246,0.15); color: #7c3aed; letter-spacing: 0.5px;">📝 MINUTE</span>`;
        }
        if (isClosed) {
            badges += `<span style="font-size: 9px; font-weight: 900; padding: 2px 6px; border-radius: 4px; background: rgba(100,116,139,0.15); color: #475569; letter-spacing: 0.5px;">🔒 CLOSED</span>`;
        } else if (isPending) {
            badges += `<span style="font-size: 9px; font-weight: 900; padding: 2px 6px; border-radius: 4px; background: rgba(245,158,11,0.15); color: #b45309; letter-spacing: 0.5px;">⏳ IN PROGRESS</span>`;
        }
        if (msg.isStarred) {
            badges += `<span style="font-size: 14px;">⭐</span>`;
        }
        
        return `
            <div class="mail-item ${isUnread ? 'unread' : ''}" onclick="viewMailDetail('${msg.id}')">
                <div class="mi-avatar" style="background: ${avatarColor}15; color: ${avatarColor}; border: 1.5px solid ${avatarColor}30;">
                    ${initials}
                </div>
                <div style="flex: 1; min-width: 0;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; gap: 10px;">
                        <div style="font-size: 14.5px; font-weight: ${isUnread ? '900' : '700'}; color: #3a4130; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                            ${prefix}${esc(displayName)}
                        </div>
                        <div style="font-size: 11px; font-weight: 800; color: #9aa38b; flex-shrink: 0; background: #eef0ea; padding: 3px 8px; border-radius: 6px;">
                            ${dateStr}
                        </div>
                    </div>
                    <div style="font-size: 14px; font-weight: ${isUnread ? '800' : '600'}; color: #252a1e; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 6px;">
                        ${esc(msg.subject || '(No Subject)')}
                    </div>
                    <div style="font-size: 13px; color: #6e7a5e; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.5;">
                        ${esc((msg.body || '').substring(0, 120))}${(msg.body || '').length > 120 ? '...' : ''}
                    </div>
                </div>
                <div style="display: flex; flex-direction: column; align-items: flex-end; justify-content: center; gap: 6px; flex-shrink: 0; margin-left: 8px;">
                    ${badges}
                    ${isUnread ? '<div style="width: 8px; height: 8px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.2);"></div>' : ''}
                </div>
            </div>
        `;
    }).join('');
}

// ================= 5. FILTER MAIL LIST =================
let mailFilterTimeout;
function filterMailList() {
    clearTimeout(mailFilterTimeout);
    mailFilterTimeout = setTimeout(() => {
        const query = (document.getElementById('mailSearchInput')?.value || '').toLowerCase().trim();

        if (!query) {
            renderMailList(cachedMailList);
            return;
        }

        const filtered = cachedMailList.filter(msg =>
            (msg.subject && msg.subject.toLowerCase().includes(query)) ||
            (msg.senderName && msg.senderName.toLowerCase().includes(query)) ||
            (msg.receiverName && msg.receiverName.toLowerCase().includes(query)) ||
            (msg.body && msg.body.toLowerCase().includes(query))
        );

        renderMailList(filtered);
    }, 300);
}

// ================= 6. VIEW MAIL DETAIL =================
async function viewMailDetail(id) {
    currentMailId = id;
    document.getElementById('mailListView').style.display = 'none';
    document.getElementById('mailDetailView').style.display = 'flex';
    
    const backLabel = document.getElementById('mailBackLabel');
    if (backLabel) backLabel.textContent = document.getElementById('mailListTitle')?.textContent || 'Inbox';
    
    const body = document.getElementById('mailDetailBody');
    
    body.innerHTML = `
        <div style="text-align: center; padding: 60px; color: var(--gray-500);">
            <div style="font-size: 40px; margin-bottom: 10px; opacity: 0.5;">⏳</div>
            <div style="font-weight: 700;">Loading message...</div>
        </div>
    `;

    try {
        let msg = await API.getInternalMailById(id); 
        if (!msg) {
            body.innerHTML = `<div style="color: var(--red); text-align: center; padding: 40px; font-weight: 800;">❌ Message not found.</div>`;
            return;
        }
        
        if (!window.mailCache) window.mailCache = {};
        window.mailCache[id] = msg;

        if (currentMailBoxType === 'inbox' && msg.status === 'unread') {
            (async () => {
                try {
                    await API.markMailAsRead(id);
                    loadMailBadges();
                    msg.status = 'read';
                } catch (e) { console.warn('Mark read error:', e); }
            })();
        }
        
        const isClosed = msg.status === 'closed' || msg.status === 'draft';
        
        let totalAtts = 0;
        if (msg.attachments && Array.isArray(msg.attachments)) totalAtts += msg.attachments.length;
        if (msg.attendance && Array.isArray(msg.attendance)) {
            msg.attendance.forEach(att => {
                if (att.attachments && Array.isArray(att.attachments)) totalAtts += att.attachments.length;
            });
        }

        const attButton = `
            <button class="btn-attachments-glow" onclick="openAttachmentsModal('${id}')">
                📎 Attachments (${totalAtts})
            </button>
        `;

        let actionButtons = `
            ${attButton}
            <div style="width: 1px; height: 20px; background: #cbd5e1; margin: 0 8px;"></div>
            <button class="btn-act-reply" onclick="openReplyModal('${id}')">↩️ Reply</button>
        `;
        
        if (!isClosed) {
            actionButtons += `
                <button class="btn-act-attend" onclick="openAttendModal('${id}')">✅ Attend & Assign</button>
                <button class="btn-act-close" onclick="closeCurrentMail()">🔒 Close Workflow</button>
            `;
        } else {
            actionButtons += `<div style="padding: 8px 14px; background: #f5f3ff; color: #6d28d9; border: 1px solid #ede9fe; border-radius: 8px; font-weight: 800; font-size: 12px; display: inline-flex; align-items: center;">🔒 Closed</div>`;
        }

        const detailActions = document.querySelector('.mail-detail-actions');
        if (detailActions) {
            detailActions.innerHTML = `
                ${actionButtons}
                <div style="width: 1px; height: 20px; background: #cbd5e1; margin: 0 8px;"></div>
                <button id="btnStarMail" class="mail-icon-btn" onclick="toggleStarCurrentMail()" title="Star">⭐</button>
                <button id="btnArchiveMail" class="mail-icon-btn" onclick="toggleArchiveCurrentMail()" title="Archive">📁</button>
                <button id="btnDeleteMail" class="mail-icon-btn danger" onclick="deleteCurrentMail()" title="Delete">🗑️</button>
            `;
        }

        body.innerHTML = `
            <div class="mail-detail-modern">
                
                <!-- ================= LEFT: WORKFLOW PANEL ================= -->
                <div class="md-workflow-panel">
                    <div class="md-wf-header">
                        <div class="md-wf-header-icon">🔄</div>
                        <div class="md-wf-header-title">
                            <h3>Workflow History</h3>
                            <p>Actions & assignments</p>
                        </div>
                    </div>
                    <div class="md-wf-body">
                        ${renderWorkflowChain(msg)}
                    </div>
                </div>

                <!-- ================= RIGHT: MESSAGE PANEL ================= -->
                <div class="md-message-panel">
                    <div class="md-msg-header">
                        <h2 class="md-msg-subject">${esc(msg.subject || '(No Subject)')}</h2>
                        
                        <div class="md-msg-meta-row">
                            <div class="md-msg-avatar">${(msg.senderName || 'U').substring(0, 2).toUpperCase()}</div>
                            <div class="md-msg-sender-info">
                                <div class="md-msg-sender-name">${esc(msg.senderName || 'Unknown')}</div>
                                <div class="md-msg-receiver">
                                    To: <strong>${esc(msg.receiverName || '—')}</strong>
                                    <span class="md-msg-status ${msg.status}">${(msg.status || '').toUpperCase()}</span>
                                </div>
                            </div>
                            <div class="md-msg-date">
                                📅 ${new Date(msg.createdAt).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                            </div>
                        </div>
                    </div>
                    
                    <div class="md-msg-body">
                        ${esc(msg.body || '')}
                    </div>
                </div>
            </div>
        `;

    } catch (err) {
        console.error('View Mail Error:', err);
        body.innerHTML = `<div style="color: var(--red); text-align: center; padding: 40px; font-weight: 800;">❌ Failed to load: ${esc(err.message)}</div>`;
    }
}

// ================= 7. RENDER WORKFLOW CHAIN =================
function renderWorkflowChain(msg) {
    const attendance = msg.attendance || [];
    
    if (attendance.length === 0) {
        return `
            <div class="md-tl-empty">
                <div class="md-tl-empty-icon">📭</div>
                <div class="md-tl-empty-title">No Workflow Yet</div>
                <div class="md-tl-empty-desc">Actions will appear here.</div>
            </div>`;
    }

    const sorted = [...attendance].sort((a, b) => 
        new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
    );

    return `
        <div class="md-timeline">
            ${sorted.map((att) => {
                const action = (att.action || 'attended').toLowerCase();
                const userName = att.userName || 'System';
                const userRole = att.userRole || att.role || 'User';
                const initials = userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                const timeStr = formatTimeAgo(att.createdAt);
                
                let actionClass = 'attended';
                let actionLabel = 'Attended';
                if (action.includes('created') || action === 'send') { 
                    actionClass = 'created'; actionLabel = 'Created'; 
                } else if (action.includes('assign')) { 
                    actionClass = 'assigned'; actionLabel = 'Assigned'; 
                } else if (action.includes('close')) { 
                    actionClass = 'closed'; actionLabel = 'Closed'; 
                }

                let assignHtml = '';
                if (att.assignedTo && att.assignedTo.length > 0) {
                    const names = att.assignedNames && att.assignedNames.length > 0 
                        ? att.assignedNames : ['Unknown'];
                    assignHtml = `
                        <div class="md-tl-assign-pill">
                            ➡️ Assigned to: <strong>${names.map(n => esc(n)).join(', ')}</strong>
                        </div>`;
                }

                let attHtml = '';
                if (att.attachments && att.attachments.length > 0) {
                    attHtml = `<div class="md-tl-attachments">`;
                    att.attachments.forEach(file => {
                        attHtml += `
                            <button onclick="downloadMailAttachment('${file.data}', '${esc(file.name)}')" class="md-tl-attach-btn">
                                📎 ${esc(file.name)}
                            </button>`;
                    });
                    attHtml += `</div>`;
                }

                return `
                    <div class="md-tl-item ${actionClass}">
                        <div class="md-tl-header">
                            <div class="md-tl-user-block">
                                <div class="md-tl-avatar">${initials}</div>
                                <div class="md-tl-user-info">
                                    <div class="md-tl-name">${esc(userName)}</div>
                                    <div class="md-tl-role">${esc(userRole)}</div>
                                </div>
                            </div>
                            <div style="text-align:right;">
                                <div class="md-tl-action-badge ${actionClass}">${actionLabel}</div>
                                <div class="md-tl-time">${timeStr}</div>
                            </div>
                        </div>

                        ${att.comment ? `<div class="md-tl-comment">${esc(att.comment)}</div>` : ''}
                        ${assignHtml}
                        ${attHtml}
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

// ================= 8. HELPERS =================
function formatTimeAgo(dateStr) {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '—';
    
    const now = new Date();
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);
    
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function closeMailDetailView() {
    document.getElementById('mailListView').style.display = 'flex';
    document.getElementById('mailDetailView').style.display = 'none';
    currentMailId = null;
}

function refreshCurrentMailbox() {
    if (!currentMailBoxType) return;
    delete mailListCache[currentMailBoxType];
    delete mailListCacheTime[currentMailBoxType];
    loadMailboxMessages(currentMailBoxType);
    showToast('🔄 Refreshed', 'info');
}

// ================= 9. HOOK INTO switchSidebarTab =================
(function hookMailCenter() {
    const _orig = window.switchSidebarTab;
    if (typeof _orig !== 'function' || _orig.__mailHooked) return;
    const wrapped = function(tabId, event) {
        const result = _orig.call(this, tabId, event);
        if (tabId === 'tab-mail-center') {
            if (!document.getElementById('tab-mail-center').classList.contains('active')) {
                switchMailBox('inbox');
            }
            loadMailBadges();
        }
        return result;
    };
    wrapped.__mailHooked = true;
    window.switchSidebarTab = wrapped;
})();
// ================================================================
// MAIL SYSTEM — HELPER STATE
// ================================================================
let currentMinuteAttachments = [];
let currentAttendAttachments = [];
let currentCloseAttachments = [];

// ================================================================
// 10. COMPOSE MAIL
// ================================================================
async function openComposeMailModal() {
    selectedSendTo = [];
    selectedCC = [];
    currentMailAttachments = [];
    
    document.getElementById('mailType').value = 'information';
    document.getElementById('mailPriority').value = 'normal';
    document.getElementById('mailSubject').value = '';
    document.getElementById('mailBody').value = '';
    document.getElementById('mailAttachList').innerHTML = '';
    
    renderTags('sendTo');
    renderTags('cc');
    
    document.getElementById('composeMailModal').classList.add('show');

    if (allMailUsers.length === 0) {
        try {
            const users = await API.getUsers();
            const currentUser = Auth.getUser();
            allMailUsers = (users || []).filter(u => u.id !== currentUser.userId && u.role !== 'SuperAdmin');
        } catch (err) {
            console.error("Failed to load users:", err);
            showToast('⚠ Imeshindwa kupata orodha ya watumiaji.', 'warning');
        }
    }

    setupMailSearch('sendTo');
    setupMailSearch('cc');
}

function closeComposeModal() {
    document.getElementById('composeMailModal').classList.remove('show');
}

function setupMailSearch(type) {
    const input = document.getElementById(`${type}Input`);
    const dropdown = document.getElementById(`${type}Dropdown`);

    const newInput = input.cloneNode(true);
    input.parentNode.replaceChild(newInput, input);

    newInput.addEventListener('focus', () => {
        dropdown.classList.add('show');
        renderDropdown(type, '');
    });

    newInput.addEventListener('input', function() {
        dropdown.classList.add('show');
        renderDropdown(type, this.value.toLowerCase().trim());
    });

    newInput.addEventListener('blur', function() {
        setTimeout(() => { dropdown.classList.remove('show'); }, 200);
    });
}

function renderDropdown(type, query) {
    const dropdown = document.getElementById(`${type}Dropdown`);
    const selected = type === 'sendTo' ? selectedSendTo : selectedCC;

    let filtered = allMailUsers.filter(u => !selected.find(s => s.id === u.id));
    
    if (query) {
        filtered = filtered.filter(u =>
            (u.fullName && u.fullName.toLowerCase().includes(query)) ||
            (u.role && u.role.toLowerCase().includes(query)) ||
            (u.department && u.department.toLowerCase().includes(query))
        );
    }

    if (filtered.length === 0) {
        dropdown.innerHTML = `<div class="ms-empty">No users found${query ? ` for "${esc(query)}"` : ''}</div>`;
        return;
    }

    dropdown.innerHTML = filtered.map(user => {
        const initials = user.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
        const roleLabel = user.role || user.department || 'User';
        
        return `
            <div class="ms-user" onmousedown="event.preventDefault(); addTag('${user.id}', '${type}')">
                <div class="ms-avatar">${initials}</div>
                <div class="ms-user-info">
                    <div class="ms-user-name">${esc(user.fullName)}</div>
                    <div class="ms-user-role">${esc(roleLabel)}</div>
                </div>
            </div>
        `;
    }).join('');
}

function addTag(userId, type) {
    const user = allMailUsers.find(u => String(u.id) === String(userId));
    if (!user) return;

    if (type === 'sendTo') {
        if (!selectedSendTo.find(u => u.id === userId)) {
            selectedSendTo.push(user);
            renderTags('sendTo');
        }
    } else {
        if (!selectedCC.find(u => u.id === userId)) {
            selectedCC.push(user);
            renderTags('cc');
        }
    }

    document.getElementById(`${type}Input`).value = '';
    document.getElementById(`${type}Dropdown`).classList.remove('show');
    document.getElementById(`${type}Input`).focus();
}

function removeTag(userId, type) {
    if (type === 'sendTo') {
        selectedSendTo = selectedSendTo.filter(u => u.id !== userId);
        renderTags('sendTo');
    } else {
        selectedCC = selectedCC.filter(u => u.id !== userId);
        renderTags('cc');
    }
}

function renderTags(type) {
    const box = document.getElementById(`${type}Box`);
    const input = document.getElementById(`${type}Input`);
    const selected = type === 'sendTo' ? selectedSendTo : selectedCC;

    box.querySelectorAll('.ms-tag').forEach(tag => tag.remove());

    selected.forEach(user => {
        const tag = document.createElement('div');
        tag.className = 'ms-tag';
        tag.innerHTML = `
            ${esc(user.fullName.split(' ')[0])}
            <button class="rm" onclick="event.stopPropagation(); removeTag('${user.id}', '${type}')">✕</button>
        `;
        box.insertBefore(tag, input);
    });
}

function handleMailAttachments(event) {
    const files = Array.from(event.target.files);
    const list = document.getElementById('mailAttachList');

    files.forEach(file => {
        if (file.size > 10 * 1024 * 1024) {
            showToast('⚠ Too Large: ' + file.name, 'error');
            return;
        }
        if (currentMailAttachments.find(f => f.name === file.name && f.size === file.size)) return;
        currentMailAttachments.push(file);
    });

    list.innerHTML = currentMailAttachments.map((file, index) => `
        <div class="mc-attach-chip">
            <span>📎</span>
            <span>${file.name}</span>
            <button onclick="event.stopPropagation(); removeMailAttachment(${index})" class="rm">✕</button>
        </div>
    `).join('');
    event.target.value = '';
}

function removeMailAttachment(index) {
    currentMailAttachments.splice(index, 1);
    document.getElementById('mailAttachList').innerHTML = currentMailAttachments.map((file, idx) => `
        <div class="mc-attach-chip"><span>📎</span><span>${file.name}</span><button onclick="event.stopPropagation(); removeMailAttachment(${idx})" class="rm">✕</button></div>
    `).join('');
}

async function sendMail() {
    const subject = document.getElementById('mailSubject').value.trim();
    const body = document.getElementById('mailBody').value.trim();
    const type = document.getElementById('mailType').value;
    const priority = document.getElementById('mailPriority').value;
    const btn = document.querySelector('#composeMailModal button[onclick="sendMail()"]');
    
    if (selectedSendTo.length === 0) return showToast('Please select at least one recipient', 'error');
    if (!subject) return showToast('Please enter a subject', 'error');
    if (!body) return showToast('Please write a message', 'error');

    const originalBtn = btn.innerHTML;
    btn.innerHTML = '⏳ Sending...'; btn.disabled = true;

    try {
        const attachmentPromises = currentMailAttachments.map(file => new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = e => resolve({ name: file.name, type: file.type, size: file.size, data: e.target.result });
            reader.readAsDataURL(file);
        }));
        const attachmentData = await Promise.all(attachmentPromises);

        const payload = {
            receivers: selectedSendTo.map(u => u.id),
            cc: selectedCC.map(u => u.id),
            subject, body, type, priority,
            attachments: attachmentData,
            isMinute: false
        };

        await API.sendInternalMail(payload);

        Object.keys(mailListCache).forEach(k => delete mailListCache[k]);

        showToast('✅ Message sent successfully!', 'success');
        closeComposeModal();
        loadMailBadges();
        if (currentMailBoxType === 'sent') loadMailboxMessages('sent');
        
    } catch (err) {
        showToast('❌ ' + err.message, 'error');
        btn.innerHTML = originalBtn; btn.disabled = false;
    }
}

async function saveMailDraft() {
    const subject = document.getElementById('mailSubject').value.trim();
    const body = document.getElementById('mailBody').value.trim();
    
    if (!subject && !body) return showToast('Write something to save', 'error');

    try {
        const attachmentPromises = currentMailAttachments.map(file => new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = e => resolve({ name: file.name, type: file.type, size: file.size, data: e.target.result });
            reader.readAsDataURL(file);
        }));
        const attachmentData = await Promise.all(attachmentPromises);

        const payload = {
            receivers: selectedSendTo.map(u => u.id),
            cc: selectedCC.map(u => u.id),
            subject: subject || '(No Subject)', 
            body,
            type: document.getElementById('mailType').value,
            priority: document.getElementById('mailPriority').value,
            attachments: attachmentData,
            isMinute: false
        };

        await API.saveMailDraft(payload);
        showToast('💾 Draft saved!', 'success');
        closeComposeModal();
        if (currentMailBoxType === 'drafts') loadMailboxMessages('drafts');
    } catch (err) {
        showToast('❌ ' + err.message, 'error');
    }
}

// ================================================================
// 11. MINUTE COMPOSE
// ================================================================
async function openMinuteComposeModal() {
    document.getElementById('minuteSubject').value = '';
    document.getElementById('minuteBody').value = '';
    currentMinuteAttachments = [];
    document.getElementById('minuteAttachList').innerHTML = '';
    
    const select = document.getElementById('minuteAssignTo');
    select.innerHTML = '<option value="">-- Select Person --</option>';
    
    if (allMailUsers.length === 0) {
        try {
            const users = await API.getUsers();
            const curUser = Auth.getUser();
            allMailUsers = (users || []).filter(u => u.id !== curUser.userId && u.role !== 'SuperAdmin');
        } catch (err) {
            console.error("Failed to load users:", err);
        }
    }
    
    allMailUsers.forEach(u => {
        select.insertAdjacentHTML('beforeend', `<option value="${u.id}">${u.fullName} (${u.role})</option>`);
    });

    document.getElementById('minuteComposeModal').classList.add('show');
}

function handleMinuteAttachments(event) {
    const files = Array.from(event.target.files);
    const list = document.getElementById('minuteAttachList');

    files.forEach(file => {
        if (file.size > 25 * 1024 * 1024) {
            showToast('⚠ Too Large: ' + file.name, 'error');
            return;
        }
        if (currentMinuteAttachments.find(f => f.name === file.name && f.size === file.size)) return;
        currentMinuteAttachments.push(file);
    });

    list.innerHTML = currentMinuteAttachments.map((file, index) => `
        <div class="mc-attach-chip"><span>📎</span><span>${file.name}</span><button onclick="event.stopPropagation(); removeMinuteAttachment(${index})" class="rm">✕</button></div>
    `).join('');
    event.target.value = '';
}

function removeMinuteAttachment(index) {
    currentMinuteAttachments.splice(index, 1);
    document.getElementById('minuteAttachList').innerHTML = currentMinuteAttachments.map((file, idx) => `
        <div class="mc-attach-chip"><span>📎</span><span>${file.name}</span><button onclick="event.stopPropagation(); removeMinuteAttachment(${idx})" class="rm">✕</button></div>
    `).join('');
}

async function sendMinute() {
    const subject = document.getElementById('minuteSubject').value.trim();
    const assignToId = document.getElementById('minuteAssignTo').value;
    const body = document.getElementById('minuteBody').value.trim();
    
    if (!subject || !assignToId || !body) return showToast('Please fill all required fields', 'error');

    const btn = document.querySelector('#minuteComposeModal button[onclick="sendMinute()"]');
    const originalBtn = btn.innerHTML;
    btn.innerHTML = '⏳ Creating...'; btn.disabled = true;

    try {
        const attachmentPromises = currentMinuteAttachments.map(file => new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = e => resolve({ name: file.name, type: file.type, size: file.size, data: e.target.result });
            reader.readAsDataURL(file);
        }));
        const attachmentData = await Promise.all(attachmentPromises);

        const payload = {
            receivers: [parseInt(assignToId)],
            subject, body, attachments: attachmentData,
            type: 'minute', isMinute: true,
            assignedTo: [parseInt(assignToId)]
        };

        await API.sendInternalMail(payload);
        
        showToast('✅ Minute created and assigned!', 'success');
        closeModal('minuteComposeModal');
        loadMailBadges();
        if (currentMailBoxType === 'minutes') loadMailboxMessages('minutes');
        
    } catch (err) {
        showToast('❌ ' + err.message, 'error');
        btn.innerHTML = originalBtn; btn.disabled = false;
    }
}

// ================================================================
// 12. ATTEND MODAL
// ================================================================
async function openAttendModal(mailId) {
    let msg = window.mailCache && window.mailCache[mailId] ? window.mailCache[mailId] : null;
    
    const subjectEl = document.getElementById('attendMailSubject');
    if (subjectEl) subjectEl.textContent = msg ? esc(msg.subject || '(No Subject)') : 'Message';

    document.getElementById('attendComment').value = '';
    document.getElementById('attendAttachList').innerHTML = '';
    currentAttendAttachments = [];

    const select = document.getElementById('attendAssignTo');
    select.innerHTML = '<option value="">-- No assignment, just comment --</option>';
    
    try {
        let users = allMailUsers;
        if (!users || users.length === 0) {
            users = await API.getUsers();
            const curUser = Auth.getUser();
            allMailUsers = (users || []).filter(u => u.id !== curUser.userId && u.role !== 'SuperAdmin');
        }
        
        allMailUsers.forEach(u => {
            select.insertAdjacentHTML('beforeend', `<option value="${u.id}">${esc(u.fullName)} • ${esc(u.role || u.department || 'User')}</option>`);
        });
    } catch (err) { console.warn(err); }

    document.getElementById('attendMailModal').classList.add('show');
}

function handleAttendAttachments(event) {
    const files = Array.from(event.target.files);
    const list = document.getElementById('attendAttachList');

    files.forEach(file => {
        if (file.size > 10 * 1024 * 1024) {
            showToast('⚠ Too Large: ' + file.name, 'error');
            return;
        }
        if (currentAttendAttachments.find(f => f.name === file.name && f.size === file.size)) return;
        currentAttendAttachments.push(file);
    });

    list.innerHTML = currentAttendAttachments.map((file, index) => `
        <div class="mc-attach-chip"><span>📎</span><span>${file.name}</span><button onclick="event.stopPropagation(); removeAttendAttachment(${index})" class="rm">✕</button></div>
    `).join('');
    
    event.target.value = '';
}

function removeAttendAttachment(index) {
    currentAttendAttachments.splice(index, 1);
    document.getElementById('attendAttachList').innerHTML = currentAttendAttachments.map((file, idx) => `
        <div class="mc-attach-chip"><span>📎</span><span>${file.name}</span><button onclick="event.stopPropagation(); removeAttendAttachment(${idx})" class="rm">✕</button></div>
    `).join('');
}
async function submitAttend() {
    const mailId = currentMailId;
    if (!mailId) return;

    const comment = (document.getElementById('attendComment')?.value || '').trim();
    const assignToVal = document.getElementById('attendAssignTo')?.value;
    const assignTo = assignToVal ? [parseInt(assignToVal)] : [];
    const btn = document.getElementById('attendSubmitBtn');

    if (!comment && assignTo.length === 0) {
        showToast('Tafadhali andika maoni au chagua mtu.', 'warning');
        return;
    }

    const originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '⏳ Processing...';

    try {
        let attachmentData = [];
        if (currentAttendAttachments.length > 0) {
            const promises = currentAttendAttachments.map(file => new Promise(resolve => {
                const reader = new FileReader();
                reader.onload = e => resolve({ name: file.name, type: file.type, size: file.size, data: e.target.result });
                reader.readAsDataURL(file);
            }));
            attachmentData = await Promise.all(promises);
        }

        await API.attendMail(mailId, { comment, assignTo, attachments: attachmentData });

        showToast('✅ Maoni yamewekwa.', 'success');
        document.getElementById('attendMailModal')?.classList.remove('show');

        if (window.mailCache && window.mailCache[mailId]) delete window.mailCache[mailId];
        Object.keys(mailListCache).forEach(k => delete mailListCache[k]);

        await viewMailDetail(mailId);
        loadMailBadges();
        if (currentMailBoxType) loadMailboxMessages(currentMailBoxType);

    } catch (err) {
        showToast('❌ ' + err.message, 'error');
        btn.disabled = false;
        btn.innerHTML = originalHtml;
    }
}
async function closeCurrentMail() {
    if (!currentMailId) return;
    
    let msg = window.mailCache && window.mailCache[currentMailId] ? window.mailCache[currentMailId] : null;
    
    const subjectEl = document.getElementById('closeMailSubject');
    if (subjectEl) subjectEl.textContent = msg ? esc(msg.subject || '(No Subject)') : 'Message';

    document.getElementById('closeComment').value = '';
    document.getElementById('closeAttachList').innerHTML = '';
    currentCloseAttachments = [];

    const select = document.getElementById('closeAssignTo');
    select.innerHTML = '<option value="">-- No assignment, just close --</option>';
    
    try {
        let users = allMailUsers;
        if (!users || users.length === 0) {
            users = await API.getUsers();
            const curUser = Auth.getUser();
            allMailUsers = (users || []).filter(u => u.id !== curUser.userId && u.role !== 'SuperAdmin');
        }
        
        allMailUsers.forEach(u => {
            select.insertAdjacentHTML('beforeend', `<option value="${u.id}">${esc(u.fullName)} • ${esc(u.role || u.department || 'User')}</option>`);
        });
    } catch (err) { console.warn(err); }

    document.getElementById('closeWorkflowModal').classList.add('show');
}
function handleCloseAttachments(event) {
    const files = Array.from(event.target.files);
    const list = document.getElementById('closeAttachList');

    files.forEach(file => {
        if (file.size > 10 * 1024 * 1024) {
            showToast('⚠ Too Large: ' + file.name, 'error');
            return;
        }
        if (currentCloseAttachments.find(f => f.name === file.name && f.size === file.size)) return;
        currentCloseAttachments.push(file);
    });

    list.innerHTML = currentCloseAttachments.map((file, index) => `
        <div class="mc-attach-chip"><span>📎</span><span>${file.name}</span><button onclick="event.stopPropagation(); removeCloseAttachment(${index})" class="rm">✕</button></div>
    `).join('');
    
    event.target.value = '';
}
function removeCloseAttachment(index) {
    currentCloseAttachments.splice(index, 1);
    document.getElementById('closeAttachList').innerHTML = currentCloseAttachments.map((file, idx) => `
        <div class="mc-attach-chip"><span>📎</span><span>${file.name}</span><button onclick="event.stopPropagation(); removeCloseAttachment(${idx})" class="rm">✕</button></div>
    `).join('');
}
async function submitCloseWorkflow() {
    const comment = (document.getElementById('closeComment')?.value || '').trim();
    const assignToVal = document.getElementById('closeAssignTo')?.value;
    const assignTo = assignToVal ? [parseInt(assignToVal)] : [];
    const btn = document.getElementById('closeSubmitBtn');

    if (!comment) {
        showToast('Tafadhali andika kile kilichofanyika.', 'warning');
        return;
    }

    const originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '⏳ Closing...';

    try {
        let attachmentData = [];
        if (currentCloseAttachments.length > 0) {
            const promises = currentCloseAttachments.map(file => new Promise(resolve => {
                const reader = new FileReader();
                reader.onload = e => resolve({ name: file.name, type: file.type, size: file.size, data: e.target.result });
                reader.readAsDataURL(file);
            }));
            attachmentData = await Promise.all(promises);
        }

        await API.closeMail(currentMailId, { comment, assignTo, attachments: attachmentData });

        showToast('✅ Workflow imefungwa.', 'success');
        document.getElementById('closeWorkflowModal')?.classList.remove('show');

        if (window.mailCache && window.mailCache[currentMailId]) delete window.mailCache[currentMailId];
        Object.keys(mailListCache).forEach(k => delete mailListCache[k]);

        await viewMailDetail(currentMailId);
        loadMailBadges();
        if (currentMailBoxType) loadMailboxMessages(currentMailBoxType);

    } catch (err) {
        showToast('❌ ' + err.message, 'error');
        btn.disabled = false;
        btn.innerHTML = originalHtml;
    }
}
async function openReplyModal(originalId) {
    const msg = await API.getInternalMailById(originalId);
    if (!msg) return;

    let modal = document.getElementById('replyMailModal');
    if (modal) modal.remove();

    document.body.insertAdjacentHTML('beforeend', `
        <div class="modal-overlay show" id="replyMailModal">
            <div class="modal-box" style="max-width: 600px; padding: 0; overflow: hidden; border-radius: 16px;">
                <div style="background: linear-gradient(135deg, #3d5a3d, #2a3d2a); padding: 20px 24px; color: white; display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0; font-size: 18px; font-weight: 800;">↩️ Reply: ${esc(msg.subject)}</h3>
                    <button onclick="document.getElementById('replyMailModal').remove()" style="background: rgba(255,255,255,0.15); border: none; color: white; width: 32px; height: 32px; border-radius: 50%; font-size: 18px; cursor: pointer;">✕</button>
                </div>
                <div style="padding: 24px; background: #f8fafc;">
                    <textarea id="replyBody" rows="6" placeholder="Write your reply here..." style="width: 100%; padding: 14px; border: 1.5px solid #cbd5e1; border-radius: 8px; font-size: 14px; font-family: inherit; resize: vertical;"></textarea>
                </div>
                <div style="padding: 16px 24px; background: white; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 10px;">
                    <button onclick="document.getElementById('replyMailModal').remove()" style="padding: 10px 20px; background: #f1f5f9; color: #475569; border: 1.5px solid #cbd5e1; border-radius: 8px; font-weight: 700; cursor: pointer; font-family: inherit;">Cancel</button>
                    <button onclick="submitReply('${originalId}')" style="padding: 10px 24px; background: linear-gradient(135deg, #c9a227, #e0b93a); color: #2a3d2a; border: none; border-radius: 8px; font-weight: 800; cursor: pointer; font-family: inherit;">📤 Send Reply</button>
                </div>
            </div>
        </div>
    `);
}
async function submitReply(originalId) {
    const body = document.getElementById('replyBody').value.trim();
    if (!body) return showToast('Reply body is required', 'error');

    const btn = document.querySelector(`#replyMailModal button[onclick="submitReply('${originalId}')"]`);
    const originalBtn = btn.innerHTML;
    btn.innerHTML = '⏳ Sending...'; btn.disabled = true;

    try {
        await API.replyInternalMail(originalId, { body, attachments: [] });

        Object.keys(mailListCache).forEach(k => delete mailListCache[k]);

        if (window.mailCache && window.mailCache[originalId]) {
            delete window.mailCache[originalId];
        }

        showToast('✅ Reply sent successfully!', 'success');
        document.getElementById('replyMailModal').remove();
        loadMailBadges();
        if (currentMailId == originalId) viewMailDetail(originalId);
    } catch (err) {
        showToast('❌ ' + err.message, 'error');
        btn.innerHTML = originalBtn; btn.disabled = false;
    }
}
async function toggleStarCurrentMail() {
    if (!currentMailId) return;
    try {
        const res = await API.starMail(currentMailId);
        document.getElementById('btnStarMail').textContent = res.isStarred ? '⭐' : '☆';
        showToast(res.isStarred ? '⭐ Message starred' : 'Star removed', 'success');
        loadMailboxMessages(currentMailBoxType);
    } catch (err) { showToast('❌ ' + err.message, 'error'); }
}
async function toggleArchiveCurrentMail() {
    if (!currentMailId) return;
    try {
        const res = await API.archiveMail(currentMailId);
        document.getElementById('btnArchiveMail').textContent = res.isArchived ? '📂' : '📁';
        showToast(res.isArchived ? '📂 Message archived' : 'Message unarchived', 'success');
        loadMailboxMessages(currentMailBoxType);
    } catch (err) { showToast('❌ ' + err.message, 'error'); }
}
async function deleteCurrentMail() {
    if (!currentMailId) return;
    if (!confirm('Delete this message? It will move to trash.')) return;
    try {
        await API.deleteMail(currentMailId);
        showToast('🗑️ Message moved to trash.', 'success');
        closeMailDetailView();
        loadMailboxMessages(currentMailBoxType);
        loadMailBadges();
    } catch (err) { showToast('❌ ' + err.message, 'error'); }
}
function openAttachmentsModal(id) {
    const msg = window.mailCache[id];
    if (!msg) {
        showToast('❌ Message data not found.', 'error');
        return;
    }

    let allFiles = [];

    if (msg.attachments && Array.isArray(msg.attachments) && msg.attachments.length > 0) {
        msg.attachments.forEach(att => {
            allFiles.push({ ...att, source: 'Original Message' });
        });
    }

    if (msg.attendance && Array.isArray(msg.attendance) && msg.attendance.length > 0) {
        msg.attendance.forEach(att => {
            if (att.attachments && Array.isArray(att.attachments) && att.attachments.length > 0) {
                att.attachments.forEach(file => {
                    allFiles.push({ ...file, source: `Reply by ${att.userName}` });
                });
            }
        });
    }

    let filesHtml = '';
    
    if (allFiles.length === 0) {
        filesHtml = `
            <div style="text-align:center; padding: 30px; color:#94a3b8;">
                <div style="font-size: 50px; margin-bottom: 10px; opacity: 0.3;">📭</div>
                <div style="font-weight:800; font-size: 15px; color:#475569;">No attachments found</div>
                <div style="font-size:12px; margin-top:4px;">Files attached to this message will appear here.</div>
            </div>
        `;
    } else {
        filesHtml = allFiles.map(att => {
            const ext = (att.name || '').split('.').pop().toLowerCase();
            const icon = ext === 'pdf' ? '📕' : ['jpg','jpeg','png','gif'].includes(ext) ? '🖼️' : '📄';
            const sizeStr = att.size ? (att.size / 1024).toFixed(1) + ' KB' : 'Unknown size';
            
            return `
                <div style="display:flex; justify-content:space-between; align-items:center; background:white; border:1.5px solid #e2e8f0; padding:14px 18px; border-radius:12px; margin-bottom:10px;">
                    <div style="display:flex; align-items:center; gap:14px;">
                        <div style="width: 40px; height: 40px; background: #f8fafc; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 20px;">
                            ${icon}
                        </div>
                        <div>
                            <div style="font-weight:800; color:#0f172a; font-size:14px;">${esc(att.name)}</div>
                            <div style="font-size:11px; color:#64748b; margin-top:2px;">${sizeStr} • <span style="color:#3d5a3d; font-weight:800;">${esc(att.source)}</span></div>
                        </div>
                    </div>
                    <button onclick="downloadMailAttachment('${att.data}', '${esc(att.name)}')" style="padding:8px 16px; background:#f0fdf4; color:#16a34a; border:1.5px solid #bbf7d0; border-radius:8px; font-weight:800; cursor:pointer; font-size:12px;">
                        ⬇️ Download
                    </button>
                </div>
            `;
        }).join('');
    }

    document.getElementById('attachmentsCount').textContent = `${allFiles.length} file(s) attached`;
    document.getElementById('attachmentsListBody').innerHTML = filesHtml;
    document.getElementById('viewAttachmentsModal').classList.add('show');
}
function downloadMailAttachment(fileData, fileName) {
    if (!fileData) return showToast('File data is missing', 'error');
    
    const a = document.createElement('a');
    a.href = fileData;
    a.download = fileName || 'attachment';
    document.body.appendChild(a);
    a.click();
    a.remove();
    
    showToast('⬇️ Downloading ' + fileName, 'info');
}
setInterval(() => {
    if (document.getElementById('tab-mail-center')?.classList.contains('active')) {
        loadMailBadges();
    }
}, 30000);
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        loadMailBadges().catch(() => {});
    }, 3000);
});
async function openSubmitReportModal() {
    let modal = document.getElementById('submitReportModal');
    if (!modal) {
        document.body.insertAdjacentHTML('beforeend', `
            <div class="modal-overlay" id="submitReportModal" style="z-index: 10000;">
                <div class="modal-box" style="max-width: 700px; padding: 0; overflow: hidden; border-radius: 16px; display: flex; flex-direction: column; max-height: 92vh;">
                    
                    <!-- Header -->
                    <div style="background: linear-gradient(135deg, #0a1929 0%, #1a7f5a 100%); padding: 20px 24px; color: white; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;">
                        <div style="font-size: 16px; font-weight: 800; display: flex; align-items: center; gap: 8px;">
                            <span style="font-size: 20px;">📤</span> Send Report to CEO
                        </div>
                        <button onclick="closeModal('submitReportModal')" style="background: rgba(255,255,255,0.15); border: none; color: white; width: 32px; height: 32px; border-radius: 50%; font-size: 16px; cursor: pointer;">✕</button>
                    </div>

                    <!-- Body -->
                    <div style="padding: 24px; overflow-y: auto; flex: 1;">
                        <div id="submitReportStatus" class="status-msg" style="display:none; margin-bottom: 16px;"></div>
                        
                        <!-- SEHEMU YA KUGENERATE DATA (Hii ndio ilikosekana) -->
                        <div style="margin-bottom: 20px; background: #f8fafc; padding: 16px; border-radius: 10px; border: 1.5px solid #e2e8f0;">
                            <label style="font-size: 11px; font-weight: 800; color: var(--gray-700); text-transform: uppercase; letter-spacing: 1px;">Step 1: Select Month & Year</label>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 8px; margin-bottom: 12px;">
                                <select id="repMonth" style="width: 100%; padding: 10px; border: 1.5px solid var(--gray-300); border-radius: 8px; font-family: inherit; outline: none;">
                                    <option value="01">January</option>
                                    <option value="02">February</option>
                                    <option value="03">March</option>
                                    <option value="04">April</option>
                                    <option value="05">May</option>
                                    <option value="06">June</option>
                                    <option value="07">July</option>
                                    <option value="08">August</option>
                                    <option value="09">September</option>
                                    <option value="10">October</option>
                                    <option value="11">November</option>
                                    <option value="12">December</option>
                                </select>
                                <input type="number" id="repYear" value="${new Date().getFullYear()}" style="width: 100%; padding: 10px; border: 1.5px solid var(--gray-300); border-radius: 8px; font-family: inherit; outline: none;">
                            </div>
                            <button onclick="generateReportData(this)" style="width: 100%; padding: 12px; background: #1a7f5a; color: white; border: none; border-radius: 8px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s;">
                                🔄 Generate Data from System
                            </button>
                        </div>

                        <!-- Title & Period -->
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
                            <div>
                                <label style="font-size: 11px; font-weight: 800; color: var(--gray-700); text-transform: uppercase; letter-spacing: 1px;">Report Title *</label>
                                <input type="text" id="repTitle" placeholder="Waiting for generation..." style="width: 100%; padding: 10px 14px; border: 1.5px solid var(--gray-300); border-radius: 8px; font-size: 13px; font-family: inherit; margin-top: 6px; background: #f8fafc;">
                            </div>
                            <div>
                                <label style="font-size: 11px; font-weight: 800; color: var(--gray-700); text-transform: uppercase; letter-spacing: 1px;">Period *</label>
                                <input type="text" id="repPeriod" placeholder="Waiting for generation..." style="width: 100%; padding: 10px 14px; border: 1.5px solid var(--gray-300); border-radius: 8px; font-size: 13px; font-family: inherit; margin-top: 6px; background: #f8fafc;">
                            </div>
                        </div>

                        <!-- Narrative -->
                        <div style="margin-bottom: 16px;">
                            <label style="font-size: 11px; font-weight: 800; color: var(--gray-700); text-transform: uppercase; letter-spacing: 1px;">Executive Narrative (Maelezo ya Ziada) *</label>
                            <textarea id="repNarrative" placeholder="Click 'Generate Data' first..." style="width: 100%; padding: 12px 14px; border: 1.5px solid var(--gray-300); border-radius: 8px; font-size: 13px; font-family: inherit; margin-top: 6px; min-height: 150px; resize: vertical; line-height: 1.6; background: #f8fafc;"></textarea>
                            <div style="font-size: 10px; color: var(--gray-400); margin-top: 4px;">You can edit this narrative before submitting.</div>
                        </div>

                        <!-- Metrics -->
                        <div style="margin-bottom: 16px;">
                            <label style="font-size: 11px; font-weight: 800; color: var(--gray-700); text-transform: uppercase; letter-spacing: 1px;">Key Metrics (Auto-Generated)</label>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 6px;">
                                <input type="text" id="metricBatches" placeholder="Total Batches" style="width: 100%; padding: 10px 14px; border: 1.5px solid var(--gray-300); border-radius: 8px; font-size: 13px; font-family: inherit; background: #f8fafc;">
                                <input type="text" id="metricProduced" placeholder="Total Produced" style="width: 100%; padding: 10px 14px; border: 1.5px solid var(--gray-300); border-radius: 8px; font-size: 13px; font-family: inherit; background: #f8fafc;">
                                <input type="text" id="metricDamaged" placeholder="Damaged" style="width: 100%; padding: 10px 14px; border: 1.5px solid var(--gray-300); border-radius: 8px; font-size: 13px; font-family: inherit; background: #f8fafc;">
                                <input type="text" id="metricWaste" placeholder="Waste %" style="width: 100%; padding: 10px 14px; border: 1.5px solid var(--gray-300); border-radius: 8px; font-size: 13px; font-family: inherit; background: #f8fafc;">
                            </div>
                        </div>
                    </div>

                    <!-- Footer -->
                    <div style="padding: 16px 24px; background: var(--gray-50); border-top: 1px solid var(--gray-200); display: flex; justify-content: flex-end; gap: 12px; flex-shrink: 0;">
                        <button onclick="closeModal('submitReportModal')" style="padding: 10px 20px; background: white; border: 1px solid var(--gray-300); color: var(--gray-700); border-radius: 8px; font-weight: 700; cursor: pointer; font-family: inherit;">Cancel</button>
                        <button onclick="submitReportToCEO(this)" style="padding: 10px 24px; background: linear-gradient(135deg, #1a7f5a, #0f2942); color: white; border: none; border-radius: 8px; font-weight: 700; cursor: pointer; font-family: inherit;">📤 Submit Report</button>
                    </div>
                </div>
            </div>
        `);
        modal = document.getElementById('submitReportModal');
    }

    // Reset form
    document.getElementById('repTitle').value = '';
    document.getElementById('repPeriod').value = '';
    document.getElementById('repNarrative').value = '';
    document.getElementById('metricBatches').value = '';
    document.getElementById('metricProduced').value = '';
    document.getElementById('metricDamaged').value = '';
    document.getElementById('metricWaste').value = '';
    document.getElementById('submitReportStatus').style.display = 'none';
    
    modal.classList.add('show');
}
async function submitReportToCEO(btn) {
    const statusDiv = document.getElementById('submitReportStatus');
    const title = document.getElementById('repTitle').value.trim();
    const period = document.getElementById('repPeriod').value.trim();
    const narrative = document.getElementById('repNarrative').value.trim();
    const user = Auth.getUser();

    if (!title || !period || !narrative) {
        statusDiv.style.display = 'block';
        statusDiv.className = 'status-msg error';
        statusDiv.textContent = '⚠ Please generate or fill in the data first.';
        return;
    }

    // Kukusanya Metrics
    const metrics = {
        totalBatches: document.getElementById('metricBatches').value.trim(),
        totalProduced: document.getElementById('metricProduced').value.trim(),
        totalDamaged: document.getElementById('metricDamaged').value.trim(),
        wastePercent: document.getElementById('metricWaste').value.trim()
    };

    const originalText = btn.innerHTML;
    btn.innerHTML = '⏳ Submitting...';
    btn.disabled = true;

    try {
        await API.submitDepartmentReport({
            department: user.department || 'Production',
            title: title,
            period: period,
            summary: narrative,
            metrics: metrics
        });

        statusDiv.style.display = 'block';
        statusDiv.className = 'status-msg success';
        statusDiv.style.background = '#f0fdf4';
        statusDiv.style.color = '#15803d';
        statusDiv.textContent = '✓ Report submitted successfully to CEO!';
        
        setTimeout(() => {
            closeModal('submitReportModal');
            showToast('Report sent to CEO successfully!', 'success');
        }, 1500);

    } catch (err) {
        statusDiv.style.display = 'block';
        statusDiv.className = 'status-msg error';
        statusDiv.style.background = '#fef2f2';
        statusDiv.style.color = '#dc2626';
        statusDiv.textContent = '⚠ ' + err.message;
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}
async function generateReportData() {
    const month = document.getElementById('repMonth').value;
    const year = document.getElementById('repYear').value;
    const btn = event.target;
    
    const originalText = btn.innerHTML;
    btn.innerHTML = '⏳ Fetching data...';
    btn.disabled = true;

    try {
        // 1. Tengeneza tarehe za mwanzo na mwisho wa mwezi
        const startDate = `${year}-${month}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
        
        // Jina la Mwezi kwa ajili ya kuandika
        const monthName = new Date(year, month - 1).toLocaleString('en-US', { month: 'long' });
        const periodLabel = `${monthName} ${year}`;

        // 2. Vuta data kutoka API (Tunatumia API zilizopo kwenye mfumo wako)
        const [summaryData, damagedData] = await Promise.all([
            API.getProductionSummary({ startDate, endDate }),
            API.getDamagedProducts({ startDate, endDate }) // Kama una API hii
        ]);

        if (!summaryData || !summaryData.totals) {
            throw new Error("Hakuna data ya uzalishaji kwa mwezi huu.");
        }

        const t = summaryData.totals;
        
        // 3. Jaza Title na Period
        document.getElementById('repTitle').value = `Production Report - ${periodLabel}`;
        document.getElementById('repPeriod').value = periodLabel;

        // 4. Jaza Metrics
        document.getElementById('metricBatches').value = t.totalBatches || 0;
        document.getElementById('metricProduced').value = (t.totalProduced || 0).toLocaleString() + ' units';
        document.getElementById('metricDamaged').value = (t.totalDamaged || 0).toLocaleString() + ' units';
        document.getElementById('metricWaste').value = (t.wastePercent || 0) + '%';

        // 5. Tengeneza Narrative (Maelezo) kiotomatiki
        let narrative = `During the month of ${periodLabel}, the Production Department operated ${t.totalBatches || 0} production batches. `;
        narrative += `A total of ${(t.totalProduced || 0).toLocaleString()} units were produced. `;
        
        if (t.totalDamaged > 0) {
            narrative += `Unfortunately, ${(t.totalDamaged || 0).toLocaleString()} units (${t.wastePercent || 0}%) were damaged or rejected, which is a slight concern. Management should investigate the causes of these damages to reduce future losses. `;
        } else {
            narrative += `Excellent performance! There were zero damaged items recorded during this period. `;
        }

        if (t.totalReleased > 0) {
            narrative += `Out of the good items, ${(t.totalReleased || 0).toLocaleString()} units have been successfully inspected and released to the Sales department for marketing. `;
        }
        
        if (t.pendingRelease > 0) {
            narrative += `However, ${(t.pendingRelease || 0).toLocaleString()} units are still waiting for QC clearance or release to the market.`;
        } else {
            narrative += `All items that passed QC have been successfully released to Sales.`;
        }

        document.getElementById('repNarrative').value = narrative;

        // Weka rangi nyeupe kuonyesha data imejazwa
        document.getElementById('repTitle').style.background = 'white';
        document.getElementById('repPeriod').style.background = 'white';
        document.getElementById('repNarrative').style.background = 'white';
        document.getElementById('metricBatches').style.background = 'white';
        document.getElementById('metricProduced').style.background = 'white';
        document.getElementById('metricDamaged').style.background = 'white';
        document.getElementById('metricWaste').style.background = 'white';

        showToast('✓ Data imejazwa kikamilifu. Unaweza kuhariri kabla ya kutuma.', 'success');

    } catch (err) {
        console.error('Generate error:', err);
        showToast('⚠ ' + err.message, 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}
async function loadMySubmittedReports() {
    const container = document.getElementById('mySubmittedReportsContainer');
    if (!container) return;

    container.innerHTML = '<div style="text-align:center; padding:40px; color:var(--gray-400);">⏳ Loading your reports...</div>';

    try {
        const user = Auth.getUser();
        const allReports = await API.getDepartmentReports();
        
        const myReports = (allReports || []).filter(r => 
            r.submittedById === user.userId || 
            r.submittedBy === user.fullName
        ).sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)); 

        if (myReports.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding:60px 20px; color:var(--gray-400);">
                    <span style="font-size:56px; display:block; margin-bottom:14px; opacity:0.6;">📭</span>
                    <div style="font-size:16px; font-weight:800; color:var(--gray-600);">No Reports Submitted Yet</div>
                    <div style="font-size:13px; margin-top:6px;">Reports you submit to the CEO will appear here.</div>
                </div>`;
            return;
        }

        container.innerHTML = myReports.map(r => {
            const dateStr = new Date(r.submittedAt).toLocaleDateString('en-GB', { 
                day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' 
            });

            const isUnread = r.status === 'unread';
            const statusBg = isUnread ? 'rgba(245,158,11,0.15)' : 'rgba(34,197,94,0.15)';
            const statusColor = isUnread ? '#b45309' : '#15803d';
            const statusText = isUnread ? '🆕 Unread by CEO' : '✅ Reviewed by CEO';

            return `
                <div style="background: white; border: 1.5px solid var(--gray-200); border-left: 4px solid #c9a227; border-radius: 12px; padding: 20px; margin-bottom: 12px; transition: all 0.2s; box-shadow: 0 2px 8px rgba(0,0,0,0.02);" onmouseover="this.style.boxShadow='0 8px 24px rgba(0,0,0,0.06)'" onmouseout="this.style.boxShadow='0 2px 8px rgba(0,0,0,0.02)'">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; flex-wrap: wrap; gap: 10px;">
                        <div>
                            <div style="font-size: 16px; font-weight: 800; color: #2a3d2a; margin-bottom: 4px;">${esc(r.title)}</div>
                            <div style="font-size: 12px; color: var(--gray-500); display: flex; gap: 12px; flex-wrap: wrap;">
                                <span>📅 ${dateStr}</span>
                                <span>🏢 ${esc(r.department)}</span>
                                <span>📆 Period: ${esc(r.period)}</span>
                            </div>
                        </div>
                        <span style="font-size: 10px; font-weight: 800; padding: 4px 10px; border-radius: 10px; background: ${statusBg}; color: ${statusColor}; text-transform: uppercase;">
                            ${statusText}
                        </span>
                    </div>
                    <div style="font-size: 13px; color: var(--gray-600); line-height: 1.6; background: var(--gray-50); padding: 12px; border-radius: 8px; border-left: 3px solid #3d5a3d; margin-bottom: 12px;">
                        <div style="font-size: 10px; font-weight: 800; color: var(--gray-500); text-transform: uppercase; margin-bottom: 4px;">Summary</div>
                        ${esc(r.summary).substring(0, 200)}${r.summary && r.summary.length > 200 ? '...' : ''}
                    </div>
                    <button onclick="viewMySubmittedReport(${r.id})" style="padding: 8px 16px; background: #c9a227; color: #2a3d2a; border: none; border-radius: 6px; font-weight: 800; font-size: 12px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: 0.2s;" onmouseover="this.style.background='#b08d22'" onmouseout="this.style.background='#c9a227'">
                        👁️ View Full Report
                    </button>
                </div>
            `;
        }).join('');

    } catch (err) {
        console.error('Load my reports error:', err);
        container.innerHTML = `<div style="text-align:center; padding:40px; color:#dc2626;">❌ Failed to load reports: ${esc(err.message)}</div>`;
    }
}
async function viewMySubmittedReport(id) {
    try {
        const allReports = await API.getDepartmentReports();
        const report = allReports.find(r => r.id === id);

        if (!report) {
            showToast('Report not found', 'error');
            return;
        }

        let modal = document.getElementById('viewMyReportModal');
        if (!modal) {
            document.body.insertAdjacentHTML('beforeend', `
                <div class="modal-overlay" id="viewMyReportModal" style="z-index: 10000; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px);">
                    <div class="modal-box" style="max-width: 800px; padding: 0; overflow: hidden; max-height: 92vh; display: flex; flex-direction: column; border-radius: 12px; background: white;">
                        <div style="background: linear-gradient(135deg, #3d5a3d 0%, #2a3d2a 100%); border-bottom: 3px solid #c9a227; padding: 16px 24px; color: white; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;">
                            <div style="font-size: 16px; font-weight: 700;">📄 Report Details</div>
                            <button onclick="closeModal('viewMyReportModal')" style="background: rgba(255,255,255,0.1); border: none; color: white; width: 36px; height: 36px; border-radius: 6px; font-size: 18px; cursor: pointer;">✕</button>
                        </div>
                        <div id="viewMyReportBody" style="padding: 32px; overflow-y: auto; flex: 1;"></div>
                    </div>
                </div>
            `);
            modal = document.getElementById('viewMyReportModal');
        }

        const dateStr = new Date(report.submittedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
        let metricsHtml = '';
        
        if (report.metrics && Object.keys(report.metrics).length > 0) {
            metricsHtml = `
                <div style="margin-top: 20px; background: #f8fafc; padding: 16px; border-radius: 10px; border: 1px solid #e2e8f0;">
                    <h4 style="font-size: 12px; font-weight: 800; color: #c9a227; text-transform: uppercase; margin-top: 0; margin-bottom: 12px;">📊 Key Metrics</h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                        ${Object.entries(report.metrics).map(([key, value]) => `
                            <div style="background: white; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0;">
                                <div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 800;">${esc(key)}</div>
                                <div style="font-size: 15px; font-weight: 800; color: #2a3d2a; margin-top: 4px;">${esc(value)}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        document.getElementById('viewMyReportBody').innerHTML = `
            <div style="margin-bottom: 24px; border-bottom: 2px solid #f1f5f9; padding-bottom: 16px;">
                <h1 style="font-size: 22px; font-weight: 900; color: #2a3d2a; margin: 0 0 8px 0;">${esc(report.title)}</h1>
                <div style="display: flex; gap: 16px; font-size: 13px; color: #64748b; font-weight: 600;">
                    <span>📅 ${dateStr}</span>
                    <span>🏢 ${esc(report.department)}</span>
                    <span>📆 ${esc(report.period)}</span>
                </div>
            </div>
            
            <div style="margin-bottom: 24px;">
                <h4 style="font-size: 12px; font-weight: 800; color: #c9a227; text-transform: uppercase; margin-top: 0; margin-bottom: 8px;">📝 Executive Narrative</h4>
                <div style="font-size: 14px; line-height: 1.8; color: #334155; white-space: pre-wrap;">${esc(report.summary)}</div>
            </div>

            ${metricsHtml}

            <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
                Submitted by: <strong>${esc(report.submittedBy)}</strong>
            </div>
        `;

        modal.classList.add('show');
    } catch (err) {
        console.error('View my report error:', err);
        showToast('Failed to load report details', 'error');
    }
}