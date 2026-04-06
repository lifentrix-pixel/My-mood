/* ── My Media — Intentional Browsing ── */

const MEDIA_PLATFORMS = [
  { id: 'youtube', emoji: '📺', name: 'YouTube', color: '#FF0000' },
  { id: 'instagram', emoji: '📸', name: 'Instagram', color: '#E1306C' },
  { id: 'tiktok', emoji: '🎵', name: 'TikTok', color: '#69C9D0' },
  { id: 'spotify', emoji: '🎧', name: 'Spotify', color: '#1DB954' },
  { id: 'twitter', emoji: '🐦', name: 'X/Twitter', color: '#1DA1F2' },
  { id: 'reddit', emoji: '🟠', name: 'Reddit', color: '#FF4500' },
  { id: 'other', emoji: '🌐', name: 'Other', color: '#a78bfa' },
];

const MEDIA_TIME_PRESETS = [
  { label: '5m', mins: 5 },
  { label: '15m', mins: 15 },
  { label: '30m', mins: 30 },
  { label: '1hr', mins: 60 },
  { label: '🤷 lost track', mins: null },
];

let mediaView = 'queue'; // 'queue' | 'session' | 'log'
let activeMediaSession = null;

function loadMediaQueue() {
  try { return JSON.parse(localStorage.getItem('innerscape_media_queue') || '[]'); }
  catch { return []; }
}
function saveMediaQueue(q) { localStorage.setItem('innerscape_media_queue', JSON.stringify(q)); }

function loadMediaSessions() {
  try { return JSON.parse(localStorage.getItem('innerscape_media_sessions') || '[]'); }
  catch { return []; }
}
function saveMediaSessions(s) { localStorage.setItem('innerscape_media_sessions', JSON.stringify(s)); }

function loadImpulseCaught() {
  try { return JSON.parse(localStorage.getItem('innerscape_media_impulse') || '[]'); }
  catch { return []; }
}
function saveImpulseCaught(arr) { localStorage.setItem('innerscape_media_impulse', JSON.stringify(arr)); }

function initMedia() {
  mediaView = 'queue';

  // Bind modal platform buttons (only once)
  document.querySelectorAll('.media-platform-btn').forEach(btn => {
    const fresh = btn.cloneNode(true);
    btn.replaceWith(fresh);
    fresh.addEventListener('click', () => {
      document.querySelectorAll('.media-platform-btn').forEach(b => b.classList.remove('active'));
      fresh.classList.add('active');
    });
  });

  renderMedia();
}

function renderMedia() {
  const container = $('#media-content');
  if (!container) return;

  const queue = loadMediaQueue();
  const sessions = loadMediaSessions();
  const impulses = loadImpulseCaught();
  const todayStart = startOfDay(new Date()).getTime();
  const todayImpulses = impulses.filter(i => i.ts >= todayStart).length;
  const todaySessions = sessions.filter(s => s.ts >= todayStart);

  let html = '';

  // Tab bar
  html += `
    <div class="media-tabs">
      <button class="media-tab ${mediaView === 'queue' ? 'active' : ''}" onclick="switchMediaView('queue')">📋 Queue</button>
      <button class="media-tab ${mediaView === 'session' ? 'active' : ''}" onclick="switchMediaView('session')">▶️ Session</button>
      <button class="media-tab ${mediaView === 'log' ? 'active' : ''}" onclick="switchMediaView('log')">📊 Log</button>
    </div>
  `;

  if (mediaView === 'queue') {
    html += renderMediaQueue(queue, todayImpulses);
  } else if (mediaView === 'session') {
    html += renderMediaSession(queue);
  } else {
    html += renderMediaLog(sessions, impulses);
  }

  container.innerHTML = html;
  bindMediaEvents();
}

/* ═══════════════════════════════════
   QUEUE VIEW
   ═══════════════════════════════════ */

