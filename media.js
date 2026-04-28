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

const MEDIA_CONTEXTS = [
  { id: 'eating', emoji: '🍽', label: 'Eating' },
  { id: 'bed', emoji: '🛏', label: 'Bed' },
  { id: 'waking', emoji: '🌅', label: 'Waking up' },
  { id: 'bathroom', emoji: '🚿', label: 'Bathroom' },
  { id: 'waiting', emoji: '⏳', label: 'Waiting' },
  { id: 'break', emoji: '☕', label: 'Break' },
  { id: 'avoidance', emoji: '📌', label: 'Avoiding task' },
  { id: 'lonely', emoji: '🫶', label: 'Lonely' },
];

const MEDIA_REASONS = [
  { id: 'bored', emoji: '🫥', label: 'Bored' },
  { id: 'anxious', emoji: '🫨', label: 'Anxious' },
  { id: 'tired', emoji: '🥱', label: 'Tired' },
  { id: 'comfort', emoji: '🧸', label: 'Comfort' },
  { id: 'avoid', emoji: '🫣', label: 'Avoiding' },
  { id: 'reward', emoji: '🍬', label: 'Reward' },
  { id: 'habit', emoji: '🔁', label: 'Autopilot' },
  { id: 'inspo', emoji: '✨', label: 'Inspiration' },
];

