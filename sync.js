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

// Track deleted IDs so pull doesn't resurrect them — persisted to localStorage
// Format: [{id, table}]
const _deletedIdsMap = (() => { try { return JSON.parse(localStorage.getItem('innerscape_deleted_sync') || '[]'); } catch { return []; } })();
const _deletedIds = new Set(_deletedIdsMap.map(d => typeof d === 'string' ? d : d.id));

function _trackDeletion(table, id) {
  _deletedIds.add(id);
  _deletedIdsMap.push({ id, table });
  try { localStorage.setItem('innerscape_deleted_sync', JSON.stringify(_deletedIdsMap.slice(-200))); } catch {}
}

async function deleteFromSupabase(table, id) {
  if (!id) return;
  _trackDeletion(table, id);
  if (!navigator.onLine) return;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Content-Type': 'application/json'
      }
    });
    console.log(`deleteFromSupabase(${table}, ${id}):`, res.status);
    if (!res.ok) console.warn(`Delete from ${table} failed:`, res.status, await res.text());
  } catch (e) { console.warn('Supabase delete error:', e); }
}
window.deleteFromSupabase = deleteFromSupabase;
window._deletedIds = _deletedIds;
window._deletedIdsMap = _deletedIdsMap;

// Replace entire table contents — delete all then insert (for small local-authoritative tables)
async function replaceTable(table, rows) {
  if (!rows || rows.length === 0) {
    // Delete all from table
    await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=neq.___impossible___`, {
      method: 'DELETE',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
    }).catch(() => {});
    return { ok: true, count: 0 };
  }
  // Delete all existing rows
  await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=neq.___impossible___`, {
    method: 'DELETE',
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
  }).catch(() => {});
  // Insert current local data
  return upsertRows(table, rows);
}

async function upsertRows(table, rows) {
  if (!rows || rows.length === 0) return { ok: true, count: 0 };
  // Deduplicate by ID — Supabase can't upsert same row twice in one batch
  const seen = new Set();
  rows = rows.filter(r => { if (!r.id || seen.has(r.id)) return false; seen.add(r.id); return true; });
  if (rows.length === 0) return { ok: true, count: 0 };
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
    id: e.id || ('ci-' + (e.ts || Date.now())),
    ts: e.ts,
    scores: e.scores || null,
    notes: e.notes || null
  }));
}

function mapTimeEntries(entries) {
  return entries.filter(e => e.id).map(e => ({
    id: e.id,
    activity_id: e.activityId || null,
    start_time: e.startTime || null,
    end_time: e.endTime || null,
    sub_activity: e.subActivityName || e.subActivityId || e.subActivity || null,
    notes: e.notes || e.note || null
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
  return entries.filter(e => e.id).map(e => ({
    id: e.id,
    ts: e.timestamp || null,
    description: e.description || null,
    category: e.category || null,
    photo: e.photo || null
  }));
}

function mapMedicationLogs(entries) {
  return entries.filter(e => e.id).map(e => ({
    id: e.id,
    medication_id: e.medicationId || null,
    medication_name: e.medicationName || null,
    ts: e.timestamp || null
  }));
}

function mapStoolEntries(entries) {
  return entries.filter(e => e.id).map(e => ({
    id: e.id,
    ts: e.timestamp || null,
    data: e
  }));
}

/* ── New Data Mappers (12 tables) ── */

function mapQuickNotes(entries) {
  return entries.filter(e => e && e.id).map(e => ({
    id: e.id, ts: e.ts || null, text: e.text || null
  }));
}

function mapIntentions(entries) {
  return entries.filter(e => e && e.id).map(e => ({
    id: e.id, type: e.type || null, period: e.period || null,
    text: e.text || null, created_at: e.createdAt || null, updated_at: e.updatedAt || null
  }));
}

function mapDreams(entries) {
  return entries.map(e => ({ ...e, id: e.id || ('dream-' + (e.ts || e.timestamp || Date.now())) }))
    .filter(e => e && e.id).map(e => ({
      id: e.id, ts: e.ts || null, text: e.text || null,
      tags: e.tags || null, has_audio: e.hasAudio || false, no_recall: e.noRecall || false
    }));
}

function mapJsonbTable(entries, idPrefix) {
  return entries.map((e, i) => ({ ...e, id: e.id || (idPrefix + '-' + (e.startTime || e.ts || i)) }))
    .filter(e => e && e.id).map(e => {
      const { id, ...rest } = e;
      return { id, data: rest };
    });
}

function mapOuraData(obj) {
  if (!obj || typeof obj !== 'object') return [];
  return Object.keys(obj).map(key => ({ id: key, data: obj[key] }));
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
    subActivityName: r.sub_activity || null,
    subActivityId: r.sub_activity || null,
    note: r.notes || null
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
      return { ...r.data, id: r.id, timestamp: r.ts || r.data.timestamp };
    }
    return { id: r.id, timestamp: r.ts };
  });
}

