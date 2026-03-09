// Stool Tracker Module
let stoolEntries = [];

function initStoolModule() {
  loadStoolData();
}

function loadStoolData() {
  const stored = localStorage.getItem('innerscape_stool_entries');
  stoolEntries = stored ? JSON.parse(stored) : [];
}

function saveStoolData() {
  localStorage.setItem('innerscape_stool_entries', JSON.stringify(stoolEntries));
}

const BRISTOL = [
  { type: 1, emoji: '🪨', label: 'Hard lumps', desc: 'Separate hard lumps', color: '#8B6914' },
  { type: 2, emoji: '🥜', label: 'Lumpy sausage', desc: 'Sausage-shaped but lumpy', color: '#96751A' },
  { type: 3, emoji: '🌽', label: 'Cracked sausage', desc: 'Like a sausage with cracks', color: '#A08020' },
  { type: 4, emoji: '🍌', label: 'Smooth & soft', desc: 'Like a smooth snake', color: '#34d399' },
  { type: 5, emoji: '☁️', label: 'Soft blobs', desc: 'Soft blobs with clear edges', color: '#D4A020' },
  { type: 6, emoji: '🫠', label: 'Mushy', desc: 'Fluffy pieces, mushy', color: '#E8943A' },
  { type: 7, emoji: '💧', label: 'Liquid', desc: 'Entirely liquid, no solid', color: '#f87171' },
];

const MANNER_OPTIONS = [
  { value: 'normal', emoji: '✅', label: 'Normal' },
  { value: 'urgent', emoji: '⚡', label: 'Urgent' },
  { value: 'explosive', emoji: '💥', label: 'Explosive' },
  { value: 'difficult', emoji: '😤', label: 'Straining' },
  { value: 'incomplete', emoji: '🔄', label: 'Incomplete' },
];

const THICKNESS_OPTIONS = [
  { value: 'thin', emoji: '🧵', label: 'Thin/Narrow' },
  { value: 'normal', emoji: '📏', label: 'Normal Width' },
  { value: 'thick', emoji: '🌭', label: 'Thick/Wide' },
];

const AMOUNT_OPTIONS = [
  { value: 'minimal', emoji: '·', label: 'Traces' },
  { value: 'small', emoji: '•', label: 'Small' },
  { value: 'normal', emoji: '●', label: 'Normal' },
  { value: 'large', emoji: '⬤', label: 'Large' },
];

const SYMPTOMS = [
  { id: 'pain', emoji: '😣', label: 'Pain' },
  { id: 'cramping', emoji: '🔥', label: 'Cramping' },
  { id: 'bloating', emoji: '🎈', label: 'Bloating' },
  { id: 'urgency', emoji: '🏃‍♀️', label: 'Urgency' },
  { id: 'gas', emoji: '💨', label: 'Gas' },
  { id: 'nausea', emoji: '🤢', label: 'Nausea' },
  { id: 'blood', emoji: '🩸', label: 'Blood' },
];

let selectedBristol = null;
let selectedManner = new Set();
let selectedThickness = '';
let selectedAmount = '';
let selectedSymptoms = new Set();

