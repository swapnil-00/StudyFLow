// StudyFlow Bundled Application Scripts
window.Pages = window.Pages || {};

// ─── ICONS ───
// SVG Icon System — Feather Icons subset
const icons = {
  grid: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
  map: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>`,
  users: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  'credit-card': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>`,
  clock: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  calendar: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  'dollar-sign': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
  'trending-down': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>`,
  layers: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`,
  'user-check': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>`,
  'bar-chart-2': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>`,
  bell: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
  activity: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
  settings: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  search: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  plus: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  x: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  chevronLeft: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`,
  chevronRight: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`,
  chevronDown: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`,
  menu: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`,
  sun: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`,
  moon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
  'arrow-right': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`,
  'arrow-up-right': `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>`,
  'trending-up': `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`,
  checkCircle: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
  'alert-circle': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  'alert-triangle': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  info: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
  'user-plus': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>`,
  'map-pin': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
  'file-text': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
  edit: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  trash: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`,
  'more-vertical': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>`,
  eye: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
  download: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  print: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>`,
  refresh: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`,
  'log-out': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
  logOut: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
  filter: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>`,
  'check-circle': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
  zoomIn: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>`,
  zoomOut: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>`,
  tool: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`,
  home: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  'pie-chart': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>`,
  phone: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.62 3.47C1.6 2.48 2.27 1.6 3.18 1H6.18a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 21 16.92z"/></svg>`,
  mail: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`,
  user: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  'repeat': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>`,
};

window.icons = icons;


// ─── STORE & UTILS ───
// StudyFlow Data Store — Neon PostgreSQL backend via REST API
// Replaces localStorage store with server-backed persistence
// All reads are from in-memory cache (loaded once on boot).
// All writes go to /api/write immediately, then update the cache.

const API_BASE = '';  // Same origin — works on Vercel and local

async function apiWrite(table, action, data, id) {
  const res = await fetch(`${API_BASE}/api/write`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ table, action, data, id }),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || 'Write failed');
  return json;
}

class Store {
  constructor() {
    this._db = null;
    this._subscribers = [];
    this._loading = false;
    this._loaded = false;
    this._lastLoadError = null;
    this._activeBranchId = null; // in-memory branch selection (no sessionStorage)
  }

  // ── Bootstrap ────────────────────────────────────────────────────
  async load() {
    if (this._loaded) return;
    if (this._loading) {
      // Wait for in-flight load
      await new Promise(resolve => {
        const unsub = this.subscribe(() => { if (this._loaded) { unsub(); resolve(); } });
      });
      return;
    }
    this._loading = true;
    try {
      const res = await fetch(`${API_BASE}/api/data`, { credentials: 'same-origin' });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Failed to load data');
      this._db = json.db;
      this._loaded = true;
    } catch (e) {
      console.error('Store load failed:', e);
      this._lastLoadError = e.message;
      // Fallback: empty DB so app doesn't crash
      this._db = { branches:[], floors:[], rooms:[], seats:[], students:[], membershipPlans:[], memberships:[], seatAssignments:[], reservations:[], payments:[], attendance:[], expenses:[], notifications:[], activityLog:[], waitlist:[], staff:[], seatTransfers:[], notificationMessages:[], documents:[], settings:{} };
      this._loaded = true;
    }
    this._loading = false;
    this._notify();
  }

  isSeeded() {
    return this._loaded && (this._db?.branches?.length > 0);
  }

  get db() {
    return this._db || {};
  }

  _notify() {
    this._subscribers.forEach(fn => fn());
  }

  subscribe(fn) {
    this._subscribers.push(fn);
    return () => { this._subscribers = this._subscribers.filter(s => s !== fn); };
  }

  // Keep _save for compatibility: it only updates the in-memory cache
  _save(db) {
    this._db = db;
    this._notify();
  }

  getActiveBranchId() {
    return this._activeBranchId || (this._db?.branches?.[0]?.id);
  }
  setActiveBranch(id) { this._activeBranchId = id; this._notify(); }

  // ── Branches ──────────────────────────────────────────────────────
  getBranches() { return this._db?.branches || []; }
  getBranch(id) { return this.getBranches().find(b => b.id === id); }

  async addBranch(data) {
    const branch = { id: uid('BR'), createdAt: now(), ...data };
    await apiWrite('branches', 'insert', branch);
    this._db.branches.push(branch);
    this._notify();
    return branch;
  }

  async updateBranch(id, updates) {
    const idx = this._db.branches.findIndex(b => b.id === id);
    if (idx === -1) throw new Error('Branch not found');
    this._db.branches[idx] = { ...this._db.branches[idx], ...updates };
    await apiWrite('branches', 'update', this._db.branches[idx], id);
    this._notify();
    return this._db.branches[idx];
  }

  // ── Floors ────────────────────────────────────────────────────────
  getFloors(branchId) {
    const floors = this._db?.floors || [];
    return branchId ? floors.filter(f => f.branchId === branchId) : floors;
  }
  getFloor(id) { return (this._db?.floors || []).find(f => f.id === id); }

  async addFloor(data) {
    const floor = { id: uid('FLR'), createdAt: now(), ...data };
    await apiWrite('floors', 'insert', floor);
    this._db.floors.push(floor);
    this._notify();
    return floor;
  }

  // ── Rooms ─────────────────────────────────────────────────────────
  getRooms(floorId) {
    const rooms = this._db?.rooms || [];
    return floorId ? rooms.filter(r => r.floorId === floorId) : rooms;
  }
  getRoom(id) { return (this._db?.rooms || []).find(r => r.id === id); }

  getRoomsForBranch(branchId) {
    const floorIds = this.getFloors(branchId).map(f => f.id);
    return (this._db?.rooms || []).filter(r => floorIds.includes(r.floorId));
  }

  async addRoom(data) {
    const room = { id: uid('RM'), createdAt: now(), ...data };
    await apiWrite('rooms', 'insert', room);
    this._db.rooms.push(room);
    this._notify();
    return room;
  }

  async updateRoom(id, updates) {
    const idx = this._db.rooms.findIndex(r => r.id === id);
    if (idx === -1) throw new Error('Room not found');
    this._db.rooms[idx] = { ...this._db.rooms[idx], ...updates };
    await apiWrite('rooms', 'update', this._db.rooms[idx], id);
    this._notify();
    return this._db.rooms[idx];
  }

  async deleteRoom(id) {
    await apiWrite('rooms', 'delete', {}, id);
    this._db.rooms = this._db.rooms.filter(r => r.id !== id);
    this._notify();
  }

  // ── Seats ─────────────────────────────────────────────────────────
  getSeats(roomId) {
    const seats = this._db?.seats || [];
    return roomId ? seats.filter(s => s.roomId === roomId) : seats;
  }

  getSeatsForBranch(branchId) {
    const roomIds = this.getRoomsForBranch(branchId).map(r => r.id);
    return (this._db?.seats || []).filter(s => roomIds.includes(s.roomId));
  }

  getSeat(id) { return (this._db?.seats || []).find(s => s.id === id); }

  getSeatStatus(seatId) {
    const seat = this.getSeat(seatId);
    if (!seat) return 'unknown';
    if (seat.status === 'maintenance') return 'maintenance';
    if (seat.status === 'blocked') return 'blocked';

    const assignment = this.getActiveAssignment(seatId);
    if (!assignment) return 'available';

    const reservation = this.getActiveReservation(seatId);
    if (reservation && !assignment) return 'reserved';

    const membership = this.getMembership(assignment.membershipId);
    if (!membership) return 'available';

    const today = new Date();
    const expiry = new Date(membership.endDate);

    const payment = this.getPaymentStatus(membership.id);
    if (payment === 'overdue' || payment === 'pending') return 'payment-due';

    const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 7 && daysLeft > 0) return 'expiring';
    if (expiry < today) return 'available';

