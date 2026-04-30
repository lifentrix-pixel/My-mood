/* ── Activity Timer ── */

let timerCategoryFilter = '';

let timerState = {
  activeActivityId: null,
  activeSubActivityId: null,
  activeSubSubActivityId: null,
  startTime: null,
  subStartTime: null,
  subSubStartTime: null,
  interval: null,
  sessionData: [],
  selectedColor: TIMER_COLORS[0],
  statsPeriod: 'today',
  viewMode: 'session'
};
let timerWeeklyChart = null;

function initTimer() {
  function bind(sel, event, fn) {
    const el = $(sel);
    if (!el) return;
    const fresh = el.cloneNode(true);
    el.replaceWith(fresh);
    fresh.addEventListener(event, fn);
  }

  bind('#timer-add-btn', 'click', openTimerCreateModal);
  bind('#timer-create-cancel', 'click', closeTimerCreateModal);
  bind('#timer-create-save', 'click', createActivity);
  bind('#timer-stop-btn', 'click', saveSessionDirectly);
  bind('#timer-cancel-btn', 'click', cancelTimer);
  
  // Auto-save main session notes
  const notesField = $('#timer-session-notes');
  if (notesField) {
    notesField.addEventListener('input', () => {
      if (timerState.activeActivityId) {
        localStorage.setItem(`innerscape_timer_notes_${timerState.activeActivityId}`, notesField.value);
      }
    });
  }
  
  // Auto-save sub-activity notes
  const subNotesField = $('#timer-sub-notes');
  if (subNotesField) {
    subNotesField.addEventListener('input', () => {
      if (timerState.activeActivityId && timerState.activeSubActivityId) {
        localStorage.setItem(`innerscape_sub_notes_${timerState.activeActivityId}_${timerState.activeSubActivityId}`, subNotesField.value);
      }
    });
  }
  
  // Auto-save sub-sub-activity notes
  const subSubNotesField = $('#timer-subsub-notes');
  if (subSubNotesField) {
    subSubNotesField.addEventListener('input', () => {
      if (timerState.activeActivityId && timerState.activeSubActivityId && timerState.activeSubSubActivityId) {
        localStorage.setItem(`innerscape_subsub_notes_${timerState.activeActivityId}_${timerState.activeSubActivityId}_${timerState.activeSubSubActivityId}`, subSubNotesField.value);
      }
    });
  }
  bind('#timer-stats-btn', 'click', showTimerStats);
  bind('#timer-stats-back', 'click', hideTimerStats);
  bind('#timer-manual-add-btn', 'click', openTimerManualModal);
  bind('#timer-manual-cancel', 'click', closeTimerManualModal);
  bind('#timer-manual-save', 'click', saveManualEntry);
  bind('#timer-new-category-btn', 'click', openCategoryModal);
  bind('#timer-cat-cancel', 'click', closeCategoryModal);
  bind('#timer-cat-save', 'click', createCategory);
  bind('#timer-add-sub-btn', 'click', openSubActivityModal);
  bind('#timer-sub-cancel', 'click', closeSubActivityModal);
  bind('#timer-sub-create', 'click', createSubActivity);
  bind('#timer-sub-back', 'click', cancelSubActivity);
  bind('#timer-sub-done', 'click', saveSubActivity);
  bind('#timer-add-subsub-btn', 'click', openSubSubActivityModal);
  bind('#timer-subsub-back', 'click', cancelSubSubActivity);
  bind('#timer-subsub-done', 'click', saveSubSubActivity);
  bind('#timer-edit-cancel', 'click', closeEditActivityModal);
  bind('#timer-edit-save', 'click', updateActivity);
  bind('#entry-edit-cancel', 'click', closeEditEntryModal);
  bind('#entry-edit-save', 'click', saveEditEntry);
  
  $('#timer-search').addEventListener('input', renderTimerGrid);

  const picksEl = $('#timer-color-picks');
  TIMER_COLORS.forEach(c => {
    const btn = document.createElement('div');
    btn.className = 'timer-color-pick' + (c === timerState.selectedColor ? ' selected' : '');
    btn.style.background = c;
    btn.addEventListener('click', () => {
      picksEl.querySelectorAll('.timer-color-pick').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      timerState.selectedColor = c;
    });
    picksEl.appendChild(btn);
  });

  const catPicksEl = $('#timer-cat-color-picks');
  if (catPicksEl) {
    TIMER_COLORS.forEach(c => {
      const btn = document.createElement('div');
      btn.className = 'timer-color-pick' + (c === TIMER_COLORS[2] ? ' selected' : '');
      btn.style.background = c;
      btn.addEventListener('click', () => {
        catPicksEl.querySelectorAll('.timer-color-pick').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      });
      catPicksEl.appendChild(btn);
    });
  }

  const stopToggle = $('#timer-stop-notes-toggle');
  const stopField = $('#timer-stop-notes-field');
  if (stopToggle && stopField) {
    stopToggle.addEventListener('click', () => {
      stopToggle.classList.toggle('open');
      stopField.classList.toggle('open');
      if (stopField.classList.contains('open')) {
        setTimeout(() => $('#timer-stop-notes').focus(), 300);
      }
    });
  }

  $$('.timer-period-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.timer-period-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      timerState.statsPeriod = btn.dataset.period;
      renderTimerStats();
    });
  });

  const saved = localStorage.getItem('innerscape_active_timer');
  if (saved) {
    try {
      const s = JSON.parse(saved);
      const act = loadActivities().find(a => a.id === s.activityId);
      if (act && s.startTime) {
        timerState.activeActivityId = s.activityId;
        timerState.startTime = s.startTime;
        showActiveTimer(act);
        
        // Restore sub-activity if one was active
        const savedSub = localStorage.getItem('innerscape_active_sub');
        if (savedSub) {
          try {
            const ss = JSON.parse(savedSub);
            const sub = (act.subActivities || []).find(sa => sa.id === ss.subActivityId);
            if (sub && ss.subStartTime) {
              timerState.activeSubActivityId = ss.subActivityId;
              timerState.subStartTime = ss.subStartTime;
              // Show sub-activity view
              $('#timer-session-display').classList.add('hidden');
              $('#timer-sub-display').classList.remove('hidden');
              $('#timer-sub-active-emoji').textContent = sub.emoji;
              $('#timer-sub-active-name').textContent = sub.name;
              // Restore notes
              const savedSubNotes = localStorage.getItem(`innerscape_sub_notes_${s.activityId}_${sub.id}`);
              const subNotesField = $('#timer-sub-notes');
              if (subNotesField) subNotesField.value = savedSubNotes || '';
            }
          } catch {}
        }
      }
    } catch {}
  }
}

