/* markdown.js — converts a trial object into the exact ELOS Markdown
   structure used in 02_trial_intelligence/BSTM-100T-XXX.md */

function mdEscapeLine(s) {
  return (s || '').toString().trim();
}

function ratingWord(r) {
  if (r === 'Good' || r === 'Fair' || r === 'Poor') return r;
  return 'Not recorded';
}

function trialToMarkdown(t) {
  const lines = [];

  lines.push('---');
  lines.push(`trial_id: ${t.trial_id || 'UNASSIGNED'}`);
  lines.push(`title: "${mdEscapeLine(t.title)}"`);
  lines.push(`date_initiated: ${t.date_initiated || ''}`);
  lines.push(`date_concluded: ${t.date_concluded || ''}`);
  lines.push(`department_room: "${mdEscapeLine(t.department_room)}"`);
  lines.push(`trial_outcome: "${mdEscapeLine(t.trial_outcome)}"`);
  lines.push(`predicted_bottleneck: "${mdEscapeLine(t.predicted_bottleneck)}"`);
  lines.push(`actual_bottleneck: "${mdEscapeLine(t.actual_bottleneck)}"`);
  lines.push('---');
  lines.push('');
  lines.push(`- Related Trials: ${t.related_trials || 'None'}`);
  lines.push(`- Supersedes: ${t.supersedes || 'None'}`);
  lines.push(`- Creates New Questions: ${t.creates_new_questions || 'None'}`);
  lines.push('');

  lines.push('## Field Audit');
  lines.push('');
  (t.field_audit || []).forEach(item => {
    const rate = ratingWord(item.rating);
    const note = mdEscapeLine(item.note);
    lines.push(`- ${item.label}: ${rate}${note ? ' — ' + note : ''}`);
  });
  lines.push('');

  lines.push('## Context');
  lines.push(mdEscapeLine(t.context) || '_Not recorded._');
  lines.push('');

  lines.push('## Guided Conversation Summary');
  lines.push('');
  GUIDED_CONVERSATION_FIELDS.forEach(f => {
    const val = (t.guided_conversation && t.guided_conversation[f.key]) || '';
    lines.push(`- ${f.label}:`);
    lines.push(mdEscapeLine(val) || '_Not recorded._');
    lines.push('');
  });
  lines.push(`- Would collaborate with BSTM: ${t.collaboration || 'Not recorded'}`);
  lines.push(`- Future contact welcomed: ${t.future_contact || 'Not recorded'}`);
  lines.push(`- Follow-up permission given: ${t.follow_up_permission || 'Not recorded'}`);
  lines.push('');

  lines.push('## Key Quotes');
  lines.push(mdEscapeLine(t.key_quotes) || '_None recorded._');
  lines.push('');

  lines.push('## Assumption Registry');
  (t.assumptions || []).forEach(a => {
    if (!a.text) return;
    lines.push(`- **Assumption:** ${mdEscapeLine(a.text)}`);
    lines.push(`- Initial Confidence: ${a.initial_confidence}/5`);
  });
  lines.push('');

  lines.push('## Hypothesis');
  lines.push(mdEscapeLine(t.hypothesis) || '_Not recorded._');
  lines.push('');

  lines.push('## Experiment');
  lines.push(mdEscapeLine(t.experiment) || '_Not recorded._');
  lines.push('');

  lines.push('## Raw Evidence');
  lines.push(mdEscapeLine(t.raw_evidence) || '_Not recorded._');
  lines.push('');

  lines.push('## Interpretation');
  lines.push(mdEscapeLine(t.interpretation) || '_Not recorded._');
  lines.push('');

  lines.push('## Confidence Update');
  (t.confidence_updates || []).forEach(c => {
    lines.push(`- Initial: ${c.initial}/5`);
    lines.push(`- Final: ${c.final}/5`);
    lines.push(`- Reason for change: ${mdEscapeLine(c.reason) || 'Not recorded'}`);
  });
  lines.push('');

  if (t.immediate_action_items) {
    lines.push('## Immediate Action Items');
    lines.push(mdEscapeLine(t.immediate_action_items));
    lines.push('');
  }

  lines.push('## Error Digestion');
  lines.push(mdEscapeLine(t.error_digestion) || '_Not recorded._');
  lines.push('');

  lines.push('## Capability Check');
  if ((t.capability_check || []).length) {
    lines.push(`- Outcomes: ${t.capability_check.join(', ')}`);
  }
  if (t.capability_note) lines.push(`- Notes: ${mdEscapeLine(t.capability_note)}`);
  if (!(t.capability_check || []).length && !t.capability_note) lines.push('_Not recorded._');
  lines.push('');

  lines.push('## Ecosystem Mapping');
  lines.push('');
  (t.ecosystem_rooms || []).forEach(n => {
    const why = (t.ecosystem_notes && t.ecosystem_notes[n]) || '';
    lines.push(`- Room ${roomLabel(n)}`);
    if (why) lines.push(`  - ${mdEscapeLine(why)}`);
  });
  lines.push('');

  lines.push('## Reflection & Score');
  lines.push(`- Overall Trial Score: ${t.overall_score || 'N/A'}/10`);
  lines.push(`- Confidence Level: ${t.confidence_level || 'Not recorded'}`);
  lines.push(`- Priority Level: ${t.priority_level || 'Not recorded'}`);
  lines.push(`- Follow-up Date: ${t.follow_up_date || 'None set'}`);
  lines.push(`- Recommended Next Action: ${mdEscapeLine(t.recommended_next_action) || 'Not recorded'}`);
  lines.push(`- Biggest Insight: ${mdEscapeLine(t.biggest_insight) || 'Not recorded'}`);
  if (t.personal_reflection) {
    lines.push(`- Personal Reflection: ${mdEscapeLine(t.personal_reflection)}`);
  }
  lines.push('');

  return lines.join('\n');
}

function downloadMarkdown(t) {
  const md = trialToMarkdown(t);
  const filename = (t.trial_id || 'BSTM-100T-DRAFT') + '.md';
  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
