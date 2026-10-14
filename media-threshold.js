/* ── Media · Threshold ──
   The automatic side of Media: sessions logged by the iPhone Shortcuts gate and the
   Mac extension (Supabase schema `brainrot`). Reading them needs the tracker key,
   which lives only in this device's localStorage — never in this public repo. */

const THR_KEY_STORAGE = 'innerscape_tracker_key';
const THR_SOURCES = [
  { key: 'mac:youtube', label: 'YouTube · Mac', color: '#b8862c' },
  { key: 'iphone:youtube', label: 'YouTube · iPhone', color: '#8b7cf0' },
  { key: 'iphone:instagram', label: 'Instagram · iPhone', color: '#2f9e86' },
];
const THR_PURPOSES = {
  specific: 'A specific thing', learning: 'Learning', music: 'Music · background', social: 'Friends · messages',
  inspiration: 'Inspiration', break: 'A real break', autopilot: 'Bored · autopilot', post: 'Post something', other: 'Other',
};
const THR_OUTCOME = { yes: 'got it', partly: 'partly', no: 'didn’t get it' };

let thrSessions = null;
let thrError = '';
let thrLoading = false;

function thrKey() {
  try { return localStorage.getItem(THR_KEY_STORAGE) || ''; } catch { return ''; }
}

async function thrRpc(fn, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(res.status === 403 ? 'That tracker key wasn’t accepted.' : `Couldn’t load sessions (${res.status}).`);
  return res.json();
}