function renderMediaQueue(queue, todayImpulses) {
  const pending = queue.filter(q => !q.done);
  const done = queue.filter(q => q.done);

  let html = `
    <div class="media-page">
      <!-- Impulse Caught -->
      <div class="media-impulse-row">
        <button class="media-impulse-btn" id="media-impulse-tap">
          🛡️ Impulse Caught${todayImpulses > 0 ? ` <span class="media-impulse-count">${todayImpulses}</span>` : ''}
        </button>
        <span class="media-impulse-hint">Tap when you resist mindless scrolling</span>
      </div>

      <!-- Add to queue -->
      <button class="media-add-btn" id="media-add-btn">+ Add to Queue</button>

      <!-- Pending items -->
      ${pending.length ? pending.map(item => {
        const platform = MEDIA_PLATFORMS.find(p => p.id === item.platform) || MEDIA_PLATFORMS[6];
        return `
          <div class="media-queue-item" data-id="${item.id}">
            <div class="media-queue-check" data-id="${item.id}"></div>
            <div class="media-queue-info">
              <div class="media-queue-title">${item.title}</div>
              <div class="media-queue-platform" style="color:${platform.color}">${platform.emoji} ${platform.name}</div>
              ${item.note ? `<div class="media-queue-note">${item.note}</div>` : ''}
            </div>
            <button class="media-queue-delete" data-id="${item.id}">×</button>
          </div>
        `;
      }).join('') : '<div class="media-empty">No items queued — add something intentional! ✨</div>'}

      ${done.length ? `
        <div class="media-done-header" id="media-done-toggle">✓ Completed (${done.length})</div>
        <div class="media-done-list" id="media-done-list" style="display:none">
          ${done.slice(0, 10).map(item => {
            const platform = MEDIA_PLATFORMS.find(p => p.id === item.platform) || MEDIA_PLATFORMS[6];
            return `
              <div class="media-queue-item done">
                <div class="media-queue-check checked" data-id="${item.id}">✓</div>
                <div class="media-queue-info">
                  <div class="media-queue-title">${item.title}</div>
                  <div class="media-queue-platform" style="color:${platform.color}">${platform.emoji} ${platform.name}</div>
                </div>
                <button class="media-queue-delete" data-id="${item.id}">×</button>
              </div>
            `;
          }).join('')}
        </div>
      ` : ''}
    </div>
  `;
  return html;
}

/* ═══════════════════════════════════
   SESSION VIEW
   ═══════════════════════════════════ */

function renderMediaSession(queue) {
  const pending = queue.filter(q => !q.done);

  if (activeMediaSession && activeMediaSession.phase === 'reflect') {
    return renderMediaReflection();
  }

  let html = `<div class="media-page">`;

  if (activeMediaSession && activeMediaSession.phase === 'active') {
    // Active session
    const items = activeMediaSession.items;
    html += `
      <div class="media-session-active">
        <div class="media-session-header">📱 Session in progress</div>
        <div class="media-session-plan">
          ${items.map(item => {
            const platform = MEDIA_PLATFORMS.find(p => p.id === item.platform) || MEDIA_PLATFORMS[6];
            return `<div class="media-session-item">${platform.emoji} ${item.title}</div>`;
          }).join('')}
        </div>
        <button class="media-session-done-btn" id="media-finish-session">✓ Done — Reflect</button>
        <button class="media-session-cancel-btn" id="media-cancel-session">Cancel Session</button>
      </div>
    `;
  } else {
    // Start session — pick from queue or unplanned
    html += `
      <div class="media-session-start">
        <div class="media-session-header">What are you about to do?</div>
        
        <button class="media-unplanned-btn" id="media-unplanned-btn">⚡ Unplanned Session</button>
        
        ${pending.length ? `
          <div class="media-session-subheader">Or pick from your queue:</div>
          <div class="media-session-picks">
            ${pending.map(item => {
              const platform = MEDIA_PLATFORMS.find(p => p.id === item.platform) || MEDIA_PLATFORMS[6];
              return `
                <label class="media-pick-item">
                  <input type="checkbox" value="${item.id}" class="media-pick-check">
                  <span class="media-pick-emoji">${platform.emoji}</span>
                  <span class="media-pick-title">${item.title}</span>
                </label>
              `;
            }).join('')}
          </div>
          <button class="media-start-btn" id="media-start-planned" disabled>▶️ Start Session</button>
        ` : '<div class="media-empty">Queue is empty — add items or start an unplanned session</div>'}
      </div>
    `;
  }

  html += `</div>`;
  return html;
}