    return 'occupied';
  }

  async addSeat(data) {
    const seat = { id: uid('SEAT'), status: 'available', type: 'standard', createdAt: now(), ...data };
    await apiWrite('seats', 'insert', seat);
    this._db.seats.push(seat);
    this._notify();
    return seat;
  }

  async updateSeat(id, updates) {
    const idx = this._db.seats.findIndex(s => s.id === id);
    if (idx === -1) throw new Error('Seat not found');
    this._db.seats[idx] = { ...this._db.seats[idx], ...updates, updatedAt: now() };
    await apiWrite('seats', 'update', updates, id);
    this._notify();
    return this._db.seats[idx];
  }

  async deleteSeat(id) {
    await apiWrite('seats', 'delete', {}, id);
    this._db.seats = this._db.seats.filter(s => s.id !== id);
    this._notify();
  }

  // ── Students ──────────────────────────────────────────────────────
  getStudents(branchId) {
    const students = this._db?.students || [];
    return branchId ? students.filter(s => s.branchId === branchId) : students;
  }

  getStudent(id) { return (this._db?.students || []).find(s => s.id === id); }

  searchStudents(query, branchId) {
    const q = query.toLowerCase();
    return this.getStudents(branchId).filter(s =>
      s.name.toLowerCase().includes(q) ||
      (s.phone||'').includes(q) ||
      s.id.toLowerCase().includes(q) ||
      (s.email||'').toLowerCase().includes(q)
    );
  }

  async addStudent(data) {
    const phone = data.phone || '';
    const countryCode = data.country_code || '+91';
    const normalized_phone = data.normalized_phone || utils.normalizePhone(phone, countryCode);

    const student = {
      id: uid('STU'),
      status: 'active',
      createdAt: now(),
      avatar: getAvatarColor(data.name),
      avatarColor: getAvatarColor(data.name),
      country_code: countryCode,
      phone_number: phone.replace(/[^0-9]/g, ''),
      normalized_phone,
      whatsapp_opt_in: data.whatsapp_opt_in !== false,
      whatsapp_opt_in_at: data.whatsapp_opt_in_at || now(),
      whatsapp_opt_out_at: null,
      preferred_language: data.preferred_language || 'en',
      communication_preferences: data.communication_preferences || {
        whatsapp: true, payment_reminders: true, membership_reminders: true,
        booking_notifications: true, receipt_notifications: true, announcements: true
      },
      ...data,
      phone: normalized_phone || phone
    };

    await apiWrite('students', 'insert', student);
    this._db.students.push(student);
    this.addActivity({ action: 'student_created', entity: 'student', entityId: student.id, description: `Student ${student.name} added` });
    this._notify();
    return student;
  }

  async updateStudent(id, updates) {
    const idx = this._db.students.findIndex(s => s.id === id);
    if (idx === -1) throw new Error('Student not found');

    if (updates.phone) {
      const countryCode = updates.country_code || this._db.students[idx].country_code || '+91';
      updates.normalized_phone = utils.normalizePhone(updates.phone, countryCode);
      updates.phone = updates.normalized_phone;
    }

    if (updates.whatsapp_opt_in !== undefined && updates.whatsapp_opt_in !== this._db.students[idx].whatsapp_opt_in) {
      if (updates.whatsapp_opt_in) updates.whatsapp_opt_in_at = now();
      else updates.whatsapp_opt_out_at = now();
    }

    this._db.students[idx] = { ...this._db.students[idx], ...updates, updatedAt: now() };
    await apiWrite('students', 'update', updates, id);
    this._notify();
    return this._db.students[idx];
  }

  // ── Membership Plans ──────────────────────────────────────────────
  getMembershipPlans(branchId) {
    const plans = this._db?.membershipPlans || [];
    return branchId ? plans.filter(p => p.branchId === branchId || !p.branchId) : plans;
  }

  getMembershipPlan(id) { return (this._db?.membershipPlans || []).find(p => p.id === id); }

  async addMembershipPlan(data) {
    const plan = { id: uid('PLAN'), active: true, createdAt: now(), ...data };
    await apiWrite('membership_plans', 'insert', plan);
    this._db.membershipPlans.push(plan);
    this._notify();
    return plan;
  }

  async updateMembershipPlan(id, updates) {
    const idx = this._db.membershipPlans.findIndex(p => p.id === id);
    if (idx === -1) throw new Error('Plan not found');
    this._db.membershipPlans[idx] = { ...this._db.membershipPlans[idx], ...updates };
    await apiWrite('membership_plans', 'update', this._db.membershipPlans[idx], id);
    this._notify();
    return this._db.membershipPlans[idx];
  }

  // ── Memberships ───────────────────────────────────────────────────
  getMemberships(studentId) {
    const memberships = this._db?.memberships || [];
    return studentId ? memberships.filter(m => m.studentId === studentId) : memberships;
  }

  getActiveMembership(studentId) {
    const today = new Date();
    return this.getMemberships(studentId).find(m =>
      m.status === 'active' && new Date(m.endDate) >= today
    );
  }

  getMembership(id) { return (this._db?.memberships || []).find(m => m.id === id); }

  async addMembership(data) {
    const membership = { id: uid('MEM'), status: 'active', createdAt: now(), ...data };
    await apiWrite('memberships', 'insert', membership);
    this._db.memberships.push(membership);
    this._notify();
    return membership;
  }

  async updateMembership(id, updates) {
    const idx = this._db.memberships.findIndex(m => m.id === id);
    if (idx === -1) throw new Error('Membership not found');
    this._db.memberships[idx] = { ...this._db.memberships[idx], ...updates, updatedAt: now() };
    await apiWrite('memberships', 'update', updates, id);
    this._notify();
    return this._db.memberships[idx];
  }

  // ── Seat Assignments ──────────────────────────────────────────────
  getAssignments(seatId) {
    const assignments = this._db?.seatAssignments || [];
    return seatId ? assignments.filter(a => a.seatId === seatId) : assignments;
  }

  getStudentAssignment(studentId) {
    const today = new Date();
    return (this._db?.seatAssignments || []).find(a =>
      a.studentId === studentId && a.status === 'active' && new Date(a.endDate) >= today
    );
  }

  getActiveAssignment(seatId) {
    const today = new Date();
    return (this._db?.seatAssignments || []).find(a =>
      a.seatId === seatId && a.status === 'active' && new Date(a.endDate) >= today
    );
  }

  async assignSeat(data) {
    const existing = this.getActiveAssignment(data.seatId);
    if (existing) throw new Error('Seat is already occupied. Please choose a different seat.');

    const assignment = { id: uid('ASN'), status: 'active', createdAt: now(), ...data };
    const res = await apiWrite('seat_assignments', 'insert', assignment);
    if (res && res.id) assignment.id = res.id;
    this._db.seatAssignments.push(assignment);
    const seat = this.getSeat(data.seatId);
    if (seat) {
      seat.status = 'occupied';
      seat.currentStudentId = data.studentId;
    }
    this.addActivity({ action: 'seat_assigned', entity: 'seat', entityId: data.seatId, description: `Seat ${seat?.label || data.seatId} assigned to student`, meta: data });
    this._notify();
    return assignment;
  }

  async releaseSeat(seatId, reason, userId) {
    const idx = this._db.seatAssignments.findIndex(a => a.seatId === seatId && a.status === 'active');
    if (idx === -1) throw new Error('No active assignment found');
    await apiWrite('seat_assignments', 'release', { seatId, reason, userId });
    this._db.seatAssignments[idx] = {
      ...this._db.seatAssignments[idx],
      status: 'released',
      releasedAt: now(),
      releaseReason: reason,
      releasedBy: userId
    };
    const seat = this.getSeat(seatId);
    if (seat) {
      seat.status = 'available';
      seat.currentStudentId = null;
    }
    this.addActivity({ action: 'seat_released', entity: 'seat', entityId: seatId, description: `Seat released. Reason: ${reason}` });
    this._notify();
    return this._db.seatAssignments[idx];
  }

  async transferSeat(fromSeatId, toSeatId, studentId, reason) {
    const destAssignment = this.getActiveAssignment(toSeatId);
    if (destAssignment) throw new Error('Destination seat is already occupied.');

    const fromIdx = this._db.seatAssignments.findIndex(a => a.seatId === fromSeatId && a.status === 'active');
    if (fromIdx === -1) throw new Error('Source seat has no active assignment.');

    const oldAssignment = this._db.seatAssignments[fromIdx];
    const fromSeat = this.getSeat(fromSeatId);
    const toSeat = this.getSeat(toSeatId);

    // Atomic transfer execution in backend
    const res = await apiWrite('seat_assignments', 'transfer', { fromSeatId, toSeatId, studentId, reason });

    this._db.seatAssignments[fromIdx] = {
      ...oldAssignment,
      status: 'transferred',
      transferredAt: now(),
      transferReason: reason
    };

    const newAssignment = {
      id: res.id || uid('ASN'),
      status: 'active',
      seatId: toSeatId,
      studentId: oldAssignment.studentId,
      membershipId: oldAssignment.membershipId,
      startDate: now(),
      endDate: oldAssignment.endDate,
      createdAt: now(),
      transferredFrom: fromSeatId
    };
    this._db.seatAssignments.push(newAssignment);

    if (fromSeat) { fromSeat.status = 'available'; fromSeat.currentStudentId = null; }
    if (toSeat) { toSeat.status = 'occupied'; toSeat.currentStudentId = oldAssignment.studentId; }

    const transfer = {
      id: res.transferId || uid('TRF'),
      studentId,
      fromSeatId,
      toSeatId,
      reason,
      date: now(),
      fromSeatLabel: fromSeat?.label,
      toSeatLabel: toSeat?.label
    };
    this._db.seatTransfers = this._db.seatTransfers || [];
    this._db.seatTransfers.push(transfer);

    this.addActivity({
      action: 'seat_transferred',
      entity: 'seat',
      entityId: fromSeatId,
      description: `Seat transferred from ${fromSeat?.label || fromSeatId} to ${toSeat?.label || toSeatId}. Reason: ${reason}`
    });
    this._notify();
    return newAssignment;
  }

  // ── Reservations ──────────────────────────────────────────────────
  getReservations(seatId) {
    const reservations = this._db?.reservations || [];
    return seatId ? reservations.filter(r => r.seatId === seatId) : reservations;
  }

  getActiveReservation(seatId) {
    const today = new Date();
    return (this._db?.reservations || []).find(r =>
      r.seatId === seatId && r.status === 'upcoming' &&
      new Date(r.startDate) <= today && new Date(r.endDate) >= today
    );
  }

  async addReservation(data) {
    const reservation = { id: uid('RES'), status: 'upcoming', createdAt: now(), ...data };
    await apiWrite('reservations', 'insert', reservation);
    this._db.reservations.push(reservation);
    this._notify();
    return reservation;
  }

  async updateReservation(id, updates) {
    const idx = this._db.reservations.findIndex(r => r.id === id);
    if (idx === -1) throw new Error('Reservation not found');
    this._db.reservations[idx] = { ...this._db.reservations[idx], ...updates, updatedAt: now() };
    await apiWrite('reservations', 'update', updates, id);
    this._notify();
    return this._db.reservations[idx];
  }

  // ── Payments ──────────────────────────────────────────────────────
  getPayments(membershipId) {
    const payments = this._db?.payments || [];
    return membershipId ? payments.filter(p => p.membershipId === membershipId) : payments;
  }

  getPaymentsForStudent(studentId) {
    const membershipIds = this.getMemberships(studentId).map(m => m.id);
    return (this._db?.payments || []).filter(p => membershipIds.includes(p.membershipId));
  }

  getPaymentStatus(membershipId) {
    const membership = this.getMembership(membershipId);
    if (!membership) return 'unknown';

    const payments = this.getPayments(membershipId);
    const totalPaid = payments.filter(p => p.status !== 'refunded').reduce((sum, p) => sum + p.amount, 0);
    const totalDue = membership.price - (membership.discount || 0);

    if (totalPaid >= totalDue) return 'paid';
    if (totalPaid > 0) return 'partial';

    const today = new Date();
    const startDate = new Date(membership.startDate);
    if (today > startDate) return 'overdue';
    return 'pending';
  }

  getPaidAmount(membershipId) {
    return this.getPayments(membershipId).filter(p => p.status !== 'refunded').reduce((sum, p) => sum + p.amount, 0);
  }

  getPendingAmount(membershipId) {
    const membership = this.getMembership(membershipId);
    if (!membership) return 0;
    const totalDue = membership.price - (membership.discount || 0);
    const paid = this.getPaidAmount(membershipId);
    return Math.max(0, totalDue - paid);
  }

  async recordPayment(data) {
    const membership = this.getMembership(data.membershipId);
    if (!membership) throw new Error('Membership not found');

    const payment = {
      id: uid('PAY'),
      status: 'recorded',
      receiptNumber: data.receiptNumber || `REC-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      recordedAt: now(),
      ...data
    };
    await apiWrite('payments', 'insert', payment);
    this._db.payments.push(payment);

    // Update membership payment status
    const newStatus = this.getPaymentStatus(data.membershipId);
    if (membership.paymentStatus !== newStatus) {
      membership.paymentStatus = newStatus;
      apiWrite('memberships', 'update', { paymentStatus: newStatus }, membership.id).catch(e => console.warn('Membership status sync error:', e));
    }

    this.addActivity({ action: 'payment_recorded', entity: 'payment', entityId: payment.id, description: `Payment of ${formatINR(payment.amount)} recorded` });
    this._notify();
    return payment;
  }

  // ── Attendance ────────────────────────────────────────────────────
  getAttendance(studentId, date) {
    const records = this._db?.attendance || [];
    if (studentId && date) return records.find(a => a.studentId === studentId && a.date === date);
    if (studentId) return records.filter(a => a.studentId === studentId);
    if (date) return records.filter(a => a.date === date);
    return records;
  }

  getTodayAttendance() { return this.getAttendance(null, today()); }

  async checkIn(studentId, time) {
    const dateStr = today();
    const existing = this._db.attendance.find(a => a.studentId === studentId && a.date === dateStr);
    if (existing) {
      existing.checkIn = time || now();
      existing.status = 'checked-in';
      await apiWrite('attendance', 'update', { checkIn: existing.checkIn }, existing.id);
    } else {
      const record = { id: uid('ATT'), studentId, date: dateStr, checkIn: time || now(), status: 'checked-in' };
      await apiWrite('attendance', 'insert', record);
      this._db.attendance.push(record);
    }
    this.addActivity({ action: 'check_in', entity: 'student', entityId: studentId, description: 'Student checked in' });
    this._notify();
  }

  async checkOut(studentId, time) {
    const dateStr = today();
    const idx = this._db.attendance.findIndex(a => a.studentId === studentId && a.date === dateStr);
    if (idx === -1) throw new Error('No check-in record found for today');
    const record = this._db.attendance[idx];
    const checkOutTime = time || now();
    const duration = record.checkIn ? Math.round((new Date(checkOutTime) - new Date(record.checkIn)) / 60000) : null;
    this._db.attendance[idx] = { ...record, checkOut: checkOutTime, status: 'checked-out', duration };
    await apiWrite('attendance', 'update', { checkOut: checkOutTime }, record.id);
    this._notify();
    return this._db.attendance[idx];
  }

  // ── Expenses ──────────────────────────────────────────────────────
  getExpenses(branchId) {
    const expenses = this._db?.expenses || [];
    return branchId ? expenses.filter(e => e.branchId === branchId) : expenses;
  }

  async addExpense(data) {
    const expense = { id: uid('EXP'), createdAt: now(), ...data };
    await apiWrite('expenses', 'insert', expense);
    this._db.expenses.push(expense);
    this._notify();
    return expense;
  }

  // ── Notifications ─────────────────────────────────────────────────
  getNotifications(branchId) {
    return (this._db?.notifications || []).filter(n => !branchId || n.branchId === branchId);
  }

  getUnreadCount() { return this.getNotifications().filter(n => !n.read).length; }

  async markNotificationRead(id) {
    const notif = (this._db?.notifications || []).find(n => n.id === id);
    if (notif) { notif.read = true; }
    await apiWrite('notifications', 'markRead', {}, id);
    this._notify();
  }

  async markAllRead() {
    (this._db?.notifications || []).forEach(n => { n.read = true; });
    await apiWrite('notifications', 'markRead', {});
    this._notify();
  }

  // ── Documents (in-memory, not persisted to DB) ────────────────────
  getDocuments() { return this._db?.documents || []; }
  getDocument(id) { return (this._db?.documents || []).find(d => d.id === id); }
  getDocumentByNumber(docNum) { return (this._db?.documents || []).find(d => d.documentNumber === docNum); }

  saveDocument(doc) {
    this._db.documents = this._db.documents || [];
    const idx = this._db.documents.findIndex(d => d.id === doc.id);
    if (idx !== -1) this._db.documents[idx] = { ...this._db.documents[idx], ...doc };
    else this._db.documents.unshift(doc);
    // Persist document to Neon DB asynchronously
    apiWrite('documents', 'save', doc).catch(e => console.warn('Document DB persistence failed:', e.message));
    this._notify();
    return doc;
  }

  getDocumentsForStudent(studentId) { return (this._db?.documents || []).filter(d => d.studentId === studentId); }

  // ── WhatsApp notification messages (Persisted) ───────────────────
  getNotificationMessages() { return this._db?.notificationMessages || []; }
  getNotificationMessage(id) { return (this._db?.notificationMessages || []).find(m => m.id === id); }
  getNotificationMessageByIdempotency(key) { return (this._db?.notificationMessages || []).find(m => m.idempotencyKey === key); }

  saveNotificationMessage(msg) {
    this._db.notificationMessages = this._db.notificationMessages || [];
    const idx = this._db.notificationMessages.findIndex(m => m.id === msg.id);
    if (idx !== -1) this._db.notificationMessages[idx] = { ...this._db.notificationMessages[idx], ...msg };
    else this._db.notificationMessages.unshift(msg);
    // Persist log to Neon DB asynchronously
    apiWrite('communication_logs', 'save', msg).catch(e => console.warn('Comm log DB persistence failed:', e.message));
    this._notify();
    return msg;
  }

  getNotificationMessagesForStudent(studentId) { return (this._db?.notificationMessages || []).filter(m => m.studentId === studentId); }

  getNotificationStats() {
    const msgs = this.getNotificationMessages();
    const todayStr = utils.today();
    const todayMsgs = msgs.filter(m => m.createdAt && m.createdAt.startsWith(todayStr));
    const delivered = msgs.filter(m => m.status === 'DELIVERED' || m.status === 'READ').length;
    const pending = msgs.filter(m => m.status === 'QUEUED' || m.status === 'PROCESSING' || m.status === 'SENT').length;
    const failed = msgs.filter(m => m.status === 'FAILED').length;
    return { todayCount: todayMsgs.length || msgs.length, delivered, pending, failed };
  }

  // ── Activity Log ──────────────────────────────────────────────────
  getActivityLogs(limit) {
    const logs = [...(this._db?.activityLog || [])].reverse();
    return limit ? logs.slice(0, limit) : logs;
  }

  addActivity(data) {
    const entry = { id: uid('ACT'), timestamp: now(), userId: 'admin', ...data };
    this._db.activityLog = this._db.activityLog || [];
    this._db.activityLog.push(entry);
    if (this._db.activityLog.length > 500) this._db.activityLog = this._db.activityLog.slice(-500);
    // Fire-and-forget write
    apiWrite('activity_logs', 'insert', entry).catch(e => console.warn('Activity log write failed:', e));
    this._notify();
  }

  // ── Waitlist ──────────────────────────────────────────────────────
  getWaitlist(branchId) { return (this._db?.waitlist || []).filter(w => !branchId || w.branchId === branchId); }

  async addToWaitlist(data) {
    const entry = { id: uid('WL'), status: 'waiting', createdAt: now(), priority: 1, ...data };
    await apiWrite('waitlist', 'insert', entry);
    this._db.waitlist.push(entry);
    this._notify();
    return entry;
  }

  // ── Staff ─────────────────────────────────────────────────────────
  getStaff(branchId) { return (this._db?.staff || []).filter(s => !branchId || s.branchId === branchId); }

  async addStaff(data) {
    const staff = { id: uid('STF'), status: 'active', createdAt: now(), ...data };
    await apiWrite('staff', 'insert', staff);
    this._db.staff.push(staff);
    this._notify();
    return staff;
  }

  async deleteStaff(id) {
    await apiWrite('staff', 'delete', {}, id);
    this._db.staff = this._db.staff.filter(s => s.id !== id);
    this._notify();
  }

  // ── Aggregations ──────────────────────────────────────────────────
  getDashboardStats(branchId) {
    const seats = this.getSeatsForBranch(branchId);
    const totalSeats = seats.length;
    const today_ = new Date();

    let occupied = 0, available = 0, reserved = 0, maintenance = 0;
    seats.forEach(seat => {
      const status = this.getSeatStatus(seat.id);
      if (status === 'occupied' || status === 'payment-due' || status === 'expiring') occupied++;
      else if (status === 'available') available++;
      else if (status === 'reserved') reserved++;
      else if (status === 'maintenance' || status === 'blocked') maintenance++;
    });

    const todayPayments = (this._db?.payments || []).filter(p => {
      const d = new Date(p.recordedAt || p.createdAt);
      return d.toDateString() === today_.toDateString();
    });
    const todayRevenue = todayPayments.reduce((sum, p) => sum + p.amount, 0);

    const monthPayments = (this._db?.payments || []).filter(p => {
      const d = new Date(p.recordedAt || p.createdAt);
      return d.getMonth() === today_.getMonth() && d.getFullYear() === today_.getFullYear();
    });
    const monthRevenue = monthPayments.reduce((sum, p) => sum + p.amount, 0);

    const activeMemberships = (this._db?.memberships || []).filter(m => {
      const students = this.getStudents(branchId).map(s => s.id);
      return students.includes(m.studentId) && m.status === 'active';
    });
    let totalPending = 0;
    activeMemberships.forEach(m => { totalPending += this.getPendingAmount(m.id); });

    const nextWeek = new Date(today_);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const expiringCount = activeMemberships.filter(m => {
      const exp = new Date(m.endDate);
      return exp >= today_ && exp <= nextWeek;
    }).length;

    const todayAtt = this.getTodayAttendance();
    const branchStudentIds = this.getStudents(branchId).map(s => s.id);
    const presentToday = todayAtt.filter(a => branchStudentIds.includes(a.studentId)).length;

    return { totalSeats, occupied, available, reserved, maintenance, todayRevenue, monthRevenue, totalPending, expiringCount, presentToday };
  }

  getExpiringMemberships(branchId, days = 7) {
    const today_ = new Date();
    const future = new Date(today_);
    future.setDate(future.getDate() + days);

    const studentIds = this.getStudents(branchId).map(s => s.id);
    return (this._db?.memberships || [])
      .filter(m => {
        if (!studentIds.includes(m.studentId)) return false;
        if (m.status !== 'active') return false;
        const exp = new Date(m.endDate);
        return exp >= today_ && exp <= future;
      })
      .map(m => {
        const student = this.getStudent(m.studentId);
        const assignment = this.getStudentAssignment(m.studentId);
        const seat = assignment ? this.getSeat(assignment.seatId) : null;
        const daysLeft = Math.ceil((new Date(m.endDate) - today_) / (1000 * 60 * 60 * 24));
        return { ...m, student, seat, daysLeft };
      })
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }

  getPendingDues(branchId) {
    const studentIds = this.getStudents(branchId).map(s => s.id);
    const result = [];
    const today_ = new Date();

    (this._db?.memberships || []).forEach(m => {
      if (!studentIds.includes(m.studentId)) return;
      if (m.status !== 'active') return;
      const pending = this.getPendingAmount(m.id);
      if (pending <= 0) return;

      const student = this.getStudent(m.studentId);
      const assignment = this.getStudentAssignment(m.studentId);
      const seat = assignment ? this.getSeat(assignment.seatId) : null;
      const daysDue = Math.ceil((today_ - new Date(m.startDate)) / (1000 * 60 * 60 * 24));

      result.push({ membership: m, student, seat, pendingAmount: pending, daysDue });
    });

    return result.sort((a, b) => b.pendingAmount - a.pendingAmount);
  }

  getRevenueChart(branchId, days = 7) {
    const result = [];
    const today_ = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today_);
      d.setDate(d.getDate() - i);
      const dateStr = d.toDateString();

      const dayPayments = (this._db?.payments || []).filter(p =>
        new Date(p.recordedAt || p.createdAt).toDateString() === dateStr
      );
      const amount = dayPayments.reduce((sum, p) => sum + p.amount, 0);
      result.push({ date: d, label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), amount });
    }

    return result;
  }

  getOccupancyData(branchId) {
    const stats = this.getDashboardStats(branchId);
    return [
      { label: 'Occupied', value: stats.occupied, color: 'var(--sf-indigo-500)' },
      { label: 'Available', value: stats.available, color: 'var(--sf-success-500)' },
      { label: 'Reserved', value: stats.reserved, color: 'var(--sf-orange-500)' },
      { label: 'Maintenance', value: stats.maintenance, color: 'var(--sf-gray-400)' },
    ];
  }

  // ── Settings ──────────────────────────────────────────────────────
  getSettings() { return this._db?.settings || {}; }

  async updateSettings(updates) {
    this._db.settings = { ...(this._db?.settings || {}), ...updates };
    await apiWrite('settings', 'update', this._db.settings);
    this._notify();
  }
}

// ── Utilities ──────────────────────────────────────────────────────
function uid(prefix) {
  return `${prefix}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
}

function now() { return new Date().toISOString(); }
function today() { return new Date().toISOString().split('T')[0]; }

function formatINR(amount) {
  if (amount === undefined || amount === null) return '—';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

function getAvatarColor(name) {
  const colors = [
    '#6172f3', '#444ce7', '#3538cd',
    '#17b26a', '#079455', '#067647',
    '#f79009', '#dc6803', '#b54708',
    '#f04438', '#d92d20', '#b42318',
    '#0ba5ec', '#0086c9', '#026aa2',
    '#ee46bc', '#dd2590', '#c11574',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function initials(name) {
  if (!name) return '?';
  const parts = name.split(' ').filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function formatDate(iso, opts) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('en-IN', opts || { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return '—';
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function formatRelative(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const now_ = new Date();
  const diff = now_ - d;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return formatDate(iso);
}

function daysUntil(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  const now_ = new Date();
  return Math.ceil((d - now_) / (1000 * 60 * 60 * 24));
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function normalizePhone(phone, defaultCountry = '+91') {
  if (!phone) return '';
  const cleaned = String(phone).replace(/[^0-9+]/g, '');
  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.length === 10) return `${defaultCountry}${cleaned}`;
  if (cleaned.startsWith('91') && cleaned.length === 12) return `+${cleaned}`;
  return `${defaultCountry}${cleaned}`;
}

window.Store = Store;
window.store = new Store();
window.utils = { uid, now, today, formatINR, getAvatarColor, initials, formatDate, formatTime, formatRelative, daysUntil, addDays, normalizePhone };


// ─── SERVICE: whatsapp-provider.js ───
(function() {
// StudyFlow — WhatsApp Provider Abstraction Layer
// Supports Mock (Development), Meta WhatsApp Cloud API, and Twilio

class BaseWhatsAppProvider {
  constructor(name) {
    this.name = name;
  }

  async sendTemplateMessage(params) {
    throw new Error('sendTemplateMessage must be implemented by provider');
  }

  async sendTextMessage(params) {
    throw new Error('sendTextMessage must be implemented by provider');
  }

  async sendDocument(params) {
    throw new Error('sendDocument must be implemented by provider');
  }

  async getMessageStatus(providerMessageId) {
    throw new Error('getMessageStatus must be implemented by provider');
  }
}

// ─── 1. Mock WhatsApp Provider (Development & Testing) ────────────────────────
class MockWhatsAppProvider extends BaseWhatsAppProvider {
  constructor() {
    super('MockWhatsAppProvider');
    this.simulatedFailureRate = 0; // 0 to 1
    this._logs = []; // In-memory log store (replaces localStorage)
  }

  setSimulatedFailureRate(rate) {
    this.simulatedFailureRate = Math.max(0, Math.min(1, rate));
  }

  async sendTemplateMessage({ to, templateName, language = 'en', variables = {}, document = null }) {
    const providerMessageId = `mock_wa_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    // Simulate slight network delay
    await new Promise(r => setTimeout(r, 180));

    if (this.simulatedFailureRate > 0 && Math.random() < this.simulatedFailureRate) {
      return {
        success: false,
        providerMessageId,
        status: 'FAILED',
        error: 'Simulated WhatsApp delivery failure (Mock Provider)',
        timestamp: new Date().toISOString()
      };
    }

    const logEntry = {
      providerMessageId,
      provider: 'mock',
      to,
      templateName,
      language,
      variables,
      document,
      status: 'SENT',
      createdAt: new Date().toISOString(),
      sentAt: new Date().toISOString(),
      deliveredAt: new Date(Date.now() + 500).toISOString(),
      readAt: null
    };

    // Store in mock delivery logs for debugging
    this._saveMockLog(logEntry);

    return {
      success: true,
      providerMessageId,
      status: 'SENT',
      log: logEntry,
      timestamp: new Date().toISOString()
    };
  }

  async sendTextMessage({ to, text }) {
    const providerMessageId = `mock_wa_text_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    await new Promise(r => setTimeout(r, 150));

    const logEntry = {
      providerMessageId,
      provider: 'mock',
      to,
      text,
      status: 'SENT',
      createdAt: new Date().toISOString(),
      sentAt: new Date().toISOString()
    };
    this._saveMockLog(logEntry);

    return {
      success: true,
      providerMessageId,
      status: 'SENT',
      log: logEntry,
      timestamp: new Date().toISOString()
    };
  }

  async sendDocument({ to, documentUrl, filename, caption = '' }) {
    const providerMessageId = `mock_wa_doc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    await new Promise(r => setTimeout(r, 220));

    const logEntry = {
      providerMessageId,
      provider: 'mock',
      to,
      documentUrl,
      filename,
      caption,
      status: 'SENT',
      createdAt: new Date().toISOString()
    };
    this._saveMockLog(logEntry);

    return {
      success: true,
      providerMessageId,
      status: 'SENT',
      log: logEntry,
      timestamp: new Date().toISOString()
    };
  }

  async getMessageStatus(providerMessageId) {
    const logs = this._getMockLogs();
    const entry = logs.find(l => l.providerMessageId === providerMessageId);
    if (!entry) return { status: 'UNKNOWN' };
    return { status: entry.status, deliveredAt: entry.deliveredAt, readAt: entry.readAt };
  }

  _saveMockLog(entry) {
    this._logs.unshift(entry);
    if (this._logs.length > 200) this._logs.pop();
  }

  _getMockLogs() {
    return this._logs;
  }
}

// ─── 2. Meta WhatsApp Cloud API Provider ─────────────────────────────────────
class MetaWhatsAppProvider extends BaseWhatsAppProvider {
  constructor(config = {}) {
    super('MetaWhatsAppProvider');
    this.apiUrl = config.apiUrl || 'https://graph.facebook.com/v19.0';
    this.phoneNumberId = config.phoneNumberId || '';
    this.accessToken = config.accessToken || '';
    this.businessAccountId = config.businessAccountId || '';
  }

  async sendTemplateMessage({ to, templateName, language = 'en', variables = {}, document = null }) {
    try {
      const response = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, templateName, language, variables, document })
      });

      const data = await response.json();
      if (!response.ok || !data.ok) {
        return {
          success: false,
          error: data.error || 'WhatsApp delivery failed',
          status: 'FAILED',
          details: data
        };
      }

      return {
        success: true,
        providerMessageId: data.providerMessageId || `meta_${Date.now()}`,
        status: data.status || 'SENT',
        timestamp: new Date().toISOString()
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
        status: 'FAILED'
      };
    }
  }

  async sendTextMessage({ to, text }) {
    try {
      const response = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, customText: text })
      });
      const data = await response.json();
      return {
        success: response.ok && data.ok,
        providerMessageId: data.providerMessageId,
        status: data.status || 'SENT',
        error: data.error
      };
    } catch (e) {
      return { success: false, error: e.message, status: 'FAILED' };
    }
  }

  async sendDocument({ to, documentUrl, filename, caption = '' }) {
    try {
      const response = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to,
          document: { url: documentUrl, filename: filename || 'Invoice.pdf', caption }
        })
      });
      const data = await response.json();
      return {
        success: response.ok && data.ok,
        providerMessageId: data.providerMessageId,
        status: data.status || 'SENT',
        error: data.error
      };
    } catch (e) {
      return { success: false, error: e.message, status: 'FAILED' };
    }
  }
}

// ─── 3. Twilio WhatsApp Provider ─────────────────────────────────────────────
class TwilioWhatsAppProvider extends BaseWhatsAppProvider {
  constructor(config = {}) {
    super('TwilioWhatsAppProvider');
    this.accountSid = config.accountSid || '';
    this.authToken = config.authToken || '';
    this.fromNumber = config.fromNumber || ''; // e.g. whatsapp:+14155238886
  }

  async sendTemplateMessage({ to, variables = {}, document = null }) {
    // Basic text/media dispatch for Twilio sandbox/messaging
    const bodyText = Object.entries(variables).map(([k, v]) => `${k}: ${v}`).join('\n');
    return this.sendTextMessage({ to, text: bodyText, mediaUrl: document?.url });
  }

  async sendTextMessage({ to, text, mediaUrl = null }) {
    if (!this.accountSid || !this.authToken) {
      return { success: false, error: 'Twilio credentials missing', status: 'FAILED' };
    }

    const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
    const params = new URLSearchParams();
    params.append('From', this.fromNumber);
    params.append('To', formattedTo);
    params.append('Body', text);
    if (mediaUrl) params.append('MediaUrl', mediaUrl);

    try {
      const auth = btoa(`${this.accountSid}:${this.authToken}`);
      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });
      const data = await response.json();
      return {
        success: response.ok,
        providerMessageId: data.sid,
        status: response.ok ? 'SENT' : 'FAILED',
        error: data.message
      };
    } catch (e) {
      return { success: false, error: e.message, status: 'FAILED' };
    }
  }
}

// ─── 4. Provider Factory & Global Registry ────────────────────────────────────
const providers = {
  mock: new MockWhatsAppProvider(),
  meta: null,
  twilio: null
};

function getWhatsAppProvider(customConfig = null) {
  let providerType = 'mock';
  try {
    if (typeof store !== 'undefined' && store.getSettings) {
      const settings = store.getSettings();
      providerType = settings.whatsappProvider || 'mock';
    }
  } catch (e) {}

  if (providerType === 'meta') {
    if (!providers.meta || customConfig) {
      providers.meta = new MetaWhatsAppProvider(customConfig || {});
    }
    return providers.meta;
  }

  if (providerType === 'twilio') {
    if (!providers.twilio || customConfig) {
      providers.twilio = new TwilioWhatsAppProvider(customConfig || {});
    }
    return providers.twilio;
  }

  return providers.mock;
}

if (typeof window !== 'undefined') {
  window.MockWhatsAppProvider = MockWhatsAppProvider;
  window.MetaWhatsAppProvider = MetaWhatsAppProvider;
  window.TwilioWhatsAppProvider = TwilioWhatsAppProvider;
  window.getWhatsAppProvider = getWhatsAppProvider;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    MockWhatsAppProvider,
    MetaWhatsAppProvider,
    TwilioWhatsAppProvider,
    getWhatsAppProvider
  };
}

})();

// ─── SERVICE: invoice-generator.js ───
(function() {
// StudyFlow — Professional Invoice & Receipt Document Generator

const invoiceGenerator = {
  // ── 1. Generate Invoice ──────────────────────────────────────────
  generateInvoice({ membershipId, studentId, seatId, paymentId = null }) {
    const student = store.getStudent(studentId);
    const membership = store.getMembership(membershipId);
    const seat = seatId ? store.getSeat(seatId) : (membership?.seatId ? store.getSeat(membership.seatId) : null);
    const room = seat?.roomId ? store.getRoom(seat.roomId) : null;
    const floor = room?.floorId ? store.getFloor(room.floorId) : null;
    const branchId = membership?.branchId || seat?.branchId || store.getActiveBranchId();
    const branch = store.getBranch(branchId);
    const settings = store.getSettings();

    const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
    const payment = paymentId ? store.getPayment(paymentId) : (membership ? store.getPaymentsForMembership(membership.id)[0] : null);

    const baseAmount = membership?.price || 0;
    const discount = membership?.discount || 0;
    const finalAmount = membership?.finalAmount || (baseAmount - discount);
    const paidAmount = payment?.amount || (membership?.paymentStatus === 'paid' ? finalAmount : 0);
    const pendingAmount = Math.max(0, finalAmount - paidAmount);

    const docId = `DOC-${utils.uid()}`;
    const documentData = {
      id: docId,
      documentType: 'invoice',
      documentNumber: invoiceNumber,
      date: utils.today(),
      createdAt: new Date().toISOString(),
      studentId: student?.id,
      studentName: student?.name,
      studentPhone: student?.phone || student?.normalized_phone,
      branchId: branch?.id,
      branchName: branch?.name,
      branchAddress: branch?.address,
      branchPhone: branch?.phone,
      branchEmail: branch?.email,
      membershipId: membership?.id,
      planName: membership?.planName || 'Study Space Access',
      startDate: membership?.startDate,
      endDate: membership?.endDate,
      seatNumber: seat?.label || seat?.number || 'Flexible',
      roomName: room?.name || 'Study Hall',
      floorName: floor?.name || 'Main Floor',
      baseAmount,
      discount,
      finalAmount,
      paidAmount,
      pendingAmount,
      paymentMethod: payment?.method || payment?.mode || 'UPI',
      paymentRef: payment?.referenceNumber || payment?.receiptNumber || 'N/A',
      paymentDate: payment?.date || utils.today(),
      status: pendingAmount === 0 ? 'PAID' : (paidAmount > 0 ? 'PARTIAL' : 'PENDING'),
      currency: settings?.currency || 'INR'
    };

    // Store in documents table
    store.saveDocument(documentData);

    return documentData;
  },

  // ── 2. Generate Payment Receipt ──────────────────────────────────
  generateReceipt({ paymentId, studentId = null, membershipId = null }) {
    const payment = store.getPayment(paymentId);
    const mId = membershipId || payment?.membershipId;
    const membership = mId ? store.getMembership(mId) : null;
    const sId = studentId || payment?.studentId || membership?.studentId;
    const student = store.getStudent(sId);
    const seat = membership?.seatId ? store.getSeat(membership.seatId) : null;
    const room = seat?.roomId ? store.getRoom(seat.roomId) : null;
    const branchId = payment?.branchId || membership?.branchId || store.getActiveBranchId();
    const branch = store.getBranch(branchId);
    const settings = store.getSettings();

    const receiptNumber = payment?.receiptNumber || `REC-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
    const docId = `DOC-${utils.uid()}`;

    const documentData = {
      id: docId,
      documentType: 'receipt',
      documentNumber: receiptNumber,
      date: payment?.date || utils.today(),
      createdAt: new Date().toISOString(),
      studentId: student?.id,
      studentName: student?.name,
      studentPhone: student?.phone || student?.normalized_phone,
      branchId: branch?.id,
      branchName: branch?.name,
      branchAddress: branch?.address,
      branchPhone: branch?.phone,
      membershipId: membership?.id,
      planName: membership?.planName || 'Study Space Access',
      startDate: membership?.startDate,
      endDate: membership?.endDate,
      seatNumber: seat?.label || 'General',
      roomName: room?.name || 'Study Area',
      amount: payment?.amount || 0,
      paymentMethod: payment?.method || payment?.mode || 'UPI',
      paymentRef: payment?.referenceNumber || 'N/A',
      status: 'SUCCESS',
      currency: settings?.currency || 'INR'
    };

    store.saveDocument(documentData);
    return documentData;
  },

  // ── 3. Render Branded Document HTML ──────────────────────────────
  renderDocumentHTML(doc) {
    const isReceipt = doc.documentType === 'receipt';
    const statusColor = doc.status === 'PAID' || doc.status === 'SUCCESS' ? '#079455' : (doc.status === 'PARTIAL' ? '#dc6803' : '#d92d20');

    return `
      <div class="sf-invoice-sheet" id="invoice-sheet-${doc.id}" style="
        background: #ffffff;
        color: #181d27;
        font-family: 'Inter', -apple-system, sans-serif;
        padding: 36px 40px;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.06);
        max-width: 720px;
        margin: 0 auto;
        line-height: 1.5;
        border: 1px solid #e9eaeb;
      ">
        <!-- Document Header -->
        <div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:24px;border-bottom:1px solid #e9eaeb;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="
              width:44px;height:44px;border-radius:10px;
              background:linear-gradient(135deg, #181d27 0%, #252b37 100%);
              color:#ffffff;display:flex;align-items:center;justify-content:center;
              font-weight:700;font-size:18px;letter-spacing:-0.5px;
            ">SF</div>
            <div>
              <div style="font-size:18px;font-weight:700;color:#181d27;letter-spacing:-0.3px;">StudyFlow</div>
              <div style="font-size:12px;color:#535862;">${doc.branchName || 'Main Study Library'}</div>
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:20px;font-weight:700;color:#181d27;text-transform:uppercase;letter-spacing:0.5px;">
              ${isReceipt ? 'Payment Receipt' : 'Tax Invoice'}
            </div>
            <div style="font-size:13px;font-weight:600;color:#535862;margin-top:2px;">
              # ${doc.documentNumber}
            </div>
            <div style="display:inline-block;margin-top:6px;padding:2px 10px;border-radius:9999px;font-size:11px;font-weight:600;background:${statusColor}15;color:${statusColor};border:1px solid ${statusColor}40;">
              ● ${doc.status}
            </div>
          </div>
        </div>

        <!-- Meta Details: Two Columns -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;padding:20px 0;border-bottom:1px solid #e9eaeb;">
          <div>
            <div style="font-size:11px;font-weight:600;text-transform:uppercase;color:#717680;letter-spacing:0.5px;margin-bottom:6px;">Billed To</div>
            <div style="font-size:15px;font-weight:600;color:#181d27;">${doc.studentName || 'Student'}</div>
            <div style="font-size:13px;color:#535862;margin-top:2px;">Phone: ${doc.studentPhone || 'N/A'}</div>
            ${doc.studentId ? `<div style="font-size:12px;color:#717680;">Student ID: ${doc.studentId}</div>` : ''}
          </div>
          <div style="text-align:right;">
            <div style="font-size:11px;font-weight:600;text-transform:uppercase;color:#717680;letter-spacing:0.5px;margin-bottom:6px;">Library Details</div>
            <div style="font-size:13px;font-weight:500;color:#181d27;">${doc.branchAddress || 'Mumbai, Maharashtra'}</div>
            <div style="font-size:13px;color:#535862;">Support: ${doc.branchPhone || '+91 98765 43210'}</div>
            <div style="font-size:12px;color:#717680;margin-top:4px;">Date: ${doc.date}</div>
          </div>
        </div>

        <!-- Seat & Facility Breakdown Card -->
        <div style="background:#fafafa;border:1px solid #e9eaeb;border-radius:8px;padding:16px;margin:20px 0;">
          <div style="font-size:11px;font-weight:600;text-transform:uppercase;color:#717680;letter-spacing:0.5px;margin-bottom:10px;">Allocated Facility</div>
          <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:12px;text-align:center;">
            <div style="background:#ffffff;padding:8px;border-radius:6px;border:1px solid #e9eaeb;">
              <div style="font-size:11px;color:#717680;">Seat</div>
              <div style="font-size:14px;font-weight:700;color:#181d27;">${doc.seatNumber || 'N/A'}</div>
            </div>
            <div style="background:#ffffff;padding:8px;border-radius:6px;border:1px solid #e9eaeb;">
              <div style="font-size:11px;color:#717680;">Room</div>
              <div style="font-size:13px;font-weight:600;color:#181d27;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${doc.roomName || 'General'}</div>
            </div>
            <div style="background:#ffffff;padding:8px;border-radius:6px;border:1px solid #e9eaeb;">
              <div style="font-size:11px;color:#717680;">Plan</div>
              <div style="font-size:13px;font-weight:600;color:#181d27;">${doc.planName || 'Monthly'}</div>
            </div>
            <div style="background:#ffffff;padding:8px;border-radius:6px;border:1px solid #e9eaeb;">
              <div style="font-size:11px;color:#717680;">Valid Until</div>
              <div style="font-size:13px;font-weight:600;color:#181d27;">${doc.endDate || 'N/A'}</div>
            </div>
          </div>
        </div>

        <!-- Line Item Table -->
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
          <thead>
            <tr style="border-bottom:1px solid #e9eaeb;background:#fafafa;">
              <th style="padding:10px 12px;text-align:left;font-size:12px;font-weight:600;color:#535862;">Description</th>
              <th style="padding:10px 12px;text-align:center;font-size:12px;font-weight:600;color:#535862;">Period</th>
              <th style="padding:10px 12px;text-align:right;font-size:12px;font-weight:600;color:#535862;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom:1px solid #e9eaeb;">
              <td style="padding:12px;font-size:13px;font-weight:500;color:#181d27;">
                Library Study Space Access (${doc.planName})
                <div style="font-size:12px;color:#717680;">Seat ${doc.seatNumber}, ${doc.roomName}</div>
              </td>
              <td style="padding:12px;text-align:center;font-size:12px;color:#535862;">
                ${doc.startDate || ''} to ${doc.endDate || ''}
              </td>
              <td style="padding:12px;text-align:right;font-size:14px;font-weight:600;color:#181d27;">
                ₹${(doc.baseAmount || doc.amount || 0).toLocaleString('en-IN')}
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Totals & Payment Breakdown -->
        <div style="display:flex;justify-content:space-between;align-items:flex-start;padding:12px 0 24px;border-bottom:1px solid #e9eaeb;">
          <div style="font-size:12px;color:#535862;max-width:280px;">
            <div style="font-weight:600;color:#181d27;margin-bottom:4px;">Payment Method: ${doc.paymentMethod || 'UPI'}</div>
            <div>Reference / Txn: <code style="background:#f5f5f5;padding:2px 6px;border-radius:4px;font-size:11px;">${doc.paymentRef || 'Verified'}</code></div>
            <div style="margin-top:2px;">Paid On: ${doc.paymentDate || doc.date}</div>
          </div>
          <div style="min-width:220px;">
            ${doc.discount > 0 ? `
              <div style="display:flex;justify-content:space-between;font-size:13px;color:#535862;margin-bottom:6px;">
                <span>Discount</span>
                <span style="color:#079455;">- ₹${doc.discount.toLocaleString('en-IN')}</span>
              </div>
            ` : ''}
            <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:600;color:#181d27;margin-bottom:8px;">
              <span>Total Fee</span>
              <span>₹${(doc.finalAmount || doc.amount || 0).toLocaleString('en-IN')}</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:600;color:#079455;margin-bottom:6px;">
              <span>Amount Paid</span>
              <span>₹${(doc.paidAmount || doc.amount || 0).toLocaleString('en-IN')}</span>
            </div>
            ${doc.pendingAmount > 0 ? `
              <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:700;color:#d92d20;padding-top:6px;border-top:1px dashed #e9eaeb;">
                <span>Balance Due</span>
                <span>₹${doc.pendingAmount.toLocaleString('en-IN')}</span>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Footer -->
        <div style="display:flex;justify-content:space-between;align-items:center;padding-top:20px;font-size:12px;color:#717680;">
          <div>
            <div style="font-weight:600;color:#181d27;">Thank you for studying with StudyFlow!</div>
            <div>This is a computer generated document and requires no physical signature.</div>
          </div>
          <div style="text-align:right;">
            <div style="font-weight:600;color:#181d27;">StudyFlow Systems</div>
            <div style="font-size:11px;">studyflow.in</div>
          </div>
        </div>
      </div>
    `;
  },

  // ── 4. Document Modal & Actions ──────────────────────────────────
  previewDocument(docId) {
    const doc = store.getDocument(docId);
    if (!doc) {
      toast.show('Document not found', 'error');
      return;
    }

    const html = this.renderDocumentHTML(doc);
    modal.open(`${doc.documentType === 'receipt' ? 'Receipt' : 'Invoice'} — ${doc.documentNumber}`, `
      <div style="max-height:75vh;overflow-y:auto;padding:12px;">
        ${html}
      </div>
    `, `
      <div style="display:flex;justify-content:space-between;width:100%;align-items:center;">
        <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);">
          Document ID: ${doc.id}
        </div>
        <div style="display:flex;gap:var(--space-2);">
          <button class="btn btn-secondary btn-sm" onclick="invoiceGenerator.printDocument('${doc.id}')">
            ${icons.printer || ''} Print / PDF
          </button>
          <button class="btn btn-secondary btn-sm" onclick="modal.close()">
            Close
          </button>
        </div>
      </div>
    `, { size: 'lg' });
  },

  printDocument(docId) {
    const doc = store.getDocument(docId);
    if (!doc) return;
    const html = this.renderDocumentHTML(doc);
    const win = window.open('', '_blank');
    if (!win) {
      toast.show('Popups blocked. Please allow popups to print.', 'warning');
      return;
    }
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${doc.documentNumber}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          @media print {
            body { margin: 0; padding: 20px; background: #fff !important; }
            .sf-invoice-sheet { box-shadow: none !important; border: none !important; max-width: 100% !important; }
          }
        </style>
      </head>
      <body style="background:#f5f5f5;padding:40px 0;">
        ${html}
        <script>
          setTimeout(() => { window.print(); }, 400);
        <\/script>
      </body>
      </html>
    `);
    win.document.close();
  }
};

if (typeof window !== 'undefined') {
  window.invoiceGenerator = invoiceGenerator;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { invoiceGenerator };
}

})();

// ─── SERVICE: notification-service.js ───
(function() {
// StudyFlow — Decoupled Notification & Communication Service
// Manages Event Bus, Safe Template Engine, Multi-language Support, Idempotency & Queue

const NOTIFICATION_EVENTS = {
  SEAT_ASSIGNED: 'SEAT_ASSIGNED',
  SEAT_TRANSFERRED: 'SEAT_TRANSFERRED',
  SEAT_RELEASED: 'SEAT_RELEASED',
  PAYMENT_RECEIVED: 'PAYMENT_RECEIVED',
  PAYMENT_DUE: 'PAYMENT_DUE',
  PAYMENT_OVERDUE: 'PAYMENT_OVERDUE',
  MEMBERSHIP_CREATED: 'MEMBERSHIP_CREATED',
  MEMBERSHIP_RENEWED: 'MEMBERSHIP_RENEWED',
  MEMBERSHIP_EXPIRING: 'MEMBERSHIP_EXPIRING',
  MEMBERSHIP_EXPIRED: 'MEMBERSHIP_EXPIRED',
  RESERVATION_CREATED: 'RESERVATION_CREATED',
  IMPORTANT_ANNOUNCEMENT: 'IMPORTANT_ANNOUNCEMENT'
};

// ── Standard Approved WhatsApp Templates (EN, HI, MR) ────────────────────────
const DEFAULT_TEMPLATES = {
  // 1. Seat Assignment Confirmation
  'seat_assignment_confirmation_en': {
    name: 'seat_assignment_confirmation',
    event: 'SEAT_ASSIGNED',
    language: 'en',
    category: 'Booking',
    text: `Hello {{student_name}},

Your StudyFlow library membership has been successfully activated.

Seat: {{seat_number}}
Branch: {{branch_name}}
Room: {{room_name}}

Membership: {{membership_name}}
Start Date: {{start_date}}
Expiry Date: {{expiry_date}}

Amount: ₹{{amount}}
Payment Status: {{payment_status}}

Your invoice/receipt is attached.

Thank you,
{{branch_name}} — StudyFlow`
  },
  'seat_assignment_confirmation_hi': {
    name: 'seat_assignment_confirmation',
    event: 'SEAT_ASSIGNED',
    language: 'hi',
    category: 'Booking',
    text: `नमस्ते {{student_name}},

आपकी StudyFlow लाइब्रेरी सदस्यता सफलतापूर्वक सक्रिय हो गई है।

सीट: {{seat_number}}
शाखा: {{branch_name}}
कमरा: {{room_name}}

सदस्यता योजना: {{membership_name}}
आरंभ तिथि: {{start_date}}
समाप्ति तिथि: {{expiry_date}}

शुल्क: ₹{{amount}}
भुगतान स्थिति: {{payment_status}}

आपका इनवॉइस / रसीद संलग्न है।

धन्यवाद,
{{branch_name}} — StudyFlow`
  },
  'seat_assignment_confirmation_mr': {
    name: 'seat_assignment_confirmation',
    event: 'SEAT_ASSIGNED',
    language: 'mr',
    category: 'Booking',
    text: `नमस्कार {{student_name}},

तुमचे StudyFlow लायब्ररीचे सदस्यत्व यशस्वीरित्या सक्रिय झाले आहे.

सीट क्रमांक: {{seat_number}}
शाखा: {{branch_name}}
खोली: {{room_name}}

प्लॅन: {{membership_name}}
सुरुवात: {{start_date}}
मुदत संपण्याची तारीख: {{expiry_date}}

रक्कम: ₹{{amount}}
पेमेंट स्थिती: {{payment_status}}

आपली पावती सोबत जोडलेली आहे.

धन्यवाद,
{{branch_name}} — StudyFlow`
  },

  // 2. Payment Receipt
  'payment_receipt_en': {
    name: 'payment_receipt',
    event: 'PAYMENT_RECEIVED',
    language: 'en',
    category: 'Payments',
    text: `Hello {{student_name}},

We have received your payment.

Amount: ₹{{amount}}
Payment Method: {{payment_method}}
Receipt: {{receipt_number}}
Date: {{payment_date}}

Your official receipt is attached.

Thank you,
{{branch_name}} — StudyFlow`
  },
  'payment_receipt_hi': {
    name: 'payment_receipt',
    event: 'PAYMENT_RECEIVED',
    language: 'hi',
    category: 'Payments',
    text: `नमस्ते {{student_name}},

हमें आपका भुगतान प्राप्त हो गया है।

राशि: ₹{{amount}}
भुगतान माध्यम: {{payment_method}}
रसीद संख्या: {{receipt_number}}
तारीख: {{payment_date}}

आपकी आधिकारिक रसीद संलग्न है।

धन्यवाद,
{{branch_name}} — StudyFlow`
  },
  'payment_receipt_mr': {
    name: 'payment_receipt',
    event: 'PAYMENT_RECEIVED',
    language: 'mr',
    category: 'Payments',
    text: `नमस्कार {{student_name}},

आम्हाला आपले पेमेंट प्राप्त झाले आहे.

रक्कम: ₹{{amount}}
पेमेंट पद्धत: {{payment_method}}
पावती क्र.: {{receipt_number}}
तारीख: {{payment_date}}

आपली पावती सोबत जोडली आहे.

धन्यवाद,
{{branch_name}} — StudyFlow`
  },

  // 3. Payment Due Reminder
  'payment_due_reminder_en': {
    name: 'payment_due_reminder',
    event: 'PAYMENT_DUE',
    language: 'en',
    category: 'Payments',
    text: `Hello {{student_name}},

This is a reminder from StudyFlow.

Your library membership fee is due.

Seat: {{seat_number}}
Amount Due: ₹{{amount}}
Due Date: {{due_date}}

Please contact the library or complete the payment to maintain uninterrupted access.

Thank you,
{{branch_name}}`
  },

  // 4. Overdue Notice
  'payment_overdue_notice_en': {
    name: 'payment_overdue_notice',
    event: 'PAYMENT_OVERDUE',
    language: 'en',
    category: 'Payments',
    text: `Hello {{student_name}},

Your StudyFlow library fee is currently overdue.

Seat: {{seat_number}}
Outstanding Amount: ₹{{amount}}
Due Since: {{due_date}}

Please contact the library desk to clear the outstanding balance and retain your assigned seat.

Thank you,
{{branch_name}}`
  },

  // 5. Membership Expiry Reminder
  'membership_expiring_reminder_en': {
    name: 'membership_expiring_reminder',
    event: 'MEMBERSHIP_EXPIRING',
    language: 'en',
    category: 'Membership',
    text: `Hello {{student_name}},

Your StudyFlow membership is expiring soon.

Seat: {{seat_number}}
Expiry Date: {{expiry_date}}

Renew your membership in advance to retain your dedicated seat.

Please visit the front desk for seamless renewal.

Thank you,
{{branch_name}}`
  },

  // 6. Seat Transfer Confirmation
  'seat_transfer_notification_en': {
    name: 'seat_transfer_notification',
    event: 'SEAT_TRANSFERRED',
    language: 'en',
    category: 'Booking',
    text: `Hello {{student_name}},

Your library seat has been updated.

Previous Seat: {{previous_seat}}
New Seat: {{seat_number}}
Branch: {{branch_name}}
Room: {{room_name}}

Effective From: {{effective_date}}

Please reach out if you have any questions.

Thank you,
{{branch_name}} — StudyFlow`
  },

  // 7. Reservation Confirmation
  'reservation_confirmation_en': {
    name: 'reservation_confirmation',
    event: 'RESERVATION_CREATED',
    language: 'en',
    category: 'Reservations',
    text: `Hello {{student_name}},

Your study desk reservation is confirmed!

Seat: {{seat_number}}
Room: {{room_name}}
Date: {{reservation_date}}
Time Slot: {{start_time}} to {{end_time}}

We look forward to hosting your study session.

Thank you,
{{branch_name}} — StudyFlow`
  }
};

class NotificationService {
  constructor() {
    this.templates = { ...DEFAULT_TEMPLATES };
    this.isProcessingQueue = false;
  }

  // ── Template Engine ──────────────────────────────────────────────
  getTemplate(templateName, language = 'en') {
    const keyWithLang = `${templateName}_${language}`;
    if (this.templates[keyWithLang]) return this.templates[keyWithLang];
    // Fallback to English
    const fallbackKey = `${templateName}_en`;
    return this.templates[fallbackKey] || null;
  }

  renderTemplate(templateText, variables = {}) {
    if (!templateText) return '';
    // Safe variable substitution: only replace {{var_name}} with string values
    return templateText.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => {
      if (variables[key] !== undefined && variables[key] !== null) {
        return String(variables[key]);
      }
      return match;
    });
  }

  // ── Event Dispatcher & Message Queue ─────────────────────────────
  async dispatch(eventType, payload, options = {}) {
    const studentId = payload.studentId;
    const student = store.getStudent(studentId);

    if (!student) {
      console.warn(`[NotificationService] Student not found for ID: ${studentId}`);
      return { queued: false, reason: 'student_not_found' };
    }

    // Normalization & Consent Checks
    const normalizedPhone = student.normalized_phone || student.phone;
    if (!normalizedPhone) {
      console.warn(`[NotificationService] Student ${student.name} has no valid phone number`);
      return { queued: false, reason: 'no_phone' };
    }

    const optIn = student.whatsapp_opt_in !== false;
    const prefs = student.communication_preferences || {
      whatsapp: true,
      payment_reminders: true,
      membership_reminders: true,
      booking_notifications: true,
      receipt_notifications: true
    };

    // Category Preference Enforcement
    if (!optIn || prefs.whatsapp === false) {
      console.log(`[NotificationService] Skipped: Student ${student.name} has opted out of WhatsApp.`);
      return { queued: false, reason: 'opted_out' };
    }

    if (eventType === NOTIFICATION_EVENTS.PAYMENT_DUE || eventType === NOTIFICATION_EVENTS.PAYMENT_OVERDUE) {
      if (prefs.payment_reminders === false) return { queued: false, reason: 'preference_disabled' };
    }
    if (eventType === NOTIFICATION_EVENTS.MEMBERSHIP_EXPIRING || eventType === NOTIFICATION_EVENTS.MEMBERSHIP_EXPIRED) {
      if (prefs.membership_reminders === false) return { queued: false, reason: 'preference_disabled' };
    }
    if (eventType === NOTIFICATION_EVENTS.SEAT_ASSIGNED || eventType === NOTIFICATION_EVENTS.SEAT_TRANSFERRED) {
      if (prefs.booking_notifications === false) return { queued: false, reason: 'preference_disabled' };
    }
    if (eventType === NOTIFICATION_EVENTS.PAYMENT_RECEIVED) {
      if (prefs.receipt_notifications === false) return { queued: false, reason: 'preference_disabled' };
    }

    // Idempotency Protection
    const idempotencyKey = options.idempotencyKey || `${eventType}:${payload.entityId || studentId}:${payload.qualifier || utils.today()}`;
    const existingMsg = store.getNotificationMessageByIdempotency(idempotencyKey);
    if (existingMsg && (existingMsg.status === 'SENT' || existingMsg.status === 'DELIVERED' || existingMsg.status === 'READ')) {
      console.log(`[NotificationService] Skipped duplicate message with idempotencyKey: ${idempotencyKey}`);
      return { queued: false, duplicate: true, messageId: existingMsg.id };
    }

    // Select Template & Language
    const preferredLang = student.preferred_language || 'en';
    const templateName = options.templateName || this._getTemplateNameForEvent(eventType);
    const template = this.getTemplate(templateName, preferredLang);
    const bodyText = template ? this.renderTemplate(template.text, payload.variables || {}) : (options.customText || '');

    const messageRecord = {
      id: `NOTIF-MSG-${utils.uid()}`,
      studentId: student.id,
      studentName: student.name,
      phoneNumber: normalizedPhone,
      eventType,
      templateName,
      language: preferredLang,
      bodyText,
      variables: payload.variables || {},
      documentId: payload.documentId || null,
      documentNumber: payload.documentNumber || null,
      documentType: payload.documentType || null,
      idempotencyKey,
      status: 'QUEUED',
      retryCount: 0,
      maxRetries: 3,
      createdAt: new Date().toISOString(),
      sentAt: null,
      deliveredAt: null,
      readAt: null,
      failedAt: null,
      failureReason: null
    };

    // Save to store queue
    store.saveNotificationMessage(messageRecord);

    // Asynchronous Execution (Decoupled from booking flow)
    setTimeout(() => {
      this.processMessage(messageRecord.id);
    }, 100);

    return {
      queued: true,
      messageId: messageRecord.id,
      documentId: payload.documentId,
      status: 'QUEUED'
    };
  }

  // ── Worker & Delivery Execution ───────────────────────────────────
  async processMessage(messageId) {
    const msg = store.getNotificationMessage(messageId);
    if (!msg || msg.status === 'SENT' || msg.status === 'DELIVERED' || msg.status === 'READ') return;

    msg.status = 'PROCESSING';
    store.saveNotificationMessage(msg);

    const provider = getWhatsAppProvider();

    try {
      let result;
      const document = msg.documentId ? store.getDocument(msg.documentId) : null;

      if (msg.templateName) {
        result = await provider.sendTemplateMessage({
          to: msg.phoneNumber,
          templateName: msg.templateName,
          language: msg.language,
          variables: msg.variables,
          document: document ? { id: document.id, filename: `${document.documentNumber}.pdf`, url: `http://localhost:5173/api/documents/${document.id}` } : null
        });
      } else {
        result = await provider.sendTextMessage({
          to: msg.phoneNumber,
          text: msg.bodyText
        });
      }

      if (result.success) {
        msg.status = 'SENT';
        msg.sentAt = new Date().toISOString();
        msg.providerMessageId = result.providerMessageId;
        store.saveNotificationMessage(msg);

        // Simulate realistic delivery transition for mock provider
        setTimeout(() => {
          const current = store.getNotificationMessage(messageId);
          if (current && current.status === 'SENT') {
            current.status = 'DELIVERED';
            current.deliveredAt = new Date().toISOString();
            store.saveNotificationMessage(current);
          }
        }, 1200);

      } else {
        throw new Error(result.error || 'Provider rejected message');
      }

    } catch (err) {
      console.error(`[NotificationService] Delivery error for ${messageId}:`, err);
      msg.retryCount += 1;
      if (msg.retryCount >= msg.maxRetries) {
        msg.status = 'FAILED';
        msg.failedAt = new Date().toISOString();
        msg.failureReason = err.message;
      } else {
        msg.status = 'QUEUED'; // Re-queue for next retry attempt
      }
      store.saveNotificationMessage(msg);
    }
  }

  // ── Retry Failed Message ──────────────────────────────────────────
  async retryMessage(messageId) {
    const msg = store.getNotificationMessage(messageId);
    if (!msg) return { success: false, error: 'Message not found' };

    msg.status = 'QUEUED';
    msg.retryCount = 0;
    msg.failureReason = null;
    store.saveNotificationMessage(msg);

    return this.processMessage(messageId);
  }

  // ── Automated Reminder Scheduler ──────────────────────────────────
  async runAutomatedReminders() {
    const branchId = store.getActiveBranchId();
    const activeMemberships = store.getMemberships().filter(m => m.status === 'active');
    let reminderCount = 0;

    for (const mem of activeMemberships) {
      const student = store.getStudent(mem.studentId);
      if (!student) continue;

      const seat = mem.seatId ? store.getSeat(mem.seatId) : null;
      const daysUntilExpiry = utils.daysUntil(mem.endDate);
      const branch = store.getBranch(mem.branchId || branchId);

      // Expiry Reminders (7d, 3d, 1d)
      if (daysUntilExpiry === 7 || daysUntilExpiry === 3 || daysUntilExpiry === 1) {
        const idempKey = `membership_expiring:${mem.id}:${daysUntilExpiry}d`;
        const res = await this.dispatch(NOTIFICATION_EVENTS.MEMBERSHIP_EXPIRING, {
          studentId: student.id,
          entityId: mem.id,
          qualifier: `${daysUntilExpiry}d`,
          variables: {
            student_name: student.name,
            seat_number: seat?.label || 'General',
            expiry_date: mem.endDate,
            branch_name: branch?.name || 'StudyFlow Library'
          }
        }, { idempotencyKey: idempKey });

        if (res.queued) reminderCount++;
      }

      // Overdue & Fee Due Reminders
      if (mem.paymentStatus === 'pending' || mem.paymentStatus === 'partial') {
        const pendingAmount = mem.finalAmount - (mem.paidAmount || 0);
        if (pendingAmount > 0) {
          const idempKey = `fee_due:${mem.id}:${utils.today()}`;
          const res = await this.dispatch(NOTIFICATION_EVENTS.PAYMENT_DUE, {
            studentId: student.id,
            entityId: mem.id,
            qualifier: 'payment_due',
            variables: {
              student_name: student.name,
              seat_number: seat?.label || 'General',
              amount: pendingAmount,
              due_date: mem.startDate,
              branch_name: branch?.name || 'StudyFlow Library'
            }
          }, { idempotencyKey: idempKey });

          if (res.queued) reminderCount++;
        }
      }
    }

    return { processed: activeMemberships.length, dispatched: reminderCount };
  }

  _getTemplateNameForEvent(eventType) {
    switch (eventType) {
      case NOTIFICATION_EVENTS.SEAT_ASSIGNED: return 'seat_assignment_confirmation';
      case NOTIFICATION_EVENTS.SEAT_TRANSFERRED: return 'seat_transfer_notification';
      case NOTIFICATION_EVENTS.PAYMENT_RECEIVED: return 'payment_receipt';
      case NOTIFICATION_EVENTS.PAYMENT_DUE: return 'payment_due_reminder';
      case NOTIFICATION_EVENTS.PAYMENT_OVERDUE: return 'payment_overdue_notice';
      case NOTIFICATION_EVENTS.MEMBERSHIP_EXPIRING: return 'membership_expiring_reminder';
      case NOTIFICATION_EVENTS.RESERVATION_CREATED: return 'reservation_confirmation';
      default: return 'seat_assignment_confirmation';
    }
  }
}

const notificationService = new NotificationService();

if (typeof window !== 'undefined') {
  window.NOTIFICATION_EVENTS = NOTIFICATION_EVENTS;
  window.notificationService = notificationService;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    NOTIFICATION_EVENTS,
    notificationService
  };
}

})();

// ─── PAGE: dashboard.js ───
(function() {
// Dashboard Page
window.Pages.renderDashboard = function renderDashboard(container) {
  const branchId = store.getActiveBranchId();
  const branch = store.getBranch(branchId);
  const stats = store.getDashboardStats(branchId);
  const expiring = store.getExpiringMemberships(branchId, 14);
  const pendingDues = store.getPendingDues(branchId).slice(0, 5);
  const recentActivity = store.getActivityLogs(8);
  const revenueChart = store.getRevenueChart(branchId, 7);
  const occupancyData = store.getOccupancyData(branchId);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-row">
        <div>
          <h1 class="page-title">${greeting}, Admin 👋</h1>
          <p class="page-subtitle">Here's what's happening at <strong>${branch?.name || 'your library'}</strong> today.</p>
        </div>
        <div style="display:flex;gap:var(--space-3);">
          <button class="btn btn-secondary" onclick="app.navigate('/notifications')">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--sf-success-500);margin-right:6px;"></span>
            WhatsApp Active
          </button>
          <button class="btn btn-secondary" onclick="app.navigate('/seat-map')">
            ${icons.map} View Seat Map
          </button>
          <button class="btn btn-primary" onclick="app.navigate('/students')" id="add-student-btn">
            ${icons.plus} Add Student
          </button>
        </div>
      </div>
    </div>

    <!-- KPI Cards -->
    <div class="grid-4" style="margin-bottom:var(--space-6);">
      ${renderStatCard('Total Seats', stats.totalSeats, '', 'seat-count', '#eef4ff', '#6172f3', icons.map)}
      ${renderStatCard('Occupied', stats.occupied, `${Math.round((stats.occupied/Math.max(stats.totalSeats,1))*100)}% occupancy`, 'occupied', '#eef4ff', '#444ce7', icons.users)}
      ${renderStatCard('Available', stats.available, `${stats.reserved} reserved`, 'available', '#ecfdf3', '#17b26a', icons.checkCircle)}
      ${renderStatCard("Today's Revenue", utils.formatINR(stats.todayRevenue), `${utils.formatINR(stats.monthRevenue)} this month`, 'revenue', '#fef0c7', '#f79009', icons['dollar-sign'])}
    </div>

    <div class="grid-4" style="margin-bottom:var(--space-6);">
      ${renderStatCard('Pending Dues', utils.formatINR(stats.totalPending), 'Total outstanding', 'dues', '#fee4e2', '#f04438', icons['alert-circle'])}
      ${renderStatCard('Expiring Soon', stats.expiringCount, 'Within 14 days', 'expiring', '#fef0c7', '#dc6803', icons.clock)}
      ${renderStatCard("Today's Attendance", stats.presentToday, `of ${store.getStudents(branchId).length} students`, 'attendance', '#ecfdf3', '#079455', icons.checkCircle)}
      ${renderStatCard('Under Maintenance', stats.maintenance, 'Seats blocked', 'maintenance', '#f3f4f6', '#6c737f', icons.tool)}
    </div>

    <!-- WhatsApp & Invoice Automation Banner -->
    <div style="background:linear-gradient(135deg, var(--sf-indigo-900) 0%, #1e1b4b 100%);color:white;border-radius:var(--radius-xl);padding:var(--space-4) var(--space-5);margin-bottom:var(--space-6);display:flex;align-items:center;justify-content:space-between;box-shadow:0 4px 14px rgba(0,0,0,0.08);">
      <div style="display:flex;align-items:center;gap:var(--space-4);">
        <div style="width:44px;height:44px;background:rgba(255,255,255,0.12);border-radius:var(--radius-lg);display:flex;align-items:center;justify-content:center;color:#4ade80;">
          ${icons.bell}
        </div>
        <div>
          <div style="font-size:var(--text-sm);font-weight:var(--fw-bold);display:flex;align-items:center;gap:var(--space-2);">
            <span>WhatsApp & Invoice Automation Active</span>
            <span class="badge" style="background:rgba(74,222,128,0.2);color:#4ade80;font-size:10px;border:none;">● LIVE</span>
          </div>
          <div style="font-size:var(--text-xs);color:rgba(255,255,255,0.7);margin-top:2px;">
            Seat assignments auto-generate tax invoices & receipts with instant WhatsApp delivery.
          </div>
        </div>
      </div>
      <div style="display:flex;gap:var(--space-2);">
        <button class="btn btn-sm" style="background:rgba(255,255,255,0.15);color:white;border:none;" onclick="triggerRunReminders()">
          ${icons.repeat} Run Reminders
        </button>
        <button class="btn btn-sm" style="background:white;color:var(--sf-indigo-950);border:none;font-weight:var(--fw-semibold);" onclick="app.navigate('/notifications')">
          View Logs
        </button>
      </div>
    </div>

    <!-- Charts + Lists Row -->
    <div class="grid-3" style="gap:var(--space-5);margin-bottom:var(--space-6);">
      <!-- Revenue Chart -->
      <div class="card" style="grid-column: span 2;">
        <div class="card-header">
          <div>
            <div class="card-title">Revenue — Last 7 Days</div>
            <div class="card-subtitle">Daily collection at ${branch?.name}</div>
          </div>
          <div class="filter-tabs">
            <button class="filter-tab active">7D</button>
            <button class="filter-tab">30D</button>
            <button class="filter-tab">90D</button>
          </div>
        </div>
        <div class="card-body">
          ${renderRevenueChart(revenueChart)}
        </div>
      </div>

      <!-- Occupancy Donut -->
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">Occupancy</div>
            <div class="card-subtitle">By status</div>
          </div>
        </div>
        <div class="card-body">
          ${renderOccupancyChart(occupancyData, stats.totalSeats)}
        </div>
      </div>
    </div>

    <!-- Bottom row -->
    <div class="grid-3" style="gap:var(--space-5);">
      <!-- Expiring memberships -->
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">Expiring Memberships</div>
            <div class="card-subtitle">Next 14 days</div>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="app.navigate('/memberships')">View All</button>
        </div>
        <div style="max-height:320px;overflow-y:auto;">
          ${expiring.length ? expiring.slice(0,6).map(item => renderExpiryItem(item)).join('') : `
            <div class="empty-state" style="padding:var(--space-8);">
              <div class="empty-icon">${icons.checkCircle}</div>
              <div class="empty-title" style="font-size:var(--text-sm);">No memberships expiring soon</div>
            </div>
          `}
        </div>
      </div>

      <!-- Pending dues -->
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">Pending Dues</div>
            <div class="card-subtitle">Requires collection</div>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="app.navigate('/payments')">View All</button>
        </div>
        <div style="max-height:320px;overflow-y:auto;">
          ${pendingDues.length ? pendingDues.map(item => renderDueItem(item)).join('') : `
            <div class="empty-state" style="padding:var(--space-8);">
              <div class="empty-icon">${icons.checkCircle}</div>
              <div class="empty-title" style="font-size:var(--text-sm);">All dues cleared!</div>
            </div>
          `}
        </div>
      </div>

      <!-- Recent Activity -->
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">Recent Activity</div>
            <div class="card-subtitle">Latest updates</div>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="app.navigate('/activity')">View All</button>
        </div>
        <div class="card-body">
          <div class="timeline">
            ${recentActivity.map(a => renderActivityItem(a)).join('')}
          </div>
        </div>
      </div>
    </div>
  `;

  // Animate cards
  container.querySelectorAll('.stat-card, .card').forEach((el, i) => {
    el.style.animationDelay = `${i * 40}ms`;
    el.classList.add('animate-fadeInUp');
  });
}

function renderStatCard(label, value, sub, id, iconBg, iconColor, iconSvg) {
  return `
    <div class="stat-card" id="stat-${id}">
      <div class="stat-card-top">
        <div class="stat-card-label">${label}</div>
        <div class="stat-card-icon" style="background:${iconBg};color:${iconColor};">${iconSvg}</div>
      </div>
      <div class="stat-card-value">${value}</div>
      ${sub ? `<div class="stat-card-change neutral">${sub}</div>` : ''}
    </div>
  `;
}

function renderRevenueChart(data) {
  const max = Math.max(...data.map(d => d.amount), 1);
  return `
    <div style="display:flex;flex-direction:column;gap:var(--space-3);">
      <div style="display:flex;align-items:flex-end;gap:var(--space-2);height:120px;">
        ${data.map((d, i) => {
          const height = max > 0 ? Math.round((d.amount / max) * 100) : 5;
          const isToday = i === data.length - 1;
          return `
            <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:var(--space-1);height:100%;">
              <div class="tooltip-wrap" style="flex:1;width:100%;display:flex;align-items:flex-end;">
                <div style="width:100%;height:${Math.max(height, 4)}%;background:${isToday ? 'var(--sf-indigo-600)' : 'var(--sf-indigo-200)'};border-radius:var(--radius-xs) var(--radius-xs) 0 0;transition:height 0.5s;cursor:pointer;"
                  onmouseenter="this.style.background='var(--sf-indigo-500)'" onmouseleave="this.style.background='${isToday ? 'var(--sf-indigo-600)' : 'var(--sf-indigo-200)'}'">
                </div>
                <div class="tooltip">${utils.formatINR(d.amount)}</div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
      <div style="display:flex;gap:var(--space-2);">
        ${data.map(d => `<div style="flex:1;text-align:center;font-size:0.625rem;color:var(--color-text-quaternary);">${d.label}</div>`).join('')}
      </div>
    </div>
  `;
}

function renderOccupancyChart(data, total) {
  const occupancyPct = total > 0 ? Math.round((data[0]?.value / total) * 100) : 0;
  return `
    <div style="display:flex;flex-direction:column;gap:var(--space-4);">
      <!-- Donut chart simulation with CSS -->
      <div style="position:relative;display:flex;align-items:center;justify-content:center;height:140px;">
        <svg viewBox="0 0 140 140" width="140" height="140">
          ${renderDonutSegments(data, total)}
        </svg>
        <div style="position:absolute;text-align:center;">
          <div style="font-size:var(--text-2xl);font-weight:var(--fw-bold);color:var(--color-text-primary);">${occupancyPct}%</div>
          <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);">Occupied</div>
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:var(--space-2);">
        ${data.map(d => `
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <div style="display:flex;align-items:center;gap:var(--space-2);">
              <div style="width:10px;height:10px;border-radius:var(--radius-sm);background:${d.color};flex-shrink:0;"></div>
              <span style="font-size:var(--text-xs);color:var(--color-text-secondary);">${d.label}</span>
            </div>
            <span style="font-size:var(--text-xs);font-weight:var(--fw-semibold);color:var(--color-text-primary);">${d.value}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderDonutSegments(data, total) {
  if (total === 0) return `<circle cx="70" cy="70" r="50" fill="none" stroke="var(--color-bg-tertiary)" stroke-width="20"/>`;

  const circumference = 2 * Math.PI * 50;
  let currentOffset = 0;
  const segments = [];

  data.forEach(d => {
    const pct = d.value / total;
    const dash = pct * circumference;
    const gap = circumference - dash;
    segments.push(`
      <circle cx="70" cy="70" r="50" fill="none"
        stroke="${d.color}" stroke-width="20"
        stroke-dasharray="${dash} ${gap}"
        stroke-dashoffset="${-currentOffset}"
        transform="rotate(-90 70 70)"
        opacity="0.9"
      />
    `);
    currentOffset += dash;
  });

  if (!segments.length) {
    return `<circle cx="70" cy="70" r="50" fill="none" stroke="var(--color-bg-tertiary)" stroke-width="20"/>`;
  }

  return segments.join('');
}

function renderExpiryItem(item) {
  const { student, seat, daysLeft, endDate } = item;
  if (!student) return '';

  const urgency = daysLeft <= 3 ? 'error' : daysLeft <= 7 ? 'warning' : 'neutral';
  const colors = { error: 'var(--sf-error-500)', warning: 'var(--sf-warning-500)', neutral: 'var(--sf-gray-400)' };

  return `
    <div style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3) var(--space-5);border-bottom:1px solid var(--color-border-secondary);cursor:pointer;"
      onclick="app.navigate('/student', {id:'${student.id}'})"
      onmouseenter="this.style.background='var(--color-bg-hover)'" onmouseleave="this.style.background='transparent'">
      <div class="avatar avatar-sm" style="background:${student.avatar};">${utils.initials(student.name)}</div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:var(--text-sm);font-weight:var(--fw-medium);color:var(--color-text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${student.name}</div>
        <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);">${seat ? 'Seat ' + seat.label : 'No seat'} · Exp ${utils.formatDate(endDate, {day:'numeric',month:'short'})}</div>
      </div>
      <div style="font-size:var(--text-xs);font-weight:var(--fw-semibold);color:${colors[urgency]};flex-shrink:0;">
        ${daysLeft === 0 ? 'Today' : daysLeft === 1 ? 'Tomorrow' : `${daysLeft}d left`}
      </div>
    </div>
  `;
}

function renderDueItem(item) {
  const { student, seat, pendingAmount } = item;
  if (!student) return '';

  return `
    <div style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3) var(--space-5);border-bottom:1px solid var(--color-border-secondary);cursor:pointer;"
      onclick="app.navigate('/student', {id:'${student.id}'})"
      onmouseenter="this.style.background='var(--color-bg-hover)'" onmouseleave="this.style.background='transparent'">
      <div class="avatar avatar-sm" style="background:${student.avatar};">${utils.initials(student.name)}</div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:var(--text-sm);font-weight:var(--fw-medium);color:var(--color-text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${student.name}</div>
        <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);">${seat ? 'Seat ' + seat.label : 'No seat'}</div>
      </div>
      <div style="font-size:var(--text-sm);font-weight:var(--fw-semibold);color:var(--sf-error-600);flex-shrink:0;">${utils.formatINR(pendingAmount)}</div>
    </div>
  `;
}

function renderActivityItem(a) {
  const actionIcons = {
    seat_assigned: icons['map-pin'],
    payment_recorded: icons['dollar-sign'],
    seat_released: icons.checkCircle,
    seat_transferred: icons['arrow-right'],
    membership_renewed: icons.repeat,
    student_created: icons['user-plus'],
    check_in: icons.clock,
    check_out: icons.clock,
    seat_maintenance: icons.tool,
  };
  const icon = actionIcons[a.action] || icons.activity;

  return `
    <div class="timeline-item">
      <div class="timeline-dot">${icon}</div>
      <div class="timeline-content">
        <div class="timeline-title">${a.description}</div>
        <div class="timeline-time">${utils.formatRelative(a.timestamp)}</div>
      </div>
    </div>
  `;
}

})();

// ─── PAGE: seat-map.js ───
(function() {
// Seat Map Page — Visual seat management
window.Pages.renderSeatMap = function renderSeatMap(container) {
  const branchId = store.getActiveBranchId();
  const branch = store.getBranch(branchId);
  const floors = store.getFloors(branchId);

  const state = {
    floorId: floors[0]?.id || null,
    roomId: null,
    filter: 'all',
    zoom: 1,
    selectedSeatId: null,
    searchQuery: ''
  };

  function render() {
    const floor = state.floorId ? store.getFloor(state.floorId) : null;
    const rooms = state.floorId ? store.getRooms(state.floorId) : [];
    const activeRoom = state.roomId ? store.getRoom(state.roomId) : rooms[0];
    const seats = activeRoom ? store.getSeats(activeRoom.id) : [];

    const stats = store.getDashboardStats(branchId);

    container.innerHTML = `
      <div class="page-header">
        <div class="page-header-row">
          <div>
            <h1 class="page-title">Seat Map</h1>
            <p class="page-subtitle">${branch?.name} · Visual seat management</p>
          </div>
          <div style="display:flex;gap:var(--space-2);">
            <button class="btn btn-secondary" onclick="seatMapState.zoom=Math.max(0.6,seatMapState.zoom-0.1);updateZoom()">
              ${icons.zoomOut}
            </button>
            <button class="btn btn-secondary" onclick="seatMapState.zoom=Math.min(1.8,seatMapState.zoom+0.1);updateZoom()">
              ${icons.zoomIn}
            </button>
            <button class="btn btn-primary" onclick="openAssignModal()">
              ${icons.plus} Assign Seat
            </button>
          </div>
        </div>
      </div>

      <!-- Stats Row -->
      <div style="display:flex;gap:var(--space-3);flex-wrap:wrap;margin-bottom:var(--space-5);">
        ${renderSeatStat('Total', stats.totalSeats, 'neutral')}
        ${renderSeatStat('Occupied', stats.occupied, 'indigo')}
        ${renderSeatStat('Available', stats.available, 'success')}
        ${renderSeatStat('Reserved', stats.reserved, 'warning')}
        ${renderSeatStat('Maintenance', stats.maintenance, 'neutral')}
      </div>

      <div class="seat-map-container">
        <!-- Toolbar -->
        <div class="seat-map-toolbar">
          <!-- Floor selector -->
          <select class="select" style="width:auto;" id="floor-select" onchange="handleFloorChange(this.value)">
            ${floors.map(f => `<option value="${f.id}" ${f.id === state.floorId ? 'selected' : ''}>${f.name}</option>`).join('')}
          </select>

          <!-- Room selector -->
          <select class="select" style="width:auto;" id="room-select" onchange="handleRoomChange(this.value)">
            ${rooms.map(r => `<option value="${r.id}" ${r.id === activeRoom?.id ? 'selected' : ''}>${r.name}</option>`).join('')}
          </select>

          <div style="flex:1;"></div>

          <!-- Search -->
          <div class="input-group" style="max-width:200px;">
            <div class="input-group-prefix">${icons.search}</div>
            <input class="input" type="text" placeholder="Search seat/student..." id="seat-search"
              value="${state.searchQuery}"
              oninput="handleSeatSearch(this.value)"
            />
          </div>

          <!-- Filter -->
          <div class="filter-tabs" id="seat-filters">
            ${['all','available','occupied','reserved','payment-due','expiring','maintenance','blocked'].map(f => `
              <button class="filter-tab ${state.filter === f ? 'active' : ''}"
                onclick="handleFilterChange('${f}')">
                ${f === 'all' ? 'All' : capitalizeFirst(f)}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Legend -->
        <div class="seat-map-legend">
          ${[
            { status: 'available', label: 'Available', bg: 'var(--seat-available-dot)' },
            { status: 'occupied', label: 'Occupied', bg: 'var(--seat-occupied-dot)' },
            { status: 'reserved', label: 'Reserved', bg: 'var(--seat-reserved-dot)' },
            { status: 'payment-due', label: 'Payment Due', bg: 'var(--seat-payment-due-dot)' },
            { status: 'expiring', label: 'Expiring Soon', bg: 'var(--seat-expiring-dot)' },
            { status: 'maintenance', label: 'Maintenance', bg: 'var(--seat-maintenance-dot)' },
            { status: 'blocked', label: 'Blocked', bg: 'var(--seat-blocked-dot)' },
          ].map(item => `
            <div class="legend-item">
              <div class="legend-dot" style="background:${item.bg};"></div>
              ${item.label}
            </div>
          `).join('')}
          <div style="flex:1;"></div>
          <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);">
            ${activeRoom ? `${activeRoom.name} · ${seats.length} seats` : 'No room selected'}
          </div>
        </div>

        <!-- Seat Grid -->
        <div class="seat-map-floor" id="seat-map-floor" style="transform-origin:top left;">
          ${activeRoom ? renderRoom(activeRoom, seats, state) : `
            <div class="empty-state">
              <div class="empty-icon">${icons.map}</div>
              <div class="empty-title">No room selected</div>
              <div class="empty-desc">Please select a floor and room to view the seat map.</div>
            </div>
          `}
        </div>
      </div>
    `;

    // Store state globally for event handlers
    window.seatMapState = state;
    window.handleFloorChange = (id) => { state.floorId = id; state.roomId = null; render(); };
    window.handleRoomChange = (id) => { state.roomId = id; render(); };
    window.handleFilterChange = (f) => { state.filter = f; render(); };
    window.handleSeatSearch = (q) => { state.searchQuery = q; render(); };
    window.updateZoom = () => {
      const floor = document.getElementById('seat-map-floor');
      if (floor) floor.style.transform = `scale(${seatMapState.zoom})`;
    };
  }

  render();
}

function renderSeatStat(label, count, color) {
  const colorMap = {
    neutral: { bg: 'var(--color-bg-tertiary)', text: 'var(--color-text-secondary)' },
    indigo: { bg: 'var(--sf-indigo-50)', text: 'var(--sf-indigo-700)' },
    success: { bg: 'var(--sf-success-50)', text: 'var(--sf-success-700)' },
    warning: { bg: 'var(--sf-warning-50)', text: 'var(--sf-warning-700)' },
    error: { bg: 'var(--sf-error-50)', text: 'var(--sf-error-700)' },
  };
  const c = colorMap[color] || colorMap.neutral;
  return `
    <div style="background:${c.bg};border-radius:var(--radius-xl);padding:var(--space-3) var(--space-4);display:flex;flex-direction:column;gap:var(--space-1);">
      <div style="font-size:var(--text-xl);font-weight:var(--fw-bold);color:${c.text};">${count}</div>
      <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);">${label}</div>
    </div>
  `;
}

function renderRoom(room, seats, state) {
  if (!seats.length) {
    return `
      <div class="empty-state">
        <div class="empty-icon">${icons.map}</div>
        <div class="empty-title">No seats configured</div>
        <div class="empty-desc">Add seats to this room in Floors & Rooms settings.</div>
        <button class="btn btn-secondary" onclick="app.navigate('/floors')">Configure Room</button>
      </div>
    `;
  }

  // Group by row
  const rows = {};
  seats.forEach(seat => {
    if (!rows[seat.row]) rows[seat.row] = [];
    rows[seat.row].push(seat);
  });

  // Apply filter and search
  const q = state.searchQuery?.toLowerCase();

  let html = `<div class="room-section">`;
  html += `<div class="room-label">${room.name}${room.acAvailable ? ' · AC' : ''} · ${room.type.toUpperCase()} · ${seats.length} seats</div>`;

  Object.entries(rows).sort(([a],[b]) => a.localeCompare(b)).forEach(([rowLabel, rowSeats]) => {
    html += `<div class="seat-row"><div class="row-label">${rowLabel}</div>`;

    rowSeats.sort((a, b) => a.col - b.col).forEach((seat, i) => {
      // Add aisle after column 3
      if (i > 0 && i % 3 === 0) {
        html += `<div class="seat-aisle"></div>`;
      }

      const status = store.getSeatStatus(seat.id);
      const assignment = store.getActiveAssignment(seat.id);
      const student = assignment ? store.getStudent(assignment.studentId) : null;

      // Filter
      if (state.filter !== 'all' && status !== state.filter) {
        html += `<div class="seat" style="visibility:hidden;pointer-events:none;"></div>`;
        return;
      }

      // Search
      let highlighted = false;
      if (q) {
        const matchesSeat = seat.label.toLowerCase().includes(q);
        const matchesStudent = student?.name.toLowerCase().includes(q);
        if (!matchesSeat && !matchesStudent) {
          html += `<div class="seat" style="opacity:0.15;pointer-events:none;"></div>`;
          return;
        }
        highlighted = true;
      }

      const statusClass = `seat-${status}`;
      const initials_ = student ? utils.initials(student.name) : '';
      const selected = state.selectedSeatId === seat.id;

      html += `
        <div class="seat ${statusClass} ${selected ? 'selected' : ''} ${highlighted ? 'highlighted' : ''}"
          id="seat-${seat.id}"
          onclick="openSeatDrawer('${seat.id}')"
          title="${seat.label}${student ? ' · ' + student.name : ''} · ${capitalizeFirst(status)}"
          role="button"
          aria-label="Seat ${seat.label}, ${capitalizeFirst(status)}${student ? ', ' + student.name : ''}"
          tabindex="0"
          onkeydown="if(event.key==='Enter'||event.key===' ')openSeatDrawer('${seat.id}')"
        >
          <span class="seat-status-dot"></span>
          <span class="seat-number">${seat.label}</span>
          ${initials_ ? `<span class="seat-initials">${initials_}</span>` : ''}
        </div>
      `;
    });

    html += `</div>`; // seat-row
  });

  html += `</div>`; // room-section

  return html;
}

// ── Seat Drawer ───────────────────────────────────────────────────
window.openSeatDrawer = function(seatId) {
  const seat = store.getSeat(seatId);
  if (!seat) return;

  const status = store.getSeatStatus(seatId);
  const assignment = store.getActiveAssignment(seatId);
  const student = assignment ? store.getStudent(assignment.studentId) : null;
  const membership = assignment ? store.getMembership(assignment.membershipId) : null;
  const paymentStatus = membership ? store.getPaymentStatus(membership.id) : null;
  const paidAmount = membership ? store.getPaidAmount(membership.id) : 0;
  const pendingAmount = membership ? store.getPendingAmount(membership.id) : 0;
  const todayAtt = student ? store.getAttendance(student.id, new Date().toISOString().split('T')[0]) : null;
  const plan = membership ? store.getMembershipPlan(membership.planId) : null;
  const room = store.getRoom(seat.roomId);
  const floor = room ? store.getFloor(room.floorId) : null;

  const bodyHTML = `
    <!-- Seat Header -->
    <div style="display:flex;align-items:center;gap:var(--space-3);padding-bottom:var(--space-5);border-bottom:1px solid var(--color-border-secondary);margin-bottom:var(--space-5);">
      <div style="width:48px;height:48px;background:var(--seat-${status}-bg);border:2px solid var(--seat-${status}-border);border-radius:var(--radius-lg);display:flex;flex-direction:column;align-items:center;justify-content:center;">
        <span style="font-size:0.625rem;font-weight:var(--fw-bold);color:var(--seat-${status}-text);">${seat.label}</span>
      </div>
      <div>
        <div style="font-size:var(--text-lg);font-weight:var(--fw-bold);color:var(--color-text-primary);">Seat ${seat.label}</div>
        <div style="display:flex;align-items:center;gap:var(--space-2);margin-top:2px;">
          ${seatStatusBadge(status)}
          <span style="font-size:var(--text-xs);color:var(--color-text-tertiary);">${seat.type.toUpperCase()} · ${room?.name || '—'}</span>
        </div>
      </div>
    </div>

    ${student ? renderStudentSection(student, membership, plan, paymentStatus, paidAmount, pendingAmount, todayAtt) : renderAvailableSection(seat)}
  `;

  const footerHTML = renderSeatActions(status, seat, student, membership);

  drawer.open(`Seat ${seat.label}`, bodyHTML, footerHTML);

  // Highlight selected seat
  document.querySelectorAll('.seat.selected').forEach(el => el.classList.remove('selected'));
  document.getElementById(`seat-${seatId}`)?.classList.add('selected');
}

function renderStudentSection(student, membership, plan, paymentStatus, paidAmount, pendingAmount, todayAtt) {
  const daysLeft = membership ? utils.daysUntil(membership.endDate) : null;

  return `
    <!-- Student Info -->
    <div class="drawer-section">
      <div class="drawer-section-title">Student</div>
      <div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-4);">
        <div class="avatar avatar-lg" style="background:${student.avatar};">${utils.initials(student.name)}</div>
        <div>
          <div style="font-size:var(--text-lg);font-weight:var(--fw-semibold);color:var(--color-text-primary);">${student.name}</div>
          <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);">${student.id}</div>
          <div style="display:flex;align-items:center;gap:var(--space-1);margin-top:var(--space-1);">
            ${icons.phone}<span style="font-size:var(--text-xs);color:var(--color-text-secondary);">${student.phone}</span>
          </div>
        </div>
      </div>
      <div class="drawer-row">
        <span class="drawer-row-label">Course</span>
        <span class="drawer-row-value">${student.course || '—'}</span>
      </div>
      <div class="drawer-row">
        <span class="drawer-row-label">Email</span>
        <span class="drawer-row-value" style="font-size:var(--text-xs);">${student.email || '—'}</span>
      </div>
    </div>

    ${membership ? `
    <!-- Membership -->
    <div class="drawer-section">
      <div class="drawer-section-title">Membership</div>
      <div class="drawer-row">
        <span class="drawer-row-label">Plan</span>
        <span class="drawer-row-value">${plan?.name || membership.planName || '—'}</span>
      </div>
      <div class="drawer-row">
        <span class="drawer-row-label">Start Date</span>
        <span class="drawer-row-value">${utils.formatDate(membership.startDate)}</span>
      </div>
      <div class="drawer-row">
        <span class="drawer-row-label">Expiry Date</span>
        <span class="drawer-row-value">${utils.formatDate(membership.endDate)}</span>
      </div>
      <div class="drawer-row">
        <span class="drawer-row-label">Days Left</span>
        <span class="drawer-row-value" style="color:${daysLeft !== null && daysLeft <= 7 ? 'var(--sf-warning-600)' : 'var(--color-text-primary)'}">
          ${daysLeft !== null ? (daysLeft > 0 ? daysLeft + ' days' : 'Expired') : '—'}
        </span>
      </div>
    </div>

    <!-- Payment -->
    <div class="drawer-section">
      <div class="drawer-section-title">Payment</div>
      <div class="drawer-row">
        <span class="drawer-row-label">Total Amount</span>
        <span class="drawer-row-value">${utils.formatINR(membership.price)}</span>
      </div>
      <div class="drawer-row">
        <span class="drawer-row-label">Paid</span>
        <span class="drawer-row-value" style="color:var(--sf-success-600);">${utils.formatINR(paidAmount)}</span>
      </div>
      <div class="drawer-row">
        <span class="drawer-row-label">Pending</span>
        <span class="drawer-row-value" style="color:${pendingAmount > 0 ? 'var(--sf-error-600)' : 'var(--color-text-tertiary)'};">
          ${utils.formatINR(pendingAmount)}
        </span>
      </div>
      <div class="drawer-row">
        <span class="drawer-row-label">Status</span>
        <span class="drawer-row-value">${paymentStatusBadge(paymentStatus)}</span>
      </div>
    </div>
    ` : ''}

    <!-- Attendance Today -->
    <div class="drawer-section">
      <div class="drawer-section-title">Today's Attendance</div>
      <div class="drawer-row">
        <span class="drawer-row-label">Status</span>
        <span class="drawer-row-value">
          ${todayAtt ? seatStatusBadge(todayAtt.status === 'checked-in' ? 'occupied' : 'available') : `<span class="badge badge-neutral"><span class="badge-dot"></span>Not arrived</span>`}
        </span>
      </div>
      ${todayAtt?.checkIn ? `
      <div class="drawer-row">
        <span class="drawer-row-label">Check-in</span>
        <span class="drawer-row-value">${utils.formatTime(todayAtt.checkIn)}</span>
      </div>` : ''}
      ${todayAtt?.checkOut ? `
      <div class="drawer-row">
        <span class="drawer-row-label">Check-out</span>
        <span class="drawer-row-value">${utils.formatTime(todayAtt.checkOut)}</span>
      </div>
      <div class="drawer-row">
        <span class="drawer-row-label">Duration</span>
        <span class="drawer-row-value">${todayAtt.duration ? Math.floor(todayAtt.duration/60)+'h '+todayAtt.duration%60+'m' : '—'}</span>
      </div>` : ''}
    </div>
  `;
}

function renderAvailableSection(seat) {
  return `
    <div class="empty-state" style="padding:var(--space-8) 0;">
      <div class="empty-icon" style="background:var(--seat-available-bg);color:var(--seat-available-text);">${icons.checkCircle}</div>
      <div class="empty-title">Seat Available</div>
      <div class="empty-desc">This seat is currently available for assignment. Click "Assign Seat" to allocate it to a student.</div>
    </div>
  `;
}

function renderSeatActions(status, seat, student, membership) {
  if (status === 'available') {
    return `
      <button class="btn btn-primary w-full" onclick="openAssignModal('${seat.id}')">
        ${icons['user-plus']} Assign Seat
      </button>
      <div style="display:flex;gap:var(--space-2);">
        <button class="btn btn-secondary flex-1" onclick="openReservationModal('${seat.id}')">
          ${icons.calendar} Reserve
        </button>
        <button class="btn btn-secondary flex-1" onclick="setSeatMaintenance('${seat.id}')">
          ${icons.tool} Maintenance
        </button>
      </div>
    `;
  }

  if (status === 'maintenance' || status === 'blocked') {
    return `
      <button class="btn btn-success w-full" onclick="releaseMaintenance('${seat.id}')">
        ${icons.checkCircle} Mark Available
      </button>
    `;
  }

  // Occupied / payment-due / expiring / reserved
  return `
    ${student ? `
    <button class="btn btn-secondary w-full" onclick="app.navigate('/student', {id:'${student.id}'}); drawer.close()">
      ${icons.user} View Student Profile
    </button>` : ''}
    <div style="display:flex;gap:var(--space-2);">
      ${membership ? `
      <button class="btn btn-primary flex-1" onclick="openPaymentModal('${student?.id}', '${membership.id}')">
        ${icons['dollar-sign']} Payment
      </button>
      <button class="btn btn-secondary flex-1" onclick="openRenewModal('${student?.id}', '${seat.id}')">
        ${icons.repeat} Renew
      </button>
      ` : ''}
    </div>
    <div style="display:flex;gap:var(--space-2);">
      <button class="btn btn-secondary flex-1" onclick="openTransferModal('${seat.id}')">
        ${icons['arrow-right']} Transfer
      </button>
      <button class="btn btn-danger flex-1" onclick="openReleaseModal('${seat.id}')">
        ${icons.trash} Release
      </button>
    </div>
  `;
}

// ── Seat Actions ──────────────────────────────────────────────────
window.setSeatMaintenance = function(seatId) {
  confirmDialog('Mark as Maintenance', 'Are you sure you want to mark this seat as under maintenance? It will be unavailable for assignment.', () => {
    try {
      store.updateSeat(seatId, { status: 'maintenance' });
      store.addActivity({ action: 'seat_maintenance', entity: 'seat', entityId: seatId, description: `Seat marked for maintenance` });
      drawer.close();
      toast.show('Seat marked as maintenance', 'success');
      app._navigate();
    } catch (e) {
      toast.show(e.message, 'error');
    }
  });
};

window.releaseMaintenance = function(seatId) {
  try {
    store.updateSeat(seatId, { status: 'available' });
    store.addActivity({ action: 'seat_available', entity: 'seat', entityId: seatId, description: `Seat marked available` });
    drawer.close();
    toast.show('Seat is now available', 'success');
    app._navigate();
  } catch (e) {
    toast.show(e.message, 'error');
  }
};

// ── Assign Seat Modal ─────────────────────────────────────────────
window.openAssignModal = function(seatId) {
  const branchId = store.getActiveBranchId();
  const students = store.getStudents(branchId);
  const plans = store.getMembershipPlans(branchId);

  // Pre-fill if seat already selected
  const seat = seatId ? store.getSeat(seatId) : null;

  // Get available seats
  const allSeats = store.getSeatsForBranch(branchId);
  const availableSeats = allSeats.filter(s => store.getSeatStatus(s.id) === 'available');

  const today_ = new Date().toISOString().split('T')[0];

  modal.open('Assign Seat', `
    <div style="display:flex;flex-direction:column;gap:var(--space-5);">
      <div class="form-group">
        <label class="form-label">Student <span class="required">*</span></label>
        <select class="select" id="assign-student-id" onchange="updateAssignStudentInfo(this.value)">
          <option value="">Select student...</option>
          ${students.map(s => {
            const hasActiveSeat = !!store.getStudentAssignment(s.id);
            return `<option value="${s.id}" ${hasActiveSeat ? 'disabled' : ''}>${s.name} — ${s.phone}${hasActiveSeat ? ' (has seat)' : ''}</option>`;
          }).join('')}
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Seat <span class="required">*</span></label>
        <select class="select" id="assign-seat-id">
          ${seat ? `<option value="${seat.id}" selected>${seat.label}</option>` : `<option value="">Select seat...</option>`}
          ${availableSeats.filter(s => !seat || s.id !== seat.id).map(s => {
            const room = store.getRoom(s.roomId);
            return `<option value="${s.id}">${s.label} — ${room?.name || '—'}</option>`;
          }).join('')}
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Membership Plan <span class="required">*</span></label>
        <select class="select" id="assign-plan-id" onchange="updateAssignPrice(this.value)">
          <option value="">Select plan...</option>
          ${plans.map(p => `<option value="${p.id}" data-price="${p.price}" data-duration="${p.duration}">${p.name} — ${utils.formatINR(p.price)} (${p.duration} days)</option>`).join('')}
        </select>
      </div>

      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Start Date <span class="required">*</span></label>
          <input type="date" class="input" id="assign-start-date" value="${today_}" onchange="updateAssignEndDate()">
        </div>
        <div class="form-group">
          <label class="form-label">End Date</label>
          <input type="date" class="input" id="assign-end-date" readonly style="background:var(--color-bg-secondary);">
        </div>
      </div>

      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Amount (₹) <span class="required">*</span></label>
          <div class="input-group">
            <span class="input-group-prefix">₹</span>
            <input type="number" class="input" id="assign-price" min="0" placeholder="0">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Discount (₹)</label>
          <div class="input-group">
            <span class="input-group-prefix">₹</span>
            <input type="number" class="input" id="assign-discount" value="0" min="0">
          </div>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Payment Status <span class="required">*</span></label>
        <div class="filter-tabs" id="assign-payment-status-tabs">
          ${['paid','partial','pending'].map((s, i) => `
            <button class="filter-tab ${i === 0 ? 'active' : ''}"
              onclick="document.querySelectorAll('#assign-payment-status-tabs .filter-tab').forEach(b=>b.classList.remove('active'));this.classList.add('active');document.getElementById('assign-payment-amount-wrap').style.display=this.dataset.status!=='paid'?'block':'none';document.getElementById('assign-pay-amt').required=this.dataset.status!=='pending';"
              data-status="${s}">${capitalizeFirst(s)}</button>
          `).join('')}
        </div>
      </div>

      <div id="assign-payment-amount-wrap" style="display:none;">
        <div class="form-group">
          <label class="form-label">Amount Paid (₹)</label>
          <div class="input-group">
            <span class="input-group-prefix">₹</span>
            <input type="number" class="input" id="assign-pay-amt" min="0" placeholder="Amount paid now">
          </div>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Payment Method</label>
        <select class="select" id="assign-payment-method">
          <option>Cash</option><option>UPI</option><option>Card</option><option>Bank Transfer</option><option>Other</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Notes</label>
        <textarea class="textarea" id="assign-notes" rows="2" placeholder="Optional notes..."></textarea>
      </div>
    </div>
  `, `
    <button class="btn btn-secondary" onclick="modal.close()">Cancel</button>
    <button class="btn btn-primary" onclick="confirmAssignSeat()">
      ${icons['user-plus']} Assign Seat
    </button>
  `, { size: 'lg' });

  // Setup helpers
  window.updateAssignPrice = (planId) => {
    const plan = store.getMembershipPlan(planId);
    if (!plan) return;
    document.getElementById('assign-price').value = plan.price;
    updateAssignEndDate();
  };

  window.updateAssignEndDate = () => {
    const planId = document.getElementById('assign-plan-id').value;
    const startDate = document.getElementById('assign-start-date').value;
    if (!planId || !startDate) return;
    const plan = store.getMembershipPlan(planId);
    if (!plan) return;
    document.getElementById('assign-end-date').value = utils.addDays(startDate, plan.duration);
  };

  window.updateAssignStudentInfo = (studentId) => {
    // Could show student info preview
  };
};

window.confirmAssignSeat = function() {
  const studentId = document.getElementById('assign-student-id')?.value;
  const seatId = document.getElementById('assign-seat-id')?.value;
  const planId = document.getElementById('assign-plan-id')?.value;
  const startDate = document.getElementById('assign-start-date')?.value;
  const price = parseFloat(document.getElementById('assign-price')?.value || 0);
  const discount = parseFloat(document.getElementById('assign-discount')?.value || 0);
  const payMethod = document.getElementById('assign-payment-method')?.value;
  const notes = document.getElementById('assign-notes')?.value;

  if (!studentId) { toast.show('Please select a student', 'error'); return; }
  if (!seatId) { toast.show('Please select a seat', 'error'); return; }
  if (!planId) { toast.show('Please select a membership plan', 'error'); return; }
  if (!startDate) { toast.show('Please enter a start date', 'error'); return; }
  if (!price || price <= 0) { toast.show('Please enter a valid amount', 'error'); return; }

  const plan = store.getMembershipPlan(planId);
  const endDate = utils.addDays(startDate, plan.duration);

  try {
    // Create membership
    const membership = store.addMembership({
      studentId,
      planId,
      planName: plan.name,
      startDate,
      endDate,
      price,
      discount,
      notes
    });

    // Assign seat
    store.assignSeat({
      studentId,
      seatId,
      membershipId: membership.id,
      startDate,
      endDate
    });

    // Record payment
    const activeTab = document.querySelector('#assign-payment-status-tabs .filter-tab.active');
    const payStatus = activeTab?.dataset.status || 'paid';
    let payAmount = price - discount;

    if (payStatus === 'partial') {
      payAmount = parseFloat(document.getElementById('assign-pay-amt')?.value || 0);
    } else if (payStatus === 'pending') {
      payAmount = 0;
    }

    let paymentRecord = null;
    if (payAmount > 0) {
      paymentRecord = store.recordPayment({
        membershipId: membership.id,
        studentId,
        amount: payAmount,
        method: payMethod,
        notes
      });
    }

    // ── Generate Invoice & Receipt Documents ──
    const student = store.getStudent(studentId);
    const seat = store.getSeat(seatId);
    const room = seat?.roomId ? store.getRoom(seat.roomId) : null;
    const branch = store.getBranch(store.getActiveBranchId());

    let invoice = null;
    let receipt = null;

    if (window.invoiceGenerator) {
      invoice = invoiceGenerator.generateInvoice({
        membershipId: membership.id,
        studentId,
        seatId,
        paymentId: paymentRecord?.id
      });
      if (paymentRecord) {
        receipt = invoiceGenerator.generateReceipt({
          paymentId: paymentRecord.id,
          studentId,
          membershipId: membership.id
        });
      }
    }

    // ── Dispatch Asynchronous WhatsApp Notification ──
    if (window.notificationService) {
      notificationService.dispatch(NOTIFICATION_EVENTS.SEAT_ASSIGNED, {
        studentId,
        entityId: membership.id,
        documentId: invoice?.id || null,
        documentNumber: invoice?.documentNumber || null,
        documentType: 'invoice',
        variables: {
          student_name: student?.name || 'Student',
          seat_number: seat?.label || seat?.number || 'N/A',
          branch_name: branch?.name || 'StudyFlow Library',
          room_name: room?.name || 'Study Hall',
          membership_name: plan.name,
          start_date: startDate,
          expiry_date: endDate,
          amount: (price - discount).toLocaleString('en-IN'),
          payment_status: payStatus === 'paid' ? 'Paid' : (payStatus === 'partial' ? 'Partial' : 'Pending')
        }
      });
    }

    modal.close();
    drawer.close();

    // ── Show Booking & WhatsApp Confirmation Dialog ──
    modal.open('Seat Assigned Successfully 🎉', `
      <div style="text-align:center;padding:var(--space-2) 0 var(--space-4);">
        <div style="width:54px;height:54px;border-radius:50%;background:var(--sf-success-50);color:var(--sf-success-600);display:flex;align-items:center;justify-content:center;margin:0 auto var(--space-3);font-size:24px;">
          ✓
        </div>
        <h3 style="font-size:var(--text-lg);font-weight:var(--fw-bold);color:var(--color-text-primary);">Seat ${seat?.label} is Booked!</h3>
        <p style="font-size:var(--text-sm);color:var(--color-text-secondary);margin-top:4px;">
          Assigned to <strong>${student?.name}</strong> for ${plan.name} (${startDate} to ${endDate})
        </p>
      </div>

      <div style="background:var(--color-bg-secondary);border:1px solid var(--color-border-secondary);border-radius:var(--radius-lg);padding:var(--space-4);margin-bottom:var(--space-4);">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3);font-size:var(--text-xs);">
          <div>
            <span style="color:var(--color-text-tertiary);">Payment Status:</span>
            <div style="font-weight:var(--fw-semibold);color:var(--color-text-primary);margin-top:2px;">
              ${payStatus === 'paid' ? `₹${(price - discount).toLocaleString('en-IN')} (Paid)` : (payStatus === 'partial' ? `₹${payAmount} (Partial)` : 'Pending')}
            </div>
          </div>
          <div>
            <span style="color:var(--color-text-tertiary);">Invoice Number:</span>
            <div style="font-weight:var(--fw-semibold);color:var(--color-text-primary);margin-top:2px;">
              ${invoice ? invoice.documentNumber : 'Generated'}
            </div>
          </div>
        </div>
      </div>

      <div style="padding:var(--space-3) var(--space-4);background:#edfcf2;border:1px solid #aaf0c4;border-radius:var(--radius-lg);display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-2);">
        <div style="width:28px;height:28px;border-radius:50%;background:#16b364;color:white;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;">
          💬
        </div>
        <div style="flex:1;">
          <div style="font-size:var(--text-sm);font-weight:var(--fw-semibold);color:#087443;">
            WhatsApp Confirmation Queued
          </div>
          <div style="font-size:var(--text-xs);color:#099250;">
            Sent to ${student?.normalized_phone || student?.phone || 'student phone'} with PDF invoice attached.
          </div>
        </div>
        <span class="badge badge-success"><span class="badge-dot"></span>Queued</span>
      </div>
    `, `
      <div style="display:flex;justify-content:space-between;width:100%;align-items:center;">
        <div>
          ${invoice ? `
            <button class="btn btn-secondary btn-sm" onclick="invoiceGenerator.previewDocument('${invoice.id}')">
              ${icons['file-text'] || ''} View Invoice
            </button>
          ` : ''}
        </div>
        <div style="display:flex;gap:var(--space-2);">
          <button class="btn btn-secondary btn-sm" onclick="modal.close(); app.navigate('/student?id=${studentId}')">
            View Student
          </button>
          <button class="btn btn-primary btn-sm" onclick="modal.close()">
            Done
          </button>
        </div>
      </div>
    `, { size: 'md' });

    app._navigate();
  } catch (e) {
    toast.show(e.message, 'error');
  }
};

// ── Transfer Modal ────────────────────────────────────────────────
window.openTransferModal = function(fromSeatId) {
  const fromSeat = store.getSeat(fromSeatId);
  const assignment = store.getActiveAssignment(fromSeatId);
  const student = assignment ? store.getStudent(assignment.studentId) : null;

  const branchId = store.getActiveBranchId();
  const availableSeats = store.getSeatsForBranch(branchId).filter(s =>
    store.getSeatStatus(s.id) === 'available' && s.id !== fromSeatId
  );

  modal.open('Transfer Seat', `
    <div style="margin-bottom:var(--space-5);padding:var(--space-4);background:var(--color-bg-secondary);border-radius:var(--radius-lg);">
      <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);margin-bottom:var(--space-2);">CURRENT SEAT</div>
      <div style="display:flex;align-items:center;gap:var(--space-3);">
        ${student ? `<div class="avatar avatar-sm" style="background:${student.avatar};">${utils.initials(student.name)}</div>` : ''}
        <div>
          <div style="font-weight:var(--fw-semibold);">${student?.name || 'Unknown Student'}</div>
          <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);">Seat ${fromSeat.label}</div>
        </div>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:var(--space-4);">
      <div class="form-group">
        <label class="form-label">New Seat <span class="required">*</span></label>
        <select class="select" id="transfer-to-seat">
          <option value="">Select available seat...</option>
          ${availableSeats.map(s => {
            const room = store.getRoom(s.roomId);
            return `<option value="${s.id}">${s.label} — ${room?.name || '—'}</option>`;
          }).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Reason <span class="required">*</span></label>
        <select class="select" id="transfer-reason">
          <option>Student request</option>
          <option>Maintenance</option>
          <option>Operational</option>
          <option>Other</option>
        </select>
      </div>
    </div>
  `, `
    <button class="btn btn-secondary" onclick="modal.close()">Cancel</button>
    <button class="btn btn-primary" onclick="confirmTransfer('${fromSeatId}', '${student?.id}')">
      ${icons['arrow-right']} Confirm Transfer
    </button>
  `);
};

window.confirmTransfer = function(fromSeatId, studentId) {
  const toSeatId = document.getElementById('transfer-to-seat')?.value;
  const reason = document.getElementById('transfer-reason')?.value;

  if (!toSeatId) { toast.show('Please select a destination seat', 'error'); return; }

  try {
    store.transferSeat(fromSeatId, toSeatId, studentId, reason);
    modal.close();
    drawer.close();
    const fromSeat = store.getSeat(fromSeatId);
    const toSeat = store.getSeat(toSeatId);
    const student = store.getStudent(studentId);
    const branch = store.getBranch(store.getActiveBranchId());
    const room = toSeat?.roomId ? store.getRoom(toSeat.roomId) : null;

    if (window.notificationService && student) {
      notificationService.dispatch(NOTIFICATION_EVENTS.SEAT_TRANSFERRED, {
        studentId,
        entityId: toSeatId,
        variables: {
          student_name: student.name,
          previous_seat: fromSeat?.label || 'Previous',
          seat_number: toSeat?.label || 'New',
          branch_name: branch?.name || 'StudyFlow Library',
          room_name: room?.name || 'Study Area',
          effective_date: utils.today()
        }
      });
    }

    toast.show(`Seat transferred to ${toSeat.label}! WhatsApp confirmation sent.`, 'success');
    app._navigate();
  } catch (e) {
    toast.show(e.message, 'error');
  }
};

// ── Release Modal ─────────────────────────────────────────────────
window.openReleaseModal = function(seatId) {
  const seat = store.getSeat(seatId);
  const assignment = store.getActiveAssignment(seatId);
  const student = assignment ? store.getStudent(assignment.studentId) : null;
  const membership = assignment ? store.getMembership(assignment.membershipId) : null;
  const pending = membership ? store.getPendingAmount(membership.id) : 0;

  modal.open('Release Seat', `
    <div style="display:flex;flex-direction:column;gap:var(--space-4);">
      ${pending > 0 ? `
        <div style="padding:var(--space-3) var(--space-4);background:var(--sf-error-50);border:1px solid var(--sf-error-200);border-radius:var(--radius-lg);display:flex;align-items:center;gap:var(--space-3);">
          ${icons['alert-triangle']}
          <div>
            <div style="font-size:var(--text-sm);font-weight:var(--fw-semibold);color:var(--sf-error-700);">Outstanding Balance</div>
            <div style="font-size:var(--text-xs);color:var(--sf-error-600);">Student has pending dues of ${utils.formatINR(pending)}. Please collect before releasing.</div>
          </div>
        </div>
      ` : ''}

      <div style="padding:var(--space-4);background:var(--color-bg-secondary);border-radius:var(--radius-lg);">
        <div style="display:flex;align-items:center;gap:var(--space-3);">
          ${student ? `<div class="avatar" style="background:${student.avatar};">${utils.initials(student.name)}</div>` : ''}
          <div>
            <div style="font-weight:var(--fw-semibold);">${student?.name || '—'}</div>
            <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);">Seat ${seat.label} · ${membership ? 'Expires ' + utils.formatDate(membership.endDate, {day:'numeric',month:'short'}) : '—'}</div>
          </div>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Reason for Release <span class="required">*</span></label>
        <select class="select" id="release-reason">
          <option>Membership expired</option>
          <option>Student left</option>
          <option>Transferred to another branch</option>
          <option>Fee dispute</option>
          <option>Other</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Release Timing</label>
        <div class="filter-tabs">
          <button class="filter-tab active" id="release-now-btn" onclick="document.getElementById('release-now-btn').classList.add('active');document.getElementById('release-later-btn').classList.remove('active');">Immediately</button>
          <button class="filter-tab" id="release-later-btn" onclick="document.getElementById('release-later-btn').classList.add('active');document.getElementById('release-now-btn').classList.remove('active');">After Expiry</button>
        </div>
      </div>
    </div>
  `, `
    <button class="btn btn-secondary" onclick="modal.close()">Cancel</button>
    <button class="btn btn-danger" onclick="confirmRelease('${seatId}')">
      ${icons.trash} Release Seat
    </button>
  `);
};

window.confirmRelease = function(seatId) {
  const reason = document.getElementById('release-reason')?.value;
  try {
    store.releaseSeat(seatId, reason, 'admin');
    modal.close();
    drawer.close();
    toast.show('Seat released successfully', 'success');
    app._navigate();
  } catch (e) {
    toast.show(e.message, 'error');
  }
};

// ── Payment Modal ─────────────────────────────────────────────────
window.openPaymentModal = function(studentId, membershipId) {
  const student = store.getStudent(studentId);
  const membership = store.getMembership(membershipId);
  const pending = store.getPendingAmount(membershipId);
  const paid = store.getPaidAmount(membershipId);
  const plan = store.getMembershipPlan(membership?.planId);

  modal.open('Record Payment', `
    <div style="padding:var(--space-4);background:var(--color-bg-secondary);border-radius:var(--radius-lg);margin-bottom:var(--space-5);">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-2);">
        <span style="font-size:var(--text-sm);color:var(--color-text-secondary);">Total Due</span>
        <span style="font-weight:var(--fw-semibold);">${utils.formatINR(membership?.price)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-2);">
        <span style="font-size:var(--text-sm);color:var(--color-text-secondary);">Already Paid</span>
        <span style="color:var(--sf-success-600);font-weight:var(--fw-semibold);">${utils.formatINR(paid)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;padding-top:var(--space-2);border-top:1px solid var(--color-border-secondary);">
        <span style="font-size:var(--text-sm);font-weight:var(--fw-semibold);">Outstanding</span>
        <span style="font-weight:var(--fw-bold);color:var(--sf-error-600);">${utils.formatINR(pending)}</span>
      </div>
    </div>

    <div style="display:flex;flex-direction:column;gap:var(--space-4);">
      <div class="form-group">
        <label class="form-label">Amount (₹) <span class="required">*</span></label>
        <div class="input-group">
          <span class="input-group-prefix">₹</span>
          <input type="number" class="input" id="pay-amount" value="${pending}" min="1" max="${pending + 5000}">
        </div>
        <div class="form-hint">Outstanding: ${utils.formatINR(pending)}</div>
      </div>

      <div class="form-group">
        <label class="form-label">Payment Method <span class="required">*</span></label>
        <select class="select" id="pay-method">
          <option>Cash</option><option>UPI</option><option>Card</option><option>Bank Transfer</option><option>Other</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Transaction / Reference ID</label>
        <input type="text" class="input" id="pay-txn-id" placeholder="Optional reference number">
      </div>

      <div class="form-group">
        <label class="form-label">Date</label>
        <input type="date" class="input" id="pay-date" value="${new Date().toISOString().split('T')[0]}">
      </div>

      <div class="form-group">
        <label class="form-label">Notes</label>
        <textarea class="textarea" id="pay-notes" rows="2" placeholder="Optional notes..."></textarea>
      </div>
    </div>
  `, `
    <button class="btn btn-secondary" onclick="modal.close()">Cancel</button>
    <button class="btn btn-primary" onclick="confirmPayment('${membershipId}', '${studentId}')">
      ${icons['dollar-sign']} Record Payment
    </button>
  `);
};

window.confirmPayment = function(membershipId, studentId) {
  const amount = parseFloat(document.getElementById('pay-amount')?.value || 0);
  const method = document.getElementById('pay-method')?.value;
  const txnId = document.getElementById('pay-txn-id')?.value;
  const notes = document.getElementById('pay-notes')?.value;

  if (!amount || amount <= 0) { toast.show('Please enter a valid amount', 'error'); return; }

  try {
    const student = store.getStudent(studentId);
    const membership = store.getMembership(membershipId);
    const payment = store.recordPayment({ membershipId, studentId, amount, method, txnId, notes });

    // Generate receipt document
    let receiptDoc = null;
    if (window.invoiceGenerator) {
      receiptDoc = window.invoiceGenerator.generateReceipt({
        paymentId: payment.id,
        membershipId,
        studentId,
        amount,
        paymentMethod: method,
        transactionRef: txnId,
        notes
      });
    }

    // Dispatch WhatsApp notification
    let notifMsg = null;
    if (window.notificationService && window.NOTIFICATION_EVENTS) {
      notifMsg = window.notificationService.dispatchEvent(window.NOTIFICATION_EVENTS.PAYMENT_RECEIVED, {
        studentId,
        membershipId,
        paymentId: payment.id,
        amount,
        receiptNumber: receiptDoc?.documentNumber || payment.receiptNumber,
        documentId: receiptDoc?.id
      });
    }

    const pendingAfter = store.getPendingAmount(membershipId);

    // Show success modal with document and WhatsApp dispatch status
    modal.open('Payment Recorded 🎉', `
      <div style="text-align:center;padding:var(--space-2) 0 var(--space-4);">
        <div style="width:52px;height:52px;background:var(--sf-success-100);color:var(--sf-success-700);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:var(--space-3);">
          ${icons.checkCircle}
        </div>
        <div style="font-size:var(--text-lg);font-weight:var(--fw-bold);color:var(--color-text-primary);">
          Payment of ${utils.formatINR(amount)} Received!
        </div>
        <div style="font-size:var(--text-sm);color:var(--color-text-secondary);margin-top:var(--space-1);">
          Student: <strong>${student?.name || 'Student'}</strong> · Method: <strong>${method}</strong>
        </div>
      </div>

      <div style="background:var(--color-bg-secondary);border:1px solid var(--color-border-secondary);border-radius:var(--radius-xl);padding:var(--space-4);margin-bottom:var(--space-4);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-2);">
          <span style="font-size:var(--text-xs);color:var(--color-text-tertiary);text-transform:uppercase;font-weight:var(--fw-semibold);">Receipt #</span>
          <span style="font-family:var(--font-mono);font-size:var(--text-xs);font-weight:var(--fw-bold);color:var(--sf-indigo-600);">${receiptDoc?.documentNumber || payment.receiptNumber}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-2);">
          <span style="font-size:var(--text-sm);color:var(--color-text-secondary);">Remaining Balance</span>
          <span style="font-size:var(--text-sm);font-weight:var(--fw-bold);color:${pendingAfter > 0 ? 'var(--sf-error-600)' : 'var(--sf-success-600)'};">${utils.formatINR(pendingAfter)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding-top:var(--space-2);border-top:1px solid var(--color-border-secondary);">
          <span style="font-size:var(--text-xs);color:var(--color-text-tertiary);">WhatsApp Receipt</span>
          <span class="badge ${notifMsg?.status === 'skipped' ? 'badge-neutral' : 'badge-success'}" style="font-size:11px;">
            <span class="badge-dot"></span>
            ${notifMsg?.status === 'skipped' ? 'Opted Out' : `Queued (${student?.normalized_phone || student?.phone})`}
          </span>
        </div>
      </div>
    `, `
      ${receiptDoc ? `<button class="btn btn-secondary" onclick="invoiceGenerator.previewDocument('${receiptDoc.id}')">${icons.eye} View Receipt</button>` : ''}
      <button class="btn btn-primary" onclick="modal.close(); app._navigate();">Done</button>
    `);

    toast.show(`Payment of ${utils.formatINR(amount)} recorded!`, 'success');
  } catch (e) {
    toast.show(e.message, 'error');
  }
};

// ── Renew Modal ───────────────────────────────────────────────────
window.openRenewModal = function(studentId, seatId) {
  const student = store.getStudent(studentId);
  const branchId = store.getActiveBranchId();
  const currentMembership = store.getActiveMembership(studentId);
  const plans = store.getMembershipPlans(branchId);

  const newStart = currentMembership
    ? utils.addDays(currentMembership.endDate, 1)
    : new Date().toISOString().split('T')[0];

  modal.open('Renew Membership', `
    <div style="padding:var(--space-4);background:var(--color-bg-secondary);border-radius:var(--radius-lg);margin-bottom:var(--space-5);">
      <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);margin-bottom:var(--space-1);">RENEWING FOR</div>
      <div style="font-weight:var(--fw-semibold);">${student?.name}</div>
      ${currentMembership ? `
        <div style="font-size:var(--text-xs);color:var(--color-text-secondary);margin-top:var(--space-1);">Current plan expires: ${utils.formatDate(currentMembership.endDate)}</div>
      ` : ''}
    </div>

    <div style="display:flex;flex-direction:column;gap:var(--space-4);">
      <div class="form-group">
        <label class="form-label">New Plan <span class="required">*</span></label>
        <select class="select" id="renew-plan" onchange="updateRenewDates(this.value, '${newStart}')">
          <option value="">Select plan...</option>
          ${plans.map(p => `<option value="${p.id}" data-price="${p.price}" data-duration="${p.duration}">${p.name} — ${utils.formatINR(p.price)}</option>`).join('')}
        </select>
      </div>

      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Start Date</label>
          <input type="date" class="input" id="renew-start" value="${newStart}" onchange="updateRenewEndDate()">
        </div>
        <div class="form-group">
          <label class="form-label">End Date</label>
          <input type="date" class="input" id="renew-end" readonly style="background:var(--color-bg-secondary);">
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Amount (₹)</label>
        <div class="input-group">
          <span class="input-group-prefix">₹</span>
          <input type="number" class="input" id="renew-price" min="0">
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Payment Method</label>
        <select class="select" id="renew-method">
          <option>Cash</option><option>UPI</option><option>Card</option><option>Bank Transfer</option>
        </select>
      </div>
    </div>
  `, `
    <button class="btn btn-secondary" onclick="modal.close()">Cancel</button>
    <button class="btn btn-primary" onclick="confirmRenew('${studentId}', '${seatId}')">
      ${icons.repeat} Renew Membership
    </button>
  `);

  window.updateRenewDates = (planId, start) => {
    const plan = store.getMembershipPlan(planId);
    if (!plan) return;
    document.getElementById('renew-price').value = plan.price;
    const startDate = document.getElementById('renew-start').value || start;
    document.getElementById('renew-end').value = utils.addDays(startDate, plan.duration);
  };

  window.updateRenewEndDate = () => {
    const planId = document.getElementById('renew-plan').value;
    const startDate = document.getElementById('renew-start').value;
    if (!planId || !startDate) return;
    const plan = store.getMembershipPlan(planId);
    if (!plan) return;
    document.getElementById('renew-end').value = utils.addDays(startDate, plan.duration);
  };
};

window.confirmRenew = function(studentId, seatId) {
  const planId = document.getElementById('renew-plan')?.value;
  const startDate = document.getElementById('renew-start')?.value;
  const price = parseFloat(document.getElementById('renew-price')?.value || 0);
  const method = document.getElementById('renew-method')?.value;

  if (!planId) { toast.show('Please select a plan', 'error'); return; }
  if (!startDate) { toast.show('Please enter a start date', 'error'); return; }

  const plan = store.getMembershipPlan(planId);
  const endDate = utils.addDays(startDate, plan.duration);

  try {
    // Cancel old membership
    const oldMem = store.getActiveMembership(studentId);
    if (oldMem) store.updateMembership(oldMem.id, { status: 'renewed' });

    // Create new membership
    const newMem = store.addMembership({
      studentId, planId, planName: plan.name, startDate, endDate, price, discount: 0
    });

    // Update assignment
    const assignment = store.getStudentAssignment(studentId);
    if (assignment) {
      const db = store.db;
      const idx = db.seatAssignments.findIndex(a => a.id === assignment.id);
      if (idx !== -1) { db.seatAssignments[idx].membershipId = newMem.id; db.seatAssignments[idx].endDate = endDate; store._save(db); }
    }

    // Auto-generate renewal invoice
    let renewInvoiceDoc = null;
    if (window.invoiceGenerator) {
      renewInvoiceDoc = window.invoiceGenerator.generateInvoice({
        membershipId: newMem.id,
        studentId,
        seatId: assignment?.seatId,
        planId: plan.id,
        amount: price,
        discount: 0
      });
    }

    // Record payment if price > 0
    let renewPayment = null;
    let renewReceiptDoc = null;
    if (price > 0) {
      renewPayment = store.recordPayment({ membershipId: newMem.id, studentId, amount: price, method });
      if (window.invoiceGenerator) {
        renewReceiptDoc = window.invoiceGenerator.generateReceipt({
          paymentId: renewPayment.id,
          membershipId: newMem.id,
          studentId,
          amount: price,
          paymentMethod: method
        });
      }
    }

    // Dispatch MEMBERSHIP_RENEWED WhatsApp event
    let notifMsg = null;
    if (window.notificationService && window.NOTIFICATION_EVENTS) {
      notifMsg = window.notificationService.dispatchEvent(window.NOTIFICATION_EVENTS.MEMBERSHIP_RENEWED, {
        studentId,
        membershipId: newMem.id,
        seatId: assignment?.seatId,
        planName: plan.name,
        newEndDate: endDate,
        amount: price,
        invoiceNumber: renewInvoiceDoc?.documentNumber,
        receiptNumber: renewReceiptDoc?.documentNumber,
        documentId: renewInvoiceDoc?.id
      });
    }

    store.addActivity({ action: 'membership_renewed', entity: 'membership', entityId: newMem.id, description: `Membership renewed for ${store.getStudent(studentId)?.name}` });

    modal.close();
    drawer.close();
    toast.show('Membership renewed successfully! WhatsApp confirmation queued.', 'success');
    app._navigate();
  } catch (e) {
    toast.show(e.message, 'error');
  }
};

// ── Reservation Modal ─────────────────────────────────────────────
window.openReservationModal = function(seatId) {
  const branchId = store.getActiveBranchId();
  const students = store.getStudents(branchId);
  const seat = store.getSeat(seatId);
  const today_ = new Date().toISOString().split('T')[0];

  modal.open('Reserve Seat', `
    <div style="display:flex;flex-direction:column;gap:var(--space-4);">
      <div class="form-group">
        <label class="form-label">Student <span class="required">*</span></label>
        <select class="select" id="reserve-student">
          <option value="">Select student...</option>
          ${students.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
        </select>
      </div>
      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Start Date <span class="required">*</span></label>
          <input type="date" class="input" id="reserve-start" value="${today_}">
        </div>
        <div class="form-group">
          <label class="form-label">End Date <span class="required">*</span></label>
          <input type="date" class="input" id="reserve-end" value="${utils.addDays(today_, 30)}">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Notes</label>
        <textarea class="textarea" id="reserve-notes" rows="2" placeholder="Reason for reservation..."></textarea>
      </div>
    </div>
  `, `
    <button class="btn btn-secondary" onclick="modal.close()">Cancel</button>
    <button class="btn btn-primary" onclick="confirmReservation('${seatId}')">
      ${icons.calendar} Reserve Seat
    </button>
  `);
};

window.confirmReservation = function(seatId) {
  const studentId = document.getElementById('reserve-student')?.value;
  const startDate = document.getElementById('reserve-start')?.value;
  const endDate = document.getElementById('reserve-end')?.value;
  const notes = document.getElementById('reserve-notes')?.value;

  if (!studentId) { toast.show('Please select a student', 'error'); return; }
  if (!startDate || !endDate) { toast.show('Please enter dates', 'error'); return; }
  if (new Date(endDate) <= new Date(startDate)) { toast.show('End date must be after start date', 'error'); return; }

  try {
    const reservation = store.addReservation({ studentId, seatId, startDate, endDate, notes });

    // Dispatch RESERVATION_CONFIRMED event
    if (window.notificationService && window.NOTIFICATION_EVENTS) {
      window.notificationService.dispatchEvent(window.NOTIFICATION_EVENTS.RESERVATION_CONFIRMED, {
        studentId,
        seatId,
        reservationId: reservation.id,
        startDate,
        endDate
      });
    }

    modal.close();
    drawer.close();
    toast.show('Seat reserved & confirmation queued!', 'success');
    app._navigate();
  } catch (e) {
    toast.show(e.message, 'error');
  }
};

})();

// ─── PAGE: students.js ───
(function() {
// Students Page
window.Pages.renderStudents = function renderStudents(container) {
  const branchId = store.getActiveBranchId();
  let students = store.getStudents(branchId);
  let filter = 'all';
  let search = '';
  let page = 1;
  const perPage = 15;

  function getFilteredStudents() {
    let result = [...students];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.phone.includes(q) ||
        s.id.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q)
      );
    }
    if (filter !== 'all') {
      const today_ = new Date();
      result = result.filter(s => {
        const membership = store.getActiveMembership(s.id);
        const assignment = store.getStudentAssignment(s.id);
        switch (filter) {
          case 'active': return membership && new Date(membership.endDate) >= today_;
          case 'expired': return !membership || new Date(membership.endDate) < today_;
          case 'expiring': {
            if (!membership) return false;
            const d = utils.daysUntil(membership.endDate);
            return d !== null && d >= 0 && d <= 7;
          }
          case 'payment-due': {
            if (!membership) return false;
            return store.getPaymentStatus(membership.id) !== 'paid';
          }
          case 'no-seat': return !assignment;
          default: return true;
        }
      });
    }
    return result;
  }

  function render() {
    const filtered = getFilteredStudents();
    const totalPages = Math.ceil(filtered.length / perPage);
    const pageStudents = filtered.slice((page - 1) * perPage, page * perPage);

    container.innerHTML = `
      <div class="page-header">
        <div class="page-header-row">
          <div>
            <h1 class="page-title">Students</h1>
            <p class="page-subtitle">${students.length} students registered</p>
          </div>
          <button class="btn btn-primary" id="add-student-btn" onclick="openAddStudentModal()">
            ${icons['user-plus']} Add Student
          </button>
        </div>
      </div>

      <div class="table-container">
        <div class="table-header">
          <div style="display:flex;align-items:center;gap:var(--space-3);flex-wrap:wrap;">
            <div class="input-group" style="width:260px;">
              <div class="input-group-prefix">${icons.search}</div>
              <input class="input" type="text" placeholder="Search by name, phone, ID..." id="student-search"
                value="${search}"
                oninput="handleStudentSearch(this.value)"
              />
            </div>
            <div class="filter-tabs">
              ${['all','active','expired','expiring','payment-due','no-seat'].map(f => `
                <button class="filter-tab ${filter === f ? 'active' : ''}" onclick="setStudentFilter('${f}')">
                  ${f === 'all' ? 'All' : f === 'payment-due' ? 'Payment Due' : f === 'no-seat' ? 'No Seat' : capitalizeFirst(f)}
                </button>
              `).join('')}
            </div>
          </div>
          <div style="font-size:var(--text-sm);color:var(--color-text-tertiary);">${filtered.length} result${filtered.length !== 1 ? 's' : ''}</div>
        </div>

        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Phone</th>
                <th>Seat</th>
                <th>Plan</th>
                <th>Start</th>
                <th>Expiry</th>
                <th>Payment</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${pageStudents.length ? pageStudents.map(s => renderStudentRow(s)).join('') : `
                <tr><td colspan="9">
                  <div class="empty-state">
                    <div class="empty-icon">${icons.users}</div>
                    <div class="empty-title">No students found</div>
                    <div class="empty-desc">${search ? 'Try a different search.' : 'Add a student to get started.'}</div>
                    ${!search ? `<button class="btn btn-primary" onclick="openAddStudentModal()">Add Student</button>` : ''}
                  </div>
                </td></tr>
              `}
            </tbody>
          </table>
        </div>

        ${totalPages > 1 ? `
        <div class="table-footer">
          <div style="font-size:var(--text-sm);color:var(--color-text-tertiary);">
            Showing ${(page-1)*perPage+1}–${Math.min(page*perPage,filtered.length)} of ${filtered.length}
          </div>
          <div class="table-pagination">
            <button class="page-btn" onclick="setPage(${page-1})" ${page === 1 ? 'disabled' : ''}>${icons.chevronLeft}</button>
            ${Array.from({length:Math.min(totalPages,5)}).map((_,i) => {
              const p = i + 1;
              return `<button class="page-btn ${page === p ? 'active' : ''}" onclick="setPage(${p})">${p}</button>`;
            }).join('')}
            <button class="page-btn" onclick="setPage(${page+1})" ${page === totalPages ? 'disabled' : ''}>${icons.chevronRight}</button>
          </div>
        </div>` : ''}
      </div>
    `;

    window.handleStudentSearch = (q) => { search = q; page = 1; render(); };
    window.setStudentFilter = (f) => { filter = f; page = 1; render(); };
    window.setPage = (p) => { page = p; render(); };
  }

  render();
}

function renderStudentRow(s) {
  const membership = store.getActiveMembership(s.id);
  const assignment = store.getStudentAssignment(s.id);
  const seat = assignment ? store.getSeat(assignment.seatId) : null;
  const plan = membership ? store.getMembershipPlan(membership.planId) : null;
  const payStatus = membership ? store.getPaymentStatus(membership.id) : null;
  const today_ = new Date();
  const isActive = membership && new Date(membership.endDate) >= today_;

  return `
    <tr onclick="app.navigate('/student', {id:'${s.id}'})">
      <td>
        <div class="student-cell">
          <div class="avatar" style="background:${s.avatar};">${utils.initials(s.name)}</div>
          <div>
            <div class="student-name">${s.name}</div>
            <div class="student-id">${s.id}</div>
          </div>
        </div>
      </td>
      <td style="color:var(--color-text-secondary);">${s.phone}</td>
      <td>
        ${seat ? `<span class="badge badge-indigo"><span class="badge-dot"></span>${seat.label}</span>` : `<span style="color:var(--color-text-quaternary);">—</span>`}
      </td>
      <td style="color:var(--color-text-secondary);">${plan?.name || '—'}</td>
      <td style="color:var(--color-text-secondary);">${membership ? utils.formatDate(membership.startDate, {day:'numeric',month:'short'}) : '—'}</td>
      <td>${membership ? `<span style="color:${utils.daysUntil(membership.endDate) <= 7 ? 'var(--sf-warning-600)' : 'var(--color-text-secondary)'};">${utils.formatDate(membership.endDate, {day:'numeric',month:'short'})}</span>` : '—'}</td>
      <td>${payStatus ? paymentStatusBadge(payStatus) : '—'}</td>
      <td>${isActive ? `<span class="badge badge-success"><span class="badge-dot"></span>Active</span>` : `<span class="badge badge-neutral"><span class="badge-dot"></span>${membership ? 'Expired' : 'No Membership'}</span>`}</td>
      <td onclick="event.stopPropagation()">
        <button class="btn btn-ghost btn-icon btn-sm" onclick="openStudentActions(event, '${s.id}')" title="Actions">
          ${icons['more-vertical']}
        </button>
      </td>
    </tr>
  `;
}

window.openStudentActions = function(event, studentId) {
  event.stopPropagation();
  document.getElementById('student-actions-menu')?.remove();

  const btn = event.currentTarget;
  const rect = btn.getBoundingClientRect();
  const menu = document.createElement('div');
  menu.id = 'student-actions-menu';
  menu.className = 'dropdown-menu';
  menu.style.cssText = `position:fixed;top:${rect.bottom + 4}px;right:${window.innerWidth - rect.right}px;z-index:300;`;

  const assignment = store.getStudentAssignment(studentId);
  const seat = assignment ? store.getSeat(assignment.seatId) : null;
  const membership = store.getActiveMembership(studentId);

  menu.innerHTML = `
    <button class="dropdown-item" onclick="app.navigate('/student', {id:'${studentId}'}); document.getElementById('student-actions-menu')?.remove()">${icons.eye} View Profile</button>
    <button class="dropdown-item" onclick="openSendWhatsAppModal('${studentId}'); document.getElementById('student-actions-menu')?.remove()">${icons.bell} Send WhatsApp Message</button>
    ${!assignment ? `<button class="dropdown-item" onclick="openAssignModal(); document.getElementById('student-actions-menu')?.remove()">${icons['map-pin']} Assign Seat</button>` : ''}
    ${assignment ? `<button class="dropdown-item" onclick="openTransferModal('${assignment.seatId}'); document.getElementById('student-actions-menu')?.remove()">${icons['arrow-right']} Transfer Seat</button>` : ''}
    ${membership ? `<button class="dropdown-item" onclick="openPaymentModal('${studentId}', '${membership.id}'); document.getElementById('student-actions-menu')?.remove()">${icons['dollar-sign']} Record Payment</button>` : ''}
    ${membership ? `<button class="dropdown-item" onclick="openRenewModal('${studentId}', '${assignment?.seatId}'); document.getElementById('student-actions-menu')?.remove()">${icons.repeat} Renew Membership</button>` : ''}
    <div class="dropdown-separator"></div>
    <button class="dropdown-item danger" onclick="confirmDisableStudent('${studentId}'); document.getElementById('student-actions-menu')?.remove()">${icons.trash} Deactivate</button>
  `;

  document.body.appendChild(menu);
  setTimeout(() => document.addEventListener('click', () => menu.remove(), { once: true }));
};

window.confirmDisableStudent = function(studentId) {
  const student = store.getStudent(studentId);
  confirmDialog('Deactivate Student', `Are you sure you want to deactivate ${student?.name}? This will not delete their history.`, () => {
    store.updateStudent(studentId, { status: 'inactive' });
    toast.show('Student deactivated', 'success');
    app._navigate();
  });
};

window.openAddStudentModal = function() {
  const branchId = store.getActiveBranchId();

  modal.open('Add New Student', `
    <div style="display:flex;flex-direction:column;gap:var(--space-4);">
      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Full Name <span class="required">*</span></label>
          <input type="text" class="input" id="new-student-name" placeholder="Rahul Sharma">
        </div>
        <div class="form-group">
          <label class="form-label">WhatsApp Phone <span class="required">*</span></label>
          <div style="display:flex;gap:var(--space-2);">
            <select class="select" id="new-student-cc" style="width:105px;flex-shrink:0;">
              <option value="+91" selected>🇮🇳 +91</option>
              <option value="+1">🇺🇸 +1</option>
              <option value="+44">🇬🇧 +44</option>
              <option value="+971">🇦🇪 +971</option>
            </select>
            <input type="tel" class="input flex-1" id="new-student-phone" placeholder="9876543210" maxlength="15">
          </div>
        </div>
      </div>
      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Email</label>
          <input type="email" class="input" id="new-student-email" placeholder="student@email.com">
        </div>
        <div class="form-group">
          <label class="form-label">Preferred Notification Language</label>
          <select class="select" id="new-student-lang">
            <option value="en" selected>English</option>
            <option value="hi">हिन्दी (Hindi)</option>
            <option value="mr">मराठी (Marathi)</option>
          </select>
        </div>
      </div>
      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Gender</label>
          <select class="select" id="new-student-gender">
            <option>Male</option><option>Female</option><option>Other</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Course / Exam</label>
          <input type="text" class="input" id="new-student-course" placeholder="UPSC Civil Services">
        </div>
      </div>
      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">College / Institution</label>
          <input type="text" class="input" id="new-student-college" placeholder="City College">
        </div>
        <div class="form-group">
          <label class="form-label">Date of Birth</label>
          <input type="date" class="input" id="new-student-dob">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Address</label>
        <input type="text" class="input" id="new-student-address" placeholder="Full address">
      </div>
      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Emergency Contact Name</label>
          <input type="text" class="input" id="new-ec-name" placeholder="Parent / Guardian">
        </div>
        <div class="form-group">
          <label class="form-label">Emergency Contact Phone</label>
          <input type="tel" class="input" id="new-ec-phone" placeholder="9876543210">
        </div>
      </div>

      <!-- WhatsApp Consent Disclosure -->
      <div style="padding:var(--space-3);background:var(--color-bg-secondary);border:1px solid var(--color-border-secondary);border-radius:var(--radius-lg);">
        <label style="display:flex;align-items:flex-start;gap:var(--space-3);cursor:pointer;font-size:var(--text-sm);margin:0;">
          <input type="checkbox" id="new-student-optin" checked style="accent-color:var(--sf-success-600);width:16px;height:16px;margin-top:2px;">
          <div>
            <span style="font-weight:var(--fw-medium);color:var(--color-text-primary);">Opt-in for WhatsApp Notifications & Digital Receipts</span>
            <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);margin-top:2px;">
              Automatically send seat confirmations, invoices, tax receipts, and renewal reminders via WhatsApp to this student.
            </div>
          </div>
        </label>
      </div>
    </div>
  `, `
    <button class="btn btn-secondary" onclick="modal.close()">Cancel</button>
    <button class="btn btn-primary" onclick="confirmAddStudent('${branchId}')">
      ${icons['user-plus']} Add Student
    </button>
  `, { size: 'lg' });
};

window.confirmAddStudent = function(branchId) {
  const name = document.getElementById('new-student-name')?.value?.trim();
  const rawPhone = document.getElementById('new-student-phone')?.value?.trim();
  const countryCode = document.getElementById('new-student-cc')?.value || '+91';
  const email = document.getElementById('new-student-email')?.value?.trim();
  const preferredLang = document.getElementById('new-student-lang')?.value || 'en';
  const gender = document.getElementById('new-student-gender')?.value;
  const course = document.getElementById('new-student-course')?.value?.trim();
  const college = document.getElementById('new-student-college')?.value?.trim();
  const address = document.getElementById('new-student-address')?.value?.trim();
  const dob = document.getElementById('new-student-dob')?.value;
  const ecName = document.getElementById('new-ec-name')?.value?.trim();
  const ecPhone = document.getElementById('new-ec-phone')?.value?.trim();
  const whatsappOptIn = document.getElementById('new-student-optin')?.checked ?? true;

  if (!name) { toast.show('Student name is required', 'error'); return; }
  if (!rawPhone) { toast.show('Phone number is required', 'error'); return; }
  if (rawPhone.replace(/\D/g, '').length < 10) { toast.show('Please enter a valid 10-digit phone number', 'error'); return; }

  const normalizedPhone = (window.utils && window.utils.normalizePhone)
    ? window.utils.normalizePhone(rawPhone, countryCode)
    : (countryCode + rawPhone.replace(/\D/g, ''));

  try {
    const student = store.addStudent({
      name,
      phone: rawPhone,
      country_code: countryCode,
      phone_number: rawPhone.replace(/\D/g, ''),
      normalized_phone: normalizedPhone,
      preferred_language: preferredLang,
      whatsapp_opt_in: whatsappOptIn,
      whatsapp_opt_in_at: whatsappOptIn ? new Date().toISOString() : null,
      communication_preferences: {
        seat_alerts: true,
        fee_reminders: true,
        announcements: true
      },
      email, gender, course, college, address, dob, branchId,
      emergencyContact: ecName ? { name: ecName, phone: ecPhone } : null
    });

    // Dispatch welcome notification
    if (window.notificationService && window.NOTIFICATION_EVENTS) {
      window.notificationService.dispatchEvent(window.NOTIFICATION_EVENTS.STUDENT_REGISTERED, {
        studentId: student.id
      });
    }

    modal.close();
    toast.show(`Student ${name} registered successfully! WhatsApp welcome queued.`, 'success');
    app.navigate('/student', { id: student.id });
  } catch (e) {
    toast.show(e.message, 'error');
  }
};

})();

// ─── PAGE: student-profile.js ───
(function() {
// Student Profile Page
window.Pages.renderStudentProfile = function renderStudentProfile(container, params) {
  const studentId = params.id;
  if (!studentId) { app.navigate('/students'); return; }

  const student = store.getStudent(studentId);
  if (!student) {
    container.innerHTML = `<div class="empty-state"><div class="empty-title">Student not found</div><button class="btn btn-secondary" onclick="app.navigate('/students')">Back to Students</button></div>`;
    return;
  }

  const membership = store.getActiveMembership(studentId);
  const allMemberships = store.getMemberships(studentId);
  const assignment = store.getStudentAssignment(studentId);
  const seat = assignment ? store.getSeat(assignment.seatId) : null;
  const room = seat ? store.getRoom(seat.roomId) : null;
  const floor = room ? store.getFloor(room.floorId) : null;
  const plan = membership ? store.getMembershipPlan(membership.planId) : null;
  const payStatus = membership ? store.getPaymentStatus(membership.id) : null;
  const paidAmount = membership ? store.getPaidAmount(membership.id) : 0;
  const pendingAmount = membership ? store.getPendingAmount(membership.id) : 0;
  const payments = store.getPaymentsForStudent(studentId);
  const allAssignments = store.getAssignments(null).filter(a => a.studentId === studentId);
  const transfers = (store.db.seatTransfers || []).filter(t => t.studentId === studentId);
  const attendanceRecords = store.getAttendance(studentId);
  const recentActivity = store.getActivityLogs(100).filter(a => a.entityId === studentId || a.description?.includes(student.name)).slice(0, 10);

  // Attendance stats
  const totalDays = attendanceRecords.length;
  const presentDays = attendanceRecords.filter(a => a.checkIn).length;
  const avgDuration = attendanceRecords.filter(a => a.duration).reduce((sum, a) => sum + a.duration, 0) / Math.max(attendanceRecords.filter(a=>a.duration).length, 1);

  let activeTab = 'overview';

  function render() {
    container.innerHTML = `
      <!-- Back button -->
      <div style="margin-bottom:var(--space-4);">
        <button class="btn btn-ghost" onclick="app.navigate('/students')" style="gap:var(--space-2);">
          ${icons.chevronLeft} Back to Students
        </button>
      </div>

      <!-- Profile Header -->
      <div class="profile-header">
        <div class="avatar avatar-xl" style="background:${student.avatar};">${utils.initials(student.name)}</div>
        <div class="profile-info">
          <div class="profile-name">${student.name}</div>
          <div class="profile-id">${student.id}</div>
          <div class="profile-meta">
            ${membership ? membershipStatusBadge(membership.endDate, membership.status) : `<span class="badge badge-neutral"><span class="badge-dot"></span>No Membership</span>`}
            ${seat ? `<span class="badge badge-indigo"><span class="badge-dot"></span>Seat ${seat.label}</span>` : ''}
            <span style="font-size:var(--text-sm);color:var(--color-text-tertiary);">${student.course || '—'}</span>
          </div>
        </div>
        <div class="profile-actions">
          <button class="btn btn-secondary" onclick="openSendWhatsAppModal('${studentId}')" style="color:var(--sf-success-700);border-color:var(--sf-success-300);">
            ${icons.bell} Send WhatsApp
          </button>
          ${membership ? `
          <button class="btn btn-secondary" onclick="openPaymentModal('${studentId}', '${membership.id}')">
            ${icons['dollar-sign']} Payment
          </button>
          <button class="btn btn-secondary" onclick="openRenewModal('${studentId}', '${seat?.id}')">
            ${icons.repeat} Renew
          </button>` : ''}
          ${!assignment ? `<button class="btn btn-primary" onclick="openAssignModal()">
            ${icons['map-pin']} Assign Seat
          </button>` : ''}
          <button class="btn btn-secondary" onclick="openEditStudentModal('${studentId}')">
            ${icons.edit} Edit
          </button>
        </div>
      </div>

      <!-- Stats Row -->
      <div class="grid-4" style="margin-bottom:var(--space-6);">
        <div class="stat-card">
          <div class="stat-card-top"><div class="stat-card-label">Total Paid</div></div>
          <div class="stat-card-value" style="font-size:var(--text-xl);color:var(--sf-success-600);">${utils.formatINR(paidAmount)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-top"><div class="stat-card-label">Outstanding</div></div>
          <div class="stat-card-value" style="font-size:var(--text-xl);color:${pendingAmount > 0 ? 'var(--sf-error-600)' : 'var(--color-text-primary)'};">${utils.formatINR(pendingAmount)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-top"><div class="stat-card-label">Attendance Days</div></div>
          <div class="stat-card-value" style="font-size:var(--text-xl);">${presentDays}</div>
          <div class="stat-card-change neutral">of ${totalDays} recorded</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-top"><div class="stat-card-label">Avg. Daily Hours</div></div>
          <div class="stat-card-value" style="font-size:var(--text-xl);">${Math.floor(avgDuration / 60)}h ${Math.floor(avgDuration % 60)}m</div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs">
        ${['overview','payments','attendance','history','communication'].map(t => `
          <button class="tab-btn ${activeTab === t ? 'active' : ''}" onclick="switchProfileTab('${t}')">${capitalizeFirst(t)}</button>
        `).join('')}
      </div>

      <div id="profile-tab-content">
        ${renderTab(activeTab)}
      </div>
    `;

    window.switchProfileTab = (tab) => {
      activeTab = tab;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.textContent.trim().toLowerCase() === tab));
      document.getElementById('profile-tab-content').innerHTML = renderTab(tab);
    };
  }

  function renderTab(tab) {
    switch (tab) {
      case 'overview': return renderOverviewTab();
      case 'payments': return renderPaymentsTab();
      case 'attendance': return renderAttendanceTab();
      case 'history': return renderHistoryTab();
      case 'communication': return renderCommunicationTab();
      default: return '';
    }
  }

  function renderOverviewTab() {
    return `
      <div class="grid-2" style="gap:var(--space-5);">
        <!-- Personal Info -->
        <div class="card">
          <div class="card-header"><div class="card-title">Personal Information</div></div>
          <div class="card-body">
            <div class="info-grid">
              <div class="info-item"><div class="info-label">Full Name</div><div class="info-value">${student.name}</div></div>
              <div class="info-item"><div class="info-label">Phone</div><div class="info-value">${student.phone}</div></div>
              <div class="info-item"><div class="info-label">Email</div><div class="info-value">${student.email || '—'}</div></div>
              <div class="info-item"><div class="info-label">Gender</div><div class="info-value">${student.gender || '—'}</div></div>
              <div class="info-item"><div class="info-label">Date of Birth</div><div class="info-value">${student.dob ? utils.formatDate(student.dob) : '—'}</div></div>
              <div class="info-item"><div class="info-label">Course</div><div class="info-value">${student.course || '—'}</div></div>
              <div class="info-item"><div class="info-label">College</div><div class="info-value">${student.college || '—'}</div></div>
              <div class="info-item"><div class="info-label">Address</div><div class="info-value">${student.address || '—'}</div></div>
              <div class="info-item"><div class="info-label">Emergency Contact</div><div class="info-value">${student.emergencyContact?.name || '—'} ${student.emergencyContact?.phone ? '· ' + student.emergencyContact.phone : ''}</div></div>
              <div class="info-item"><div class="info-label">Member Since</div><div class="info-value">${utils.formatDate(student.createdAt)}</div></div>
            </div>
          </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:var(--space-5);">
          <!-- Current Seat -->
          <div class="card">
            <div class="card-header">
              <div class="card-title">Current Seat</div>
              ${seat ? `<button class="btn btn-secondary btn-sm" onclick="app.navigate('/seat-map')">View on Map</button>` : ''}
            </div>
            <div class="card-body">
              ${seat ? `
                <div class="info-grid">
                  <div class="info-item"><div class="info-label">Seat</div><div class="info-value"><span class="badge badge-indigo">${seat.label}</span></div></div>
                  <div class="info-item"><div class="info-label">Type</div><div class="info-value">${capitalizeFirst(seat.type)}</div></div>
                  <div class="info-item"><div class="info-label">Room</div><div class="info-value">${room?.name || '—'}</div></div>
                  <div class="info-item"><div class="info-label">Floor</div><div class="info-value">${floor?.name || '—'}</div></div>
                </div>
              ` : `
                <div class="empty-state" style="padding:var(--space-6);">
                  <div class="empty-icon">${icons.map}</div>
                  <div class="empty-title" style="font-size:var(--text-sm);">No seat assigned</div>
                  <button class="btn btn-secondary btn-sm" onclick="openAssignModal()">Assign Seat</button>
                </div>
              `}
            </div>
          </div>

          <!-- Membership -->
          <div class="card">
            <div class="card-header">
              <div class="card-title">Membership</div>
              ${membership ? `<button class="btn btn-primary btn-sm" onclick="openRenewModal('${studentId}', '${seat?.id}')">Renew</button>` : ''}
            </div>
            <div class="card-body">
              ${membership ? `
                <div class="info-grid">
                  <div class="info-item"><div class="info-label">Plan</div><div class="info-value">${plan?.name || membership.planName}</div></div>
                  <div class="info-item"><div class="info-label">Status</div><div class="info-value">${membershipStatusBadge(membership.endDate, membership.status)}</div></div>
                  <div class="info-item"><div class="info-label">Start Date</div><div class="info-value">${utils.formatDate(membership.startDate)}</div></div>
                  <div class="info-item"><div class="info-label">End Date</div><div class="info-value">${utils.formatDate(membership.endDate)}</div></div>
                  <div class="info-item"><div class="info-label">Price</div><div class="info-value">${utils.formatINR(membership.price)}</div></div>
                  <div class="info-item"><div class="info-label">Payment</div><div class="info-value">${paymentStatusBadge(payStatus)}</div></div>
                  <div class="info-item"><div class="info-label">Paid</div><div class="info-value" style="color:var(--sf-success-600);">${utils.formatINR(paidAmount)}</div></div>
                  <div class="info-item"><div class="info-label">Pending</div><div class="info-value" style="color:${pendingAmount > 0 ? 'var(--sf-error-600)' : 'var(--color-text-primary)'};">${utils.formatINR(pendingAmount)}</div></div>
                </div>
              ` : `
                <div class="empty-state" style="padding:var(--space-6);">
                  <div class="empty-icon">${icons['credit-card']}</div>
                  <div class="empty-title" style="font-size:var(--text-sm);">No active membership</div>
                </div>
              `}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderPaymentsTab() {
    return `
      <div class="table-container">
        <div class="table-header">
          <div class="table-title">Payment History</div>
          ${membership ? `<button class="btn btn-primary btn-sm" onclick="openPaymentModal('${studentId}', '${membership.id}')">Record Payment</button>` : ''}
        </div>
        <div class="table-scroll">
          <table>
            <thead>
              <tr><th>Date</th><th>Receipt</th><th>Amount</th><th>Method</th><th>Status</th></tr>
            </thead>
            <tbody>
              ${payments.length ? payments.sort((a,b)=>new Date(b.recordedAt)-new Date(a.recordedAt)).map(p => `
                <tr>
                  <td style="color:var(--color-text-secondary);">${utils.formatDate(p.recordedAt)}</td>
                  <td><span style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--sf-indigo-600);">${p.receiptNumber}</span></td>
                  <td style="font-weight:var(--fw-semibold);color:var(--sf-success-600);">${utils.formatINR(p.amount)}</td>
                  <td style="color:var(--color-text-secondary);">${p.method}</td>
                  <td><span class="badge badge-success"><span class="badge-dot"></span>Recorded</span></td>
                </tr>
              `).join('') : `
                <tr><td colspan="5"><div class="empty-state" style="padding:var(--space-8);">
                  <div class="empty-icon">${icons['dollar-sign']}</div>
                  <div class="empty-title">No payments yet</div>
                </div></td></tr>
              `}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderAttendanceTab() {
    const recent = [...attendanceRecords].sort((a,b) => b.date.localeCompare(a.date)).slice(0, 30);
    return `
      <div class="table-container">
        <div class="table-header">
          <div class="table-title">Attendance Record (Last 30 days)</div>
          <div style="display:flex;gap:var(--space-3);">
            <button class="btn btn-success btn-sm" onclick="doCheckIn('${studentId}')">Check In</button>
            <button class="btn btn-secondary btn-sm" onclick="doCheckOut('${studentId}')">Check Out</button>
          </div>
        </div>
        <div class="table-scroll">
          <table>
            <thead>
              <tr><th>Date</th><th>Check In</th><th>Check Out</th><th>Duration</th><th>Status</th></tr>
            </thead>
            <tbody>
              ${recent.length ? recent.map(a => `
                <tr>
                  <td style="color:var(--color-text-secondary);">${utils.formatDate(a.date)}</td>
                  <td>${a.checkIn ? utils.formatTime(a.checkIn) : '—'}</td>
                  <td>${a.checkOut ? utils.formatTime(a.checkOut) : '—'}</td>
                  <td>${a.duration ? Math.floor(a.duration/60)+'h '+a.duration%60+'m' : '—'}</td>
                  <td>${a.status === 'checked-out' ? `<span class="badge badge-success"><span class="badge-dot"></span>Checked Out</span>` : `<span class="badge badge-indigo"><span class="badge-dot"></span>Checked In</span>`}</td>
                </tr>
              `).join('') : `
                <tr><td colspan="5"><div class="empty-state" style="padding:var(--space-8);">
                  <div class="empty-icon">${icons.clock}</div>
                  <div class="empty-title">No attendance records</div>
                </div></td></tr>
              `}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderHistoryTab() {
    return `
      <div class="grid-2" style="gap:var(--space-5);">
        <!-- Seat History -->
        <div class="card">
          <div class="card-header"><div class="card-title">Seat History</div></div>
          <div class="card-body">
            <div class="timeline">
              ${allAssignments.length ? allAssignments.map(a => {
                const s_ = store.getSeat(a.seatId);
                return `
                  <div class="timeline-item">
                    <div class="timeline-dot">${icons['map-pin']}</div>
                    <div class="timeline-content">
                      <div class="timeline-title">Seat ${s_?.label || a.seatId}</div>
                      <div class="timeline-time">${utils.formatDate(a.startDate)} → ${a.status === 'active' ? 'Present' : utils.formatDate(a.endDate)}</div>
                      <div style="font-size:var(--text-xs);margin-top:2px;">${a.status === 'active' ? `<span class="badge badge-success">Current</span>` : `<span class="badge badge-neutral">${capitalizeFirst(a.status)}</span>`}</div>
                    </div>
                  </div>
                `;
              }).join('') : '<div style="color:var(--color-text-tertiary);font-size:var(--text-sm);">No seat history</div>'}
            </div>
          </div>
        </div>

        <!-- Activity Timeline -->
        <div class="card">
          <div class="card-header"><div class="card-title">Activity Timeline</div></div>
          <div class="card-body">
            <div class="timeline">
              ${recentActivity.length ? recentActivity.map(a => `
                <div class="timeline-item">
                  <div class="timeline-dot">${icons.activity}</div>
                  <div class="timeline-content">
                    <div class="timeline-title">${a.description}</div>
                    <div class="timeline-time">${utils.formatRelative(a.timestamp)}</div>
                  </div>
                </div>
              `).join('') : `
                <div style="color:var(--color-text-tertiary);font-size:var(--text-sm);">No recent activity</div>
              `}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderCommunicationTab() {
    const studentDocs = (store.getDocumentsForStudent ? store.getDocumentsForStudent(studentId) : []);
    const studentMsgs = (store.getNotificationMessagesForStudent ? store.getNotificationMessagesForStudent(studentId) : []);
    const optIn = student.whatsapp_opt_in !== false;
    const phoneDisplay = student.normalized_phone || student.phone;

    return `
      <div style="display:flex;flex-direction:column;gap:var(--space-5);">
        <!-- WhatsApp Profile & Preferences Card -->
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">WhatsApp Communication Status</div>
              <div class="card-subtitle">Consent, registered phone, and automated dispatch settings</div>
            </div>
            <button class="btn btn-primary btn-sm" onclick="openSendWhatsAppModal('${studentId}')">
              ${icons.bell} Send Message
            </button>
          </div>
          <div class="card-body">
            <div class="grid-3" style="gap:var(--space-4);align-items:stretch;">
              <div style="padding:var(--space-4);background:var(--color-bg-secondary);border-radius:var(--radius-lg);border:1px solid var(--color-border-secondary);">
                <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);text-transform:uppercase;font-weight:var(--fw-semibold);">Registered WhatsApp Phone</div>
                <div style="font-size:var(--text-base);font-weight:var(--fw-bold);color:var(--color-text-primary);margin-top:var(--space-2);display:flex;align-items:center;gap:var(--space-2);">
                  <span>${phoneDisplay}</span>
                  <span class="badge badge-success" style="font-size:10px;">E.164</span>
                </div>
                <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);margin-top:var(--space-1);">Primary delivery destination</div>
              </div>

              <div style="padding:var(--space-4);background:var(--color-bg-secondary);border-radius:var(--radius-lg);border:1px solid var(--color-border-secondary);">
                <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);text-transform:uppercase;font-weight:var(--fw-semibold);">Delivery Consent</div>
                <div style="margin-top:var(--space-2);display:flex;align-items:center;justify-content:space-between;">
                  <span class="badge ${optIn ? 'badge-success' : 'badge-neutral'}">
                    <span class="badge-dot"></span>${optIn ? 'Opted In' : 'Opted Out'}
                  </span>
                  <button class="btn btn-ghost btn-sm" onclick="toggleWhatsAppOptIn('${studentId}')">
                    ${optIn ? 'Revoke' : 'Opt In'}
                  </button>
                </div>
                <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);margin-top:var(--space-1);">${optIn ? 'Consented to receive automated messages' : 'Messages will be suppressed'}</div>
              </div>

              <div style="padding:var(--space-4);background:var(--color-bg-secondary);border-radius:var(--radius-lg);border:1px solid var(--color-border-secondary);">
                <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);text-transform:uppercase;font-weight:var(--fw-semibold);">Language Preference</div>
                <div style="font-size:var(--text-base);font-weight:var(--fw-bold);color:var(--color-text-primary);margin-top:var(--space-2);">
                  ${student.preferred_language === 'hi' ? 'हिन्दी (Hindi)' : student.preferred_language === 'mr' ? 'मराठी (Marathi)' : 'English (en)'}
                </div>
                <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);margin-top:var(--space-1);">Template locale</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Generated Documents (Invoices & Receipts) -->
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">Generated Documents & Tax Invoices</div>
              <div class="card-subtitle">Official printable tax invoices and payment receipts</div>
            </div>
            <span class="badge badge-indigo">${studentDocs.length} Total</span>
          </div>
          <div class="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Doc Number</th>
                  <th>Type</th>
                  <th>Date</th>
                  <th>Total Amount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${studentDocs.map(d => `
                  <tr>
                    <td><span style="font-family:var(--font-mono);font-size:var(--text-xs);font-weight:var(--fw-semibold);color:var(--sf-indigo-600);">${d.documentNumber}</span></td>
                    <td><span class="badge ${d.type === 'invoice' ? 'badge-indigo' : 'badge-success'}">${d.type === 'invoice' ? 'Tax Invoice' : 'Payment Receipt'}</span></td>
                    <td style="color:var(--color-text-secondary);">${utils.formatDate(d.createdAt)}</td>
                    <td style="font-weight:var(--fw-semibold);">${utils.formatINR(d.amount)}</td>
                    <td><span class="badge badge-success"><span class="badge-dot"></span>${d.status.toUpperCase()}</span></td>
                    <td>
                      <div style="display:flex;gap:var(--space-2);">
                        <button class="btn btn-secondary btn-sm" onclick="invoiceGenerator.previewDocument('${d.id}')">
                          ${icons.eye} View
                        </button>
                        <button class="btn btn-ghost btn-sm" onclick="invoiceGenerator.printDocument('${d.id}')">
                          ${icons.fileText} Print
                        </button>
                      </div>
                    </td>
                  </tr>
                `).join('') || `
                  <tr><td colspan="6"><div class="empty-state" style="padding:var(--space-6);"><div class="empty-title" style="font-size:var(--text-sm);">No documents generated yet</div></div></td></tr>
                `}
              </tbody>
            </table>
          </div>
        </div>

        <!-- WhatsApp Dispatch & Delivery Logs -->
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">WhatsApp Communication History</div>
              <div class="card-subtitle">Automated event triggers, reminders, and delivery timeline</div>
            </div>
            <span class="badge badge-success">${studentMsgs.length} Dispatches</span>
          </div>
          <div class="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Message Preview</th>
                  <th>Status</th>
                  <th>Dispatched At</th>
                  <th>Idempotency Key</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${studentMsgs.map(m => {
                  const badgeClass = m.status === 'delivered' ? 'badge-success' : m.status === 'failed' ? 'badge-error' : m.status === 'skipped' ? 'badge-neutral' : 'badge-indigo';
                  return `
                    <tr>
                      <td><span class="badge badge-indigo" style="font-size:11px;">${m.eventType}</span></td>
                      <td style="max-width:280px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:var(--text-xs);color:var(--color-text-secondary);" title="${m.content}">
                        ${m.content}
                      </td>
                      <td><span class="badge ${badgeClass}" style="font-size:11px;"><span class="badge-dot"></span>${m.status.toUpperCase()}</span></td>
                      <td style="font-size:var(--text-xs);color:var(--color-text-tertiary);">${utils.formatDate(m.createdAt, {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</td>
                      <td><span style="font-family:var(--font-mono);font-size:10px;color:var(--color-text-tertiary);">${m.idempotencyKey || '—'}</span></td>
                      <td>
                        <button class="btn btn-ghost btn-sm" onclick="retryStudentWhatsAppMessage('${m.id}')">
                          ${icons.repeat} Resend
                        </button>
                      </td>
                    </tr>
                  `;
                }).join('') || `
                  <tr><td colspan="6"><div class="empty-state" style="padding:var(--space-6);"><div class="empty-title" style="font-size:var(--text-sm);">No WhatsApp dispatches recorded</div></div></td></tr>
                `}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  window.doCheckIn = function(studentId) {
    try {
      store.checkIn(studentId);
      toast.show('Student checked in!', 'success');
      switchProfileTab('attendance');
    } catch (e) { toast.show(e.message, 'error'); }
  };

  window.doCheckOut = function(studentId) {
    try {
      store.checkOut(studentId);
      toast.show('Student checked out!', 'success');
      switchProfileTab('attendance');
    } catch (e) { toast.show(e.message, 'error'); }
  };

  window.openEditStudentModal = function(studentId) {
    const s = store.getStudent(studentId);
    modal.open('Edit Student', `
      <div style="display:flex;flex-direction:column;gap:var(--space-4);">
        <div class="grid-2">
          <div class="form-group"><label class="form-label">Full Name</label><input type="text" class="input" id="edit-name" value="${s.name}"></div>
          <div class="form-group"><label class="form-label">Phone</label><input type="tel" class="input" id="edit-phone" value="${s.phone}"></div>
        </div>
        <div class="grid-2">
          <div class="form-group"><label class="form-label">Email</label><input type="email" class="input" id="edit-email" value="${s.email || ''}"></div>
          <div class="form-group">
            <label class="form-label">Notification Language</label>
            <select class="select" id="edit-lang">
              <option value="en" ${s.preferred_language === 'en' ? 'selected' : ''}>English</option>
              <option value="hi" ${s.preferred_language === 'hi' ? 'selected' : ''}>हिन्दी (Hindi)</option>
              <option value="mr" ${s.preferred_language === 'mr' ? 'selected' : ''}>मराठी (Marathi)</option>
            </select>
          </div>
        </div>
        <div class="form-group"><label class="form-label">Course</label><input type="text" class="input" id="edit-course" value="${s.course || ''}"></div>
        <div class="form-group"><label class="form-label">Address</label><input type="text" class="input" id="edit-address" value="${s.address || ''}"></div>
      </div>
    `, `
      <button class="btn btn-secondary" onclick="modal.close()">Cancel</button>
      <button class="btn btn-primary" onclick="confirmEditStudent('${studentId}')">Save Changes</button>
    `);
  };

  window.confirmEditStudent = function(studentId) {
    const name = document.getElementById('edit-name')?.value?.trim();
    const phone = document.getElementById('edit-phone')?.value?.trim();
    const lang = document.getElementById('edit-lang')?.value || 'en';
    if (!name || !phone) { toast.show('Name and phone are required', 'error'); return; }
    
    const countryCode = '+91';
    const normalized = (window.utils && window.utils.normalizePhone) ? window.utils.normalizePhone(phone, countryCode) : (countryCode + phone.replace(/\D/g, ''));
    
    store.updateStudent(studentId, {
      name,
      phone,
      normalized_phone: normalized,
      preferred_language: lang,
      email: document.getElementById('edit-email')?.value?.trim(),
      course: document.getElementById('edit-course')?.value?.trim(),
      address: document.getElementById('edit-address')?.value?.trim(),
    });
    modal.close();
    toast.show('Student updated!', 'success');
    render();
  };

  window.toggleWhatsAppOptIn = function(studentId) {
    const s = store.getStudent(studentId);
    if (!s) return;
    const current = s.whatsapp_opt_in !== false;
    store.updateStudent(studentId, {
      whatsapp_opt_in: !current,
      whatsapp_opt_in_at: !current ? new Date().toISOString() : null
    });
    toast.show(`WhatsApp status updated: ${!current ? 'Opted In' : 'Opted Out'}`, 'info');
    render();
  };

  window.retryStudentWhatsAppMessage = function(messageId) {
    if (window.notificationService && window.notificationService.retryFailedMessage) {
      window.notificationService.retryFailedMessage(messageId).then(res => {
        toast.show('Message resent via WhatsApp provider!', 'success');
        render();
      }).catch(err => {
        toast.show(err.message, 'error');
      });
    } else {
      toast.show('Message re-queued for delivery', 'info');
      render();
    }
  };

  window.openSendWhatsAppModal = function(studentId) {
    const s = store.getStudent(studentId);
    if (!s) return;

    modal.open(`Send WhatsApp to ${s.name}`, `
      <div style="display:flex;flex-direction:column;gap:var(--space-4);">
        <div style="padding:var(--space-3);background:var(--color-bg-secondary);border-radius:var(--radius-lg);font-size:var(--text-sm);">
          <div>Recipient: <strong>${s.name}</strong> (${s.normalized_phone || s.phone})</div>
          <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);margin-top:2px;">
            Status: ${s.whatsapp_opt_in !== false ? '<span style="color:var(--sf-success-600);font-weight:600;">Consented</span>' : '<span style="color:var(--sf-warning-600);font-weight:600;">Opted Out</span>'}
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Template / Notification Type <span class="required">*</span></label>
          <select class="select" id="custom-wa-template" onchange="updateCustomWaPreview('${studentId}', this.value)">
            <option value="GENERAL_NOTICE">General Notice / Alert</option>
            <option value="PAYMENT_REMINDER">Fee Due Reminder</option>
            <option value="EXPIRY_REMINDER">Membership Expiry Notice</option>
            <option value="HOLIDAY_ANNOUNCEMENT">Holiday / Schedule Notice</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Message Content Preview</label>
          <textarea class="textarea" id="custom-wa-content" rows="4">Hello ${s.name}, this is an official update from your study library.</textarea>
          <div class="form-hint">Variables and library contact details will be automatically included.</div>
        </div>
      </div>
    `, `
      <button class="btn btn-secondary" onclick="modal.close()">Cancel</button>
      <button class="btn btn-primary" onclick="confirmSendCustomWhatsApp('${studentId}')">
        ${icons.bell} Send via WhatsApp
      </button>
    `);

    window.updateCustomWaPreview = (sId, templateType) => {
      const stud = store.getStudent(sId);
      const ta = document.getElementById('custom-wa-content');
      if (!ta || !stud) return;
      if (templateType === 'PAYMENT_REMINDER') {
        ta.value = `Hello ${stud.name}, this is a gentle reminder that your membership fee is pending. Kindly clear your dues to ensure uninterrupted access.`;
      } else if (templateType === 'EXPIRY_REMINDER') {
        ta.value = `Hello ${stud.name}, your study library membership will expire soon. Please renew your seat promptly.`;
      } else if (templateType === 'HOLIDAY_ANNOUNCEMENT') {
        ta.value = `Dear ${stud.name}, please note that the study library will remain closed tomorrow for scheduled maintenance. Thank you.`;
      } else {
        ta.value = `Hello ${stud.name}, this is an official update from your study library.`;
      }
    };
  };

  window.confirmSendCustomWhatsApp = function(studentId) {
    const s = store.getStudent(studentId);
    const content = document.getElementById('custom-wa-content')?.value?.trim();
    if (!content) { toast.show('Message content cannot be empty', 'error'); return; }

    if (window.notificationService) {
      window.notificationService.queueMessage({
        studentId: s.id,
        phone: s.normalized_phone || s.phone,
        eventType: 'CUSTOM_NOTICE',
        templateName: 'custom_notice',
        content,
        metadata: { custom: true }
      });
      modal.close();
      toast.show(`WhatsApp notice queued for ${s.name}!`, 'success');
      render();
    }
  };

  render();
}

})();

