export function renderDashboardV2(contract = {}, mount = null) {
  if (!mount) return;
  mount.innerHTML = '';
  mount.appendChild(createEmptyState('Dashboard v2 listo para conectar al contrato.'));
}

function createEmptyState(message) {
  const shell = document.createElement('section');
  shell.className = 'dashboard-v2 dashboard-v2--empty';
  shell.innerHTML = `
    <div class="dashboard-v2__empty-card">
      <p class="dashboard-v2__eyebrow">Dashboard v2</p>
      <h3>Infraestructura preparada</h3>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
  return shell;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
