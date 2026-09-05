/* views.js — renders every screen except the New Trial wizard (see trialForm.js) */

function el(html) {
  const d = document.createElement('div');
  d.innerHTML = html.trim();
  return d.firstElementChild;
}

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), 2200);
}

function outcomeBadge(outcome) {
  const map = { Confirmed: 'good', 'Partially Confirmed': 'fair', Inconclusive: 'fair', Rejected: 'poor', Declined: 'poor' };
  const cls = map[outcome] || 'outline';
  return `<span class="badge badge-${cls}">${outcome || 'Draft'}</span>`;
}

/* ---------------- Dashboard ---------------- */
async function renderDashboard(view) {
  const localTrials = await ELOSDB.getAll('trials');
  const drafts = localTrials.filter(t => t.status === 'draft');

  let remoteTrials = [];
  let activeArchetypes = '—', activePrinciples = '—';
  try {
    const [trialsRes, patternsRes, principlesRes] = await Promise.all([
      fetch('/api/trials').then(r => r.json()),
      fetch('/api/patterns').then(r => r.json()),
      fetch('/api/principles').then(r => r.json()),
    ]);
    remoteTrials = trialsRes.trials || [];
    activeArchetypes = (patternsRes.patterns || []).filter(p => p.status === 'ACTIVE').length;
    activePrinciples = (principlesRes.principles || []).filter(p => p.status === 'ACTIVE').length;
  } catch (err) {
    // Offline or API unreachable — dashboard still works with local-only data.
  }

  // Submitted count = confirmed/synced trials in Supabase (the real source of truth),
  // not local status flags — a trial submitted from a DIFFERENT device still counts.
  const submittedCount = remoteTrials.length;
  const totalCount = drafts.length + submittedCount;
  const sc = computeScorecard(localTrials);

  const recentLocal = localTrials.map(t => ({ ...t, _when: t.updated_at || '', _submitted: t.status === 'submitted' }));
  const recentRemote = remoteTrials
    .filter(rt => !localTrials.some(lt => lt.trial_id === rt.trial_id)) // avoid double-counting this device's own synced trials
    .map(rt => ({ business_name: rt.title, trial_id: rt.trial_id, trial_outcome: (rt.data && rt.data.trial_outcome) || null, _when: rt.updated_at || '', _submitted: true, _remote: true }));
  const recent = [...recentLocal, ...recentRemote].sort((a, b) => (b._when || '').localeCompare(a._when || '')).slice(0, 5);

  view.innerHTML = `
    <h1>Dashboard</h1>
    <p class="subtitle">Field intelligence operating view — BSTM 100 Trials & ELOS</p>

    <div class="grid">
      <div class="card"><div class="num">${totalCount}</div><div class="label">Total Trials</div></div>
      <div class="card"><div class="num">${submittedCount}</div><div class="label">Submitted</div></div>
      <div class="card"><div class="num">${drafts.length}</div><div class="label">Draft Trials</div></div>
      <div class="card"><div class="num">${activeArchetypes}</div><div class="label">Active Archetypes</div></div>
      <div class="card"><div class="num">${activePrinciples}</div><div class="label">Active Principles</div></div>
      <div class="card"><div class="num">${sc.predictiveAccuracy.toFixed(0)}%</div><div class="label">Predictive Accuracy</div></div>
    </div>

    <div class="btn-row">
      <a class="btn btn-gold" href="#/new">➕ Start New Trial</a>
      <a class="btn" href="#/trials">📚 View All Trials</a>
      <a class="btn" href="#/scorecard">📊 Full Scorecard</a>
    </div>

    <h2>Recent Activity</h2>
    ${recent.length ? `
      <table>
        <thead><tr><th>Trial</th><th>Business</th><th>Status</th><th>Outcome</th><th>Updated</th></tr></thead>
        <tbody>
          ${recent.map(t => `
            <tr onclick="location.hash='${t._remote ? '#/trials/remote/' + t.trial_id : '#/trials/' + t.id}'" style="cursor:pointer">
              <td>${t.trial_id || '(draft)'}</td>
              <td>${t.business_name || '—'}</td>
              <td>${t._submitted ? '<span class="badge badge-good">Submitted</span>' : '<span class="badge badge-outline">Draft</span>'}</td>
              <td>${outcomeBadge(t.trial_outcome)}</td>
              <td>${(t._when || '').slice(0, 10)}</td>
            </tr>`).join('')}
        </tbody>
      </table>` : `<div class="empty"><div class="big">🌱</div>No trials yet. Start your first field visit.</div>`}
  `;
}