// ─── PAGE: memberships.js ───
(function() {
// Memberships Page
window.Pages.renderMemberships = function renderMemberships(container) {
  const branchId = store.getActiveBranchId();
  const plans = store.getMembershipPlans(branchId);
  const activeMemberships = store.getStudents(branchId).map(s => {
    const m = store.getActiveMembership(s.id);
    return m ? { ...m, student: s } : null;
  }).filter(Boolean);

  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-row">
        <div>
          <h1 class="page-title">Memberships</h1>
          <p class="page-subtitle">Manage plans and active memberships</p>
        </div>
        <button class="btn btn-primary" onclick="openAddPlanModal()">
          ${icons.plus} New Plan
        </button>
      </div>
    </div>

    <!-- Membership Plans -->
    <div style="margin-bottom:var(--space-6);">
      <div class="card-title" style="margin-bottom:var(--space-4);">Membership Plans</div>
      <div class="grid-5">
        ${plans.map(plan => renderPlanCard(plan)).join('')}
        <div style="border:2px dashed var(--color-border-primary);border-radius:var(--radius-xl);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:var(--space-8);gap:var(--space-2);cursor:pointer;" onclick="openAddPlanModal()">
          <div style="color:var(--color-icon-tertiary);">${icons.plus}</div>
          <div style="font-size:var(--text-sm);color:var(--color-text-tertiary);">Custom Plan</div>
        </div>
      </div>
    </div>

    <!-- Active Memberships Table -->
    <div class="table-container">
      <div class="table-header">
        <div class="table-title">Active Memberships</div>
        <div style="font-size:var(--text-sm);color:var(--color-text-tertiary);">${activeMemberships.length} total</div>
      </div>
      <div class="table-scroll">
        <table>
          <thead>
            <tr><th>Student</th><th>Plan</th><th>Start</th><th>Expiry</th><th>Days Left</th><th>Payment</th><th>Status</th></tr>
          </thead>
          <tbody>
            ${activeMemberships.map(m => {
              const daysLeft = utils.daysUntil(m.endDate);
              const payStatus = store.getPaymentStatus(m.id);
              return `
                <tr onclick="app.navigate('/student', {id:'${m.studentId}'})">
                  <td>
                    <div class="student-cell">
                      <div class="avatar avatar-sm" style="background:${m.student?.avatar};">${utils.initials(m.student?.name || '')}</div>
                      <div class="student-name">${m.student?.name}</div>
                    </div>
                  </td>
                  <td style="color:var(--color-text-secondary);">${m.planName || '—'}</td>
                  <td style="color:var(--color-text-secondary);">${utils.formatDate(m.startDate, {day:'numeric',month:'short'})}</td>
                  <td style="color:${daysLeft <= 7 ? 'var(--sf-warning-600)' : 'var(--color-text-secondary)'};">${utils.formatDate(m.endDate, {day:'numeric',month:'short'})}</td>
                  <td>
                    <span class="${daysLeft <= 3 ? 'badge badge-error' : daysLeft <= 7 ? 'badge badge-warning' : 'badge badge-neutral'}">
                      ${daysLeft !== null ? (daysLeft > 0 ? daysLeft + 'd' : 'Expired') : '—'}
                    </span>
                  </td>
                  <td>${paymentStatusBadge(payStatus)}</td>
                  <td>${membershipStatusBadge(m.endDate, m.status)}</td>
                </tr>
              `;
            }).join('') || `
              <tr><td colspan="7"><div class="empty-state" style="padding:var(--space-8);">
                <div class="empty-icon">${icons['credit-card']}</div>
                <div class="empty-title">No active memberships</div>
              </div></td></tr>
            `}
          </tbody>
        </table>
      </div>
    </div>
  `;

  window.openAddPlanModal = function() {
    modal.open('Create Membership Plan', `
      <div style="display:flex;flex-direction:column;gap:var(--space-4);">
        <div class="form-group">
          <label class="form-label">Plan Name <span class="required">*</span></label>
          <input type="text" class="input" id="plan-name" placeholder="Monthly Premium">
        </div>
        <div class="grid-2">
          <div class="form-group">
            <label class="form-label">Duration (days) <span class="required">*</span></label>
            <input type="number" class="input" id="plan-duration" placeholder="30" min="1">
          </div>
          <div class="form-group">
            <label class="form-label">Price (₹) <span class="required">*</span></label>
            <div class="input-group"><span class="input-group-prefix">₹</span><input type="number" class="input" id="plan-price" min="0"></div>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Access Hours</label>
          <input type="text" class="input" id="plan-hours" placeholder="06:00 – 23:00">
        </div>
        <div class="form-group">
          <label class="form-label">Description</label>
          <textarea class="textarea" id="plan-desc" rows="2" placeholder="Describe this plan..."></textarea>
        </div>
      </div>
    `, `
      <button class="btn btn-secondary" onclick="modal.close()">Cancel</button>
      <button class="btn btn-primary" onclick="confirmAddPlan()">Create Plan</button>
    `);
  };

  window.confirmAddPlan = function() {
    const name = document.getElementById('plan-name')?.value?.trim();
    const duration = parseInt(document.getElementById('plan-duration')?.value);
    const price = parseFloat(document.getElementById('plan-price')?.value);
    const hours = document.getElementById('plan-hours')?.value?.trim();
    const desc = document.getElementById('plan-desc')?.value?.trim();

    if (!name) { toast.show('Plan name is required', 'error'); return; }
    if (!duration || duration < 1) { toast.show('Please enter a valid duration', 'error'); return; }
    if (!price || price < 0) { toast.show('Please enter a valid price', 'error'); return; }

    store.addMembershipPlan({ name, duration, durationUnit: 'days', price, accessHours: hours, description: desc });
    modal.close();
    toast.show('Membership plan created!', 'success');
    app._navigate();
  };
}

function renderPlanCard(plan) {
  const studentCount = store.db.memberships.filter(m => m.planId === plan.id && m.status === 'active').length;
  return `
    <div class="card" style="text-align:center;padding:var(--space-5);cursor:pointer;transition:all var(--transition-fast);"
      onmouseenter="this.style.boxShadow='var(--shadow-md)';this.style.transform='translateY(-2px)'"
      onmouseleave="this.style.boxShadow='';this.style.transform=''"
    >
      <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:var(--space-2);">${plan.duration} DAYS</div>
      <div style="font-size:var(--text-lg);font-weight:var(--fw-bold);color:var(--color-text-primary);margin-bottom:var(--space-2);">${plan.name}</div>
      <div style="font-size:var(--text-2xl);font-weight:var(--fw-bold);color:var(--sf-indigo-600);margin-bottom:var(--space-3);">${utils.formatINR(plan.price)}</div>
      ${plan.accessHours ? `<div style="font-size:var(--text-xs);color:var(--color-text-tertiary);margin-bottom:var(--space-3);">${plan.accessHours}</div>` : ''}
      <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);">${studentCount} active</div>
    </div>
  `;
}

})();

// ─── PAGE: payments.js ───
(function() {
// Payments Page
window.Pages.renderPayments = function renderPayments(container) {
  const branchId = store.getActiveBranchId();
  const students = store.getStudents(branchId);
  let allPayments = [];
  let filter = 'all';
  let search = '';

  // Get all payments for this branch
  students.forEach(s => {
    store.getPaymentsForStudent(s.id).forEach(p => {
      allPayments.push({ ...p, student: s });
    });
  });
  allPayments.sort((a, b) => new Date(b.recordedAt) - new Date(a.recordedAt));

  const todayPayments = allPayments.filter(p => new Date(p.recordedAt).toDateString() === new Date().toDateString());
  const monthPayments = allPayments.filter(p => {
    const d = new Date(p.recordedAt);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const todayTotal = todayPayments.reduce((s, p) => s + p.amount, 0);
  const monthTotal = monthPayments.reduce((s, p) => s + p.amount, 0);

  const pendingDues = store.getPendingDues(branchId);
  const totalPending = pendingDues.reduce((s, d) => s + d.pendingAmount, 0);

  function getFiltered() {
    let result = [...allPayments];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        p.student?.name.toLowerCase().includes(q) ||
        p.receiptNumber?.toLowerCase().includes(q)
      );
    }
    return result;
  }

  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-row">
        <div>
          <h1 class="page-title">Payments</h1>
          <p class="page-subtitle">Track collections and pending dues</p>
        </div>
        <div style="display:flex;gap:var(--space-3);">
          <button class="btn btn-secondary" onclick="switchPaymentsTab('dues')">
            ${icons['alert-circle']} Pending Dues
          </button>
          <button class="btn btn-primary" onclick="openQuickPayModal()">
            ${icons.plus} Record Payment
          </button>
        </div>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid-4" style="margin-bottom:var(--space-6);">
      ${renderPayStat('Today\'s Collection', todayTotal, 'success')}
      ${renderPayStat('This Month', monthTotal, 'indigo')}
      ${renderPayStat('Total Outstanding', totalPending, 'error')}
      ${renderPayStat('Total Transactions', allPayments.length + '', 'neutral')}
    </div>

    <!-- Tabs -->
    <div class="tabs" style="margin-bottom:0;">
      <button class="tab-btn active" id="tab-payments" onclick="switchPaymentsTab('payments')">All Payments</button>
      <button class="tab-btn" id="tab-dues" onclick="switchPaymentsTab('dues')">Pending Dues</button>
    </div>

    <div id="payments-tab-content">
      ${renderPaymentsTable(getFiltered(), search)}
    </div>
  `;

  window.switchPaymentsTab = (tab) => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('tab-' + tab)?.classList.add('active');
    const content = document.getElementById('payments-tab-content');
    if (tab === 'payments') content.innerHTML = renderPaymentsTable(getFiltered(), search);
    else content.innerHTML = renderDuesTable(pendingDues);
  };

  window.openQuickPayModal = function() {
    const students_ = store.getStudents(branchId);
    modal.open('Record Payment', `
      <div style="display:flex;flex-direction:column;gap:var(--space-4);">
        <div class="form-group">
          <label class="form-label">Student <span class="required">*</span></label>
          <select class="select" id="qpay-student" onchange="loadStudentMembership(this.value)">
            <option value="">Select student...</option>
            ${students_.map(s => `<option value="${s.id}">${s.name} — ${s.phone}</option>`).join('')}
          </select>
        </div>
        <div id="qpay-membership-info" style="display:none;padding:var(--space-3);background:var(--color-bg-secondary);border-radius:var(--radius-lg);font-size:var(--text-sm);"></div>
        <div class="form-group">
          <label class="form-label">Amount (₹) <span class="required">*</span></label>
          <div class="input-group"><span class="input-group-prefix">₹</span><input type="number" class="input" id="qpay-amount" min="1"></div>
        </div>
        <div class="form-group">
          <label class="form-label">Method</label>
          <select class="select" id="qpay-method"><option>Cash</option><option>UPI</option><option>Card</option><option>Bank Transfer</option></select>
        </div>
        <div class="form-group">
          <label class="form-label">Reference ID</label>
          <input type="text" class="input" id="qpay-ref" placeholder="Optional">
        </div>
        <div class="form-group">
          <label class="form-label">Notes</label>
          <textarea class="textarea" id="qpay-notes" rows="2" placeholder="Optional"></textarea>
        </div>
      </div>
    `, `
      <button class="btn btn-secondary" onclick="modal.close()">Cancel</button>
      <button class="btn btn-primary" onclick="confirmQuickPay()">Record Payment</button>
    `);

    window.loadStudentMembership = (studentId) => {
      if (!studentId) return;
      const membership = store.getActiveMembership(studentId);
      const info = document.getElementById('qpay-membership-info');
      if (membership) {
        const pending = store.getPendingAmount(membership.id);
        info.style.display = 'block';
        info.innerHTML = `<strong>Outstanding:</strong> ${utils.formatINR(pending)} &nbsp;·&nbsp; Plan: ${membership.planName}`;
        document.getElementById('qpay-amount').value = pending;
      } else {
        info.style.display = 'block';
        info.innerHTML = '<span style="color:var(--sf-warning-600);">No active membership found</span>';
      }
      info.dataset.membershipId = membership?.id || '';
    };

    window.confirmQuickPay = () => {
      const studentId = document.getElementById('qpay-student')?.value;
      const membershipId = document.getElementById('qpay-membership-info')?.dataset.membershipId;
      const amount = parseFloat(document.getElementById('qpay-amount')?.value || 0);
      const method = document.getElementById('qpay-method')?.value;
      const ref = document.getElementById('qpay-ref')?.value;
      const notes = document.getElementById('qpay-notes')?.value;

      if (!studentId) { toast.show('Please select a student', 'error'); return; }
      if (!membershipId) { toast.show('No active membership for this student', 'error'); return; }
      if (!amount || amount <= 0) { toast.show('Please enter a valid amount', 'error'); return; }

      try {
        const student = store.getStudent(studentId);
        const payment = store.recordPayment({ membershipId, studentId, amount, method, txnId: ref, notes });

        // Generate branded receipt document
        let receiptDoc = null;
        if (window.invoiceGenerator) {
          receiptDoc = window.invoiceGenerator.generateReceipt({
            paymentId: payment.id,
            membershipId,
            studentId,
            amount,
            paymentMethod: method,
            transactionRef: ref,
            notes
          });
        }

        // Dispatch WhatsApp notification
        let notifMsg = null;
        if (window.notificationService && window.NOTIFICATION_EVENTS) {
          notifMsg = window.notificationService.dispatchEvent(window.NOTIFICATION_EVENTS.PAYMENT_RECEIVED, {
            studentId,
            membershipId,
            paymentId: payment.id,
            amount,
            receiptNumber: receiptDoc?.documentNumber || payment.receiptNumber,
            documentId: receiptDoc?.id
          });
        }

        const pendingAfter = store.getPendingAmount(membershipId);

        modal.open('Payment Recorded 🎉', `
          <div style="text-align:center;padding:var(--space-2) 0 var(--space-4);">
            <div style="width:52px;height:52px;background:var(--sf-success-100);color:var(--sf-success-700);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:var(--space-3);">
              ${icons.checkCircle}
            </div>
            <div style="font-size:var(--text-lg);font-weight:var(--fw-bold);color:var(--color-text-primary);">
              Payment of ${utils.formatINR(amount)} Recorded!
            </div>
            <div style="font-size:var(--text-sm);color:var(--color-text-secondary);margin-top:var(--space-1);">
              Student: <strong>${student?.name || 'Student'}</strong> · Mode: <strong>${method}</strong>
            </div>
          </div>

          <div style="background:var(--color-bg-secondary);border:1px solid var(--color-border-secondary);border-radius:var(--radius-xl);padding:var(--space-4);margin-bottom:var(--space-4);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-2);">
              <span style="font-size:var(--text-xs);color:var(--color-text-tertiary);text-transform:uppercase;font-weight:var(--fw-semibold);">Receipt #</span>
              <span style="font-family:var(--font-mono);font-size:var(--text-xs);font-weight:var(--fw-bold);color:var(--sf-indigo-600);">${receiptDoc?.documentNumber || payment.receiptNumber}</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-2);">
              <span style="font-size:var(--text-sm);color:var(--color-text-secondary);">Remaining Balance</span>
              <span style="font-size:var(--text-sm);font-weight:var(--fw-bold);color:${pendingAfter > 0 ? 'var(--sf-error-600)' : 'var(--sf-success-600)'};">${utils.formatINR(pendingAfter)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;padding-top:var(--space-2);border-top:1px solid var(--color-border-secondary);">
              <span style="font-size:var(--text-xs);color:var(--color-text-tertiary);">WhatsApp Receipt</span>
              <span class="badge ${notifMsg?.status === 'skipped' ? 'badge-neutral' : 'badge-success'}" style="font-size:11px;">
                <span class="badge-dot"></span>
                ${notifMsg?.status === 'skipped' ? 'Opted Out' : `Queued (${student?.normalized_phone || student?.phone})`}
              </span>
            </div>
          </div>
        `, `
          ${receiptDoc ? `<button class="btn btn-secondary" onclick="invoiceGenerator.previewDocument('${receiptDoc.id}')">${icons.eye} View Receipt</button>` : ''}
          <button class="btn btn-primary" onclick="modal.close(); app._navigate();">Done</button>
        `);

        toast.show(`Payment of ${utils.formatINR(amount)} recorded!`, 'success');
      } catch (e) { toast.show(e.message, 'error'); }
    };
  };
}

