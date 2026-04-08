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

/* ── Core Sync ── */

async function syncToSupabase(force) {
  if (_syncState.status === 'syncing') return;
  if (!navigator.onLine) { updateSyncStatus('Offline', '🔴'); return; }

  _syncState.status = 'syncing';
  updateSyncStatus('Syncing...', 'syncing');

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
  return syncToSupabase(true);
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
  // Initial sync after short delay
  setTimeout(() => syncToSupabase(), 2000);

  // Periodic sync every 5 minutes
  setInterval(() => syncToSupabase(), 5 * 60 * 1000);

  // Sync on visibility change (user comes back to tab)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      setTimeout(() => syncToSupabase(), 1000);
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
window.initSync = initSync;
window.renderCloudSyncSection = renderCloudSyncSection;

// Auto-init
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSync);
} else {
  initSync();
}
