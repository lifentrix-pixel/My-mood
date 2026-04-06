/* ── Core: Utilities, Navigation, Shared State, DOM Helpers ── */

// ── Firebase Configuration ──
const firebaseConfig = {
  apiKey: "AIzaSyA4HY1dgJpgM6X_gRD9yPQ9Elu4NyTkPhU",
  authDomain: "natalijas-mood-app.firebaseapp.com",
  projectId: "natalijas-mood-app",
  storageBucket: "natalijas-mood-app.firebasestorage.app",
  messagingSenderId: "217774131604",
  appId: "1:217774131604:web:a12adb385bbda37b046781"
};

// Extract first complete emoji (handles compound/ZWJ emojis)
function firstEmoji(str) {
  if (!str) return '';
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    const seg = new Intl.Segmenter('en', { granularity: 'grapheme' });
    for (const { segment } of seg.segment(str)) return segment;
  }
  return str.slice(0, 2);
}

// ── Firebase globals ──
let db = null;
let auth = null;
let currentUser = null;
let isOnline = navigator.onLine;

// ── DOM Helpers ──
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const fmt = v => Number(v).toFixed(1).replace('.0', '');

function timeStr(d) {
  return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function dateStr(d) {
  return new Date(d).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
}
function formatDateTime(d) {
  return dateStr(d) + ' at ' + timeStr(d);
}
function shortDate(d) {
  return new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric' });
}
function dayKey(d) {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
}
function startOfDay(date) {
  const d = new Date(date); d.setHours(0,0,0,0); return d;
}

function gradientColor(val) {
  const t = (val - 1) / 9;
  if (t < 0.5) {
    const r = 248, g = Math.round(113 + (191-113) * (t*2)), b = Math.round(113 + (36-113) * (t*2));
    return `rgb(${r},${g},${b})`;
  }
  const r = Math.round(251 + (52-251) * ((t-.5)*2));
  const g = Math.round(191 + (211-191) * ((t-.5)*2));
  const b = Math.round(36 + (153-36) * ((t-.5)*2));
  return `rgb(${r},${g},${b})`;
}

// ── Categories ──
const CATS = [
  { id: 'body',   emoji: '🫀', label: 'Body',   question: 'How does your body feel?',          color: '#f87171' },
  { id: 'energy', emoji: '⚡', label: 'Energy', question: "How's your energy level?",          color: '#fbbf24' },
  { id: 'mood',   emoji: '💜', label: 'Mood',   question: 'How are you feeling emotionally?',  color: '#a78bfa' },
  { id: 'mind',   emoji: '🧠', label: 'Mind',   question: 'How calm/clear is your mind?',      color: '#22d3ee' },
];

// ── Storage Keys ──
const STORE_KEY = 'innerscape_entries';
const DREAMS_KEY = 'innerscape_dreams';
const MED_STORE_KEY = 'innerscape_meditations';
const ACTIVITIES_KEY = 'innerscape_activities';
const TIME_ENTRIES_KEY = 'innerscape_time_entries';
const MEDICATIONS_KEY = 'innerscape_medications';
const MEDICATION_LOGS_KEY = 'innerscape_medication_logs';
const TODOS_KEY = 'innerscape_todos';
const CATEGORIES_KEY = 'innerscape_categories';
const FOOD_STORE_KEY = 'innerscape_food_entries';
const TIMER_COLORS = ['#f87171','#fbbf24','#a78bfa','#34d399','#f472b6','#38bdf8','#fb923c','#818cf8','#4ade80','#e879f9'];

const DEFAULT_CATEGORIES = [
  { id: 'cat-work', name: 'Work', emoji: '💼', color: '#38bdf8', description: '' },
  { id: 'cat-health', name: 'Health', emoji: '🏃', color: '#34d399', description: '' },
  { id: 'cat-creative', name: 'Creative', emoji: '🎨', color: '#f472b6', description: '' },
  { id: 'cat-social', name: 'Social', emoji: '👥', color: '#fbbf24', description: '' },
  { id: 'cat-selfcare', name: 'Self-care', emoji: '🧘', color: '#a78bfa', description: '' },
  { id: 'cat-learning', name: 'Learning', emoji: '📚', color: '#fb923c', description: '' },
];

// ── Storage: Mood ──
function loadEntries() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; } catch { return []; }
}
function saveEntry(entry) {
  const entries = loadEntries();
  entries.push(entry);
  localStorage.setItem(STORE_KEY, JSON.stringify(entries));
  setTimeout(() => syncMoodEntries(), 500);
}
function deleteEntry(ts) {
  const entries = loadEntries().filter(e => e.ts !== ts);
  localStorage.setItem(STORE_KEY, JSON.stringify(entries));
}

