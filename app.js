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
  initFirebase();
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
