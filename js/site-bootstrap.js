const CORE_MODULES = ['./bootstrap.js?v=102', './pwa-reset.js?v=102', './app-v2.js?v=102', './analysis-failsafe.js?v=102'];
const OPTIONAL_MODULES = ['./picker-a11y-fix.js?v=102'];

function isLikelyExternalError(error) {
  const filename = String(error?.filename || error?.fileName || '').toLowerCase();
  const message = String(error?.message || error || '').toLowerCase();
  return (
    filename.includes('chrome-extension://') ||
    filename.includes('moz-extension://') ||
    filename.includes('contentscript.js') ||
    message.includes('contentscript.js')
  );
}

function ensureOverlayRoot() {
  let root = document.getElementById('boot-error-overlay');
  if (root) return root;

  root = document.createElement('div');
  root.id = 'boot-error-overlay';
  root.hidden = true;
  document.body.appendChild(root);
  return root;
}

function showBootError(error) {
  if (isLikelyExternalError(error)) return;

  const root = ensureOverlayRoot();
  root.hidden = false;
  root.innerHTML = `<div class="boot-error-overlay__card"><strong>Boot error</strong><pre>${String(error?.stack || error?.message || error)}</pre></div>`;
}

async function loadModules(modules) {
  for (const modulePath of modules) {
    await import(modulePath);
  }
}

(async () => {
  try {
    await loadModules(CORE_MODULES);
    await loadModules(OPTIONAL_MODULES);
  } catch (error) {
    console.error(error);
    showBootError(error);
  }
})();