function renderTimerView() {
  // Check for active timer in memory
  if (timerState.activeActivityId) {
    const act = loadActivities().find(a => a.id === timerState.activeActivityId);
    if (act) {
      showActiveTimer(act);
      // Re-show sub-activity view if one was active
      if (timerState.activeSubActivityId) {
        const sub = (act.subActivities || []).find(sa => sa.id === timerState.activeSubActivityId);
        if (sub) {
          $('#timer-session-display').classList.add('hidden');
          $('#timer-sub-display').classList.remove('hidden');
          $('#timer-sub-active-emoji').textContent = sub.emoji;
          $('#timer-sub-active-name').textContent = sub.name;
        }
      }
      return;
    }
  }
  
  // Check for saved active timer in localStorage
  const saved = localStorage.getItem('innerscape_active_timer');
  if (saved) {
    try {
      const s = JSON.parse(saved);
      const act = loadActivities().find(a => a.id === s.activityId);
      if (act && s.startTime) {
        timerState.activeActivityId = s.activityId;
        timerState.startTime = s.startTime;
        showActiveTimer(act);
        return;
      }
    } catch {}
  }
  
  renderTimerGrid();
}

function smartSortActivities(activities) {
  const entries = loadTimeEntries();
  const now = new Date();
  const currentHour = now.getHours();

  const hourCounts = {};
  const totalCounts = {};
  activities.forEach(a => { hourCounts[a.id] = 0; totalCounts[a.id] = a.usageCount || 0; });
  entries.forEach(e => {
    const h = new Date(e.startTime).getHours();
    if (Math.abs(h - currentHour) <= 1 || Math.abs(h - currentHour) >= 23) {
      hourCounts[e.activityId] = (hourCounts[e.activityId] || 0) + 1;
    }
  });

  return [...activities].sort((a, b) => {
    const ha = hourCounts[a.id] || 0, hb = hourCounts[b.id] || 0;
    if (ha !== hb) return hb - ha;
    return (b.usageCount || 0) - (a.usageCount || 0);
  });
}

function renderCategoryFilters() {
  const container = $('#timer-category-filters');
  if (!container) return;
  container.innerHTML = '';
  const categories = loadCategories();
  
  const allPill = document.createElement('button');
  allPill.className = 'timer-cat-pill' + (timerCategoryFilter === '' ? ' active' : '');
  allPill.textContent = '✦ All';
  allPill.style.borderColor = timerCategoryFilter === '' ? 'var(--accent)' : '';
  allPill.addEventListener('click', () => { timerCategoryFilter = ''; renderTimerGrid(); });
  container.appendChild(allPill);
  
  categories.forEach(cat => {
    const pill = document.createElement('button');
    pill.className = 'timer-cat-pill' + (timerCategoryFilter === cat.id ? ' active' : '');
    pill.style.borderColor = timerCategoryFilter === cat.id ? cat.color : '';
    pill.style.color = timerCategoryFilter === cat.id ? cat.color : '';
    let html = `${cat.emoji} ${cat.name}`;
    if (cat.description) html += `<span class="cat-pill-desc">${cat.description}</span>`;
    pill.innerHTML = html;
    pill.addEventListener('click', () => {
      timerCategoryFilter = timerCategoryFilter === cat.id ? '' : cat.id;
      renderTimerGrid();
    });
    container.appendChild(pill);
  });
}

function renderTimerGrid() {
  renderCategoryFilters();
  const search = ($('#timer-search').value || '').toLowerCase();
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
    const btn = document.createElement('div');
    btn.className = 'timer-activity-btn';
    btn.style.borderColor = act.color + '44';
    btn.innerHTML = `
      <span class="timer-act-emoji">${act.emoji}</span>
      <span class="timer-act-name">${act.name}</span>
      <div class="timer-act-actions">
        <button class="timer-act-delete" title="Delete activity">✕</button>
      </div>
    `;
    
    // Long-press to edit, tap to start timer
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
}

function openTimerCreateModal() {
  $('#timer-create-modal').classList.remove('hidden');
  $('#timer-new-emoji').value = '';
  $('#timer-new-name').value = '';
  timerState.selectedColor = TIMER_COLORS[0];
  $('#timer-color-picks').querySelectorAll('.timer-color-pick').forEach((b, i) => {
    b.classList.toggle('selected', i === 0);
  });
  const catSelect = $('#timer-new-category');
  catSelect.innerHTML = '<option value="">None</option>';
  loadCategories().forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat.id;
    opt.textContent = `${cat.emoji} ${cat.name}`;
    catSelect.appendChild(opt);
  });
  setTimeout(() => $('#timer-new-emoji').focus(), 100);
}

