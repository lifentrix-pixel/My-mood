/* ── Food Diary ── */

// Presets: each item is { name: "Button label", detail: "Full text with ingredients" }
const DEFAULT_FOOD_PRESETS = {
  foods: [
    { name: 'Oatmeal', detail: 'Oatmeal — oats, oat milk, banana, blueberries, cinnamon' },
    { name: 'Pasta', detail: 'Pasta — pasta, tomato sauce, garlic, olive oil, nutritional yeast' },
    { name: 'Toast & avocado', detail: 'Toast & avocado — sourdough bread, avocado, lemon, salt, chili flakes' },
    { name: 'Rice & veggies', detail: 'Rice & veggies — rice, broccoli, tofu, soy sauce, sesame oil' },
    { name: 'Salad', detail: 'Salad — mixed greens, tomato, cucumber, chickpeas, olive oil, lemon' },
    { name: 'Soup', detail: 'Soup — vegetable broth, potatoes, carrots, onion, garlic' },
  ],
  drinks: [
    { name: 'Water', detail: 'Water' },
    { name: 'Coffee', detail: 'Coffee — oat milk' },
    { name: 'Tea', detail: 'Tea — green tea' },
    { name: 'Smoothie', detail: 'Smoothie — banana, berries, oat milk, spinach' },
    { name: 'Oat latte', detail: 'Oat latte — espresso, oat milk' },
  ]
};

function loadFoodPresets() {
  try {
    const saved = JSON.parse(localStorage.getItem('innerscape_food_presets'));
    // Migration: if old format (array of strings), convert
    if (saved && saved.foods && saved.drinks) {
      if (typeof saved.foods[0] === 'string') {
        saved.foods = saved.foods.map(s => ({ name: s, detail: s }));
        saved.drinks = saved.drinks.map(s => ({ name: s, detail: s }));
        saveFoodPresets(saved);
      }
      return saved;
    }
  } catch(e) {}
  return DEFAULT_FOOD_PRESETS;
}

function saveFoodPresets(presets) {
  localStorage.setItem('innerscape_food_presets', JSON.stringify(presets));
}

function renderFoodPresets() {
  const presets = loadFoodPresets();
  const foodsEl = $('#food-preset-foods');
  const drinksEl = $('#food-preset-drinks');
  if (!foodsEl || !drinksEl) return;

  foodsEl.innerHTML = '';
  drinksEl.innerHTML = '';

  const buildPill = (item) => {
    const pill = document.createElement('button');
    pill.className = 'food-preset-pill';
    pill.textContent = item.name;
    pill.addEventListener('click', () => {
      const input = $('#food-description');
      input.value = item.detail;
      input.focus();
    });
    return pill;
  };

  presets.foods.forEach(item => foodsEl.appendChild(buildPill(item)));
  presets.drinks.forEach(item => drinksEl.appendChild(buildPill(item)));
}

function parsePresetText(text) {
  // Format: "Name — ingredients" or "Name | ingredients" or just "Name"
  return text.split('\n').map(line => {
    line = line.trim();
    if (!line) return null;
    const sep = line.match(/\s*[—|]\s*/);
    if (sep) {
      const name = line.substring(0, sep.index).trim();
      return { name, detail: line };
    }
    return { name: line, detail: line };
  }).filter(Boolean);
}

function presetToText(items) {
  return items.map(i => i.detail).join('\n');
}

function openPresetEditor() {
  let modal = $('#food-preset-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'food-preset-modal';
    modal.className = 'food-preset-modal';
    modal.innerHTML = `
      <div class="food-preset-modal-inner">
        <h3>Edit Quick Presets</h3>
        <p style="font-size:12px;color:var(--text3);margin:0 0 12px">Format: <b>Name — ingredients</b> (one per line)</p>
        <label>🍽 Foods</label>
        <textarea id="food-preset-foods-edit"></textarea>
        <label>🥤 Drinks</label>
        <textarea id="food-preset-drinks-edit"></textarea>
        <div class="food-preset-modal-actions">
          <button class="food-preset-cancel" id="food-preset-cancel">Cancel</button>
          <button class="food-preset-save" id="food-preset-save">Save</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    $('#food-preset-cancel').addEventListener('click', () => modal.classList.add('hidden'));
    $('#food-preset-save').addEventListener('click', () => {
      const foods = parsePresetText($('#food-preset-foods-edit').value);
      const drinks = parsePresetText($('#food-preset-drinks-edit').value);
      saveFoodPresets({ foods, drinks });
      renderFoodPresets();
      modal.classList.add('hidden');
      showToast('Presets saved ✨');
    });
  }

  const presets = loadFoodPresets();
  $('#food-preset-foods-edit').value = presetToText(presets.foods);
  $('#food-preset-drinks-edit').value = presetToText(presets.drinks);
  modal.classList.remove('hidden');
}

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
  renderFoodPresets();
  const presetEditBtn = $('#food-preset-edit');
  if (presetEditBtn) presetEditBtn.addEventListener('click', openPresetEditor);
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