const MEDIA_EXIT_ACTIONS = [
  { id: 'phone_down', emoji: '📵', label: 'Phone down' },
  { id: 'three_breaths', emoji: '🌬', label: '3 breaths' },
  { id: 'water', emoji: '💧', label: 'Water' },
  { id: 'stand', emoji: '🚶', label: 'Stand up' },
  { id: 'meal', emoji: '🍽', label: 'Eat present' },
  { id: 'queue', emoji: '📋', label: 'Use queue' },
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

function loadMediaShield() {
  try { return JSON.parse(localStorage.getItem('innerscape_media_active_shield') || 'null'); }
  catch { return null; }
}
function saveMediaShield(shield) {
  if (shield) localStorage.setItem('innerscape_media_active_shield', JSON.stringify(shield));
  else localStorage.removeItem('innerscape_media_active_shield');
}

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
      <button class="media-tab ${mediaView === 'queue' ? 'active' : ''}" onclick="switchMediaView('queue')">🛟 Rescue</button>
      <button class="media-tab ${mediaView === 'session' ? 'active' : ''}" onclick="switchMediaView('session')">📋 Intentions</button>
      <button class="media-tab ${mediaView === 'log' ? 'active' : ''}" onclick="switchMediaView('log')">📊 Patterns</button>
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
  const sessions = loadMediaSessions();
  const impulses = loadImpulseCaught();
  const shield = loadMediaShield();
  const stats = mediaAnalyzePatterns(sessions, impulses);
  const suggestedNudge = mediaSuggestedNudge(stats.topContext?.id);
  const todayStart = startOfDay(new Date()).getTime();
  const todaySpirals = sessions.filter(s => s.ts >= todayStart && (s.intentional || 5) <= 3).length;

  let html = `
    <div class="media-page media-rescue-page">
      <div class="media-hero-card">
        <div class="media-hero-copy">
          <div class="media-kicker">Media Rescue</div>
          <h2>Catch the loop early.</h2>
          <p>${todayImpulses ? `${todayImpulses} catch${todayImpulses === 1 ? '' : 'es'} today` : 'No catches logged today'}${todaySpirals ? ` · ${todaySpirals} spiral log${todaySpirals === 1 ? '' : 's'}` : ''}</p>
        </div>
        <button class="media-hero-action" id="media-save-catch">🛡️ Catch Myself</button>
      </div>

      <div class="media-catch-card">
        <div class="media-card-title">What moment is this?</div>
        ${mediaChoiceGroup(MEDIA_CONTEXTS, 'context', 'eating')}
        <div class="media-card-title media-card-title-spaced">What pulled you toward it?</div>
        ${mediaChoiceGroup(MEDIA_REASONS, 'reason')}
        <div class="media-catch-row">
          <button class="media-secondary-action" id="media-start-spiral">🌀 Already scrolling</button>
          ${todayImpulses > 0 ? `<button class="media-icon-action" id="media-impulse-undo" title="Undo last">↩️</button>` : ''}
        </div>
      </div>

      <div class="media-meal-card ${shield ? 'active' : ''}">
        <div class="media-meal-main">
          <span class="media-meal-icon">🍽</span>
          <div>
            <div class="media-card-title">${shield ? 'Meal shield is on' : 'Eating moment'}</div>
            <p>${shield ? `Started ${timeStr(shield.startTs)}. Keep the meal simple and offline.` : 'A one-tap guard for the moment where scrolling can sneak in.'}</p>
          </div>
        </div>
        ${shield ? `
          <div class="media-meal-actions">
            <button class="media-shield-good" id="media-meal-stayed">✓ Stayed present</button>
            <button class="media-shield-slip" id="media-meal-slipped">Log a slip</button>
          </div>
        ` : `<button class="media-meal-start" id="media-start-meal-shield">Start meal shield</button>`}
      </div>

      <div class="media-nudge-card">
        <div>
          <div class="media-card-title">Next exit ramp</div>
          <p>${suggestedNudge.copy}</p>
        </div>
        <button class="media-nudge-btn" data-media-action="${suggestedNudge.id}">${suggestedNudge.emoji} ${suggestedNudge.label}</button>
      </div>

      <div class="media-section-head">
        <div>
          <h3>Intentional queue</h3>
          <p>${pending.length ? `${pending.length} thing${pending.length === 1 ? '' : 's'} waiting` : 'Nothing waiting right now'}</p>
        </div>
        <button class="media-add-btn compact" id="media-add-btn">+ Add</button>
      </div>

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
      }).join('') : '<div class="media-empty small">Add things you actually want to watch, listen to, or read.</div>'}

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
        <div class="media-session-header">Choose before opening.</div>
        <div class="media-session-note">A planned session is allowed. The page is here to keep it from turning into autopilot.</div>
        
        <button class="media-unplanned-btn" id="media-unplanned-btn">🌀 Log an unplanned spiral</button>
        
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
        <div class="media-reflect-header">${session && session.quickSpiral ? '🌀 Map the spiral' : '🪞 How did it go?'}</div>

        <div class="media-reflect-field">
          <label>Where did it happen?</label>
          ${mediaChoiceGroup(MEDIA_CONTEXTS, 'context', session?.context || '')}
        </div>

        <div class="media-reflect-field">
          <label>What pulled you in?</label>
          ${mediaChoiceGroup(MEDIA_REASONS, 'reason', session?.reason || '')}
        </div>

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
          <label>Exit ramp</label>
          ${mediaChoiceGroup(MEDIA_EXIT_ACTIONS, 'action', session?.context === 'eating' ? 'meal' : '')}
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
  // Group sessions by day
  const byDay = {};
  sessions.forEach(s => {
    const dk = dayKey(s.ts);
    if (!byDay[dk]) byDay[dk] = { sessions: [], impulses: 0, impulseItems: [] };
    byDay[dk].sessions.push(s);
  });
  impulses.forEach(i => {
    const dk = dayKey(i.ts);
    if (!byDay[dk]) byDay[dk] = { sessions: [], impulses: 0, impulseItems: [] };
    byDay[dk].impulses++;
    byDay[dk].impulseItems.push(i);
  });

  const sortedDays = Object.keys(byDay).sort((a, b) => b.localeCompare(a));

  let html = `<div class="media-page">`;

  // Stats summary
  const last7 = sessions.filter(s => Date.now() - s.ts < 7 * 86400000);
  const avgIntentional = last7.length ? (last7.reduce((sum, s) => sum + (s.intentional || 5), 0) / last7.length) : null;
  const totalImpulses7d = impulses.filter(i => Date.now() - i.ts < 7 * 86400000).length;
  const patterns = mediaAnalyzePatterns(sessions, impulses);

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

  html += `
    <div class="media-pattern-card">
      <div class="media-card-title">Rabbit hole map</div>
      <div class="media-pattern-grid">
        <div class="media-pattern-stat">
          <span>${patterns.topContext ? mediaLabel(MEDIA_CONTEXTS, patterns.topContext.id) : '🧭 No pattern yet'}</span>
          <small>${patterns.topContext ? `${patterns.topContext.count} moments` : 'context'}</small>
        </div>
        <div class="media-pattern-stat">
          <span>${patterns.topReason ? mediaLabel(MEDIA_REASONS, patterns.topReason.id) : '🫥 No why yet'}</span>
          <small>${patterns.topReason ? `${patterns.topReason.count} pulls` : 'why'}</small>
        </div>
        <div class="media-pattern-stat">
          <span>${patterns.topPlatform ? mediaPlatform(patterns.topPlatform.id).emoji + ' ' + mediaPlatform(patterns.topPlatform.id).name : '🌐 Mixed'}</span>
          <small>${patterns.topPlatform ? `${patterns.topPlatform.count} sessions` : 'platform'}</small>
        </div>
      </div>
      <div class="media-slot-row">
        ${patterns.slots.map(slot => {
          const max = Math.max(1, ...patterns.slots.map(s => s.count));
          const pct = Math.max(8, (slot.count / max) * 100);
          return `
            <div class="media-slot">
              <div class="media-slot-bar"><span style="height:${pct}%"></span></div>
              <div class="media-slot-label">${slot.emoji}</div>
              <small>${slot.count}</small>
            </div>
          `;
        }).join('')}
      </div>
      <div class="media-pattern-foot">
        ${patterns.catches} catches · ${patterns.spirals} spiral logs · ${patterns.mealEvents} eating moments in 14d
      </div>
    </div>
  `;

  if (!sortedDays.length) {
    html += `<div class="media-empty small">Catch a few moments first, then this page will show your most vulnerable times, places, and pulls.</div>`;
  }

  sortedDays.slice(0, 14).forEach(dk => {
    const day = byDay[dk];
    html += `<div class="media-log-day">`;
    html += `<div class="media-log-date">${dateStr(new Date(dk))}${day.impulses ? ` · 🛡️ ×${day.impulses}` : ''}</div>`;

    day.impulseItems.sort((a, b) => b.ts - a.ts).slice(0, 4).forEach(i => {
      html += `
        <div class="media-log-entry media-log-catch">
          <div class="media-log-top">
            <span class="media-log-time">${timeStr(i.ts)}</span>
            <span>🛡️ Catch</span>
          </div>
          <div class="media-log-meta">
            ${i.context ? mediaLabel(MEDIA_CONTEXTS, i.context) : 'moment logged'}
            ${i.reason ? ` · ${mediaLabel(MEDIA_REASONS, i.reason)}` : ''}
            ${i.action ? ` · ${mediaLabel(MEDIA_EXIT_ACTIONS, i.action) || i.action}` : ''}
          </div>
        </div>
      `;
    });

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
            ${s.context ? ` · ${mediaLabel(MEDIA_CONTEXTS, s.context)}` : ''}
            ${s.reason ? ` · ${mediaLabel(MEDIA_REASONS, s.reason)}` : ''}
          </div>
          ${s.exitAction ? `<div class="media-log-exit">Exit ramp: ${mediaLabel(MEDIA_EXIT_ACTIONS, s.exitAction)}</div>` : ''}
          ${s.note ? `<div class="media-log-note">${s.note}</div>` : ''}
          <button class="media-log-delete" data-session-id="${s.id}">×</button>
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

function mediaChoiceGroup(items, type, activeId = '') {
  return `
    <div class="media-choice-group" data-choice="${type}">
      ${items.map(item => `
        <button class="media-choice-chip ${item.id === activeId ? 'active' : ''}" data-media-${type}="${item.id}">
          <span>${item.emoji}</span>${item.label}
        </button>
      `).join('')}
    </div>
  `;
}

function mediaActiveChoice(type) {
  const el = document.querySelector(`.media-choice-chip.active[data-media-${type}]`);
  return el ? el.getAttribute(`data-media-${type}`) : '';
}

function mediaLabel(items, id) {
  const item = items.find(i => i.id === id);
  return item ? `${item.emoji} ${item.label}` : '';
}

function mediaPlatform(id) {
  return MEDIA_PLATFORMS.find(p => p.id === id) || MEDIA_PLATFORMS[6];
}

function saveMediaImpulse(data = {}) {
  const arr = loadImpulseCaught();
  arr.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    ts: data.ts || Date.now(),
    avoided: data.avoided !== false,
    context: data.context || '',
    reason: data.reason || '',
    action: data.action || '',
    source: data.source || 'quick',
    endedAt: data.endedAt || null
  });
  saveImpulseCaught(arr);
  if (navigator.vibrate) navigator.vibrate(20);
  showToast(data.action === 'meal' ? 'Meal moment saved ✓' : 'Caught and logged 🛡️');
  renderMedia();
}

function mediaSuggestedNudge(context) {
  if (context === 'eating') return { id: 'meal', emoji: '🍽', label: 'Eat present', copy: 'For eating: put the phone face down until the next bite is done.' };
  if (context === 'bed') return { id: 'phone_down', emoji: '📵', label: 'Phone away', copy: 'For bed: set the phone down outside reach and let the next minute be boring.' };
  if (context === 'avoidance') return { id: 'stand', emoji: '🚶', label: 'Stand up', copy: 'For avoidance: stand up first, then choose the smallest next task.' };
  if (context === 'lonely') return { id: 'three_breaths', emoji: '🌬', label: '3 breaths', copy: 'For loneliness: pause for three breaths before looking for connection online.' };
  return { id: 'phone_down', emoji: '📵', label: 'Phone down', copy: 'A small interruption counts. Put the phone down, breathe once, then choose deliberately.' };
}

function mediaAnalyzePatterns(sessions, impulses) {
  const now = Date.now();
  const since = now - 14 * 86400000;
  const recentSessions = sessions.filter(s => s.ts >= since);
  const recentImpulses = impulses.filter(i => i.ts >= since);
  const events = [
    ...recentSessions.map(s => ({ ...s, kind: 'session' })),
    ...recentImpulses.map(i => ({ ...i, kind: 'impulse' }))
  ];
  const contexts = mediaCountBy(events, e => e.context || e.vulnerableMoment);
  const reasons = mediaCountBy(events, e => e.reason || e.pull);
  const platforms = mediaCountBy(recentSessions, e => e.platform || (e.items && e.items[0]?.platform));
  const slots = mediaTimeSlots(events);
  const doomMinutes = recentSessions.reduce((sum, s) => {
    const mindless = (s.intentional || 5) <= 3 || s.timeSpent == null;
    return sum + (mindless ? (s.timeSpent || 30) : 0);
  }, 0);
  const catches = recentImpulses.filter(i => i.avoided !== false).length;
  const spirals = recentSessions.filter(s => (s.intentional || 5) <= 3 || s.timeSpent == null).length;

  return {
    events,
    topContext: contexts[0] || null,
    topReason: reasons[0] || null,
    topPlatform: platforms[0] || null,
    slots,
    doomMinutes,
    catches,
    spirals,
    mealEvents: events.filter(e => (e.context || e.vulnerableMoment) === 'eating').length
  };
}

function mediaCountBy(items, getKey) {
  const counts = {};
  items.forEach(item => {
    const key = getKey(item);
    if (!key) return;
    counts[key] = (counts[key] || 0) + 1;
  });
  return Object.entries(counts)
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => b.count - a.count);
}

function mediaTimeSlots(events) {
  const slots = [
    { id: 'morning', label: 'Morning', emoji: '🌅', from: 6, to: 12, count: 0 },
    { id: 'afternoon', label: 'Afternoon', emoji: '☀️', from: 12, to: 18, count: 0 },
    { id: 'evening', label: 'Evening', emoji: '🌆', from: 18, to: 24, count: 0 },
    { id: 'night', label: 'Night', emoji: '🌙', from: 0, to: 6, count: 0 },
  ];
  events.forEach(e => {
    const hour = new Date(e.ts).getHours();
    const slot = slots.find(s => hour >= s.from && hour < s.to);
    if (slot) slot.count++;
  });
  return slots;
}

/* ═══════════════════════════════════
   EVENT BINDING
   ═══════════════════════════════════ */

function bindMediaEvents() {
  // Add to queue
  $('#media-add-btn')?.addEventListener('click', openMediaAddModal);

  // Choice chips
  document.querySelectorAll('.media-choice-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const group = btn.closest('.media-choice-group');
      if (!group) return;
      group.querySelectorAll('.media-choice-chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Impulse caught
  $('#media-save-catch')?.addEventListener('click', () => {
    saveMediaImpulse({
      avoided: true,
      context: mediaActiveChoice('context'),
      reason: mediaActiveChoice('reason'),
      action: 'caught',
      source: 'rescue'
    });
  });

  // Already scrolling → reflection
  $('#media-start-spiral')?.addEventListener('click', () => {
    activeMediaSession = {
      phase: 'reflect',
      planned: false,
      quickSpiral: true,
      items: [],
      startTs: Date.now(),
      context: mediaActiveChoice('context'),
      reason: mediaActiveChoice('reason')
    };
    mediaView = 'session';
    renderMedia();
  });

  // Meal shield
  $('#media-start-meal-shield')?.addEventListener('click', () => {
    saveMediaShield({ type: 'eating', startTs: Date.now() });
    showToast('Meal shield on 🍽');
    renderMedia();
  });
  $('#media-meal-stayed')?.addEventListener('click', () => {
    const shield = loadMediaShield();
    saveMediaShield(null);
    saveMediaImpulse({
      ts: shield?.startTs || Date.now(),
      avoided: true,
      context: 'eating',
      reason: 'habit',
      action: 'meal',
      source: 'meal-shield',
      endedAt: Date.now()
    });
  });
  $('#media-meal-slipped')?.addEventListener('click', () => {
    const shield = loadMediaShield();
    saveMediaShield(null);
    activeMediaSession = {
      phase: 'reflect',
      planned: false,
      quickSpiral: true,
      items: [],
      startTs: shield?.startTs || Date.now(),
      context: 'eating',
      reason: 'habit'
    };
    mediaView = 'session';
    renderMedia();
  });

  // Nudge action
  document.querySelectorAll('.media-nudge-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      saveMediaImpulse({
        avoided: true,
        context: mediaActiveChoice('context'),
        reason: mediaActiveChoice('reason'),
        action: btn.dataset.mediaAction || 'phone_down',
        source: 'nudge'
      });
    });
  });

  // Undo impulse
  $('#media-impulse-undo')?.addEventListener('click', () => {
    const arr = loadImpulseCaught();
    const todayStart = startOfDay(new Date()).getTime();
    // Remove last today impulse
    for (let i = arr.length - 1; i >= 0; i--) {
      if (arr[i].ts >= todayStart) { arr.splice(i, 1); break; }
    }
    saveImpulseCaught(arr);
    showToast('Impulse log removed');
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

  // Delete session logs
  document.querySelectorAll('.media-log-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.sessionId;
      const sessions = loadMediaSessions().filter(s => s.id !== id);
      saveMediaSessions(sessions);
      showToast('Log removed');
      renderMedia();
    });
  });

  // Save reflection
  $('#media-save-reflect')?.addEventListener('click', saveMediaReflection);
}

function saveMediaReflection() {
  const stuckBtn = document.querySelector('.media-stuck-btn.active');
  const timeBtn = document.querySelector('.media-time-btn.active');
  const slider = $('#media-intentional-slider');
  const notes = $('#media-reflect-notes');
  const context = mediaActiveChoice('context');
  const reason = mediaActiveChoice('reason');
  const exitAction = mediaActiveChoice('action');

  const session = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    ts: activeMediaSession ? activeMediaSession.startTs : Date.now(),
    planned: activeMediaSession ? activeMediaSession.planned : false,
    items: activeMediaSession ? activeMediaSession.items.map(i => ({ title: i.title, platform: i.platform })) : [],
    platform: activeMediaSession && activeMediaSession.items.length === 1 ? activeMediaSession.items[0].platform : null,
    stuckToPlan: stuckBtn ? stuckBtn.dataset.val : null,
    timeSpent: timeBtn ? (timeBtn.dataset.mins === 'null' ? null : parseInt(timeBtn.dataset.mins)) : null,
    intentional: slider ? parseInt(slider.value) : 5,
    context,
    reason,
    exitAction,
    vulnerableMoment: context,
    pull: reason,
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