/* ── New Reverse Mappers ── */

function unmapQuickNotes(rows) {
  return rows.map(r => ({ id: r.id, ts: r.ts, text: r.text }));
}

function unmapIntentions(rows) {
  return rows.map(r => ({
    id: r.id, type: r.type, period: r.period, text: r.text,
    createdAt: r.created_at, updatedAt: r.updated_at
  }));
}

function unmapDreams(rows) {
  return rows.map(r => ({
    id: r.id, ts: r.ts, text: r.text, tags: r.tags,
    hasAudio: r.has_audio, noRecall: r.no_recall
  }));
}

function unmapJsonbTable(rows) {
  return rows.map(r => ({ ...(r.data || {}), id: r.id }));
}

function unmapOuraData(rows) {
  const obj = {};
  rows.forEach(r => { obj[r.id] = r.data; });
  return obj;
}

/* ── Pull from Supabase ── */

// Tables with timestamp columns that can be filtered for recent-only pulls
const RECENT_PULL_TABLES = {
  'checkins': 'ts',
  'time_entries': 'start_time',
  'food_entries': 'created_at',
  'medication_logs': 'created_at',
  'stool_entries': 'created_at',
  'quick_notes': 'ts',
  'dreams': 'ts',
  'media_sessions': 'created_at'
};

