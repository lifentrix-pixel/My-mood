/* ── Wishlist Module ── */

const WISHLIST_CATEGORIES = [
  { id: 'creative', label: '🎨 Creative', emoji: '🎨' },
  { id: 'travel', label: '✈️ Travel', emoji: '✈️' },
  { id: 'learn', label: '📚 Learn', emoji: '📚' },
  { id: 'experience', label: '🌟 Experience', emoji: '🌟' },
  { id: 'personal', label: '💭 Personal', emoji: '💭' },
];

const WISHLIST_LEVELS = [
  { id: 'soon', label: '⚡ Soon', emoji: '⚡', order: 1 },
  { id: 'this-year', label: '🎯 This Year', emoji: '🎯', order: 2 },
  { id: 'someday', label: '✨ Someday', emoji: '✨', order: 3 },
];

let editingWishId = null;
let wishSelectedLevel = 'someday';
let wishSelectedType = 'recurring';

function initWishlist() {
  $('#wishlist-add-btn').addEventListener('click', () => openWishlistModal());
  $('#wishlist-cancel').addEventListener('click', closeWishlistModal);
  $('#wishlist-save').addEventListener('click', saveWish);

  $$('.wishlist-level-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.wishlist-level-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      wishSelectedLevel = btn.dataset.level;
    });
  });

  $$('.wishlist-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.wishlist-type-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      wishSelectedType = btn.dataset.type;
    });
  });

  renderWishlist();
}

function renderWishlist() {
  const wishes = loadWishes();
  const active = wishes.filter(w => !w.completed);
  const completed = wishes.filter(w => w.completed);

  // Split active into recurring and one-time
  const recurring = active.filter(w => w.type === 'recurring' || !w.type);
  const oneTime = active.filter(w => w.type === 'once');

  WISHLIST_LEVELS.forEach(level => {
    const levelRecurring = recurring.filter(w => w.level === level.id).sort((a, b) => b.createdAt - a.createdAt);
    const levelOneTime = oneTime.filter(w => w.level === level.id).sort((a, b) => b.createdAt - a.createdAt);
    const combined = [...levelRecurring, ...levelOneTime];

    const listEl = $(`#wishlist-list-${level.id}`);
    const emptyEl = $(`#wishlist-empty-${level.id}`);
    const countEl = $(`#wishlist-count-${level.id}`);

    listEl.innerHTML = '';
    countEl.textContent = combined.length;

    if (!combined.length) {
      emptyEl.classList.add('show');
      return;
    }
    emptyEl.classList.remove('show');
    combined.forEach(wish => listEl.appendChild(buildWishItem(wish)));
  });

  // Achieved Dreams Card
  const completedList = $('#wishlist-completed-list');
  const completedCount = $('#wishlist-completed-count');
  const achievedCard = $('#wish-achieved-card');
  const achievedEmpty = $('#wish-achieved-empty');
  completedList.innerHTML = '';

  // Build log entries from doneHistory of recurring wishes
  const doneEntries = [];
  active.forEach(wish => {
    if (wish.doneHistory && wish.doneHistory.length) {
      wish.doneHistory.forEach((ts, idx) => {
        doneEntries.push({ wish, ts, idx });
      });
    }
  });
  // Sort newest first
  doneEntries.sort((a, b) => b.ts - a.ts);

  // One-time achieved dreams
  const achievedEntries = completed.sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));

  const totalCompleted = doneEntries.length + achievedEntries.length;
  completedCount.textContent = totalCompleted;

  if (totalCompleted === 0) {
    achievedEmpty.style.display = '';
  } else {
    achievedEmpty.style.display = 'none';
  }

  if (doneEntries.length) {
    const recentHeader = document.createElement('div');
    recentHeader.className = 'wishlist-completed-subheader';
    recentHeader.textContent = '🔁 Activity Log';
    completedList.appendChild(recentHeader);
    doneEntries.forEach(entry => {
      completedList.appendChild(buildDoneLogItem(entry.wish, entry.ts, entry.idx));
    });
  }

  if (achievedEntries.length) {
    const achievedHeader = document.createElement('div');
    achievedHeader.className = 'wishlist-completed-subheader';
    achievedHeader.textContent = '🌟 Achieved Dreams';
    completedList.appendChild(achievedHeader);
    achievedEntries.forEach(wish => {
      completedList.appendChild(buildWishItem(wish));
    });
  }
}

function buildDoneLogItem(wish, ts, idx) {
  const item = document.createElement('div');
  item.className = 'wish-done-log-item';
  const category = WISHLIST_CATEGORIES.find(c => c.id === wish.category);
  const date = new Date(ts);
  const timeStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' · ' +
    date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

  item.innerHTML = `
    <div class="wish-done-log-text">
      <span class="wish-done-log-name">${wish.text}</span>
      <span class="wish-done-log-meta">${category ? category.emoji : ''} ${timeStr}</span>
    </div>
    <button class="wish-done-log-undo" title="Undo this entry">×</button>
  `;

  item.querySelector('.wish-done-log-undo').addEventListener('click', (e) => {
    e.stopPropagation();
    undoDoneEntry(wish.id, idx);
  });

  return item;
}

