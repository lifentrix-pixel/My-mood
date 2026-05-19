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

function sessionQualityLabel(score) {
  if (!score) return 'Not rated';
  if (score <= 3) return `${score}/10 scattered`;
  if (score <= 6) return `${score}/10 mixed`;
  if (score <= 8) return `${score}/10 steady`;
  return `${score}/10 focused`;
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
    logging_issue: entry.logging_issue || entry.loggingIssue || null,
    session_marks: Array.isArray(entry.session_marks) ? entry.session_marks : (Array.isArray(entry.sessionMarks) ? entry.sessionMarks : []),
    ...appDataMeta(startTime),
  };
}

function loadActiveTimerRecord() {
  try { return JSON.parse(localStorage.getItem('innerscape_active_timer') || 'null'); } catch { return null; }
}

function saveActiveTimerRecord(record) {
  if (!record) return;
  localStorage.setItem('innerscape_active_timer', JSON.stringify(record));
}

function renderSessionMarkButtons(record = loadActiveTimerRecord()) {
  const quality = record?.sessionQuality || null;
  const issue = record?.loggingIssue || null;
  $$('.timer-session-tag').forEach(btn => {
    const tag = btn.dataset.sessionTag;
    btn.classList.toggle('active', (tag === quality) || (tag === issue));
  });
  const slider = $('#timer-quality-slider');
  const value = $('#timer-quality-value');
  const score = record?.sessionQualityScore || null;
  if (slider) slider.value = score || 5;
  if (value) value.textContent = sessionQualityLabel(score);
}

function setSessionQualityScore(score, recordMark = true) {
  const record = loadActiveTimerRecord();
  if (!record || !record.startTime) return;
  const normalizedScore = Math.max(1, Math.min(10, parseInt(score, 10) || 5));
  const next = { ...record };
  const elapsedMs = Math.max(0, Date.now() - record.startTime);
  next.sessionQualityScore = normalizedScore;
  next.sessionQuality = normalizedScore >= 7 ? 'focused' : normalizedScore <= 4 ? 'distracted' : 'mixed';
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
  saveActiveTimerRecord(next);
  renderSessionMarkButtons(next);
}

function toggleSessionMark(tag) {
  const config = APP_SESSION_MARKS[tag];
  const record = loadActiveTimerRecord();
  if (!config || !record || !record.startTime) return;

  const next = { ...record };
  const elapsedMs = Math.max(0, Date.now() - record.startTime);
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
  saveActiveTimerRecord(next);
  renderSessionMarkButtons(next);
  showToast(`${config.label} noted`);
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
    toggleSessionMark(btn.dataset.sessionTag);
  });
  document.addEventListener('input', (event) => {
    if (event.target?.id !== 'timer-quality-slider') return;
    setSessionQualityScore(event.target.value, false);
  });
  document.addEventListener('change', (event) => {
    if (event.target?.id !== 'timer-quality-slider') return;
    setSessionQualityScore(event.target.value, true);
  });

  if (originalShowActiveTimer) {
    window.showActiveTimer = function showActiveTimer(activity) {
      originalShowActiveTimer(activity);
      renderSessionMarkButtons();
    };
  }

  window.loadEntries = function loadEntries() {
    try { return (JSON.parse(localStorage.getItem(STORE_KEY)) || []).map(normalizeCheckinEntry); } catch { return []; }
  };

  window.saveEntry = function saveEntry(entry) {
    const entries = loadEntries();
    entries.push(normalizeCheckinEntry(entry));
    safeSave(STORE_KEY, entries);
    if (originalSyncMoodEntries) setTimeout(() => originalSyncMoodEntries(), 500);
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
        }));
      }

      const notesField = $('#timer-session-notes');
      const note = notesField ? notesField.value.trim() : '';
      const activeRecord = loadActiveTimerRecord() || {};
      let entry = {
        activityId: timerState.activeActivityId,
        startTime: timerState.startTime,
        endTime: now,
        tracking_mode: 'primary',
        session_quality: activeRecord.sessionQuality || null,
        session_quality_score: activeRecord.sessionQualityScore ?? null,
        logging_issue: activeRecord.loggingIssue || null,
        session_marks: Array.isArray(activeRecord.sessionMarks) ? activeRecord.sessionMarks : [],
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
    let newEntry = { activityId: actId, startTime, endTime, tracking_mode: 'primary' };
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
  const notes = JSON.parse(localStorage.getItem('innerscape_quick_notes') || '[]');
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
  const notes = JSON.parse(localStorage.getItem('innerscape_quick_notes') || '[]');
  
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
