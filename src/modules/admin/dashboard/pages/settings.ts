/** Platform settings dashboard page */
export function settingsPage(): string {
    return `
    <div id="settings-content"><div class="loading">Loading platform configuration...</div></div>

    <script>
    async function loadSettings() {
        const data = await apiCall('/api/admin/settings');
        document.getElementById('settings-content').innerHTML = \`
            <div class="grid-2">
                <div class="panel">
                    <div class="panel-header"><h3>Platform Info</h3></div>
                    <div class="detail-grid">
                        <div class="detail-item"><label>Name</label><div class="value">\${data.platform.name}</div></div>
                        <div class="detail-item"><label>Version</label><div class="value">\${data.platform.version}</div></div>
                        <div class="detail-item"><label>Environment</label><div class="value">\${statusBadge(data.platform.environment.toUpperCase())}</div></div>
                        <div class="detail-item"><label>Currency</label><div class="value">\${data.platform.currency}</div></div>
                    </div>
                </div>
                <div class="panel">
                    <div class="panel-header"><h3>Quick Stats</h3></div>
                    <div class="detail-grid">
                        <div class="detail-item"><label>Total Users</label><div class="value" style="font-size:24px;font-weight:700">\${data.stats.totalUsers}</div></div>
                        <div class="detail-item"><label>Total Merchants</label><div class="value" style="font-size:24px;font-weight:700">\${data.stats.totalMerchants}</div></div>
                        <div class="detail-item"><label>Total Transactions</label><div class="value" style="font-size:24px;font-weight:700">\${data.stats.totalTransactions}</div></div>
                    </div>
                </div>
            </div>

            <div class="grid-2" style="margin-top:24px">
                <div class="panel">
                    <div class="panel-header"><h3>Feature Flags</h3></div>
                    <div style="padding:16px">
                        \${featureRow('SMS Notifications', data.features.smsNotifications)}
                        \${featureRow('WhatsApp Notifications', data.features.whatsappNotifications)}
                        \${featureRow('Email Notifications', data.features.emailNotifications)}
                        \${featureRow('Paystack Payments', data.features.paystack)}
                        \${featureRow('KYC Verification', data.features.kycEnabled)}
                        \${featureRow('Recurring Auto-Savings', data.features.recurringAutoSavings)}
                        \${featureRow('Public Contributions', data.features.publicContributions)}
                    </div>
                </div>
                <div class="panel">
                    <div class="panel-header"><h3>Integrations</h3></div>
                    <div style="padding:16px">
                        \${integrationRow('Twilio', data.integrations.twilio)}
                        \${integrationRow('Paystack', data.integrations.paystack)}
                        \${integrationRow('SendGrid', data.integrations.sendgrid)}
                        \${integrationRow('BetterAuth', data.integrations.betterAuth)}
                    </div>
                </div>
            </div>
        \`;
    }

    function featureRow(name, enabled) {
        const color = enabled ? '#10b981' : '#ef4444';
        const icon = enabled ? 'ri-check-line' : 'ri-close-line';
        const label = enabled ? 'Enabled' : 'Disabled';
        return \`<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)">
            <span style="font-size:13px;font-weight:500">\${name}</span>
            <span style="font-size:12px;font-weight:600;color:\${color}"><i class="\${icon}"></i> \${label}</span>
        </div>\`;
    }

    function integrationRow(name, status) {
        const connected = status === 'Connected';
        const color = connected ? '#10b981' : '#f59e0b';
        return \`<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)">
            <span style="font-size:13px;font-weight:500">\${name}</span>
            <span class="status-badge" style="--badge-color:\${color}">\${status}</span>
        </div>\`;
    }

    loadSettings();
    </script>`;
}
