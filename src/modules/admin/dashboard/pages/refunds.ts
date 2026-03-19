/** Returns/Refunds dashboard page */
export function refundsPage(): string {
    return `
    <div class="stats-grid" id="refund-stats"><div class="loading">Loading refund stats...</div></div>

    <div class="panel">
        <div class="panel-header">
            <h3>Refund Requests</h3>
            <div style="display:flex;gap:8px">
                <select class="input" id="refund-filter" onchange="loadRefunds()">
                    <option value="">All Status</option>
                    <option value="PENDING">Pending</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="PROCESSED">Processed</option>
                </select>
                <button class="btn btn-outline btn-sm" onclick="loadRefunds()"><i class="ri-refresh-line"></i> Refresh</button>
            </div>
        </div>
        <div class="panel-body" id="refund-list"><div class="loading">Loading refund requests...</div></div>
    </div>

    <div id="refund-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:200;display:none;align-items:center;justify-content:center">
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:24px;width:400px;max-width:90vw">
            <h3 style="margin-bottom:16px" id="modal-title">Process Refund</h3>
            <input type="hidden" id="modal-refund-id" />
            <div style="margin-bottom:12px">
                <label style="font-size:12px;color:var(--text-muted);display:block;margin-bottom:4px">Admin Note</label>
                <textarea id="modal-note" class="input" style="width:100%;height:80px;resize:vertical" placeholder="Optional note..."></textarea>
            </div>
            <div style="display:flex;gap:8px;justify-content:flex-end">
                <button class="btn btn-outline btn-sm" onclick="closeModal()">Cancel</button>
                <button class="btn btn-danger btn-sm" onclick="processRefund('REJECTED')"><i class="ri-close-line"></i> Reject</button>
                <button class="btn btn-success btn-sm" onclick="processRefund('APPROVED')"><i class="ri-check-line"></i> Approve</button>
            </div>
        </div>
    </div>

    <script>
    async function loadRefundStats() {
        const data = await apiCall('/api/admin/refunds/stats');
        document.getElementById('refund-stats').innerHTML = \`
            <div class="stat-card">
                <div class="stat-header"><span class="stat-label">Pending</span><div class="stat-icon" style="background:rgba(245,158,11,0.15);color:#f59e0b"><i class="ri-time-line"></i></div></div>
                <div class="stat-value">\${data.pending}</div>
            </div>
            <div class="stat-card">
                <div class="stat-header"><span class="stat-label">Approved</span><div class="stat-icon" style="background:rgba(16,185,129,0.15);color:#10b981"><i class="ri-check-line"></i></div></div>
                <div class="stat-value">\${data.approved}</div>
            </div>
            <div class="stat-card">
                <div class="stat-header"><span class="stat-label">Rejected</span><div class="stat-icon" style="background:rgba(239,68,68,0.15);color:#ef4444"><i class="ri-close-line"></i></div></div>
                <div class="stat-value">\${data.rejected}</div>
            </div>
            <div class="stat-card">
                <div class="stat-header"><span class="stat-label">Total Refunded</span><div class="stat-icon" style="background:rgba(99,102,241,0.15);color:#6366f1"><i class="ri-money-dollar-circle-line"></i></div></div>
                <div class="stat-value">GHS \${formatAmount(data.totalRefundedGHS)}</div>
            </div>
        \`;
    }

    async function loadRefunds() {
        const status = document.getElementById('refund-filter').value;
        let url = '/api/admin/refunds?limit=50';
        if (status) url += '&status=' + status;
        const data = await apiCall(url);
        const el = document.getElementById('refund-list');
        if (!data.refunds.length) { el.innerHTML = '<div class="empty-state"><i class="ri-refund-2-line"></i>No refund requests</div>'; return; }
        el.innerHTML = \`<table class="data-table">
            <thead><tr><th>ID</th><th>Amount</th><th>Reason</th><th>Status</th><th>Date</th><th>Action</th></tr></thead>
            <tbody>\${data.refunds.map(r => \`
                <tr>
                    <td>\${r.id.substring(0,8)}...</td>
                    <td>GHS \${formatAmount(r.amount)}</td>
                    <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">\${r.reason}</td>
                    <td>\${statusBadge(r.status)}</td>
                    <td>\${formatDate(r.createdAt)}</td>
                    <td>\${r.status === 'PENDING' ? '<button class="btn btn-primary btn-sm" onclick="openModal(\\'' + r.id + '\\')"><i class="ri-settings-3-line"></i> Process</button>' : '—'}</td>
                </tr>
            \`).join('')}</tbody>
        </table>\`;
    }

    function openModal(id) {
        document.getElementById('modal-refund-id').value = id;
        document.getElementById('modal-note').value = '';
        document.getElementById('refund-modal').style.display = 'flex';
    }

    function closeModal() {
        document.getElementById('refund-modal').style.display = 'none';
    }

    async function processRefund(status) {
        const id = document.getElementById('modal-refund-id').value;
        const note = document.getElementById('modal-note').value;
        await apiCall('/api/admin/refunds/' + id + '/process', {
            method: 'PATCH',
            body: JSON.stringify({ status, note })
        });
        closeModal();
        showToast('Refund ' + status.toLowerCase() + ' successfully');
        loadRefundStats();
        loadRefunds();
    }

    loadRefundStats();
    loadRefunds();
    </script>`;
}
