/** Reports dashboard page */
export function reportsPage(): string {
    return `
    <div class="stats-grid" id="report-stats"></div>

    <div class="panel">
        <div class="panel-header">
            <h3>Revenue Report</h3>
            <div style="display:flex;gap:8px;align-items:center">
                <input type="date" id="from-date" class="input" />
                <input type="date" id="to-date" class="input" />
                <button class="btn btn-primary btn-sm" onclick="loadRevenueReport()"><i class="ri-search-line"></i> Filter</button>
            </div>
        </div>
        <div class="panel-body" id="revenue-report"><div class="loading">Loading revenue report...</div></div>
    </div>

    <div class="grid-2">
        <div class="panel">
            <div class="panel-header"><h3>Goals Breakdown</h3></div>
            <div class="panel-body" id="goals-report"><div class="loading">Loading...</div></div>
        </div>
        <div class="panel">
            <div class="panel-header"><h3>Transaction Summary</h3></div>
            <div class="panel-body" id="tx-report"><div class="loading">Loading...</div></div>
        </div>
    </div>

    <script>
    async function loadRevenueReport() {
        const from = document.getElementById('from-date').value;
        const to = document.getElementById('to-date').value;
        let url = '/api/admin/reports/revenue';
        const params = [];
        if (from) params.push('from=' + from);
        if (to) params.push('to=' + to);
        if (params.length) url += '?' + params.join('&');

        const data = await apiCall(url);
        document.getElementById('revenue-report').innerHTML = \`
            <table class="data-table">
                <thead><tr><th>Category</th><th>Count</th><th>Total (GHS)</th></tr></thead>
                <tbody>
                    <tr><td>Deposits</td><td>\${data.deposits.count}</td><td>\${formatAmount(data.deposits.total)}</td></tr>
                    <tr><td>Goal Fundings</td><td>\${data.goalFundings.count}</td><td>\${formatAmount(data.goalFundings.total)}</td></tr>
                    <tr><td>Merchant Payouts</td><td>\${data.payouts.count}</td><td>\${formatAmount(data.payouts.total)}</td></tr>
                    <tr style="font-weight:700;border-top:2px solid var(--border)"><td>Overall</td><td>\${data.overall.count}</td><td>\${formatAmount(data.overall.total)}</td></tr>
                </tbody>
            </table>
            <div style="padding:12px 16px;font-size:12px;color:var(--text-muted)">Period: \${data.period.from} → \${data.period.to}</div>
        \`;
    }

    async function loadGoalReport() {
        const data = await apiCall('/api/admin/reports/goals');
        let html = '<table class="data-table"><thead><tr><th>Status</th><th>Count</th><th>Saved (GHS)</th></tr></thead><tbody>';
        data.byStatus.forEach(s => {
            html += \`<tr><td>\${statusBadge(s.status)}</td><td>\${s.count}</td><td>\${formatAmount(s.totalSaved)}</td></tr>\`;
        });
        html += \`</tbody></table><div style="padding:12px 16px;font-size:12px;color:var(--text-muted)">Total saved: GHS \${formatAmount(data.overall.totalSaved)} / Target: GHS \${formatAmount(data.overall.totalTarget)}</div>\`;
        document.getElementById('goals-report').innerHTML = html;
    }

    async function loadTxReport() {
        const data = await apiCall('/api/admin/reports/transactions');
        let html = '<table class="data-table"><thead><tr><th>Type</th><th>Count</th><th>Volume (GHS)</th></tr></thead><tbody>';
        data.byType.forEach(t => {
            html += \`<tr><td>\${t.type}</td><td>\${t.count}</td><td>\${formatAmount(t.volume)}</td></tr>\`;
        });
        html += \`</tbody></table><div style="padding:12px 16px;font-size:12px;color:var(--text-muted)">Total: \${data.totalCount} transactions, GHS \${formatAmount(data.totalVolume)}</div>\`;
        document.getElementById('tx-report').innerHTML = html;
    }

    async function loadUserGrowth() {
        const data = await apiCall('/api/admin/reports/users');
        document.getElementById('report-stats').innerHTML = \`
            <div class="stat-card">
                <div class="stat-header"><span class="stat-label">Total Users</span><div class="stat-icon" style="background:rgba(99,102,241,0.15);color:#6366f1"><i class="ri-group-line"></i></div></div>
                <div class="stat-value">\${data.totalUsers}</div>
            </div>
            <div class="stat-card">
                <div class="stat-header"><span class="stat-label">Consumers</span><div class="stat-icon" style="background:rgba(139,92,246,0.15);color:#8b5cf6"><i class="ri-user-line"></i></div></div>
                <div class="stat-value">\${data.breakdown.consumers}</div>
            </div>
            <div class="stat-card">
                <div class="stat-header"><span class="stat-label">Merchants</span><div class="stat-icon" style="background:rgba(245,158,11,0.15);color:#f59e0b"><i class="ri-store-2-line"></i></div></div>
                <div class="stat-value">\${data.breakdown.merchants}</div>
            </div>
            <div class="stat-card">
                <div class="stat-header"><span class="stat-label">Admins</span><div class="stat-icon" style="background:rgba(239,68,68,0.15);color:#ef4444"><i class="ri-shield-user-line"></i></div></div>
                <div class="stat-value">\${data.breakdown.admins}</div>
            </div>
        \`;
    }

    loadUserGrowth();
    loadRevenueReport();
    loadGoalReport();
    loadTxReport();
    </script>`;
}