function closeTimerCreateModal() {
  $('#timer-create-modal').classList.add('hidden');
}

function createActivity() {
  const createBtn = $('#timer-create-save');
  if (createBtn.disabled) return;
  createBtn.disabled = true;
  
  try {
    const emoji = firstEmoji($('#timer-new-emoji').value.trim()) || '⏱';
    const name = $('#timer-new-name').value.trim();
    
    if (!name) { 
      showToast('Enter an activity name'); 
      $('#timer-new-name').focus();
      createBtn.disabled = false;
      return; 
    }

    const acts = loadActivities();
    const category = $('#timer-new-category').value || '';
    const newActivity = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name, emoji,
      color: timerState.selectedColor,
      category,
      usageCount: 0,
      lastUsed: null,
      createdAt: Date.now(),
    };
    
    acts.push(newActivity);
    saveActivities(acts);
    
    closeTimerCreateModal();
    renderTimerGrid();
    showToast('Activity created ✓');
    
  } catch (error) {
    console.error('❌ Error creating activity:', error);
    showToast('Error creating activity');
  } finally {
    setTimeout(() => { createBtn.disabled = false; }, 1000);
  }
}

let editingActivityId = null;

function openEditActivityModal(activity) {
  editingActivityId = activity.id;
  $('#timer-edit-modal').classList.remove('hidden');
  $('#timer-edit-emoji').value = activity.emoji;
  $('#timer-edit-name').value = activity.name;
  
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
}

function closeEditActivityModal() {
  $('#timer-edit-modal').classList.add('hidden');
  editingActivityId = null;
}

function updateActivity() {
  if (!editingActivityId) return;
  
  const saveBtn = $('#timer-edit-save');
  if (saveBtn.disabled) return;
  saveBtn.disabled = true;
  
  try {
    const emoji = firstEmoji($('#timer-edit-emoji').value.trim()) || '⏱';
    const name = $('#timer-edit-name').value.trim();
    
    if (!name) {
      showToast('Enter an activity name');
      $('#timer-edit-name').focus();
      saveBtn.disabled = false;
      return;
    }
    
    const selectedColorEl = $('#timer-edit-color-picks .timer-color-pick.selected');
    const newColor = selectedColorEl ? selectedColorEl.style.background : '#4CAF50';
    
    const acts = loadActivities();
    const activity = acts.find(a => a.id === editingActivityId);
    if (activity) {
      activity.emoji = emoji;
      activity.name = name;
      activity.color = newColor;
      saveActivities(acts);
      
      closeEditActivityModal();
      renderTimerGrid();
      showToast('Activity updated ✓');
    }
    
  } catch (error) {
    console.error('❌ Error updating activity:', error);
    showToast('Error updating activity');
  } finally {
    setTimeout(() => { saveBtn.disabled = false; }, 1000);
  }
}

function deleteActivity(id) {
  const acts = loadActivities();
  const deleted = acts.find(a => a.id === id);
  if (!deleted) return;
  saveActivities(acts.filter(a => a.id !== id));
  deleteFromSupabase('activities', id);
  trackDeletion('activities', id);
  renderTimerGrid();
  showToast('Activity deleted', () => {
    const current = loadActivities();
    current.push(deleted);
    saveActivities(current);
    untrackDeletion('activities', id);
    renderTimerGrid();
  });
}

function startTimer(activity) {
  
  timerState.activeActivityId = activity.id;
  timerState.startTime = Date.now();
  
  localStorage.setItem('innerscape_active_timer', JSON.stringify({ 
    activityId: activity.id, 
    startTime: timerState.startTime
  }));

  const acts = loadActivities();
  const act = acts.find(a => a.id === activity.id);
  if (act) { 
    act.usageCount = (act.usageCount || 0) + 1; 
    act.lastUsed = Date.now(); 
    saveActivities(acts); 
  }

  showActiveTimer(activity);
}

function showActiveTimer(activity) {
  
  $('#timer-main').classList.add('hidden');
  $('#timer-stats').classList.add('hidden'); 
  $('#timer-active').classList.remove('hidden');
  
  $('#timer-active-emoji').textContent = activity.emoji;
  $('#timer-active-name').textContent = activity.name;
  
  $('#timer-sub-section').style.display = 'block';
  renderSubActivityGrid(activity);
  
  clearInterval(timerState.interval);
  timerState.interval = setInterval(updateTimerClock, 1000);
  updateTimerClock();
  
  // Restore saved notes (or clear from previous activity)
  const savedNotes = localStorage.getItem(`innerscape_timer_notes_${activity.id}`);
  const notesField = $('#timer-session-notes');
  if (notesField) {
    notesField.value = savedNotes || '';
  }
  
}

function renderSubActivityGrid(activity) {
  const grid = $('#timer-sub-grid');
  if (!grid) return;
  
  grid.innerHTML = '';
  const subActivities = activity.subActivities || [];
  
  subActivities.forEach(sub => {
    const btn = document.createElement('div');
    btn.className = 'timer-sub-btn';
    btn.innerHTML = `
      <div class="sub-emoji">${sub.emoji}</div>
      <div class="sub-name">${sub.name}</div>
      <button class="timer-sub-delete">×</button>
    `;
    
    btn.addEventListener('click', (e) => {
      if (e.target.closest('.timer-sub-delete')) return;
      enterSubActivity(sub);
    });
    
    btn.querySelector('.timer-sub-delete').addEventListener('click', (e) => {
      e.stopPropagation();
      removeSubActivity(activity.id, sub.id);
      renderSubActivityGrid(activity);
      showToast('Subcategory removed');
    });
    
    grid.appendChild(btn);
  });
}

