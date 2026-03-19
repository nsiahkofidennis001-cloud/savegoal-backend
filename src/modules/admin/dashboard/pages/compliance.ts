/** Compliance dashboard page */
export function compliancePage(): string {
    return `
    <div class="stats-grid" id="compliance-stats"><div class="loading">Loading compliance data...</div></div>

    <div class="grid-2">
        <div class="panel">
            <div class="panel-header"><h3>Audit Trail</h3></div>
            <div class="panel-body" id="audit-trail"><div class="loading">Loading...</div></div>
        </div>
        <div class="panel">
            <div class="panel-header"><h3>Flagged Accounts</h3></div>
            <div class="panel-body" id="flagged-accounts"><div class="loading">Loading...</div></div>
        </div>
    </div>

    <script>
    async function loadComplianceOverview() {
        const data = await apiCall('/api/admin/compliance/overview');
        document.getElementById('compliance-stats').innerHTML = \`
            <div class="stat-card">
                <div class="stat-header"><span class="stat-label">KYC Verification Rate</span><div class="stat-icon" style="background:rgba(16,185,129,0.15);color:#10b981"><i class="ri-shield-check-line"></i></div></div>
                <div class="stat-value">\${data.kyc.verificationRate}%</div>
                <div class="stat-sub">\${data.kyc.verified} verified of \${data.kyc.totalProfiles} profiles</div>
            </div>
            <div class="stat-card">
                <div class="stat-header"><span class="stat-label">Pending KYC</span><div class="stat-icon" style="background:rgba(245,158,11,0.15);color:#f59e0b"><i class="ri-time-line"></i></div></div>
                <div class="stat-value">\${data.kyc.pending}</div>
                <div class="stat-sub">Awaiting review</div>
            </div>
            <div class="stat-card">
                <div class="stat-header"><span class="stat-label">Suspended Users</span><div class="stat-icon" style="background:rgba(239,68,68,0.15);color:#ef4444"><i class="ri-user-forbid-line"></i></div></div>
                <div class="stat-value">\${data.flags.suspendedUsers}</div>
            </div>
            <div class="stat-card">
                <div class="stat-header"><span class="stat-label">Unverified Merchants</span><div class="stat-icon" style="background:rgba(245,158,11,0.15);color:#f59e0b"><i class="ri-store-2-line"></i></div></div>
                <div class="stat-value">\${data.flags.unverifiedMerchants}</div>
            </div>
            <div class="stat-card">
                <div class="stat-header"><span class="stat-label">Failed KYC</span><div class="stat-icon" style="background:rgba(239,68,68,0.15);color:#ef4444"><i class="ri-close-circle-line"></i></div></div>
                <div class="stat-value">\${data.kyc.failed}</div>
            </div>
            <div class="stat-card">
                <div class="stat-header"><span class="stat-label">Total Audit Logs</span><div class="stat-icon" style="background:rgba(99,102,241,0.15);color:#6366f1"><i class="ri-file-list-3-line"></i></div></div>
                <div class="stat-value">\${data.auditLogs}</div>
            </div>
        \`;
    }

    async function loadAuditTrail() {
        const data = await apiCall('/api/admin/compliance/audit-trail?limit=20');
        const el = document.getElementById('audit-trail');
        if (!data.logs.length) { el.innerHTML = '<div class="empty-state"><i class="ri-file-list-3-line"></i>No audit logs yet</div>'; return; }
        el.innerHTML = '<div style="max-height:400px;overflow-y:auto">' + data.logs.map(l => \`
            <div style="padding:10px 16px;border-bottom:1px solid var(--border);font-size:13px">
                <div style="display:flex;justify-content:space-between;align-items:center">
                    <span style="font-weight:500">\${l.action}</span>
                    <span style="font-size:11px;color:var(--text-muted)">\${formatDate(l.createdAt)}</span>
                </div>
                <div style="color:var(--text-secondary);font-size:12px;margin-top:2px">\${l.entityType} · \${l.entityId.substring(0,8)}...</div>
            </div>
        \`).join('') + '</div>';
    }

    async function loadFlagged() {
        const data = await apiCall('/api/admin/compliance/flagged');
        const el = document.getElementById('flagged-accounts');
        const items = [...data.suspended.map(u => ({name:u.name,email:u.email,type:'Suspended',date:u.createdAt})),
                       ...data.failedKyc.map(k => ({name:k.user.name,email:k.user.email,type:'Failed KYC',date:k.updatedAt}))];
        if (!items.length) { el.innerHTML = '<div class="empty-state"><i class="ri-check-double-line"></i>No flagged accounts</div>'; return; }
        el.innerHTML = '<div style="max-height:400px;overflow-y:auto">' + items.map(i => \`
            <div style="padding:10px 16px;border-bottom:1px solid var(--border);font-size:13px;display:flex;justify-content:space-between;align-items:center">
                <div>
                    <div style="font-weight:500">\${i.name}</div>
                    <div style="font-size:12px;color:var(--text-muted)">\${i.email}</div>
                </div>
                <span class="status-badge" style="--badge-color:#ef4444">\${i.type}</span>
            </div>
        \`).join('') + '</div>';
    }

    loadComplianceOverview();
    loadAuditTrail();
    loadFlagged();
    </script>`;
}
