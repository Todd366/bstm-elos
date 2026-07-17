from pathlib import Path

# index.html
p = Path('index.html')
s = p.read_text()
if 'data-route="sentinel"' not in s:
    s = s.replace(
        '<a href="#/patterns" data-route="patterns">🧩 Patterns</a>
    <a href="#/principles" data-route="principles">📜 Principles</a>',
        '<a href="#/patterns" data-route="patterns">🧩 Patterns</a>
    <a href="#/sentinel" data-route="sentinel">🏥 Sentinel Audit</a>
    <a href="#/principles" data-route="principles">📜 Principles</a>'
    )
p.write_text(s)

# app.js
p = Path('app.js')
s = p.read_text()
s = s.replace("const hash = location.hash.replace(/^#//, '') || 'dashboard';", "const hash = location.hash.replace(/^#\\//, '') || 'dashboard';")
if "route === 'sentinel'" not in s:
    s = s.replace(
        "    } else if (route === 'scorecard') {
      setActiveNav('scorecard'); await renderScorecard(view);
    } else if (route === 'settings') {",
        "    } else if (route === 'scorecard') {
      setActiveNav('scorecard'); await renderScorecard(view);
    } else if (route === 'sentinel') {
      setActiveNav('sentinel'); await renderSentinel(view);
    } else if (route === 'settings') {"
    )
p.write_text(s)

# views.js
p = Path('views.js')
s = p.read_text()
start = s.find('/* ---------------- Sentinel ---------------- */')
end = s.find('/* ---------------- Trials Archive + Viewer ---------------- */')
block = """/* ---------------- Sentinel ---------------- */
async function renderSentinel(view) {
  let report = {};
  let trend = {};
  try { report = await fetch('output/esa_audit_report.json').then(r => r.json()); } catch (e) {}
  try { trend = await fetch('output/esa_trend.json').then(r => r.json()); } catch (e) {}

  const health = report.health || {};
  const subsystems = health.subsystemScores || {};
  const names = { repository:'Repository', trials:'Trials', patterns:'Patterns', principles:'Principles', ecosystem:'Ecosystem', code:'Code', database:'Database', accuracy:'Accuracy' };

  view.innerHTML = `
    <h1>🏥 Sentinel Audit</h1>
    <p class="subtitle">Structural governance view — latest audit, trend, and subsystem health</p>
    <div class="grid">
      <div class="card"><div class="num">${health.score ?? 0}%</div><div class="label">Health Index</div></div>
      <div class="card"><div class="num">${trend.direction || 'UNKNOWN'}</div><div class="label">Trend</div></div>
      <div class="card"><div class="num">${trend.change ?? '—'}</div><div class="label">Change</div></div>
      <div class="card"><div class="num">${health.status || 'UNKNOWN'}</div><div class="label">Status</div></div>
    </div>
    <div class="panel">
      <h3 style="margin-top:0">Subsystem Health</h3>
      ${Object.entries(subsystems).length ? Object.entries(subsystems).map(([name, value]) => {
        const pct = Math.max(0, Math.min(100, Number(value || 0)));
        const filled = Math.round((pct / 100) * 10);
        return `<div class="health-row"><span>${names[name] || name}</span><span>${'█'.repeat(filled)}${'░'.repeat(10 - filled)} ${pct}%</span></div>`;
      }).join('') : '<div class="empty"><div class="big">—</div>No subsystem data yet.</div>'}
    </div>
    <div class="panel">
      <h3 style="margin-top:0">Needs Attention</h3>
      <ul>${Object.entries(subsystems).filter(([_, v]) => Number(v) < 100).map(([name, value]) => `<li>${names[name] || name}: ${value}%</li>`).join('') || '<li>None</li>'}</ul>
    </div>
    <div class="panel">
      <h3 style="margin-top:0">Latest Audit</h3>
      <p style="color:var(--text-dim);font-size:13px">Timestamp: ${(report.timestamp || 'unknown').slice(0, 16).replace('T', ' ')}</p>
      <p style="color:var(--text-dim);font-size:13px">Strongest: ${names[trend.strongestSubsystem] || trend.strongestSubsystem || '—'}</p>
      <p style="color:var(--text-dim);font-size:13px">Weakest: ${names[trend.weakestSubsystem] || trend.weakestSubsystem || '—'}</p>
    </div>
  `;
}
"""
if start != -1 and end != -1:
    s = s[:start] + block + s[end:]
else:
    s += "
" + block
if 'window.renderSentinel = renderSentinel;' not in s:
    s += "
window.renderSentinel = renderSentinel;
"
p.write_text(s)
