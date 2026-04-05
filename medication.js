/* ── Medication Module ── */

let currentLoggingMedication = null;

function initMedication() {
  const addBtn = $('#medication-add-btn');
  if (addBtn) {
    addBtn.addEventListener('click', openMedicationModal);
  } else {
    console.error('medication-add-btn not found');
  }
  
  const cancelBtn = $('#medication-cancel');
  if (cancelBtn) cancelBtn.addEventListener('click', closeMedicationModal);
  
  const saveBtn = $('#medication-save');
  if (saveBtn) saveBtn.addEventListener('click', saveMedication);
  
  const historyBtn = $('#medication-history-btn');
  if (historyBtn) historyBtn.addEventListener('click', showMedicationHistory);
  
  const historyBackBtn = $('#medication-history-back');
  if (historyBackBtn) historyBackBtn.addEventListener('click', hideMedicationHistory);
  
  const logCancelBtn = $('#medication-log-cancel');
  if (logCancelBtn) logCancelBtn.addEventListener('click', closeMedicationLogModal);
  
  const logSaveBtn = $('#medication-log-save');
  if (logSaveBtn) logSaveBtn.addEventListener('click', saveMedicationLog);
  
  const picksEl = $('#medication-color-picks');
  if (picksEl && TIMER_COLORS) {
    TIMER_COLORS.forEach(c => {
      const btn = document.createElement('div');
      btn.className = 'timer-color-pick';
      btn.style.background = c;
      btn.addEventListener('click', () => {
        picksEl.querySelectorAll('.timer-color-pick').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      });
      picksEl.appendChild(btn);
    });
    picksEl.firstElementChild?.classList.add('selected');
  } else {
    console.error('medication-color-picks not found or TIMER_COLORS not defined');
  }
}

function renderMedication() {
  $('#medication-date').textContent = dateStr(new Date());
  renderTodayMedications();
}

function renderTodayMedications() {
  const medications = loadMedications();
  const logs = loadMedicationLogs();
  const todayStart = startOfDay(new Date()).getTime();
  const todayLogs = logs.filter(log => log.timestamp >= todayStart);
  
  const list = $('#medication-list');
  const empty = $('#medication-empty');
  list.innerHTML = '';
  
  if (!medications.length) {
    empty.classList.add('show');
    return;
  }
  empty.classList.remove('show');
  
  medications.forEach(med => {
    const todayMedLogs = todayLogs.filter(log => log.medicationId === med.id);
    const item = document.createElement('div');
    item.className = 'medication-item';
    item.style.borderLeft = `4px solid ${med.color || TIMER_COLORS[0]}`;
    
    if (med.frequency === 'once' && todayMedLogs.length > 0) {
      item.classList.add('taken');
    }
    
    const checkbox = document.createElement('div');
    checkbox.className = 'medication-checkbox';
    checkbox.style.borderColor = med.color || TIMER_COLORS[0];
    if (med.frequency === 'multiple') {
      checkbox.classList.add('multiple');
    }
    
    if (med.frequency === 'once' && todayMedLogs.length > 0) {
      checkbox.classList.add('checked');
      checkbox.textContent = '✓';
      checkbox.style.background = med.color || TIMER_COLORS[0];
    } else if (med.frequency === 'multiple' && todayMedLogs.length > 0) {
      checkbox.textContent = todayMedLogs.length;
      checkbox.style.background = med.color || TIMER_COLORS[0];
    } else {
      checkbox.textContent = '';
    }
    
    // Add undo button for logged meds
    let undoBtn = '';
    if (todayMedLogs.length > 0) {
      const lastLog = todayMedLogs[todayMedLogs.length - 1];
      undoBtn = `<button class="med-undo-btn" data-log-id="${lastLog.id}" title="Undo last log">↩️</button>`;
    }
    
    item.innerHTML = `
      <div class="medication-info">
        <div class="medication-name" style="color:${med.color || TIMER_COLORS[0]}">${med.name}</div>
        <div class="medication-dosage">${med.dosage}</div>
        <div class="medication-frequency">${med.frequency === 'once' ? 'Once daily' : 'Multiple daily'}${todayMedLogs.length > 0 ? ` · ${timeStr(todayMedLogs[todayMedLogs.length-1].timestamp)}` : ''}</div>
      </div>
      ${undoBtn}
      <button class="medication-edit-btn" title="Edit">✏️</button>
      <button class="medication-delete-btn" title="Delete">×</button>
    `;
    
    item.insertBefore(checkbox, item.firstChild);
    
    // Make entire item clickable to log medication
    item.addEventListener('click', (e) => {
      // Don't trigger if clicking edit or delete buttons
      if (e.target.matches('.medication-edit-btn, .medication-delete-btn')) return;
      logMedication(med);
    });
    
    const undoBtnEl = item.querySelector('.med-undo-btn');
    if (undoBtnEl) {
      undoBtnEl.addEventListener('click', (e) => {
        e.stopPropagation();
        undoMedicationLog(undoBtnEl.dataset.logId);
      });
    }
    
    item.querySelector('.medication-edit-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      editMedication(med);
    });
    
    item.querySelector('.medication-delete-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteMedication(med.id);
    });
    
    list.appendChild(item);
  });
}