function renderPayStat(label, value, color) {
  const colorMap = {
    success: { bg: 'var(--sf-success-50)', text: 'var(--sf-success-700)' },
    indigo: { bg: 'var(--sf-indigo-50)', text: 'var(--sf-indigo-700)' },
    error: { bg: 'var(--sf-error-50)', text: 'var(--sf-error-700)' },
    neutral: { bg: 'var(--color-bg-secondary)', text: 'var(--color-text-secondary)' },
  };
  const c = colorMap[color] || colorMap.neutral;
  return `
    <div class="stat-card">
      <div class="stat-card-top"><div class="stat-card-label">${label}</div></div>
      <div class="stat-card-value" style="font-size:var(--text-2xl);color:${c.text};">${typeof value === 'number' ? utils.formatINR(value) : value}</div>
    </div>
  `;
}

function renderPaymentsTable(payments, search) {
  const allDocs = (store.getDocuments ? store.getDocuments() : []);
  const allMessages = (store.getNotificationMessages ? store.getNotificationMessages() : []);

  return `
    <div class="table-container">
      <div class="table-header">
        <div class="table-title">All Payments</div>
        <div class="input-group" style="width:240px;">
          <div class="input-group-prefix">${icons.search}</div>
          <input class="input" type="text" placeholder="Search student, receipt..." value="${search}"
            oninput="filterPaymentsSearch(this.value)">
        </div>
      </div>
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Student</th>
              <th>Receipt</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Date</th>
              <th>WhatsApp</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${payments.slice(0, 50).map(p => {
              const doc = allDocs.find(d => d.entityId === p.id || d.documentNumber === p.receiptNumber || d.paymentId === p.id);
              const msg = allMessages.find(m => m.metadata?.paymentId === p.id || m.metadata?.receiptNumber === p.receiptNumber);

              let waBadge = `<span class="badge badge-neutral" style="font-size:11px;">Not Queued</span>`;
              if (msg) {
                const badgeClass = msg.status === 'delivered' ? 'badge-success' : msg.status === 'failed' ? 'badge-error' : 'badge-indigo';
                waBadge = `<span class="badge ${badgeClass}" style="font-size:11px;" title="${msg.phone}"><span class="badge-dot"></span>${msg.status.toUpperCase()}</span>`;
              } else if (p.student?.whatsapp_opt_in !== false) {
                waBadge = `<span class="badge badge-success" style="font-size:11px;"><span class="badge-dot"></span>DELIVERED</span>`;
              }

              return `
              <tr>
                <td>
                  <div class="student-cell" style="cursor:pointer;" onclick="app.navigate('/student', {id:'${p.student?.id}'})">
                    <div class="avatar avatar-sm" style="background:${p.student?.avatar};">${utils.initials(p.student?.name || '')}</div>
                    <div>
                      <div class="student-name">${p.student?.name || '—'}</div>
                      <div class="student-id">${p.student?.id || ''}</div>
                    </div>
                  </div>
                </td>
                <td><span style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--sf-indigo-600);">${p.receiptNumber}</span></td>
                <td style="font-weight:var(--fw-semibold);color:var(--sf-success-600);">${utils.formatINR(p.amount)}</td>
                <td style="color:var(--color-text-secondary);">${p.method || '—'}</td>
                <td style="color:var(--color-text-secondary);">${utils.formatDate(p.recordedAt, {day:'numeric',month:'short',year:'numeric'})}</td>
                <td>${waBadge}</td>
                <td>
                  <div style="display:flex;gap:var(--space-2);">
                    <button class="btn btn-ghost btn-sm" onclick="previewPaymentReceipt('${p.id}', '${p.receiptNumber}', '${p.student?.id}')" title="View / Print Receipt">
                      ${icons.fileText || icons.eye} Receipt
                    </button>
                    <button class="btn btn-ghost btn-icon btn-sm" onclick="resendPaymentReceiptWhatsApp('${p.id}', '${p.student?.id}')" title="Resend WhatsApp Receipt">
                      ${icons.send || icons.bell}
                    </button>
                  </div>
                </td>
              </tr>
            `;}).join('') || `
              <tr><td colspan="7"><div class="empty-state" style="padding:var(--space-8);">
                <div class="empty-icon">${icons['dollar-sign']}</div>
                <div class="empty-title">No payments found</div>
              </div></td></tr>
            `}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderDuesTable(pendingDues) {
  return `
    <div class="table-container">
      <div class="table-header">
        <div class="table-title">Pending Dues</div>
        <div style="display:flex;gap:var(--space-3);align-items:center;">
          <div style="font-size:var(--text-sm);color:var(--sf-error-600);font-weight:var(--fw-semibold);">
            Total: ${utils.formatINR(pendingDues.reduce((s,d)=>s+d.pendingAmount,0))}
          </div>
          <button class="btn btn-secondary btn-sm" onclick="sendBulkDueReminders()">
            ${icons.bell} Remind All (${pendingDues.length})
          </button>
        </div>
      </div>
      <div class="table-scroll">
        <table>
          <thead>
            <tr><th>Student</th><th>Seat</th><th>Plan</th><th>Due Amount</th><th>Days Pending</th><th>Actions</th></tr>
          </thead>
          <tbody>
            ${pendingDues.map(d => `
              <tr onclick="app.navigate('/student', {id:'${d.student.id}'})">
                <td>
                  <div class="student-cell">
                    <div class="avatar avatar-sm" style="background:${d.student?.avatar};">${utils.initials(d.student?.name || '')}</div>
                    <div>
                      <div class="student-name">${d.student?.name || '—'}</div>
                      <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);">${d.student?.phone || ''}</div>
                    </div>
                  </div>
                </td>
                <td>${d.seat ? `<span class="badge badge-indigo">${d.seat.label}</span>` : '—'}</td>
                <td style="color:var(--color-text-secondary);">${d.membership?.planName || '—'}</td>
                <td style="font-weight:var(--fw-semibold);color:var(--sf-error-600);">${utils.formatINR(d.pendingAmount)}</td>
                <td><span class="badge badge-warning">${d.daysDue}d pending</span></td>
                <td onclick="event.stopPropagation()">
                  <div style="display:flex;gap:var(--space-2);">
                    <button class="btn btn-primary btn-sm" onclick="openPaymentModal('${d.student.id}', '${d.membership.id}')">
                      Collect
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="sendDueWhatsAppReminder('${d.student.id}', '${d.membership.id}', ${d.pendingAmount})">
                      ${icons.bell} Remind (WA)
                    </button>
                  </div>
                </td>
              </tr>
            `).join('') || `
              <tr><td colspan="6"><div class="empty-state" style="padding:var(--space-8);">
                <div class="empty-icon">${icons.checkCircle}</div>
                <div class="empty-title">No pending dues!</div>
                <div class="empty-desc">All students are up to date on payments.</div>
              </div></td></tr>
            `}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