/* ---------------- Trials Archive + Viewer ---------------- */
async function renderTrialsList(view) {
  view.innerHTML = `<h1>Trial Archive</h1><p class="subtitle">Loading…</p>`;

  const localTrials = await ELOSDB.getAll('trials');
  let remoteTrials = [];
  try {
    const res = await fetch('/api/trials').then(r => r.json());
    remoteTrials = res.trials || [];
  } catch (err) {
    // Offline — show local trials only, no error state needed for this page.
  }

  const remoteOnly = remoteTrials
    .filter(rt => !localTrials.some(lt => lt.trial_id === rt.trial_id))
    .map(rt => ({
      id: null,
      trial_id: rt.trial_id,
      business_name: (rt.data && rt.data.business_name) || rt.title,
      category: (rt.data && rt.data.category) || null,
      trial_outcome: (rt.data && rt.data.trial_outcome) || null,
      overall_score: (rt.data && rt.data.overall_score) || null,
      status: 'submitted',
      updated_at: rt.updated_at,
      _remote: true,
    }));

  const trials = [...localTrials, ...remoteOnly].sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''));

  view.innerHTML = `
    <h1>Trial Archive</h1>
    <p class="subtitle">${trials.length} trial${trials.length === 1 ? '' : 's'} recorded — confirmed trials load live from ELOS, drafts stay on this device until submitted</p>
    <div class="filter-row">
      <input type="text" id="fSearch" placeholder="Search business / trial ID…">
      <select id="fOutcome">
        <option value="">All outcomes</option>
        ${TRIAL_OUTCOMES.map(o => `<option>${o}</option>`).join('')}
      </select>
      <select id="fStatus">
        <option value="">All statuses</option>
        <option value="draft">Draft</option>
        <option value="submitted">Submitted</option>
      </select>
    </div>
    <div id="trialsTableWrap"></div>
  `;

  function draw() {
    const q = document.getElementById('fSearch').value.toLowerCase();
    const oc = document.getElementById('fOutcome').value;
    const st = document.getElementById('fStatus').value;
    const filtered = trials.filter(t => {
      if (q && !(`${t.business_name} ${t.trial_id} ${t.category}`.toLowerCase().includes(q))) return false;
      if (oc && t.trial_outcome !== oc) return false;
      if (st && t.status !== st) return false;
      return true;
    });
    const wrap = document.getElementById('trialsTableWrap');
    wrap.innerHTML = filtered.length ? `
      <table>
        <thead><tr><th>Trial</th><th>Business</th><th>Category</th><th>Outcome</th><th>Score</th><th>Status</th><th></th></tr></thead>
        <tbody>
          ${filtered.map(t => `
            <tr>
              <td onclick="location.hash='${t._remote ? '#/trials/remote/' + t.trial_id : '#/trials/' + t.id}'" style="cursor:pointer">${t.trial_id || '(draft)'}</td>
              <td onclick="location.hash='${t._remote ? '#/trials/remote/' + t.trial_id : '#/trials/' + t.id}'" style="cursor:pointer">${t.business_name || '—'}</td>
              <td>${t.category || '—'}</td>
              <td>${outcomeBadge(t.trial_outcome)}</td>
              <td>${t.overall_score ? t.overall_score + '/10' : '—'}</td>
              <td>${t.status === 'submitted' ? '<span class="badge badge-good">Submitted</span>' : '<span class="badge badge-outline">Draft</span>'}</td>
              <td>${t._remote ? '' : `<button class="btn btn-sm" onclick="location.hash='#/new/${t.id}'">Edit</button>`}</td>
            </tr>`).join('')}
        </tbody>
      </table>` : `<div class="empty"><div class="big">🔍</div>No trials match those filters.</div>`;
  }
  ['fSearch', 'fOutcome', 'fStatus'].forEach(id => document.getElementById(id).addEventListener('input', draw));
  draw();
}

