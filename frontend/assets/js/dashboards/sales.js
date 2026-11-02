// ================================================================
// MAK DC INVESTMENT — SALES & MARKETING DASHBOARD
// ================================================================
// VERSION: 2.0 (Fixed procurement integration + double-click prevention)
// ================================================================

// ===== STATE =====
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
    
    // 🆕 Anzisha polling ya ujumbe mpya
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

    // Sub-tab parents
    const subTabParents = {
        'sub-all-orders': 'tab1',
        'sub-create-order': 'tab1',
        'sub-waiting-approval': 'tab1',
        'sub-approved': 'tab1',
        'sub-rejected': 'tab1',
        'sub-pending-delivery': 'tab-delivery',
        'sub-in-transit': 'tab-delivery',
        'sub-delivered': 'tab-delivery',
        'sub-self-pickup': 'tab-delivery'
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

    // Load data per tab
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
// 🆕 PROCUREMENT — DEPT REQUESTS (Functions zilizokosekana)
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
// 🆕 OPEN REQUEST MODAL
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
// 🆕 SUBMIT DEPT REQUEST (Preview)
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
// 🆕 PREVIEW MODAL
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
// 🆕 CONFIRM & SUBMIT (With loading + double-click prevention)
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
// 🆕 LOAD MY REQUESTS (Fixed: uses requested_by_id)
// ================================================================
async function loadMyRequests() {
    const tbody = document.getElementById('myRequestsTableBody');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:30px;color:#9aa38b;">⏳ Loading requests...</td></tr>`;

    try {
        const all = await API.getProcurementRequests('/all');
        const user = Auth.getUser();
        const list = Array.isArray(all) ? all : (all?.requests || all?.data || []);
        
        // 🆕 Filter by requested_by_id (sahihi zaidi)
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
// 🆕 VIEW REQUEST DETAILS
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
                                ✏️ Edit & Resubmit
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
// 🆕 EDIT REQUEST
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
// 🆕 MESSAGES
// ================================================================
function openMessages(reqId, reqTitle) {
    currentMsgReqId = reqId;
    document.getElementById('msgReqLabel').textContent = `${reqTitle} (${reqId})`;
    document.getElementById('messagesModal').style.display = 'flex';
    document.getElementById('msgSubject').value = '';
    document.getElementById('msgBody').value = '';
    
    // Reset unread
    unreadMessageCount = 0;
    updateMessageBadges();
    
    // Start typing check
    startTypingCheck();
    
    loadMessages(reqId);
}
function closeMessages() {
    // Stop typing status
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
// 🆕 LOAD MESSAGES (Modern UI + Read Status)
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
            // 🆕 FIX: Angalia sender_id na senderId kwa pamoja
            const rawSenderId = m.sender_id !== undefined ? m.sender_id : m.senderId;
            const senderId = Number(rawSenderId);
            const mine = senderId === myId;
            
            // 🆕 DEBUG: Onyesha kwenye Console kama bado kuna shida
            if (msgs.indexOf(m) === 0) {
                console.log('🔍 DEBUG CHAT:');
                console.log('   myId (userId):', myId);
                console.log('   senderId:', senderId);
                console.log('   mine:', mine);
                console.log('   Full message:', m);
            }
            
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
            
            // 🆕 FIX: Status ya ✓ au ✓✓
            let statusHtml = '';
            if (mine) {
                // Angalia is_read au isRead
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
        
        // Mark messages as read
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
// 🆕 TYPING INDICATOR
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
    
    // Reset timeout
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        isCurrentlyTyping = false;
        API.setTypingStatus(currentMsgReqId, false).catch(() => {});
    }, 2000);
}
// Check kama mtu anaandika (kila sekunde 2 ukiwa kwenye chat)
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
// 🆕 SEND MESSAGE
// ================================================================
async function sendMessage(btnEl) {
    const subject = document.getElementById('msgSubject').value.trim();
    const body = document.getElementById('msgBody').value.trim();
    
    if (!body) {
        document.getElementById('msgBody').focus();
        return;
    }

    const btn = btnEl || document.querySelector('#messagesModal button[onclick^="sendMessage"]');
    const original = setButtonLoading(btn, '⏳ Sending...');

    try {
        await API.sendRequestMessage(currentMsgReqId, { subject, body });
        document.getElementById('msgBody').value = '';
        document.getElementById('msgSubject').value = '';
        // Simulate "stop typing" baada ya kutuma
        API.setTypingStatus(currentMsgReqId, false).catch(() => {});
        loadMessages(currentMsgReqId);
    } catch (err) {
        alert('Failed to send: ' + err.message);
    } finally {
        restoreButton(btn, original);
    }
}
// ================================================================
// 🆕 SEND MESSAGE (With loading state)
// ================================================================
async function sendMessage(btnEl) {
    const subject = document.getElementById('msgSubject').value.trim();
    const body = document.getElementById('msgBody').value.trim();
    
    if (!body) {
        document.getElementById('msgBody').focus();
        return;
    }

    const btn = btnEl || document.querySelector('#messagesModal button[onclick^="sendMessage"]');
    const original = setButtonLoading(btn, '⏳ Sending...');

    try {
        await API.sendRequestMessage(currentMsgReqId, { subject, body });
        document.getElementById('msgBody').value = '';
        document.getElementById('msgSubject').value = '';
        loadMessages(currentMsgReqId);
    } catch (err) {
        alert('Failed to send: ' + err.message);
    } finally {
        restoreButton(btn, original);
    }
}
async function sendMessage() {
    const subject = document.getElementById('msgSubject').value.trim();
    const body = document.getElementById('msgBody').value.trim();
    const sendBtn = document.querySelector('#messagesModal button[onclick="sendMessage()"]');
    
    if (!body) { alert('Write a message first.'); return; }
    
    const original = setButtonLoading(sendBtn, '⏳ Sending...');
    
    try {
        await API.sendRequestMessage(currentMsgReqId, { subject, body });
        document.getElementById('msgBody').value = '';
        document.getElementById('msgSubject').value = '';
        loadMessages(currentMsgReqId);
    } catch (err) {
        alert('Failed to send: ' + err.message);
    } finally {
        restoreButton(sendBtn, original);
    }
}
// ================================================================
// 🆕 MESSAGE NOTIFICATIONS — Angalia ujumbe mpya kila sekunde 30
// ================================================================
let lastSeenMessageCount = {};
let unreadMessageCount = 0;

// Rekodi idadi ya ujumbe kwa kila request
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
                
                // Chukua ujumbe wa mwisho ambao si wangu
                const otherMsgs = msgs.filter(m => m.sender_id !== user.userId);
                if (otherMsgs.length === 0) continue;
                
                const lastMsg = otherMsgs[otherMsgs.length - 1];
                const lastMsgId = lastMsg.id;
                
                // Kagua kama ni mpya (haijawahi kuonekana)
                const prevSeen = lastSeenMessageCount[req.id];
                if (prevSeen === undefined) {
                    // Mara ya kwanza — rekodi tu (usifanye notification)
                    lastSeenMessageCount[req.id] = lastMsgId;
                    continue;
                }
                
                if (lastMsgId > prevSeen) {
                    // 🆕 Ujumbe mpya!
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

// Onyesha badge kwenye sidebar
function updateMessageBadges() {
    // Badge kwenye sidebar "My Requests"
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

// Onyesha toast ya notification
function showNewMessageToast(msg, count) {
    // Ondoa toast ya zamani
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
        // Reset count
        unreadMessageCount = 0;
        updateMessageBadges();
    };
    
    document.body.appendChild(toast);
    
    // Auto-remove after 8 seconds
    setTimeout(() => {
        if (toast.parentElement) {
            toast.style.transform = 'translateX(400px)';
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 400);
        }
    }, 8000);
}

// ================================================================
// 🆕 ANZISHA POLLING (kila sekunde 30)
// ================================================================
function startMessagePolling() {
    // Check mara ya kwanza baada ya sekunde 5
    setTimeout(checkNewMessages, 5000);
    
    // Kisha kila sekunde 30
    setInterval(checkNewMessages, 30000);
}
// ================================================================
// 🆕 FOLLOW-UP
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
    const confirmed = await new Promise((resolve) => {
        modernConfirm({
            title: '🗑️ Delete Product?',
            message: `Delete product "${name}"? This cannot be undone.`,
            type: 'danger',
            okText: '🗑️ Delete',
            cancelText: 'Cancel'
        }).then(resolve);
    });
    
    if (!confirmed || !confirmed.confirmed) return;
    
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
// STUB FUNCTIONS (Kama zinaitwa na HTML lakini hazipo)
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

function closeAllSidebarDropdowns() {
    document.querySelectorAll('.sidebar-nav-parent.open').forEach(el => {
        el.classList.remove('open');
        const sub = el.nextElementSibling;
        if (sub) sub.classList.remove('open');
    });
}