function enterSubActivity(sub) {
  timerState.activeSubActivityId = sub.id;
  timerState.subStartTime = Date.now();

  // Save sub-activity state for persistence
  localStorage.setItem('innerscape_active_sub', JSON.stringify({
    subActivityId: sub.id,
    subStartTime: timerState.subStartTime
  }));

  $('#timer-session-display').classList.add('hidden');
  $('#timer-sub-display').classList.remove('hidden');
  $('#timer-sub-active-emoji').textContent = sub.emoji;
  $('#timer-sub-active-name').textContent = sub.name;
  $('#timer-sub-active-clock').textContent = '00:00:00';
  
  // Render sub-sub activity grid
  renderSubSubActivityGrid(sub);
  
  // Restore saved sub-activity notes
  const savedSubNotes = localStorage.getItem(`innerscape_sub_notes_${timerState.activeActivityId}_${sub.id}`);
  const subNotesField = $('#timer-sub-notes');
  if (subNotesField) {
    subNotesField.value = savedSubNotes || '';
  }
}

function saveSubActivity() {
  if (timerState.activeSubActivityId && timerState.subStartTime) {
    // Get sub-activity notes
    const subNotesField = $('#timer-sub-notes');
    const subNote = subNotesField ? subNotesField.value.trim() : '';
    
    const entries = loadTimeEntries();
    const activity = loadActivities().find(a => a.id === timerState.activeActivityId);
    const sub = activity && activity.subActivities
      ? activity.subActivities.find(s => s.id === timerState.activeSubActivityId)
      : null;
    
    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      activityId: timerState.activeActivityId,
      subActivityId: timerState.activeSubActivityId,
      subActivityName: sub ? sub.name : '',
      startTime: timerState.subStartTime,
      endTime: Date.now()
    };
    if (subNote) entry.note = subNote;
    
    entries.push(entry);
    saveTimeEntries(entries);
    showToast(`${sub ? sub.emoji : '⏱'} ${sub ? sub.name : 'Sub-activity'} logged ✓`);
    
    // Clean up saved notes
    localStorage.removeItem(`innerscape_sub_notes_${timerState.activeActivityId}_${timerState.activeSubActivityId}`);
  }

  localStorage.removeItem('innerscape_active_sub');
  localStorage.removeItem('innerscape_active_subsub');
  timerState.activeSubActivityId = null;
  timerState.subStartTime = null;

  $('#timer-sub-display').classList.add('hidden');
  $('#timer-session-display').classList.remove('hidden');
}

function cancelSubActivity() {
  // Clean up notes without saving
  if (timerState.activeActivityId && timerState.activeSubActivityId) {
    localStorage.removeItem(`innerscape_sub_notes_${timerState.activeActivityId}_${timerState.activeSubActivityId}`);
  }
  
  localStorage.removeItem('innerscape_active_sub');
  localStorage.removeItem('innerscape_active_subsub');
  timerState.activeSubActivityId = null;
  timerState.subStartTime = null;

  $('#timer-sub-display').classList.add('hidden');
  $('#timer-session-display').classList.remove('hidden');
}

function updateTimerClock() {
  if (!timerState.startTime) return;
  const sessionElapsed = Date.now() - timerState.startTime;
  $('#timer-active-clock').textContent = fmtClock(sessionElapsed);

  if (timerState.subStartTime) {
    const subElapsed = Date.now() - timerState.subStartTime;
    const subClock = $('#timer-sub-active-clock');
    if (subClock) subClock.textContent = fmtClock(subElapsed);
    const parentInfo = $('#timer-sub-parent-info');
    if (parentInfo) parentInfo.textContent = `Session total: ${fmtClock(sessionElapsed)}`;
  }

  if (timerState.subSubStartTime) {
    const subSubElapsed = Date.now() - timerState.subSubStartTime;
    const subSubClock = $('#timer-subsub-active-clock');
    if (subSubClock) subSubClock.textContent = fmtClock(subSubElapsed);
    const subSubParentInfo = $('#timer-subsub-parent-info');
    if (subSubParentInfo) {
      const subElapsed = timerState.subStartTime ? Date.now() - timerState.subStartTime : 0;
      subSubParentInfo.textContent = `Sub-activity: ${fmtClock(subElapsed)} • Session: ${fmtClock(sessionElapsed)}`;
    }
  }
}

function openSubActivityModal() {
  $('#timer-sub-modal').classList.remove('hidden');
  $('#timer-sub-name').value = '';
  $('#timer-sub-emoji').value = '';
  $('#timer-sub-modal h3').textContent = 'New Subcategory'; // Reset title
  setTimeout(() => $('#timer-sub-emoji').focus(), 100);
}

function closeSubActivityModal() {
  $('#timer-sub-modal').classList.add('hidden');
}