function openMedicationModal() {
  editingMedicationId = null;
  const modal = $('#medication-modal');
  if (!modal) return;
  
  modal.classList.remove('hidden');
  $('#medication-modal-title').textContent = 'Add Medication';
  $('#medication-save').textContent = 'Save';
  
  $('#medication-name').value = '';
  $('#medication-dosage').value = '';
  $('#medication-frequency').value = 'once';
  
  // Reset color picker selection
  const picks = modal.querySelectorAll('.timer-color-pick');
  picks.forEach(b => b.classList.remove('selected'));
  if (picks.length) picks[0].classList.add('selected');
  
  setTimeout(() => $('#medication-name').focus(), 100);
}

function closeMedicationModal() {
  $('#medication-modal').classList.add('hidden');
  editingMedicationId = null;
}

function saveMedication() {
  const saveBtn = $('#medication-save');
  if (saveBtn.disabled) return;
  saveBtn.disabled = true;
  
  try {
    const name = $('#medication-name').value.trim();
    const dosage = $('#medication-dosage').value.trim();
    const frequency = $('#medication-frequency').value;
    
    if (!name) {
      showToast('Enter medication name');
      $('#medication-name').focus();
      saveBtn.disabled = false;
      return;
    }
    
    if (!dosage) {
      showToast('Enter dosage');
      $('#medication-dosage').focus();
      saveBtn.disabled = false;
      return;
    }
    
    const selectedColor = $('#medication-color-picks .timer-color-pick.selected');
    const color = selectedColor ? selectedColor.style.background : TIMER_COLORS[0];
    
    const medications = loadMedications();
    
    if (editingMedicationId) {
      const med = medications.find(m => m.id === editingMedicationId);
      if (med) {
        med.name = name;
        med.dosage = dosage;
        med.frequency = frequency;
        med.color = color;
        med.updatedAt = Date.now();
      }
      saveMedications(medications);
      closeMedicationModal();
      renderTodayMedications();
      showToast('Medication updated ✓');
    } else {
      const newMedication = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        name,
        dosage,
        frequency,
        color,
        createdAt: Date.now()
      };
      medications.push(newMedication);
      saveMedications(medications);
      closeMedicationModal();
      renderTodayMedications();
      showToast('Medication added ✓');
    }
    
  } finally {
    setTimeout(() => { saveBtn.disabled = false; }, 1000);
  }
}

function logMedication(medication) {
  const logs = loadMedicationLogs();
  const todayStart = startOfDay(new Date()).getTime();
  const todayLogs = logs.filter(log => log.medicationId === medication.id && log.timestamp >= todayStart);
  
  // Even if already taken today, allow opening modal to log for other dates
  
  currentLoggingMedication = medication;
  $('#medication-log-modal').classList.remove('hidden');
  $('#medication-log-title').textContent = `Log ${medication.name}`;
  
  const now = new Date();
  $('#medication-log-time').value = now.toTimeString().slice(0, 5);
  $('#medication-log-date').value = now.toISOString().split('T')[0];
  $('#medication-log-notes').value = '';
  
  setTimeout(() => $('#medication-log-time').focus(), 100);
}

function closeMedicationLogModal() {
  $('#medication-log-modal').classList.add('hidden');
  currentLoggingMedication = null;
}

function saveMedicationLog() {
  if (!currentLoggingMedication) return;
  
  const saveBtn = $('#medication-log-save');
  if (saveBtn.disabled) return;
  saveBtn.disabled = true;
  
  try {
    const time = $('#medication-log-time').value;
    const notes = $('#medication-log-notes').value.trim();
    
    if (!time) {
      showToast('Select time');
      $('#medication-log-time').focus();
      saveBtn.disabled = false;
      return;
    }
    
    // Use selected date or default to today
    const dateInput = $('#medication-log-date');
    let logDate;
    if (dateInput && dateInput.value) {
      logDate = new Date(dateInput.value + 'T00:00:00');
    } else {
      logDate = startOfDay(new Date());
    }
    const [hours, minutes] = time.split(':').map(Number);
    logDate.setHours(hours, minutes, 0, 0);
    
    const logs = loadMedicationLogs();
    const newLog = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      medicationId: currentLoggingMedication.id,
      medicationName: currentLoggingMedication.name,
      dosage: currentLoggingMedication.dosage,
      timestamp: logDate.getTime(),
      notes,
      createdAt: Date.now()
    };
    
    logs.push(newLog);
    saveMedicationLogs(logs);
    
    closeMedicationLogModal();
    renderTodayMedications();
    showToast(`${currentLoggingMedication.name} logged ✓`);
    
  } finally {
    setTimeout(() => { saveBtn.disabled = false; }, 1000);
  }
}

