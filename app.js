/* ── Innerscape — App Init ── */

const APP_ACTIVITY_CATEGORIES = [
  { id: 'sleep_recovery', name: 'Sleep / Recovery', emoji: '🌙', color: '#818cf8', description: 'Sleep, rest, decompression' },
  { id: 'creative_practice', name: 'Creative Practice', emoji: '🎨', color: '#f472b6', description: 'Art, writing, music, output' },
  { id: 'work_building', name: 'Work / Building', emoji: '🛠️', color: '#38bdf8', description: 'Work, code, business, projects' },
  { id: 'food_nourishment', name: 'Food / Nourishment', emoji: '🍲', color: '#fbbf24', description: 'Eating, groceries, cooking' },
  { id: 'body_health', name: 'Body / Health', emoji: '🫀', color: '#34d399', description: 'Body care, hygiene, medical, movement' },
  { id: 'home_care', name: 'Home / Care', emoji: '🏡', color: '#4ade80', description: 'Cleaning, chores, domestic care' },
  { id: 'relationships', name: 'Relationships', emoji: '👥', color: '#fb923c', description: 'Friends, family, calls, social time' },
  { id: 'reflection_coaching', name: 'Reflection / Coaching', emoji: '🧭', color: '#a78bfa', description: 'Coaching, therapy, integration' },
  { id: 'learning', name: 'Learning', emoji: '📚', color: '#22d3ee', description: 'Reading, courses, study' },
  { id: 'media_leisure', name: 'Media / Leisure', emoji: '🎧', color: '#e879f9', description: 'Watching, hobbies, playful leisure' },
  { id: 'mobility_outside', name: 'Mobility / Outside', emoji: '🚶', color: '#2dd4bf', description: 'Travel, going out, transitions' },
  { id: 'admin_finance', name: 'Admin / Finance', emoji: '🧾', color: '#f97316', description: 'Money, logistics, life admin' },
];

const APP_LEGACY_CATEGORY_MAP = {
  'cat-work': 'work_building',
  'cat-health': 'body_health',
  'cat-creative': 'creative_practice',
  'cat-social': 'relationships',
  'cat-selfcare': 'body_health',
  'cat-learning': 'learning',
};

const APP_ACTIVITY_NAME_CATEGORY_MAP = {
  'art making': 'creative_practice',
  'art practice': 'creative_practice',
  'breakfast': 'food_nourishment',
  'chores': 'home_care',
  'cleaning': 'home_care',
  'coaching': 'reflection_coaching',
  'code building': 'work_building',
  'cold shower': 'body_health',
  'creating social media content': 'creative_practice',
  'dating': 'relationships',
  'emotional processing and integrating': 'reflection_coaching',
  'entrepreneurship': 'work_building',
  'finances': 'admin_finance',
  'food': 'food_nourishment',
  'food related': 'food_nourishment',
  'friends': 'relationships',
  'friends time': 'relationships',
  'getting ready': 'body_health',
  'going out': 'mobility_outside',
  'groceries': 'food_nourishment',
  'hobbies': 'media_leisure',
  'hospital visits': 'body_health',
  'medical': 'body_health',
  'meditations': 'reflection_coaching',
  'meditative cleaning': 'home_care',
  'messaging': 'relationships',
  'mom home visit': 'relationships',
  'music': 'creative_practice',
  'night time routine': 'sleep_recovery',
  'night time routine ( getting ready for bed)': 'sleep_recovery',
  'partying': 'relationships',
  'photography course': 'learning',
  'physical...': 'body_health',
  'physical…': 'body_health',
  'playing with a cat ( mini  )': 'relationships',
  'reading': 'learning',
  'resting': 'sleep_recovery',
  'self care': 'body_health',
  'shower': 'body_health',
  'sleeping': 'sleep_recovery',
  'slow time': 'sleep_recovery',
  'social': 'relationships',
  'special time': 'relationships',
  'spending time at my moms': 'relationships',
  'spending time with mom': 'relationships',
  'talking on the phone': 'relationships',
  'therapy': 'reflection_coaching',
  'travelling': 'mobility_outside',
  'watching series': 'media_leisure',
  'watching youtubs': 'media_leisure',
  'watching youtube': 'media_leisure',
  'website creation': 'work_building',
  'website making': 'work_building',
  'work': 'work_building',
  'writing': 'creative_practice',
};

function installActivityTaxonomy() {
  const activityCategoryIds = new Set(APP_ACTIVITY_CATEGORIES.map(cat => cat.id));
  const originalSyncActivities = typeof syncActivities === 'function' ? syncActivities : null;

  window.normalizeActivityName = function normalizeActivityName(name = '') {
    return String(name).trim().replace(/\s+/g, ' ');
  };

  window.activityNameKey = function activityNameKey(name = '') {
    return normalizeActivityName(name).toLowerCase();
  };

  window.inferActivityCategory = function inferActivityCategory(activity) {
    const category = APP_LEGACY_CATEGORY_MAP[activity.category] || activity.category;
    if (activityCategoryIds.has(category)) return category;
    return APP_ACTIVITY_NAME_CATEGORY_MAP[activityNameKey(activity.name)] || '';
  };

  window.normalizeActivity = function normalizeActivity(activity) {
    const normalized = { ...activity };
    normalized.name = normalizeActivityName(normalized.name || '');
    normalized.category = inferActivityCategory(normalized);
    if (!normalized.schema_version) normalized.schema_version = 1;
    return normalized;
  };

  window.hasDuplicateActivityName = function hasDuplicateActivityName(activities, name, exceptId = null) {
    const key = activityNameKey(name);
    return activities.some(activity => activity.id !== exceptId && activityNameKey(activity.name) === key);
  };

  window.loadCategories = function loadCategories() {
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(APP_ACTIVITY_CATEGORIES));
    return [...APP_ACTIVITY_CATEGORIES];
  };

  window.saveCategories = function saveCategories() {
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(APP_ACTIVITY_CATEGORIES));
  };

  window.loadActivities = function loadActivities() {
    try { return (JSON.parse(localStorage.getItem(ACTIVITIES_KEY)) || []).map(normalizeActivity); } catch { return []; }
  };

  window.saveActivities = function saveActivities(acts) {
    localStorage.setItem(ACTIVITIES_KEY, JSON.stringify(acts.map(normalizeActivity)));
    if (currentUser && db && originalSyncActivities) setTimeout(() => originalSyncActivities(), 100);
  };

  window.createCategory = function createCategory() {
    showToast('Activity categories are fixed for cleaner reports');
  };

  window.openTimerCreateModal = function openTimerCreateModal() {
    $('#timer-create-modal').classList.remove('hidden');
    $('#timer-new-emoji').value = '';
    $('#timer-new-name').value = '';
    timerState.selectedColor = TIMER_COLORS[0];
    $('#timer-color-picks').querySelectorAll('.timer-color-pick').forEach((b, i) => {
      b.classList.toggle('selected', i === 0);
    });
    const catSelect = $('#timer-new-category');
    catSelect.innerHTML = '<option value="">Choose a category</option>';
    loadCategories().forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.textContent = `${cat.emoji} ${cat.name}`;
      catSelect.appendChild(opt);
    });
    const newCategoryBtn = $('#timer-new-category-btn');
    if (newCategoryBtn) newCategoryBtn.style.display = 'none';
    setTimeout(() => $('#timer-new-emoji').focus(), 100);
  };

  window.createActivity = function createActivity() {
    const createBtn = $('#timer-create-save');
    if (createBtn.disabled) return;
    createBtn.disabled = true;

    try {
      const emoji = firstEmoji($('#timer-new-emoji').value.trim()) || '⏱';
      const name = normalizeActivityName($('#timer-new-name').value);
      if (!name) {
        showToast('Enter an activity name');
        $('#timer-new-name').focus();
        createBtn.disabled = false;
        return;
      }

      const acts = loadActivities();
      if (hasDuplicateActivityName(acts, name)) {
        showToast('That activity already exists');
        $('#timer-new-name').focus();
        createBtn.disabled = false;
        return;
      }

      const category = $('#timer-new-category').value || '';
      if (!category) {
        showToast('Choose a category');
        $('#timer-new-category').focus();
        createBtn.disabled = false;
        return;
      }

      acts.push({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        name,
        emoji,
        color: timerState.selectedColor,
        category,
        usageCount: 0,
        lastUsed: null,
        createdAt: Date.now(),
        schema_version: 1,
      });
      saveActivities(acts);
      closeTimerCreateModal();
      renderTimerGrid();
      showToast('Activity created ✓');
    } catch (error) {
      console.error('Error creating activity:', error);
      showToast('Error creating activity');
    } finally {
      setTimeout(() => { createBtn.disabled = false; }, 1000);
    }
  };

  window.openEditActivityModal = function openEditActivityModal(activity) {
    editingActivityId = activity.id;
    $('#timer-edit-modal').classList.remove('hidden');
    $('#timer-edit-emoji').value = activity.emoji;
    $('#timer-edit-name').value = activity.name;

    const nameField = $('#timer-edit-name').closest('.timer-modal-field');
    let categoryField = $('#timer-edit-category');
    if (!categoryField && nameField) {
      const wrap = document.createElement('div');
      wrap.className = 'timer-modal-field';
      wrap.innerHTML = `
        <label>Category</label>
        <select id="timer-edit-category" class="timer-modal-input" required>
          <option value="">Choose a category</option>
        </select>
      `;
      nameField.insertAdjacentElement('afterend', wrap);
      categoryField = $('#timer-edit-category');
    }
    if (categoryField) {
      categoryField.innerHTML = '<option value="">Choose a category</option>';
      loadCategories().forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat.id;
        opt.textContent = `${cat.emoji} ${cat.name}`;
        opt.selected = cat.id === activity.category;
        categoryField.appendChild(opt);
      });
    }

    const picksEl = $('#timer-edit-color-picks');
    picksEl.innerHTML = '';
    TIMER_COLORS.forEach(c => {
      const btn = document.createElement('div');
      btn.className = 'timer-color-pick' + (c === activity.color ? ' selected' : '');
      btn.style.background = c;
      btn.addEventListener('click', () => {
        picksEl.querySelectorAll('.timer-color-pick').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      });
      picksEl.appendChild(btn);
    });

    setTimeout(() => $('#timer-edit-name').focus(), 100);
  };

  window.updateActivity = function updateActivity() {
    if (!editingActivityId) return;
    const saveBtn = $('#timer-edit-save');
    if (saveBtn.disabled) return;
    saveBtn.disabled = true;

    try {
      const emoji = firstEmoji($('#timer-edit-emoji').value.trim()) || '⏱';
      const name = normalizeActivityName($('#timer-edit-name').value);
      if (!name) {
        showToast('Enter an activity name');
        $('#timer-edit-name').focus();
        saveBtn.disabled = false;
        return;
      }

      const category = $('#timer-edit-category')?.value || '';
      if (!category) {
        showToast('Choose a category');
        $('#timer-edit-category')?.focus();
        saveBtn.disabled = false;
        return;
      }

      const acts = loadActivities();
      if (hasDuplicateActivityName(acts, name, editingActivityId)) {
        showToast('That activity already exists');
        $('#timer-edit-name').focus();
        saveBtn.disabled = false;
        return;
      }

      const selectedColorEl = $('#timer-edit-color-picks .timer-color-pick.selected');
      const newColor = selectedColorEl ? selectedColorEl.style.background : '#4CAF50';
      const activity = acts.find(a => a.id === editingActivityId);
      if (activity) {
        activity.emoji = emoji;
        activity.name = name;
        activity.color = newColor;
        activity.category = category;
        activity.schema_version = 1;
        saveActivities(acts);
        closeEditActivityModal();
        renderTimerGrid();
        showToast('Activity updated ✓');
      }
    } catch (error) {
      console.error('Error updating activity:', error);
      showToast('Error updating activity');
    } finally {
      setTimeout(() => { saveBtn.disabled = false; }, 1000);
    }
  };

  window.renderTimerGrid = function renderTimerGrid() {
    renderCategoryFilters();
    const search = ($('#timer-search').value || '').toLowerCase();
    const categories = loadCategories();
    let activities = loadActivities();
    if (search) activities = activities.filter(a => a.name.toLowerCase().includes(search) || a.emoji.includes(search));
    if (timerCategoryFilter) activities = activities.filter(a => a.category === timerCategoryFilter);
    activities = smartSortActivities(activities);

    const grid = $('#timer-grid');
    const empty = $('#timer-empty-activities');
    grid.innerHTML = '';
    if (!activities.length) { empty.classList.add('show'); return; }
    empty.classList.remove('show');

    activities.slice(0, 9).forEach(act => {
      const category = categories.find(cat => cat.id === act.category);
      const btn = document.createElement('div');
      btn.className = 'timer-activity-btn';
      btn.style.borderColor = act.color + '44';
      btn.innerHTML = `
        <span class="timer-act-emoji">${act.emoji}</span>
        <span class="timer-act-name">${act.name}</span>
        ${category ? `<span class="timer-act-category" style="border-color:${category.color};color:${category.color}">${category.emoji} ${category.name}</span>` : ''}
        <div class="timer-act-actions">
          <button class="timer-act-delete" title="Delete activity">✕</button>
        </div>
      `;

      let longPressTimer = null;
      btn.addEventListener('touchstart', () => {
        longPressTimer = setTimeout(() => { longPressTimer = 'fired'; openEditActivityModal(act); }, 600);
      }, { passive: true });
      btn.addEventListener('touchend', () => { if (longPressTimer !== 'fired') clearTimeout(longPressTimer); longPressTimer = null; });
      btn.addEventListener('touchmove', () => { if (longPressTimer !== 'fired') clearTimeout(longPressTimer); }, { passive: true });
      btn.addEventListener('click', (e) => {
        if (e.target.closest('.timer-act-actions') || longPressTimer === 'fired') return;
        startTimer(act);
      });
      btn.querySelector('.timer-act-delete').addEventListener('click', (e) => {
        e.stopPropagation();
        deleteActivity(act.id);
      });
      grid.appendChild(btn);
    });
  };

  const style = document.createElement('style');
  style.textContent = `
    .timer-act-category {
      border: 1px solid;
      border-radius: 999px;
      display: inline-flex;
      font-size: 10px;
      font-weight: 700;
      gap: 4px;
      line-height: 1.2;
      max-width: 100%;
      overflow: hidden;
      padding: 3px 7px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `;
  document.head.appendChild(style);
}