function createSubActivity() {
  const modalTitle = $('#timer-sub-modal h3').textContent;
  
  if (modalTitle.includes('Sub-subcategory')) {
    createSubSubActivity();
    return;
  }
  
  const createBtn = $('#timer-sub-create');
  if (createBtn.disabled) return;
  createBtn.disabled = true;
  
  try {
    const name = $('#timer-sub-name').value.trim();
    const emoji = firstEmoji($('#timer-sub-emoji').value.trim()) || '🎯';
    
    if (!name) {
      $('#timer-sub-name').focus();
      createBtn.disabled = false;
      return;
    }
    
    const newSub = addSubActivity(timerState.activeActivityId, { name, emoji });
    if (newSub) {
      const activity = loadActivities().find(a => a.id === timerState.activeActivityId);
      renderSubActivityGrid(activity);
      closeSubActivityModal();
      showToast('Subcategory added ✓');
    }
    
  } finally {
    setTimeout(() => { createBtn.disabled = false; }, 1000);
  }
}

function openCategoryModal() {
  $('#timer-cat-modal').classList.remove('hidden');
  $('#timer-cat-emoji').value = '';
  $('#timer-cat-name').value = '';
  $('#timer-cat-desc').value = '';
  const picks = $('#timer-cat-color-picks');
  if (picks) picks.querySelectorAll('.timer-color-pick').forEach((b, i) => b.classList.toggle('selected', i === 2));
  setTimeout(() => $('#timer-cat-emoji').focus(), 100);
}
function closeCategoryModal() { $('#timer-cat-modal').classList.add('hidden'); }
function createCategory() {
  const emoji = firstEmoji($('#timer-cat-emoji').value.trim()) || '📁';
  const name = $('#timer-cat-name').value.trim();
  if (!name) { showToast('Enter a category name'); return; }
  const picks = $('#timer-cat-color-picks');
  const selPick = picks ? picks.querySelector('.selected') : null;
  const color = selPick ? selPick.style.background : TIMER_COLORS[2];
  const description = $('#timer-cat-desc').value.trim();
  const cats = loadCategories();
  cats.push({ id: 'cat-' + Date.now().toString(36), name, emoji, color, description });
  saveCategories(cats);
  closeCategoryModal();
  openTimerCreateModal();
  showToast('Category created ✓');
}

function saveSessionDirectly() {
  if (!timerState.activeActivityId || !timerState.startTime) return;
  
  clearInterval(timerState.interval);

  try {
    // Save any active sub-activity
    if (timerState.activeSubActivityId && timerState.subStartTime) {
      const entries = loadTimeEntries();
      entries.push({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        activityId: timerState.activeActivityId,
        subActivityId: timerState.activeSubActivityId,
        startTime: timerState.subStartTime,
        endTime: Date.now()
      });
      saveTimeEntries(entries);
    }

    // Get the session note
    const notesField = $('#timer-session-notes');
    const note = notesField ? notesField.value.trim() : '';
    
    // Save the main session
    const entries = loadTimeEntries();
    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      activityId: timerState.activeActivityId,
      startTime: timerState.startTime,
      endTime: Date.now(),
    };
    if (note) entry.note = note;
    
    entries.push(entry);
    saveTimeEntries(entries);
    
    // Clean up
    localStorage.removeItem('innerscape_active_timer');
    localStorage.removeItem('innerscape_active_sub');
    localStorage.removeItem('innerscape_active_subsub');
    localStorage.removeItem(`innerscape_timer_notes_${timerState.activeActivityId}`);

    const act = loadActivities().find(a => a.id === timerState.activeActivityId);
    timerState.activeActivityId = null;
    timerState.activeSubActivityId = null;
    timerState.startTime = null;
    timerState.subStartTime = null;

    // Return to main timer view
    $('#timer-sub-display').classList.add('hidden');
    $('#timer-session-display').classList.remove('hidden');
    $('#timer-active').classList.add('hidden');
    $('#timer-main').classList.remove('hidden');
    renderTimerGrid();
    renderTimerStats();
    
    showToast(`${act ? act.emoji : '⏱'} Session saved ✓`);
  } catch (err) {
    console.error('Save session error:', err);
    showToast('⚠️ Error saving — check console');
    // Still try to return to main view
    try {
      timerState.activeActivityId = null;
      timerState.activeSubActivityId = null;
      timerState.startTime = null;
      $('#timer-active').classList.add('hidden');
      $('#timer-main').classList.remove('hidden');
    } catch(e) {}
  }
}

function saveStoppedTimer() {
  const ps = timerState._pendingStop;
  if (!ps) return;
  const note = ($('#timer-stop-notes').value || '').trim();
  
  const entries = loadTimeEntries();
  const entry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    activityId: ps.activityId,
    startTime: ps.startTime,
    endTime: ps.endTime,
  };
  if (note) entry.note = note;
  entries.push(entry);
  saveTimeEntries(entries);
  localStorage.removeItem('innerscape_active_timer');
  localStorage.removeItem('innerscape_active_sub');
  localStorage.removeItem('innerscape_active_subsub');

  timerState.activeActivityId = null;
  timerState.activeSubActivityId = null;
  timerState.startTime = null;
  timerState.subStartTime = null;
  timerState._pendingStop = null;

  $('#timer-stop-modal').classList.add('hidden');
  $('#timer-sub-display').classList.add('hidden');
  $('#timer-session-display').classList.remove('hidden');
  $('#timer-active').classList.add('hidden');
  $('#timer-main').classList.remove('hidden');
  renderTimerGrid();
  showToast(`${ps.act ? ps.act.emoji : '⏱'} Session logged ✓`);
}