let editingMedicationId = null;

function editMedication(medication) {
  editingMedicationId = medication.id;
  const modal = $('#medication-modal');
  if (!modal) return;

  modal.classList.remove('hidden');
  $('#medication-modal-title').textContent = 'Edit Medication';
  $('#medication-save').textContent = 'Save Changes';

  $('#medication-name').value = medication.name;
  $('#medication-dosage').value = medication.dosage;
  $('#medication-frequency').value = medication.frequency || 'once';

  // Select matching color
  const picks = modal.querySelectorAll('.timer-color-pick');
  picks.forEach(b => {
    b.classList.remove('selected');
    if (b.style.background === medication.color) b.classList.add('selected');
  });
  // If no match, select first
  if (!modal.querySelector('.timer-color-pick.selected') && picks.length) {
    picks[0].classList.add('selected');
  }

  setTimeout(() => $('#medication-name').focus(), 100);
}

function deleteMedication(id) {
  const medications = loadMedications();
  const deleted = medications.find(m => m.id === id);
  if (!deleted) return;
  
  saveMedications(medications.filter(m => m.id !== id));
  trackDeletion('medications', id);
  renderTodayMedications();
  
  showToast('Medication deleted', () => {
    const current = loadMedications();
    current.push(deleted);
    saveMedications(current);
    untrackDeletion('medications', id);
    renderTodayMedications();
  });
}

function showMedicationHistory() {
  $('#medication-today').classList.add('hidden');
  $('#medication-history').classList.remove('hidden');
  renderMedicationHistory();
}

function hideMedicationHistory() {
  $('#medication-history').classList.add('hidden');
  $('#medication-today').classList.remove('hidden');
}

function renderMedicationHistory() {
  const logs = loadMedicationLogs();
  const list = $('#medication-history-list');
  list.innerHTML = '';
  
  if (!logs.length) {
    list.innerHTML = '<div class="empty-state"><span class="empty-icon">📋</span><p>No medication history yet</p></div>';
    return;
  }
  
  const groupedByDate = {};
  logs.forEach(log => {
    const dk = dayKey(log.timestamp);
    if (!groupedByDate[dk]) groupedByDate[dk] = [];
    groupedByDate[dk].push(log);
  });
  
  const sortedDates = Object.keys(groupedByDate).sort((a, b) => new Date(b) - new Date(a));
  
  sortedDates.forEach(dk => {
    const entry = document.createElement('div');
    entry.className = 'medication-history-entry';
    
    const dayLogs = groupedByDate[dk].sort((a, b) => b.timestamp - a.timestamp);
    
    entry.innerHTML = `
      <div class="medication-history-date">${dateStr(new Date(dk))}</div>
      ${dayLogs.map(log => `
        <div class="medication-history-item" data-log-id="${log.id}">
          <div style="flex:1">
            <strong>${log.medicationName}</strong> (${log.dosage})
            <div style="font-size: 12px; color: var(--text-secondary);">${timeStr(log.timestamp)}</div>
            ${log.notes ? `<div style="font-size: 12px; color: var(--text-tertiary); margin-top: 2px;">${log.notes}</div>` : ''}
          </div>
          <button class="med-log-delete-btn" data-log-id="${log.id}" title="Remove log">✕</button>
        </div>
      `).join('')}
    `;
    
    list.appendChild(entry);
  });
  
  // Add delete handlers
  list.querySelectorAll('.med-log-delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const logId = btn.dataset.logId;
      undoMedicationLog(logId);
    });
  });
}

function undoMedicationLog(logId) {
  const logs = loadMedicationLogs();
  const log = logs.find(l => l.id === logId);
  if (!log) { showToast('Log not found'); return; }
  
  const filtered = logs.filter(l => l.id !== logId);
  saveMedicationLogs(filtered);
  showToast(`Removed ${log.medicationName} log`, () => {
    // Undo: re-add
    const current = loadMedicationLogs();
    current.push(log);
    saveMedicationLogs(current);
    renderMedicationHistory();
    renderTodayMedications();
  });
  renderMedicationHistory();
  renderTodayMedications();
}
