/* ── Food Diary ── */

function saveFoodEntry(entry) {
  const entries = loadFoodEntries();
  entries.push(entry);
  localStorage.setItem(FOOD_STORE_KEY, JSON.stringify(entries));
}
function deleteFoodEntry(id) {
  const entries = loadFoodEntries().filter(e => e.id !== id);
  localStorage.setItem(FOOD_STORE_KEY, JSON.stringify(entries));
}

function deleteFoodEntryWithUndo(id) {
  const entries = loadFoodEntries();
  const deleted = entries.find(e => e.id === id);
  if (!deleted) return;
  
  deleteFoodEntry(id);
  renderFoodHistory();
  
  showToast('Food entry deleted', () => {
    const currentEntries = loadFoodEntries();
    currentEntries.push(deleted);
    localStorage.setItem(FOOD_STORE_KEY, JSON.stringify(currentEntries));
    renderFoodHistory();
  });
}

let foodState = {
  selectedTags: [],
  currentPhoto: null
};

function initFood() {
  $('#food-camera-area').addEventListener('click', () => $('#food-camera').click());
  $('#food-camera').addEventListener('change', handleFoodPhoto);
  
  const slider = $('#food-satisfaction');
  const val = $('#food-satisfaction-val');
  slider.addEventListener('input', () => {
    val.textContent = slider.value;
  });
  
  $$('.food-tag-btn').forEach(btn => {
    btn.addEventListener('click', () => toggleFoodTag(btn.dataset.tag, btn));
  });
  
  $('#food-quick-save').addEventListener('click', saveQuickFood);
  $('#food-save').addEventListener('click', saveDetailedFood);
  
  renderFoodHistory();
  updateQuickSaveButton();
}

function handleFoodPhoto(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (event) => {
    foodState.currentPhoto = event.target.result;
    $('#food-preview').src = foodState.currentPhoto;
    $('#food-preview').classList.remove('hidden');
    $('.food-camera-placeholder').style.display = 'none';
    updateQuickSaveButton();
  };
  reader.readAsDataURL(file);
}

function toggleFoodTag(tag, btn) {
  const index = foodState.selectedTags.indexOf(tag);
  if (index > -1) {
    foodState.selectedTags.splice(index, 1);
    btn.classList.remove('selected');
  } else {
    foodState.selectedTags.push(tag);
    btn.classList.add('selected');
  }
}

function updateQuickSaveButton() {
  const btn = $('#food-quick-save');
  btn.disabled = !foodState.currentPhoto;
  btn.textContent = foodState.currentPhoto ? '✓ Quick Save' : '📸 Add Photo First';
}

function saveQuickFood() {
  if (!foodState.currentPhoto) return;
  
  const hour = new Date().getHours();
  let mealType = 'snack';
  if (hour >= 5 && hour < 11) mealType = 'breakfast';
  else if (hour >= 11 && hour < 16) mealType = 'lunch';
  else if (hour >= 16 && hour < 22) mealType = 'dinner';
  
  const entry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    timestamp: Date.now(),
    mealType,
    description: mealType === 'drink' ? 'Photo drink' : 'Photo meal',
    satisfaction: 7,
    tags: [],
    photo: foodState.currentPhoto
  };
  
  saveFoodEntry(entry);
  resetFoodForm();
  renderFoodHistory();
  showToast('📸 Photo saved ✓');
}

function saveDetailedFood() {
  const description = $('#food-description').value.trim();
  if (!description && !foodState.currentPhoto) {
    showToast('Add a description or photo');
    return;
  }
  
  const mealType = $('#food-meal-type').value;
  const entry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    timestamp: Date.now(),
    mealType,
    description: description || (mealType === 'drink' ? 'Photo drink' : 'Photo meal'),
    satisfaction: parseInt($('#food-satisfaction').value),
    tags: [...foodState.selectedTags],
    photo: foodState.currentPhoto
  };
  
  saveFoodEntry(entry);
  resetFoodForm();
  renderFoodHistory();
  showToast('🍽️ Entry saved ✓');
}

function resetFoodForm() {
  foodState.currentPhoto = null;
  $('#food-preview').classList.add('hidden');
  $('#food-camera').value = '';
  $('.food-camera-placeholder').style.display = 'block';
  
  $('#food-description').value = '';
  $('#food-satisfaction').value = '5';
  $('#food-satisfaction-val').textContent = '5';
  
  foodState.selectedTags = [];
  $$('.food-tag-btn').forEach(btn => btn.classList.remove('selected'));
  
  updateQuickSaveButton();
}

function renderFoodHistory() {
  const entries = loadFoodEntries().sort((a, b) => b.timestamp - a.timestamp);
  const historyEl = $('#food-history');
  const emptyEl = $('#food-empty');
  
  historyEl.innerHTML = '';
  
  if (!entries.length) {
    emptyEl.classList.add('show');
    return;
  }
  
  emptyEl.classList.remove('show');
  
  const mealEmojis = {
    breakfast: '🌅',
    lunch: '☀️',
    dinner: '🌆',
    snack: '🍪',
    drink: '🥤'
  };
  
  entries.slice(0, 20).forEach(entry => {
    const entryEl = document.createElement('div');
    entryEl.className = 'food-entry';
    
    entryEl.innerHTML = `
      <div class="food-entry-header">
        <span class="food-entry-meal">${mealEmojis[entry.mealType] || '🍽️'} ${entry.mealType.charAt(0).toUpperCase() + entry.mealType.slice(1)}</span>
        <span class="food-entry-time">${new Date(entry.timestamp).toLocaleDateString()} ${timeStr(entry.timestamp)}</span>
      </div>
      ${entry.description ? `<div class="food-entry-description">${entry.description}</div>` : ''}
      ${entry.photo ? `<img src="${entry.photo}" class="food-entry-photo" alt="Food photo">` : ''}
      <div class="food-entry-footer">
        <div class="food-entry-tags">
          ${entry.tags.map(tag => `<span class="food-entry-tag">${tag}</span>`).join('')}
        </div>
        <div class="food-entry-actions">
          <span class="food-entry-rating">😋 ${entry.satisfaction}/10</span>
          <button class="food-entry-delete" data-id="${entry.id}" title="Delete entry">✕</button>
        </div>
      </div>
    `;
    
    entryEl.querySelector('.food-entry-delete').addEventListener('click', () => deleteFoodEntryWithUndo(entry.id));
    
    historyEl.appendChild(entryEl);
  });
}
