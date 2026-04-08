/* ── Supabase Cloud Sync ── */

const SUPABASE_URL = 'https://dfjmuykhbqicpngxpbbe.supabase.co';
const SUPABASE_KEY = 'sb_publishable_84CJgj00hojh_ZliQP2vcg_SYGYHYsD';
const SYNC_TS_KEY = 'innerscape_last_sync';

let _syncState = { status: 'idle', lastSync: null, error: null };

/* ── Helpers ── */

function supabaseHeaders() {
  return {
    'apikey': SUPABASE_KEY,
    'Authorization': 'Bearer ' + SUPABASE_KEY,
    'Content-Type': 'application/json',
    'Prefer': 'resolution=merge-duplicates'
  };
}

async function upsertRows(table, rows) {
  if (!rows || rows.length === 0) return { ok: true, count: 0 };
  // Batch in chunks of 500
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: supabaseHeaders(),
      body: JSON.stringify(chunk)
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`${table}: ${res.status} ${text}`);
    }
  }
  return { ok: true, count: rows.length };
}

function safeLoad(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}

/* ── Data Mappers ── */

function mapCheckins(entries) {
  return entries.map(e => ({
    id: e.id,
    ts: e.ts,
    scores: e.scores || null,
    notes: e.notes || null
  }));
}

function mapTimeEntries(entries) {
  return entries.map(e => ({
    id: e.id,
    activity_id: e.activityId || null,
    start_time: e.startTime || null,
    end_time: e.endTime || null,
    sub_activity: e.subActivity || null,
    notes: e.notes || null
  }));
}

function mapActivities(entries) {
  return entries.map(e => ({
    id: e.id,
    name: e.name || null,
    emoji: e.emoji || null,
    category: e.category || null
  }));
}

function mapFoodEntries(entries) {
  return entries.map(e => ({
    id: e.id,
    ts: e.timestamp || null,
    description: e.description || null,
    category: e.category || null,
    photo: e.photo || null
  }));
}

function mapMedicationLogs(entries) {
  return entries.map(e => ({
    id: e.id,
    medication_id: e.medicationId || null,
    medication_name: e.medicationName || null,
    ts: e.timestamp || null
  }));
}

function mapStoolEntries(entries) {
  return entries.map(e => ({
    id: e.id,
    ts: e.timestamp || null,
    data: e
  }));
}

/* ── Sync Status UI ── */

function updateSyncStatus(status, icon) {
  _syncState.status = status;
  const el = document.getElementById('sync-status');
  if (el) {
    const icons = { syncing: '🔄', synced: '✅', error: '⚠️', idle: '☁️' };
    el.textContent = (icons[icon] || icon || '') + ' ' + status;
  }
  // Update cloud sync section if it exists
  const lastEl = document.getElementById('sync-last-time');
  if (lastEl && _syncState.lastSync) {
    lastEl.textContent = new Date(_syncState.lastSync).toLocaleString();
  }
}

/* ── Reverse Mappers (Supabase → localStorage) ── */

function unmapCheckins(rows) {
  return rows.map(r => ({
    id: r.id,
    ts: r.ts,
    scores: r.scores || {},
    notes: r.notes || {}
  }));
}

function unmapTimeEntries(rows) {
  return rows.map(r => ({
    id: r.id,
    activityId: r.activity_id || null,
    startTime: r.start_time || null,
    endTime: r.end_time || null,
    subActivity: r.sub_activity || null,
    notes: r.notes || null
  }));
}

function unmapActivities(rows) {
  return rows.map(r => ({
    id: r.id,
    name: r.name || null,
    emoji: r.emoji || null,
    category: r.category || null
  }));
}

function unmapFoodEntries(rows) {
  return rows.map(r => ({
    id: r.id,
    timestamp: r.ts || null,
    description: r.description || null,
    category: r.category || null,
    photo: r.photo || null
  }));
}

function unmapMedicationLogs(rows) {
  return rows.map(r => ({
    id: r.id,
    medicationId: r.medication_id || null,
    medicationName: r.medication_name || null,
    timestamp: r.ts || null
  }));
}

function unmapStoolEntries(rows) {
  return rows.map(r => {
    if (r.data && typeof r.data === 'object') {
      // stool entries store full object in data column
      return { ...r.data, id: r.id, timestamp: r.ts || r.data.timestamp };
    }
    return { id: r.id, timestamp: r.ts };
  });
}

/* ── Pull from Supabase ── */

