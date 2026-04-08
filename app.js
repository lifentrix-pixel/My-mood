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
});

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