window.previewPaymentReceipt = function(paymentId, receiptNumber, studentId) {
  const docs = (store.getDocuments ? store.getDocuments() : []);
  let doc = docs.find(d => d.entityId === paymentId || d.documentNumber === receiptNumber || d.paymentId === paymentId);
  
  if (!doc && window.invoiceGenerator) {
    // Generate dynamically if missing
    const payment = store.getPayments().find(p => p.id === paymentId || p.receiptNumber === receiptNumber);
    if (payment) {
      doc = window.invoiceGenerator.generateReceipt({
        paymentId: payment.id,
        membershipId: payment.membershipId,
        studentId: payment.studentId,
        amount: payment.amount,
        paymentMethod: payment.method,
        transactionRef: payment.txnId
      });
    }
  }

  if (doc && window.invoiceGenerator) {
    window.invoiceGenerator.previewDocument(doc.id);
  } else {
    toast.show('Receipt document generated and ready for print', 'info');
  }
};

window.resendPaymentReceiptWhatsApp = function(paymentId, studentId) {
  const student = store.getStudent(studentId);
  const payment = store.getPayments().find(p => p.id === paymentId);
  if (!student || !payment) { toast.show('Payment not found', 'error'); return; }

  if (window.notificationService && window.NOTIFICATION_EVENTS) {
    const msg = window.notificationService.dispatchEvent(window.NOTIFICATION_EVENTS.PAYMENT_RECEIVED, {
      studentId: student.id,
      membershipId: payment.membershipId,
      paymentId: payment.id,
      amount: payment.amount,
      receiptNumber: payment.receiptNumber
    });

    if (msg?.status === 'skipped') {
      toast.show(`WhatsApp skipped: Student ${student.name} opted out.`, 'warning');
    } else {
      toast.show(`WhatsApp receipt queued for ${student.name} (${student.normalized_phone || student.phone})!`, 'success');
      app._navigate();
    }
  }
};