function cancelTimer() {
  if (!timerState.activeActivityId) return;
  
  if (confirm('Discard this timer session without saving?')) {
    clearInterval(timerState.interval);
    localStorage.removeItem('innerscape_active_timer');
  localStorage.removeItem('innerscape_active_sub');
  localStorage.removeItem('innerscape_active_subsub');
    localStorage.removeItem(`innerscape_timer_notes_${timerState.activeActivityId}`);

    timerState.activeActivityId = null;
    timerState.activeSubActivityId = null;
    timerState.startTime = null;
    timerState.subStartTime = null;

    $('#timer-active').classList.add('hidden');
    $('#timer-sub-display').classList.add('hidden'); 
    $('#timer-session-display').classList.remove('hidden');
    $('#timer-main').classList.remove('hidden');
    renderTimerGrid();
    
    showToast('Timer cancelled');
  }
}

function showTimerStats() {
  $('#timer-main').classList.add('hidden');
  $('#timer-stats').classList.remove('hidden');
  renderTimerStats();
}

function hideTimerStats() {
  $('#timer-stats').classList.add('hidden');
  $('#timer-main').classList.remove('hidden');
}

function renderTimerStats() {
  const activities = loadActivities();
  const entries = loadTimeEntries();
  const now = new Date();

  let periodStart;
  if (timerState.statsPeriod === 'today') periodStart = startOfDay(now).getTime();
  else if (timerState.statsPeriod === 'week') { const d = new Date(now); d.setDate(d.getDate() - 6); periodStart = startOfDay(d).getTime(); }
  else { const d = new Date(now); d.setDate(d.getDate() - 29); periodStart = startOfDay(d).getTime(); }

  const filtered = entries.filter(e => e.endTime >= periodStart);

  const todayStart = startOfDay(now).getTime();
  const periodEntries = filtered.sort((a, b) => b.startTime - a.startTime);
  const timelineEl = $('#timer-timeline-bars');
  timelineEl.innerHTML = '';
  if (periodEntries.length) {
    let lastDateLabel = '';
    periodEntries.forEach(e => {
      const act = activities.find(a => a.id === e.activityId);
      if (!act) return;
      const dur = e.endTime - e.startTime;
      const entryDate = dateStr(e.startTime);
      if (entryDate !== lastDateLabel) {
        const dateDiv = document.createElement('div');
        dateDiv.className = 'timer-entry-date-header';
        dateDiv.textContent = entryDate;
        timelineEl.appendChild(dateDiv);
        lastDateLabel = entryDate;
      }
      const row = document.createElement('div');
      row.className = 'timer-timeline-row';
      row.innerHTML = `
        <span class="timer-timeline-emoji">${act.emoji}</span>
        <div class="timer-entry-info">
          <span class="timer-entry-name">${act.name}${e.meditationRounds ? ` · ${e.meditationRounds} rounds` : ''}</span>
          <span class="timer-entry-times">${timeStr(e.startTime)} – ${timeStr(e.endTime)}  ·  ${formatDuration(dur)}</span>
          ${e.note ? `<span class="timer-entry-note">📝 ${e.note}</span>` : ''}
        </div>
        <div class="timer-entry-actions">
          <button class="timer-entry-edit" data-id="${e.id}" title="Edit">✏️</button>
          <button class="timer-entry-delete" data-id="${e.id}" title="Delete">✕</button>
        </div>
      `;
      row.querySelector('.timer-entry-edit').addEventListener('click', () => openEditEntryModal(e, act));
      row.querySelector('.timer-entry-delete').addEventListener('click', () => deleteTimeEntry(e.id));
      timelineEl.appendChild(row);
    });
  } else {
    timelineEl.innerHTML = '<p style="color:var(--text2);font-size:13px;">No entries for this period</p>';
  }

  renderTimerWeeklyChart(activities, entries);

  const totalsEl = $('#timer-totals');
  totalsEl.innerHTML = '';
  const actTotals = {};
  filtered.forEach(e => {
    actTotals[e.activityId] = (actTotals[e.activityId] || 0) + (e.endTime - e.startTime);
  });
  Object.entries(actTotals)
    .sort((a, b) => b[1] - a[1])
    .forEach(([id, ms]) => {
      const act = activities.find(a => a.id === id);
      if (!act) return;
      const row = document.createElement('div');
      row.className = 'timer-total-row';
      row.innerHTML = `
        <span class="timer-total-emoji">${act.emoji}</span>
        <span class="timer-total-name">${act.name}</span>
        <span class="timer-total-time">${formatDuration(ms)}</span>
      `;
      totalsEl.appendChild(row);
    });
  if (!Object.keys(actTotals).length) {
    totalsEl.innerHTML = '<p style="color:var(--text2);font-size:13px;">No data for this period</p>';
  }

  renderCategoryStats(activities, filtered);
}

function renderCategoryStats(activities, filtered) {
  let section = $('#timer-cat-stats');
  if (!section) {
    section = document.createElement('div');
    section.id = 'timer-cat-stats';
    section.className = 'timer-cat-stats-section';
    section.innerHTML = '<h4>By Category</h4><div id="timer-cat-totals"></div>';
    const totalsParent = $('#timer-totals').parentElement;
    totalsParent.parentElement.insertBefore(section, totalsParent.nextSibling);
  }
  const container = section.querySelector('#timer-cat-totals') || section;
  container.innerHTML = '';
  
  const categories = loadCategories();
  const catTotals = {};
  filtered.forEach(e => {
    const act = activities.find(a => a.id === e.activityId);
    if (!act || !act.category) return;
    catTotals[act.category] = (catTotals[act.category] || 0) + (e.endTime - e.startTime);
  });
  
  if (!Object.keys(catTotals).length) {
    container.innerHTML = '<p style="color:var(--text2);font-size:13px;">No categorized data</p>';
    return;
  }
  
  Object.entries(catTotals).sort((a, b) => b[1] - a[1]).forEach(([catId, ms]) => {
    const cat = categories.find(c => c.id === catId);
    if (!cat) return;
    const row = document.createElement('div');
    row.className = 'timer-cat-total-row';
    row.innerHTML = `
      <span class="timer-cat-total-emoji">${cat.emoji}</span>
      <span class="timer-cat-total-name">${cat.name}</span>
      <span class="timer-cat-total-time">${formatDuration(ms)}</span>
    `;
    container.appendChild(row);
  });
}

