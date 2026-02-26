/** Overview page template */
export function overviewPage(): string {
    return `
    <div id="stats-grid" class="stats-grid"><div class="loading">Loading stats...</div></div>
    <div class="grid-2">
        <div class="panel">
            <div class="panel-header"><h3><i class="ri-pie-chart-line"></i>&nbsp; KYC Overview</h3></div>
            <div class="panel-body" id="kyc-summary"><div class="loading">Loading...</div></div>
        </div>
        <div class="panel">
            <div class="panel-header"><h3><i class="ri-time-line"></i>&nbsp; Recent Activity</h3></div>
            <div class="panel-body" id="recent-activity"><div class="loading">Loading...</div></div>
        </div>
    </div>
    <script>
    (async () => {
        try {
            const stats = await apiCall('/api/admin/dashboard');
            const o = stats.overview;
            const k = stats.kyc;

            document.getElementById('stats-grid').innerHTML = [
                statCard('Total Users', o.totalUsers, 'ri-group-fill', '#6366f1', '+' + stats.trends.newUsersLast7Days + ' this week'),
                statCard('Merchants', o.totalMerchants, 'ri-store-2-fill', '#f59e0b'),
                statCard('Active Goals', o.activeGoals, 'ri-focus-2-line', '#3b82f6', o.completedGoals + ' completed'),
                statCard('Total Saved', 'GHS ' + formatAmount(o.totalSavedGHS), 'ri-money-cedi-circle-fill', '#10b981'),
                statCard('Transactions', o.totalTransactions, 'ri-exchange-funds-fill', '#8b5cf6', stats.trends.transactionsLast7Days + ' this week'),
                statCard('Pending KYC', k.pending, 'ri-shield-check-fill', '#f59e0b', k.verified + ' verified'),
                statCard('Wallet Balance', 'GHS ' + formatAmount(o.totalWalletBalanceGHS), 'ri-wallet-3-fill', '#06b6d4'),
                statCard('Pending Payouts', o.pendingPayouts, 'ri-bank-fill', '#ef4444')
            ].join('');

            // KYC summary
            document.getElementById('kyc-summary').innerHTML = \`
                <div style="padding:20px">
                    <div class="grid-3" style="margin-bottom:16px">
                        <div style="text-align:center;padding:16px;background:var(--bg-primary);border-radius:8px">
                            <div style="font-size:28px;font-weight:800;color:#f59e0b">\${k.pending}</div>
                            <div style="font-size:12px;color:var(--text-muted);margin-top:4px">Pending</div>
                        </div>
                        <div style="text-align:center;padding:16px;background:var(--bg-primary);border-radius:8px">
                            <div style="font-size:28px;font-weight:800;color:#10b981">\${k.verified}</div>
                            <div style="font-size:12px;color:var(--text-muted);margin-top:4px">Verified</div>
                        </div>
                        <div style="text-align:center;padding:16px;background:var(--bg-primary);border-radius:8px">
                            <div style="font-size:28px;font-weight:800;color:#ef4444">\${k.failed}</div>
                            <div style="font-size:12px;color:var(--text-muted);margin-top:4px">Failed</div>
                        </div>
                    </div>
                    \${k.pending > 0 ? '<a href="/admin/kyc" class="btn btn-primary btn-sm" style="width:100%;justify-content:center"><i class="ri-arrow-right-line"></i> Review Pending KYC</a>' : '<div style="color:var(--text-muted);font-size:13px;text-align:center">All caught up!</div>'}
                </div>
            \`;

            // Recent Activity
            const activity = await apiCall('/api/admin/activity?limit=10');
            if (activity.length === 0) {
                document.getElementById('recent-activity').innerHTML = '<div class="empty-state"><i class="ri-inbox-line"></i>No recent activity</div>';
            } else {
                document.getElementById('recent-activity').innerHTML = '<div style="max-height:350px;overflow-y:auto">' +
                    activity.map(a => \`
                        <div style="padding:10px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px;font-size:13px">
                            <i class="\${actIcon(a.type)}" style="font-size:16px;color:\${actColor(a.type)};width:20px"></i>
                            <div style="flex:1">
                                <div style="color:var(--text-primary)">\${a.message}</div>
                                <div style="font-size:11px;color:var(--text-muted)">\${formatDate(a.timestamp)}</div>
                            </div>
                        </div>
                    \`).join('') + '</div>';
            }
        } catch(e) { console.error(e); }
    })();

    function statCard(label, value, icon, color, sub) {
        return \`<div class="stat-card">
            <div class="stat-header">
                <span class="stat-label">\${label}</span>
                <div class="stat-icon" style="background:color-mix(in srgb, \${color} 15%, transparent);color:\${color}"><i class="\${icon}"></i></div>
            </div>
            <div class="stat-value" style="color:\${color}">\${value}</div>
            \${sub ? '<div class="stat-sub">' + sub + '</div>' : ''}
        </div>\`;
    }

    function actIcon(type) {
        return { USER_JOINED:'ri-user-add-line', TRANSACTION:'ri-exchange-funds-line', KYC_UPDATE:'ri-shield-check-line' }[type] || 'ri-information-line';
    }
    function actColor(type) {
        return { USER_JOINED:'#6366f1', TRANSACTION:'#10b981', KYC_UPDATE:'#f59e0b' }[type] || '#6b7280';
    }
    </script>`;
}