installActivityTaxonomy();

const APP_DATA_TIMEZONE = 'Europe/Helsinki';
const APP_DATA_SOURCE = 'phone_app';
const APP_DATA_SCHEMA_VERSION = 1;
const APP_SESSION_MARKS = {
  distracted: { label: 'Got distracted', quality: 'distracted' },
  improperly_logged: { label: 'Improperly logged', logging_issue: 'improperly_logged' },
};
const APP_SESSION_SCOPES = {
  main: {
    storageKey: 'innerscape_active_timer',
    startField: 'startTime',
    slider: '#timer-quality-slider',
    value: '#timer-quality-value',
    segmentList: '[data-session-segment-list="main"]',
  },
  sub: {
    storageKey: 'innerscape_active_sub',
    startField: 'subStartTime',
    slider: '#timer-sub-quality-slider',
    value: '#timer-sub-quality-value',
    segmentList: '[data-session-segment-list="sub"]',
  },
  subsub: {
    storageKey: 'innerscape_active_subsub',
    startField: 'subSubStartTime',
    slider: '#timer-subsub-quality-slider',
    value: '#timer-subsub-quality-value',
    segmentList: '[data-session-segment-list="subsub"]',
  },
};

function normalizeSessionQualityScore(score, fallback = null) {
  const parsed = parseFloat(score);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.round(Math.max(1, Math.min(10, parsed)) * 10) / 10;
}

function sessionQualityFromScore(score) {
  const numeric = normalizeSessionQualityScore(score, null);
  if (numeric === null) return null;
  if (numeric >= 7) return 'focused';
  if (numeric <= 4) return 'distracted';
  return 'mixed';
}

function sessionQualityLabel(score) {
  const numeric = normalizeSessionQualityScore(score, null);
  if (numeric === null) return 'Not rated';
  const shown = numeric.toFixed(1);
  if (numeric <= 3) return `${shown}/10 scattered`;
  if (numeric <= 6) return `${shown}/10 mixed`;
  if (numeric <= 8) return `${shown}/10 steady`;
  return `${shown}/10 focused`;
}

function updateSessionQualitySlider(slider, score = 5) {
  if (!slider) return;
  const numeric = normalizeSessionQualityScore(score, 5);
  const pct = ((numeric - 1) / 9) * 100;
  const color = typeof gradientColor === 'function' ? gradientColor(numeric) : '#a78bfa';
  slider.style.setProperty('--timer-quality-color', color);
  slider.style.background = `linear-gradient(to right, ${color} 0%, ${color} ${pct}%, #1e1e2a ${pct}%)`;
}

function compactMinuteLabel(value) {
  const numeric = parseFloat(value);
  if (!Number.isFinite(numeric)) return '0';
  return Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(1).replace(/\.0$/, '');
}

function escapeTimerHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}