async function fetchAllRows(table, recentOnly) {
  const rows = [];
  let offset = 0;
  const limit = 1000;
  
  // For large tables, only pull last 90 days to avoid filling localStorage
  let dateFilter = '';
  if (recentOnly && RECENT_PULL_TABLES[table]) {
    const col = RECENT_PULL_TABLES[table];
    // Match trim window — pull only what localStorage will keep
    const pullDays = 30; // Conservative: only pull recent month
    const cutoff = Date.now() - (pullDays * 24 * 60 * 60 * 1000);
    // ts columns are bigint (ms), created_at columns are ISO timestamp
    if (col === 'ts' || col === 'start_time') {
      dateFilter = `&${col}=gte.${cutoff}`;
    } else {
      dateFilter = `&${col}=gte.${new Date(cutoff).toISOString()}`;
    }
  }
  
  while (true) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/${table}?select=*&order=created_at.asc${dateFilter}&offset=${offset}&limit=${limit}`,
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
  // Filter out recently deleted items from remote
  remote = remote.filter(e => !_deletedIds.has(e.id));
  const map = new Map();
  const tsByTs = new Map(); // track by timestamp for dedup across ID formats
  // Local first
  local.forEach(e => {
    map.set(e.id, e);
    if (e.ts) tsByTs.set(String(e.ts), e);
  });
  // Remote: add missing entries, and for existing ones merge fields
  // (remote may have notes/scores that local lost during restore)
  remote.forEach(e => {
    // Check for same-timestamp duplicate with different ID (entry-{ts} vs ci-{ts})
    const tsKey = e.ts ? String(e.ts) : null;
    const tsMatch = tsKey ? tsByTs.get(tsKey) : null;
    const existing = map.get(e.id) || (tsMatch && tsMatch.id !== e.id ? tsMatch : null);
    
    if (!existing) {
      map.set(e.id, e);
      if (tsKey) tsByTs.set(tsKey, e);
    } else {
      // Merge: fill in any missing fields from remote (prefer richer data)
      for (const key of Object.keys(e)) {
        if (existing[key] === undefined || existing[key] === null ||
            (typeof existing[key] === 'object' && Object.keys(existing[key]).length === 0 && 
             typeof e[key] === 'object' && Object.keys(e[key]).length > 0)) {
          existing[key] = e[key];
        }
      }
      // If matched by timestamp (different IDs), remove the duplicate entry
      if (tsMatch && tsMatch.id !== e.id && map.has(tsMatch.id) && map.has(e.id)) {
        // Keep the ci- prefixed one, remove the entry- one
        if (tsMatch.id.startsWith('entry-') && e.id.startsWith('ci-')) {
          map.delete(tsMatch.id);
          map.set(e.id, existing); // existing already has merged data
        } else if (e.id.startsWith('entry-') && tsMatch.id.startsWith('ci-')) {
          // remote is entry-, local is ci- — just skip, local is better ID
        }
      }
    }
  });
  return Array.from(map.values());
}

async function pullFromSupabase() {
  if (!navigator.onLine) return;
  updateSyncStatus('Pulling...', 'syncing');

  try {
    const recent = true; // Only pull last 90 days for large tables
    const [cRows, tRows, aRows, fRows, mRows, sRows,
           qnRows, intRows, drRows, todoRows, wishRows, medRows, meditRows, fpRows, mqRows, msRows, miRows, ouraRows] = await Promise.all([
      fetchAllRows('checkins', recent),
      fetchAllRows('time_entries', recent),
      fetchAllRows('activities'),       // small, always pull all
      fetchAllRows('food_entries', recent),
      fetchAllRows('medication_logs', recent),
      fetchAllRows('stool_entries', recent),
      fetchAllRows('quick_notes', recent),
      fetchAllRows('intentions'),       // small
      fetchAllRows('dreams', recent),
      fetchAllRows('todos'),            // small
      fetchAllRows('wishes'),           // small
      fetchAllRows('medications'),      // small
      fetchAllRows('meditations'),      // small
      fetchAllRows('food_presets'),     // small
      fetchAllRows('media_queue'),     // small
      fetchAllRows('media_sessions', recent),
      fetchAllRows('media_impulse'),   // small
      fetchAllRows('oura_data')        // small (summary)
    ]);

    const merges = [
      { key: 'innerscape_entries', remote: unmapCheckins(cRows) },
      { key: 'innerscape_time_entries', remote: unmapTimeEntries(tRows) },
      { key: 'innerscape_activities', remote: unmapActivities(aRows) },
      { key: 'innerscape_food_entries', remote: unmapFoodEntries(fRows) },
      { key: 'innerscape_medication_logs', remote: unmapMedicationLogs(mRows) },
      { key: 'innerscape_stool_entries', remote: unmapStoolEntries(sRows) },
      { key: 'innerscape_quick_notes', remote: unmapQuickNotes(qnRows) },
      { key: 'innerscape_intentions', remote: unmapIntentions(intRows) },
      { key: 'innerscape_dreams', remote: unmapDreams(drRows) },
      { key: 'innerscape_todos', remote: unmapJsonbTable(todoRows) },
      { key: 'innerscape_wishes', remote: unmapJsonbTable(wishRows) },
      { key: 'innerscape_medications', remote: unmapJsonbTable(medRows) },
      { key: 'innerscape_meditations', remote: unmapJsonbTable(meditRows) },
      // food_presets handled separately (object, not array)

      { key: 'innerscape_media_queue', remote: unmapJsonbTable(mqRows) },
      { key: 'innerscape_media_sessions', remote: unmapJsonbTable(msRows) },
      { key: 'innerscape_media_impulse', remote: unmapJsonbTable(miRows) }
    ];

    let pulled = 0;
    for (const { key, remote } of merges) {
      if (remote.length === 0) continue;
      const local = safeLoad(key);
      const merged = mergeById(local, remote);
      const added = merged.length - local.length;
      if (added > 0) pulled += added;
      if (!safeSave(key, merged)) {
        // localStorage full — save to IndexedDB instead, keep localStorage version as-is
        try { await idbSet(key, merged); console.log(`${key}: saved to IDB (localStorage full)`); }
        catch(e) { console.warn(`${key}: IDB save also failed`, e); }
      }
    }

    // Food presets: special merge (object, not array)
    if (fpRows.length > 0) {
      const remoteFp = fpRows.find(r => r.id === 'food_presets');
      if (remoteFp && remoteFp.data) {
        const localFp = (() => { try { return JSON.parse(localStorage.getItem('innerscape_food_presets') || 'null'); } catch { return null; } })();
        if (!localFp) {
          localStorage.setItem('innerscape_food_presets', JSON.stringify(remoteFp.data));
          pulled++;
        }
      }
    }

    // Oura data: special merge (dict, not array)
    if (ouraRows.length > 0) {
      const localOura = (() => { try { return JSON.parse(localStorage.getItem('innerscape_oura_data') || '{}'); } catch { return {}; } })();
      const remoteOura = unmapOuraData(ouraRows);
      Object.keys(remoteOura).forEach(k => {
        if (!localOura[k] || (Array.isArray(remoteOura[k]) && remoteOura[k].length > (localOura[k]?.length || 0))) {
          localOura[k] = remoteOura[k];
        }
      });
      localStorage.setItem('innerscape_oura_data', JSON.stringify(localOura));
    }

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
    // 0. Re-delete any tracked deletions from Supabase (in case prior deletes failed)
    if (_deletedIdsMap.length > 0) {
      await Promise.allSettled(_deletedIdsMap.map(d => {
        const t = d.table || 'todos';
        return fetch(`${SUPABASE_URL}/rest/v1/${t}?id=eq.${encodeURIComponent(d.id || d)}`, {
          method: 'DELETE',
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
        }).catch(() => {});
      }));
    }
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
      upsertRows('stool_entries', mapStoolEntries(filterNew(stool, 'timestamp'))),
      // 12 new tables
      upsertRows('quick_notes', mapQuickNotes(filterNew(safeLoad('innerscape_quick_notes'), 'ts'))),
      upsertRows('intentions', mapIntentions(safeLoad('innerscape_intentions'))),
      upsertRows('dreams', mapDreams(filterNew(safeLoad('innerscape_dreams'), 'ts'))),
      upsertRows('todos', mapJsonbTable(safeLoad('innerscape_todos'), 'todo')),
      upsertRows('wishes', mapJsonbTable(safeLoad('innerscape_wishes'), 'wish')),
      upsertRows('medications', mapJsonbTable(safeLoad('innerscape_medications'), 'med')),
      upsertRows('meditations', mapJsonbTable(safeLoad('innerscape_meditations'), 'med')),
      upsertRows('food_presets', (() => { try { const fp = JSON.parse(localStorage.getItem('innerscape_food_presets') || 'null'); return fp ? [{ id: 'food_presets', data: fp }] : []; } catch { return []; } })()),
      upsertRows('media_queue', mapJsonbTable(safeLoad('innerscape_media_queue'), 'mq')),
      upsertRows('media_sessions', mapJsonbTable(safeLoad('innerscape_media_sessions'), 'ms')),
      upsertRows('media_impulse', mapJsonbTable(safeLoad('innerscape_media_impulse'), 'mi')),
      upsertRows('oura_data', mapOuraData((() => { try { return JSON.parse(localStorage.getItem('innerscape_oura_data') || '{}'); } catch { return {}; } })()))
    ]);

    const failed = results.filter(r => r.status === 'rejected');
    const now = Date.now();
    localStorage.setItem(SYNC_TS_KEY, String(now));
    _syncState.lastSync = now;
    if (failed.length > 0) {
      console.warn('Sync partial failures:', failed.map(f => f.reason?.message));
      _syncState.error = failed[0].reason?.message;
      updateSyncStatus('Partial sync ⚠️', 'error');
    } else {
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
  // Don't remove timestamp before sync — let fullSync handle it
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
      ${(() => {
        let totalBytes = 0;
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          totalBytes += (localStorage.getItem(k) || '').length * 2;
        }
        const mb = (totalBytes / 1024 / 1024).toFixed(1);
        const pct = Math.min(100, (totalBytes / (5 * 1024 * 1024) * 100)).toFixed(0);
        const color = pct > 80 ? '#f87171' : pct > 60 ? '#fbbf24' : '#a78bfa';
        return `<div style="margin:8px 0;">
          <div style="display:flex;justify-content:space-between;font-size:0.8em;opacity:0.6;margin-bottom:4px;">
            <span>📦 Storage: ${mb}MB / ~5MB</span><span>${pct}%</span>
          </div>
          <div style="height:6px;background:rgba(255,255,255,0.1);border-radius:3px;overflow:hidden;">
            <div style="height:100%;width:${pct}%;background:${color};border-radius:3px;"></div>
          </div>
        </div>`;
      })()}
      <div style="display:flex;gap:8px;margin-top:12px;">
        <button onclick="syncToSupabase()" style="flex:1;padding:10px;border-radius:10px;border:1px solid rgba(167,139,250,0.3);background:rgba(167,139,250,0.15);color:#a78bfa;font-size:0.9em;cursor:pointer;">🔄 Sync Now</button>
        <button onclick="forceSyncAll()" style="flex:1;padding:10px;border-radius:10px;border:1px solid rgba(167,139,250,0.3);background:rgba(167,139,250,0.15);color:#a78bfa;font-size:0.9em;cursor:pointer;">🔁 Full Re-sync</button>
      </div>
    </div>
  `;
}

/* ── Init ── */

function initSync() {
  // Initial two-way sync — wait for trim to finish first
  (async () => {
    if (typeof trimLocalStorage === 'function') {
      try { await trimLocalStorage(); } catch(e) { console.warn('Pre-sync trim failed:', e); }
    }
    fullSync();
  })();

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
window.upsertRows = upsertRows;
window.mapJsonbTable = mapJsonbTable;
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
