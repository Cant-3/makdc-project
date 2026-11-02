// ================================================================
// MAK DC INVESTMENT — DASHBOARD COMMON HELPERS
// ================================================================
function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        Auth.logout();
    }
}
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.toggle('collapsed');
}
function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('show');
}
function showModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('show');
}
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('show');
    }
});
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.show').forEach(m => {
            m.classList.remove('show');
        });
    }
});
function renderUserInfo() {
    const user = Auth.getUser();
    if (!user) return;

    const initials = user.fullName
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    const sidebarName = document.getElementById('sidebarUserName');
    const sidebarAvatar = document.getElementById('sidebarUserAvatar');
    if (sidebarName) sidebarName.textContent = user.fullName;
    if (sidebarAvatar) sidebarAvatar.textContent = initials;
    const headerName = document.getElementById('headerUserName');
    const headerAvatar = document.getElementById('headerUserAvatar');
    if (headerName) headerName.textContent = user.fullName;
    if (headerAvatar) headerAvatar.textContent = initials;
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
function formatMoney(amount) {
    return 'TSh ' + Number(amount || 0).toLocaleString();
}
function formatDate(date) {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-GB', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatDateTime(date) {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('en-GB', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function showLoading(container, message = 'Loading...') {
    if (!container) return;
    container.innerHTML = `<div class="loading-state">⏳ ${message}</div>`;
}

function showEmpty(container, icon = '📭', title = 'No Data', desc = '') {
    if (!container) return;
    container.innerHTML = `
        <div class="empty-state">
            <span class="empty-icon">${icon}</span>
            <div class="empty-title">${esc(title)}</div>
            <div class="empty-desc">${esc(desc)}</div>
        </div>
    `;
}
function showError(container, message) {
    if (!container) return;
    container.innerHTML = `
        <div class="empty-state">
            <span class="empty-icon">❌</span>
            <div class="empty-title">Error</div>
            <div class="empty-desc">${esc(message)}</div>
        </div>
    `;
}