function roundSessionMinute(value) {
  const parsed = parseFloat(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(Math.max(0, parsed) * 10) / 10;
}

function getSessionQualitySegments(record, durationMs = null) {
  const rawSegments = record?.sessionQualitySegments || record?.session_quality_segments || [];
  if (!Array.isArray(rawSegments)) return [];
  const maxMinutes = Number.isFinite(durationMs) && durationMs > 0
    ? Math.round((durationMs / 60000) * 10) / 10
    : null;

  return rawSegments.map((segment, index) => {
    let startMin = roundSessionMinute(segment.start_min ?? segment.startMin ?? segment.start_minutes ?? segment.start ?? 0);
    let endMin = roundSessionMinute(segment.end_min ?? segment.endMin ?? segment.end_minutes ?? segment.end ?? startMin + 15);
    if (maxMinutes !== null) {
      startMin = Math.min(startMin, maxMinutes);
      endMin = Math.min(endMin, maxMinutes);
    }
    if (endMin <= startMin) {
      endMin = maxMinutes !== null ? Math.min(maxMinutes, startMin + 0.1) : startMin + 1;
    }
    if (endMin <= startMin && maxMinutes !== null) {
      startMin = Math.max(0, endMin - 0.1);
    }
    const score = normalizeSessionQualityScore(segment.quality_score ?? segment.score ?? segment.session_quality_score, 5);
    return {
      id: segment.id || `quality-segment-${index}`,
      start_min: roundSessionMinute(startMin),
      end_min: roundSessionMinute(endMin),
      quality_score: score,
      label: sessionQualityLabel(score),
      note: String(segment.note ?? segment.notes ?? '').trim(),
    };
  }).filter(segment => segment.end_min > segment.start_min)
    .sort((a, b) => a.start_min - b.start_min || a.end_min - b.end_min);
}

function averageSessionQualitySegments(segments) {
  if (!Array.isArray(segments) || !segments.length) return null;
  let weightedTotal = 0;
  let totalMinutes = 0;
  segments.forEach(segment => {
    const minutes = Math.max(0, segment.end_min - segment.start_min);
    if (!minutes) return;
    weightedTotal += minutes * segment.quality_score;
    totalMinutes += minutes;
  });
  if (!totalMinutes) return null;
  return normalizeSessionQualityScore(weightedTotal / totalMinutes, null);
}

function activeSessionElapsedMinutes(scope = 'main') {
  const config = APP_SESSION_SCOPES[scope] || APP_SESSION_SCOPES.main;
  const record = loadActiveTimerRecord(scope);
  const start = record?.[config.startField];
  if (!start) return 0;
  return Math.max(1, Math.ceil((Date.now() - start) / 60000));
}

function saveSessionQualitySegments(scope, segments, shouldRender = true) {
  const record = loadActiveTimerRecord(scope);
  const config = APP_SESSION_SCOPES[scope] || APP_SESSION_SCOPES.main;
  if (!record || !record[config.startField]) return;
  const normalized = getSessionQualitySegments({ sessionQualitySegments: segments });
  const next = { ...record, sessionQualitySegments: normalized };
  saveActiveTimerRecord(next, scope);
  if (shouldRender) renderSessionQualitySegments(next, scope);
}

function addSessionQualitySegment(scope = 'main') {
  const record = loadActiveTimerRecord(scope);
  const config = APP_SESSION_SCOPES[scope] || APP_SESSION_SCOPES.main;
  if (!record || !record[config.startField]) return;
  const segments = getSessionQualitySegments(record);
  const lastEnd = segments.length ? Math.max(...segments.map(segment => segment.end_min)) : 0;
  const elapsedMinutes = activeSessionElapsedMinutes(scope);
  const startMin = roundSessionMinute(lastEnd);
  const endMin = roundSessionMinute(Math.max(startMin + 1, Math.min(startMin + 15, Math.max(elapsedMinutes, startMin + 15))));
  const previousScore = segments.length ? segments[segments.length - 1].quality_score : 5;
  const score = normalizeSessionQualityScore(record.sessionQualityScore, previousScore);
  segments.push({
    id: `quality-segment-${Date.now().toString(36)}`,
    start_min: startMin,
    end_min: endMin,
    quality_score: score,
    label: sessionQualityLabel(score),
    note: '',
  });
  saveSessionQualitySegments(scope, segments);
  showToast('Quality segment added');
}

function removeSessionQualitySegment(scope, index) {
  const record = loadActiveTimerRecord(scope);
  if (!record) return;
  const segments = getSessionQualitySegments(record);
  segments.splice(index, 1);
  saveSessionQualitySegments(scope, segments);
}

function updateSessionQualitySegment(scope, index, patch, shouldRender = true) {
  const record = loadActiveTimerRecord(scope);
  if (!record) return;
  const segments = getSessionQualitySegments(record);
  if (!segments[index]) return;
  segments[index] = { ...segments[index], ...patch };
  saveSessionQualitySegments(scope, segments, shouldRender);
}

function renderSessionQualitySegments(record = null, scope = 'main') {
  const config = APP_SESSION_SCOPES[scope] || APP_SESSION_SCOPES.main;
  const list = $(config.segmentList);
  const activeRecord = record || loadActiveTimerRecord(scope);
  if (!record && scope === 'main') {
    renderSessionQualitySegments(null, 'sub');
    renderSessionQualitySegments(null, 'subsub');
  }
  if (!list) return;
  const segments = getSessionQualitySegments(activeRecord);
  list.innerHTML = '';
  if (!activeRecord?.[config.startField]) {
    list.innerHTML = '<div class="timer-quality-empty">No active session</div>';
    return;
  }
  if (!segments.length) {
    list.innerHTML = '<div class="timer-quality-empty">No quality segments yet</div>';
    return;
  }

  segments.forEach((segment, index) => {
    const row = document.createElement('div');
    row.className = 'timer-quality-segment-row';
    row.dataset.segmentIndex = String(index);
    row.dataset.sessionScope = scope;
    row.innerHTML = `
      <div class="timer-quality-segment-times">
        <label>From <input class="timer-quality-segment-time" data-time-field="start_min" type="number" min="0" step="0.5" value="${compactMinuteLabel(segment.start_min)}"> min</label>
        <label>To <input class="timer-quality-segment-time" data-time-field="end_min" type="number" min="0" step="0.5" value="${compactMinuteLabel(segment.end_min)}"> min</label>
        <button class="timer-quality-remove" type="button" title="Remove segment">×</button>
      </div>
      <div class="timer-quality-segment-score">
        <input class="timer-quality-slider timer-quality-segment-slider" type="range" min="1" max="10" step="0.1" value="${segment.quality_score}" data-session-scope="${scope}" data-segment-index="${index}">
        <strong class="timer-quality-segment-value">${sessionQualityLabel(segment.quality_score)}</strong>
      </div>
      <input class="timer-quality-segment-note" type="text" value="${escapeTimerHtml(segment.note)}" placeholder="Note for this slice">
    `;
    list.appendChild(row);
    updateSessionQualitySlider(row.querySelector('.timer-quality-segment-slider'), segment.quality_score);
  });
}

function renderTimeEntryQualitySegments(segments) {
  const normalized = getSessionQualitySegments({ sessionQualitySegments: segments });
  if (!normalized.length) return '';
  const shown = normalized.slice(0, 4).map(segment => (
    `<span class="timer-quality-segment-chip">${compactMinuteLabel(segment.start_min)}-${compactMinuteLabel(segment.end_min)}m: ${segment.quality_score.toFixed(1)}${segment.note ? ` · ${escapeTimerHtml(segment.note.slice(0, 42))}` : ''}</span>`
  )).join('');
  const extra = normalized.length > 4 ? `<span class="timer-quality-segment-chip">+${normalized.length - 4}</span>` : '';
  return `<div class="timer-quality-segment-summary">${shown}${extra}</div>`;
}

function appDataLocalDate(ts) {
  return dayKey(ts || Date.now());
}

function appDataMeta(ts) {
  return {
    local_date: appDataLocalDate(ts),
    timezone: APP_DATA_TIMEZONE,
    schema_version: APP_DATA_SCHEMA_VERSION,
    source: APP_DATA_SOURCE,
  };
}

function normalizeEntryEnvironment(entry) {
  if (!entry) return null;
  const raw = entry.environment && typeof entry.environment === 'object' ? entry.environment : {};
  const id = raw.id || entry.environment_id || null;
  const name = raw.name || entry.environment_name || null;
  if (!id && !name) return null;
  return {
    id,
    name,
    emoji: raw.emoji || entry.environment_emoji || null,
    color: raw.color || entry.environment_color || null,
    activated_at: raw.activated_at || entry.environment_started_at || null,
  };
}

function normalizeCheckinEntry(entry) {
  if (!entry) return entry;
  const ts = entry.ts || Date.now();
  return {
    ...entry,
    id: entry.id || ('ci-' + ts),
    ts,
    scores: entry.scores || {},
    notes: entry.notes || {},
    score_scale: entry.score_scale || { min: 1, max: 10, step: 0.1 },
    ...appDataMeta(ts),
  };
}

function normalizeTimeEntry(entry) {
  if (!entry) return entry;
  const startTime = entry.startTime || entry.start_time || Date.now();
  const hasSubLayer = entry.subActivityId || entry.subSubActivityId || entry.subActivityName || entry.subSubActivityName;
  const stableId = `te-${startTime}-${entry.activityId || entry.activity_id || 'activity'}-${entry.subActivityId || entry.subSubActivityId || 'main'}`;
  const environment = normalizeEntryEnvironment(entry);
  return {
    ...entry,
    id: entry.id || stableId,
    startTime,
    endTime: entry.endTime || entry.end_time || null,
    tracking_mode: entry.tracking_mode || entry.trackingMode || (hasSubLayer ? 'annotation' : 'primary'),
    parent_entry_id: entry.parent_entry_id || entry.parentEntryId || null,
    intensity: entry.intensity ?? null,
    session_quality: entry.session_quality || entry.sessionQuality || null,
    session_quality_score: entry.session_quality_score ?? entry.sessionQualityScore ?? null,
    session_quality_segments: getSessionQualitySegments({
      sessionQualitySegments: entry.session_quality_segments || entry.sessionQualitySegments || [],
    }),
    logging_issue: entry.logging_issue || entry.loggingIssue || null,
    session_marks: Array.isArray(entry.session_marks) ? entry.session_marks : (Array.isArray(entry.sessionMarks) ? entry.sessionMarks : []),
    environment,
    environment_id: environment?.id || null,
    environment_name: environment?.name || null,
    environment_emoji: environment?.emoji || null,
    environment_color: environment?.color || null,
    environment_started_at: environment?.activated_at || null,
    ...appDataMeta(startTime),
  };
}

function loadActiveTimerRecord(scope = 'main') {
  const config = APP_SESSION_SCOPES[scope] || APP_SESSION_SCOPES.main;
  try { return JSON.parse(localStorage.getItem(config.storageKey) || 'null'); } catch { return null; }
}

function saveActiveTimerRecord(record, scope = 'main') {
  const config = APP_SESSION_SCOPES[scope] || APP_SESSION_SCOPES.main;
  if (!record) return;
  localStorage.setItem(config.storageKey, JSON.stringify(record));
}

function renderSessionMarkButtons(record = null, scope = 'main') {
  const config = APP_SESSION_SCOPES[scope] || APP_SESSION_SCOPES.main;
  const activeRecord = record || loadActiveTimerRecord(scope);
  if (!record && scope === 'main') {
    renderSessionMarkButtons(null, 'sub');
    renderSessionMarkButtons(null, 'subsub');
  }
  const quality = activeRecord?.sessionQuality || null;
  const issue = activeRecord?.loggingIssue || null;
  $$(`.timer-session-tag[data-session-scope="${scope}"]`).forEach(btn => {
    const tag = btn.dataset.sessionTag;
    btn.classList.toggle('active', (tag === quality) || (tag === issue));
  });
  const slider = $(config.slider);
  const value = $(config.value);
  const score = activeRecord?.sessionQualityScore || null;
  if (slider) {
    slider.value = score || 5;
    updateSessionQualitySlider(slider, slider.value);
  }
  if (value) value.textContent = sessionQualityLabel(score);
  renderSessionQualitySegments(activeRecord, scope);
}

function setSessionQualityScore(score, recordMark = true, scope = 'main') {
  const config = APP_SESSION_SCOPES[scope] || APP_SESSION_SCOPES.main;
  const record = loadActiveTimerRecord(scope);
  if (!record || !record[config.startField]) return;
  const normalizedScore = normalizeSessionQualityScore(score, 5);
  const next = { ...record };
  const elapsedMs = Math.max(0, Date.now() - record[config.startField]);
  next.sessionQualityScore = normalizedScore;
  next.sessionQuality = sessionQualityFromScore(normalizedScore);
  next.sessionMarks = Array.isArray(record.sessionMarks) ? [...record.sessionMarks] : [];
  if (recordMark) {
    next.sessionMarks.push({
      type: 'quality_score',
      label: sessionQualityLabel(normalizedScore),
      score: normalizedScore,
      ts: Date.now(),
      elapsed_ms: elapsedMs,
    });
  }
  saveActiveTimerRecord(next, scope);
  renderSessionMarkButtons(next, scope);
}

function toggleSessionMark(tag, scope = 'main') {
  const config = APP_SESSION_MARKS[tag];
  const scopeConfig = APP_SESSION_SCOPES[scope] || APP_SESSION_SCOPES.main;
  const record = loadActiveTimerRecord(scope);
  if (!config || !record || !record[scopeConfig.startField]) return;

  const next = { ...record };
  const elapsedMs = Math.max(0, Date.now() - record[scopeConfig.startField]);
  next.sessionMarks = Array.isArray(record.sessionMarks) ? [...record.sessionMarks] : [];

  if (config.quality) {
    next.sessionQuality = record.sessionQuality === tag ? null : tag;
  }
  if (config.logging_issue) {
    next.loggingIssue = record.loggingIssue === tag ? null : tag;
  }

  next.sessionMarks.push({
    type: tag,
    label: config.label,
    active: (config.quality && next.sessionQuality === tag) || (config.logging_issue && next.loggingIssue === tag),
    ts: Date.now(),
    elapsed_ms: elapsedMs,
  });
  saveActiveTimerRecord(next, scope);
  renderSessionMarkButtons(next, scope);
  showToast(`${config.label} noted`);
}

function collectSessionMeta(scope = 'main', endTime = Date.now()) {
  const config = APP_SESSION_SCOPES[scope] || APP_SESSION_SCOPES.main;
  const record = loadActiveTimerRecord(scope) || {};
  const durationMs = record[config.startField] ? Math.max(0, endTime - record[config.startField]) : null;
  const segments = getSessionQualitySegments(record, durationMs);
  const segmentAverage = averageSessionQualitySegments(segments);
  const qualityScore = record.sessionQualityScore ?? segmentAverage;
  const environmentContext = typeof getTimerEnvironmentContext === 'function'
    ? getTimerEnvironmentContext(scope)
    : {};
  return {
    session_quality: record.sessionQuality || sessionQualityFromScore(segmentAverage),
    session_quality_score: qualityScore ?? null,
    session_quality_segments: segments,
    logging_issue: record.loggingIssue || null,
    session_marks: Array.isArray(record.sessionMarks) ? record.sessionMarks : [],
    ...environmentContext,
  };
}

function isFoodTimerActivity(activity) {
  if (!activity) return false;
  if (activity.category === 'food_nourishment') return true;
  const name = activityNameKey(activity.name || '');
  return /\b(food|eat|eating|meal|breakfast|lunch|dinner|snack|drink|cook|cooking|groceries)\b/.test(name);
}

function inferTimerMealType() {
  if (typeof inferMealType === 'function') return inferMealType();
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 16) return 'lunch';
  if (hour >= 16 && hour < 22) return 'dinner';
  return 'snack';
}

function renderTimerFoodPanel(activity) {
  const panel = $('#timer-food-panel');
  if (!panel) return;
  const shouldShow = isFoodTimerActivity(activity);
  panel.classList.toggle('hidden', !shouldShow);
  if (!shouldShow) return;
  const mealType = $('#timer-food-meal-type');
  if (mealType && !mealType.value) mealType.value = inferTimerMealType();
  const val = $('#timer-food-satisfaction-val');
  const slider = $('#timer-food-satisfaction');
  if (val && slider) val.textContent = slider.value;
}

function resetTimerFoodPanel() {
  $('#timer-food-description').value = '';
  $('#timer-food-satisfaction').value = '5';
  $('#timer-food-satisfaction-val').textContent = '5';
  $('#timer-food-meal-type').value = inferTimerMealType();
  $$('.timer-food-context-btn').forEach(btn => btn.classList.remove('selected'));
}

function saveTimerFoodEntry() {
  const panel = $('#timer-food-panel');
  if (!panel || panel.classList.contains('hidden')) return;
  const activity = loadActivities().find(a => a.id === timerState.activeActivityId);
  if (!activity) return;
  const description = $('#timer-food-description').value.trim();
  if (!description) {
    showToast('Write what you ate or drank');
    $('#timer-food-description').focus();
    return;
  }
  const mealType = $('#timer-food-meal-type').value || inferTimerMealType();
  const contexts = $$('.timer-food-context-btn.selected').map(btn => btn.dataset.foodContext);
  const entry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    timestamp: Date.now(),
    mealType,
    category: mealType,
    description,
    satisfaction: parseInt($('#timer-food-satisfaction').value, 10) || 5,
    tags: ['timer-linked'],
    contexts,
    captureMode: 'timer_food_log',
    linkedActivityId: activity.id,
    linkedActivityName: activity.name,
    linkedTimerStartTime: timerState.startTime,
    linkedSubActivityId: timerState.activeSubActivityId || null,
    linkedSubSubActivityId: timerState.activeSubSubActivityId || null,
    ...(typeof getTimerEnvironmentContext === 'function' ? getTimerEnvironmentContext('current') : {}),
  };
  if (typeof saveFoodEntry === 'function') saveFoodEntry(entry);
  else {
    const entries = loadFoodEntries();
    entries.push(entry);
    safeSave(FOOD_STORE_KEY, entries);
  }
  resetTimerFoodPanel();
  if (typeof renderFoodHistory === 'function') renderFoodHistory();
  showToast('Food logged while timer keeps running');
}