async function fetchAllRows(table) {
  const rows = [];
  let offset = 0;
  const limit = 1000;
  while (true) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/${table}?select=*&order=created_at.asc&offset=${offset}&limit=${limit}`,
      { headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY } }
    );
    if (!res.ok) throw new Error(`Pull ${table}: ${res.status}`);
    const chunk = await res.json();
    rows.push(...chunk);
    if (chunk.length < limit) break;
    offset += limit;
  }
  return rows;
}

function mergeById(local, remote) {
  const map = new Map();
  // Local first, then remote overwrites if same id — but we prefer keeping both,
  // so we just union by id (remote fills gaps, local stays)
  local.forEach(e => map.set(e.id, e));
  remote.forEach(e => { if (!map.has(e.id)) map.set(e.id, e); });
  return Array.from(map.values());
}

async function pullFromSupabase() {
  if (!navigator.onLine) return;
  updateSyncStatus('Pulling...', 'syncing');

  try {
    const [cRows, tRows, aRows, fRows, mRows, sRows] = await Promise.all([
      fetchAllRows('checkins'),
      fetchAllRows('time_entries'),
      fetchAllRows('activities'),
      fetchAllRows('food_entries'),
      fetchAllRows('medication_logs'),
      fetchAllRows('stool_entries')
    ]);

    const merges = [
      { key: 'innerscape_entries', remote: unmapCheckins(cRows) },
      { key: 'innerscape_time_entries', remote: unmapTimeEntries(tRows) },
      { key: 'innerscape_activities', remote: unmapActivities(aRows) },
      { key: 'innerscape_food_entries', remote: unmapFoodEntries(fRows) },
      { key: 'innerscape_medication_logs', remote: unmapMedicationLogs(mRows) },
      { key: 'innerscape_stool_entries', remote: unmapStoolEntries(sRows) }
    ];

    let pulled = 0;
    merges.forEach(({ key, remote }) => {
      if (remote.length === 0) return;
      const local = safeLoad(key);
      const merged = mergeById(local, remote);
      const added = merged.length - local.length;
      if (added > 0) pulled += added;
      localStorage.setItem(key, JSON.stringify(merged));
    });

    console.log(`Pull complete: ${pulled} new entries from cloud`);
    return pulled;
  } catch (err) {
    console.error('Pull error:', err);
    _syncState.error = err.message;
    updateSyncStatus('Pull error', 'error');
    return 0;
  }
}

/* ── Full Two-Way Sync ── */

async function fullSync(force) {
  if (_syncState.status === 'syncing') return;
  _syncState.status = 'syncing';
  updateSyncStatus('Syncing...', 'syncing');

  try {
    // 1. Pull remote → merge into local
    const pulled = await pullFromSupabase();
    // 2. Push local → remote
    await syncToSupabase(force, true);

    if (pulled > 0) {
      updateSyncStatus(`Synced (+${pulled} from cloud)`, 'synced');
    }
  } catch (err) {
    console.error('Full sync error:', err);
    _syncState.error = err.message;
    updateSyncStatus('Sync error', 'error');
  }
}

/* ── Core Sync (Push) ── */

async function syncToSupabase(force, _skipStatusGuard) {
  if (!_skipStatusGuard && _syncState.status === 'syncing') return;
  if (!navigator.onLine) { updateSyncStatus('Offline', '🔴'); return; }

  if (!_skipStatusGuard) {
    _syncState.status = 'syncing';
    updateSyncStatus('Syncing...', 'syncing');
  }

  const lastSync = force ? 0 : parseInt(localStorage.getItem(SYNC_TS_KEY) || '0');

  try {
    const checkins = safeLoad('innerscape_entries');
    const timeEntries = safeLoad('innerscape_time_entries');
    const activities = safeLoad('innerscape_activities');
    const food = safeLoad('innerscape_food_entries');
    const medLogs = safeLoad('innerscape_medication_logs');
    const stool = safeLoad('innerscape_stool_entries');

    // Filter by timestamp if not force
    const filterNew = (arr, tsField) => {
      if (force || !lastSync) return arr;
      return arr.filter(e => {
        const t = e[tsField] || e.ts || e.timestamp || 0;
        return t > lastSync;
      });
    };

    const results = await Promise.allSettled([
      upsertRows('checkins', mapCheckins(filterNew(checkins, 'ts'))),
      upsertRows('time_entries', mapTimeEntries(filterNew(timeEntries, 'startTime'))),
      upsertRows('activities', mapActivities(activities)), // always sync all (small dataset)
      upsertRows('food_entries', mapFoodEntries(filterNew(food, 'timestamp'))),
      upsertRows('medication_logs', mapMedicationLogs(filterNew(medLogs, 'timestamp'))),
      upsertRows('stool_entries', mapStoolEntries(filterNew(stool, 'timestamp')))
    ]);

    const failed = results.filter(r => r.status === 'rejected');
    if (failed.length > 0) {
      console.warn('Sync partial failures:', failed.map(f => f.reason?.message));
      _syncState.error = failed[0].reason?.message;
      updateSyncStatus('Partial sync', 'error');
    } else {
      const now = Date.now();
      localStorage.setItem(SYNC_TS_KEY, String(now));
      _syncState.lastSync = now;
      _syncState.error = null;
      updateSyncStatus('Synced', 'synced');
    }
  } catch (err) {
    console.error('Sync error:', err);
    _syncState.error = err.message;
    updateSyncStatus('Sync error', 'error');
  }
}

async function forceSyncAll() {
  localStorage.removeItem(SYNC_TS_KEY);
  return fullSync(true);
}

/* ── Cloud Sync UI Section ── */

function renderCloudSyncSection() {
  const container = document.getElementById('cloud-sync-section');
  if (!container) return;

  const lastSync = localStorage.getItem(SYNC_TS_KEY);
  const counts = {
    checkins: safeLoad('innerscape_entries').length,
    time_entries: safeLoad('innerscape_time_entries').length,
    activities: safeLoad('innerscape_activities').length,
    food_entries: safeLoad('innerscape_food_entries').length,
    medication_logs: safeLoad('innerscape_medication_logs').length,
    stool_entries: safeLoad('innerscape_stool_entries').length
  };

  container.innerHTML = `
    <div style="padding:16px;background:rgba(167,139,250,0.08);border-radius:16px;margin-top:12px;">
      <h3 style="margin:0 0 12px;color:#a78bfa;">☁️ Cloud Sync</h3>
      <p style="margin:4px 0;opacity:0.7;">Status: <span id="sync-section-status">${_syncState.error ? '⚠️ ' + _syncState.error : (_syncState.lastSync ? '✅ Synced' : '⏳ Not synced yet')}</span></p>
      <p style="margin:4px 0;opacity:0.7;">Last sync: <span id="sync-last-time">${lastSync ? new Date(parseInt(lastSync)).toLocaleString() : 'Never'}</span></p>
      <div style="margin:12px 0;font-size:0.85em;opacity:0.6;">
        📊 Checkins: ${counts.checkins} · ⏱ Time: ${counts.time_entries} · 🎯 Activities: ${counts.activities}<br>
        🍽 Food: ${counts.food_entries} · 💊 Meds: ${counts.medication_logs} · 🚽 Stool: ${counts.stool_entries}
      </div>
      <div style="display:flex;gap:8px;margin-top:12px;">
        <button onclick="syncToSupabase()" style="flex:1;padding:10px;border-radius:10px;border:1px solid rgba(167,139,250,0.3);background:rgba(167,139,250,0.15);color:#a78bfa;font-size:0.9em;cursor:pointer;">🔄 Sync Now</button>
        <button onclick="forceSyncAll()" style="flex:1;padding:10px;border-radius:10px;border:1px solid rgba(167,139,250,0.3);background:rgba(167,139,250,0.15);color:#a78bfa;font-size:0.9em;cursor:pointer;">🔁 Full Re-sync</button>
      </div>
    </div>
  `;
}

/* ── Init ── */

function initSync() {
  // Initial two-way sync after short delay (pull then push)
  setTimeout(() => fullSync(), 2000);

  // Periodic two-way sync every 5 minutes
  setInterval(() => fullSync(), 5 * 60 * 1000);

  // Two-way sync on visibility change (user comes back to tab/app)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      setTimeout(() => fullSync(), 1000);
    }
  });

  // Online/offline
  window.addEventListener('online', () => updateSyncStatus('Online', '☁️'));
  window.addEventListener('offline', () => updateSyncStatus('Offline', '🔴'));

  // Render cloud sync section periodically (avoids MutationObserver infinite loop)
  setInterval(() => renderCloudSyncSection(), 3000);

  updateSyncStatus(navigator.onLine ? 'Ready' : 'Offline', navigator.onLine ? '☁️' : '🔴');
}

// Expose on window
window.syncToSupabase = syncToSupabase;
window.forceSyncAll = forceSyncAll;
window.fullSync = fullSync;
window.pullFromSupabase = pullFromSupabase;
window.initSync = initSync;
window.renderCloudSyncSection = renderCloudSyncSection;

// Auto-init (wrapped for safety)
try {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { try { initSync(); } catch(e) { console.error('Sync init error:', e); } });
  } else {
    initSync();
  }
} catch(e) { console.error('Sync init error:', e); }
