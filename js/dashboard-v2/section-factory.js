export function createSection({ title = '', cards = [] } = {}) {
  const section = document.createElement('section');
  section.className = 'dashboard-section';

  const header = document.createElement('header');
  header.className = 'dashboard-section__header';
  header.innerHTML = `
    <h2>${escapeHtml(title)}</h2>
  `;

  const grid = document.createElement('div');
  grid.className = 'dashboard-section__grid';
  cards.forEach((card) => grid.appendChild(card));

  section.append(header, grid);
  return section;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
