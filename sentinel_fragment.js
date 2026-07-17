
/* ---------------- Sentinel (in-app health check) ---------------- */
async function renderSentinel(view) {
  view.innerHTML = `<h1>Sentinel</h1><p class="subtitle">Running health check…</p>`;

  const trials = await ELOSDB.getAll('trials');
  const patterns = await ELOSDB.getAll('patterns');
  const principles = await ELOSDB.getAll('principles');
  const submitted = trials.filter(t => t.status === 'submitted');

  let trialPass = 0, trialIssues = [];
  submitted.forEach(t => {
    const errs = typeof validateTrial === 'function' ? validateTrial(t) : [];
    if (errs.length === 0) trialPass++;
    else trialIssues.push({ id: t.trial_id || t.id, business: t.business_name, errs });
  });
  const trialScore = submitted.length ? Math.round((trialPass / submitted.length) * 100) : 100;

  let patternIssues = [];
  patterns.forEach(p => {
    const missing = [];
    if (!p.definition) missing.push('definition');
    if (!p.linked_trials) missing.push('linked trials');
    if (missing.length) patternIssues.push({ name: p.name, missing });
  });
  const patternScore = patterns.length ? Math.round(((patterns.length - patternIssues.length) / patterns.length) * 100) : 100;

  let principleIssues = [];
  principles.forEach(p => {
    const missing = [];
    if (!p.statement) missing.push('statement');
    if (!p.status) missing.push('status');
    if (missing.length) principleIssues.push({ statement: p.statement || '(untitled)', missing });
  });
  const principleScore = principles.length ? Math.round(((principles.length - principleIssues.length) / principles.length) * 100) : 100;

  const swActive = 'serviceWorker' in navigator && !!navigator.serviceWorker.controller;
  const pwaScore = swActive ? 100 : ('serviceWorker' in navigator ? 60 : 0);

  let storageLine = 'Not available in this browser';
  if (navigator.storage && navigator.storage.estimate) {
    try {
      const est = await navigator.storage.estimate();
      const usedMB = (est.usage / (1024 * 1024)).toFixed(1);
      const quotaMB = (est.quota / (1024 * 1024)).toFixed(0);
      storageLine = `${usedMB} MB used of ~${quotaMB} MB available`;
    } catch (e) {}
  }

  const weights = { trials: 0.4, patterns: 0.2, principles: 0.2, pwa: 0.2 };
  const overall = Math.round(
    trialScore * weights.trials + patternScore * weights.patterns +
    principleScore * weights.principles + pwaScore * weights.pwa
  );

  function badge(score) {
    if (score >= 90) return '<span class="badge badge-good">Healthy</span>';
    if (score >= 70) return '<span class="badge badge-fair">Warning</span>';
    return '<span class="badge badge-poor">Needs Attention</span>';
  }

  view.innerHTML = `
    <h1>Sentinel</h1>
    <p class="subtitle">In-app health check — audits live data on this device. For a full repository/Git audit, run <code>bash tools/esa_audit.sh</code> in Termux.</p>

    <div class="grid">
      <div class="card"><div class="num">${overall}%</div><div class="label">Overall Health</div></div>
      <div class="card"><div class="num">${trialScore}%</div><div class="label">Trial Integrity</div></div>
      <div class="card"><div class="num">${patternScore}%</div><div class="label">Pattern Integrity</div></div>
      <div class="card"><div class="num">${principleScore}%</div><div class="label">Principle Integrity</div></div>
      <div class="card"><div class="num">${pwaScore}%</div><div class="label">Offline / PWA</div></div>
    </div>

    <div class="panel">
      <h3 style="margin-top:0">Storage</h3>
      <p style="font-size:13px;color:var(--text-dim)">${storageLine}</p>
    </div>

    <h2>Trials ${badge(trialScore)}</h2>
    ${trialIssues.length ? `
      <table>
        <thead><tr><th>Trial</th><th>Business</th><th>Issues</th></tr></thead>
        <tbody>
          ${trialIssues.map(i => `<tr><td>${i.id}</td><td>${i.business || '—'}</td><td style="font-size:12px;color:var(--text-dim)">${i.errs.join('; ')}</td></tr>`).join('')}
        </tbody>
      </table>` : `<div class="panel">All submitted trials pass validation.</div>`}

    <h2>Patterns ${badge(patternScore)}</h2>
    ${patternIssues.length ? `
      <table>
        <thead><tr><th>Pattern</th><th>Missing</th></tr></thead>
        <tbody>${patternIssues.map(i => `<tr><td>${i.name || '(untitled)'}</td><td>${i.missing.join(', ')}</td></tr>`).join('')}</tbody>
      </table>` : `<div class="panel">All patterns complete.</div>`}

    <h2>Principles ${badge(principleScore)}</h2>
    ${principleIssues.length ? `
      <table>
        <thead><tr><th>Principle</th><th>Missing</th></tr></thead>
        <tbody>${principleIssues.map(i => `<tr><td>${i.statement}</td><td>${i.missing.join(', ')}</td></tr>`).join('')}</tbody>
      </table>` : `<div class="panel">All principles complete.</div>`}

    <h2>Offline Readiness ${badge(pwaScore)}</h2>
    <div class="panel">Service worker ${swActive ? 'is active — app will run offline.' : 'is not yet controlling this page. Reload once, or reinstall from the home screen.'}</div>
  `;
}
