const CORE_MODULES = ['./bootstrap.js?v=74', './pwa-reset.js?v=74', './app-v2.js?v=74', './composition-ia.js?v=74'];
const OPTIONAL_MODULES = ['./picker-a11y-fix.js?v=74'];

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
  root.style.cssText = [
    'position:fixed',
    'inset:0',
    'z-index:99999',
    'display:none',
    'align-items:center',
    'justify-content:center',
    'padding:24px',
    'background:rgba(2,6,23,.92)',
    'color:#e2e8f0',
    'font:14px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif',
  ].join(';');

  root.innerHTML = `
    <div style="max-width:760px;width:100%;background:#0f172a;border:1px solid rgba(148,163,184,.28);border-radius:16px;padding:20px 22px;box-shadow:0 20px 60px rgba(0,0,0,.35);">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;">
        <div>
          <p style="margin:0 0 8px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#94a3b8;">Rift Architect</p>
          <h2 style="margin:0 0 10px;font-size:20px;line-height:1.2;color:#f8fafc;">No se pudo arrancar la app</h2>
          <p style="margin:0 0 14px;color:#cbd5e1;">Hay un fallo de carga en alguno de los módulos imprescindibles del proyecto.</p>
        </div>
        <button type="button" data-close style="border:0;border-radius:10px;background:#1e293b;color:#e2e8f0;padding:8px 12px;cursor:pointer;">Cerrar</button>
      </div>
      <pre data-details style="margin:0;white-space:pre-wrap;word-break:break-word;background:#020617;border:1px solid rgba(148,163,184,.2);border-radius:12px;padding:14px;color:#e2e8f0;min-height:72px;"></pre>
      <p style="margin:14px 0 0;color:#94a3b8;font-size:12px;">Si lo que ves en consola apunta a <code>contentscript.js</code>, normalmente viene de una extensión del navegador y no del repositorio.</p>
    </div>
  `;

  root.querySelector('[data-close]')?.addEventListener('click', () => {
    root.style.display = 'none';
  });

  document.body.appendChild(root);
  return root;
}

function showBootError(error, modulePath = '') {
  const normalized = error instanceof Error ? error : new Error(String(error || 'Error desconocido'));
  const root = ensureOverlayRoot();
  const details = root.querySelector('[data-details]');
  if (details) {
    const lines = [
      modulePath ? `Módulo: ${modulePath}` : null,
      normalized.name ? `Tipo: ${normalized.name}` : null,
      normalized.message ? `Mensaje: ${normalized.message}` : null,
      normalized.stack ? `Stack:\n${normalized.stack}` : null,
    ].filter(Boolean);
    details.textContent = lines.join('\n\n');
  }
  root.style.display = 'flex';
}

async function importModuleWithRetry(modulePath, attempts = 2, delayMs = 450) {
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await import(modulePath);
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise((resolve) => window.setTimeout(resolve, delayMs * attempt));
      }
    }
  }

  throw lastError;
}

window.addEventListener('error', (event) => {
  if (isLikelyExternalError(event.error || event.message || event)) return;
  showBootError(event.error || event.message || 'Error no controlado');
});

window.addEventListener('unhandledrejection', (event) => {
  if (isLikelyExternalError(event.reason)) return;
  showBootError(event.reason || 'Promise rechazada sin tratar');
});

(async () => {
  for (const modulePath of CORE_MODULES) {
    try {
      await importModuleWithRetry(modulePath);
    } catch (error) {
      console.error(`[Rift Architect] Failed to load required module ${modulePath}`, error);
      showBootError(error, modulePath);
      return;
    }
  }

  for (const modulePath of OPTIONAL_MODULES) {
    try {
      await importModuleWithRetry(modulePath);
    } catch (error) {
      console.warn(`[Rift Architect] Optional module failed to load ${modulePath}`, error);
    }
  }
})();