async function renderTrialViewer(view, id) {
  const t = await ELOSDB.get('trials', id);
  if (!t) { view.innerHTML = `<div class="empty">Trial not found.</div>`; return; }
  const md = trialToMarkdown(t);

  view.innerHTML = `
    <h1>${t.business_name || 'Untitled Business'}</h1>
    <p class="subtitle">${t.trial_id || '(unassigned ID)'} · ${t.category || ''} · ${t.location || ''} ${outcomeBadge(t.trial_outcome)}</p>
    <div class="btn-row">
      <button class="btn" onclick="location.hash='#/new/${t.id}'">✏️ Edit</button>
      <button class="btn btn-teal" id="dlMd">⬇ Download Markdown</button>
      <button class="btn" id="copyMd">📋 Copy Markdown</button>
      <button class="btn btn-danger" id="delTrial">🗑 Delete</button>
      <a class="btn" href="#/trials">← Back to Archive</a>
    </div>
    <h2>Markdown Export Preview</h2>
    <div class="trial-doc">${md.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))}</div>
  `;
  document.getElementById('dlMd').onclick = () => downloadMarkdown(t);
  document.getElementById('copyMd').onclick = () => { navigator.clipboard.writeText(md); toast('Markdown copied to clipboard'); };
  document.getElementById('delTrial').onclick = async () => {
    if (!confirm(`Delete trial "${t.business_name || t.trial_id}"? This cannot be undone.`)) return;
    await ELOSDB.remove('trials', t.id);
    toast('Trial deleted');
    location.hash = '#/trials';
  };
}

/* Read-only viewer for confirmed trials that live only in ELOS (Supabase),
   e.g. the original 6 field trials — never had a local draft on this device. */
async function renderRemoteTrialViewer(view, trialId) {
  view.innerHTML = `<h1>Trial</h1><p class="subtitle">Loading…</p>`;
  let payload;
  try {
    payload = await fetch('/api/trials').then(r => r.json());
  } catch (err) {
    view.innerHTML = `<h1>Trial</h1><div class="empty"><div class="big">⚠️</div>Couldn't reach the ELOS API.</div>`;
    return;
  }
  const t = (payload.trials || []).find(rt => rt.trial_id === trialId);
  if (!t) { view.innerHTML = `<div class="empty">Trial not found.</div>`; return; }

  view.innerHTML = `
    <h1>${t.title || t.trial_id}</h1>
    <p class="subtitle">${t.trial_id} <span class="badge badge-good">Confirmed in ELOS</span></p>
    <div class="btn-row"><a class="btn" href="#/trials">← Back to Archive</a></div>
    <h2>Field Record</h2>
    <div class="trial-doc">${(t.content_md || '(no content)').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))}</div>
  `;
}

/* ---------------- Patterns (archetypes) ---------------- */
async function renderPatterns(view) {
  view.innerHTML = `<h1>Pattern Library</h1><p class="subtitle">Loading live patterns from the ELOS engine…</p>`;

  let payload;
  try {
    payload = await fetch('/api/patterns').then(r => r.json());
  } catch (err) {
    view.innerHTML = `<h1>Pattern Library</h1><div class="empty"><div class="big">⚠️</div>Couldn't reach the ELOS API.<br><span style="font-size:11px;color:var(--text-faint)">${err.message}</span></div>`;
    return;
  }

  const items = payload.patterns || [];
  const statusBadge = { ACTIVE: 'badge-good', CANDIDATE: 'badge-fair', RETIRED: 'badge-poor' };

  view.innerHTML = `
    <h1>Pattern Library</h1>
    <p class="subtitle">Detected automatically by the ELOS engine from accumulated business data — nothing here is hand-typed. Your role is to review, not author.</p>
    <div id="patternList"></div>
  `;
  const wrap = document.getElementById('patternList');
  if (!items.length) { wrap.innerHTML = `<div class="empty"><div class="big">🧩</div>No patterns detected yet — the engine needs more audited businesses first.</div>`; return; }
  wrap.innerHTML = items.map(p => `
    <div class="panel">
      <h3 style="margin-top:0">${p.name} <span class="badge ${statusBadge[p.status] || 'badge-outline'}">${p.status}</span></h3>
      <p style="color:var(--text-dim);font-size:13.5px">${(p.data && p.data.statement) || p.content_md || ''}</p>
      <div style="font-size:12.5px;color:var(--text-faint)">
        Type: ${p.pattern_type || '—'} · Confidence: ${p.confidence != null ? p.confidence + '%' : '—'}
        ${p.data && p.data.autoGenerated ? ' · <em>engine-generated</em>' : ' · <em>confirmed field trial</em>'}
      </div>
    </div>`).join('');
}

