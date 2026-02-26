/** KYC Review page with selfie/ID side-by-side preview */
export function kycPage(): string {
    return `
    <div class="search-bar">
        <select class="input" id="kyc-status-filter">
            <option value="">All Submissions</option>
            <option value="PENDING" selected>Pending</option>
            <option value="VERIFIED">Verified</option>
            <option value="FAILED">Failed</option>
        </select>
        <button class="btn btn-primary" onclick="loadKyc()"><i class="ri-refresh-line"></i> Refresh</button>
    </div>

    <div class="panel">
        <div class="panel-body">
            <table class="data-table">
                <thead><tr><th>User</th><th>Email</th><th>ID Type</th><th>ID Number</th><th>Selfie</th><th>Status</th><th>Updated</th><th>Actions</th></tr></thead>
                <tbody id="kyc-table"><tr><td colspan="8"><div class="loading">Loading KYC submissions...</div></td></tr></tbody>
            </table>
        </div>
        <div class="pagination" id="kyc-pagination"></div>
    </div>

    <!-- KYC Detail Modal -->
    <div id="kyc-modal" style="display:none;position:fixed;inset:0;z-index:200;background:rgba(0,0,0,0.7);overflow-y:auto;padding:40px">
        <div style="max-width:900px;margin:0 auto;background:var(--bg-card);border-radius:var(--radius);border:1px solid var(--border)">
            <div style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
                <h3><i class="ri-shield-check-line"></i>&nbsp; KYC Review</h3>
                <button class="btn btn-outline btn-sm" onclick="document.getElementById('kyc-modal').style.display='none'"><i class="ri-close-line"></i></button>
            </div>
            <div id="kyc-detail-content"><div class="loading">Loading...</div></div>
        </div>
    </div>

    <script>
    let kycPage = 1;

    async function loadKyc(page = 1) {
        kycPage = page;
        const status = document.getElementById('kyc-status-filter').value;
        const params = new URLSearchParams({ page: page.toString(), limit: '20' });
        if (status) params.set('status', status);

        const data = await apiCall('/api/admin/kyc/all?' + params);
        const tb = document.getElementById('kyc-table');

        if (!data.profiles.length) {
            tb.innerHTML = '<tr><td colspan="8"><div class="empty-state"><i class="ri-shield-check-line"></i>No KYC submissions found</div></td></tr>';
            return;
        }

        tb.innerHTML = data.profiles.map(p => \`<tr>
            <td>\${p.user?.name || '—'}</td>
            <td style="color:var(--text-secondary)">\${p.user?.email || '—'}</td>
            <td>\${p.idType || '—'}</td>
            <td>\${p.idNumber || '—'}</td>
            <td>\${p.selfieImageUrl ? (p.selfieVerified ? '✅ Verified' : '📸 Submitted') : '<span style="color:var(--text-muted)">None</span>'}</td>
            <td>\${statusBadge(p.kycStatus)}</td>
            <td style="color:var(--text-muted);font-size:12px">\${formatDate(p.updatedAt)}</td>
            <td><button class="btn btn-primary btn-sm" onclick="reviewKyc('\${p.userId}')"><i class="ri-eye-line"></i> Review</button></td>
        </tr>\`).join('');

        const pg = data.pagination;
        document.getElementById('kyc-pagination').innerHTML =
            (pg.page > 1 ? '<button class="btn btn-outline btn-sm" onclick="loadKyc('+(pg.page-1)+')">← Prev</button>' : '') +
            '<span style="font-size:13px;color:var(--text-muted)">Page '+pg.page+' of '+pg.totalPages+'</span>' +
            (pg.page < pg.totalPages ? '<button class="btn btn-outline btn-sm" onclick="loadKyc('+(pg.page+1)+')">Next →</button>' : '');
    }

    async function reviewKyc(userId) {
        document.getElementById('kyc-modal').style.display = 'block';
        document.getElementById('kyc-detail-content').innerHTML = '<div class="loading">Loading KYC details...</div>';

        const p = await apiCall('/api/admin/kyc/' + userId + '/detail');

        document.getElementById('kyc-detail-content').innerHTML = \`
            <div class="detail-grid">
                <div class="detail-item"><label>User</label><div class="value">\${p.user?.name || '—'}</div></div>
                <div class="detail-item"><label>Email</label><div class="value">\${p.user?.email || '—'}</div></div>
                <div class="detail-item"><label>Phone</label><div class="value">\${p.user?.phone || '—'}</div></div>
                <div class="detail-item"><label>KYC Status</label><div class="value">\${statusBadge(p.kycStatus)}</div></div>
                <div class="detail-item"><label>ID Type</label><div class="value">\${p.idType || '—'}</div></div>
                <div class="detail-item"><label>ID Number</label><div class="value">\${p.idNumber || '—'}</div></div>
                <div class="detail-item"><label>Selfie Verified</label><div class="value">\${p.selfieVerified ? '✅ Yes' : '❌ No'}</div></div>
                <div class="detail-item"><label>Match Score</label><div class="value">\${p.selfieMatchScore != null ? (p.selfieMatchScore * 100).toFixed(0) + '%' : '—'}</div></div>
            </div>
            <div style="padding:0 20px 8px"><h4 style="font-size:14px">Document Comparison</h4></div>
            <div class="kyc-images">
                <div class="kyc-img-box">
                    <div class="label"><i class="ri-bank-card-line"></i> ID Document</div>
                    \${p.idImageUrl ? '<img src="'+p.idImageUrl+'" alt="ID Document" />' : '<div class="no-image"><i class="ri-image-line" style="font-size:32px;display:block;margin-bottom:8px"></i>No ID image uploaded</div>'}
                </div>
                <div class="kyc-img-box">
                    <div class="label"><i class="ri-camera-line"></i> Selfie Photo</div>
                    \${p.selfieImageUrl ? '<img src="'+p.selfieImageUrl+'" alt="Selfie" />' : '<div class="no-image"><i class="ri-camera-off-line" style="font-size:32px;display:block;margin-bottom:8px"></i>No selfie uploaded</div>'}
                </div>
            </div>
            \${p.kycNote ? '<div style="padding:0 20px 12px"><div style="padding:10px 14px;background:var(--bg-primary);border-radius:8px;font-size:13px"><strong>Note:</strong> '+p.kycNote+'</div></div>' : ''}
            \${p.selfieReviewNote ? '<div style="padding:0 20px 12px"><div style="padding:10px 14px;background:var(--bg-primary);border-radius:8px;font-size:13px"><strong>Selfie Note:</strong> '+p.selfieReviewNote+'</div></div>' : ''}
            <div style="padding:12px 20px">
                <label style="font-size:12px;color:var(--text-muted);display:block;margin-bottom:4px">Admin Note</label>
                <input class="input" id="kyc-note" style="width:100%;margin-bottom:12px" placeholder="Optional note for the user..." />
            </div>
            <div class="actions-bar" style="flex-wrap:wrap;gap:8px">
                <button class="btn btn-success" onclick="kycAction('\${p.userId}','VERIFIED')"><i class="ri-check-double-line"></i> Approve KYC</button>
                <button class="btn btn-danger" onclick="kycAction('\${p.userId}','FAILED')"><i class="ri-close-circle-line"></i> Reject KYC</button>
                <div style="border-left:1px solid var(--border);height:24px"></div>
                <button class="btn btn-outline" onclick="selfieAction('\${p.userId}',true)" style="color:var(--success);border-color:var(--success)"><i class="ri-camera-line"></i> Approve Selfie</button>
                <button class="btn btn-outline" onclick="selfieAction('\${p.userId}',false)" style="color:var(--danger);border-color:var(--danger)"><i class="ri-camera-off-line"></i> Reject Selfie</button>
            </div>
        \`;
    }

    async function kycAction(userId, status) {
        const note = document.getElementById('kyc-note')?.value;
        if (!confirm(status === 'VERIFIED' ? 'Approve this KYC?' : 'Reject this KYC?')) return;
        await apiCall('/api/admin/kyc/' + userId + '/verify', {
            method: 'PATCH', body: JSON.stringify({ status, note })
        });
        showToast('KYC ' + status.toLowerCase());
        document.getElementById('kyc-modal').style.display = 'none';
        loadKyc(kycPage);
    }

    async function selfieAction(userId, verified) {
        const note = document.getElementById('kyc-note')?.value;
        if (!confirm(verified ? 'Approve this selfie?' : 'Reject this selfie?')) return;
        await apiCall('/api/admin/kyc/' + userId + '/selfie', {
            method: 'PATCH', body: JSON.stringify({ verified, note })
        });
        showToast('Selfie ' + (verified ? 'approved' : 'rejected'));
        reviewKyc(userId);
    }

    loadKyc();
    </script>`;
}