function normalizeJsonDataShape(entry, type) {
  const now = Date.now();
  const base = { ...(entry || {}) };
  const ts = base.ts || base.timestamp || base.createdAt || now;
  const meta = appDataMeta(ts);
  if (type === 'todo') {
    return {
      text: base.text || base.title || '',
      category: base.category || 'other',
      priority: base.priority ?? 3,
      completed: !!base.completed,
      createdAt: base.createdAt || ts,
      completedAt: base.completedAt || null,
      notes: base.notes || '',
      ...base,
      ...meta,
    };
  }
  if (type === 'wish') {
    return {
      text: base.text || '',
      category: base.category || 'general',
      type: base.type || 'recurring',
      level: base.level || 'someday',
      completed: !!base.completed,
      createdAt: base.createdAt || ts,
      updatedAt: base.updatedAt || ts,
      notes: base.notes || '',
      ...base,
      ...meta,
    };
  }
  if (type === 'meditation') {
    return {
      ts,
      duration: base.duration || base.durationMs || null,
      mood: base.mood || null,
      rounds: base.rounds || base.meditationRounds || null,
      notes: base.notes || base.note || '',
      ...base,
      ...meta,
    };
  }
  if (type === 'stool') {
    return {
      bristol: base.bristol || null,
      amount: base.amount || null,
      manner: base.manner || null,
      symptoms: base.symptoms || [],
      notes: base.notes || '',
      ...base,
      ...meta,
    };
  }
  return { ...base, ...meta };
}

function findPrimaryOverlaps(candidate, entries) {
  if (!candidate.startTime || !candidate.endTime) return [];
  return entries.filter(entry => (
    entry.id !== candidate.id &&
    (entry.tracking_mode || entry.trackingMode || 'primary') === 'primary' &&
    entry.startTime < candidate.endTime &&
    entry.endTime > candidate.startTime
  ));
}

function chooseTrackingModeForEntry(candidate, entries) {
  const normalized = normalizeTimeEntry(candidate);
  if (normalized.tracking_mode !== 'primary') return normalized;
  const overlaps = findPrimaryOverlaps(normalized, entries.map(normalizeTimeEntry));
  if (!overlaps.length) return normalized;

  const message = [
    'This overlaps another main time entry.',
    '',
    'Type p for parallel, a for annotation, or leave blank to keep it as primary.',
  ].join('\n');
  const answer = (prompt(message, 'p') || '').trim().toLowerCase();
  if (answer.startsWith('a')) normalized.tracking_mode = 'annotation';
  else if (answer.startsWith('p')) normalized.tracking_mode = 'parallel';
  return normalized;
}

function installDataHandoffLayer() {
  const originalSyncMoodEntries = typeof syncMoodEntries === 'function' ? syncMoodEntries : null;
  const originalSyncTimeEntries = typeof syncTimeEntries === 'function' ? syncTimeEntries : null;
  const originalSyncActivities = typeof syncActivities === 'function' ? syncActivities : null;
  const originalShowActiveTimer = typeof showActiveTimer === 'function' ? showActiveTimer : null;

  document.addEventListener('click', (event) => {
    const btn = event.target.closest('.timer-session-tag');
    if (!btn) return;
    toggleSessionMark(btn.dataset.sessionTag, btn.dataset.sessionScope || 'main');
  });
  document.addEventListener('click', (event) => {
    const addBtn = event.target.closest('.timer-quality-add');
    if (addBtn) {
      addSessionQualitySegment(addBtn.dataset.sessionScope || 'main');
      return;
    }

    const removeBtn = event.target.closest('.timer-quality-remove');
    if (!removeBtn) return;
    const row = removeBtn.closest('.timer-quality-segment-row');
    if (!row) return;
    removeSessionQualitySegment(row.dataset.sessionScope || 'main', parseInt(row.dataset.segmentIndex, 10));
  });
  document.addEventListener('input', (event) => {
    if (!event.target?.classList?.contains('timer-quality-slider') || event.target.classList.contains('timer-quality-segment-slider')) return;
    setSessionQualityScore(event.target.value, false, event.target.dataset.sessionScope || 'main');
  });
  document.addEventListener('change', (event) => {
    if (!event.target?.classList?.contains('timer-quality-slider') || event.target.classList.contains('timer-quality-segment-slider')) return;
    setSessionQualityScore(event.target.value, true, event.target.dataset.sessionScope || 'main');
  });
  document.addEventListener('input', (event) => {
    const slider = event.target.closest('.timer-quality-segment-slider');
    if (!slider) {
      const noteInput = event.target.closest('.timer-quality-segment-note');
      if (!noteInput) return;
      const row = noteInput.closest('.timer-quality-segment-row');
      if (!row) return;
      updateSessionQualitySegment(row.dataset.sessionScope || 'main', parseInt(row.dataset.segmentIndex, 10), {
        note: noteInput.value,
      }, false);
      return;
    }
    const scope = slider.dataset.sessionScope || 'main';
    const index = parseInt(slider.dataset.segmentIndex, 10);
    const score = normalizeSessionQualityScore(slider.value, 5);
    updateSessionQualitySlider(slider, score);
    const row = slider.closest('.timer-quality-segment-row');
    const value = row?.querySelector('.timer-quality-segment-value');
    if (value) value.textContent = sessionQualityLabel(score);
    updateSessionQualitySegment(scope, index, {
      quality_score: score,
      label: sessionQualityLabel(score),
    }, false);
  });
  document.addEventListener('change', (event) => {
    const input = event.target.closest('.timer-quality-segment-time');
    if (!input) return;
    const row = input.closest('.timer-quality-segment-row');
    if (!row) return;
    updateSessionQualitySegment(row.dataset.sessionScope || 'main', parseInt(row.dataset.segmentIndex, 10), {
      [input.dataset.timeField]: roundSessionMinute(input.value),
    });
  });
  document.addEventListener('click', (event) => {
    const btn = event.target.closest('.timer-food-context-btn');
    if (!btn) return;
    btn.classList.toggle('selected');
  });
  const timerFoodSlider = $('#timer-food-satisfaction');
  if (timerFoodSlider) {
    timerFoodSlider.addEventListener('input', () => {
      $('#timer-food-satisfaction-val').textContent = timerFoodSlider.value;
    });
  }
  const timerFoodSave = $('#timer-food-save');
  if (timerFoodSave) timerFoodSave.addEventListener('click', saveTimerFoodEntry);

  if (originalShowActiveTimer) {
    window.showActiveTimer = function showActiveTimer(activity) {
      originalShowActiveTimer(activity);
      renderSessionMarkButtons();
      renderTimerFoodPanel(activity);
    };
  }

  window.loadEntries = function loadEntries() {
    try { return (JSON.parse(localStorage.getItem(STORE_KEY)) || []).map(normalizeCheckinEntry); } catch { return []; }
  };

  async function appendCheckinToBackup(entry, key = STORE_KEY + '_pending') {
    const existing = await idbGet(key) || [];
    const entryKey = entry.id || entry.ts;
    if (!existing.some(e => (e.id || e.ts) === entryKey)) {
      existing.push(entry);
      await idbSet(key, existing);
    }
  }

  function syncCheckinsSoon() {
    if (typeof syncToSupabase === 'function') {
      setTimeout(() => syncToSupabase(false), 500);
    } else if (originalSyncMoodEntries) {
      setTimeout(() => originalSyncMoodEntries(), 500);
    }
  }

  window.saveEntry = function saveEntry(entry) {
    const normalized = normalizeCheckinEntry(entry);
    const entries = loadEntries();
    entries.push(normalized);
    const saved = safeSave(STORE_KEY, entries);
    if (!saved) {
      appendCheckinToBackup(normalized, STORE_KEY + '_pending')
        .then(() => appendCheckinToBackup(normalized, STORE_KEY + '_archive'))
        .catch(error => console.warn('Check-in backup save failed:', error));
    }
    syncCheckinsSoon();
    return saved;
  };

  window.loadTimeEntries = function loadTimeEntries() {
    try { return (JSON.parse(localStorage.getItem(TIME_ENTRIES_KEY)) || []).map(normalizeTimeEntry); } catch { return []; }
  };

  window.saveTimeEntries = function saveTimeEntries(entries) {
    safeSave(TIME_ENTRIES_KEY, entries.map(normalizeTimeEntry));
    if (currentUser && db && originalSyncTimeEntries) setTimeout(() => originalSyncTimeEntries(), 100);
  };

  const baseSaveActivities = window.saveActivities;
  window.saveActivities = function saveActivities(acts) {
    const normalized = acts.map(activity => ({
      ...normalizeActivity(activity),
      source: APP_DATA_SOURCE,
      schema_version: APP_DATA_SCHEMA_VERSION,
    }));
    localStorage.setItem(ACTIVITIES_KEY, JSON.stringify(normalized));
    if (currentUser && db && originalSyncActivities) setTimeout(() => originalSyncActivities(), 100);
    else if (typeof baseSaveActivities === 'function') return;
  };

  window.saveSessionDirectly = function saveSessionDirectly() {
    if (!timerState.activeActivityId || !timerState.startTime) return;
    clearInterval(timerState.interval);

    try {
      const entries = loadTimeEntries();
      const now = Date.now();

      if (timerState.activeSubActivityId && timerState.subStartTime) {
        entries.push(normalizeTimeEntry({
          activityId: timerState.activeActivityId,
          subActivityId: timerState.activeSubActivityId,
          startTime: timerState.subStartTime,
          endTime: now,
          tracking_mode: 'annotation',
          ...collectSessionMeta('sub', now),
        }));
      }

      const notesField = $('#timer-session-notes');
      const note = notesField ? notesField.value.trim() : '';
      const activeRecord = collectSessionMeta('main', now);
      let entry = {
        activityId: timerState.activeActivityId,
        startTime: timerState.startTime,
        endTime: now,
        tracking_mode: 'primary',
        ...activeRecord,
      };
      if (note) {
        entry.note = note;
        entry.note_type = 'session_reflection';
        entry.privacy_level = 'normal';
      }
      entry = chooseTrackingModeForEntry(entry, entries);
      entries.push(entry);
      saveTimeEntries(entries);

      localStorage.removeItem('innerscape_active_timer');
      localStorage.removeItem('innerscape_active_sub');
      localStorage.removeItem('innerscape_active_subsub');
      localStorage.removeItem(`innerscape_timer_notes_${timerState.activeActivityId}`);

      const act = loadActivities().find(a => a.id === timerState.activeActivityId);
      timerState.activeActivityId = null;
      timerState.activeSubActivityId = null;
      timerState.startTime = null;
      timerState.subStartTime = null;

      $('#timer-sub-display').classList.add('hidden');
      $('#timer-session-display').classList.remove('hidden');
      $('#timer-active').classList.add('hidden');
      $('#timer-main').classList.remove('hidden');
      renderSessionMarkButtons(null);
      $('#timer-food-panel')?.classList.add('hidden');
      renderTimerGrid();
      renderTimerStats();
      showToast(`${act ? act.emoji : '⏱'} Session saved ✓`);
    } catch (err) {
      console.error('Save session error:', err);
      showToast('Error saving session');
    }
  };

  window.saveManualEntry = function saveManualEntry() {
    const actId = $('#timer-manual-activity').value;
    const date = $('#timer-manual-date').value;
    const startStr = $('#timer-manual-start').value;
    const endStr = $('#timer-manual-end').value;
    if (!actId || !date || !startStr || !endStr) { showToast('Fill in all fields'); return; }
    const startTime = new Date(`${date}T${startStr}`).getTime();
    const endTime = new Date(`${date}T${endStr}`).getTime();
    if (endTime <= startTime) { showToast('End time must be after start'); return; }
    const note = ($('#timer-manual-note') ? $('#timer-manual-note').value : '').trim();
    const entries = loadTimeEntries();
    let newEntry = {
      activityId: actId,
      startTime,
      endTime,
      tracking_mode: 'primary',
      ...(typeof getTimerEnvironmentContext === 'function' ? getTimerEnvironmentContext('current') : {}),
    };
    if (note) {
      newEntry.note = note;
      newEntry.note_type = 'manual_context';
      newEntry.privacy_level = 'normal';
    }
    newEntry = chooseTrackingModeForEntry(newEntry, entries);
    entries.push(newEntry);
    saveTimeEntries(entries);
    closeTimerManualModal();
    renderTimerStats();
    showToast('Entry added ✓');
  };

  window.saveEditEntry = function saveEditEntry() {
    if (!editingEntryId) return;
    const btn = $('#entry-edit-save');
    if (btn.disabled) return;
    btn.disabled = true;

    try {
      const date = $('#entry-edit-date').value;
      const startTime = $('#entry-edit-start').value;
      const endTime = $('#entry-edit-end').value;
      const note = $('#entry-edit-note').value.trim();
      if (!date || !startTime || !endTime) {
        showToast('Fill in date and times');
        btn.disabled = false;
        return;
      }
      const startMs = new Date(`${date}T${startTime}`).getTime();
      let endMs = new Date(`${date}T${endTime}`).getTime();
      if (endMs <= startMs) endMs += 86400000;

      const entries = loadTimeEntries();
      const entry = entries.find(e => e.id === editingEntryId);
      if (entry) {
        entry.startTime = startMs;
        entry.endTime = endMs;
        entry.note = note || undefined;
        if (note) {
          entry.note_type = entry.note_type || 'session_reflection';
          entry.privacy_level = entry.privacy_level || 'normal';
        }
        Object.assign(entry, appDataMeta(startMs));
        saveTimeEntries(entries);
        closeEditEntryModal();
        renderTimerStats();
        showToast('Entry updated ✓');
      }
    } finally {
      btn.disabled = false;
    }
  };

  const baseSaveQuickNote = window.saveQuickNote;
  window.saveQuickNote = function saveQuickNote() {
    const text = $('#quick-note-text').value.trim();
    if (!text) { showToast('Write something first'); return; }
    const ts = Date.now();
    const notes = JSON.parse(localStorage.getItem('innerscape_quick_notes') || '[]');
    notes.unshift({
      id: 'qn-' + ts,
      ts,
      text,
      note_type: 'quick_note',
      privacy_level: 'normal',
      ...appDataMeta(ts),
    });
    localStorage.setItem('innerscape_quick_notes', JSON.stringify(notes));
    $('#quick-note-text').value = '';
    showToast('📝 Note saved');
    renderQuickNotes();
    if (typeof syncToSupabase === 'function') setTimeout(() => syncToSupabase(false), 500);
  };
  if (!baseSaveQuickNote) window.saveQuickNote = window.saveQuickNote;

  const baseSaveTodos = window.saveTodos;
  if (typeof baseSaveTodos === 'function') {
    window.saveTodos = function saveTodos(todos) {
      baseSaveTodos(todos.map(todo => ({ ...todo, data_shape: 'todo', ...normalizeJsonDataShape(todo, 'todo') })));
    };
  }

  const baseSaveWishes = window.saveWishes;
  if (typeof baseSaveWishes === 'function') {
    window.saveWishes = function saveWishes(wishes) {
      baseSaveWishes(wishes.map(wish => ({ ...wish, data_shape: 'wish', ...normalizeJsonDataShape(wish, 'wish') })));
    };
  }

  const baseSaveMeditation = window.saveMeditation;
  if (typeof baseSaveMeditation === 'function') {
    window.saveMeditation = function saveMeditation(entry) {
      baseSaveMeditation(normalizeJsonDataShape(entry, 'meditation'));
    };
  }
}

