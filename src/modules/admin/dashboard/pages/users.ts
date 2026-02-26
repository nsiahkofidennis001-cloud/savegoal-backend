/** Users management page */
export function usersPage(): string {
    return `
    <div class="search-bar">
        <input class="input" id="user-search" placeholder="Search by name, email, or phone..." />
        <select class="input" id="role-filter">
            <option value="">All Roles</option>
            <option value="CONSUMER">Consumer</option>
            <option value="MERCHANT">Merchant</option>
            <option value="ADMIN">Admin</option>
        </select>
        <select class="input" id="kyc-filter">
            <option value="">All KYC</option>
            <option value="PENDING">Pending</option>
            <option value="VERIFIED">Verified</option>
            <option value="FAILED">Failed</option>
        </select>
        <button class="btn btn-primary" onclick="searchUsers()"><i class="ri-search-line"></i> Search</button>
    </div>
    <div class="panel">
        <div class="panel-body">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Name</th><th>Email</th><th>Role</th><th>KYC Status</th><th>Balance</th><th>Joined</th><th>Actions</th>
                    </tr>
                </thead>
                <tbody id="users-table"><tr><td colspan="7"><div class="loading">Loading users...</div></td></tr></tbody>
            </table>
        </div>
        <div class="pagination" id="users-pagination"></div>
    </div>

    <!-- User Detail Modal -->
    <div id="user-modal" style="display:none;position:fixed;inset:0;z-index:200;background:rgba(0,0,0,0.7);overflow-y:auto;padding:40px">
        <div style="max-width:800px;margin:0 auto;background:var(--bg-card);border-radius:var(--radius);border:1px solid var(--border)">
            <div style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
                <h3>User Detail</h3>
                <button class="btn btn-outline btn-sm" onclick="document.getElementById('user-modal').style.display='none'"><i class="ri-close-line"></i></button>
            </div>
            <div id="user-detail-content" style="padding:20px"><div class="loading">Loading...</div></div>
        </div>
    </div>

    <script>
    let currentPage = 1;

    async function loadUsers(page = 1) {
        currentPage = page;
        const q = document.getElementById('user-search').value;
        const role = document.getElementById('role-filter').value;
        const kycStatus = document.getElementById('kyc-filter').value;

        const params = new URLSearchParams({ page: page.toString(), limit: '20' });
        if (q) params.set('q', q);
        if (role) params.set('role', role);
        if (kycStatus) params.set('kycStatus', kycStatus);

        const data = await apiCall('/api/admin/users/search?' + params);
        const tb = document.getElementById('users-table');

        if (!data.users.length) {
            tb.innerHTML = '<tr><td colspan="7"><div class="empty-state"><i class="ri-user-search-line"></i>No users found</div></td></tr>';
            return;
        }

        tb.innerHTML = data.users.map(u => \`<tr>
            <td>\${u.name}</td>
            <td style="color:var(--text-secondary)">\${u.email}</td>
            <td>\${statusBadge(u.role)}</td>
            <td>\${u.profile ? statusBadge(u.profile.kycStatus) : '<span style="color:var(--text-muted)">No Profile</span>'}</td>
            <td>\${u.wallet ? 'GHS ' + formatAmount(u.wallet.balance) : '—'}</td>
            <td style="color:var(--text-muted);font-size:12px">\${formatDate(u.createdAt)}</td>
            <td>
                <button class="btn btn-outline btn-sm" onclick="viewUser('\${u.id}')"><i class="ri-eye-line"></i></button>
            </td>
        </tr>\`).join('');

        const p = data.pagination;
        document.getElementById('users-pagination').innerHTML =
            (p.page > 1 ? '<button class="btn btn-outline btn-sm" onclick="loadUsers('+(p.page-1)+')">← Prev</button>' : '') +
            '<span style="font-size:13px;color:var(--text-muted)">Page '+p.page+' of '+p.totalPages+' ('+p.total+' users)</span>' +
            (p.page < p.totalPages ? '<button class="btn btn-outline btn-sm" onclick="loadUsers('+(p.page+1)+')">Next →</button>' : '');
    }

    function searchUsers() { loadUsers(1); }
    document.getElementById('user-search').addEventListener('keyup', e => { if(e.key==='Enter') searchUsers(); });

    async function viewUser(id) {
        document.getElementById('user-modal').style.display = 'block';
        document.getElementById('user-detail-content').innerHTML = '<div class="loading">Loading user details...</div>';

        const u = await apiCall('/api/admin/users/' + id);
        document.getElementById('user-detail-content').innerHTML = \`
            <div class="detail-grid">
                <div class="detail-item"><label>Name</label><div class="value">\${u.name}</div></div>
                <div class="detail-item"><label>Email</label><div class="value">\${u.email}</div></div>
                <div class="detail-item"><label>Phone</label><div class="value">\${u.phone || '—'}</div></div>
                <div class="detail-item"><label>Role</label><div class="value">\${statusBadge(u.role)}</div></div>
                <div class="detail-item"><label>Joined</label><div class="value">\${formatDate(u.createdAt)}</div></div>
                <div class="detail-item"><label>Wallet</label><div class="value">\${u.wallet ? 'GHS ' + formatAmount(u.wallet.balance) : 'No wallet'}</div></div>
            </div>
            \${u.profile ? \`
                <div style="padding:0 20px"><h4 style="font-size:14px;margin-bottom:8px">KYC Info</h4></div>
                <div class="detail-grid">
                    <div class="detail-item"><label>KYC Status</label><div class="value">\${statusBadge(u.profile.kycStatus)}</div></div>
                    <div class="detail-item"><label>ID Type</label><div class="value">\${u.profile.idType || '—'}</div></div>
                    <div class="detail-item"><label>ID Number</label><div class="value">\${u.profile.idNumber || '—'}</div></div>
                    <div class="detail-item"><label>Selfie Verified</label><div class="value">\${u.profile.selfieVerified ? '✅ Yes' : '❌ No'}</div></div>
                </div>
            \` : ''}
            <div style="padding:0 20px"><h4 style="font-size:14px;margin:12px 0 8px">Goals (\${u.goals?.length || 0})</h4></div>
            \${u.goals?.length ? '<table class="data-table"><thead><tr><th>Name</th><th>Target</th><th>Saved</th><th>Status</th></tr></thead><tbody>' +
                u.goals.map(g => '<tr><td>'+g.name+'</td><td>GHS '+formatAmount(g.targetAmount)+'</td><td>GHS '+formatAmount(g.currentAmount)+'</td><td>'+statusBadge(g.status)+'</td></tr>').join('') +
                '</tbody></table>' : '<div style="padding:0 20px;color:var(--text-muted);font-size:13px">No goals yet</div>'}
            <div class="actions-bar">
                <button class="btn btn-danger btn-sm" onclick="suspendUser('\${u.id}', true)"><i class="ri-forbid-line"></i> Suspend</button>
                <button class="btn btn-success btn-sm" onclick="suspendUser('\${u.id}', false)"><i class="ri-check-line"></i> Unsuspend</button>
            </div>
        \`;
    }

    async function suspendUser(id, suspend) {
        if(!confirm(suspend ? 'Suspend this user?' : 'Unsuspend this user?')) return;
        await apiCall('/api/admin/users/' + id + '/suspend', { method: 'PATCH', body: JSON.stringify({ suspend }) });
        showToast(suspend ? 'User suspended' : 'User unsuspended');
        loadUsers(currentPage);
    }

    loadUsers();
    </script>`;
}