function renderMediaReflection() {
  const session = activeMediaSession;
  return `
    <div class="media-page">
      <div class="media-reflect">
        <div class="media-reflect-header">🪞 How did it go?</div>

        <div class="media-reflect-field">
          <label>Did you stick to the plan?</label>
          <div class="media-reflect-btns" id="media-stuck-btns">
            <button class="media-stuck-btn" data-val="yes">✅ Yes</button>
            <button class="media-stuck-btn" data-val="mostly">🤏 Mostly</button>
            <button class="media-stuck-btn" data-val="no">❌ No</button>
          </div>
        </div>

        <div class="media-reflect-field">
          <label>Time spent</label>
          <div class="media-time-presets" id="media-time-presets">
            ${MEDIA_TIME_PRESETS.map(p => `
              <button class="media-time-btn" data-mins="${p.mins}">${p.label}</button>
            `).join('')}
          </div>
        </div>

        <div class="media-reflect-field">
          <label>Intentional vs Mindless</label>
          <div class="media-slider-row">
            <span class="media-slider-label">🎯</span>
            <input type="range" min="1" max="10" value="5" class="media-slider" id="media-intentional-slider">
            <span class="media-slider-label">🌀</span>
          </div>
          <div class="media-slider-value" id="media-slider-val">5 — Mixed</div>
        </div>

        <div class="media-reflect-field">
          <label>Notes (optional)</label>
          <textarea class="media-reflect-notes" id="media-reflect-notes" placeholder="What happened? Anything worth remembering?" rows="3"></textarea>
        </div>

        <button class="media-save-btn" id="media-save-reflect">💾 Save Reflection</button>
      </div>
    </div>
  `;
}

/* ═══════════════════════════════════
   LOG VIEW
   ═══════════════════════════════════ */

function renderMediaLog(sessions, impulses) {
  if (!sessions.length && !impulses.length) {
    return `<div class="media-page"><div class="media-empty">No sessions logged yet. Start tracking! 📱</div></div>`;
  }

  // Group sessions by day
  const byDay = {};
  sessions.forEach(s => {
    const dk = dayKey(s.ts);
    if (!byDay[dk]) byDay[dk] = { sessions: [], impulses: 0 };
    byDay[dk].sessions.push(s);
  });
  impulses.forEach(i => {
    const dk = dayKey(i.ts);
    if (!byDay[dk]) byDay[dk] = { sessions: [], impulses: 0 };
    byDay[dk].impulses++;
  });

  const sortedDays = Object.keys(byDay).sort((a, b) => b.localeCompare(a));

  let html = `<div class="media-page">`;

  // Stats summary
  const last7 = sessions.filter(s => Date.now() - s.ts < 7 * 86400000);
  const avgIntentional = last7.length ? (last7.reduce((sum, s) => sum + (s.intentional || 5), 0) / last7.length) : null;
  const totalImpulses7d = impulses.filter(i => Date.now() - i.ts < 7 * 86400000).length;

  if (last7.length || totalImpulses7d) {
    html += `
      <div class="media-stats">
        <div class="media-stat">
          <div class="media-stat-val">${last7.length}</div>
          <div class="media-stat-label">sessions (7d)</div>
        </div>
        ${avgIntentional !== null ? `
          <div class="media-stat">
            <div class="media-stat-val">${avgIntentional.toFixed(1)}</div>
            <div class="media-stat-label">avg intentional</div>
          </div>
        ` : ''}
        <div class="media-stat">
          <div class="media-stat-val">🛡️ ${totalImpulses7d}</div>
          <div class="media-stat-label">impulses caught</div>
        </div>
      </div>
    `;
  }

  sortedDays.slice(0, 14).forEach(dk => {
    const day = byDay[dk];
    html += `<div class="media-log-day">`;
    html += `<div class="media-log-date">${dateStr(new Date(dk))}${day.impulses ? ` · 🛡️ ×${day.impulses}` : ''}</div>`;

    day.sessions.sort((a, b) => b.ts - a.ts).forEach(s => {
      const stuckEmoji = s.stuckToPlan === 'yes' ? '✅' : s.stuckToPlan === 'mostly' ? '🤏' : s.stuckToPlan === 'no' ? '❌' : '';
      const intentLabel = s.intentional ? intentionalLabel(s.intentional) : '';
      const platform = s.platform ? MEDIA_PLATFORMS.find(p => p.id === s.platform) : null;
      html += `
        <div class="media-log-entry">
          <div class="media-log-top">
            <span class="media-log-time">${timeStr(s.ts)}</span>
            ${platform ? `<span style="color:${platform.color}">${platform.emoji}</span>` : ''}
            <span class="media-log-type">${s.planned ? 'Planned' : '⚡ Unplanned'}</span>
            ${stuckEmoji ? `<span>${stuckEmoji}</span>` : ''}
          </div>
          ${s.items && s.items.length ? `<div class="media-log-items">${s.items.map(i => i.title).join(', ')}</div>` : ''}
          <div class="media-log-meta">
            ${s.timeSpent ? `${s.timeSpent}min` : '⏱ lost track'}
            ${intentLabel ? ` · ${intentLabel}` : ''}
          </div>
          ${s.note ? `<div class="media-log-note">${s.note}</div>` : ''}
        </div>
      `;
    });

    html += `</div>`;
  });

  html += `</div>`;
  return html;
}

