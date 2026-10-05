export function renderDashboard(contract = {}, mount = null) {
  if (!mount) return;

  mount.innerHTML = '';

  const card = document.createElement('article');
  card.className = 'card';
  card.innerHTML = `
    <header class="card__header">
      <p class="card__eyebrow">Executive Summary</p>
      <h2 class="card__title">Placeholder</h2>
    </header>
    <div class="card__body">
      <p class="card__text">Contracto pendiente de conexión.</p>
    </div>
  `;

  mount.appendChild(card);
}