function undoDoneEntry(wishId, historyIdx) {
  const wishes = loadWishes();
  const wish = wishes.find(w => w.id === wishId);
  if (!wish || !wish.doneHistory) return;

  wish.doneHistory.splice(historyIdx, 1);
  wish.doneCount = Math.max(0, (wish.doneCount || 1) - 1);
  wish.lastDoneAt = wish.doneHistory.length ? wish.doneHistory[wish.doneHistory.length - 1] : null;
  saveWishes(wishes);
  renderWishlist();
  showToast('Entry removed ↩️');
}

function buildWishItem(wish) {
  const item = document.createElement('div');
  const isRecurring = wish.type === 'recurring' || !wish.type;
  item.className = 'wishlist-item' + (wish.completed ? ' completed' : '');

  const category = WISHLIST_CATEGORIES.find(c => c.id === wish.category);
  const level = WISHLIST_LEVELS.find(l => l.id === wish.level);
  const typeIcon = isRecurring ? '🔁' : '🌠';
  const lastDone = wish.lastDoneAt ? timeAgo(wish.lastDoneAt) : null;
  const doneCount = wish.doneCount || 0;

  item.innerHTML = `
    <div class="wishlist-checkbox ${wish.completed ? 'checked' : ''}">${wish.completed ? '🌟' : '○'}</div>
    <div class="wishlist-content">
      <div class="wishlist-text">${wish.text}</div>
      <div class="wishlist-meta">
        <span class="wishlist-category">${category ? category.emoji : ''}${category ? category.label.replace(/^..\s/, '') : wish.category}</span>
        ${!wish.completed ? `<span class="wishlist-level-badge">${level ? level.emoji : ''}</span>` : ''}
        <span class="wishlist-type-badge">${typeIcon}</span>
      </div>
      ${isRecurring && doneCount > 0 ? `
        <div class="wishlist-recurring-stats">
          Done ${doneCount} time${doneCount !== 1 ? 's' : ''}${lastDone ? ` · last ${lastDone}` : ''}
        </div>
      ` : ''}
      ${wish.notes ? `<div class="wishlist-notes-display">${wish.notes}</div>` : ''}
      ${wish.completed ? `<div class="wishlist-completed-date">Achieved ${new Date(wish.completedAt).toLocaleDateString()}</div>` : ''}
    </div>
    <div class="wishlist-actions">
      ${!wish.completed && isRecurring ? '<button class="wishlist-done-btn" title="Did it!">✨</button>' : ''}
      ${!wish.completed ? '<button class="wishlist-edit-btn" title="Edit">✏️</button>' : ''}
      ${wish.completed ? '<button class="wishlist-uncomplete-btn" title="Move back">↩️</button>' : ''}
      ${!wish.completed ? '<button class="wishlist-delete-btn" title="Delete">×</button>' : ''}
    </div>
  `;

  // Checkbox: complete for one-time, or toggle for completed items
  const checkbox = item.querySelector('.wishlist-checkbox');
  checkbox.addEventListener('click', (e) => {
    if (isRecurring && !wish.completed) {
      burstFromBox(item);
      logRecurringDone(wish.id);
    } else if (!wish.completed) {
      burstFromBox(item);
      setTimeout(() => toggleWish(wish.id), 800);
    } else {
      toggleWish(wish.id);
    }
  });

  // "Did it!" button for recurring
  const doneBtn = item.querySelector('.wishlist-done-btn');
  if (doneBtn) {
    doneBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      burstFromBox(item);
      logRecurringDone(wish.id);
    });
  }

  const editBtn = item.querySelector('.wishlist-edit-btn');
  if (editBtn) {
    editBtn.addEventListener('click', (e) => { e.stopPropagation(); openWishlistModal(wish); });
  }

  const deleteBtn = item.querySelector('.wishlist-delete-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation(); deleteWish(wish.id);
    });
  }

  const uncompleteBtn = item.querySelector('.wishlist-uncomplete-btn');
  if (uncompleteBtn) {
    uncompleteBtn.addEventListener('click', (e) => {
      e.stopPropagation(); toggleWish(wish.id);
    });
  }

  return item;
}

function logRecurringDone(id) {
  const wishes = loadWishes();
  const wish = wishes.find(w => w.id === id);
  if (!wish) return;

  wish.doneCount = (wish.doneCount || 0) + 1;
  wish.lastDoneAt = Date.now();
  if (!wish.doneHistory) wish.doneHistory = [];
  wish.doneHistory.push(Date.now());

  saveWishes(wishes);
  showToast(`✨ Done! (${wish.doneCount} times total)`);
  renderWishlist();
}

