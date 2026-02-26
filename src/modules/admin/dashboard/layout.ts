/**
 * Shared admin dashboard layout with sidebar navigation and styling
 */

export function dashboardLayout(title: string, activePage: string, content: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} — SaveGoal Admin</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/remixicon@4.1.0/fonts/remixicon.css" rel="stylesheet">
    <style>${getStyles()}</style>
</head>
<body>
    <aside class="sidebar">
        <div class="sidebar-header">
            <div class="logo">
                <div class="logo-icon"><i class="ri-shield-star-fill"></i></div>
                <div>
                    <h1>SaveGoal</h1>
                    <span class="badge">Admin</span>
                </div>
            </div>
        </div>
        <nav class="sidebar-nav">
            <a href="/admin" class="${activePage === 'overview' ? 'active' : ''}">
                <i class="ri-dashboard-3-line"></i><span>Overview</span>
            </a>
            <a href="/admin/users" class="${activePage === 'users' ? 'active' : ''}">
                <i class="ri-group-line"></i><span>Users</span>
            </a>
            <a href="/admin/kyc" class="${activePage === 'kyc' ? 'active' : ''}">
                <i class="ri-shield-check-line"></i><span>KYC Review</span>
            </a>
            <a href="/admin/merchants" class="${activePage === 'merchants' ? 'active' : ''}">
                <i class="ri-store-2-line"></i><span>Merchants</span>
            </a>
            <a href="/admin/transactions" class="${activePage === 'transactions' ? 'active' : ''}">
                <i class="ri-exchange-funds-line"></i><span>Transactions</span>
            </a>
            <a href="/admin/activity" class="${activePage === 'activity' ? 'active' : ''}">
                <i class="ri-time-line"></i><span>Activity</span>
            </a>
        </nav>
        <div class="sidebar-footer">
            <a href="/api-docs" target="_blank"><i class="ri-file-code-line"></i><span>API Docs</span></a>
            <a href="/"><i class="ri-arrow-left-line"></i><span>Back to API</span></a>
        </div>
    </aside>
    <main class="main-content">
        <header class="topbar">
            <h2 class="page-title">${title}</h2>
            <div class="topbar-right">
                <span class="env-badge">${process.env.NODE_ENV || 'development'}</span>
            </div>
        </header>
        <script>${getGlobalScript()}</script>
        <div class="content-area">
            ${content}
        </div>
    </main>
    <div id="toast-container"></div>