installDataHandoffLayer();

function loadIntegrationSyncStatus() {
  try { return JSON.parse(localStorage.getItem('innerscape_integration_sync_status') || '{}'); } catch { return {}; }
}

function saveIntegrationSyncStatus(status) {
  localStorage.setItem('innerscape_integration_sync_status', JSON.stringify(status));
}

function updateIntegrationSyncStatus(integration, patch) {
  const status = loadIntegrationSyncStatus();
  status[integration] = {
    ...(status[integration] || {}),
    ...patch,
    updated_at: new Date().toISOString(),
  };
  saveIntegrationSyncStatus(status);
}

function installIntegrationStatusTracking() {
  const originalSyncOuraData = window.syncOuraData;
  if (typeof originalSyncOuraData === 'function') {
    window.syncOuraData = async function syncOuraData() {
      updateIntegrationSyncStatus('oura', {
        last_attempt_at: new Date().toISOString(),
        status: 'syncing',
        error: null,
      });
      try {
        const result = await originalSyncOuraData();
        const current = loadIntegrationSyncStatus().oura;
        if (current?.status === 'error') return result;
        updateIntegrationSyncStatus('oura', {
          last_success_at: new Date().toISOString(),
          status: 'ok',
          error: null,
        });
        return result;
      } catch (error) {
        updateIntegrationSyncStatus('oura', {
          status: 'error',
          error: error.message || String(error),
        });
        throw error;
      }
    };
  }
}

function getLatestOuraDay() {
  try {
    const data = JSON.parse(localStorage.getItem('innerscape_oura_data') || '{}');
    const days = ['sleep', 'readiness', 'activity'].flatMap(key => (data[key] || []).map(row => row.day).filter(Boolean));
    if (!days.length) return null;
    return days.sort().at(-1);
  } catch {
    return null;
  }
}

function getDataQualityWarnings() {
  const warnings = [];
  const activities = loadActivities();
  const timeEntries = loadTimeEntries();
  const activityById = new Map(activities.map(activity => [activity.id, activity]));
  const now = Date.now();
  const savedActive = (() => { try { return JSON.parse(localStorage.getItem('innerscape_active_timer') || 'null'); } catch { return null; } })();

  if (savedActive?.startTime && now - savedActive.startTime > 12 * 60 * 60 * 1000) {
    warnings.push({ level: 'high', text: 'There is an open timer older than 12 hours.' });
  }

  const brokenEntries = timeEntries.filter(entry => entry.endTime && entry.startTime && entry.endTime <= entry.startTime);
  if (brokenEntries.length) {
    warnings.push({ level: 'high', text: `${brokenEntries.length} time ${brokenEntries.length === 1 ? 'entry has' : 'entries have'} an end before the start.` });
  }

  const missingCategory = activities.filter(activity => !activity.category);
  if (missingCategory.length) {
    warnings.push({ level: 'medium', text: `${missingCategory.length} activities still need a category.` });
  }

  const names = new Map();
  activities.forEach(activity => {
    const key = activityNameKey(activity.name);
    names.set(key, (names.get(key) || 0) + 1);
  });
  const duplicateNames = [...names.values()].filter(count => count > 1).length;
  if (duplicateNames) {
    warnings.push({ level: 'medium', text: `${duplicateNames} duplicate-looking activity names need review.` });
  }

  const uncategorizedEntries = timeEntries.filter(entry => {
    const activity = activityById.get(entry.activityId);
    return activity && !activity.category;
  });
  if (uncategorizedEntries.length) {
    warnings.push({ level: 'medium', text: `${uncategorizedEntries.length} time entries are attached to uncategorized activities.` });
  }

  const latestOuraDay = getLatestOuraDay();
  if (latestOuraDay) {
    const ageDays = Math.floor((startOfDay(new Date()).getTime() - new Date(`${latestOuraDay}T00:00`).getTime()) / 86400000);
    if (ageDays > 7) warnings.push({ level: 'medium', text: `Oura data looks ${ageDays} days stale.` });
  } else {
    warnings.push({ level: 'low', text: 'No Oura data found yet.' });
  }

  return warnings;
}

const DATA_QUALITY_REPORTS_KEY = 'innerscape_data_quality_reports';
const DATA_QUALITY_DECISIONS_KEY = 'innerscape_data_quality_decisions';
let dataAccuracySelectedDays = 1;

