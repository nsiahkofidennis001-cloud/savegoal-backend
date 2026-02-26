/** Merchants management page */
export function merchantsPage(): string {
    return `
    <div class="panel">
        <div class="panel-header"><h3>Merchant Profiles</h3><button class="btn btn-outline btn-sm" onclick="loadMerchants()"><i class="ri-refresh-line"></i> Refresh</button></div>
        <div class="panel-body">
            <table class="data-table">
                <thead><tr><th>Business</th><th>Owner</th><th>Email</th><th>Contact</th><th>Products</th><th>Balance</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody id="merchants-table"><tr><td colspan="8"><div class="loading">Loading...</div></td></tr></tbody>
            </table>
        </div>
    </div>
    <script>
    async function loadMerchants() {
        const data = await apiCall('/api/admin/merchants');
        const tb = document.getElementById('merchants-table');
        if (!data.length) { tb.innerHTML = '<tr><td colspan="8"><div class="empty-state"><i class="ri-store-2-line"></i>No merchants yet</div></td></tr>'; return; }
        tb.innerHTML = data.map(m => \`<tr>
            <td>\${m.businessName}</td>
            <td>\${m.user?.name || '—'}</td>
            <td style="color:var(--text-secondary)">\${m.contactEmail}</td>
            <td>\${m.contactPhone}</td>
            <td>\${m._count?.products || 0}</td>
            <td>GHS \${formatAmount(m.balance)}</td>
            <td>\${m.isVerified ? '<span class="status-badge" style="--badge-color:#10b981">VERIFIED</span>' : '<span class="status-badge" style="--badge-color:#f59e0b">UNVERIFIED</span>'}</td>
            <td>
                \${m.isVerified
                    ? '<button class="btn btn-danger btn-sm" onclick="toggleMerchant(\\''+m.id+'\\',false)"><i class="ri-close-line"></i></button>'
                    : '<button class="btn btn-success btn-sm" onclick="toggleMerchant(\\''+m.id+'\\',true)"><i class="ri-check-line"></i></button>'}
            </td>
        </tr>\`).join('');
    }
    async function toggleMerchant(id, verify) {
        if(!confirm(verify?'Verify this merchant?':'Revoke verification?')) return;
        await apiCall('/api/admin/merchants/'+id+'/verify',{method:'PATCH',body:JSON.stringify({isVerified:verify})});
        showToast(verify?'Merchant verified':'Verification revoked');
        loadMerchants();
    }
    loadMerchants();
    </script>`;
}