// ── Storage: Activities ──
function loadCategories() {
  try {
    const cats = JSON.parse(localStorage.getItem(CATEGORIES_KEY));
    if (cats && cats.length) return cats;
  } catch {}
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(DEFAULT_CATEGORIES));
  return [...DEFAULT_CATEGORIES];
}
function saveCategories(cats) { localStorage.setItem(CATEGORIES_KEY, JSON.stringify(cats)); }

function loadActivities() {
  try { return JSON.parse(localStorage.getItem(ACTIVITIES_KEY)) || []; } catch { return []; }
}
function saveActivities(acts) { 
  localStorage.setItem(ACTIVITIES_KEY, JSON.stringify(acts)); 
  if (currentUser && db) {
    setTimeout(() => syncActivities(), 100);
  }
}

function loadTimeEntries() {
  try { return JSON.parse(localStorage.getItem(TIME_ENTRIES_KEY)) || []; } catch { return []; }
}
function saveTimeEntries(entries) { 
  localStorage.setItem(TIME_ENTRIES_KEY, JSON.stringify(entries));
  if (currentUser && db) {
    setTimeout(() => syncTimeEntries(), 100);
  }
}

// ── Storage: Medications ──
function loadMedications() {
  try { return JSON.parse(localStorage.getItem(MEDICATIONS_KEY)) || []; } catch { return []; }
}
function saveMedications(medications) { 
  localStorage.setItem(MEDICATIONS_KEY, JSON.stringify(medications)); 
  if (currentUser && db) {
    setTimeout(() => syncMedications(), 100);
  }
}
function loadMedicationLogs() {
  try { return JSON.parse(localStorage.getItem(MEDICATION_LOGS_KEY)) || []; } catch { return []; }
}
function saveMedicationLogs(logs) { 
  localStorage.setItem(MEDICATION_LOGS_KEY, JSON.stringify(logs));
  if (currentUser && db) {
    setTimeout(() => syncMedicationLogs(), 100);
  }
}

// ── Storage: Food ──
function loadFoodEntries() {
  try { return JSON.parse(localStorage.getItem(FOOD_STORE_KEY)) || []; } catch { return []; }
}

// ── Storage: Meditations ──
function loadMeditations() {
  try { return JSON.parse(localStorage.getItem(MED_STORE_KEY)) || []; } catch { return []; }
}
function saveMeditation(entry) {
  const entries = loadMeditations();
  entries.push(entry);
  localStorage.setItem(MED_STORE_KEY, JSON.stringify(entries));
}
function deleteMeditation(ts) {
  const entries = loadMeditations().filter(e => e.ts !== ts);
  localStorage.setItem(MED_STORE_KEY, JSON.stringify(entries));
  const timeEntries = loadTimeEntries();
  const updatedTimeEntries = timeEntries.filter(e => 
    !(e.activityId === 'meditation-cleaning' && e.endTime === ts)
  );
  saveTimeEntries(updatedTimeEntries);
}

// ── Storage: Dreams ──
const DREAM_STORE_KEY = 'innerscape_dreams';

function loadDreams() {
  try { 
    const dreams = JSON.parse(localStorage.getItem(DREAM_STORE_KEY)) || [];
    const unique = [];
    const seenTs = new Set();
    const seenContent = new Set();
    
    dreams.forEach(dream => {
      const ts = dream.ts;
      const contentKey = (dream.text || '').slice(0, 80).trim();
      
      // Skip if we've seen this exact timestamp
      if (seenTs.has(ts)) return;
      
      // Skip if same content within 60 seconds (sync duplicates)
      if (contentKey) {
        const found = unique.find(d => 
          d.text && d.text.slice(0, 80).trim() === contentKey &&
          Math.abs(d.ts - ts) < 60000
        );
        if (found) return;
      }
      
      seenTs.add(ts);
      unique.push(dream);
    });
    
    if (unique.length !== dreams.length) {
      localStorage.setItem(DREAM_STORE_KEY, JSON.stringify(unique));
    }
    return unique;
  } catch { 
    return []; 
  }
}
function saveDreamEntry(dream) {
  const dreams = loadDreams();
  // Use ID if available, otherwise fall back to timestamp/content checks
  const exists = dream.id 
    ? dreams.some(d => d.id === dream.id)
    : dream.noRecall 
      ? dreams.some(d => d.ts === dream.ts)
      : dreams.some(d => d.ts === dream.ts || 
          (d.text === dream.text && Math.abs(d.ts - dream.ts) < 5000));
  if (!exists) {
    dreams.push(dream);
    localStorage.setItem(DREAM_STORE_KEY, JSON.stringify(dreams));
    if (currentUser && db) {
      setTimeout(() => syncDreams(), 100);
    }
  }
}
function deleteDreamEntry(ts) {
  const dreams = loadDreams().filter(d => d.ts !== ts);
  localStorage.setItem(DREAM_STORE_KEY, JSON.stringify(dreams));
}