/* ---------------- Principles ---------------- */
async function renderPrinciples(view) {
  view.innerHTML = `<h1>Principles Library</h1><p class="subtitle">Loading live principles from the ELOS engine…</p>`;

  let payload;
  try {
    payload = await fetch('/api/principles').then(r => r.json());
  } catch (err) {
    view.innerHTML = `<h1>Principles Library</h1><div class="empty"><div class="big">⚠️</div>Couldn't reach the ELOS API.<br><span style="font-size:11px;color:var(--text-faint)">${err.message}</span></div>`;
    return;
  }

  const items = payload.principles || [];
  const statusBadge = { ACTIVE: 'badge-good', EXPERIMENTAL: 'badge-fair', REJECTED: 'badge-poor', HISTORICAL: 'badge-outline' };

  view.innerHTML = `
    <h1>Principles Library</h1>
    <p class="subtitle">Confirmed principles came from reviewed field trials. EXPERIMENTAL ones marked "engine-proposed" were auto-drafted from repeated negative outcomes — they need your review, not your authorship.</p>
    <div id="principleList"></div>
  `;
  const wrap = document.getElementById('principleList');
  if (!items.length) { wrap.innerHTML = `<div class="empty"><div class="big">📜</div>No principles yet.</div>`; return; }
  wrap.innerHTML = items.map(p => `
    <div class="panel">
      <h3 style="margin-top:0">${p.name} <span class="badge ${statusBadge[p.status] || 'badge-outline'}">${p.status}</span></h3>
      <p style="color:var(--text-dim);font-size:13.5px;white-space:pre-wrap">${p.content_md || ''}</p>
      ${p.data && p.data.autoGenerated ? '<div style="font-size:12.5px;color:var(--text-faint)"><em>⚡ engine-proposed — needs human review</em></div>' : ''}
    </div>`).join('');
}

/* ---------------- Ecosystem Registry ---------------- */
async function renderEcosystem(view) {
  const overrides = await loadRoomOverrides();
  const trials = await ELOSDB.getAll('trials');
  const layers = [6, 5, 4, 3, 2, 1];
  view.innerHTML = `
    <h1>Ecosystem Registry</h1>
    <p class="subtitle">The 63-room BSTM structure — tap a room to rename it or see linked trials</p>
    ${layers.map(l => `
      <h2>${LAYER_LABELS[l]}</h2>
      <div class="room-grid">
        ${BSTM_ROOMS.filter(r => r.layer === l).map(r => {
          const name = overrides[r.n] || r.name;
          const count = trials.filter(t => (t.ecosystem_rooms || []).includes(r.n)).length;
          return `<span class="room-chip" data-room="${r.n}" title="${count} linked trial(s)">${r.n} — ${name}${count ? ' · ' + count : ''}</span>`;
        }).join('')}
      </div>
    `).join('')}
  `;
  view.querySelectorAll('.room-chip').forEach(chip => {
    chip.onclick = async () => {
      const n = Number(chip.dataset.room);
      const base = BSTM_ROOMS.find(r => r.n === n);
      const current = overrides[n] || base.name;
      const name = prompt(`Rename Room ${n}`, current);
      if (name === null) return;
      overrides[n] = name;
      await saveRoomOverrides(overrides);
      renderEcosystem(view);
    };
  });
}

/* ---------------- Command Center (live Supabase data) ---------------- */
const ARCHETYPE_BADGE = {
  Exposure: "badge-fair",
  Agility: "badge-outline",
  "Multi-System": "badge-poor",
  Liquidity: "badge-good",
  Unclassified: "badge-outline",
};

