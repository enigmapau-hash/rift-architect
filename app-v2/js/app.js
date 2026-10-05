import { renderDashboard } from './renderer/renderer.js';

const contract = {};
const mount = document.getElementById('dashboard-root');

if (mount) {
  renderDashboard(contract, mount);
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./service-worker.js').catch(() => {});
}