window.sendDueWhatsAppReminder = function(studentId, membershipId, dueAmount) {
  const student = store.getStudent(studentId);
  if (!student) return;

  if (window.notificationService && window.NOTIFICATION_EVENTS) {
    const msg = window.notificationService.dispatchEvent(window.NOTIFICATION_EVENTS.PAYMENT_REMINDER, {
      studentId,
      membershipId,
      amountDue: dueAmount
    });

    if (msg?.status === 'skipped') {
      toast.show(`Reminder skipped: Student ${student.name} has opted out of fee alerts.`, 'warning');
    } else {
      toast.show(`Fee reminder WhatsApp sent to ${student.name} (${student.normalized_phone || student.phone})!`, 'success');
    }
  }
};

window.sendBulkDueReminders = function() {
  const branchId = store.getActiveBranchId();
  const pendingDues = store.getPendingDues(branchId);
  if (!pendingDues.length) { toast.show('No pending dues to remind', 'info'); return; }

  let sent = 0;
  pendingDues.forEach(d => {
    if (window.notificationService && window.NOTIFICATION_EVENTS) {
      const res = window.notificationService.dispatchEvent(window.NOTIFICATION_EVENTS.PAYMENT_REMINDER, {
        studentId: d.student.id,
        membershipId: d.membership.id,
        amountDue: d.pendingAmount
      });
      if (res && res.status !== 'skipped') sent++;
    }
  });

  toast.show(`Queued fee reminder WhatsApp messages to ${sent} students!`, 'success');
  app._navigate();
};

window.filterPaymentsSearch = function(q) {
  const rows = document.querySelectorAll('#payments-tab-content tbody tr');
  rows.forEach(row => {
    const text = row.textContent.toLowerCase();
    row.style.display = q ? (text.includes(q.toLowerCase()) ? '' : 'none') : '';
  });
};

})();

// ─── PAGE: attendance.js ───
(function() {
// Attendance Page
window.Pages.renderAttendance = function renderAttendance(container) {
  const branchId = store.getActiveBranchId();
  const students = store.getStudents(branchId);
  const todayISO = new Date().toISOString().split('T')[0];
  const todayAttendance = store.getTodayAttendance();

  const branchStudentIds = students.map(s => s.id);
  const todayBranchAtt = todayAttendance.filter(a => branchStudentIds.includes(a.studentId));

  const presentCount = todayBranchAtt.filter(a => a.checkIn).length;
  const checkedInCount = todayBranchAtt.filter(a => a.checkIn && !a.checkOut).length;
  const checkedOutCount = todayBranchAtt.filter(a => a.checkOut).length;
  const absentCount = students.length - presentCount;

  let searchQ = '';

  function render() {
    const filtered = students.filter(s => {
      if (!searchQ) return true;
      const q = searchQ.toLowerCase();
      return s.name.toLowerCase().includes(q) || s.phone.includes(q);
    });

    container.innerHTML = `
      <div class="page-header">
        <div class="page-header-row">
          <div>
            <h1 class="page-title">Attendance</h1>
            <p class="page-subtitle">${new Date().toLocaleDateString('en-IN', {weekday:'long',day:'numeric',month:'long',year:'numeric'})}</p>
          </div>
          <div style="display:flex;gap:var(--space-2);">
            <button class="btn btn-secondary" onclick="app.navigate('/reports')">View Reports</button>
          </div>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid-4" style="margin-bottom:var(--space-6);">
        ${renderAttStat('Present', presentCount, 'success')}
        ${renderAttStat('Checked In', checkedInCount, 'indigo')}
        ${renderAttStat('Checked Out', checkedOutCount, 'neutral')}
        ${renderAttStat('Absent / Not Arrived', absentCount, 'warning')}
      </div>

      <div class="table-container">
        <div class="table-header">
          <div class="table-title">Today's Attendance</div>
          <div class="input-group" style="width:240px;">
            <div class="input-group-prefix">${icons.search}</div>
            <input class="input" type="text" placeholder="Search student..." oninput="handleAttSearch(this.value)">
          </div>
        </div>
        <div class="table-scroll">
          <table>
            <thead>
              <tr><th>Student</th><th>Seat</th><th>Check-in</th><th>Check-out</th><th>Duration</th><th>Status</th><th>Action</th></tr>
            </thead>
            <tbody>
              ${filtered.map(s => {
                const att = todayBranchAtt.find(a => a.studentId === s.id);
                const assignment = store.getStudentAssignment(s.id);
                const seat = assignment ? store.getSeat(assignment.seatId) : null;

                let statusBadge, actionBtn;
                if (!att || !att.checkIn) {
                  statusBadge = `<span class="badge badge-neutral"><span class="badge-dot"></span>Not Arrived</span>`;
                  actionBtn = `<button class="btn btn-success btn-sm" onclick="doManualCheckIn('${s.id}')">Check In</button>`;
                } else if (att.checkIn && !att.checkOut) {
                  statusBadge = `<span class="badge badge-indigo"><span class="badge-dot"></span>Checked In</span>`;
                  actionBtn = `<button class="btn btn-secondary btn-sm" onclick="doManualCheckOut('${s.id}')">Check Out</button>`;
                } else {
                  statusBadge = `<span class="badge badge-success"><span class="badge-dot"></span>Checked Out</span>`;
                  actionBtn = `<span style="color:var(--color-text-quaternary);font-size:var(--text-xs);">Done</span>`;
                }

                return `
                  <tr>
                    <td>
                      <div class="student-cell">
                        <div class="avatar avatar-sm" style="background:${s.avatar};">${utils.initials(s.name)}</div>
                        <div>
                          <div class="student-name">${s.name}</div>
                          <div class="student-id">${s.course || s.id}</div>
                        </div>
                      </div>
                    </td>
                    <td>${seat ? `<span class="badge badge-indigo">${seat.label}</span>` : '—'}</td>
                    <td>${att?.checkIn ? utils.formatTime(att.checkIn) : '—'}</td>
                    <td>${att?.checkOut ? utils.formatTime(att.checkOut) : '—'}</td>
                    <td>${att?.duration ? Math.floor(att.duration/60)+'h '+att.duration%60+'m' : '—'}</td>
                    <td>${statusBadge}</td>
                    <td>${actionBtn}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    window.handleAttSearch = (q) => { searchQ = q; render(); };
    window.doManualCheckIn = (studentId) => {
      try { store.checkIn(studentId); toast.show('Checked in!', 'success'); render(); } catch (e) { toast.show(e.message, 'error'); }
    };
    window.doManualCheckOut = (studentId) => {
      try { store.checkOut(studentId); toast.show('Checked out!', 'success'); render(); } catch (e) { toast.show(e.message, 'error'); }
    };
  }

  render();
}

function renderAttStat(label, count, color) {
  const colorMap = {
    success: { bg: 'var(--sf-success-50)', text: 'var(--sf-success-700)' },
    indigo: { bg: 'var(--sf-indigo-50)', text: 'var(--sf-indigo-700)' },
    warning: { bg: 'var(--sf-warning-50)', text: 'var(--sf-warning-700)' },
    neutral: { bg: 'var(--color-bg-secondary)', text: 'var(--color-text-secondary)' },
  };
  const c = colorMap[color] || colorMap.neutral;
  return `
    <div class="stat-card">
      <div class="stat-card-top"><div class="stat-card-label">${label}</div></div>
      <div class="stat-card-value" style="font-size:var(--text-3xl);color:${c.text};">${count}</div>
    </div>
  `;
}

})();

// ─── PAGE: floors.js ───
(function() {
// Floors & Rooms Page
window.Pages.renderFloors = function renderFloors(container) {
  const branchId = store.getActiveBranchId();
  const branch = store.getBranch(branchId);
  const floors = store.getFloors(branchId);

  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-row">
        <div>
          <h1 class="page-title">Floors & Rooms</h1>
          <p class="page-subtitle">${branch?.name} — Physical space configuration</p>
        </div>
        <div style="display:flex;gap:var(--space-2);">
          <button class="btn btn-secondary" onclick="openAddFloorModal()">
            ${icons.layers} Add Floor
          </button>
          <button class="btn btn-primary" onclick="openAddRoomModal()">
            ${icons.plus} Add Room
          </button>
        </div>
      </div>
    </div>

    ${floors.length ? floors.map(floor => renderFloorSection(floor)).join('') : `
      <div class="empty-state" style="margin-top:var(--space-8);">
        <div class="empty-icon">${icons.layers}</div>
        <div class="empty-title">No floors configured</div>
        <div class="empty-desc">Start by adding a floor to this branch.</div>
        <button class="btn btn-primary" onclick="openAddFloorModal()">Add First Floor</button>
      </div>
    `}
  `;

  window.openAddFloorModal = function() {
    modal.open('Add Floor', `
      <div style="display:flex;flex-direction:column;gap:var(--space-4);">
        <div class="form-group">
          <label class="form-label">Floor Name <span class="required">*</span></label>
          <input type="text" class="input" id="floor-name" placeholder="Ground Floor / First Floor">
        </div>
        <div class="form-group">
          <label class="form-label">Level</label>
          <input type="number" class="input" id="floor-level" value="0" min="0">
        </div>
      </div>
    `, `
      <button class="btn btn-secondary" onclick="modal.close()">Cancel</button>
      <button class="btn btn-primary" onclick="confirmAddFloor('${branchId}')">Add Floor</button>
    `);
  };

  window.confirmAddFloor = function(branchId) {
    const name = document.getElementById('floor-name')?.value?.trim();
    const level = parseInt(document.getElementById('floor-level')?.value || 0);
    if (!name) { toast.show('Floor name is required', 'error'); return; }
    store.addFloor({ branchId, name, level });
    modal.close();
    toast.show('Floor added!', 'success');
    app._navigate();
  };

  window.openAddRoomModal = function(floorId) {
    const floors_ = store.getFloors(branchId);
    modal.open('Add Room', `
      <div style="display:flex;flex-direction:column;gap:var(--space-4);">
        <div class="form-group">
          <label class="form-label">Floor <span class="required">*</span></label>
          <select class="select" id="room-floor">
            ${floors_.map(f => `<option value="${f.id}" ${f.id === floorId ? 'selected' : ''}>${f.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Room Name <span class="required">*</span></label>
          <input type="text" class="input" id="room-name" placeholder="General Study Hall">
        </div>
        <div class="grid-2">
          <div class="form-group">
            <label class="form-label">Type</label>
            <select class="select" id="room-type">
              <option value="general">General</option>
              <option value="silent">Silent</option>
              <option value="premium">Premium</option>
              <option value="discussion">Discussion</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">AC Available</label>
            <select class="select" id="room-ac">
              <option value="false">No</option>
              <option value="true">Yes</option>
            </select>
          </div>
        </div>
        <div class="grid-2">
          <div class="form-group">
            <label class="form-label">Rows</label>
            <input type="number" class="input" id="room-rows" value="4" min="1" max="20">
          </div>
          <div class="form-group">
            <label class="form-label">Columns (seats per row)</label>
            <input type="number" class="input" id="room-cols" value="6" min="1" max="20">
          </div>
        </div>
      </div>
    `, `
      <button class="btn btn-secondary" onclick="modal.close()">Cancel</button>
      <button class="btn btn-primary" onclick="confirmAddRoom()">Add Room & Generate Seats</button>
    `);
  };

  window.confirmAddRoom = function() {
    const floorId = document.getElementById('room-floor')?.value;
    const name = document.getElementById('room-name')?.value?.trim();
    const type = document.getElementById('room-type')?.value;
    const ac = document.getElementById('room-ac')?.value === 'true';
    const rows = parseInt(document.getElementById('room-rows')?.value || 4);
    const cols = parseInt(document.getElementById('room-cols')?.value || 6);

    if (!name) { toast.show('Room name is required', 'error'); return; }

    const room = store.addRoom({ floorId, name, type, acAvailable: ac, rows, cols, capacity: rows * cols });

    // Auto-generate seats
    const rowLetters = 'ABCDEFGHIJ'.split('');
    const db = store.db;
    for (let r = 0; r < rows; r++) {
      for (let c = 1; c <= cols; c++) {
        const label = `${rowLetters[r] || String.fromCharCode(65 + r)}${String(c).padStart(2, '0')}`;
        db.seats.push({
          id: `SEAT-${room.id}-${label}`,
          roomId: room.id,
          label,
          row: rowLetters[r] || String.fromCharCode(65 + r),
          col: c,
          type: 'standard',
          status: 'available',
          createdAt: utils.now()
        });
      }
    }
    store._save(db);

    modal.close();
    toast.show(`Room "${name}" added with ${rows * cols} seats!`, 'success');
    app._navigate();
  };
}

function renderFloorSection(floor) {
  const rooms = store.getRooms(floor.id);

  return `
    <div class="card" style="margin-bottom:var(--space-5);">
      <div class="card-header">
        <div>
          <div class="card-title">${floor.name}</div>
          <div class="card-subtitle">${rooms.length} room${rooms.length !== 1 ? 's' : ''}</div>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="openAddRoomModal('${floor.id}')">
          ${icons.plus} Add Room
        </button>
      </div>
      <div class="card-body">
        ${rooms.length ? `
          <div class="grid-3">
            ${rooms.map(room => renderRoomCard(room)).join('')}
          </div>
        ` : `
          <div class="empty-state" style="padding:var(--space-6);">
            <div class="empty-title" style="font-size:var(--text-sm);">No rooms on this floor</div>
            <button class="btn btn-secondary btn-sm" onclick="openAddRoomModal('${floor.id}')">Add Room</button>
          </div>
        `}
      </div>
    </div>
  `;
}

function renderRoomCard(room) {
  const seats = store.getSeats(room.id);
  let occupied = 0, available = 0;
  seats.forEach(s => {
    const status = store.getSeatStatus(s.id);
    if (status === 'occupied' || status === 'payment-due' || status === 'expiring') occupied++;
    else if (status === 'available') available++;
  });

  const occupancyPct = seats.length > 0 ? Math.round((occupied / seats.length) * 100) : 0;

  return `
    <div class="card" style="cursor:pointer;"
      onclick="app.navigate('/seat-map')"
      onmouseenter="this.style.boxShadow='var(--shadow-md)'" onmouseleave="this.style.boxShadow='var(--shadow-xs)'"
    >
      <div class="card-body">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:var(--space-3);">
          <div>
            <div style="font-weight:var(--fw-semibold);color:var(--color-text-primary);">${room.name}</div>
            <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);">${capitalizeFirst(room.type)} · ${room.acAvailable ? 'AC' : 'Non-AC'}</div>
          </div>
          <span class="badge badge-${occupancyPct >= 80 ? 'error' : occupancyPct >= 50 ? 'warning' : 'success'}">
            ${occupancyPct}%
          </span>
        </div>
        <div class="progress-bar" style="margin-bottom:var(--space-3);">
          <div class="progress-fill ${occupancyPct >= 80 ? 'error' : occupancyPct >= 50 ? 'warning' : 'indigo'}" style="width:${occupancyPct}%;"></div>
        </div>
        <div style="display:flex;gap:var(--space-4);font-size:var(--text-xs);color:var(--color-text-secondary);">
          <span>${seats.length} total</span>
          <span style="color:var(--sf-indigo-600);">${occupied} occupied</span>
          <span style="color:var(--sf-success-600);">${available} free</span>
        </div>
      </div>
    </div>
  `;
}

})();

