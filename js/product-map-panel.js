const PRODUCT_MAP = [
  {
    title: 'Composition Builder',
    badge: 'Entrada',
    detail: 'Selecciona tus 5 campeones y construye la composición sobre la que trabaja todo el motor.',
    items: ['Selector por rol', 'Tarjetas compactas', 'Iconos oficiales', 'Estado temporal'],
  },
  {
    title: 'Core Engine',
    badge: 'Motor',
    detail: 'Convierte la composición en conocimiento estratégico, explicaciones y recomendaciones.',
    items: ['Identity', 'Strength', 'Weakness', 'Tempo', 'Synergy', 'Dependency', 'Coherence', 'Win condition', 'Plan'],
  },
  {
    title: 'Analysis Dashboard',
    badge: 'Salida',
    detail: 'Resume el análisis en bloques claros para leer qué tienes, qué haces bien y qué debes evitar.',
    items: ['Hero card', 'Fortalezas', 'Riesgos', 'Plan', 'Coach', 'Advisor', 'Explicabilidad'],
  },
  {
    title: 'Composition Optimizer',
    badge: 'Swap',
    detail: 'Prueba cambios internos de campeón y mide su impacto sin salir de tu propia composición.',
    items: ['Swap preview', 'Diff estratégico', 'Veredicto', 'Mejora/Empeora'],
  },
];

const FUTURE_MODULES = ['Champion Pool Architect', 'AI Coach'];

init();

function init() {
  const root = document.getElementById('productMap');
  if (!root) return;

  root.innerHTML = `
    <section class="analysis-block analysis-block--hero product-map">
      <div class="product-map__header">
        <div>
          <p class="eyebrow">Estructura visual</p>
          <h3>Composition Architect</h3>
          <p class="analysis-note">La app analiza solo tu composición, explica por qué y te ayuda a optimizarla con swaps internos.</p>
        </div>
        <span class="product-map__badge">Solo tu equipo</span>
      </div>

      <div class="product-map__flow" aria-label="Mapa de módulos de Rift Architect">
        ${PRODUCT_MAP.map((card, index) => renderNode(card, index === 1)).join(renderArrow())}
      </div>

      <section class="product-map__future">
        <p class="eyebrow">Siguientes módulos</p>
        <div class="analysis-chip-list">
          ${FUTURE_MODULES.map((module) => `<span class="analysis-chip product-map__future-chip">${escapeHtml(module)}</span>`).join('')}
        </div>
      </section>
    </section>
  `;
}

function renderNode(card, isCore = false) {
  return `
    <article class="product-map__node ${isCore ? 'product-map__node--core' : ''}">
      <div class="product-map__node-head">
        <span class="product-map__node-badge">${escapeHtml(card.badge)}</span>
        <h4>${escapeHtml(card.title)}</h4>
      </div>
      <p class="product-map__detail">${escapeHtml(card.detail)}</p>
      <div class="product-map__chips">
        ${card.items.map((item) => `<span class="product-map__chip">${escapeHtml(item)}</span>`).join('')}
      </div>
    </article>
  `;
}

function renderArrow() {
  return '<div class="product-map__arrow" aria-hidden="true">→</div>';
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
