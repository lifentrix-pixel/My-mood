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

  $('#wishlist-show-completed').addEventListener('click', () => {
    const list = $('#wishlist-completed-list');
    list.classList.toggle('hidden');
  });

  renderWishlist();
}

function renderWishlist() {
  const wishes = loadWishes();
  const active = wishes.filter(w => !w.completed);
  const completed = wishes.filter(w => w.completed);

  WISHLIST_LEVELS.forEach(level => {
    const levelWishes = active
      .filter(w => w.level === level.id)
      .sort((a, b) => b.createdAt - a.createdAt);

    const listEl = $(`#wishlist-list-${level.id}`);
    const emptyEl = $(`#wishlist-empty-${level.id}`);
    const countEl = $(`#wishlist-count-${level.id}`);
    
    listEl.innerHTML = '';
    countEl.textContent = levelWishes.length;

    if (!levelWishes.length) {
      emptyEl.classList.add('show');
      return;
    }
    emptyEl.classList.remove('show');

    levelWishes.forEach(wish => {
      listEl.appendChild(buildWishItem(wish));
    });
  });

  const completedList = $('#wishlist-completed-list');
  const completedCount = $('#wishlist-completed-count');
  completedList.innerHTML = '';
  completedCount.textContent = completed.length ? `(${completed.length})` : '';

  completed.sort((a, b) => b.completedAt - a.completedAt).forEach(wish => {
    completedList.appendChild(buildWishItem(wish));
  });
}

function buildWishItem(wish) {
  const item = document.createElement('div');
  item.className = 'wishlist-item' + (wish.completed ? ' completed' : '');
  
  const category = WISHLIST_CATEGORIES.find(c => c.id === wish.category);
  const level = WISHLIST_LEVELS.find(l => l.id === wish.level);
  
  item.innerHTML = `
    <div class="wishlist-checkbox ${wish.completed ? 'checked' : ''}">${wish.completed ? '🌟' : '○'}</div>
    <div class="wishlist-content">
      <div class="wishlist-text">${wish.text}</div>
      <div class="wishlist-meta">
        <span class="wishlist-category">${category ? category.emoji : ''}${category ? category.label.replace(/^..\s/, '') : wish.category}</span>
        ${!wish.completed ? `<span class="wishlist-level-badge">${level ? level.emoji : ''}</span>` : ''}
      </div>
      ${wish.notes ? `<div class="wishlist-notes-display">${wish.notes}</div>` : ''}
      ${wish.completed ? `<div class="wishlist-completed-date">Completed ${new Date(wish.completedAt).toLocaleDateString()}</div>` : ''}
    </div>
    <div class="wishlist-actions">
      ${!wish.completed ? '<button class="wishlist-edit-btn" title="Edit">✏️</button>' : ''}
      <button class="wishlist-delete-btn" title="Delete">×</button>
    </div>
  `;

  item.querySelector('.wishlist-checkbox').addEventListener('click', () => toggleWish(wish.id));
  
  const editBtn = item.querySelector('.wishlist-edit-btn');
  if (editBtn) {
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openWishlistModal(wish);
    });
  }
  
  item.querySelector('.wishlist-delete-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    deleteWish(wish.id);
  });

  return item;
}

function openWishlistModal(existingWish) {
  editingWishId = existingWish ? existingWish.id : null;
  $('#wishlist-modal-title').textContent = existingWish ? 'Edit Wish' : 'Add New Wish';
  $('#wishlist-save').textContent = existingWish ? 'Save Changes' : 'Save Wish';
  $('#wishlist-modal').classList.remove('hidden');
  
  $('#wishlist-text').value = existingWish ? existingWish.text : '';
  $('#wishlist-category').value = existingWish ? existingWish.category : 'creative';
  $('#wishlist-notes').value = existingWish ? (existingWish.notes || '') : '';

  wishSelectedLevel = existingWish ? existingWish.level : 'someday';
  $$('.wishlist-level-btn').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.level === wishSelectedLevel);
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
      showToast('Enter what you want to do');
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
        wish.notes = notes;
        wish.updatedAt = Date.now();
      }
    } else {
      wishes.push({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        text,
        category,
        level: wishSelectedLevel,
        notes,
        completed: false,
        completedAt: null,
        createdAt: Date.now(),
      });
    }

    saveWishes(wishes);
    closeWishlistModal();
    renderWishlist();
    showToast(editingWishId ? 'Wish updated ✨' : 'Wish added ✨');

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
  
  if (wish.completed) {
    showToast('Dream achieved! 🌟');
  } else {
    showToast('Wish reopened ✨');
  }
}

function deleteWish(id) {
  const wishes = loadWishes();
  const deleted = wishes.find(w => w.id === id);
  if (!deleted) return;

  saveWishes(wishes.filter(w => w.id !== id));
  renderWishlist();
  showToast('Wish deleted', () => {
    const current = loadWishes();
    current.push(deleted);
    saveWishes(current);
    renderWishlist();
  });
}

// Storage functions
function loadWishes() {
  try {
    return JSON.parse(localStorage.getItem('innerscape_wishes') || '[]');
  } catch {
    return [];
  }
}

function saveWishes(wishes) {
  localStorage.setItem('innerscape_wishes', JSON.stringify(wishes));
}