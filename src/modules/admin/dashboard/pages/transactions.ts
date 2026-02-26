/** Transactions monitoring page */
export function transactionsPage(): string {
    return `
    <div class="search-bar">
        <select class="input" id="tx-type-filter">
            <option value="">All Types</option>
            <option value="DEPOSIT">Deposit</option>
            <option value="WITHDRAWAL">Withdrawal</option>
            <option value="GOAL_FUNDING">Goal Funding</option>
            <option value="GOAL_WITHDRAWAL">Goal Withdrawal</option>
            <option value="MERCHANT_PAYOUT">Merchant Payout</option>
            <option value="AUTOMATED_SAVINGS">Automated Savings</option>
        </select>
        <select class="input" id="tx-status-filter">
            <option value="">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
            <option value="CANCELLED">Cancelled</option>
        </select>
        <button class="btn btn-primary" onclick="loadTx()"><i class="ri-search-line"></i> Filter</button>
    </div>
    <div class="panel">
        <div class="panel-body">
            <table class="data-table">
                <thead><tr><th>User</th><th>Type</th><th>Amount</th><th>Goal</th><th>Status</th><th>Date</th></tr></thead>
                <tbody id="tx-table"><tr><td colspan="6"><div class="loading">Loading...</div></td></tr></tbody>
            </table>
        </div>
        <div class="pagination" id="tx-pagination"></div>
    </div>
    <script>
    let txPage = 1;
    async function loadTx(page = 1) {
        txPage = page;
        const type = document.getElementById('tx-type-filter').value;
        const status = document.getElementById('tx-status-filter').value;
        const params = new URLSearchParams({page:page.toString(),limit:'30'});
        if(type) params.set('type', type);
        if(status) params.set('status', status);
        const data = await apiCall('/api/admin/transactions?'+params);
        const tb = document.getElementById('tx-table');
        if(!data.transactions.length){tb.innerHTML='<tr><td colspan="6"><div class="empty-state"><i class="ri-exchange-funds-line"></i>No transactions</div></td></tr>';return;}
        tb.innerHTML = data.transactions.map(t => \`<tr>
            <td>\${t.wallet?.user?.name||'—'}</td>
            <td>\${statusBadge(t.type)}</td>
            <td style="font-weight:600">GHS \${formatAmount(t.amount)}</td>
            <td style="color:var(--text-muted)">\${t.goal?.name||'—'}</td>
            <td>\${statusBadge(t.status)}</td>
            <td style="color:var(--text-muted);font-size:12px">\${formatDate(t.createdAt)}</td>
        </tr>\`).join('');
        const pg=data.pagination;
        document.getElementById('tx-pagination').innerHTML=
            (pg.page>1?'<button class="btn btn-outline btn-sm" onclick="loadTx('+(pg.page-1)+')">← Prev</button>':'')+
            '<span style="font-size:13px;color:var(--text-muted)">Page '+pg.page+' of '+pg.totalPages+' ('+pg.total+')</span>'+
            (pg.page<pg.totalPages?'<button class="btn btn-outline btn-sm" onclick="loadTx('+(pg.page+1)+')">Next →</button>':'');
    }
    loadTx();
    </script>`;
}