function renderTimerWeeklyChart(activities, entries) {
  const now = new Date();
  const days = [];
  const labels = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    days.push(startOfDay(d).getTime());
    labels.push(d.toLocaleDateString([], { weekday: 'short' }));
  }

  const actIds = [...new Set(entries.map(e => e.activityId))];
  const datasets = actIds.map(id => {
    const act = activities.find(a => a.id === id);
    const data = days.map((dayStart, idx) => {
      const dayEnd = idx < 6 ? days[idx + 1] : dayStart + 86400000;
      return entries
        .filter(e => e.activityId === id && e.endTime >= dayStart && e.startTime < dayEnd)
        .reduce((sum, e) => sum + (Math.min(e.endTime, dayEnd) - Math.max(e.startTime, dayStart)), 0) / 60000;
    });
    return {
      label: act ? act.name : 'Unknown',
      data,
      backgroundColor: act ? act.color + 'cc' : '#666',
      borderRadius: 4,
    };
  });

  const canvas = $('#timer-weekly-chart');
  if (timerWeeklyChart) { timerWeeklyChart.data = { labels, datasets }; timerWeeklyChart.update(); return; }
  timerWeeklyChart = new Chart(canvas, {
    type: 'bar',
    data: { labels, datasets },
    options: {
      responsive: true, maintainAspectRatio: true, aspectRatio: 1.6,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1e1e2a', titleColor: '#e8e4f0', bodyColor: '#9892a6',
          borderColor: '#2a2a3a', borderWidth: 1, cornerRadius: 10, padding: 10,
          callbacks: { label: ctx => `${ctx.dataset.label}: ${Math.round(ctx.parsed.y)} min` }
        }
      },
      scales: {
        x: { stacked: true, grid: { display: false }, ticks: { color: '#9892a6', font: { size: 11 } } },
        y: { stacked: true, grid: { color: '#1e1e2a' }, ticks: { color: '#9892a6', callback: v => v + 'm' } }
      }
    }
  });
}

function deleteTimeEntry(entryId) {
  const entries = loadTimeEntries();
  const deleted = entries.find(e => e.id === entryId);
  if (!deleted) return;
  saveTimeEntries(entries.filter(e => e.id !== entryId));
  deleteFromSupabase('time_entries', entryId);
  renderTimerStats();
  showToast('Entry deleted', () => {
    const current = loadTimeEntries();
    current.push(deleted);
    saveTimeEntries(current);
    renderTimerStats();
  });
}

function openTimerManualModal() {
  const modal = $('#timer-manual-modal');
  modal.classList.remove('hidden');
  const select = $('#timer-manual-activity');
  select.innerHTML = '';
  loadActivities().forEach(a => {
    const opt = document.createElement('option');
    opt.value = a.id;
    opt.textContent = `${a.emoji} ${a.name}`;
    select.appendChild(opt);
  });
  const today = new Date();
  $('#timer-manual-date').value = dayKey(today);
  $('#timer-manual-start').value = '';
  $('#timer-manual-end').value = '';
}

function closeTimerManualModal() {
  $('#timer-manual-modal').classList.add('hidden');
}

function saveManualEntry() {
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
  const newEntry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    activityId: actId,
    startTime,
    endTime,
  };
  if (note) newEntry.note = note;
  entries.push(newEntry);
  saveTimeEntries(entries);
  closeTimerManualModal();
  renderTimerStats();
  showToast('Entry added ✓');
}

/* ── Edit Time Entry ── */
let editingEntryId = null;

function openEditEntryModal(entry, activity) {
  editingEntryId = entry.id;
  const modal = $('#entry-edit-modal');
  modal.classList.remove('hidden');

  const startDt = new Date(entry.startTime);
  const endDt = new Date(entry.endTime);

  $('#entry-edit-date').value = startDt.toISOString().slice(0, 10);
  $('#entry-edit-start').value = `${String(startDt.getHours()).padStart(2,'0')}:${String(startDt.getMinutes()).padStart(2,'0')}`;
  $('#entry-edit-end').value = `${String(endDt.getHours()).padStart(2,'0')}:${String(endDt.getMinutes()).padStart(2,'0')}`;
  $('#entry-edit-note').value = entry.note || '';
  $('#entry-edit-title').textContent = `Edit: ${activity.emoji} ${activity.name}`;
}

function closeEditEntryModal() {
  $('#entry-edit-modal').classList.add('hidden');
  editingEntryId = null;
}

function saveEditEntry() {
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
    if (endMs <= startMs) endMs += 86400000; // next day

    const entries = loadTimeEntries();
    const entry = entries.find(e => e.id === editingEntryId);
    if (entry) {
      entry.startTime = startMs;
      entry.endTime = endMs;
      entry.note = note || undefined;
      saveTimeEntries(entries);
      closeEditEntryModal();
      renderTimerStats();
      showToast('Entry updated ✓');
    }
  } finally {
    btn.disabled = false;
  }
}