function showStoolPage() {
  selectedBristol = null;
  selectedManner = '';
  selectedAmount = '';
  selectedSymptoms = new Set();

  const content = `
    <div class="stool-page">
      <div class="stool-hero">
        <div class="stool-hero-icon">💩</div>
        <h2>Stool Tracker</h2>
        <p class="stool-subtitle">Track patterns for digestive health</p>
      </div>

      <div class="stool-card">
        <div class="stool-card-header">
          <span class="stool-card-icon">📊</span>
          <span>Bristol Scale</span>
        </div>
        <div class="bristol-grid" id="bristol-grid">
          ${BRISTOL.map(b => `
            <button class="bristol-pill" data-type="${b.type}" onclick="selectBristol(${b.type})">
              <span class="bristol-pill-emoji">${b.emoji}</span>
              <span class="bristol-pill-label">${b.label}</span>
              <span class="bristol-pill-num">${b.type}</span>
            </button>
          `).join('')}
        </div>
        <div id="bristol-detail" class="bristol-detail hidden"></div>
      </div>

      <div class="stool-card">
        <div class="stool-card-header">
          <span class="stool-card-icon">💨</span>
          <span>How it came out</span>
          <span class="stool-card-note">(can select multiple)</span>
        </div>
        <div class="pill-row pill-row-wrap" id="manner-row">
          ${MANNER_OPTIONS.map(m => `
            <button class="option-pill" data-value="${m.value}" onclick="toggleManner('${m.value}')">
              <span>${m.emoji}</span> ${m.label}
            </button>
          `).join('')}
        </div>
      </div>

      <div class="stool-card">
        <div class="stool-card-header">
          <span class="stool-card-icon">📐</span>
          <span>Thickness</span>
        </div>
        <div class="pill-row" id="thickness-row">
          ${THICKNESS_OPTIONS.map(t => `
            <button class="option-pill" data-value="${t.value}" onclick="selectThickness('${t.value}')">
              <span>${t.emoji}</span> ${t.label}
            </button>
          `).join('')}
        </div>
      </div>

      <div class="stool-card">
        <div class="stool-card-header">
          <span class="stool-card-icon">📏</span>
          <span>Amount</span>
        </div>
        <div class="pill-row" id="amount-row">
          ${AMOUNT_OPTIONS.map(a => `
            <button class="option-pill" data-value="${a.value}" onclick="selectAmount('${a.value}')">
              <span>${a.emoji}</span> ${a.label}
            </button>
          `).join('')}
        </div>
      </div>

      <div class="stool-card">
        <div class="stool-card-header">
          <span class="stool-card-icon">⚠️</span>
          <span>Symptoms</span>
        </div>
        <div class="pill-row pill-row-wrap" id="symptom-row">
          ${SYMPTOMS.map(s => `
            <button class="option-pill" data-symptom="${s.id}" onclick="toggleSymptom('${s.id}')">
              <span>${s.emoji}</span> ${s.label}
            </button>
          `).join('')}
        </div>
      </div>

      <div class="stool-card">
        <div class="stool-card-header">
          <span class="stool-card-icon">📝</span>
          <span>Notes</span>
        </div>
        <textarea id="stool-notes" class="stool-textarea" placeholder="Triggers, food, timing..."></textarea>
      </div>

      <button class="stool-save-btn" onclick="saveStoolEntry()">
        💾 Save Entry
      </button>

      <div class="stool-history-section">
        <h3 class="stool-history-title">Recent Entries</h3>
        <div id="stool-list"></div>
      </div>
    </div>
  `;

  document.getElementById('stool-content').innerHTML = content;
  renderStoolList();
}

function selectBristol(type) {
  selectedBristol = type;
  document.querySelectorAll('.bristol-pill').forEach(el => {
    el.classList.toggle('active', parseInt(el.dataset.type) === type);
  });
  const b = BRISTOL[type - 1];
  const detail = document.getElementById('bristol-detail');
  detail.innerHTML = `<span style="color:${b.color}">${b.emoji} Type ${b.type}:</span> ${b.desc}`;
  detail.classList.remove('hidden');
}

function toggleManner(value) {
  if (selectedManner.has(value)) selectedManner.delete(value);
  else selectedManner.add(value);
  document.querySelectorAll('#manner-row .option-pill').forEach(el => {
    el.classList.toggle('active', selectedManner.has(el.dataset.value));
  });
}

function selectThickness(value) {
  selectedThickness = selectedThickness === value ? '' : value;
  document.querySelectorAll('#thickness-row .option-pill').forEach(el => {
    el.classList.toggle('active', el.dataset.value === selectedThickness);
  });
}

function selectAmount(value) {
  selectedAmount = selectedAmount === value ? '' : value;
  document.querySelectorAll('#amount-row .option-pill').forEach(el => {
    el.classList.toggle('active', el.dataset.value === selectedAmount);
  });
}