function intentionalLabel(val) {
  if (val >= 8) return '🎯 Very intentional';
  if (val >= 6) return '🎯 Mostly intentional';
  if (val >= 4) return '🌀 Mixed';
  if (val >= 2) return '🌀 Mostly mindless';
  return '🌀 Mindless scrolling';
}

/* ═══════════════════════════════════
   EVENT BINDING
   ═══════════════════════════════════ */

function bindMediaEvents() {
  // Add to queue
  $('#media-add-btn')?.addEventListener('click', openMediaAddModal);

  // Impulse caught
  $('#media-impulse-tap')?.addEventListener('click', () => {
    const arr = loadImpulseCaught();
    arr.push({ ts: Date.now() });
    saveImpulseCaught(arr);
    if (navigator.vibrate) navigator.vibrate(20);
    showToast('Impulse caught! 🛡️');
    renderMedia();
  });

  // Done toggle
  $('#media-done-toggle')?.addEventListener('click', () => {
    const list = $('#media-done-list');
    if (list) list.style.display = list.style.display === 'none' ? 'block' : 'none';
  });

  // Queue checkboxes
  document.querySelectorAll('.media-queue-check:not(.checked)').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = el.dataset.id;
      const queue = loadMediaQueue();
      const item = queue.find(q => q.id === id);
      if (item) { item.done = true; item.doneAt = Date.now(); saveMediaQueue(queue); renderMedia(); }
    });
  });

  // Uncheck completed
  document.querySelectorAll('.media-queue-check.checked').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = el.dataset.id;
      const queue = loadMediaQueue();
      const item = queue.find(q => q.id === id);
      if (item) { item.done = false; item.doneAt = null; saveMediaQueue(queue); renderMedia(); }
    });
  });

  // Delete queue items
  document.querySelectorAll('.media-queue-delete').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = el.dataset.id;
      const queue = loadMediaQueue().filter(q => q.id !== id);
      saveMediaQueue(queue);
      renderMedia();
      showToast('Removed');
    });
  });

  // Session picks
  document.querySelectorAll('.media-pick-check').forEach(cb => {
    cb.addEventListener('change', () => {
      const anyChecked = document.querySelectorAll('.media-pick-check:checked').length > 0;
      const btn = $('#media-start-planned');
      if (btn) btn.disabled = !anyChecked;
    });
  });

  // Start planned session
  $('#media-start-planned')?.addEventListener('click', () => {
    const checked = [...document.querySelectorAll('.media-pick-check:checked')].map(cb => cb.value);
    const queue = loadMediaQueue();
    const items = queue.filter(q => checked.includes(q.id));
    activeMediaSession = { phase: 'active', planned: true, items, startTs: Date.now() };
    renderMedia();
  });

  // Unplanned session
  $('#media-unplanned-btn')?.addEventListener('click', () => {
    activeMediaSession = { phase: 'reflect', planned: false, items: [], startTs: Date.now() };
    renderMedia();
  });

  // Finish session → reflect
  $('#media-finish-session')?.addEventListener('click', () => {
    if (activeMediaSession) { activeMediaSession.phase = 'reflect'; renderMedia(); }
  });

  // Cancel session
  $('#media-cancel-session')?.addEventListener('click', () => {
    activeMediaSession = null;
    renderMedia();
  });

  // Stuck to plan buttons
  document.querySelectorAll('.media-stuck-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.media-stuck-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Time preset buttons
  document.querySelectorAll('.media-time-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.media-time-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Intentional slider
  const slider = $('#media-intentional-slider');
  const sliderVal = $('#media-slider-val');
  if (slider && sliderVal) {
    slider.addEventListener('input', () => {
      const v = parseInt(slider.value);
      sliderVal.textContent = `${v} — ${intentionalLabel(v).replace(/^[^\s]+ /, '')}`;
    });
  }

  // Save reflection
  $('#media-save-reflect')?.addEventListener('click', saveMediaReflection);
}

function saveMediaReflection() {
  const stuckBtn = document.querySelector('.media-stuck-btn.active');
  const timeBtn = document.querySelector('.media-time-btn.active');
  const slider = $('#media-intentional-slider');
  const notes = $('#media-reflect-notes');

  const session = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    ts: activeMediaSession ? activeMediaSession.startTs : Date.now(),
    planned: activeMediaSession ? activeMediaSession.planned : false,
    items: activeMediaSession ? activeMediaSession.items.map(i => ({ title: i.title, platform: i.platform })) : [],
    platform: activeMediaSession && activeMediaSession.items.length === 1 ? activeMediaSession.items[0].platform : null,
    stuckToPlan: stuckBtn ? stuckBtn.dataset.val : null,
    timeSpent: timeBtn ? (timeBtn.dataset.mins === 'null' ? null : parseInt(timeBtn.dataset.mins)) : null,
    intentional: slider ? parseInt(slider.value) : 5,
    note: notes ? notes.value.trim() : '',
  };

  const sessions = loadMediaSessions();
  sessions.push(session);
  saveMediaSessions(sessions);

  // Mark queue items as done
  if (activeMediaSession && activeMediaSession.items.length) {
    const queue = loadMediaQueue();
    activeMediaSession.items.forEach(item => {
      const q = queue.find(qi => qi.id === item.id);
      if (q) { q.done = true; q.doneAt = Date.now(); }
    });
    saveMediaQueue(queue);
  }

  activeMediaSession = null;
  showToast('Session logged ✓');
  mediaView = 'log';
  renderMedia();
}