function thrEsc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function thrFmt(sec) {
  const m = Math.round(sec / 60);
  if (m < 1) return sec > 0 ? '<1 min' : '0 min';
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`;
}

function thrSource(s) {
  return THR_SOURCES.find((x) => x.key === `${s.device}:${s.app}`) || THR_SOURCES[0];
}

function thrPurposeLabel(s) {
  const base = THR_PURPOSES[s.purpose] || s.purpose_label || 'No reason given';
  return s.note && s.device === 'mac' ? `${base}: ${s.note}` : base;
}

async function thrLoad() {
  if (thrLoading) return;
  thrLoading = true;
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  try {
    thrSessions = (await thrRpc('brainrot_sessions', { k: thrKey(), since: since.toISOString() }))
      .filter((s) => !s.incomplete)
      .map((s) => ({ ...s, start: new Date(s.started_at) }));
    thrError = '';
  } catch (e) {
    thrError = e.message;
  }
  thrLoading = false;
  if (mediaView === 'threshold') renderMedia();
}

/* ── Rendering ── */

function renderThreshold() {
  if (!thrKey()) return thrSetupTemplate();
  if (thrSessions === null) {
    thrLoad();
    return `<div class="thr-page"><div class="thr-empty">${thrError ? thrEsc(thrError) : 'Opening the gate…'}</div></div>`;
  }
  return thrTodayTemplate(thrSessions);
}

function thrSetupTemplate() {
  return `
    <div class="thr-page">
      <div class="thr-card thr-setup">
        <span class="thr-eyebrow">CONNECT THE GATE</span>
        <h2>Paste your tracker key</h2>
        <p>Your iPhone gate and Mac extension already record sessions. Innerscape needs the tracker key once on this device to read them. It stays on this device only.</p>
        <input id="thr-key-input" type="password" autocomplete="off" spellcheck="false" placeholder="Tracker key">
        <button type="button" class="thr-primary" id="thr-key-save">Connect</button>
        ${thrError ? `<p class="thr-error">${thrEsc(thrError)}</p>` : ''}
      </div>
    </div>`;
}

function thrTodayTemplate(all) {
  const visits = all.filter((s) => !s.turned_back);
  const catches = all.filter((s) => s.turned_back);
  const total = visits.reduce((a, s) => a + s.sec, 0);
  const auto = visits.filter((s) => s.purpose === 'autopilot').reduce((a, s) => a + s.sec, 0);
  const autoPct = total ? Math.round((auto / total) * 100) : 0;
  const rated = visits.filter((s) => s.outcome);
  const longest = visits.reduce((m, s) => Math.max(m, s.sec), 0);
  const mood = !visits.length || autoPct < 20 ? 'clear' : autoPct < 50 ? 'mixed' : 'fogged';
  const status = { clear: 'THE GATE IS CLEAR', mixed: 'MIST IS GATHERING', fogged: 'THE PATH IS FOGGED' }[mood];
  const dateLabel = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase();

  return `
    <div class="thr-page">
      <section class="thr-hero" data-mood="${mood}">
        <img src="assets/threshold.jpg" alt="">
        <div class="thr-glow"></div>
        <div class="thr-lantern"></div>
        <div class="thr-mist"></div>
        <div class="thr-mist thr-mist-b"></div>
        <div class="thr-fade"></div>
        <div class="thr-hero-text">
          <span class="thr-eyebrow">${thrEsc(dateLabel)}</span>
          <div class="thr-total"><b>${visits.length ? thrFmt(total) : '0 min'}</b><span>${visits.length} session${visits.length === 1 ? '' : 's'}${catches.length ? ` · ${catches.length} turned back` : ''}</span></div>
          <div class="thr-status-row">
            <span class="thr-status">${status}</span>
            ${visits.length ? `<span class="thr-status-note">mist = autopilot time, ${autoPct}%</span>` : ''}
          </div>
        </div>
      </section>

      ${visits.length || catches.length ? `
      <div class="thr-tiles">
        <div class="thr-tile"><span>On purpose</span><b>${visits.length ? 100 - autoPct + '%' : '–'}</b><small>of your time</small></div>
        <div class="thr-tile"><span>Got it</span><b>${rated.length ? `${rated.filter((s) => s.outcome === 'yes').length} of ${rated.length}` : '–'}</b><small>rated sessions</small></div>
        <div class="thr-tile"><span>Longest</span><b>${visits.length ? thrFmt(longest) : '–'}</b><small>one session</small></div>
      </div>

      ${thrWhereTemplate(visits)}
      ${thrPathTemplate(all)}
      ${thrWhyTemplate(visits)}
      ${thrLatestTemplate(all)}
      ` : `<div class="thr-card thr-quiet">No visits yet today. The gate is quiet.</div>`}

      <div class="thr-foot">
        <button type="button" class="thr-link" id="thr-refresh">Refresh</button>
        <button type="button" class="thr-link" id="thr-forget">Disconnect this device</button>
      </div>
    </div>`;
}

function thrWhereTemplate(visits) {
  const per = THR_SOURCES.map((src) => ({ ...src, sec: visits.filter((s) => thrSource(s) === src).reduce((a, s) => a + s.sec, 0) }));
  const max = Math.max(1, ...per.map((p) => p.sec));
  return `
    <section class="thr-card">
      <h3 class="thr-title">WHERE IT WENT</h3>
      ${per.map((p) => `
        <div class="thr-bar-row">
          <div class="thr-bar-label"><span><i style="background:${p.color}"></i>${p.label}</span><b>${thrFmt(p.sec)}</b></div>
          <div class="thr-bar" style="width:${p.sec ? Math.max(2, (p.sec / max) * 100) : 0}%;background:${p.color}"></div>
        </div>`).join('')}
    </section>`;
}

function thrPathTemplate(all) {
  const lanes = { 'mac:youtube': 0, 'iphone:youtube': 1, 'iphone:instagram': 2 };
  const blocks = all.map((s) => {
    const src = thrSource(s);
    const startMin = s.start.getHours() * 60 + s.start.getMinutes();
    const mins = s.turned_back ? 0 : s.sec / 60;
    const tip = `${s.start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} · ${src.label} · ${s.turned_back ? 'turned back' : thrFmt(s.sec)}`;
    return `<div class="thr-block${s.turned_back ? ' is-catch' : ''}" title="${thrEsc(tip)}" style="left:${(startMin / 1440) * 100}%;width:${s.turned_back ? 0 : Math.max(0.8, (mins / 1440) * 100)}%;top:${lanes[src.key] * 26 + 4}px;--c:${src.color}"></div>`;
  }).join('');
  return `
    <section class="thr-card">
      <div class="thr-head"><h3 class="thr-title">TODAY’S PATH</h3><span>when you opened what</span></div>
      <div class="thr-path">
        <div class="thr-lane" style="top:13px"></div><div class="thr-lane" style="top:39px"></div><div class="thr-lane" style="top:65px"></div>
        ${blocks}
      </div>
      <div class="thr-axis"><span>00</span><span>06</span><span>12</span><span>18</span><span>24</span></div>
      <div class="thr-legend">
        ${THR_SOURCES.map((s) => `<span><i style="background:${s.color}"></i>${s.label}</span>`).join('')}
        <span><i class="thr-catch-key"></i>Turned back</span>
      </div>
    </section>`;
}

function thrWhyTemplate(visits) {
  const groups = {};
  visits.forEach((s) => {
    const id = s.purpose || 'none';
    (groups[id] ||= { id, sec: 0, n: 0 });
    groups[id].sec += s.sec;
    groups[id].n += 1;
  });
  const list = Object.values(groups).sort((a, b) => b.sec - a.sec);
  const max = Math.max(1, ...list.map((g) => g.sec));
  return `
    <section class="thr-card">
      <div class="thr-head"><h3 class="thr-title">WHY YOU OPENED IT</h3><span>time · avg</span></div>
      ${list.map((g) => `
        <div class="thr-bar-row">
          <div class="thr-bar-label"><span>${THR_PURPOSES[g.id] || 'No reason given'}</span><small><b>${thrFmt(g.sec)}</b> · ${g.n}× · avg ${thrFmt(g.sec / g.n)}</small></div>
          <div class="thr-bar thin${g.id === 'autopilot' ? ' is-auto' : ''}" style="width:${Math.max(2, (g.sec / max) * 100)}%"></div>
        </div>`).join('')}
    </section>`;
}

function thrLatestTemplate(all) {
  const latest = [...all].sort((a, b) => b.start - a.start).slice(0, 8);
  return `
    <section class="thr-latest">
      <h3 class="thr-title">LATEST</h3>
      ${latest.map((s) => {
        const src = thrSource(s);
        const when = s.start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        const vids = (s.videos || []).filter((v) => v.kind === 'watch' || v.kind === 'shorts');
        const shorts = vids.filter((v) => v.kind === 'shorts').length;
        let detail = '';
        if (s.turned_back) detail = s.note ? `Next step: ${s.note}` : 'At the gate';
        else if (vids.length) detail = `${vids.length - shorts} video${vids.length - shorts === 1 ? '' : 's'}${shorts ? ` · ${shorts} Shorts` : ''}`;
        else if (s.pull) detail = `Pull: ${s.pull}`;
        if (s.planned_min && !s.turned_back && s.sec / 60 > s.planned_min + 0.5) detail += `${detail ? ' · ' : ''}${Math.round(s.sec / 60 - s.planned_min)} min over`;
        const canRate = !s.turned_back && !s.live && !s.outcome && s.sec >= 60;
        return `
          <div class="thr-session" style="--c:${src.color}">
            <div class="thr-session-main">
              <div class="thr-session-meta"><span>${when} · ${src.label}</span><span>${s.outcome ? THR_OUTCOME[s.outcome] : s.live ? 'now' : ''}</span></div>
              <div class="thr-session-why">${thrEsc(s.turned_back ? 'Turned back' : thrPurposeLabel(s))}</div>
              ${detail ? `<div class="thr-session-detail">${thrEsc(detail)}</div>` : ''}
              ${canRate ? `
                <div class="thr-rate" role="group" aria-label="Did you get what you came for?">
                  <span>Got what you came for?</span>
                  <button type="button" data-thr-rate="yes" data-thr-id="${s.id}">Yes</button>
                  <button type="button" data-thr-rate="partly" data-thr-id="${s.id}">Partly</button>
                  <button type="button" data-thr-rate="no" data-thr-id="${s.id}">No</button>
                </div>` : ''}
            </div>
            <b class="thr-session-time">${s.turned_back ? '–' : thrFmt(s.sec).replace(' min', 'm')}</b>
          </div>`;
      }).join('')}
    </section>`;
}

/* ── Events ── */

function bindThresholdEvents() {
  $('#thr-key-save')?.addEventListener('click', async () => {
    const key = $('#thr-key-input')?.value.trim();
    if (!key) return;
    try { localStorage.setItem(THR_KEY_STORAGE, key); } catch {}
    thrSessions = null;
    thrError = '';
    await thrLoad();
    if (thrError) {
      try { localStorage.removeItem(THR_KEY_STORAGE); } catch {}
      renderMedia();
    }
  });

  $('#thr-refresh')?.addEventListener('click', () => {
    thrSessions = null;
    renderMedia();
  });

  $('#thr-forget')?.addEventListener('click', () => {
    if (!confirm('Disconnect this device from your tracker? You can paste the key again any time.')) return;
    try { localStorage.removeItem(THR_KEY_STORAGE); } catch {}
    thrSessions = null;
    renderMedia();
  });

  document.querySelectorAll('[data-thr-rate]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.thrId;
      const outcome = btn.dataset.thrRate;
      try {
        await thrRpc('brainrot_rate', { k: thrKey(), s: id, outcome_text: outcome });
        const s = thrSessions?.find((x) => x.id === id);
        if (s) s.outcome = outcome;
        renderMedia();
      } catch (e) {
        showToast(e.message);
      }
    });
  });
}

window.renderThreshold = renderThreshold;
window.bindThresholdEvents = bindThresholdEvents;