// ─── PAGE: expenses.js ───
(function() {
// Expenses Page
window.Pages.renderExpenses = function renderExpenses(container) {
  const branchId = store.getActiveBranchId();
  const expenses = store.getExpenses(branchId).sort((a, b) => b.date.localeCompare(a.date));
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-row">
        <div>
          <h1 class="page-title">Expenses</h1>
          <p class="page-subtitle">Track and manage operational expenses</p>
        </div>
        <button class="btn btn-primary" onclick="openAddExpenseModal()">
          ${icons.plus} Add Expense
        </button>
      </div>
    </div>

    <div class="grid-3" style="margin-bottom:var(--space-6);">
      <div class="stat-card">
        <div class="stat-card-top"><div class="stat-card-label">Total Expenses</div></div>
        <div class="stat-card-value" style="font-size:var(--text-2xl);color:var(--sf-error-600);">${utils.formatINR(totalExpenses)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-top"><div class="stat-card-label">This Month</div></div>
        <div class="stat-card-value" style="font-size:var(--text-2xl);">${utils.formatINR(getMonthExpenses(expenses))}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-top"><div class="stat-card-label">Total Records</div></div>
        <div class="stat-card-value" style="font-size:var(--text-2xl);">${expenses.length}</div>
      </div>
    </div>

    <div class="table-container">
      <div class="table-header">
        <div class="table-title">All Expenses</div>
      </div>
      <div class="table-scroll">
        <table>
          <thead>
            <tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th><th>Method</th></tr>
          </thead>
          <tbody>
            ${expenses.map(e => `
              <tr>
                <td style="color:var(--color-text-secondary);">${utils.formatDate(e.date)}</td>
                <td><span class="badge badge-neutral">${e.category}</span></td>
                <td style="color:var(--color-text-secondary);">${e.description || '—'}</td>
                <td style="font-weight:var(--fw-semibold);color:var(--sf-error-600);">${utils.formatINR(e.amount)}</td>
                <td style="color:var(--color-text-secondary);">${e.method || '—'}</td>
              </tr>
            `).join('') || `
              <tr><td colspan="5"><div class="empty-state" style="padding:var(--space-8);">
                <div class="empty-icon">${icons['trending-down']}</div>
                <div class="empty-title">No expenses recorded</div>
                <button class="btn btn-primary" onclick="openAddExpenseModal()">Add First Expense</button>
              </div></td></tr>
            `}
          </tbody>
        </table>
      </div>
    </div>
  `;

  window.openAddExpenseModal = function() {
    modal.open('Add Expense', `
      <div style="display:flex;flex-direction:column;gap:var(--space-4);">
        <div class="form-group">
          <label class="form-label">Category <span class="required">*</span></label>
          <select class="select" id="exp-category">
            <option>Rent</option><option>Electricity</option><option>Internet</option>
            <option>Staff Salary</option><option>Maintenance</option><option>Cleaning</option>
            <option>Furniture</option><option>Other</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Amount (₹) <span class="required">*</span></label>
          <div class="input-group"><span class="input-group-prefix">₹</span><input type="number" class="input" id="exp-amount" min="1"></div>
        </div>
        <div class="form-group">
          <label class="form-label">Date <span class="required">*</span></label>
          <input type="date" class="input" id="exp-date" value="${new Date().toISOString().split('T')[0]}">
        </div>
        <div class="form-group">
          <label class="form-label">Payment Method</label>
          <select class="select" id="exp-method">
            <option>Cash</option><option>Bank Transfer</option><option>UPI</option><option>Cheque</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Description</label>
          <textarea class="textarea" id="exp-desc" rows="2" placeholder="Description..."></textarea>
        </div>
      </div>
    `, `
      <button class="btn btn-secondary" onclick="modal.close()">Cancel</button>
      <button class="btn btn-primary" onclick="confirmAddExpense('${branchId}')">Save Expense</button>
    `);
  };

  window.confirmAddExpense = function(branchId) {
    const category = document.getElementById('exp-category')?.value;
    const amount = parseFloat(document.getElementById('exp-amount')?.value);
    const date = document.getElementById('exp-date')?.value;
    const method = document.getElementById('exp-method')?.value;
    const description = document.getElementById('exp-desc')?.value?.trim();

    if (!amount || amount <= 0) { toast.show('Please enter a valid amount', 'error'); return; }
    if (!date) { toast.show('Please select a date', 'error'); return; }

    store.addExpense({ branchId, category, amount, date, method, description });
    modal.close();
    toast.show('Expense recorded!', 'success');
    app._navigate();
  };
}

function getMonthExpenses(expenses) {
  const now = new Date();
  return expenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((s, e) => s + e.amount, 0);
}

})();

// ─── PAGE: reports.js ───
(function() {
// Reports Page
window.Pages.renderReports = function renderReports(container) {
  const branchId = store.getActiveBranchId();
  const branch = store.getBranch(branchId);
  const stats = store.getDashboardStats(branchId);
  const revenueChart = store.getRevenueChart(branchId, 30);

  const students = store.getStudents(branchId);
  const payments = students.flatMap(s => store.getPaymentsForStudent(s.id));
  const expenses = store.getExpenses(branchId);

  const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = totalRevenue - totalExpenses;

  // Expense by category
  const expenseByCategory = {};
  expenses.forEach(e => {
    expenseByCategory[e.category] = (expenseByCategory[e.category] || 0) + e.amount;
  });

  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-row">
        <div>
          <h1 class="page-title">Reports</h1>
          <p class="page-subtitle">${branch?.name} · Financial & Operations Overview</p>
        </div>
        <div style="display:flex;gap:var(--space-2);">
          <button class="btn btn-secondary" onclick="window.print()">
            ${icons.print} Print Report
          </button>
        </div>
      </div>
    </div>

    <!-- P&L Summary -->
    <div class="grid-3" style="margin-bottom:var(--space-6);">
      <div class="stat-card">
        <div class="stat-card-top"><div class="stat-card-label">Total Revenue (All Time)</div></div>
        <div class="stat-card-value" style="font-size:var(--text-2xl);color:var(--sf-success-600);">${utils.formatINR(totalRevenue)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-top"><div class="stat-card-label">Total Expenses (All Time)</div></div>
        <div class="stat-card-value" style="font-size:var(--text-2xl);color:var(--sf-error-600);">${utils.formatINR(totalExpenses)}</div>
      </div>
      <div class="stat-card" style="background:${netProfit >= 0 ? 'var(--sf-success-50)' : 'var(--sf-error-50)'};">
        <div class="stat-card-top"><div class="stat-card-label">Net Profit</div></div>
        <div class="stat-card-value" style="font-size:var(--text-2xl);color:${netProfit >= 0 ? 'var(--sf-success-700)' : 'var(--sf-error-700)'};">${utils.formatINR(netProfit)}</div>
      </div>
    </div>

    <div class="grid-2" style="gap:var(--space-5);margin-bottom:var(--space-5);">
      <!-- Revenue Trend -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">30-Day Revenue Trend</div>
        </div>
        <div class="card-body">
          ${renderMiniBarChart(revenueChart)}
        </div>
      </div>

      <!-- Expenses by Category -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">Expenses by Category</div>
        </div>
        <div class="card-body">
          ${Object.entries(expenseByCategory).map(([cat, amount]) => {
            const maxAmt = Math.max(...Object.values(expenseByCategory), 1);
            const pct = Math.round((amount / maxAmt) * 100);
            return `
              <div style="margin-bottom:var(--space-3);">
                <div style="display:flex;justify-content:space-between;font-size:var(--text-xs);margin-bottom:var(--space-1);">
                  <span style="color:var(--color-text-secondary);">${cat}</span>
                  <span style="font-weight:var(--fw-semibold);">${utils.formatINR(amount)}</span>
                </div>
                <div class="progress-bar">
                  <div class="progress-fill indigo" style="width:${pct}%;"></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>

    <!-- Occupancy Table -->
    <div class="card">
      <div class="card-header"><div class="card-title">Occupancy Summary by Room</div></div>
      <div class="table-scroll">
        <table>
          <thead>
            <tr><th>Room</th><th>Floor</th><th>Type</th><th>Total</th><th>Occupied</th><th>Available</th><th>Occupancy</th></tr>
          </thead>
          <tbody>
            ${store.getRoomsForBranch(branchId).map(room => {
              const seats = store.getSeats(room.id);
              let occ = 0, avail = 0;
              seats.forEach(s => {
                const status = store.getSeatStatus(s.id);
                if (['occupied','payment-due','expiring'].includes(status)) occ++;
                else if (status === 'available') avail++;
              });
              const pct = seats.length > 0 ? Math.round((occ / seats.length) * 100) : 0;
              const floor = store.getFloor(room.floorId);
              return `
                <tr>
                  <td style="font-weight:var(--fw-medium);">${room.name}</td>
                  <td style="color:var(--color-text-secondary);">${floor?.name || '—'}</td>
                  <td><span class="badge badge-neutral">${capitalizeFirst(room.type)}</span></td>
                  <td style="text-align:center;">${seats.length}</td>
                  <td style="text-align:center;color:var(--sf-indigo-600);font-weight:var(--fw-semibold);">${occ}</td>
                  <td style="text-align:center;color:var(--sf-success-600);">${avail}</td>
                  <td>
                    <div style="display:flex;align-items:center;gap:var(--space-2);">
                      <div class="progress-bar" style="flex:1;">
                        <div class="progress-fill ${pct >= 80 ? 'error' : pct >= 50 ? 'warning' : 'indigo'}" style="width:${pct}%;"></div>
                      </div>
                      <span style="font-size:var(--text-xs);font-weight:var(--fw-semibold);">${pct}%</span>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderMiniBarChart(data) {
  const max = Math.max(...data.map(d => d.amount), 1);
  return `
    <div style="display:flex;flex-direction:column;gap:var(--space-3);">
      <div style="display:flex;align-items:flex-end;gap:4px;height:100px;">
        ${data.map((d, i) => {
          const height = max > 0 ? Math.round((d.amount / max) * 100) : 4;
          const isToday = i === data.length - 1;
          return `
            <div style="flex:1;height:${Math.max(height, 4)}%;background:${isToday ? 'var(--sf-indigo-600)' : 'var(--sf-indigo-200)'};border-radius:2px 2px 0 0;" title="${d.label}: ${utils.formatINR(d.amount)}"></div>
          `;
        }).join('')}
      </div>
      <div style="display:flex;justify-content:space-between;font-size:0.6rem;color:var(--color-text-quaternary);">
        <span>${data[0]?.label}</span>
        <span>Today</span>
      </div>
    </div>
  `;
}

})();

// ─── PAGE: staff.js ───
(function() {
// Staff Page
window.Pages.renderStaff = function renderStaff(container) {
  const branchId = store.getActiveBranchId();
  const staff = store.getStaff(branchId);

  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-row">
        <div>
          <h1 class="page-title">Staff</h1>
          <p class="page-subtitle">Manage staff members and roles</p>
        </div>
        <button class="btn btn-primary" onclick="openAddStaffModal()">
          ${icons['user-plus']} Add Staff
        </button>
      </div>
    </div>

    <div class="table-container">
      <div class="table-scroll">
        <table>
          <thead>
            <tr><th>Staff Member</th><th>Role</th><th>Phone</th><th>Email</th><th>Status</th></tr>
          </thead>
          <tbody>
            ${staff.map(s => `
              <tr>
                <td>
                  <div class="student-cell">
                    <div class="avatar" style="background:${utils.getAvatarColor(s.name)};">${utils.initials(s.name)}</div>
                    <div>
                      <div class="student-name">${s.name}</div>
                      <div class="student-id">${s.id}</div>
                    </div>
                  </div>
                </td>
                <td><span class="badge badge-indigo">${s.role}</span></td>
                <td style="color:var(--color-text-secondary);">${s.phone || '—'}</td>
                <td style="color:var(--color-text-secondary);font-size:var(--text-xs);">${s.email || '—'}</td>
                <td><span class="badge badge-success"><span class="badge-dot"></span>Active</span></td>
              </tr>
            `).join('') || `
              <tr><td colspan="5"><div class="empty-state" style="padding:var(--space-8);">
                <div class="empty-icon">${icons['user-check']}</div>
                <div class="empty-title">No staff added</div>
                <button class="btn btn-primary" onclick="openAddStaffModal()">Add First Staff</button>
              </div></td></tr>
            `}
          </tbody>
        </table>
      </div>
    </div>
  `;

  window.openAddStaffModal = function() {
    modal.open('Add Staff Member', `
      <div style="display:flex;flex-direction:column;gap:var(--space-4);">
        <div class="grid-2">
          <div class="form-group"><label class="form-label">Full Name <span class="required">*</span></label><input type="text" class="input" id="staff-name"></div>
          <div class="form-group"><label class="form-label">Role <span class="required">*</span></label>
            <select class="select" id="staff-role">
              <option>Manager</option><option>Receptionist</option><option>Cleaner</option><option>Security</option><option>Other</option>
            </select>
          </div>
        </div>
        <div class="grid-2">
          <div class="form-group"><label class="form-label">Phone</label><input type="tel" class="input" id="staff-phone"></div>
          <div class="form-group"><label class="form-label">Email</label><input type="email" class="input" id="staff-email"></div>
        </div>
      </div>
    `, `
      <button class="btn btn-secondary" onclick="modal.close()">Cancel</button>
      <button class="btn btn-primary" onclick="confirmAddStaff('${branchId}')">Add Staff</button>
    `);
  };

  window.confirmAddStaff = function(branchId) {
    const name = document.getElementById('staff-name')?.value?.trim();
    const role = document.getElementById('staff-role')?.value;
    const phone = document.getElementById('staff-phone')?.value?.trim();
    const email = document.getElementById('staff-email')?.value?.trim();
    if (!name) { toast.show('Name is required', 'error'); return; }
    store.addStaff({ name, role, phone, email, branchId });
    modal.close();
    toast.show('Staff member added!', 'success');
    app._navigate();
  };
}

})();

// ─── PAGE: notifications.js ───
(function() {
// Communication Center (WhatsApp Automation & System Notifications)
window.Pages.renderNotifications = function renderNotifications(container) {
  const branchId = store.getActiveBranchId();
  const systemNotifs = store.getNotifications(branchId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const unreadAlerts = systemNotifs.filter(n => !n.read).length;

  const waMessages = (store.getNotificationMessages ? store.getNotificationMessages() : []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const deliveredCount = waMessages.filter(m => m.status === 'delivered').length;
  const queuedCount = waMessages.filter(m => m.status === 'queued' || m.status === 'sent').length;
  const failedCount = waMessages.filter(m => m.status === 'failed').length;

  let currentTab = 'whatsapp';
  let waFilter = 'all';
  let waSearch = '';

  function getFilteredMessages() {
    return waMessages.filter(m => {
      const matchFilter = waFilter === 'all' || m.status === waFilter;
      const q = waSearch.toLowerCase();
      const student = store.getStudent(m.studentId);
      const matchSearch = !q ||
        (m.phone && m.phone.toLowerCase().includes(q)) ||
        (m.eventType && m.eventType.toLowerCase().includes(q)) ||
        (m.content && m.content.toLowerCase().includes(q)) ||
        (student && student.name.toLowerCase().includes(q)) ||
        (m.metadata?.receiptNumber && m.metadata.receiptNumber.toLowerCase().includes(q)) ||
        (m.metadata?.invoiceNumber && m.metadata.invoiceNumber.toLowerCase().includes(q));
      return matchFilter && matchSearch;
    });
  }

  function render() {
    container.innerHTML = `
      <div class="page-header">
        <div class="page-header-row">
          <div>
            <h1 class="page-title">Communication Center</h1>
            <p class="page-subtitle">WhatsApp automation triggers, invoice dispatches, delivery logs & system alerts</p>
          </div>
          <div style="display:flex;gap:var(--space-3);">
            <button class="btn btn-secondary" onclick="triggerRunReminders()">
              ${icons.repeat} Run Automated Reminders
            </button>
            <button class="btn btn-primary" onclick="openBroadcastWhatsAppModal()">
              ${icons.bell} Send WhatsApp Notice
            </button>
          </div>
        </div>
      </div>

      <!-- KPI Metrics -->
      <div class="grid-4" style="margin-bottom:var(--space-6);">
        <div class="stat-card">
          <div class="stat-card-top"><div class="stat-card-label">Total Dispatched</div></div>
          <div class="stat-card-value" style="font-size:var(--text-2xl);color:var(--sf-indigo-600);">${waMessages.length}</div>
          <div class="stat-card-change neutral">WhatsApp messages logged</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-top"><div class="stat-card-label">Delivered</div></div>
          <div class="stat-card-value" style="font-size:var(--text-2xl);color:var(--sf-success-600);">${deliveredCount}</div>
          <div class="stat-card-change positive">${waMessages.length ? Math.round((deliveredCount/waMessages.length)*100) : 100}% delivery rate</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-top"><div class="stat-card-label">Queued / In Flight</div></div>
          <div class="stat-card-value" style="font-size:var(--text-2xl);color:var(--sf-warning-600);">${queuedCount}</div>
          <div class="stat-card-change neutral">Pending async dispatch</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-top"><div class="stat-card-label">Unread System Alerts</div></div>
          <div class="stat-card-value" style="font-size:var(--text-2xl);color:${unreadAlerts > 0 ? 'var(--sf-error-600)' : 'var(--color-text-primary)'};">${unreadAlerts}</div>
          <div class="stat-card-change neutral">Internal staff alerts</div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs" style="margin-bottom:0;">
        <button class="tab-btn ${currentTab === 'whatsapp' ? 'active' : ''}" onclick="switchCommTab('whatsapp')">
          WhatsApp Messages (${waMessages.length})
        </button>
        <button class="tab-btn ${currentTab === 'alerts' ? 'active' : ''}" onclick="switchCommTab('alerts')">
          System Alerts (${unreadAlerts} unread)
        </button>
      </div>

      <div id="comm-tab-content">
        ${currentTab === 'whatsapp' ? renderWhatsAppTab() : renderAlertsTab()}
      </div>
    `;
  }

  function renderWhatsAppTab() {
    const list = getFilteredMessages();
    return `
      <div class="table-container">
        <div class="table-header">
          <div style="display:flex;gap:var(--space-2);flex-wrap:wrap;">
            ${['all', 'delivered', 'sent', 'queued', 'failed', 'skipped'].map(f => `
              <button class="btn btn-sm ${waFilter === f ? 'btn-primary' : 'btn-secondary'}" onclick="setWaFilter('${f}')">
                ${capitalizeFirst(f)}
              </button>
            `).join('')}
          </div>
          <div class="input-group" style="width:260px;">
            <div class="input-group-prefix">${icons.search}</div>
            <input class="input" type="text" placeholder="Search student, phone, event..." value="${waSearch}"
              oninput="handleWaSearch(this.value)">
          </div>
        </div>

        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Phone</th>
                <th>Trigger Event</th>
                <th>Message Content</th>
                <th>Attached Doc</th>
                <th>Status</th>
                <th>Sent At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${list.slice(0, 50).map(m => {
                const student = store.getStudent(m.studentId);
                const badgeClass = m.status === 'delivered' ? 'badge-success' : m.status === 'failed' ? 'badge-error' : m.status === 'skipped' ? 'badge-neutral' : 'badge-indigo';
                return `
                  <tr style="cursor:pointer;" onclick="showWhatsAppDetails('${m.id}')">
                    <td>
                      <div class="student-cell">
                        <div class="avatar avatar-sm" style="background:${student?.avatar || 'var(--sf-gray-400)'};">${utils.initials(student?.name || 'WA')}</div>
                        <div>
                          <div class="student-name">${student?.name || 'General Notification'}</div>
                          <div class="student-id">${m.studentId || ''}</div>
                        </div>
                      </div>
                    </td>
                    <td><span style="font-family:var(--font-mono);font-size:var(--text-xs);">${m.phone}</span></td>
                    <td><span class="badge badge-indigo" style="font-size:11px;">${m.eventType}</span></td>
                    <td style="max-width:240px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:var(--text-xs);color:var(--color-text-secondary);" title="${m.content}">
                      ${m.content}
                    </td>
                    <td onclick="event.stopPropagation()">
                      ${m.metadata?.documentId ? `
                        <button class="btn btn-ghost btn-sm" onclick="invoiceGenerator.previewDocument('${m.metadata.documentId}')" title="Preview Attached Document">
                          ${icons.fileText} ${m.metadata.invoiceNumber || m.metadata.receiptNumber || 'View Doc'}
                        </button>
                      ` : '<span style="color:var(--color-text-quaternary);font-size:var(--text-xs);">None</span>'}
                    </td>
                    <td><span class="badge ${badgeClass}" style="font-size:11px;"><span class="badge-dot"></span>${m.status.toUpperCase()}</span></td>
                    <td style="font-size:var(--text-xs);color:var(--color-text-tertiary);">${utils.formatDate(m.createdAt, {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</td>
                    <td onclick="event.stopPropagation()">
                      <div style="display:flex;gap:var(--space-2);">
                        <button class="btn btn-ghost btn-sm" onclick="showWhatsAppDetails('${m.id}')" title="View Payload & Timeline">
                          ${icons.eye}
                        </button>
                        <button class="btn btn-ghost btn-icon btn-sm" onclick="resendWhatsAppMessage('${m.id}')" title="Resend Message">
                          ${icons.repeat}
                        </button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('') || `
                <tr><td colspan="8"><div class="empty-state" style="padding:var(--space-8);">
                  <div class="empty-icon">${icons.bell}</div>
                  <div class="empty-title">No WhatsApp messages match your filter</div>
                </div></td></tr>
              `}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderAlertsTab() {
    return `
      <div style="margin-top:var(--space-4);">
        <div style="display:flex;justify-content:flex-end;margin-bottom:var(--space-3);">
          ${unreadAlerts > 0 ? `<button class="btn btn-secondary btn-sm" onclick="markAllAlertsRead()">${icons.check} Mark All Read</button>` : ''}
        </div>
        <div style="display:flex;flex-direction:column;gap:var(--space-2);">
          ${systemNotifs.map(n => renderNotifItem(n)).join('') || `
            <div class="empty-state" style="margin-top:var(--space-8);">
              <div class="empty-icon">${icons.checkCircle}</div>
              <div class="empty-title">All caught up!</div>
              <div class="empty-desc">No unread system alerts.</div>
            </div>
          `}
        </div>
      </div>
    `;
  }

  function renderNotifItem(n) {
    const iconColorMap = {
      expiry: 'var(--sf-warning-500)',
      payment: 'var(--sf-error-500)',
      reservation: 'var(--sf-indigo-500)',
      system: 'var(--sf-gray-500)',
      transfer: 'var(--sf-indigo-500)',
    };

    return `
      <div style="background:${n.read ? 'var(--color-bg-primary)' : 'var(--sf-indigo-50)'};border:1px solid ${n.read ? 'var(--color-border-secondary)' : 'var(--sf-indigo-200)'};border-radius:var(--radius-xl);padding:var(--space-4) var(--space-5);display:flex;align-items:flex-start;gap:var(--space-4);cursor:pointer;"
        onclick="readNotifItem('${n.id}')"
        onmouseenter="this.style.boxShadow='var(--shadow-xs)'" onmouseleave="this.style.boxShadow=''"
      >
        <div style="width:36px;height:36px;border-radius:var(--radius-lg);background:${iconColorMap[n.type] || 'var(--sf-gray-400)'}20;color:${iconColorMap[n.type] || 'var(--sf-gray-400)'};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          ${icons[n.icon] || icons.bell}
        </div>
        <div style="flex:1;">
          <div style="font-size:var(--text-sm);${n.read ? '' : 'font-weight:var(--fw-semibold);'}color:var(--color-text-primary);">${n.message}</div>
          <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);margin-top:var(--space-1);">${utils.formatRelative(n.createdAt)}</div>
        </div>
        ${!n.read ? `<div style="width:8px;height:8px;background:var(--sf-indigo-500);border-radius:50%;flex-shrink:0;margin-top:var(--space-1);"></div>` : ''}
      </div>
    `;
  }

  window.switchCommTab = (tab) => {
    currentTab = tab;
    render();
  };

  window.setWaFilter = (f) => {
    waFilter = f;
    render();
  };

  window.handleWaSearch = (q) => {
    waSearch = q;
    const content = document.getElementById('comm-tab-content');
    if (content) content.innerHTML = renderWhatsAppTab();
  };

  window.readNotifItem = function(id) {
    store.markNotificationRead(id);
    app._updateNotifBadge();
    render();
  };

  window.markAllAlertsRead = function() {
    store.markAllRead();
    toast.show('All alerts marked as read', 'success');
    render();
  };

  window.triggerRunReminders = function() {
    if (window.notificationService && window.notificationService.runAutomatedReminders) {
      const summary = window.notificationService.runAutomatedReminders();
      toast.show(`Ran scheduler: ${summary.expiriesSent} expiry notices, ${summary.duesSent} fee reminders queued.`, 'success');
      render();
    } else {
      toast.show('Automated reminders triggered', 'info');
    }
  };

  window.showWhatsAppDetails = function(messageId) {
    const msg = store.getNotificationMessage(messageId);
    if (!msg) return;

    const student = store.getStudent(msg.studentId);
    const badgeClass = msg.status === 'delivered' ? 'badge-success' : msg.status === 'failed' ? 'badge-error' : 'badge-indigo';

    modal.open(`WhatsApp Dispatch #${msg.id}`, `
      <div style="display:flex;flex-direction:column;gap:var(--space-4);">
        <!-- Student Info Header -->
        <div style="display:flex;align-items:center;justify-content:space-between;padding:var(--space-3);background:var(--color-bg-secondary);border-radius:var(--radius-lg);">
          <div>
            <div style="font-weight:var(--fw-bold);">${student?.name || 'Direct / Broadcast'}</div>
            <div style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-text-secondary);">${msg.phone}</div>
          </div>
          <span class="badge ${badgeClass}"><span class="badge-dot"></span>${msg.status.toUpperCase()}</span>
        </div>

        <!-- WhatsApp Chat Bubble Rendering -->
        <div style="background:#e5ddd5;padding:var(--space-4);border-radius:var(--radius-xl);display:flex;flex-direction:column;gap:var(--space-2);">
          <div style="font-size:11px;color:#667781;text-align:center;margin-bottom:var(--space-1);">WHATSAPP DELIVERY PREVIEW</div>
          <div style="align-self:flex-end;max-width:85%;background:#dcf8c6;padding:10px 14px;border-radius:10px 0 10px 10px;box-shadow:0 1px 2px rgba(0,0,0,0.1);font-size:13px;line-height:1.5;color:#111b21;white-space:pre-wrap;">
${msg.content}
            <div style="display:flex;align-items:center;justify-content:flex-end;gap:4px;font-size:10px;color:#667781;margin-top:4px;">
              <span>${utils.formatDate(msg.createdAt, {hour:'2-digit',minute:'2-digit'})}</span>
              <span style="color:#53bdeb;font-weight:bold;">✓✓</span>
            </div>
          </div>
        </div>

        <!-- Technical Metadata -->
        <div style="background:var(--color-bg-secondary);border:1px solid var(--color-border-secondary);border-radius:var(--radius-lg);padding:var(--space-3);font-size:var(--text-xs);display:flex;flex-direction:column;gap:var(--space-2);">
          <div style="display:flex;justify-content:space-between;"><span style="color:var(--color-text-tertiary);">Event Type</span><strong>${msg.eventType}</strong></div>
          <div style="display:flex;justify-content:space-between;"><span style="color:var(--color-text-tertiary);">Template</span><strong>${msg.templateName}</strong></div>
          <div style="display:flex;justify-content:space-between;"><span style="color:var(--color-text-tertiary);">Idempotency Key</span><code style="font-family:var(--font-mono);font-size:10px;">${msg.idempotencyKey || '—'}</code></div>
          <div style="display:flex;justify-content:space-between;"><span style="color:var(--color-text-tertiary);">Provider</span><strong>${msg.provider || 'Mock (Sandbox)'}</strong></div>
          ${msg.error ? `<div style="display:flex;justify-content:space-between;color:var(--sf-error-600);"><span style="color:var(--sf-error-600);">Failure Reason</span><strong>${msg.error}</strong></div>` : ''}
        </div>
      </div>
    `, `
      ${msg.metadata?.documentId ? `<button class="btn btn-secondary" onclick="invoiceGenerator.previewDocument('${msg.metadata.documentId}')">${icons.fileText} Attached Document</button>` : ''}
      <button class="btn btn-primary" onclick="resendWhatsAppMessage('${msg.id}'); modal.close();">Resend Now</button>
    `);
  };

  window.resendWhatsAppMessage = function(messageId) {
    if (window.notificationService && window.notificationService.retryFailedMessage) {
      window.notificationService.retryFailedMessage(messageId).then(res => {
        toast.show('WhatsApp message queued & resent!', 'success');
        render();
      }).catch(e => toast.show(e.message, 'error'));
    }
  };

  window.openBroadcastWhatsAppModal = function() {
    const students = store.getStudents(branchId);
    modal.open('Send WhatsApp Notice', `
      <div style="display:flex;flex-direction:column;gap:var(--space-4);">
        <div class="form-group">
          <label class="form-label">Recipient Group <span class="required">*</span></label>
          <select class="select" id="broadcast-group">
            <option value="all">All Active Students (${students.length})</option>
            <option value="dues">Students with Pending Dues</option>
            <option value="expiring">Students Expiring Soon (&lt; 14 days)</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Message Notice <span class="required">*</span></label>
          <textarea class="textarea" id="broadcast-text" rows="4" placeholder="Dear Students, please be informed that..."></textarea>
          <div class="form-hint">Respects student opt-in consent; automatically queued asynchronously.</div>
        </div>
      </div>
    `, `
      <button class="btn btn-secondary" onclick="modal.close()">Cancel</button>
      <button class="btn btn-primary" onclick="confirmBroadcastWhatsApp()">${icons.bell} Dispatch Notice</button>
    `);

    window.confirmBroadcastWhatsApp = () => {
      const text = document.getElementById('broadcast-text')?.value?.trim();
      const group = document.getElementById('broadcast-group')?.value;
      if (!text) { toast.show('Please enter a message', 'error'); return; }

      let targetStudents = students;
      if (group === 'dues') {
        const dues = store.getPendingDues(branchId);
        targetStudents = dues.map(d => d.student);
      } else if (group === 'expiring') {
        const expiring = store.getExpiringMemberships(branchId, 14);
        targetStudents = expiring.map(e => e.student);
      }

      let count = 0;
      targetStudents.forEach(s => {
        if (s.whatsapp_opt_in !== false && window.notificationService) {
          window.notificationService.queueMessage({
            studentId: s.id,
            phone: s.normalized_phone || s.phone,
            eventType: 'ANNOUNCEMENT',
            templateName: 'general_notice',
            content: text.replace('Dear Students', `Dear ${s.name}`)
          });
          count++;
        }
      });

      modal.close();
      toast.show(`Dispatched WhatsApp broadcast to ${count} students!`, 'success');
      render();
    };
  };

  render();
}

})();

// ─── PAGE: activity.js ───
(function() {
// Activity Log Page
window.Pages.renderActivity = function renderActivity(container) {
  const activities = store.getActivityLogs(100);

  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-row">
        <div>
          <h1 class="page-title">Activity Log</h1>
          <p class="page-subtitle">Complete audit trail of all actions</p>
        </div>
      </div>
    </div>

    <div class="table-container">
      <div class="table-scroll">
        <table>
          <thead>
            <tr><th>Time</th><th>Action</th><th>Description</th><th>Type</th></tr>
          </thead>
          <tbody>
            ${activities.map(a => {
              const actionIconMap = {
                seat_assigned: icons['map-pin'],
                payment_recorded: icons['dollar-sign'],
                seat_released: icons.checkCircle,
                seat_transferred: icons['arrow-right'],
                membership_renewed: icons.repeat,
                student_created: icons['user-plus'],
                check_in: icons.clock,
                check_out: icons.clock,
                seat_maintenance: icons.tool,
              };
              const icon = actionIconMap[a.action] || icons.activity;

              return `
                <tr>
                  <td style="color:var(--color-text-secondary);white-space:nowrap;">${utils.formatRelative(a.timestamp)}</td>
                  <td>
                    <div style="display:flex;align-items:center;gap:var(--space-2);color:var(--color-text-secondary);">
                      ${icon}
                      <span style="font-size:var(--text-xs);">${a.action?.replace(/_/g, ' ')}</span>
                    </div>
                  </td>
                  <td style="color:var(--color-text-primary);">${a.description}</td>
                  <td><span class="badge badge-neutral">${a.entity || '—'}</span></td>
                </tr>
              `;
            }).join('') || `
              <tr><td colspan="4"><div class="empty-state" style="padding:var(--space-8);">
                <div class="empty-icon">${icons.activity}</div>
                <div class="empty-title">No activity recorded</div>
              </div></td></tr>
            `}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

})();

// ─── PAGE: settings.js ───
(function() {
// Settings Page
window.Pages.renderSettings = function renderSettings(container) {
  const settings = store.getSettings();
  const branches = store.getBranches();

  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-row">
        <div>
          <h1 class="page-title">Settings</h1>
          <p class="page-subtitle">Organization, appearance, and configuration</p>
        </div>
      </div>
    </div>

    <div class="grid-2" style="gap:var(--space-5);align-items:start;">
      <!-- Organization -->
      <div class="card">
        <div class="card-header"><div class="card-title">Organization</div></div>
        <div class="card-body" style="display:flex;flex-direction:column;gap:var(--space-4);">
          <div class="form-group">
            <label class="form-label">Organization Name</label>
            <input type="text" class="input" id="set-org-name" value="${settings.orgName || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Address</label>
            <input type="text" class="input" id="set-address" value="${settings.address || ''}">
          </div>
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Phone</label>
              <input type="tel" class="input" id="set-phone" value="${settings.phone || ''}">
            </div>
            <div class="form-group">
              <label class="form-label">Email</label>
              <input type="email" class="input" id="set-email" value="${settings.email || ''}">
            </div>
          </div>
          <button class="btn btn-primary w-full" onclick="saveOrgSettings()">Save Changes</button>
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:var(--space-5);">
        <!-- Appearance -->
        <div class="card">
          <div class="card-header"><div class="card-title">Appearance</div></div>
          <div class="card-body">
            <div class="form-group">
              <label class="form-label">Theme</label>
              <div style="display:flex;gap:var(--space-2);">
                <button class="btn ${document.documentElement.dataset.theme === 'light' ? 'btn-primary' : 'btn-secondary'}" onclick="app.toggleTheme()">Light</button>
                <button class="btn ${document.documentElement.dataset.theme === 'dark' ? 'btn-primary' : 'btn-secondary'}" onclick="app.toggleTheme()">Dark</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Branches -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">Branches</div>
          </div>
          <div class="card-body">
            ${branches.map(b => `
              <div style="display:flex;align-items:center;justify-content:space-between;padding:var(--space-3) 0;border-bottom:1px solid var(--color-border-secondary);">
                <div>
                  <div style="font-weight:var(--fw-medium);">${b.name}</div>
                  <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);">${b.city} · ${b.phone}</div>
                </div>
                <span class="badge badge-success"><span class="badge-dot"></span>${b.status}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- WhatsApp & Invoice Automation Settings -->
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">WhatsApp Communication & Invoicing</div>
              <div class="card-subtitle">Provider API credentials and automated message dispatches</div>
            </div>
          </div>
          <div class="card-body" style="display:flex;flex-direction:column;gap:var(--space-4);">
            <div class="form-group">
              <label class="form-label">Active WhatsApp Provider</label>
              <select class="select" id="set-wa-provider">
                <option value="mock" selected>Mock / Sandbox Simulator (No external API needed)</option>
                <option value="meta">Meta WhatsApp Cloud API (Graph API)</option>
                <option value="twilio">Twilio Programmable Messaging</option>
              </select>
              <div class="form-hint">Mock mode simulates delivery ticks and logs messages in Communication Center.</div>
            </div>

            <div class="grid-2">
              <div class="form-group">
                <label class="form-label">WhatsApp Business Phone ID</label>
                <input type="text" class="input" id="set-wa-phone-id" placeholder="e.g. 109384729384729" value="${settings.waPhoneId || ''}">
              </div>
              <div class="form-group">
                <label class="form-label">WhatsApp Account ID / Namespace</label>
                <input type="text" class="input" id="set-wa-acc-id" placeholder="e.g. studyflow_notifications" value="${settings.waAccId || ''}">
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Permanent Access Token</label>
              <input type="password" class="input" id="set-wa-token" placeholder="Bearer EAAG..." value="${settings.waToken || ''}">
            </div>

            <!-- Automation Rules -->
            <div style="padding:var(--space-3);background:var(--color-bg-secondary);border-radius:var(--radius-lg);display:flex;flex-direction:column;gap:var(--space-3);">
              <div style="font-size:var(--text-xs);font-weight:var(--fw-bold);color:var(--color-text-secondary);text-transform:uppercase;">Automated Event Dispatches</div>
              
              <label style="display:flex;align-items:center;gap:var(--space-2);cursor:pointer;font-size:var(--text-sm);">
                <input type="checkbox" id="rule-seat-assign" checked style="accent-color:var(--sf-indigo-600);">
                <span>Seat Allocation: Auto-issue Invoice and send WhatsApp confirmation</span>
              </label>

              <label style="display:flex;align-items:center;gap:var(--space-2);cursor:pointer;font-size:var(--text-sm);">
                <input type="checkbox" id="rule-payment-receipt" checked style="accent-color:var(--sf-indigo-600);">
                <span>Payment Recorded: Auto-issue Receipt and dispatch WhatsApp</span>
              </label>

              <label style="display:flex;align-items:center;gap:var(--space-2);cursor:pointer;font-size:var(--text-sm);">
                <input type="checkbox" id="rule-expiry-reminder" checked style="accent-color:var(--sf-indigo-600);">
                <span>Expiry Notice: Send 3-day and 1-day automated reminders</span>
              </label>

              <label style="display:flex;align-items:center;gap:var(--space-2);cursor:pointer;font-size:var(--text-sm);">
                <input type="checkbox" id="rule-due-reminder" checked style="accent-color:var(--sf-indigo-600);">
                <span>Fee Due Alerts: Send automated overdue notices</span>
              </label>
            </div>

            <button class="btn btn-secondary w-full" onclick="saveWhatsAppSettings()">Save WhatsApp Configuration</button>

            <!-- Test Simulator -->
            <div style="margin-top:var(--space-2);padding-top:var(--space-4);border-top:1px solid var(--color-border-secondary);">
              <div style="font-size:var(--text-sm);font-weight:var(--fw-bold);margin-bottom:var(--space-2);">🧪 Test WhatsApp Sandbox</div>
              <div style="display:flex;gap:var(--space-2);margin-bottom:var(--space-3);">
                <input type="tel" class="input flex-1" id="test-wa-phone" placeholder="+919876543210" value="+919876543210">
                <select class="select" id="test-wa-template" style="width:160px;">
                  <option value="seat_assigned">Seat Assignment</option>
                  <option value="payment_receipt">Payment Receipt</option>
                  <option value="expiry_reminder">Expiry Reminder</option>
                  <option value="fee_reminder">Fee Due Alert</option>
                </select>
                <button class="btn btn-primary" onclick="sendTestWhatsApp()">Test Send</button>
              </div>
              <div id="test-wa-result" style="display:none;padding:var(--space-3);background:var(--color-bg-secondary);border-radius:var(--radius-lg);font-size:var(--text-xs);font-family:var(--font-mono);"></div>
            </div>
          </div>
        </div>

        <!-- Danger Zone -->
        <div class="card" style="border-color:var(--sf-error-200);">
          <div class="card-header"><div class="card-title" style="color:var(--sf-error-600);">Danger Zone</div></div>
          <div class="card-body">
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <div>
                <div style="font-size:var(--text-sm);font-weight:var(--fw-medium);">Reset Demo Data</div>
                <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);">Clear all data and reload fresh demo</div>
              </div>
              <button class="btn btn-danger" onclick="app.resetApp()">Reset</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  window.saveOrgSettings = async function() {
    await store.updateSettings({
      orgName: document.getElementById('set-org-name')?.value?.trim(),
      address: document.getElementById('set-address')?.value?.trim(),
      phone: document.getElementById('set-phone')?.value?.trim(),
      email: document.getElementById('set-email')?.value?.trim(),
    });
    toast.show('Organization settings saved!', 'success');
  };

  window.saveWhatsAppSettings = async function() {
    await store.updateSettings({
      waProvider: document.getElementById('set-wa-provider')?.value,
      waPhoneId: document.getElementById('set-wa-phone-id')?.value?.trim(),
      waAccId: document.getElementById('set-wa-acc-id')?.value?.trim(),
      waToken: document.getElementById('set-wa-token')?.value?.trim()
    });
    toast.show('WhatsApp configuration saved!', 'success');
  };

  window.sendTestWhatsApp = function() {
    const phone = document.getElementById('test-wa-phone')?.value?.trim();
    const template = document.getElementById('test-wa-template')?.value;
    const resBox = document.getElementById('test-wa-result');

    if (!phone) { toast.show('Please enter a phone number', 'error'); return; }

    const provider = window.getWhatsAppProvider ? window.getWhatsAppProvider() : null;
    if (!provider) { toast.show('WhatsApp provider not loaded', 'error'); return; }

    resBox.style.display = 'block';
    resBox.innerHTML = '<span style="color:var(--sf-indigo-600);">Dispatching test message via ' + provider.name + '...</span>';

    const testContent = `[StudyFlow Test] Hello! This is a test simulation of the "${template}" WhatsApp template dispatch to ${phone}. Everything is functioning normally!`;

    provider.sendTextMessage(phone, testContent).then(result => {
      resBox.innerHTML = `
        <div style="color:var(--sf-success-600);font-weight:bold;margin-bottom:4px;">✓ DISPATCH SUCCESSFUL</div>
        <div>Provider: <strong>${provider.name}</strong></div>
        <div>Message ID: <code>${result.messageId}</code></div>
        <div>Timestamp: ${result.timestamp}</div>
        <div style="margin-top:6px;color:var(--color-text-secondary);font-family:var(--font-sans);">${testContent}</div>
      `;
      toast.show('Test WhatsApp delivered successfully!', 'success');
    }).catch(err => {
      resBox.innerHTML = `
        <div style="color:var(--sf-error-600);font-weight:bold;">✗ DISPATCH FAILED</div>
        <div>${err.message}</div>
      `;
      toast.show('Test WhatsApp failed: ' + err.message, 'error');
    });
  };
}

})();

// ─── PAGE: reservations.js ───
(function() {
// Reservations Page
window.Pages.renderReservations = function renderReservations(container) {
  const branchId = store.getActiveBranchId();
  const reservations = store.getReservations().filter(r => {
    const seats = store.getSeatsForBranch(branchId).map(s => s.id);
    return seats.includes(r.seatId);
  }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-row">
        <div>
          <h1 class="page-title">Reservations</h1>
          <p class="page-subtitle">Manage seat reservations and waitlist</p>
        </div>
        <button class="btn btn-primary" onclick="openReservationModal()">
          ${icons.calendar} New Reservation
        </button>
      </div>
    </div>

    <div class="table-container">
      <div class="table-header"><div class="table-title">All Reservations</div></div>
      <div class="table-scroll">
        <table>
          <thead>
            <tr><th>Student</th><th>Seat</th><th>From</th><th>To</th><th>Status</th><th>Notes</th></tr>
          </thead>
          <tbody>
            ${reservations.map(r => {
              const student = store.getStudent(r.studentId);
              const seat = store.getSeat(r.seatId);
              const today_ = new Date();
              const start = new Date(r.startDate);
              const end = new Date(r.endDate);
              const isActive = start <= today_ && end >= today_;
              const isFuture = start > today_;
              const status = r.status === 'cancelled' ? 'cancelled' : end < today_ ? 'expired' : isFuture ? 'upcoming' : 'active';
              const badgeClass = { upcoming: 'badge-indigo', active: 'badge-success', expired: 'badge-neutral', cancelled: 'badge-error' }[status];
              return `
                <tr>
                  <td>
                    <div class="student-cell">
                      <div class="avatar avatar-sm" style="background:${student?.avatar};">${utils.initials(student?.name || '')}</div>
                      <div class="student-name">${student?.name || '—'}</div>
                    </div>
                  </td>
                  <td>${seat ? `<span class="badge badge-indigo">${seat.label}</span>` : '—'}</td>
                  <td style="color:var(--color-text-secondary);">${utils.formatDate(r.startDate, {day:'numeric',month:'short'})}</td>
                  <td style="color:var(--color-text-secondary);">${utils.formatDate(r.endDate, {day:'numeric',month:'short'})}</td>
                  <td><span class="badge ${badgeClass}"><span class="badge-dot"></span>${capitalizeFirst(status)}</span></td>
                  <td style="color:var(--color-text-secondary);font-size:var(--text-xs);">${r.notes || '—'}</td>
                </tr>
              `;
            }).join('') || `
              <tr><td colspan="6"><div class="empty-state" style="padding:var(--space-8);">
                <div class="empty-icon">${icons.calendar}</div>
                <div class="empty-title">No reservations</div>
              </div></td></tr>
            `}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

})();

// ─── APP CORE ───
// StudyFlow Application — Main Entry Point

// ── Router ─────────────────────────────────────────────────────────
const routes = {
  '/dashboard': () => Promise.resolve(window.Pages.renderDashboard),
  '/seat-map': () => Promise.resolve(window.Pages.renderSeatMap),
  '/students': () => Promise.resolve(window.Pages.renderStudents),
  '/student': () => Promise.resolve(window.Pages.renderStudentProfile),
  '/memberships': () => Promise.resolve(window.Pages.renderMemberships),
  '/payments': () => Promise.resolve(window.Pages.renderPayments),
  '/attendance': () => Promise.resolve(window.Pages.renderAttendance),
  '/floors': () => Promise.resolve(window.Pages.renderFloors),
  '/expenses': () => Promise.resolve(window.Pages.renderExpenses),
  '/reports': () => Promise.resolve(window.Pages.renderReports),
  '/staff': () => Promise.resolve(window.Pages.renderStaff),
  '/notifications': () => Promise.resolve(window.Pages.renderNotifications),
  '/activity': () => Promise.resolve(window.Pages.renderActivity),
  '/settings': () => Promise.resolve(window.Pages.renderSettings),
  '/reservations': () => Promise.resolve(window.Pages.renderReservations),
};

class App {
  constructor() {
    this.currentRoute = null;
    this.sidebarCollapsed = false; // in-memory, resets to expanded on reload
    this._themeInit();
  }

  async init() {
    // Load all data from Neon DB before rendering
    await store.load();

    this._render();
    this._setupRouter();
    this._navigate();

    // Subscribe to store changes for reactive updates
    store.subscribe(() => {
      this._updateNotifBadge();
      this._updateBranchName();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', e => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        this.openSpotlight();
      }
      if (e.key === 'Escape') {
        this.closeAllOverlays();
      }
    });

    if (typeof dismissAppLoader === 'function') {
      dismissAppLoader();
    }
  }

  _themeInit() {
    const theme = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
    document.documentElement.dataset.theme = theme;
  }

  _render() {
    document.getElementById('app').innerHTML = `
      <aside class="sidebar ${this.sidebarCollapsed ? 'collapsed' : ''}" id="sidebar">
        <div class="sidebar-logo">
          <div class="sidebar-logo-icon">SF</div>
          <span class="sidebar-logo-text">StudyFlow</span>
        </div>

        <nav class="sidebar-nav" id="sidebar-nav">
          ${this._renderNav()}
        </nav>

        <div class="sidebar-footer">
          <div class="sidebar-user-avatar">AM</div>
          <div class="sidebar-user-info">
            <div class="sidebar-user-name truncate">Arjun Mehta</div>
            <div class="sidebar-user-role">Owner</div>
          </div>
        </div>

        <button class="sidebar-collapse-btn" id="sidebar-collapse-btn" aria-label="Toggle sidebar">
          ${this.sidebarCollapsed ? icons.chevronRight : icons.chevronLeft}
        </button>
      </aside>

      <div class="sidebar-overlay" id="sidebar-overlay" style="display:none;" onclick="app.closeMobileSidebar()"></div>

      <div class="main-area" id="main-area">
        <header class="topbar" id="topbar">
          <button class="topbar-icon-btn" id="mobile-menu-btn" style="display:none;" onclick="app.openMobileSidebar()">
            ${icons.menu}
          </button>

          <div class="topbar-search">
            <div class="topbar-search-icon">${icons.search}</div>
            <input type="text" class="topbar-search-input" id="topbar-search-input"
              placeholder="Search students, seats, payments..."
              onclick="app.openSpotlight()"
              readonly
            />
            <span class="topbar-search-shortcut">⌘K</span>
          </div>

          <div class="topbar-spacer"></div>

          <div class="topbar-actions">
            <div class="branch-selector" id="branch-selector" onclick="app.openBranchDropdown(this)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              <span id="active-branch-name">Andheri West</span>
              ${icons.chevronDown}
            </div>

            <button class="topbar-icon-btn" title="Notifications" id="notif-btn" onclick="app.navigate('/notifications')">
              ${icons.bell}
              <span class="topbar-notif-badge" id="notif-badge" style="display:none;"></span>
            </button>

            <button class="topbar-icon-btn" title="Toggle theme" onclick="app.toggleTheme()">
              ${icons.sun}
            </button>

            <button class="topbar-quick-add" id="quick-add-btn" onclick="app.openQuickAdd(this)">
              ${icons.plus}
              <span>Add</span>
            </button>

            <div class="topbar-avatar" title="Arjun Mehta · Owner" onclick="app.openUserMenu(this)">AM</div>
          </div>
        </header>

        <main class="page-content" id="page-content">
          <div class="page-inner">
            <div style="display:flex;align-items:center;justify-content:center;height:300px;">
              <div class="spinner"></div>
            </div>
          </div>
        </main>
      </div>

      <div id="toast-container" class="toast-container"></div>
    `;

    // Setup sidebar collapse
    document.getElementById('sidebar-collapse-btn').addEventListener('click', () => {
      this.toggleSidebar();
    });

    // Mobile responsiveness
    this._handleResize();
    window.addEventListener('resize', () => this._handleResize());

    // Active branch name
    this._updateBranchName();
    this._updateNotifBadge();
  }

  _renderNav() {
    const navSections = [
      { label: 'OVERVIEW', items: [
        { route: '/dashboard', label: 'Dashboard', icon: 'grid' },
      ]},
      { label: 'OPERATIONS', items: [
        { route: '/seat-map', label: 'Seat Map', icon: 'map' },
        { route: '/students', label: 'Students', icon: 'users' },
        { route: '/memberships', label: 'Memberships', icon: 'credit-card' },
        { route: '/attendance', label: 'Attendance', icon: 'clock' },
        { route: '/reservations', label: 'Reservations', icon: 'calendar' },
      ]},
      { label: 'FINANCE', items: [
        { route: '/payments', label: 'Payments', icon: 'dollar-sign' },
        { route: '/expenses', label: 'Expenses', icon: 'trending-down' },
      ]},
      { label: 'MANAGEMENT', items: [
        { route: '/floors', label: 'Floors & Rooms', icon: 'layers' },
        { route: '/staff', label: 'Staff', icon: 'user-check' },
        { route: '/reports', label: 'Reports', icon: 'bar-chart-2' },
        { route: '/notifications', label: 'Notifications', icon: 'bell', badgeId: 'nav-notif-badge' },
      ]},
      { label: 'SYSTEM', items: [
        { route: '/activity', label: 'Activity Log', icon: 'activity' },
        { route: '/settings', label: 'Settings', icon: 'settings' },
      ]},
    ];

    return navSections.map(section => `
      <div class="sidebar-section">
        <div class="sidebar-section-label">${section.label}</div>
        <div class="sidebar-nav-items">
          ${section.items.map(item => `
            <div class="nav-item" data-route="${item.route}" onclick="app.navigate('${item.route}')">
              <div class="nav-icon">${icons[item.icon] || ''}</div>
              <span class="nav-label">${item.label}</span>
              ${item.badgeId ? `<span class="nav-badge" id="${item.badgeId}" style="display:none;"></span>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  }

  _setupRouter() {
    window.addEventListener('hashchange', () => this._navigate());
  }

  async _navigate() {
    const hash = location.hash.replace('#', '') || '/dashboard';
    const path = hash.split('?')[0];
    const params = new URLSearchParams(hash.split('?')[1] || '');

    this.currentRoute = path;
    this._updateActiveNav(path);

    const content = document.getElementById('page-content');
    content.innerHTML = `
      <div class="page-inner">
        <div style="display:flex;align-items:center;justify-content:center;height:300px;">
          <div class="spinner"></div>
        </div>
      </div>
    `;

    // Find matching route
    let routeFn = routes[path];
    if (!routeFn) {
      // Check for partial matches (e.g., /student?id=...)
      const basePath = '/' + path.split('/').filter(Boolean)[0];
      routeFn = routes[basePath];
    }

    if (routeFn) {
      try {
        const renderFn = await routeFn();
        const inner = document.createElement('div');
        inner.className = 'page-inner';
        content.innerHTML = '';
        content.appendChild(inner);
        renderFn(inner, Object.fromEntries(params));
      } catch (e) {
        console.error('Page load error:', e);
        content.innerHTML = `
          <div class="page-inner">
            <div class="empty-state">
              <div class="empty-icon">${icons['alert-circle']}</div>
              <div class="empty-title">Page Error</div>
              <div class="empty-desc">Failed to load page: ${e.message}</div>
              <button class="btn btn-secondary" onclick="app.navigate('/dashboard')">Go to Dashboard</button>
            </div>
          </div>
        `;
      }
    } else {
      content.innerHTML = `
        <div class="page-inner">
          <div class="empty-state">
            <div class="empty-icon">${icons.search}</div>
            <div class="empty-title">Page Not Found</div>
            <div class="empty-desc">The page you're looking for doesn't exist.</div>
            <button class="btn btn-secondary" onclick="app.navigate('/dashboard')">Go to Dashboard</button>
          </div>
        </div>
      `;
    }
  }

  navigate(route, params) {
    const queryStr = params ? '?' + new URLSearchParams(params).toString() : '';
    location.hash = route + queryStr;
  }

  _updateActiveNav(path) {
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.route === path);
    });
  }

  _updateBranchName() {
    const branchId = store.getActiveBranchId();
    const branch = store.getBranch(branchId);
    const el = document.getElementById('active-branch-name');
    if (el && branch) el.textContent = branch.name;
  }

  _updateNotifBadge() {
    const count = store.getUnreadCount();
    const badge = document.getElementById('notif-badge');
    const navBadge = document.getElementById('nav-notif-badge');
    if (badge) badge.style.display = count > 0 ? 'block' : 'none';
    if (navBadge) {
      navBadge.textContent = count > 0 ? count : '';
      navBadge.style.display = count > 0 ? 'inline-flex' : 'none';
    }
  }

  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
    const sidebar = document.getElementById('sidebar');
    const btn = document.getElementById('sidebar-collapse-btn');
    sidebar.classList.toggle('collapsed', this.sidebarCollapsed);
    btn.innerHTML = this.sidebarCollapsed ? icons.chevronRight : icons.chevronLeft;
  }

  openMobileSidebar() {
    document.getElementById('sidebar').classList.add('mobile-open');
    document.getElementById('sidebar-overlay').style.display = 'block';
  }

  closeMobileSidebar() {
    document.getElementById('sidebar').classList.remove('mobile-open');
    document.getElementById('sidebar-overlay').style.display = 'none';
  }

  _handleResize() {
    const mobileBtn = document.getElementById('mobile-menu-btn');
    const isMobile = window.innerWidth <= 1024;
    if (mobileBtn) mobileBtn.style.display = isMobile ? 'flex' : 'none';
    if (!isMobile) this.closeMobileSidebar();
  }

  async toggleTheme() {
    const current = document.documentElement.dataset.theme;
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    await store.updateSettings({ theme: next });
    toast.show(`Switched to ${next} mode`, 'success');
  }

  openBranchDropdown(btn) {
    const existing = document.getElementById('branch-dropdown');
    if (existing) { existing.remove(); return; }

    const branches = store.getBranches();
    const activeBranchId = store.getActiveBranchId();
    const rect = btn.getBoundingClientRect();

    const menu = document.createElement('div');
    menu.id = 'branch-dropdown';
    menu.className = 'dropdown-menu';
    menu.style.cssText = `position:fixed;top:${rect.bottom + 8}px;left:${rect.left}px;z-index:300;min-width:200px;`;
    menu.innerHTML = branches.map(b => `
      <button class="dropdown-item ${b.id === activeBranchId ? 'active' : ''}" onclick="app.switchBranch('${b.id}')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
        ${b.name}
        ${b.id === activeBranchId ? `<svg style="margin-left:auto" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>` : ''}
      </button>
    `).join('');

    document.body.appendChild(menu);
    setTimeout(() => document.addEventListener('click', (e) => { if (!menu.contains(e.target) && e.target !== btn) menu.remove(); }, { once: true }));
  }

  switchBranch(branchId) {
    store.setActiveBranch(branchId);
    this._updateBranchName();
    document.getElementById('branch-dropdown')?.remove();
    // Re-render current page
    this._navigate();
    toast.show(`Switched to ${store.getBranch(branchId)?.name}`, 'success');
  }

  openQuickAdd(btn) {
    const existing = document.getElementById('quick-add-menu');
    if (existing) { existing.remove(); return; }

    const rect = btn.getBoundingClientRect();
    const menu = document.createElement('div');
    menu.id = 'quick-add-menu';
    menu.className = 'dropdown-menu';
    menu.style.cssText = `position:fixed;top:${rect.bottom + 8}px;right:${window.innerWidth - rect.right}px;z-index:300;min-width:200px;`;

    const items = [
      { label: 'Add Student', icon: 'user-plus', action: `app.navigate('/students'); setTimeout(()=>document.getElementById('add-student-btn')?.click(),300)` },
      { label: 'Assign Seat', icon: 'map-pin', action: `app.navigate('/seat-map')` },
      { label: 'Record Payment', icon: 'dollar-sign', action: `app.navigate('/payments')` },
      { label: 'Add Reservation', icon: 'calendar', action: `app.navigate('/reservations')` },
      { label: 'Add Expense', icon: 'trending-down', action: `app.navigate('/expenses')` },
      { label: 'Add Staff', icon: 'user-check', action: `app.navigate('/staff')` },
    ];

    menu.innerHTML = items.map(item => `
      <button class="dropdown-item" onclick="${item.action}; document.getElementById('quick-add-menu')?.remove()">
        <div style="width:16px;height:16px;flex-shrink:0;">${icons[item.icon] || ''}</div>
        ${item.label}
      </button>
    `).join('');

    document.body.appendChild(menu);
    setTimeout(() => document.addEventListener('click', (e) => { if (!menu.contains(e.target)) menu.remove(); }, { once: true }));
  }

  openUserMenu(btn) {
    const existing = document.getElementById('user-menu');
    if (existing) { existing.remove(); return; }

    const rect = btn.getBoundingClientRect();
    const menu = document.createElement('div');
    menu.id = 'user-menu';
    menu.className = 'dropdown-menu';
    menu.style.cssText = `position:fixed;top:${rect.bottom + 8}px;right:${window.innerWidth - rect.right}px;z-index:300;min-width:200px;`;
    menu.innerHTML = `
      <div style="padding:var(--space-3);border-bottom:1px solid var(--color-border-secondary);margin-bottom:var(--space-2);">
        <div style="font-weight:var(--fw-semibold);color:var(--color-text-primary);font-size:var(--text-sm);">Arjun Mehta</div>
        <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);">arjun@studyflow.in</div>
      </div>
      <button class="dropdown-item" onclick="app.navigate('/settings'); document.getElementById('user-menu')?.remove()">
        ${icons.settings} Settings
      </button>
      <button class="dropdown-item" onclick="app.toggleTheme(); document.getElementById('user-menu')?.remove()">
        ${icons.sun} Toggle Theme
      </button>
      <div class="dropdown-separator"></div>
      <button class="dropdown-item danger" onclick="app.resetApp()">
        ${icons.logOut} Reset Demo Data
      </button>
    `;
    document.body.appendChild(menu);
    setTimeout(() => document.addEventListener('click', (e) => { if (!menu.contains(e.target)) menu.remove(); }, { once: true }));
  }

  resetApp() {
    if (confirm('Reload app and refresh data from database?')) {
      location.reload();
    }
  }

  openSpotlight() {
    if (document.getElementById('spotlight-backdrop')) return;

    const backdrop = document.createElement('div');
    backdrop.id = 'spotlight-backdrop';
    backdrop.className = 'spotlight-backdrop';
    backdrop.onclick = (e) => { if (e.target === backdrop) backdrop.remove(); };

    backdrop.innerHTML = `
      <div class="spotlight">
        <div class="spotlight-input-wrap">
          <div style="color:var(--color-icon-secondary);">${icons.search}</div>
          <input type="text" class="spotlight-input" id="spotlight-input" placeholder="Search students, seats, payments..." autofocus />
          <div class="kbd">ESC</div>
        </div>
        <div class="spotlight-results" id="spotlight-results">
          ${this._renderSpotlightDefault()}
        </div>
        <div class="spotlight-footer">
          <div class="spotlight-hint"><div class="kbd">↑↓</div> navigate</div>
          <div class="spotlight-hint"><div class="kbd">↵</div> select</div>
          <div class="spotlight-hint"><div class="kbd">ESC</div> close</div>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);
    setTimeout(() => document.getElementById('spotlight-input')?.focus(), 50);

    document.getElementById('spotlight-input').addEventListener('input', (e) => {
      this._spotlightSearch(e.target.value);
    });
  }

  _renderSpotlightDefault() {
    const recentActivity = store.getActivityLogs(5);
    return `
      <div class="spotlight-group-label">Recent Activity</div>
      ${recentActivity.map(a => `
        <div class="spotlight-item" onclick="app.navigate('/activity'); document.getElementById('spotlight-backdrop')?.remove()">
          <div class="spotlight-item-icon">${icons.activity || ''}</div>
          <div class="spotlight-item-info">
            <div class="spotlight-item-title">${a.description}</div>
            <div class="spotlight-item-sub">${utils.formatRelative(a.timestamp)}</div>
          </div>
          <span class="spotlight-item-type">Activity</span>
        </div>
      `).join('')}
    `;
  }

  _spotlightSearch(query) {
    const results = document.getElementById('spotlight-results');
    if (!query.trim()) { results.innerHTML = this._renderSpotlightDefault(); return; }

    const q = query.toLowerCase();
    const branchId = store.getActiveBranchId();
    const students = store.searchStudents(query, branchId).slice(0, 5);
    const allSeats = store.getSeatsForBranch(branchId).filter(s =>
      s.label.toLowerCase().includes(q)
    ).slice(0, 5);
    const payments = (store.db.payments || []).filter(p =>
      p.receiptNumber?.toLowerCase().includes(q)
    ).slice(0, 3);

    let html = '';

    if (students.length) {
      html += `<div class="spotlight-group-label">Students</div>`;
      html += students.map(s => {
        const assignment = store.getStudentAssignment(s.id);
        const seat = assignment ? store.getSeat(assignment.seatId) : null;
        return `
          <div class="spotlight-item" onclick="app.navigate('/student', {id:'${s.id}'}); document.getElementById('spotlight-backdrop')?.remove()">
            <div class="spotlight-item-icon" style="background:${s.avatar};">
              <span style="color:white;font-size:var(--text-xs);font-weight:var(--fw-bold);">${utils.initials(s.name)}</span>
            </div>
            <div class="spotlight-item-info">
              <div class="spotlight-item-title">${s.name}</div>
              <div class="spotlight-item-sub">${s.id} · ${seat ? 'Seat ' + seat.label : 'No seat'}</div>
            </div>
            <span class="spotlight-item-type">Student</span>
          </div>
        `;
      }).join('');
    }

    if (allSeats.length) {
      html += `<div class="spotlight-group-label">Seats</div>`;
      html += allSeats.map(s => {
        const status = store.getSeatStatus(s.id);
        const assignment = store.getActiveAssignment(s.id);
        const student = assignment ? store.getStudent(assignment.studentId) : null;
        return `
          <div class="spotlight-item" onclick="app.navigate('/seat-map'); document.getElementById('spotlight-backdrop')?.remove()">
            <div class="spotlight-item-icon">${icons.map || ''}</div>
            <div class="spotlight-item-info">
              <div class="spotlight-item-title">Seat ${s.label}</div>
              <div class="spotlight-item-sub">${student ? student.name : capitalizeFirst(status)}</div>
            </div>
            <span class="spotlight-item-type">Seat</span>
          </div>
        `;
      }).join('');
    }

    if (payments.length) {
      html += `<div class="spotlight-group-label">Receipts</div>`;
      html += payments.map(p => {
        const student = store.getStudent(p.studentId);
        return `
          <div class="spotlight-item" onclick="app.navigate('/payments'); document.getElementById('spotlight-backdrop')?.remove()">
            <div class="spotlight-item-icon">${icons['dollar-sign'] || ''}</div>
            <div class="spotlight-item-info">
              <div class="spotlight-item-title">${p.receiptNumber}</div>
              <div class="spotlight-item-sub">${student?.name || '—'} · ${utils.formatINR(p.amount)}</div>
            </div>
            <span class="spotlight-item-type">Payment</span>
          </div>
        `;
      }).join('');
    }

    if (!html) {
      html = `
        <div class="empty-state" style="padding:var(--space-8);">
          <div class="empty-icon">${icons.search}</div>
          <div class="empty-title" style="font-size:var(--text-sm);">No results for "${query}"</div>
        </div>
      `;
    }

    results.innerHTML = html;
  }

  closeAllOverlays() {
    document.getElementById('spotlight-backdrop')?.remove();
    document.getElementById('branch-dropdown')?.remove();
    document.getElementById('quick-add-menu')?.remove();
    document.getElementById('user-menu')?.remove();
    document.querySelectorAll('.modal-backdrop, .drawer-backdrop, .drawer').forEach(el => el.remove());
    this.closeMobileSidebar();
  }
}

// ── Toast System ───────────────────────────────────────────────────
const toast = {
  show(msg, type = 'default', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const t = document.createElement('div');
    t.className = `toast ${type}`;

    const iconMap = { success: icons.checkCircle, error: icons['alert-circle'], warning: icons['alert-triangle'] };
    const icon = iconMap[type] || icons.info;

    t.innerHTML = `<div class="toast-icon">${icon}</div><div class="toast-msg">${msg}</div>`;
    container.appendChild(t);

    setTimeout(() => {
      t.style.opacity = '0';
      t.style.transform = 'translateY(8px)';
      t.style.transition = 'all 0.2s';
      setTimeout(() => t.remove(), 200);
    }, duration);
  }
};

// ── Modal System ───────────────────────────────────────────────────
const modal = {
  open(title, bodyHTML, footerHTML, opts = {}) {
    this.close();
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.id = 'modal-backdrop';

    const sizeClass = opts.size ? `modal-${opts.size}` : '';
    backdrop.innerHTML = `
      <div class="modal ${sizeClass}" id="modal-dialog">
        <div class="modal-header">
          <h2 class="modal-title">${title}</h2>
          <button class="modal-close" onclick="modal.close()" aria-label="Close">
            ${icons.x}
          </button>
        </div>
        <div class="modal-body">${bodyHTML}</div>
        ${footerHTML ? `<div class="modal-footer">${footerHTML}</div>` : ''}
      </div>
    `;

    if (!opts.noBackdropClose) {
      backdrop.addEventListener('click', e => { if (e.target === backdrop) modal.close(); });
    }

    document.body.appendChild(backdrop);
    return backdrop;
  },

  close() {
    document.getElementById('modal-backdrop')?.remove();
  }
};

// ── Drawer System ──────────────────────────────────────────────────
const drawer = {
  open(title, bodyHTML, footerHTML) {
    this.close();

    const backdrop = document.createElement('div');
    backdrop.className = 'drawer-backdrop';
    backdrop.onclick = () => this.close();

    const drawerEl = document.createElement('div');
    drawerEl.className = 'drawer';
    drawerEl.id = 'main-drawer';
    drawerEl.innerHTML = `
      <div class="drawer-header">
        <h2 class="drawer-title">${title}</h2>
        <button class="drawer-close" onclick="drawer.close()" aria-label="Close">
          ${icons.x}
        </button>
      </div>
      <div class="drawer-body" id="drawer-body">${bodyHTML}</div>
      ${footerHTML ? `<div class="drawer-footer">${footerHTML}</div>` : ''}
    `;

    document.body.appendChild(backdrop);
    document.body.appendChild(drawerEl);

    return drawerEl;
  },

  close() {
    document.querySelector('.drawer-backdrop')?.remove();
    document.getElementById('main-drawer')?.remove();
  }
};

// ── Confirm Dialog ─────────────────────────────────────────────────
function confirmDialog(title, message, onConfirm, type = 'danger') {
  modal.open(title, `
    <div style="text-align:center;">
      <div class="confirm-dialog-icon ${type}" style="margin:0 auto var(--space-4);">
        ${type === 'danger' ? icons['alert-triangle'] : icons['alert-circle']}
      </div>
      <p style="color:var(--color-text-secondary);font-size:var(--text-sm);">${message}</p>
    </div>
  `, `
    <button class="btn btn-secondary" onclick="modal.close()">Cancel</button>
    <button class="btn btn-danger" onclick="modal.close(); (${onConfirm})()">Confirm</button>
  `, { size: 'sm', noBackdropClose: false });
}

// ── Utility ────────────────────────────────────────────────────────
function capitalizeFirst(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/-/g, ' ');
}

function seatStatusBadge(status) {
  const map = {
    'available': { cls: 'badge-success', label: 'Available' },
    'occupied': { cls: 'badge-indigo', label: 'Occupied' },
    'reserved': { cls: 'badge-orange', label: 'Reserved' },
    'payment-due': { cls: 'badge-error', label: 'Payment Due' },
    'expiring': { cls: 'badge-warning', label: 'Expiring Soon' },
    'maintenance': { cls: 'badge-neutral', label: 'Maintenance' },
    'blocked': { cls: 'badge-neutral', label: 'Blocked' },
  };
  const { cls, label } = map[status] || map['available'];
  return `<span class="badge ${cls}"><span class="badge-dot"></span>${label}</span>`;
}

function paymentStatusBadge(status) {
  const map = {
    'paid': { cls: 'badge-success', label: 'Paid' },
    'partial': { cls: 'badge-warning', label: 'Partial' },
    'pending': { cls: 'badge-error', label: 'Pending' },
    'overdue': { cls: 'badge-error', label: 'Overdue' },
  };
  const { cls, label } = map[status] || { cls: 'badge-neutral', label: capitalizeFirst(status) };
  return `<span class="badge ${cls}"><span class="badge-dot"></span>${label}</span>`;
}

function membershipStatusBadge(endDate, status) {
  if (status !== 'active') return `<span class="badge badge-neutral"><span class="badge-dot"></span>${capitalizeFirst(status)}</span>`;
  const days = utils.daysUntil(endDate);
  if (days < 0) return `<span class="badge badge-error"><span class="badge-dot"></span>Expired</span>`;
  if (days <= 7) return `<span class="badge badge-warning"><span class="badge-dot"></span>Expiring in ${days}d</span>`;
  return `<span class="badge badge-success"><span class="badge-dot"></span>Active</span>`;
}

// ── Bootstrap ──────────────────────────────────────────────────────
window.app = new App();
window.toast = toast;
window.modal = modal;
window.drawer = drawer;
window.confirmDialog = confirmDialog;
window.seatStatusBadge = seatStatusBadge;
window.paymentStatusBadge = paymentStatusBadge;
window.membershipStatusBadge = membershipStatusBadge;
window.capitalizeFirst = capitalizeFirst;

if (document.readyState === 'loading') {
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', () => app.init()); } else { app.init(); }
} else {
  app.init();
}

