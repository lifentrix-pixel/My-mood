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

  list.innerHTML = recent.map(n => `
    <div class="quick-note-card">
      <div class="quick-note-card-time">${timeStr(n.ts)} · ${dateStr(n.ts)}</div>
      <div class="quick-note-card-text">${n.text}</div>
      <button class="quick-note-delete" onclick="deleteQuickNote('${n.id}')">✕</button>
    </div>
  `).join('');
}

function deleteQuickNote(id) {
  const notes = JSON.parse(localStorage.getItem('innerscape_quick_notes') || '[]');
  localStorage.setItem('innerscape_quick_notes', JSON.stringify(notes.filter(n => n.id !== id)));
  renderQuickNotes();
}