// ── Storage: Todos ──
function loadTodos() {
  try { return JSON.parse(localStorage.getItem(TODOS_KEY)) || []; } catch { return []; }
}
function saveTodos(todos) {
  localStorage.setItem(TODOS_KEY, JSON.stringify(todos));
}

// ── Toast with Undo ──
let toastTimer;
let lastDeleted = null;

function showToast(msg, undoCallback) {
  const t = $('#toast');
  t.innerHTML = '';
  const span = document.createElement('span');
  span.textContent = msg;
  t.appendChild(span);
  if (undoCallback) {
    const btn = document.createElement('button');
    btn.className = 'toast-undo';
    btn.textContent = 'Undo';
    btn.addEventListener('click', () => {
      undoCallback();
      t.classList.remove('show');
      clearTimeout(toastTimer);
    });
    t.appendChild(btn);
  }
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), undoCallback ? 5000 : 2200);
}

// ── Navigation ──
let currentGroup = 'track';
let currentView = 'checkin';

function switchGroup(group) {
  if (group === currentGroup) return;
  currentGroup = group;
  $$('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.group === group));
  $$('.sub-nav-group').forEach(g => g.classList.toggle('active', g.dataset.group === group));
  const firstView = $(`.sub-nav-group[data-group="${group}"] .sub-nav-btn`).dataset.view;
  switchView(firstView);
}

function switchView(view) {
  if (view === currentView) return;
  const old = $(`#view-${currentView}`);
  const next = $(`#view-${view}`);
  
  old.classList.remove('active');
  old.style.display = 'none';
  
  next.style.display = 'block';
  next.classList.add('entering');
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      next.classList.remove('entering');
      next.classList.add('active');
    });
  });
  
  $$('.sub-nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  currentView = view;

  // Dreamland mode: hide nav when in wishlist or intentions
  document.body.classList.toggle('in-dreamland', view === 'wishlist' || view === 'intentions');
  
  if (view === 'checkin') renderTodayStats();
  if (view === 'food') initFood();
  if (view === 'medication') renderMedication();
  if (view === 'stool') showStoolPage();
  if (view === 'forecast') showForecastPage();
  if (view === 'oura') showOuraPage();
  if (view === 'activity-overview') showActivityOverview();
  if (view === 'todos') renderTodos();
  if (view === 'today') renderToday();
  if (view === 'dreams') renderDreams();
  if (view === 'intentions') initIntentions();
  if (view === 'meditate') renderMedHistory();
  if (view === 'weekly') renderWeekly();
  if (view === 'monthly') renderMonthly();
  if (view === 'trends') renderTrends();
  if (view === 'timer') renderTimerView();
  if (view === 'studio') renderStudioGallery();
  if (view === 'media') initMedia();
  if (view === 'export') initExport();
  
  migrateMeditationToTimer();
}

function exitDreamland() {
  document.body.classList.remove('in-dreamland');
  switchGroup('track');
  switchView('checkin');
}

// ── Slider helpers ──
function updateSliderFill(input) {
  const pct = ((input.value - 1) / 9) * 100;
  const cat = input.closest('.slider-card').dataset.cat;
  const catObj = CATS.find(c => c.id === cat);
  input.style.background = `linear-gradient(to right, ${catObj.color} 0%, ${catObj.color} ${pct}%, #1e1e2a ${pct}%)`;
}

// ── Notifications ──
function setupNotifications() {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
  if (Notification.permission === 'default') {
    setTimeout(() => {
      Notification.requestPermission().then(p => {
        if (p === 'granted') scheduleReminder();
      });
    }, 5000);
  } else if (Notification.permission === 'granted') {
    scheduleReminder();
  }
}

let reminderInterval;
function scheduleReminder() {
  clearInterval(reminderInterval);
  const THREE_HOURS = 3 * 60 * 60 * 1000;
  reminderInterval = setInterval(() => {
    if (document.hidden) {
      navigator.serviceWorker.ready.then(reg => {
        reg.showNotification('Innerscape', {
          body: 'Time for a check-in ✦ How are you feeling?',
          icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">✦</text></svg>',
          tag: 'reminder',
          renotify: true,
        });
      });
    }
  }, THREE_HOURS);
}

// ── Service Worker ──
function registerSW() {
  if (!('serviceWorker' in navigator)) return;

  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) { refreshing = true; window.location.reload(); }
  });

  navigator.serviceWorker.register('sw.js').then(reg => {
    // Check for updates on load
    reg.update();

    // Check every 2 minutes
    setInterval(() => { reg.update(); }, 120000);

    // When a new SW is found
    function trackInstalling(worker) {
      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) {
          showUpdateBanner(worker);
        }
      });
    }

    if (reg.waiting) {
      showUpdateBanner(reg.waiting);
    }
    reg.addEventListener('updatefound', () => {
      if (reg.installing) trackInstalling(reg.installing);
    });
  });
}