/* ── Sub-Sub Activities (Level 3) ── */
function renderSubSubActivityGrid(subActivity) {
  const grid = $('#timer-subsub-grid');
  if (!grid) return;
  
  grid.innerHTML = '';
  const subSubActivities = subActivity.subSubActivities || [];
  
  subSubActivities.forEach(subsub => {
    const btn = document.createElement('div');
    btn.className = 'timer-sub-activity-btn';
    btn.innerHTML = `<span class="sub-emoji">${subsub.emoji}</span><span class="sub-name">${subsub.name}</span>`;
    btn.addEventListener('click', () => enterSubSubActivity(subsub));
    grid.appendChild(btn);
  });
}

function openSubSubActivityModal() {
  // Reuse the sub-activity modal but with different context
  $('#timer-sub-modal').classList.remove('hidden');
  $('#timer-sub-name').value = '';
  $('#timer-sub-emoji').value = '';
  $('#timer-sub-modal h3').textContent = 'New Sub-subcategory';
  setTimeout(() => $('#timer-sub-emoji').focus(), 100);
}

function createSubSubActivity() {
  // Modified version of createSubActivity for sub-sub activities
  const name = $('#timer-sub-name').value.trim();
  const emoji = firstEmoji($('#timer-sub-emoji').value.trim()) || '🎯';
  
  if (!name) {
    showToast('Enter a name');
    return;
  }
  
  const activities = loadActivities();
  const activity = activities.find(a => a.id === timerState.activeActivityId);
  if (!activity || !activity.subActivities) return;
  
  const subActivity = activity.subActivities.find(s => s.id === timerState.activeSubActivityId);
  if (!subActivity) return;
  
  if (!subActivity.subSubActivities) subActivity.subSubActivities = [];
  
  const newSubSub = {
    id: 'subsub-' + Date.now().toString(36),
    name,
    emoji,
    createdAt: Date.now()
  };
  
  subActivity.subSubActivities.push(newSubSub);
  saveActivities(activities);
  
  closeSubActivityModal();
  renderSubSubActivityGrid(subActivity);
  showToast('Sub-subcategory created ✓');
}

function enterSubSubActivity(subsub) {
  timerState.activeSubSubActivityId = subsub.id;
  timerState.subSubStartTime = Date.now();

  // Save sub-sub activity state for persistence
  localStorage.setItem('innerscape_active_subsub', JSON.stringify({
    subSubActivityId: subsub.id,
    subSubStartTime: timerState.subSubStartTime
  }));

  $('#timer-sub-display').classList.add('hidden');
  $('#timer-subsub-display').classList.remove('hidden');
  $('#timer-subsub-active-emoji').textContent = subsub.emoji;
  $('#timer-subsub-active-name').textContent = subsub.name;
  $('#timer-subsub-active-clock').textContent = '00:00:00';
  
  // Restore saved sub-sub-activity notes
  const savedSubSubNotes = localStorage.getItem(`innerscape_subsub_notes_${timerState.activeActivityId}_${timerState.activeSubActivityId}_${subsub.id}`);
  const subSubNotesField = $('#timer-subsub-notes');
  if (subSubNotesField) {
    subSubNotesField.value = savedSubSubNotes || '';
  }
}

function saveSubSubActivity() {
  if (timerState.activeSubSubActivityId && timerState.subSubStartTime) {
    // Get sub-sub-activity notes
    const subSubNotesField = $('#timer-subsub-notes');
    const subSubNote = subSubNotesField ? subSubNotesField.value.trim() : '';
    
    const entries = loadTimeEntries();
    const activity = loadActivities().find(a => a.id === timerState.activeActivityId);
    const subActivity = activity && activity.subActivities
      ? activity.subActivities.find(s => s.id === timerState.activeSubActivityId)
      : null;
    const subSubActivity = subActivity && subActivity.subSubActivities
      ? subActivity.subSubActivities.find(ss => ss.id === timerState.activeSubSubActivityId)
      : null;
    
    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      activityId: timerState.activeActivityId,
      subActivityId: timerState.activeSubActivityId,
      subSubActivityId: timerState.activeSubSubActivityId,
      subSubActivityName: subSubActivity ? subSubActivity.name : '',
      startTime: timerState.subSubStartTime,
      endTime: Date.now()
    };
    if (subSubNote) entry.note = subSubNote;
    
    entries.push(entry);
    saveTimeEntries(entries);
    showToast(`${subSubActivity ? subSubActivity.emoji : '🎯'} ${subSubActivity ? subSubActivity.name : 'Sub-sub-activity'} logged ✓`);
    
    // Clean up saved notes
    localStorage.removeItem(`innerscape_subsub_notes_${timerState.activeActivityId}_${timerState.activeSubActivityId}_${timerState.activeSubSubActivityId}`);
  }

  localStorage.removeItem('innerscape_active_subsub');
  timerState.activeSubSubActivityId = null;
  timerState.subSubStartTime = null;

  $('#timer-subsub-display').classList.add('hidden');
  $('#timer-sub-display').classList.remove('hidden');
}

function cancelSubSubActivity() {
  // Clean up notes without saving
  if (timerState.activeActivityId && timerState.activeSubActivityId && timerState.activeSubSubActivityId) {
    localStorage.removeItem(`innerscape_subsub_notes_${timerState.activeActivityId}_${timerState.activeSubActivityId}_${timerState.activeSubSubActivityId}`);
  }
  
  localStorage.removeItem('innerscape_active_subsub');
  timerState.activeSubSubActivityId = null;
  timerState.subSubStartTime = null;

  $('#timer-subsub-display').classList.add('hidden');
  $('#timer-sub-display').classList.remove('hidden');
}
