function escSafe(s) {
  if (typeof esc === 'function') return esc(s);
  return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

async function renderObservations(view) {
  view.innerHTML = `<h1>Observations Inbox</h1><p class="subtitle">Loading...</p>`;
  try {
    const res = await fetch('/api/list-observations');
    const data = await res.json();
    if (!data.observations || !data.observations.length) {
      view.innerHTML = `<h1>Observations Inbox</h1><p class="subtitle">First proof ELOS is receiving real ecosystem data.</p><div class="empty">No observations received yet.</div>`;
      return;
    }
    const rows = data.observations.map(o => `
      <tr>
        <td>${escSafe(o.source)}</td>
        <td>${escSafe(o._receivedAt || o.timestamp || '')}</td>
        <td>${o.healthScore ?? '-'}</td>
        <td>${escSafe(o.business?.industry || '-')}</td>
        <td>${escSafe((o.weaknesses || []).join(', ') || '-')}</td>
      </tr>`).join('');
    view.innerHTML = `
      <h1>Observations Inbox</h1>
      <p class="subtitle">${data.total} total observation${data.total === 1 ? '' : 's'} received</p>
      <div class="panel">
        <table style="width:100%;border-collapse:collapse">
          <thead><tr><th>Source</th><th>Received</th><th>Score</th><th>Industry</th><th>Weaknesses</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  } catch (err) {
    view.innerHTML = `<h1>Observations Inbox</h1><div class="empty">Error loading: ${escSafe(String(err))}</div>`;
  }
}
