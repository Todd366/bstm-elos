/* schema.js — field definitions matching the BSTM 100 Trials Field Audit Journal
   and the ELOS trial_template.md structure exactly. */

const FIELD_AUDIT_ITEMS = [
  'Business Environment',
  'Customer Traffic',
  'Staff & Roles',
  'Products/Services',
  'Technology Used',
  'Payment Methods',
  'Marketing & Branding',
  'Security Observations',
  'Cleanliness & Organization',
  'Accessibility',
  'Customer Experience',
  'Visible Strengths',
  'Visible Weaknesses',
  'Risks Observed',
  'Opportunities Observed',
];

const GUIDED_CONVERSATION_FIELDS = [
  { key: 'background', label: 'Business Background' },
  { key: 'challenges', label: 'Main Challenges' },
  { key: 'opportunities', label: 'Biggest Opportunities' },
  { key: 'goals', label: 'Current Goals' },
  { key: 'tech', label: 'Technology Currently Used' },
  { key: 'marketing', label: 'Marketing Methods' },
  { key: 'discovery', label: 'How Customers Find Them' },
  { key: 'slows_growth', label: 'What Slows Growth' },
  { key: 'future_plans', label: 'Future Plans' },
  { key: 'skills_wanted', label: 'Skills They Wish They Had' },
];

const CAPABILITY_OPTIONS = [
  'Knowledge gained',
  'Risk reduced',
  'New capability created',
  'Process improved',
  'Cost improved',
  'Speed improved',
  'Reliability improved',
];

const TRIAL_OUTCOMES = ['Confirmed', 'Partially Confirmed', 'Inconclusive', 'Rejected', 'Declined'];
const BOTTLENECK_TYPES = ['Visibility', 'Capital', 'Technology', 'Marketing', 'Systems', 'Behavioral', 'Multi-System', 'Other'];
const CONFIDENCE_LEVELS = ['Low', 'Medium', 'High'];
const PRIORITY_LEVELS = ['High', 'Medium', 'Low'];

function emptyTrial() {
  const now = new Date();
  return {
    id: ELOSDB.uid('trial'),
    trial_id: '',
    title: '',
    date_initiated: now.toISOString().slice(0, 10),
    date_concluded: '',
    business_name: '',
    category: '',
    location: '',
    contact: '',
    gps: '',
    weather: '',
    department_room: '',
    operator: 'Todd',
    trial_outcome: '',
    predicted_bottleneck: '',
    actual_bottleneck: '',
    related_trials: '',
    supersedes: '',
    creates_new_questions: '',

    field_audit: FIELD_AUDIT_ITEMS.map(label => ({ label, rating: '', note: '' })),
    context: '',

    guided_conversation: GUIDED_CONVERSATION_FIELDS.reduce((acc, f) => (acc[f.key] = '', acc), {}),
    collaboration: '', future_contact: '', follow_up_permission: '',
    key_quotes: '',
    ideas_worth_investigating: '',
    immediate_action_items: '',

    assumptions: [{ text: '', initial_confidence: 3 }],
    hypothesis: '',
    experiment: '',
    raw_evidence: '',
    interpretation: '',

    confidence_updates: [{ initial: 3, final: 3, reason: '' }],

    error_digestion: '',
    capability_check: [],
    capability_note: '',

    ecosystem_rooms: [], // array of room numbers
    ecosystem_notes: {},  // { roomNumber: why relevant }

    overall_score: '',
    confidence_level: '',
    priority_level: '',
    follow_up_date: '',
    recommended_next_action: '',
    biggest_insight: '',
    personal_reflection: '',

    attachments: [], // attachment ids

    status: 'draft', // draft | submitted
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };
}

function nextTrialNumber(existingTrials) {
  let max = 0;
  existingTrials.forEach(t => {
    const m = /BSTM-100T-(\d+)/.exec(t.trial_id || '');
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  return max + 1;
}
