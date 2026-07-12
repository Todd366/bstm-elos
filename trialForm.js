/* trialForm.js — New Trial screen: guided form covering every ELOS section.
   Autosaves as draft on every change; validates on Submit. */

let _trialState = null;
let _autosaveTimer = null;

async function renderTrialForm(view, id) {
  const trials = await ELOSDB.getAll('trials');
  _trialState = id ? await ELOSDB.get('trials', id) : emptyTrial();
  if (!_trialState) { view.innerHTML = `<div class="empty">Trial not found.</div>`; return; }
  if (!_trialState.trial_id) {
    _trialState.trial_id = `BSTM-100T-${String(nextTrialNumber(trials)).padStart(3, '0')}`;
  }

  view.innerHTML = `
    <h1>${id ? 'Edit Trial' : 'New Trial'}</h1>
    <p class="subtitle">${_trialState.trial_id} · autosaves locally as you type</p>

    <div class="steps">
      <a href="#s-id" class="step-pill">Identification</a>
      <a href="#s-audit" class="step-pill">Field Audit</a>
      <a href="#s-conv" class="step-pill">Guided Conversation</a>
      <a href="#s-assume" class="step-pill">Assumptions</a>
      <a href="#s-hyp" class="step-pill">Hypothesis / Experiment</a>
      <a href="#s-evidence" class="step-pill">Raw Evidence</a>
      <a href="#s-interp" class="step-pill">Interpretation / Confidence</a>
      <a href="#s-error" class="step-pill">Error Digestion / Capability</a>
      <a href="#s-eco" class="step-pill">Ecosystem</a>
      <a href="#s-reflect" class="step-pill">Reflection / Score</a>
    </div>

    <form id="trialForm" onsubmit="return false">

      <h2 id="s-id">Trial Identification</h2>
      <div class="panel">
        <div class="field-row">
          <div><label>Trial ID</label><input type="text" name="trial_id" value="${esc(_trialState.trial_id)}"></div>
          <div><label>Title</label><input type="text" name="title" placeholder="e.g. Nados Clothes Store — Mobile Retail" value="${esc(_trialState.title)}"></div>
        </div>
        <div class="field-row">
          <div><label>Business Name</label><input type="text" name="business_name" value="${esc(_trialState.business_name)}"></div>
          <div><label>Category</label><input type="text" name="category" value="${esc(_trialState.category)}"></div>
        </div>
        <div class="field-row">
          <div><label>Location / Area</label><input type="text" name="location" value="${esc(_trialState.location)}"></div>
          <div><label>Contact (optional)</label><input type="text" name="contact" value="${esc(_trialState.contact)}"></div>
        </div>
        <div class="field-row">
          <div><label>Date Initiated</label><input type="date" name="date_initiated" value="${esc(_trialState.date_initiated)}"></div>
          <div><label>Date Concluded</label><input type="date" name="date_concluded" value="${esc(_trialState.date_concluded)}"></div>
        </div>
        <div class="field-row">
          <div><label>GPS (optional)</label><input type="text" name="gps" value="${esc(_trialState.gps)}"></div>
          <div><label>Weather (optional)</label><input type="text" name="weather" value="${esc(_trialState.weather)}"></div>
        </div>
        <div class="field-row">
          <div><label>Department / Room</label><input type="text" name="department_room" value="${esc(_trialState.department_room)}"></div>
          <div><label>Operator</label><input type="text" name="operator" value="${esc(_trialState.operator)}"></div>
        </div>
        <div class="field-row">
          <div><label>Predicted Bottleneck</label>${selectHtml('predicted_bottleneck', BOTTLENECK_TYPES, _trialState.predicted_bottleneck)}</div>
          <div><label>Actual Bottleneck</label>${selectHtml('actual_bottleneck', BOTTLENECK_TYPES, _trialState.actual_bottleneck)}</div>
        </div>
        <label>Trial Outcome</label>${selectHtml('trial_outcome', TRIAL_OUTCOMES, _trialState.trial_outcome)}
        <div class="field-row">
          <div><label>Related Trials</label><input type="text" name="related_trials" value="${esc(_trialState.related_trials)}"></div>
          <div><label>Supersedes</label><input type="text" name="supersedes" value="${esc(_trialState.supersedes)}"></div>
        </div>
        <label>Creates New Questions</label>
        <textarea name="creates_new_questions">${esc(_trialState.creates_new_questions)}</textarea>
      </div>

      <h2 id="s-audit">Field Audit</h2>
      <div class="panel">
        <p class="hint">Observation before interpretation — rate each item, add a one-line proof note.</p>
        <div id="faRows"></div>
        <label style="margin-top:12px">Context</label>
        <div class="hint">Short paragraph summarizing the business environment overall.</div>
        <textarea name="context">${esc(_trialState.context)}</textarea>
      </div>

      <h2 id="s-conv">Guided Conversation</h2>
      <div class="panel">
        ${GUIDED_CONVERSATION_FIELDS.map(f => `
          <label>${f.label}</label>
          <textarea data-gc="${f.key}">${esc(_trialState.guided_conversation[f.key] || '')}</textarea>
        `).join('')}
        <div class="field-row">
          <div><label>Would collaborate with BSTM?</label>${selectHtml('collaboration', ['Yes', 'No', 'Maybe'], _trialState.collaboration)}</div>
          <div><label>Future contact welcomed?</label>${selectHtml('future_contact', ['Yes', 'No'], _trialState.future_contact)}</div>
        </div>
        <label>Follow-up permission given?</label>${selectHtml('follow_up_permission', ['Yes', 'No'], _trialState.follow_up_permission)}
        <label>Key Quotes</label>
        <textarea name="key_quotes">${esc(_trialState.key_quotes)}</textarea>
        <label>Ideas Worth Investigating</label>
        <textarea name="ideas_worth_investigating">${esc(_trialState.ideas_worth_investigating)}</textarea>
        <label>Immediate Action Items</label>
        <textarea name="immediate_action_items">${esc(_trialState.immediate_action_items)}</textarea>
      </div>

      <h2 id="s-assume">Assumption Registry</h2>
      <div class="panel">
        <p class="hint">What did BSTM believe before this trial? Add as many assumptions as needed.</p>
        <div id="assumeList"></div>
        <button type="button" class="btn btn-sm" id="addAssumption">➕ Add Assumption</button>
      </div>

      <h2 id="s-hyp">Hypothesis &amp; Experiment</h2>
      <div class="panel">
        <label>Hypothesis</label>
        <div class="hint">What do we believe will happen? What's the smallest practical test?</div>
        <textarea name="hypothesis">${esc(_trialState.hypothesis)}</textarea>
        <label>Experiment</label>
        <div class="hint">What intervention / field test was actually performed?</div>
        <textarea name="experiment">${esc(_trialState.experiment)}</textarea>
      </div>

      <h2 id="s-evidence">Raw Evidence</h2>
      <div class="panel">
        <label>Raw Evidence (factual result — no interpretation)</label>
        <textarea name="raw_evidence">${esc(_trialState.raw_evidence)}</textarea>
        <label style="margin-top:6px">Attach Evidence</label>
        <div class="upload-zone" id="uploadZone">📎 Tap to add photos / documents (stored on this device)</div>
        <input type="file" id="fileInput" accept="image/*,application/pdf" multiple style="display:none">
        <div class="attach-list" id="attachList"></div>
      </div>

      <h2 id="s-interp">Interpretation &amp; Confidence Update</h2>
      <div class="panel">
        <label>Interpretation</label>
        <div class="hint">What does the evidence suggest? What changed, failed, or was confirmed?</div>
        <textarea name="interpretation">${esc(_trialState.interpretation)}</textarea>
        <div id="confList"></div>
        <button type="button" class="btn btn-sm" id="addConfidence">➕ Add Confidence Update</button>
      </div>

      <h2 id="s-error">Error Digestion &amp; Capability Check</h2>
      <div class="panel">
        <label>Error Digestion</label>
        <div class="hint">What broke? Why was it unexpected? Which assumption failed? Required if outcome is Inconclusive/Rejected/Declined.</div>
        <textarea name="error_digestion">${esc(_trialState.error_digestion)}</textarea>
        <label style="margin-top:10px">Capability Check — did BSTM become stronger because this trial happened?</label>
        <div id="capOptions"></div>
        <label style="margin-top:6px">Capability Notes</label>
        <textarea name="capability_note">${esc(_trialState.capability_note)}</textarea>
      </div>

      <h2 id="s-eco">Ecosystem Mapping</h2>
      <div class="panel">
        <p class="hint">Tap rooms this trial connects to (1–63), then optionally note why.</p>
        <div class="room-grid" id="ecoRooms"></div>
        <div id="ecoNotes"></div>
      </div>

      <h2 id="s-reflect">Reflection &amp; Score</h2>
      <div class="panel">
        <div class="field-row">
          <div><label>Overall Trial Score (1–10)</label><input type="number" min="1" max="10" name="overall_score" value="${esc(_trialState.overall_score)}"></div>
          <div><label>Confidence Level</label>${selectHtml('confidence_level', CONFIDENCE_LEVELS, _trialState.confidence_level)}</div>
        </div>
        <div class="field-row">
          <div><label>Priority Level</label>${selectHtml('priority_level', PRIORITY_LEVELS, _trialState.priority_level)}</div>
          <div><label>Follow-up Date</label><input type="date" name="follow_up_date" value="${esc(_trialState.follow_up_date)}"></div>
        </div>
        <label>Recommended Next Action</label>
        <textarea name="recommended_next_action">${esc(_trialState.recommended_next_action)}</textarea>
        <label>Biggest Insight (one sentence)</label>
        <input type="text" name="biggest_insight" value="${esc(_trialState.biggest_insight)}">
        <label>Personal Reflection</label>
        <textarea name="personal_reflection">${esc(_trialState.personal_reflection)}</textarea>
      </div>

      <div class="btn-row" style="margin-bottom:60px">
        <button type="button" class="btn" id="saveDraft">💾 Save Draft</button>
        <button type="button" class="btn btn-gold" id="submitTrial">✅ Validate &amp; Submit</button>
        <button type="button" class="btn btn-teal" id="previewMd">👁 Preview Markdown</button>
        <a class="btn" href="#/trials">Cancel</a>
      </div>
    </form>
  `;

  renderFieldAudit();
  renderAssumptions();
  renderConfidenceUpdates();
  renderCapabilityOptions();
  renderEcosystemRooms();
  renderAttachments();
  bindFormEvents(view);
}