</body>
</html>`;
}

function getGlobalScript(): string {
    return `
    function showToast(msg, type='success') {
        const c = document.getElementById('toast-container');
        const t = document.createElement('div');
        t.className = 'toast toast-' + type;
        t.textContent = msg;
        c.appendChild(t);
        setTimeout(() => t.remove(), 4000);
    }

    async function apiCall(url, opts = {}) {
        try {
            const res = await fetch(url, {
                ...opts,
                headers: { 'Content-Type': 'application/json', ...opts.headers },
                credentials: 'include'
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error?.message || 'Request failed');
            return data.data;
        } catch (e) {
            showToast(e.message, 'error');
            throw e;
        }
    }

    function formatDate(d) {
        if (!d) return '—';
        return new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
    }

    function formatAmount(a) {
        return parseFloat(a || 0).toLocaleString('en-GH', { minimumFractionDigits: 2 });
    }

    function statusBadge(status) {
        const colors = {
            PENDING: '#f59e0b', VERIFIED: '#10b981', FAILED: '#ef4444', EXPIRED: '#6b7280',
            ACTIVE: '#3b82f6', COMPLETED: '#10b981', CANCELLED: '#ef4444', ARCHIVED: '#6b7280',
            CONSUMER: '#8b5cf6', MERCHANT: '#f59e0b', ADMIN: '#ef4444'
        };
        const c = colors[status] || '#6b7280';
        return '<span class="status-badge" style="--badge-color:'+c+'">'+status+'</span>';
    }
    `;
}

function getStyles(): string {
    return `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
        --bg-primary: #0f1117;
        --bg-secondary: #1a1d27;
        --bg-card: #1e2230;
        --bg-card-hover: #252a3a;
        --border: #2a2f42;
        --text-primary: #e4e6f0;
        --text-secondary: #8b8fa3;
        --text-muted: #5a5f73;
        --accent: #6366f1;
        --accent-glow: rgba(99, 102, 241, 0.25);
        --success: #10b981;
        --warning: #f59e0b;
        --danger: #ef4444;
        --info: #3b82f6;
        --radius: 12px;
        --sidebar-w: 260px;
    }

    body {
        font-family: 'Inter', -apple-system, sans-serif;
        background: var(--bg-primary);
        color: var(--text-primary);
        display: flex;
        min-height: 100vh;
        overflow-x: hidden;
    }

    /* Sidebar */
    .sidebar {
        width: var(--sidebar-w);
        background: var(--bg-secondary);
        border-right: 1px solid var(--border);
        display: flex;
        flex-direction: column;
        position: fixed;
        top: 0; left: 0; bottom: 0;
        z-index: 100;
    }

    .sidebar-header {
        padding: 24px 20px;
        border-bottom: 1px solid var(--border);
    }

    .logo {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .logo-icon {
        width: 40px; height: 40px;
        background: linear-gradient(135deg, var(--accent), #818cf8);
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        color: #fff;
    }

    .logo h1 {
        font-size: 18px;
        font-weight: 700;
        letter-spacing: -0.02em;
    }

    .badge {
        font-size: 10px;
        font-weight: 600;
        text-transform: uppercase;
        background: var(--accent);
        color: #fff;
        padding: 2px 8px;
        border-radius: 4px;
        letter-spacing: 0.05em;
    }

    .sidebar-nav {
        flex: 1;
        padding: 16px 12px;
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .sidebar-nav a, .sidebar-footer a {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 14px;
        border-radius: 8px;
        color: var(--text-secondary);
        text-decoration: none;
        font-size: 14px;
        font-weight: 500;
        transition: all 0.2s;
    }

    .sidebar-nav a:hover, .sidebar-footer a:hover {
        background: var(--bg-card);
        color: var(--text-primary);
    }

    .sidebar-nav a.active {
        background: var(--accent-glow);
        color: var(--accent);
        font-weight: 600;
    }

    .sidebar-nav a i, .sidebar-footer a i {
        font-size: 18px;
        width: 20px;
        text-align: center;
    }

    .sidebar-footer {
        padding: 12px;
        border-top: 1px solid var(--border);
    }

    /* Main Content */
    .main-content {
        flex: 1;
        margin-left: var(--sidebar-w);
        min-height: 100vh;
    }

    .topbar {
        padding: 20px 32px;
        border-bottom: 1px solid var(--border);
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: var(--bg-secondary);
        position: sticky;
        top: 0;
        z-index: 50;
    }

    .page-title {
        font-size: 22px;
        font-weight: 700;
        letter-spacing: -0.02em;
    }

    .env-badge {
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        padding: 4px 10px;
        border-radius: 6px;
        background: rgba(99, 102, 241, 0.15);
        color: var(--accent);
    }

    .content-area {
        padding: 28px 32px;
    }

    /* Cards */
    .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 16px;
        margin-bottom: 28px;
    }

    .stat-card {
        background: var(--bg-card);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 20px;
        transition: all 0.25s;
    }

    .stat-card:hover {
        border-color: var(--accent);
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(0,0,0,0.3);
    }

    .stat-card .stat-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;
    }

    .stat-card .stat-label {
        font-size: 13px;
        color: var(--text-secondary);
        font-weight: 500;
    }

    .stat-card .stat-icon {
        width: 36px; height: 36px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
    }

    .stat-card .stat-value {
        font-size: 28px;
        font-weight: 800;
        letter-spacing: -0.03em;
        line-height: 1;
    }

    .stat-card .stat-sub {
        font-size: 12px;
        color: var(--text-muted);
        margin-top: 6px;
    }

    /* Panel card */
    .panel {
        background: var(--bg-card);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        margin-bottom: 24px;
        overflow: hidden;
    }

    .panel-header {
        padding: 16px 20px;
        border-bottom: 1px solid var(--border);
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .panel-header h3 {
        font-size: 16px;
        font-weight: 600;
    }

    .panel-body {
        padding: 0;
    }

    /* Table */
    .data-table {
        width: 100%;
        border-collapse: collapse;
    }

    .data-table th {
        text-align: left;
        padding: 12px 16px;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--text-muted);
        background: var(--bg-secondary);
        border-bottom: 1px solid var(--border);
    }

    .data-table td {
        padding: 12px 16px;
        font-size: 13px;
        border-bottom: 1px solid var(--border);
        color: var(--text-secondary);
    }

    .data-table tr:hover td {
        background: var(--bg-card-hover);
    }

    .data-table td:first-child { color: var(--text-primary); font-weight: 500; }

    /* Status badges */
    .status-badge {
        display: inline-block;
        font-size: 11px;
        font-weight: 600;
        padding: 3px 10px;
        border-radius: 20px;
        background: color-mix(in srgb, var(--badge-color) 15%, transparent);
        color: var(--badge-color);
    }

    /* Buttons */
    .btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 8px 16px;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 600;
        border: none;
        cursor: pointer;
        transition: all 0.2s;
        font-family: inherit;
    }

    .btn-primary { background: var(--accent); color: #fff; }
    .btn-primary:hover { background: #5558e6; }
    .btn-success { background: var(--success); color: #fff; }
    .btn-success:hover { background: #0ea472; }
    .btn-danger { background: var(--danger); color: #fff; }
    .btn-danger:hover { background: #dc2626; }
    .btn-sm { padding: 5px 10px; font-size: 12px; }
    .btn-outline {
        background: transparent;
        border: 1px solid var(--border);
        color: var(--text-secondary);
    }
    .btn-outline:hover {
        border-color: var(--accent);
        color: var(--accent);
    }

    /* Inputs */
    .input {
        padding: 9px 14px;
        border-radius: 8px;
        border: 1px solid var(--border);
        background: var(--bg-primary);
        color: var(--text-primary);
        font-size: 13px;
        font-family: inherit;
        outline: none;
        transition: border-color 0.2s;
    }

    .input:focus { border-color: var(--accent); }

    .search-bar {
        display: flex;
        gap: 10px;
        margin-bottom: 20px;
        align-items: center;
        flex-wrap: wrap;
    }

    .search-bar .input { flex: 1; min-width: 200px; }

    select.input {
        cursor: pointer;
        appearance: auto;
    }

    /* Grid layouts */
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }

    /* KYC image preview */
    .kyc-images {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        padding: 20px;
    }

    .kyc-img-box {
        background: var(--bg-primary);
        border: 1px solid var(--border);
        border-radius: 10px;
        overflow: hidden;
        text-align: center;
    }

    .kyc-img-box .label {
        padding: 10px;
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        color: var(--text-muted);
        border-bottom: 1px solid var(--border);
    }

    .kyc-img-box img {
        max-width: 100%;
        max-height: 300px;
        object-fit: contain;
        padding: 16px;
    }

    .kyc-img-box .no-image {
        padding: 60px 20px;
        color: var(--text-muted);
        font-size: 13px;
    }

    /* Toast */
    #toast-container {
        position: fixed;
        top: 24px;
        right: 24px;
        z-index: 999;
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .toast {
        padding: 12px 20px;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 500;
        animation: slideIn 0.3s ease;
        box-shadow: 0 4px 20px rgba(0,0,0,0.4);
    }

    .toast-success { background: var(--success); color: #fff; }
    .toast-error { background: var(--danger); color: #fff; }

    @keyframes slideIn { from { transform: translateX(100px); opacity:0; } to { transform: translateX(0); opacity:1; } }

    /* KYC detail info */
    .detail-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        padding: 20px;
    }

    .detail-item label {
        display: block;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        color: var(--text-muted);
        margin-bottom: 4px;
    }

    .detail-item .value {
        font-size: 14px;
        color: var(--text-primary);
    }

    /* Loading */
    .loading {
        text-align: center;
        padding: 40px;
        color: var(--text-muted);
    }

    /* Empty state */
    .empty-state {
        text-align: center;
        padding: 60px 20px;
        color: var(--text-muted);
    }

    .empty-state i {
        font-size: 48px;
        margin-bottom: 12px;
        display: block;
        opacity: 0.4;
    }

    /* Pagination */
    .pagination {
        display: flex;
        gap: 6px;
        align-items: center;
        justify-content: center;
        padding: 16px;
    }

    .actions-bar {
        display: flex;
        gap: 8px;
        padding: 16px 20px;
        border-top: 1px solid var(--border);
    }

    /* Responsive */
    @media (max-width: 1200px) {
        .grid-2 { grid-template-columns: 1fr; }
        .stats-grid { grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }
    }

    @media (max-width: 768px) {
        .sidebar { width: 60px; }
        .sidebar span, .sidebar h1, .sidebar .badge { display: none; }
        .main-content { margin-left: 60px; }
        .content-area { padding: 16px; }
    }
    `;
}