function toggleSymptom(id) {
  if (selectedSymptoms.has(id)) selectedSymptoms.delete(id);
  else selectedSymptoms.add(id);
  document.querySelectorAll('#symptom-row .option-pill').forEach(el => {
    el.classList.toggle('active', selectedSymptoms.has(el.dataset.symptom));
  });
}

function saveStoolEntry() {
  if (!selectedBristol) {
    showToast('Please select a Bristol type');
    return;
  }

  const b = BRISTOL[selectedBristol - 1];
  const entry = {
    id: 'stool-' + Date.now(),
    timestamp: Date.now(),
    bristol: selectedBristol,
    bristolDesc: b.label,
    manner: [...selectedManner].map(value => {
      const m = MANNER_OPTIONS.find(m => m.value === value);
      return m ? m.label : value;
    }),
    thickness: selectedThickness,
    amount: selectedAmount,
    symptoms: [...selectedSymptoms].map(id => {
      const s = SYMPTOMS.find(s => s.id === id);
      return s ? s.label : id;
    }),
    notes: document.getElementById('stool-notes').value.trim()
  };

  stoolEntries.unshift(entry);
  saveStoolData();
  showToast('💩 Entry saved!');

  // Reset form
  selectedBristol = null;
  selectedManner = new Set();
  selectedThickness = '';
  selectedAmount = '';
  selectedSymptoms = new Set();
  document.querySelectorAll('.bristol-pill, .option-pill').forEach(el => el.classList.remove('active'));
  document.getElementById('bristol-detail').classList.add('hidden');
  document.getElementById('stool-notes').value = '';
  renderStoolList();
}

function renderStoolList() {
  const list = document.getElementById('stool-list');
  if (!list) return;

  if (!stoolEntries.length) {
    list.innerHTML = '<div class="stool-empty">No entries yet — log your first one above ☝️</div>';
    return;
  }

  list.innerHTML = stoolEntries.slice(0, 15).map(entry => {
    const b = BRISTOL[entry.bristol - 1] || BRISTOL[3];
    const pills = [];
    if (entry.manner && entry.manner.length) {
      // Handle both old single string and new array format
      const mannerArray = Array.isArray(entry.manner) ? entry.manner : [entry.manner];
      pills.push(...mannerArray);
    }
    if (entry.thickness) {
      const t = THICKNESS_OPTIONS.find(t => t.value === entry.thickness);
      pills.push(t ? t.label : entry.thickness);
    }
    if (entry.amount) {
      const a = AMOUNT_OPTIONS.find(a => a.value === entry.amount);
      pills.push(a ? a.label : entry.amount);
    }

    return `
      <div class="stool-history-card">
        <div class="stool-history-top">
          <div class="stool-history-left">
            <span class="stool-history-emoji">${b.emoji}</span>
            <div>
              <div class="stool-history-type" style="color:${b.color}">Type ${entry.bristol} · ${b.label}</div>
              <div class="stool-history-time">${formatDateTime(entry.timestamp)}</div>
            </div>
          </div>
          <button onclick="deleteStoolEntry('${entry.id}')" class="stool-delete-btn">✕</button>
        </div>
        ${pills.length || entry.symptoms.length ? `
          <div class="stool-history-pills">
            ${pills.map(p => `<span class="stool-tag">${p}</span>`).join('')}
            ${entry.symptoms.map(s => `<span class="stool-tag symptom">${s}</span>`).join('')}
          </div>
        ` : ''}
        ${entry.notes ? `<div class="stool-history-notes">${entry.notes}</div>` : ''}
      </div>
    `;
  }).join('');
}

function deleteStoolEntry(id) {
  if (!confirm('Delete this entry?')) return;
  stoolEntries = stoolEntries.filter(e => e.id !== id);
  saveStoolData();
  renderStoolList();
  showToast('Entry deleted');
}

if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', initStoolModule);
}