function showUpdateBanner(worker) {
  // Don't show duplicates
  if (document.getElementById('update-banner')) return;

  const banner = document.createElement('div');
  banner.id = 'update-banner';
  banner.innerHTML = `
    <div class="update-banner-inner">
      <span>✨ Update available</span>
      <button id="update-btn">Refresh</button>
    </div>
  `;
  document.body.appendChild(banner);

  document.getElementById('update-btn').addEventListener('click', () => {
    try { worker.postMessage('SKIP_WAITING'); } catch(e) {}
    banner.remove();
    // Fallback: if controllerchange doesn't fire within 1s, force reload
    setTimeout(() => { window.location.reload(); }, 1000);
  });
}

// ── Data Safety Net ──
function createAutomaticBackup() {
  try {
    const backupData = {
      timestamp: Date.now(),
      version: 'v24',
      entries: loadEntries(),
      dreams: loadDreams(),
      activities: loadActivities(),
      timeEntries: loadTimeEntries(),
      medSessions: loadMeditations(),
      foodEntries: loadFoodEntries()
    };
    const backups = JSON.parse(localStorage.getItem('innerscape_auto_backups') || '[]');
    backups.push(backupData);
    if (backups.length > 3) backups.shift();
    localStorage.setItem('innerscape_auto_backups', JSON.stringify(backups));
  } catch (e) {
  }
}

function scheduleBackups() {
  setTimeout(createAutomaticBackup, 5000);
  setInterval(createAutomaticBackup, 30 * 60 * 1000);
}

// ── Utility: format duration ──
function formatDuration(ms) {
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return '<1m';
}

function fmtClock(ms) {
  const t = Math.floor(ms / 1000);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function downloadFile(content, filename, type = 'text/plain') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Sub-activity management
function addSubActivity(parentId, subActivity) {
  const activities = loadActivities();
  const parent = activities.find(a => a.id === parentId);
  if (!parent) return;
  if (!parent.subActivities) parent.subActivities = [];
  const newSub = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name: subActivity.name,
    emoji: subActivity.emoji,
    createdAt: Date.now()
  };
  parent.subActivities.push(newSub);
  saveActivities(activities);
  return newSub;
}

function removeSubActivity(parentId, subId) {
  const activities = loadActivities();
  const parent = activities.find(a => a.id === parentId);
  if (!parent || !parent.subActivities) return;
  parent.subActivities = parent.subActivities.filter(s => s.id !== subId);
  saveActivities(activities);
}

// Deletion tracking
function getDeletedIds(collection) {
  try { return JSON.parse(localStorage.getItem('innerscape_deleted_' + collection)) || []; } catch { return []; }
}
function trackDeletion(collection, id) {
  const ids = getDeletedIds(collection);
  if (!ids.includes(id)) { ids.push(id); localStorage.setItem('innerscape_deleted_' + collection, JSON.stringify(ids)); }
  if (currentUser && db) {
    db.collection('users').doc(currentUser.uid).collection(collection).doc(id).delete().catch(() => {});
  }
}
function untrackDeletion(collection, id) {
  const ids = getDeletedIds(collection).filter(x => x !== id);
  localStorage.setItem('innerscape_deleted_' + collection, JSON.stringify(ids));
}


/* ── Data Validation & Error Handling ── */
function validateMoodEntry(entry) {
  if (!entry || typeof entry !== 'object') return false;
  const requiredFields = ['body', 'energy', 'mood', 'mind', 'ts'];
  return requiredFields.every(field => 
    entry.hasOwnProperty(field) && 
    (field === 'ts' ? Number.isInteger(entry[field]) : typeof entry[field] === 'number')
  );
}

function validateTimeEntry(entry) {
  if (!entry || typeof entry !== 'object') return false;
  return entry.hasOwnProperty('activityId') && 
         entry.hasOwnProperty('startTime') && 
         entry.hasOwnProperty('endTime') &&
         Number.isInteger(entry.startTime) &&
         Number.isInteger(entry.endTime) &&
         entry.endTime > entry.startTime;
}

function safeParseJSON(str, fallback = null) {
  try {
    return JSON.parse(str) || fallback;
  } catch {
    return fallback;
  }
}

// Better localStorage with validation
function safeLoadEntries() {
  const entries = loadEntries();
  return entries.filter(validateMoodEntry);
}

function safeLoadTimeEntries() {
  const entries = loadTimeEntries();
  return entries.filter(validateTimeEntry);
}
