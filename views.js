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
  const trials = await ELOSDB.getAll('trials');
  const patterns = await ELOSDB.getAll('patterns');
  const principles = await ELOSDB.getAll('principles');
  const drafts = trials.filter(t => t.status === 'draft');
  const submitted = trials.filter(t => t.status === 'submitted');
  const sc = computeScorecard(trials);
  const recent = [...trials].sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || '')).slice(0, 5);

  view.innerHTML = `
    <h1>Dashboard</h1>
    <p class="subtitle">Field intelligence operating view — BSTM 100 Trials & ELOS</p>

    <div class="grid">
      <div class="card"><div class="num">${trials.length}</div><div class="label">Total Trials</div></div>
      <div class="card"><div class="num">${submitted.length}</div><div class="label">Submitted</div></div>
      <div class="card"><div class="num">${drafts.length}</div><div class="label">Draft Trials</div></div>
      <div class="card"><div class="num">${patterns.length}</div><div class="label">Active Archetypes</div></div>
      <div class="card"><div class="num">${principles.length}</div><div class="label">Active Principles</div></div>
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
            <tr onclick="location.hash='#/trials/${t.id}'" style="cursor:pointer">
              <td>${t.trial_id || '(draft)'}</td>
              <td>${t.business_name || '—'}</td>
              <td>${t.status === 'submitted' ? '<span class="badge badge-good">Submitted</span>' : '<span class="badge badge-outline">Draft</span>'}</td>
              <td>${outcomeBadge(t.trial_outcome)}</td>
              <td>${(t.updated_at || '').slice(0, 10)}</td>
            </tr>`).join('')}
        </tbody>
      </table>` : `<div class="empty"><div class="big">🌱</div>No trials yet. Start your first field visit.</div>`}
  `;
}

/* ---------------- Trials Archive + Viewer ---------------- */
async function renderTrialsList(view) {
  const trials = (await ELOSDB.getAll('trials')).sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''));

  view.innerHTML = `
    <h1>Trial Archive</h1>
    <p class="subtitle">${trials.length} trial${trials.length === 1 ? '' : 's'} recorded</p>
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
              <td onclick="location.hash='#/trials/${t.id}'" style="cursor:pointer">${t.trial_id || '(draft)'}</td>
              <td onclick="location.hash='#/trials/${t.id}'" style="cursor:pointer">${t.business_name || '—'}</td>
              <td>${t.category || '—'}</td>
              <td>${outcomeBadge(t.trial_outcome)}</td>
              <td>${t.overall_score ? t.overall_score + '/10' : '—'}</td>
              <td>${t.status === 'submitted' ? '<span class="badge badge-good">Submitted</span>' : '<span class="badge badge-outline">Draft</span>'}</td>
              <td><button class="btn btn-sm" onclick="location.hash='#/new/${t.id}'">Edit</button></td>
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

/* ---------------- Patterns (archetypes) ---------------- */
async function renderPatterns(view) {
  const items = await ELOSDB.getAll('patterns');
  view.innerHTML = `
    <h1>Pattern Library</h1>
    <p class="subtitle">Recurring archetypes surfaced across trials</p>
    <div class="btn-row"><button class="btn btn-gold" id="addPattern">➕ New Pattern</button></div>
    <div id="patternList"></div>
  `;
  document.getElementById('addPattern').onclick = () => openPatternEditor(null);
  const wrap = document.getElementById('patternList');
  if (!items.length) { wrap.innerHTML = `<div class="empty"><div class="big">🧩</div>No patterns recorded yet.</div>`; return; }
  wrap.innerHTML = items.map(p => `
    <div class="panel">
      <h3 style="margin-top:0">${p.name}</h3>
      <p style="color:var(--text-dim);font-size:13.5px">${p.definition || ''}</p>
      <div style="font-size:12.5px;color:var(--text-faint)">Linked trials: ${p.linked_trials || '—'} · Status: ${p.status || 'Active'}</div>
      <div class="btn-row"><button class="btn btn-sm" data-id="${p.id}">Edit</button></div>
    </div>`).join('');
  wrap.querySelectorAll('button[data-id]').forEach(b => b.onclick = () => openPatternEditor(b.dataset.id));
}

async function openPatternEditor(id) {
  const item = id ? await ELOSDB.get('patterns', id) : { id: ELOSDB.uid('pattern'), name: '', definition: '', linked_trials: '', evidence_summary: '', interventions: '', status: 'Active' };
  const name = prompt('Pattern name', item.name);
  if (name === null) return;
  item.name = name;
  item.definition = prompt('Definition', item.definition) ?? item.definition;
  item.linked_trials = prompt('Linked trial IDs (comma-separated)', item.linked_trials) ?? item.linked_trials;
  item.status = prompt('Status (Active/Historical)', item.status || 'Active') ?? item.status;
  await ELOSDB.put('patterns', item);
  toast('Pattern saved');
  renderPatterns(document.getElementById('view'));
}

/* ---------------- Principles ---------------- */
async function renderPrinciples(view) {
  const items = await ELOSDB.getAll('principles');
  view.innerHTML = `
    <h1>Principles Library</h1>
    <p class="subtitle">Organizational principles derived from trial evidence</p>
    <div class="btn-row"><button class="btn btn-gold" id="addPrinciple">➕ New Principle</button></div>
    <div id="principleList"></div>
  `;
  document.getElementById('addPrinciple').onclick = () => openPrincipleEditor(null);
  const wrap = document.getElementById('principleList');
  if (!items.length) { wrap.innerHTML = `<div class="empty"><div class="big">📜</div>No principles recorded yet.</div>`; return; }
  wrap.innerHTML = items.map(p => `
    <div class="panel">
      <h3 style="margin-top:0">${p.statement}</h3>
      <div style="font-size:12.5px;color:var(--text-faint)">Status: ${p.status || 'Experimental'} · Linked trials: ${p.linked_trials || '—'}</div>
      <div class="btn-row"><button class="btn btn-sm" data-id="${p.id}">Edit</button></div>
    </div>`).join('');
  wrap.querySelectorAll('button[data-id]').forEach(b => b.onclick = () => openPrincipleEditor(b.dataset.id));
}

async function openPrincipleEditor(id) {
  const item = id ? await ELOSDB.get('principles', id) : { id: ELOSDB.uid('principle'), statement: '', status: 'Experimental', linked_trials: '', boundary_conditions: '', review_trigger: '' };
  const statement = prompt('Principle statement', item.statement);
  if (statement === null) return;
  item.statement = statement;
  item.status = prompt('Status (Experimental/Active/Historical/Rejected)', item.status || 'Experimental') ?? item.status;
  item.linked_trials = prompt('Linked trial IDs (comma-separated)', item.linked_trials) ?? item.linked_trials;
  await ELOSDB.put('principles', item);
  toast('Principle saved');
  renderPrinciples(document.getElementById('view'));
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

/* ---------------- Scorecard ---------------- */
async function renderScorecard(view) {
  const trials = await ELOSDB.getAll('trials');
  const sc = computeScorecard(trials);
  view.innerHTML = `
    <h1>Scorecard</h1>
    <p class="subtitle">Learning metrics computed from ${sc.total} submitted trial${sc.total === 1 ? '' : 's'}</p>
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