/* ═══════════════════════════════════
   ADD MODAL
   ═══════════════════════════════════ */

function openMediaAddModal() {
  const modal = $('#media-add-modal');
  if (modal) {
    modal.classList.remove('hidden');
    $('#media-add-title').value = '';
    $('#media-add-note').value = '';
    // Reset platform selection
    document.querySelectorAll('.media-platform-btn').forEach(b => b.classList.remove('active'));
    setTimeout(() => $('#media-add-title').focus(), 100);
  }
}

function closeMediaAddModal() {
  $('#media-add-modal')?.classList.add('hidden');
}

function saveMediaQueueItem() {
  const title = $('#media-add-title')?.value.trim();
  if (!title) { showToast('Enter a title'); return; }

  const platformBtn = document.querySelector('.media-platform-btn.active');
  const platform = platformBtn ? platformBtn.dataset.platform : 'other';
  const note = $('#media-add-note')?.value.trim() || '';

  const queue = loadMediaQueue();
  queue.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    title,
    platform,
    note,
    done: false,
    doneAt: null,
    createdAt: Date.now(),
  });
  saveMediaQueue(queue);
  closeMediaAddModal();
  renderMedia();
  showToast('Added to queue ✓');
}

function switchMediaView(view) {
  mediaView = view;
  renderMedia();
}

// Expose globals
window.initMedia = initMedia;
window.switchMediaView = switchMediaView;
window.closeMediaAddModal = closeMediaAddModal;
window.saveMediaQueueItem = saveMediaQueueItem;
