/* rooms.js — BSTM 63-Room Ecosystem Registry (static reference data)
   Layer 6: Departments 1-30 · Layer 5: Companies 31-45 · Layer 4: Organizations 46-55
   Layer 3: Foundations 56-60 · Layer 2: Trusts 61-62 · Layer 1: Sovereign 63
   Names for 31-63 are editable placeholders — refine anytime in Ecosystem > Edit. */

const BSTM_ROOMS = [
  { n: 1, layer: 6, name: 'AI & Machine Learning' },
  { n: 2, layer: 6, name: 'Trading Automation' },
  { n: 3, layer: 6, name: 'VPN & Network Security' },
  { n: 4, layer: 6, name: 'Web Development' },
  { n: 5, layer: 6, name: 'Mobile Application Development' },
  { n: 6, layer: 6, name: 'System Integration & API' },
  { n: 7, layer: 6, name: 'Data Science & Analytics' },
  { n: 8, layer: 6, name: 'Blockchain & Cryptocurrency' },
  { n: 9, layer: 6, name: 'Graphic Design & Branding' },
  { n: 10, layer: 6, name: 'Content Creation & Copywriting' },
  { n: 11, layer: 6, name: 'Social Media Management' },
  { n: 12, layer: 6, name: 'Digital Marketing & Advertising' },
  { n: 13, layer: 6, name: 'BSTM Tutorial Center' },
  { n: 14, layer: 6, name: 'Private Security' },
  { n: 15, layer: 6, name: 'Music' },
  { n: 16, layer: 6, name: 'CabLink Transportation' },
  { n: 17, layer: 6, name: 'Finance & Accounting' },
  { n: 18, layer: 6, name: 'Marketplace & E-Commerce' },
  { n: 19, layer: 6, name: 'Research & Development' },
  { n: 20, layer: 6, name: 'Healthcare Information & Wellness' },
  { n: 21, layer: 6, name: 'Nutrition & Health Products' },
  { n: 22, layer: 6, name: 'Micro Farming & Urban Agriculture' },
  { n: 23, layer: 6, name: 'Sustainability & Environmental' },
  { n: 24, layer: 6, name: 'Human Resources & Talent Development' },
  { n: 25, layer: 6, name: 'Project Management Office' },
  { n: 26, layer: 6, name: 'Legal & Compliance' },
  { n: 27, layer: 6, name: 'G.I.N. Global Intelligence Network' },
  { n: 28, layer: 6, name: 'BSTM Clothing Brand' },
  { n: 29, layer: 6, name: 'Spiritual Guidance & Consciousness' },
  { n: 30, layer: 6, name: 'BHD (Black Hole Drive)' },

  { n: 31, layer: 5, name: 'BSTM Tech Solutions' },
  { n: 32, layer: 5, name: 'THoBoCoin Ltd' },
  { n: 33, layer: 5, name: 'CabLink (Pty) Ltd' },
  { n: 34, layer: 5, name: 'SecureNet' },
  { n: 35, layer: 5, name: 'GIN Analytics' },
  { n: 36, layer: 5, name: 'BSTM Finance' },
  { n: 37, layer: 5, name: 'MarketPlace Botswana' },
  { n: 38, layer: 5, name: 'HealthWave' },
  { n: 39, layer: 5, name: 'BHD Innovations' },
  { n: 40, layer: 5, name: 'Company 40 (unnamed)' },
  { n: 41, layer: 5, name: 'Company 41 (unnamed)' },
  { n: 42, layer: 5, name: 'Company 42 (unnamed)' },
  { n: 43, layer: 5, name: 'Company 43 (unnamed)' },
  { n: 44, layer: 5, name: 'Company 44 (unnamed)' },
  { n: 45, layer: 5, name: 'Company 45 (unnamed)' },

  { n: 46, layer: 4, name: 'Organization 46 (unnamed)' },
  { n: 47, layer: 4, name: 'Organization 47 (unnamed)' },
  { n: 48, layer: 4, name: 'Organization 48 (unnamed)' },
  { n: 49, layer: 4, name: 'Organization 49 (unnamed)' },
  { n: 50, layer: 4, name: 'Organization 50 (unnamed)' },
  { n: 51, layer: 4, name: 'Organization 51 (unnamed)' },
  { n: 52, layer: 4, name: 'Organization 52 (unnamed)' },
  { n: 53, layer: 4, name: 'Organization 53 (unnamed)' },
  { n: 54, layer: 4, name: 'Organization 54 (unnamed)' },
  { n: 55, layer: 4, name: 'Organization 55 (unnamed)' },

  { n: 56, layer: 3, name: 'Foundation 56 (unnamed)' },
  { n: 57, layer: 3, name: 'Foundation 57 (unnamed)' },
  { n: 58, layer: 3, name: 'Foundation 58 (unnamed)' },
  { n: 59, layer: 3, name: 'Foundation 59 (unnamed)' },
  { n: 60, layer: 3, name: 'Foundation 60 (unnamed)' },

  { n: 61, layer: 2, name: 'Trust 61 (unnamed)' },
  { n: 62, layer: 2, name: 'Trust 62 (unnamed)' },

  { n: 63, layer: 1, name: 'BSTM Sovereign Trust' },
];

const LAYER_LABELS = {
  6: 'Layer 6 — Departments',
  5: 'Layer 5 — Companies',
  4: 'Layer 4 — Organizations',
  3: 'Layer 3 — Foundations',
  2: 'Layer 2 — Trusts',
  1: 'Layer 1 — Sovereign',
};

function roomLabel(n) {
  const r = BSTM_ROOMS.find(r => r.n === Number(n));
  return r ? `${r.n} — ${r.name}` : `Room ${n}`;
}

// Editable overrides (persisted separately so users can rename unnamed rooms)
async function loadRoomOverrides() {
  const meta = await ELOSDB.get('meta', 'room_overrides');
  return (meta && meta.value) || {};
}
async function saveRoomOverrides(overrides) {
  await ELOSDB.put('meta', { id: 'room_overrides', value: overrides });
}