function dataQualitySafeArray(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function loadDataQualityReports() {
  return dataQualitySafeArray(DATA_QUALITY_REPORTS_KEY);
}

function saveDataQualityReports(reports) {
  localStorage.setItem(DATA_QUALITY_REPORTS_KEY, JSON.stringify(reports.slice(0, 250)));
}

function loadDataQualityDecisions() {
  try {
    const value = JSON.parse(localStorage.getItem(DATA_QUALITY_DECISIONS_KEY) || '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

function saveDataQualityDecisions(decisions) {
  localStorage.setItem(DATA_QUALITY_DECISIONS_KEY, JSON.stringify(decisions));
}

function dataQualityEscape(value) {
  return typeof escapeTimerHtml === 'function'
    ? escapeTimerHtml(value)
    : String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      }[char]));
}

function dataQualityTimestamp(entry, fields = ['ts', 'timestamp', 'startTime', 'createdAt', 'created_at']) {
  if (!entry) return null;
  for (const field of fields) {
    const raw = entry[field];
    if (raw === undefined || raw === null || raw === '') continue;
    const ts = typeof raw === 'number' ? raw : new Date(raw).getTime();
    if (Number.isFinite(ts)) return ts;
  }
  return null;
}

function dataQualityLastDays(count, offset = 0) {
  const days = [];
  const today = startOfDay(new Date());
  for (let i = count - 1 + offset; i >= offset; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push(dayKey(d));
  }
  return days;
}

function dataQualityRangeLabel(days) {
  if (!days.length) return 'No date range';
  const labels = days.map(day => shortDate(`${day}T12:00:00`));
  return labels.length === 1 ? labels[0] : `${labels[0]} - ${labels[labels.length - 1]}`;
}

function dataQualityDaySet(entries, fields) {
  const set = new Set();
  (entries || []).forEach(entry => {
    if (entry?.local_date && /^\d{4}-\d{2}-\d{2}$/.test(entry.local_date)) {
      set.add(entry.local_date);
      return;
    }
    const ts = dataQualityTimestamp(entry, fields);
    if (ts) set.add(dayKey(ts));
  });
  return set;
}

function dataQualityUnionSets(...sets) {
  const out = new Set();
  sets.forEach(set => set.forEach(day => out.add(day)));
  return out;
}

function dataQualityStreamCount(day, sets) {
  return sets.reduce((count, set) => count + (set.has(day) ? 1 : 0), 0);
}

function dataQualityFlag(config) {
  return {
    confidence: 0.6,
    suggestedDays: 1,
    days: [],
    evidence: [],
    ...config,
  };
}

function buildDataAccuracyFlags() {
  const flags = [];
  const checkins = typeof loadEntries === 'function' ? loadEntries() : dataQualitySafeArray('innerscape_entries');
  const food = typeof loadFoodEntries === 'function' ? loadFoodEntries() : dataQualitySafeArray('innerscape_food_entries');
  const stool = typeof loadStoolEntries === 'function' ? loadStoolEntries() : dataQualitySafeArray('innerscape_stool_entries');
  const timeEntries = typeof loadTimeEntries === 'function' ? loadTimeEntries() : dataQualitySafeArray('innerscape_time_entries');
  const medLogs = typeof loadMedicationLogs === 'function' ? loadMedicationLogs() : dataQualitySafeArray('innerscape_medication_logs');
  const medications = typeof loadMedications === 'function' ? loadMedications() : dataQualitySafeArray('innerscape_medications');

  const checkinDays = dataQualityDaySet(checkins, ['ts']);
  const foodDays = dataQualityDaySet(food, ['timestamp', 'ts', 'createdAt', 'created_at']);
  const stoolDays = dataQualityDaySet(stool, ['timestamp', 'ts', 'createdAt', 'created_at']);
  const timeDays = dataQualityDaySet(timeEntries, ['startTime', 'ts', 'createdAt', 'created_at']);
  const medDays = dataQualityDaySet(medLogs, ['timestamp', 'ts', 'createdAt', 'created_at']);
  const signalDays = dataQualityUnionSets(checkinDays, foodDays, stoolDays, timeDays, medDays);
  const streamSets = [checkinDays, foodDays, stoolDays, timeDays, medDays];
  const recent3 = dataQualityLastDays(3);
  const recent4 = dataQualityLastDays(4);
  const baseline21 = dataQualityLastDays(21, 3);

  const baselineFood = baseline21.filter(day => foodDays.has(day)).length;
  const missingFood = recent3.filter(day => signalDays.has(day) && !foodDays.has(day));
  if (baselineFood >= 4 && missingFood.length >= 2) {
    flags.push(dataQualityFlag({
      id: `missing-food-${missingFood.join('-')}`,
      type: 'missing_food',
      severity: 'medium',
      confidence: 0.74,
      title: 'Possible food logging gap',
      summary: 'Food is usually present in your recent history, but it disappears while other app signals continue.',
      days: missingFood,
      suggestedDays: Math.min(3, missingFood.length),
      rangeLabel: dataQualityRangeLabel(missingFood),
      evidence: [
        `${missingFood.length} recent signal day${missingFood.length === 1 ? '' : 's'} have no food log`,
        `Food was logged on ${baselineFood} of the previous 21 comparison days`,
      ],
    }));
  }

  const baselineStool = baseline21.filter(day => stoolDays.has(day)).length;
  const missingStool = recent4.filter(day => signalDays.has(day) && !stoolDays.has(day));
  if (baselineStool >= 4 && missingStool.length >= 3) {
    flags.push(dataQualityFlag({
      id: `missing-stool-${missingStool.join('-')}`,
      type: 'missing_stool',
      severity: 'medium',
      confidence: 0.7,
      title: 'Possible stool logging gap',
      summary: 'Stool entries have gone quiet for several signal days. This may be true, or it may be a tracking gap.',
      days: missingStool,
      suggestedDays: Math.min(3, missingStool.length),
      rangeLabel: dataQualityRangeLabel(missingStool),
      evidence: [
        `${missingStool.length} recent signal days have no stool entry`,
        `Stool was logged on ${baselineStool} of the previous 21 comparison days`,
      ],
    }));
  }

  const checkinGaps = recent3.filter(day => (foodDays.has(day) || stoolDays.has(day) || timeDays.has(day) || medDays.has(day)) && !checkinDays.has(day));
  if (checkins.length > 5 && checkinGaps.length >= 1) {
    flags.push(dataQualityFlag({
      id: `missing-checkin-${checkinGaps.join('-')}`,
      type: 'missing_checkin',
      severity: 'low',
      confidence: 0.64,
      title: 'Check-in may be missing',
      summary: 'There is activity elsewhere in the app, but no body, energy, mood, or mind check-in for that day.',
      days: checkinGaps,
      suggestedDays: Math.min(3, checkinGaps.length),
      rangeLabel: dataQualityRangeLabel(checkinGaps),
      evidence: [
        `${checkinGaps.length} day${checkinGaps.length === 1 ? '' : 's'} have other logs but no self-assessment`,
      ],
    }));
  }

  const baselineTime = baseline21.filter(day => timeDays.has(day)).length;
  const timerGaps = recent3.filter(day => (checkinDays.has(day) || foodDays.has(day) || stoolDays.has(day)) && !timeDays.has(day));
  if (baselineTime >= 5 && timerGaps.length >= 1) {
    flags.push(dataQualityFlag({
      id: `missing-activity-time-${timerGaps.join('-')}`,
      type: 'missing_activity_time',
      severity: 'low',
      confidence: 0.58,
      title: 'Activity timing may be thin',
      summary: 'Your tracker has life signals for the day, but no activity time entries.',
      days: timerGaps,
      suggestedDays: Math.min(3, timerGaps.length),
      rangeLabel: dataQualityRangeLabel(timerGaps),
      evidence: [
        `Activity timers appeared on ${baselineTime} of the previous 21 comparison days`,
      ],
    }));
  }

  const baselineMeds = baseline21.filter(day => medDays.has(day)).length;
  const medGaps = recent3.filter(day => signalDays.has(day) && !medDays.has(day));
  if (medications.length && baselineMeds >= 5 && medGaps.length >= 2) {
    flags.push(dataQualityFlag({
      id: `missing-medication-${medGaps.join('-')}`,
      type: 'missing_medication',
      severity: 'medium',
      confidence: 0.68,
      title: 'Medication logging may be missing',
      summary: 'Medication logs dropped out while other daily logs continued.',
      days: medGaps,
      suggestedDays: Math.min(3, medGaps.length),
      rangeLabel: dataQualityRangeLabel(medGaps),
      evidence: [
        `${medGaps.length} recent signal days have no medication log`,
        `Medication was logged on ${baselineMeds} of the previous 21 comparison days`,
      ],
    }));
  }

  const baselineStreamCounts = baseline21
    .map(day => dataQualityStreamCount(day, streamSets))
    .filter(count => count > 0);
  const baselineAverage = baselineStreamCounts.length
    ? baselineStreamCounts.reduce((sum, count) => sum + count, 0) / baselineStreamCounts.length
    : 0;
  const thinDays = recent3.filter(day => signalDays.has(day) && dataQualityStreamCount(day, streamSets) <= 1);
  if (baselineAverage >= 2.5 && thinDays.length >= 2) {
    flags.push(dataQualityFlag({
      id: `thin-data-${thinDays.join('-')}`,
      type: 'thin_data',
      severity: 'low',
      confidence: 0.56,
      title: 'Recent data looks unusually thin',
      summary: 'The app usually receives several kinds of logs, but recent days only have one stream.',
      days: thinDays,
      suggestedDays: Math.min(3, thinDays.length),
      rangeLabel: dataQualityRangeLabel(thinDays),
      evidence: [
        `Recent day coverage is lower than the comparison average of ${baselineAverage.toFixed(1)} streams`,
      ],
    }));
  }

  const now = Date.now();
  const savedActive = (() => {
    try { return JSON.parse(localStorage.getItem('innerscape_active_timer') || 'null'); } catch { return null; }
  })();
  if (savedActive?.startTime && now - savedActive.startTime > 12 * 60 * 60 * 1000) {
    flags.push(dataQualityFlag({
      id: `open-timer-${dayKey(savedActive.startTime)}`,
      type: 'open_timer',
      severity: 'high',
      confidence: 0.82,
      title: 'Open timer looks forgotten',
      summary: 'A timer has been running for more than 12 hours.',
      days: [dayKey(savedActive.startTime)],
      suggestedDays: 1,
      rangeLabel: dataQualityRangeLabel([dayKey(savedActive.startTime)]),
      evidence: [
        `Started ${dateStr(savedActive.startTime)} at ${timeStr(savedActive.startTime)}`,
      ],
    }));
  }

  const longEntries = timeEntries
    .filter(entry => entry.startTime && entry.endTime && entry.endTime - entry.startTime > 8 * 60 * 60 * 1000)
    .sort((a, b) => (b.startTime || 0) - (a.startTime || 0))
    .slice(0, 3);
  if (longEntries.length) {
    const days = [...new Set(longEntries.map(entry => dayKey(entry.startTime)))];
    flags.push(dataQualityFlag({
      id: `long-timer-${days.join('-')}`,
      type: 'long_timer',
      severity: 'medium',
      confidence: 0.66,
      title: 'Very long timer entry',
      summary: 'One or more completed activity sessions are long enough that they may include forgotten timer time.',
      days,
      suggestedDays: Math.min(3, days.length || 1),
      rangeLabel: dataQualityRangeLabel(days),
      evidence: longEntries.map(entry => {
        const hours = (entry.endTime - entry.startTime) / 3600000;
        return `${shortDate(entry.startTime)} entry lasted ${hours.toFixed(1)} hours`;
      }),
    }));
  }

  const latestOuraDay = typeof getLatestOuraDay === 'function' ? getLatestOuraDay() : null;
  if (latestOuraDay) {
    const ageDays = Math.floor((startOfDay(new Date()).getTime() - new Date(`${latestOuraDay}T00:00:00`).getTime()) / 86400000);
    if (ageDays > 7) {
      flags.push(dataQualityFlag({
        id: `oura-stale-${latestOuraDay}`,
        type: 'oura_stale',
        severity: 'low',
        confidence: 0.62,
        title: 'Oura signal is stale',
        summary: 'Oura has not refreshed recently, so forecast and insight patterns may be less grounded.',
        days: [latestOuraDay],
        suggestedDays: 1,
        rangeLabel: `Latest: ${shortDate(`${latestOuraDay}T12:00:00`)}`,
        evidence: [`Latest Oura day is ${ageDays} days old`],
      }));
    }
  }

  const severityOrder = { high: 0, medium: 1, low: 2 };
  return flags.sort((a, b) => (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3));
}

function dataQualitySeverityPenalty(severity) {
  if (severity === 'high') return 18;
  if (severity === 'medium') return 11;
  return 5;
}

function dataQualityScore(flags) {
  const decisions = loadDataQualityDecisions();
  const activeFlags = flags.filter(flag => decisions[flag.id]?.status !== 'denied');
  const recentManualReports = loadDataQualityReports().filter(report =>
    report.kind === 'manual_unreliable_range' && Date.now() - (report.ts || 0) < 4 * 86400000
  ).length;
  const penalty = activeFlags.reduce((sum, flag) => sum + dataQualitySeverityPenalty(flag.severity), 0) + recentManualReports * 8;
  return Math.max(0, Math.min(100, 100 - penalty));
}

function dataQualityScoreLabel(score) {
  if (score >= 88) return 'Clean enough';
  if (score >= 72) return 'Worth a review';
  if (score >= 55) return 'Patchy signal';
  return 'Needs attention';
}

function dataQualityReportText(report) {
  if (report.kind === 'manual_unreliable_range') {
    return `Data accuracy: ${report.range_label} marked somewhat unreliable${report.note ? `. ${report.note}` : ''}`;
  }
  if (report.kind === 'flag_review') {
    const status = report.status === 'denied' ? 'dismissed' : 'confirmed';
    return `Data accuracy: ${status} possible issue - ${report.flag_title}${report.range_label ? ` (${report.range_label})` : ''}`;
  }
  return `Data accuracy: ${report.title || 'review saved'}`;
}

function saveDataQualityReport(draft) {
  const ts = Date.now();
  const report = {
    id: `dq-${ts}-${Math.random().toString(36).slice(2, 7)}`,
    ts,
    created_at: new Date(ts).toISOString(),
    ...appDataMeta(ts),
    ...draft,
  };
  const reports = loadDataQualityReports();
  reports.unshift(report);
  saveDataQualityReports(reports);

  const notes = dataQualitySafeArray('innerscape_quick_notes');
  const quickNote = {
    id: `dq-note-${report.id}`,
    ts,
    text: dataQualityReportText(report),
    note_type: 'data_quality_report',
    privacy_level: 'normal',
    ...appDataMeta(ts),
  };
  notes.unshift(quickNote);
  localStorage.setItem('innerscape_quick_notes', JSON.stringify(notes));
  if (typeof syncToSupabase === 'function') setTimeout(() => syncToSupabase(false), 500);
  return report;
}

function getDataQualityHistory() {
  const reports = loadDataQualityReports().map(report => ({
    id: report.id,
    ts: report.ts,
    title: report.kind === 'manual_unreliable_range' ? 'Manual reliability mark' : report.flag_title || 'Flag review',
    detail: dataQualityReportText(report),
    range: report.range_label || dataQualityRangeLabel(report.dates || report.days || []),
  }));
  const reportNoteIds = new Set(reports.map(report => `dq-note-${report.id}`));
  const syncedNotes = dataQualitySafeArray('innerscape_quick_notes')
    .filter(note => note.note_type === 'data_quality_report' && !reportNoteIds.has(note.id))
    .map(note => ({
      id: note.id,
      ts: note.ts,
      title: 'Synced accuracy note',
      detail: note.text || '',
      range: note.local_date ? dataQualityRangeLabel([note.local_date]) : '',
    }));
  return [...reports, ...syncedNotes].sort((a, b) => (b.ts || 0) - (a.ts || 0)).slice(0, 8);
}

function updateDataAccuracyRangeButtons() {
  $$('#data-accuracy-range-buttons button').forEach(button => {
    button.classList.toggle('active', parseInt(button.dataset.days, 10) === dataAccuracySelectedDays);
  });
}

function saveManualDataAccuracyMark() {
  const days = dataQualityLastDays(dataAccuracySelectedDays);
  const note = ($('#data-accuracy-note')?.value || '').trim();
  saveDataQualityReport({
    kind: 'manual_unreliable_range',
    status: 'confirmed',
    reliability: 'somewhat_unreliable',
    days: dataAccuracySelectedDays,
    dates: days,
    range_label: dataQualityRangeLabel(days),
    note,
  });
  const noteEl = $('#data-accuracy-note');
  if (noteEl) noteEl.value = '';
  showToast('Data reliability mark saved');
  renderDataQualityPage();
}

function saveDataQualityDecision(flagId, status) {
  const flag = buildDataAccuracyFlags().find(item => item.id === flagId);
  if (!flag) return;
  const decisions = loadDataQualityDecisions();
  decisions[flagId] = {
    status,
    ts: Date.now(),
    title: flag.title,
    type: flag.type,
    days: flag.days,
  };
  saveDataQualityDecisions(decisions);
  saveDataQualityReport({
    kind: 'flag_review',
    status,
    flag_id: flag.id,
    flag_type: flag.type,
    flag_title: flag.title,
    range_label: flag.rangeLabel,
    days: flag.days,
    evidence: flag.evidence,
    confidence: flag.confidence,
  });
  showToast(status === 'denied' ? 'Marked as not a problem' : 'Confirmed for review');
  renderDataQualityPage();
}

function renderDataQualityPage() {
  const page = $('.data-accuracy-page');
  if (!page) return;
  const flags = buildDataAccuracyFlags();
  const decisions = loadDataQualityDecisions();
  const score = dataQualityScore(flags);
  const scoreEl = $('#data-accuracy-score');
  if (scoreEl) {
    scoreEl.className = `data-accuracy-score ${score < 72 ? 'needs-review' : ''}`;
    scoreEl.innerHTML = `
      <strong>${score}%</strong>
      <span>${dataQualityScoreLabel(score)}</span>
    `;
  }

  const flagsEl = $('#data-accuracy-flags');
  if (flagsEl) {
    if (!flags.length) {
      flagsEl.innerHTML = `
        <div class="data-accuracy-empty">
          <strong>No obvious gaps right now</strong>
          <span>The app is still watching for missing logs, odd timer shapes, and sudden changes in logging density.</span>
        </div>
      `;
    } else {
      flagsEl.innerHTML = flags.map(flag => {
        const decision = decisions[flag.id];
        const statusLabel = decision?.status === 'denied'
          ? 'Marked okay'
          : decision?.status === 'confirmed'
            ? 'Confirmed'
            : '';
        return `
          <article class="data-accuracy-flag data-accuracy-${flag.severity}">
            <div class="data-accuracy-flag-top">
              <div>
                <span class="data-accuracy-severity">${flag.severity}</span>
                <h3>${dataQualityEscape(flag.title)}</h3>
              </div>
              <div class="data-accuracy-confidence">${Math.round(flag.confidence * 100)}%</div>
            </div>
            <p>${dataQualityEscape(flag.summary)}</p>
            <div class="data-accuracy-meta">
              <span>${dataQualityEscape(flag.rangeLabel || dataQualityRangeLabel(flag.days))}</span>
              ${statusLabel ? `<span>${statusLabel}</span>` : ''}
            </div>
            <div class="data-accuracy-evidence">
              ${flag.evidence.map(item => `<span>${dataQualityEscape(item)}</span>`).join('')}
            </div>
            <div class="data-accuracy-actions">
              <button type="button" data-dq-action="confirm" data-flag-id="${dataQualityEscape(flag.id)}">Confirm</button>
              <button type="button" data-dq-action="deny" data-flag-id="${dataQualityEscape(flag.id)}">Deny</button>
              <button type="button" data-dq-action="mark" data-flag-id="${dataQualityEscape(flag.id)}">Mark days</button>
            </div>
          </article>
        `;
      }).join('');
    }
  }

  const history = getDataQualityHistory();
  const historyEl = $('#data-accuracy-history');
  if (historyEl) {
    historyEl.innerHTML = history.length ? history.map(item => `
      <div class="data-accuracy-history-item">
        <div>
          <strong>${dataQualityEscape(item.title)}</strong>
          <span>${dataQualityEscape(item.detail)}</span>
        </div>
        <time>${dataQualityEscape(shortDate(item.ts || Date.now()))}</time>
      </div>
    `).join('') : `
      <div class="data-accuracy-empty compact">
        <strong>No saved reviews yet</strong>
        <span>Confirm a flag or mark recent days to create the first reliability note.</span>
      </div>
    `;
  }
}

function initDataAccuracyPage() {
  const page = $('.data-accuracy-page');
  if (!page || page.dataset.bound === 'true') {
    renderDataQualityPage();
    return;
  }
  page.dataset.bound = 'true';

  $('#data-accuracy-range-buttons')?.addEventListener('click', event => {
    const button = event.target.closest('button[data-days]');
    if (!button) return;
    dataAccuracySelectedDays = parseInt(button.dataset.days, 10) || 1;
    updateDataAccuracyRangeButtons();
  });

  $('#data-accuracy-save-mark')?.addEventListener('click', saveManualDataAccuracyMark);
  $('#data-accuracy-refresh')?.addEventListener('click', () => {
    renderDataQualityPage();
    showToast('Accuracy scan refreshed');
  });

  $('#data-accuracy-flags')?.addEventListener('click', event => {
    const button = event.target.closest('button[data-dq-action]');
    if (!button) return;
    const action = button.dataset.dqAction;
    const flagId = button.dataset.flagId;
    if (action === 'confirm') saveDataQualityDecision(flagId, 'confirmed');
    if (action === 'deny') saveDataQualityDecision(flagId, 'denied');
    if (action === 'mark') {
      const flag = buildDataAccuracyFlags().find(item => item.id === flagId);
      dataAccuracySelectedDays = Math.max(1, Math.min(3, flag?.suggestedDays || flag?.days?.length || 1));
      updateDataAccuracyRangeButtons();
      const noteEl = $('#data-accuracy-note');
      if (noteEl && flag) {
        noteEl.value = `Flag: ${flag.title} (${flag.rangeLabel || dataQualityRangeLabel(flag.days)})`;
        noteEl.focus();
      }
      document.querySelector('.data-accuracy-mark')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });

  updateDataAccuracyRangeButtons();
  renderDataQualityPage();
}

window.renderDataQualityPage = renderDataQualityPage;

function renderDataQualityPanel() {
  const host = $('#cloud-sync-section') || $('#forecast-content');
  if (!host) return;
  let panel = $('#data-quality-panel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'data-quality-panel';
    panel.className = 'data-quality-panel';
    host.prepend(panel);
  }

  const warnings = getDataQualityWarnings();
  if (!warnings.length) {
    panel.innerHTML = `
      <div class="data-quality-header">
        <span>Data quality</span>
        <strong>Looks clean</strong>
      </div>
      <p>New entries are being saved with local day, timezone, source, and schema metadata.</p>
    `;
    return;
  }

  panel.innerHTML = `
    <div class="data-quality-header">
      <span>Data quality</span>
      <strong>${warnings.length} thing${warnings.length === 1 ? '' : 's'} to review</strong>
    </div>
    <div class="data-quality-list">
      ${warnings.map(w => `<div class="data-quality-item data-quality-${w.level}">${w.text}</div>`).join('')}
    </div>
  `;
}

installIntegrationStatusTracking();

function installDataQualitySurface() {
  const originalSwitchView = window.switchView;
  if (typeof originalSwitchView === 'function') {
    window.switchView = function switchView(view) {
      originalSwitchView(view);
      if (view === 'export' || view === 'forecast') {
        setTimeout(renderDataQualityPanel, 80);
      }
      if (view === 'data-quality') {
        setTimeout(renderDataQualityPage, 80);
      }
    };
  }

  const style = document.createElement('style');
  style.textContent = `
    .data-quality-panel {
      background: rgba(20, 20, 30, 0.82);
      border: 1px solid rgba(167, 139, 250, 0.22);
      border-radius: 8px;
      color: var(--text, #e8e4f0);
      margin: 0 0 16px;
      padding: 14px;
    }
    .data-quality-header {
      align-items: center;
      display: flex;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 10px;
    }
    .data-quality-header span {
      color: var(--text2, #9892a6);
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .data-quality-header strong {
      color: #a7f3d0;
      font-size: 13px;
    }
    .data-quality-list {
      display: grid;
      gap: 8px;
    }
    .data-quality-item {
      border-left: 3px solid #a78bfa;
      color: var(--text2, #9892a6);
      font-size: 13px;
      line-height: 1.35;
      padding: 6px 0 6px 10px;
    }
    .data-quality-high { border-left-color: #f87171; }
    .data-quality-medium { border-left-color: #fbbf24; }
    .data-quality-low { border-left-color: #38bdf8; }
  `;
  document.head.appendChild(style);
}

installDataQualitySurface();

document.addEventListener('DOMContentLoaded', () => {
  buildSliders();
  $('#checkin-time').textContent = dateStr(new Date());
  
  // Nav
  $$('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => switchGroup(btn.dataset.group));
  });
  $$('.sub-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });
  
  // Submit
  $('#submit-btn').addEventListener('click', handleSubmit);
  
  registerSW();
  setupNotifications();
  scheduleBackups();
  if (typeof initFirebase === 'function') initFirebase();
  initDreams();
  initMeditate();
  initTimer();
  initMedication();
  initTodos();
  initWishlist();
  initStudio();
  initStoolModule();
  initOuraModule();
  initQuickNotes();
  initDataAccuracyPage();
  initIntentions();
  seedIntentions();
  
  // Migrate large data to IndexedDB to free localStorage
  if (typeof migrateFoodPhotosToIDB === 'function') {
    migrateFoodPhotosToIDB().then(n => { if (n > 0) console.log('Migrated', n, 'food photos to IDB'); });
  }
  migrateOuraToIDB();
  trimLocalStorage();
});

// Trim localStorage when over 80% — move old data to IDB (Supabase has the full copy)
async function trimLocalStorage() {
  try {
    let totalBytes = 0;
    for (let i = 0; i < localStorage.length; i++) {
      totalBytes += (localStorage.getItem(localStorage.key(i)) || '').length * 2;
    }
    const pct = totalBytes / (5 * 1024 * 1024) * 100;
    if (pct < 60) return;
    
    // Aggressive trim: if over 90%, keep only 30 days; if over 70%, keep 60 days; else 90
    const keepDays = pct > 90 ? 30 : pct > 70 ? 60 : 90;
    console.log(`Storage at ${pct.toFixed(0)}% — trimming to ${keepDays} days...`);
    
    // These keys are sorted by typical size (biggest first)
    const trimTargets = [
      { key: 'innerscape_time_entries', tsField: 'startTime' },
      { key: 'innerscape_entries', tsField: 'ts' },
      { key: 'innerscape_medication_logs', tsField: 'timestamp' },
      { key: 'innerscape_food_entries', tsField: 'timestamp' },
      { key: 'innerscape_stool_entries', tsField: 'timestamp' },
      { key: 'innerscape_media_sessions', tsField: 'timestamp' },
    ];
    
    const cutoff = Date.now() - (keepDays * 24 * 60 * 60 * 1000);
    let freedBytes = 0;
    
    for (const { key, tsField, keepDays } of trimTargets) {
      const raw = localStorage.getItem(key);
      if (!raw || raw.length < 10000) continue; // skip small keys
      
      const data = JSON.parse(raw);
      if (!Array.isArray(data)) continue;
      
      // Archive old entries to IDB
      const old = data.filter(e => (e[tsField] || e.ts || 0) < cutoff);
      const recent = data.filter(e => (e[tsField] || e.ts || 0) >= cutoff);
      
      if (old.length === 0) continue;
      
      // Save old to IDB as archive
      const existing = await idbGet(key + '_archive') || [];
      const merged = [...existing, ...old];
      await idbSet(key + '_archive', merged);
      
      // Keep only recent in localStorage
      const oldSize = raw.length * 2;
      localStorage.setItem(key, JSON.stringify(recent));
      const newSize = localStorage.getItem(key).length * 2;
      freedBytes += oldSize - newSize;
      
      console.log(`${key}: archived ${old.length} old entries to IDB, kept ${recent.length} recent`);
    }
    
    if (freedBytes > 0) {
      console.log(`Freed ${(freedBytes / 1024).toFixed(0)}KB from localStorage`);
    }
  } catch (e) {
    console.error('trimLocalStorage error:', e);
  }
}

// Move Oura raw data to IndexedDB (heart_rate arrays are huge)
async function migrateOuraToIDB() {
  try {
    const key = 'innerscape_oura_data';
    const raw = localStorage.getItem(key);
    if (!raw || raw.length < 50000) return; // only migrate if >50KB
    const data = JSON.parse(raw);
    await idbSet('oura_data_full', data);
    // Keep a slim version in localStorage (just scores, no HR arrays)
    if (data.sleep) {
      data.sleep = data.sleep.map(s => {
        const slim = { ...s };
        delete slim.heart_rate;
        delete slim.hrv;
        delete slim.movement;
        delete slim.sleep_phase_5_min;
        return slim;
      });
    }
    localStorage.setItem(key, JSON.stringify(data));
    console.log('Moved Oura raw data to IDB, localStorage freed:', ((raw.length - JSON.stringify(data).length) * 2 / 1024).toFixed(0), 'KB');
  } catch(e) { console.error('Oura IDB migration:', e); }
}

/* ── One-time intention restore from backup ── */
function seedIntentions() {
  const key = 'innerscape_intentions';
  const existing = JSON.parse(localStorage.getItem(key) || '[]');
  if (existing.length > 0) return; // already has data
  const seed = [
    {"id":"int-1774168282268","type":"daily","period":"2026-03-22","text":"My intuition for today Is To Enjoy my hobbies, my art, some company, And also Prepare for the next week","createdAt":1774168282268,"updatedAt":1774168282268},
    {"id":"int-1774181841815","type":"monthly","period":"2026-03","text":"I'm setting the intention to I don't know by myself flowers And then like Set the intention when I click it should do some kind of I didn't do it","createdAt":1774181841815,"updatedAt":1774181841815},
    {"id":"int-1774250962129","type":"daily","period":"2026-03-23","text":"My intention for today is To do a few of my chores, Practice my drawing and art And go to work. Nothing too crazy, taking it easy while doing some things","createdAt":1774250962129,"updatedAt":1774250962129},
    {"id":"int-1774683493231","type":"daily","period":"2026-03-28","text":"My intention for today Is to Do one thing I want ( go check out goth store) One chore as well as to do and focus on my art As well as Do teals course on thriving in a crisis","createdAt":1774683493231,"updatedAt":1774683493231},
    {"id":"int-1775115963130","type":"daily","period":"2026-04-02","text":"My intention for today Is to Focus on my art,Do one or two chores And then Go to work and make some good food ,As well as focus on my sensual photography as well as building of my website in the evening","createdAt":1775115963130,"updatedAt":1775115963130},
    {"id":"int-1775296891870","type":"daily","period":"2026-04-04","text":"Intention for today Is to work on my website Get a few of my chores done And Practice a little bit of photography","createdAt":1775296891870,"updatedAt":1775296891870},
    {"id":"int-1775450310862","type":"daily","period":"2026-04-06","text":"My intent for today is to, go visit my moms stepmother, focus and drawing, and website building. And sensual photography.","createdAt":1775450310862,"updatedAt":1775450310862}
  ];
  localStorage.setItem(key, JSON.stringify(seed));
  console.log('[Innerscape] Restored 7 intentions from backup');
}

/* ── Quick Notes ── */
function initQuickNotes() {
  const saveBtn = $('#quick-note-save');
  if (saveBtn) saveBtn.addEventListener('click', saveQuickNote);
  renderQuickNotes();
}

function toggleQuickNote() {
  const body = $('#quick-note-body');
  const arrow = $('#quick-note-arrow');
  body.classList.toggle('hidden');
  arrow.textContent = body.classList.contains('hidden') ? '›' : '⌄';
  if (!body.classList.contains('hidden')) {
    setTimeout(() => $('#quick-note-text').focus(), 100);
  }
}

function saveQuickNote() {
  const text = $('#quick-note-text').value.trim();
  if (!text) { showToast('Write something first'); return; }

  const notes = JSON.parse(localStorage.getItem('innerscape_quick_notes') || '[]');
  notes.unshift({ id: 'qn-' + Date.now(), ts: Date.now(), text });
  localStorage.setItem('innerscape_quick_notes', JSON.stringify(notes));

  $('#quick-note-text').value = '';
  showToast('📝 Note saved');
  renderQuickNotes();
}

function renderQuickNotes() {
  const list = $('#quick-notes-list');
  if (!list) return;
  const notes = JSON.parse(localStorage.getItem('innerscape_quick_notes') || '[]')
    .filter(n => !n.note_type || n.note_type === 'quick_note');
  const recent = notes.slice(0, 5);

  if (!recent.length) { list.innerHTML = ''; return; }

  let html = recent.map(n => `
    <div class="quick-note-card">
      <div class="quick-note-card-time">${timeStr(n.ts)} · ${dateStr(n.ts)}</div>
      <div class="quick-note-card-text">${n.text}</div>
      <button class="quick-note-delete" onclick="deleteQuickNote('${n.id}')">✕</button>
    </div>
  `).join('');

  // Add "View All" button if there are more than 5 notes
  if (notes.length > 5) {
    html += `
      <button class="view-all-notes-btn" onclick="showAllNotes()">
        📝 View All ${notes.length} Notes
      </button>
    `;
  }

  list.innerHTML = html;
}

function deleteQuickNote(id) {
  const notes = JSON.parse(localStorage.getItem('innerscape_quick_notes') || '[]');
  localStorage.setItem('innerscape_quick_notes', JSON.stringify(notes.filter(n => n.id !== id)));
  deleteFromSupabase('quick_notes', id);
  renderQuickNotes();
  // Also refresh all notes modal if it's open
  if ($('#all-notes-modal') && !$('#all-notes-modal').classList.contains('hidden')) {
    showAllNotes();
  }
}

function showAllNotes() {
  const notes = JSON.parse(localStorage.getItem('innerscape_quick_notes') || '[]')
    .filter(n => !n.note_type || n.note_type === 'quick_note');
  
  if (!notes.length) {
    showToast('No notes found');
    return;
  }

  // Create modal if it doesn't exist
  let modal = $('#all-notes-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'all-notes-modal';
    modal.className = 'modal-overlay';
    document.body.appendChild(modal);
  }

  const notesHtml = notes.map(n => `
    <div class="quick-note-card">
      <div class="quick-note-card-time">${timeStr(n.ts)} · ${dateStr(n.ts)}</div>
      <div class="quick-note-card-text">${n.text}</div>
      <button class="quick-note-delete" onclick="deleteQuickNote('${n.id}')">✕</button>
    </div>
  `).join('');

  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>📝 All Your Notes (${notes.length})</h2>
        <button class="modal-close" onclick="closeAllNotesModal()">✕</button>
      </div>
      <div class="modal-body">
        ${notesHtml}
      </div>
    </div>
  `;

  modal.classList.remove('hidden');
}

function closeAllNotesModal() {
  const modal = $('#all-notes-modal');
  if (modal) modal.classList.add('hidden');
}

// Make functions globally available
window.showAllNotes = showAllNotes;
window.closeAllNotesModal = closeAllNotesModal;

/* ── Data Restore Banner (shows when localStorage empty) ── */
function checkRestoreBanner() {
  const entries = JSON.parse(localStorage.getItem('innerscape_entries') || '[]');
  if (entries.length > 5) return; // has data, skip
  
  const banner = document.createElement('div');
  banner.id = 'restore-banner';
  banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:linear-gradient(135deg,#7c3aed,#a78bfa);padding:16px 20px;text-align:center;color:white;font-weight:600;font-size:0.95rem;';
  banner.innerHTML = `
    <div>📦 Data restore available</div>
    <div style="display:flex;gap:10px;justify-content:center;margin-top:10px;">
      <button onclick="doCloudRestore()" style="background:white;color:#7c3aed;border:none;padding:10px 20px;border-radius:8px;font-weight:600;font-size:0.95rem;">✨ Restore My Data</button>
      <button onclick="this.parentElement.parentElement.remove()" style="background:rgba(255,255,255,0.2);color:white;border:none;padding:10px 16px;border-radius:8px;font-size:0.9rem;">Dismiss</button>
    </div>
  `;
  document.body.prepend(banner);
}

async function doCloudRestore() {
  const banner = document.getElementById('restore-banner');
  if (banner) banner.innerHTML = '<div>⏳ Restoring data...</div>';
  try {
    const r = await fetch('combined-backup.json?t=' + Date.now());
    const DATA = await r.json();
    
    const entries = (DATA.mood_entries || []).map(e => ({
      id: e.id || ('entry-' + e.ts), ts: e.ts, scores: e.scores, notes: e.notes || {}
    }));
    localStorage.setItem('innerscape_entries', JSON.stringify(entries));
    
    const dreams = (DATA.dreams || []).map(d => ({
      id: d.id || ('dream-' + d.ts), ts: d.ts || d.timestamp, text: d.text || '',
      tags: d.tags || [], hasAudio: d.hasAudio || null, noRecall: d.noRecall || false
    }));
    localStorage.setItem('innerscape_dreams', JSON.stringify(dreams));
    localStorage.setItem('innerscape_time_entries', JSON.stringify(DATA.time_entries || []));
    localStorage.setItem('innerscape_activities', JSON.stringify(DATA.activities || []));
    localStorage.setItem('innerscape_food_entries', JSON.stringify(DATA.food_entries || []));
    localStorage.setItem('innerscape_medications', JSON.stringify(DATA.medications || []));
    localStorage.setItem('innerscape_medication_logs', JSON.stringify(DATA.medication_logs || []));
    localStorage.setItem('innerscape_stool_entries', JSON.stringify(DATA.stool_entries || []));
    localStorage.setItem('innerscape_todos', JSON.stringify(DATA.todos || []));
    localStorage.setItem('innerscape_wishes', JSON.stringify(DATA.wishes || []));
    if (DATA.meditations?.length) localStorage.setItem('innerscape_meditations', JSON.stringify(DATA.meditations));
    
    if (banner) banner.innerHTML = '<div>✅ Data restored! Reloading...</div>';
    setTimeout(() => location.reload(), 1000);
  } catch(e) {
    if (banner) banner.innerHTML = '<div>❌ Error: ' + e.message + '</div>';
  }
}
window.doCloudRestore = doCloudRestore;

// Check on load
setTimeout(checkRestoreBanner, 500);
