export function createCard({ title = '', subtitle = '', body = '', footer = '' } = {}) {
  const card = document.createElement('article');
  card.className = 'dashboard-card';
  card.innerHTML = `
    <header class="dashboard-card__header">
      <div>
        <p class="dashboard-card__eyebrow">${escapeHtml(subtitle)}</p>
        <h3 class="dashboard-card__title">${escapeHtml(title)}</h3>
      </div>
    </header>
    <div class="dashboard-card__body">${body}</div>
    ${footer ? `<footer class="dashboard-card__footer">${footer}</footer>` : ''}
  `;
  return card;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
