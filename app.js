/* ── Innerscape — App Init ── */

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
});

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
