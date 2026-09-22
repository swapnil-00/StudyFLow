// Settings Page
export function renderSettings(container) {
  const settings = store.getSettings();
  const branches = store.getBranches();

  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-row">
        <div>
          <h1 class="page-title">Settings</h1>
          <p class="page-subtitle">Organization, appearance, and configuration</p>
        </div>
      </div>
    </div>

    <div class="grid-2" style="gap:var(--space-5);align-items:start;">
      <!-- Organization -->
      <div class="card">
        <div class="card-header"><div class="card-title">Organization</div></div>
        <div class="card-body" style="display:flex;flex-direction:column;gap:var(--space-4);">
          <div class="form-group">
            <label class="form-label">Organization Name</label>
            <input type="text" class="input" id="set-org-name" value="${settings.orgName || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Address</label>
            <input type="text" class="input" id="set-address" value="${settings.address || ''}">
          </div>
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Phone</label>
              <input type="tel" class="input" id="set-phone" value="${settings.phone || ''}">
            </div>
            <div class="form-group">
              <label class="form-label">Email</label>
              <input type="email" class="input" id="set-email" value="${settings.email || ''}">
            </div>
          </div>
          <button class="btn btn-primary w-full" onclick="saveOrgSettings()">Save Changes</button>
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:var(--space-5);">
        <!-- Appearance -->
        <div class="card">
          <div class="card-header"><div class="card-title">Appearance</div></div>
          <div class="card-body">
            <div class="form-group">
              <label class="form-label">Theme</label>
              <div style="display:flex;gap:var(--space-2);">
                <button class="btn ${document.documentElement.dataset.theme === 'light' ? 'btn-primary' : 'btn-secondary'}" onclick="app.toggleTheme()">Light</button>
                <button class="btn ${document.documentElement.dataset.theme === 'dark' ? 'btn-primary' : 'btn-secondary'}" onclick="app.toggleTheme()">Dark</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Branches -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">Branches</div>
          </div>
          <div class="card-body">
            ${branches.map(b => `
              <div style="display:flex;align-items:center;justify-content:space-between;padding:var(--space-3) 0;border-bottom:1px solid var(--color-border-secondary);">
                <div>
                  <div style="font-weight:var(--fw-medium);">${b.name}</div>
                  <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);">${b.city} · ${b.phone}</div>
                </div>
                <span class="badge badge-success"><span class="badge-dot"></span>${b.status}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Danger Zone -->
        <div class="card" style="border-color:var(--sf-error-200);">
          <div class="card-header"><div class="card-title" style="color:var(--sf-error-600);">Danger Zone</div></div>
          <div class="card-body">
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <div>
                <div style="font-size:var(--text-sm);font-weight:var(--fw-medium);">Reset Demo Data</div>
                <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);">Clear all data and reload fresh demo</div>
              </div>
              <button class="btn btn-danger" onclick="app.resetApp()">Reset</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  window.saveOrgSettings = function() {
    store.updateSettings({
      orgName: document.getElementById('set-org-name')?.value?.trim(),
      address: document.getElementById('set-address')?.value?.trim(),
      phone: document.getElementById('set-phone')?.value?.trim(),
      email: document.getElementById('set-email')?.value?.trim(),
    });
    toast.show('Settings saved!', 'success');
  };
}
