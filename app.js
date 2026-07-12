/* app.js — hash router + init */

function updateSyncIndicator(state) {
  const ind = document.getElementById('syncIndicator');
  const text = document.getElementById('syncText');
  if (!ind) return;
  if (state === 'saving') { text.textContent = 'Saving…'; ind.classList.remove('offline'); }
  else if (state === 'saved') { text.textContent = 'Saved locally'; ind.classList.remove('offline'); }
  else if (state === 'offline') { text.textContent = 'Offline — saved locally'; ind.classList.add('offline'); }
}

function setActiveNav(route) {
  document.querySelectorAll('.sidenav a').forEach(a => {
    a.classList.toggle('active', a.dataset.route === route);
  });
}

async function router() {
  const view = document.getElementById('view');
  const hash = location.hash.replace(/^#\//, '') || 'dashboard';
  const parts = hash.split('/');
  const route = parts[0];

  document.getElementById('sideNav').classList.remove('open');

  try {
    if (route === 'dashboard' || route === '') {
      setActiveNav('dashboard'); await renderDashboard(view);
    } else if (route === 'new') {
      setActiveNav('new'); await renderTrialForm(view, parts[1] || null);
    } else if (route === 'trials' && parts[1]) {
      setActiveNav('trials'); await renderTrialViewer(view, parts[1]);
    } else if (route === 'trials') {
      setActiveNav('trials'); await renderTrialsList(view);
    } else if (route === 'patterns') {
      setActiveNav('patterns'); await renderPatterns(view);
    } else if (route === 'principles') {
      setActiveNav('principles'); await renderPrinciples(view);
    } else if (route === 'ecosystem') {
      setActiveNav('ecosystem'); await renderEcosystem(view);
    } else if (route === 'scorecard') {
      setActiveNav('scorecard'); await renderScorecard(view);
    } else if (route === 'settings') {
      setActiveNav('settings'); await renderSettings(view);
    } else {
      setActiveNav('dashboard'); await renderDashboard(view);
    }
  } catch (err) {
    console.error(err);
    view.innerHTML = `<div class="empty"><div class="big">⚠️</div>Something went wrong rendering this screen.<br><span style="font-size:11px;color:var(--text-faint)">${err.message}</span></div>`;
  }
  view.focus();
}

window.addEventListener('hashchange', router);
window.addEventListener('DOMContentLoaded', () => {
  router();
  updateSyncIndicator(navigator.onLine ? 'saved' : 'offline');
  window.addEventListener('online', () => updateSyncIndicator('saved'));
  window.addEventListener('offline', () => updateSyncIndicator('offline'));

  document.getElementById('navToggle').addEventListener('click', () => {
    document.getElementById('sideNav').classList.toggle('open');
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
});