async function renderIntelligence(view) {
  view.innerHTML = `<h1>Command Center</h1><p class="subtitle">Loading live ecosystem intelligence…</p>`;

  let eco, learning, events;
  try {
    [eco, learning, events] = await Promise.all([
      fetch('/api/ecosystem-intelligence').then(r => r.json()),
      fetch('/api/learning-summary').then(r => r.json()),
      fetch('/api/list-events?limit=15').then(r => r.json()),
    ]);
  } catch (err) {
    view.innerHTML = `<h1>Command Center</h1><div class="empty"><div class="big">⚠️</div>Couldn't reach the live ELOS API.<br><span style="font-size:11px;color:var(--text-faint)">${err.message}</span></div>`;
    return;
  }

  const healthBadge = (score) => score >= 70 ? 'badge-good' : score >= 40 ? 'badge-fair' : 'badge-poor';

  view.innerHTML = `
    <h1>Command Center</h1>
    <p class="subtitle">Live intelligence from the ELOS engine — every number below is queried from Postgres in real time.</p>

    <div class="grid">
      <div class="card"><div class="num">${eco.totalBusinessesProfiled}</div><div class="label">Businesses Profiled</div></div>
      <div class="card"><div class="num">${eco.averageHealthScore}</div><div class="label">Avg Health Score</div></div>
      <div class="card"><div class="num">${eco.averageConfidence}%</div><div class="label">Avg Confidence</div></div>
      <div class="card"><div class="num">${learning.totalOutcomesRecorded}</div><div class="label">Outcomes Recorded</div></div>
    </div>

    <h2>Businesses &amp; Archetypes</h2>
    <table>
      <thead><tr><th>Business</th><th>Health</th><th>Archetype</th><th>Confidence</th></tr></thead>
      <tbody>
        ${eco.businesses.map(b => `
          <tr>
            <td>${b.name}</td>
            <td><span class="badge ${healthBadge(b.healthScore)}">${b.healthScore}</span></td>
            <td><span class="badge ${ARCHETYPE_BADGE[b.archetype] || 'badge-outline'}">${b.archetype || 'Unclassified'}</span></td>
            <td>${b.confidence != null ? b.confidence + '%' : '—'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <h2>Department Demand</h2>
    ${eco.topDepartmentDemand.length ? `
      <table>
        <thead><tr><th>Department</th><th>Businesses Needing It</th></tr></thead>
        <tbody>
          ${eco.topDepartmentDemand.map(d => `<tr><td>${d.name}</td><td>${d.businessesNeedingIt}</td></tr>`).join('')}
        </tbody>
      </table>
    ` : `<div class="empty">No department demand aggregated yet.</div>`}

    <h2>Learning Loop — Acceptance vs. Real Outcomes</h2>
    ${learning.byDepartment.length ? `
      <table>
        <thead><tr><th>Department</th><th>Acceptance Rate</th><th>Outcome Success Rate</th></tr></thead>
        <tbody>
          ${learning.byDepartment.map(d => `
            <tr>
              <td>${d.name}</td>
              <td>${d.acceptanceRate != null ? d.acceptanceRate + '% (' + d.totalDecisions + ')' : '—'}</td>
              <td>${d.outcomeSuccessRate != null ? '<span class="badge ' + healthBadge(d.outcomeSuccessRate) + '">' + d.outcomeSuccessRate + '%</span> (' + d.totalOutcomes + ')' : '—'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : `<div class="empty">No decisions or outcomes recorded yet — use /api/feedback and /api/outcomes to start closing the loop.</div>`}

    <h2>Recent Events</h2>
    ${events.events.length ? `
      <table>
        <thead><tr><th>Type</th><th>Entity</th><th>When</th></tr></thead>
        <tbody>
          ${events.events.map(e => `
            <tr>
              <td>${e.event_type}</td>
              <td>${e.entity_type || '—'}${e.entity_id ? ' · ' + e.entity_id : ''}</td>
              <td>${new Date(e.created_at).toLocaleString()}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : `<div class="empty">No events logged yet.</div>`}
  `;
}

async function renderScorecard(view) {
  const trials = await ELOSDB.getAll('trials');
  const sc = computeScorecard(trials);
  view.innerHTML = `
    <h1>Scorecard</h1>
    <p class="subtitle">Learning metrics computed from ${sc.total} trial${sc.total === 1 ? '' : 's'} submitted from this device — the 6 original confirmed field trials aren't included here yet (their structured scoring data lives only as prose in ELOS, not as the numeric fields this page needs)</p>
    <div class="grid">
      <div class="card"><div class="num">${sc.learningYield.toFixed(1)}%</div><div class="label">Learning Yield</div></div>
      <div class="card"><div class="num">${sc.driftVelocity.toFixed(2)}</div><div class="label">Belief Drift Velocity</div></div>
      <div class="card"><div class="num">${sc.predictiveAccuracy.toFixed(1)}%</div><div class="label">Predictive Accuracy</div></div>
      <div class="card"><div class="num">${sc.uncertaintyRate.toFixed(1)}%</div><div class="label">Uncertainty Rate</div></div>
      <div class="card"><div class="num">${sc.errorDigestionSpeed.toFixed(1)}%</div><div class="label">Error Digestion Speed</div></div>
    </div>
    <div class="panel">
      <h3 style="margin-top:0">How these are calculated</h3>
      <p style="font-size:13px;color:var(--text-dim)">
        <b>Learning Yield</b> — average capability outcomes captured per trial, as a % of the 7 possible outcomes.<br>
        <b>Belief Drift Velocity</b> — average absolute change between initial and final assumption confidence (0–5 scale).<br>
        <b>Predictive Accuracy</b> — % of trials where the predicted bottleneck matched the actual bottleneck.<br>
        <b>Uncertainty Rate</b> — % of trials marked Inconclusive.<br>
        <b>Error Digestion Speed</b> — % of Inconclusive/Rejected/Declined trials with a completed Error Digestion entry.
      </p>
    </div>
  `;
}

/* ---------------- Settings ---------------- */
async function renderSettings(view) {
  view.innerHTML = `
    <h1>Settings</h1>
    <p class="subtitle">Backup, restore, and configure ELOS</p>

    <div class="panel">
      <h3 style="margin-top:0">Backup & Restore</h3>
      <p style="font-size:13px;color:var(--text-dim)">All data is stored locally on this device (IndexedDB). Export a JSON backup regularly, especially before clearing browser data.</p>
      <div class="btn-row">
        <button class="btn btn-teal" id="exportJson">⬇ Export Full Backup (JSON)</button>
        <button class="btn" id="importJsonBtn">⬆ Import Backup</button>
        <input type="file" id="importJson" accept=".json" style="display:none">
      </div>
    </div>

    <div class="panel">
      <h3 style="margin-top:0">Export All Trials as Markdown</h3>
      <p style="font-size:13px;color:var(--text-dim)">Downloads one .md file per submitted trial, matching the ELOS 02_trial_intelligence format — ready to drop into your Git repository.</p>
      <div class="btn-row"><button class="btn btn-gold" id="exportAllMd">⬇ Download All Trial Markdown Files</button></div>
    </div>

    <div class="panel">
      <h3 style="margin-top:0">Danger Zone</h3>
      <div class="btn-row"><button class="btn btn-danger" id="clearAll">🗑 Clear All Local Data</button></div>
    </div>

    <div class="panel">
      <h3 style="margin-top:0">About</h3>
      <p style="font-size:12.5px;color:var(--text-faint)">
        BSTM ELOS — Evolutionary Learning Operating System · v0.1 (no AI) · Runs fully offline · Data never leaves this device unless exported.
      </p>
    </div>
  `;

  document.getElementById('exportJson').onclick = async () => {
    const data = await ELOSDB.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `elos-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); URL.revokeObjectURL(url);
    toast('Backup downloaded');
  };

  document.getElementById('importJsonBtn').onclick = () => document.getElementById('importJson').click();
  document.getElementById('importJson').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    try {
      const data = JSON.parse(text);
      const merge = confirm('Merge with existing data? OK = merge, Cancel = replace everything.');
      await ELOSDB.importAll(data, { merge });
      toast('Backup imported');
      location.hash = '#/dashboard';
    } catch (err) {
      alert('Could not read that file: ' + err.message);
    }
  };

  document.getElementById('exportAllMd').onclick = async () => {
    const trials = (await ELOSDB.getAll('trials')).filter(t => t.status === 'submitted');
    if (!trials.length) { toast('No submitted trials yet'); return; }
    trials.forEach(t => downloadMarkdown(t));
    toast(`Downloaded ${trials.length} markdown file(s)`);
  };

  document.getElementById('clearAll').onclick = async () => {
    if (!confirm('This deletes ALL trials, patterns, and principles stored on this device. Export a backup first. Continue?')) return;
    if (!confirm('Are you absolutely sure? This cannot be undone.')) return;
    await ELOSDB.clearAll();
    toast('All local data cleared');
    location.hash = '#/dashboard';
  };
}

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