function esc(v) { return (v === undefined || v === null) ? '' : String(v).replace(/"/g, '&quot;'); }

function selectHtml(name, options, current) {
  return `<select name="${name}"><option value="">—</option>${options.map(o => `<option value="${o}" ${o === current ? 'selected' : ''}>${o}</option>`).join('')}</select>`;
}

function renderFieldAudit() {
  const wrap = document.getElementById('faRows');
  wrap.innerHTML = _trialState.field_audit.map((item, i) => `
    <div class="fa-row">
      <div class="fa-label">${item.label}</div>
      <div class="fa-rate">
        ${['Good', 'Fair', 'Poor'].map(r => `<label><input type="radio" name="fa_rate_${i}" value="${r}" ${item.rating === r ? 'checked' : ''}> ${r[0]}</label>`).join('')}
      </div>
      <input type="text" class="fa-note" data-fa-note="${i}" placeholder="One line of proof / note" value="${esc(item.note)}">
    </div>
  `).join('');
  wrap.querySelectorAll('input[type=radio]').forEach(r => r.addEventListener('change', e => {
    const i = Number(e.target.name.replace('fa_rate_', ''));
    _trialState.field_audit[i].rating = e.target.value;
    scheduleAutosave();
  }));
  wrap.querySelectorAll('[data-fa-note]').forEach(inp => inp.addEventListener('input', e => {
    _trialState.field_audit[Number(e.target.dataset.faNote)].note = e.target.value;
    scheduleAutosave();
  }));
}

function renderAssumptions() {
  const wrap = document.getElementById('assumeList');
  wrap.innerHTML = _trialState.assumptions.map((a, i) => `
    <div class="repeat-block">
      ${_trialState.assumptions.length > 1 ? `<button type="button" class="repeat-remove" data-remove="${i}">✕</button>` : ''}
      <label>Assumption</label>
      <textarea data-assume-text="${i}">${esc(a.text)}</textarea>
      <label>Initial Confidence (1–5)</label>
      <input type="number" min="1" max="5" data-assume-conf="${i}" value="${esc(a.initial_confidence)}">
    </div>
  `).join('');
  wrap.querySelectorAll('[data-assume-text]').forEach(t => t.addEventListener('input', e => {
    _trialState.assumptions[Number(e.target.dataset.assumeText)].text = e.target.value; scheduleAutosave();
  }));
  wrap.querySelectorAll('[data-assume-conf]').forEach(t => t.addEventListener('input', e => {
    _trialState.assumptions[Number(e.target.dataset.assumeConf)].initial_confidence = Number(e.target.value); scheduleAutosave();
  }));
  wrap.querySelectorAll('[data-remove]').forEach(b => b.addEventListener('click', e => {
    _trialState.assumptions.splice(Number(e.target.dataset.remove), 1); renderAssumptions(); scheduleAutosave();
  }));
}

function renderConfidenceUpdates() {
  const wrap = document.getElementById('confList');
  wrap.innerHTML = _trialState.confidence_updates.map((c, i) => `
    <div class="repeat-block">
      ${_trialState.confidence_updates.length > 1 ? `<button type="button" class="repeat-remove" data-cremove="${i}">✕</button>` : ''}
      <div class="field-row">
        <div><label>Initial (1–5)</label><input type="number" min="1" max="5" data-conf-init="${i}" value="${esc(c.initial)}"></div>
        <div><label>Final (1–5)</label><input type="number" min="1" max="5" data-conf-final="${i}" value="${esc(c.final)}"></div>
      </div>
      <label>Reason for Change</label>
      <textarea data-conf-reason="${i}">${esc(c.reason)}</textarea>
    </div>
  `).join('');
  wrap.querySelectorAll('[data-conf-init]').forEach(t => t.addEventListener('input', e => { _trialState.confidence_updates[Number(e.target.dataset.confInit)].initial = Number(e.target.value); scheduleAutosave(); }));
  wrap.querySelectorAll('[data-conf-final]').forEach(t => t.addEventListener('input', e => { _trialState.confidence_updates[Number(e.target.dataset.confFinal)].final = Number(e.target.value); scheduleAutosave(); }));
  wrap.querySelectorAll('[data-conf-reason]').forEach(t => t.addEventListener('input', e => { _trialState.confidence_updates[Number(e.target.dataset.confReason)].reason = e.target.value; scheduleAutosave(); }));
  wrap.querySelectorAll('[data-cremove]').forEach(b => b.addEventListener('click', e => { _trialState.confidence_updates.splice(Number(e.target.dataset.cremove), 1); renderConfidenceUpdates(); scheduleAutosave(); }));
}

function renderCapabilityOptions() {
  const wrap = document.getElementById('capOptions');
  wrap.innerHTML = CAPABILITY_OPTIONS.map(opt => `
    <div class="checkline">
      <input type="checkbox" data-cap="${opt}" ${_trialState.capability_check.includes(opt) ? 'checked' : ''}>
      <span>${opt}</span>
    </div>
  `).join('');
  wrap.querySelectorAll('[data-cap]').forEach(cb => cb.addEventListener('change', e => {
    const opt = e.target.dataset.cap;
    if (e.target.checked) { if (!_trialState.capability_check.includes(opt)) _trialState.capability_check.push(opt); }
    else { _trialState.capability_check = _trialState.capability_check.filter(x => x !== opt); }
    scheduleAutosave();
  }));
}

function renderEcosystemRooms() {
  const wrap = document.getElementById('ecoRooms');
  wrap.innerHTML = BSTM_ROOMS.map(r => `<span class="room-chip ${_trialState.ecosystem_rooms.includes(r.n) ? 'selected' : ''}" data-room="${r.n}">${r.n}</span>`).join('');
  wrap.querySelectorAll('.room-chip').forEach(chip => chip.addEventListener('click', () => {
    const n = Number(chip.dataset.room);
    const idx = _trialState.ecosystem_rooms.indexOf(n);
    if (idx >= 0) _trialState.ecosystem_rooms.splice(idx, 1); else _trialState.ecosystem_rooms.push(n);
    chip.classList.toggle('selected');
    renderEcosystemNotes();
    scheduleAutosave();
  }));
  renderEcosystemNotes();
}

function renderEcosystemNotes() {
  const wrap = document.getElementById('ecoNotes');
  const rooms = [..._trialState.ecosystem_rooms].sort((a, b) => a - b);
  wrap.innerHTML = rooms.map(n => `
    <div style="margin-top:8px">
      <label>Why relevant — Room ${roomLabel(n)}</label>
      <input type="text" data-eco-note="${n}" value="${esc(_trialState.ecosystem_notes[n] || '')}">
    </div>
  `).join('');
  wrap.querySelectorAll('[data-eco-note]').forEach(inp => inp.addEventListener('input', e => {
    _trialState.ecosystem_notes[Number(e.target.dataset.ecoNote)] = e.target.value;
    scheduleAutosave();
  }));
}

function renderAttachments() {
  const wrap = document.getElementById('attachList');
  wrap.innerHTML = '';
  _trialState.attachments.forEach(async (attId) => {
    const att = await ELOSDB.get('attachments', attId);
    if (!att) return;
    const item = document.createElement('div');
    item.className = 'attach-item';
    if (att.type && att.type.startsWith('image/')) {
      item.innerHTML = `<img src="${att.data}"><div>${att.name.slice(0, 12)}</div><button type="button" class="btn btn-sm" data-att-remove="${attId}" style="margin-top:2px">✕</button>`;
    } else {
      item.innerHTML = `<div class="a-file">📄</div><div>${att.name.slice(0, 12)}</div><button type="button" class="btn btn-sm" data-att-remove="${attId}" style="margin-top:2px">✕</button>`;
    }
    wrap.appendChild(item);
    item.querySelector('[data-att-remove]').addEventListener('click', async () => {
      _trialState.attachments = _trialState.attachments.filter(x => x !== attId);
      await ELOSDB.remove('attachments', attId);
      renderAttachments();
      scheduleAutosave();
    });
  });
}

function bindFormEvents(view) {
  const form = document.getElementById('trialForm');

  // simple text/select/date/number fields bound by name= (radios are handled separately in renderFieldAudit)
  form.querySelectorAll('input[name]:not([type=radio]), textarea[name], select[name]').forEach(f => {
    f.addEventListener('input', () => { _trialState[f.name] = f.value; scheduleAutosave(); });
    f.addEventListener('change', () => { _trialState[f.name] = f.value; scheduleAutosave(); });
  });

  form.querySelectorAll('[data-gc]').forEach(t => t.addEventListener('input', e => {
    _trialState.guided_conversation[e.target.dataset.gc] = e.target.value; scheduleAutosave();
  }));

  document.getElementById('addAssumption').onclick = () => {
    _trialState.assumptions.push({ text: '', initial_confidence: 3 });
    renderAssumptions(); scheduleAutosave();
  };
  document.getElementById('addConfidence').onclick = () => {
    _trialState.confidence_updates.push({ initial: 3, final: 3, reason: '' });
    renderConfidenceUpdates(); scheduleAutosave();
  };

  const uploadZone = document.getElementById('uploadZone');
  const fileInput = document.getElementById('fileInput');
  uploadZone.onclick = () => fileInput.click();
  fileInput.onchange = async (e) => {
    for (const file of e.target.files) {
      const dataUrl = await fileToDataUrl(file);
      const att = { id: ELOSDB.uid('att'), name: file.name, type: file.type, data: dataUrl, trial_id: _trialState.id, created_at: new Date().toISOString() };
      await ELOSDB.put('attachments', att);
      _trialState.attachments.push(att.id);
    }
    renderAttachments();
    scheduleAutosave();
    toast('Evidence attached');
  };

  document.getElementById('saveDraft').onclick = async () => { await persistTrial('draft'); toast('Draft saved'); };
  document.getElementById('previewMd').onclick = async () => { await persistTrial(_trialState.status); location.hash = `#/trials/${_trialState.id}`; };
  document.getElementById('submitTrial').onclick = async () => {
    const errors = validateTrial(_trialState);
    if (errors.length) {
      alert('Trial is incomplete:\n\n- ' + errors.join('\n- '));
      return;
    }
    await persistTrial('submitted');
    toast('Trial submitted ✓');
    location.hash = `#/trials/${_trialState.id}`;
  };
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function scheduleAutosave() {
  updateSyncIndicator('saving');
  clearTimeout(_autosaveTimer);
  _autosaveTimer = setTimeout(() => persistTrial(_trialState.status), 600);
}

async function persistTrial(status) {
  _trialState.status = status;
  _trialState.updated_at = new Date().toISOString();
  await ELOSDB.put('trials', _trialState);
  updateSyncIndicator('saved');
}

function validateTrial(t) {
  const errors = [];
  if (!t.business_name) errors.push('Business Name is required');
  if (!t.trial_outcome) errors.push('Trial Outcome is required');
  if (t.field_audit.some(f => !f.rating)) errors.push('Every Field Audit item needs a G/F/P rating');
  if (!t.context) errors.push('Context is required');
  if (!Object.values(t.guided_conversation).some(v => v)) errors.push('Guided Conversation is empty');
  if (!t.assumptions.some(a => a.text)) errors.push('At least one Assumption is required');
  if (!t.hypothesis) errors.push('Hypothesis is required');
  if (!t.experiment) errors.push('Experiment is required');
  if (!t.raw_evidence) errors.push('Raw Evidence is required');
  if (!t.interpretation) errors.push('Interpretation is required');
  if (!t.confidence_updates.length) errors.push('Confidence Update is required');
  if (['Inconclusive', 'Rejected', 'Declined'].includes(t.trial_outcome) && !t.error_digestion) {
    errors.push('Error Digestion is required for Inconclusive/Rejected/Declined outcomes');
  }
  if (!t.capability_check.length && !t.capability_note) errors.push('Capability Check needs at least one outcome or note');
  if (!t.ecosystem_rooms.length) errors.push('Ecosystem Mapping needs at least one room selected');
  return errors;
}
