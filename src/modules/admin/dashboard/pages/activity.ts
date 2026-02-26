/** Activity feed page */
export function activityPage(): string {
    return `
    <div class="panel">
        <div class="panel-header"><h3>System Activity Feed</h3><button class="btn btn-outline btn-sm" onclick="loadActivity()"><i class="ri-refresh-line"></i> Refresh</button></div>
        <div class="panel-body" id="activity-list"><div class="loading">Loading activity...</div></div>
    </div>
    <script>
    async function loadActivity() {
        const data = await apiCall('/api/admin/activity?limit=50');
        const el = document.getElementById('activity-list');
        if(!data.length){el.innerHTML='<div class="empty-state"><i class="ri-inbox-line"></i>No activity yet</div>';return;}
        el.innerHTML = '<div style="max-height:600px;overflow-y:auto">' + data.map(a => \`
            <div style="padding:12px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:12px">
                <div style="width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;background:\${bgColor(a.type)};color:\${fgColor(a.type)}">
                    <i class="\${icon(a.type)}"></i>
                </div>
                <div style="flex:1">
                    <div style="font-size:13px;font-weight:500">\${a.message}</div>
                    <div style="font-size:12px;color:var(--text-muted);margin-top:2px">\${a.user} · \${formatDate(a.timestamp)}</div>
                </div>
                \${a.amount ? '<div style="font-weight:600;font-size:14px">GHS '+formatAmount(a.amount)+'</div>' : ''}
            </div>
        \`).join('') + '</div>';
    }
    function icon(t){return{USER_JOINED:'ri-user-add-line',TRANSACTION:'ri-exchange-funds-line',KYC_UPDATE:'ri-shield-check-line'}[t]||'ri-information-line';}
    function fgColor(t){return{USER_JOINED:'#6366f1',TRANSACTION:'#10b981',KYC_UPDATE:'#f59e0b'}[t]||'#6b7280';}
    function bgColor(t){return{USER_JOINED:'rgba(99,102,241,0.15)',TRANSACTION:'rgba(16,185,129,0.15)',KYC_UPDATE:'rgba(245,158,11,0.15)'}[t]||'rgba(107,114,128,0.15)';}
    loadActivity();
    </script>`;
}