function openWishlistModal(existingWish) {
  editingWishId = existingWish ? existingWish.id : null;
  $('#wishlist-modal-title').textContent = existingWish ? 'Edit Wish' : 'Add New Dream';
  $('#wishlist-save').textContent = existingWish ? 'Save Changes' : 'Save Dream';
  $('#wishlist-modal').classList.remove('hidden');

  $('#wishlist-text').value = existingWish ? existingWish.text : '';
  $('#wishlist-category').value = existingWish ? existingWish.category : 'creative';
  $('#wishlist-notes').value = existingWish ? (existingWish.notes || '') : '';

  wishSelectedLevel = existingWish ? existingWish.level : 'someday';
  $$('.wishlist-level-btn').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.level === wishSelectedLevel);
  });

  wishSelectedType = existingWish ? (existingWish.type || 'recurring') : 'recurring';
  $$('.wishlist-type-btn').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.type === wishSelectedType);
  });

  setTimeout(() => $('#wishlist-text').focus(), 100);
}

function closeWishlistModal() {
  $('#wishlist-modal').classList.add('hidden');
  editingWishId = null;
}

function saveWish() {
  const saveBtn = $('#wishlist-save');
  if (saveBtn.disabled) return;
  saveBtn.disabled = true;

  try {
    const text = $('#wishlist-text').value.trim();
    if (!text) {
      showToast('Enter your dream');
      $('#wishlist-text').focus();
      saveBtn.disabled = false;
      return;
    }

    const category = $('#wishlist-category').value;
    const notes = $('#wishlist-notes').value.trim();
    const wishes = loadWishes();

    if (editingWishId) {
      const wish = wishes.find(w => w.id === editingWishId);
      if (wish) {
        wish.text = text;
        wish.category = category;
        wish.level = wishSelectedLevel;
        wish.type = wishSelectedType;
        wish.notes = notes;
        wish.updatedAt = Date.now();
      }
    } else {
      wishes.push({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        text, category,
        level: wishSelectedLevel,
        type: wishSelectedType,
        notes,
        completed: false,
        completedAt: null,
        createdAt: Date.now(),
        doneCount: 0,
        lastDoneAt: null,
        doneHistory: [],
      });
    }

    saveWishes(wishes);
    closeWishlistModal();
    renderWishlist();
    showToast(editingWishId ? 'Dream updated ✨' : 'Dream added ✨');
  } finally {
    setTimeout(() => { saveBtn.disabled = false; }, 1000);
  }
}

function toggleWish(id) {
  const wishes = loadWishes();
  const wish = wishes.find(w => w.id === id);
  if (!wish) return;

  wish.completed = !wish.completed;
  wish.completedAt = wish.completed ? Date.now() : null;
  saveWishes(wishes);
  renderWishlist();
  showToast(wish.completed ? 'Dream achieved! 🌟' : 'Dream reopened ✨');
}

function deleteWish(id) {
  const wishes = loadWishes();
  const deleted = wishes.find(w => w.id === id);
  if (!deleted) return;

  saveWishes(wishes.filter(w => w.id !== id));
  deleteFromSupabase('wishes', id);
  renderWishlist();
  showToast('Dream deleted', () => {
    const current = loadWishes();
    current.push(deleted);
    saveWishes(current);
    renderWishlist();
  });
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

function loadWishes() {
  try { return JSON.parse(localStorage.getItem('innerscape_wishes') || '[]'); }
  catch { return []; }
}

function saveWishes(wishes) {
  localStorage.setItem('innerscape_wishes', JSON.stringify(wishes));
}

/* ── Fairy Dust ── */
function burstFromBox(el) {
  const chars = ['✦', '✧', '⋆', '˚', '✩', '♡', '∗', '✿', '⊹', '·'];
  const colors = ['#f9a8d4', '#f472b6', '#e879f9', '#c084fc', '#fbbf24', '#fff', '#fda4af'];
  const rect = el.getBoundingClientRect();
  const count = 28;

  for (let i = 0; i < count; i++) {
    const spark = document.createElement('div');
    spark.className = 'fairy-spark';
    spark.textContent = chars[Math.floor(Math.random() * chars.length)];
    spark.style.color = colors[Math.floor(Math.random() * colors.length)];
    spark.style.fontSize = (8 + Math.random() * 16) + 'px';
    spark.style.animationDelay = (Math.random() * 0.5) + 's';

    // Random position across the whole card
    const x = rect.left + Math.random() * rect.width;
    const y = rect.top + Math.random() * rect.height;
    spark.style.left = x + 'px';
    spark.style.top = y + 'px';

    // Float upward and outward
    const dx = (Math.random() - 0.5) * 120;
    const dy = -30 - Math.random() * 100;
    spark.style.setProperty('--dx', dx + 'px');
    spark.style.setProperty('--dy', dy + 'px');

    document.body.appendChild(spark);
    setTimeout(() => spark.remove(), 2800);
  }
}
