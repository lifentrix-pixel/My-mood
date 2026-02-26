/* ── Dream Journal ── */

const DREAM_TAGS = [
  { id: 'vivid', label: '🌈 Vivid' },
  { id: 'nightmare', label: '😱 Nightmare' },
  { id: 'lucid', label: '✨ Lucid' },
  { id: 'recurring', label: '🔁 Recurring' },
  { id: 'pleasant', label: '💕 Pleasant' },
  { id: 'weird', label: '🌀 Weird' },
  { id: 'people', label: '👥 People' },
  { id: 'adventure', label: '🏃 Adventure' },
];

// IndexedDB for audio blobs
function openDreamDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('innerscape_dreams_audio', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('audio');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function saveAudioBlob(key, blob) {
  const db = await openDreamDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('audio', 'readwrite');
    tx.objectStore('audio').put(blob, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
async function getAudioBlob(key) {
  const db = await openDreamDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('audio', 'readonly');
    const req = tx.objectStore('audio').get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function deleteAudioBlob(key) {
  const db = await openDreamDB();
  return new Promise((resolve) => {
    const tx = db.transaction('audio', 'readwrite');
    tx.objectStore('audio').delete(key);
    tx.oncomplete = () => resolve();
  });
}

// State
let dreamMediaRecorder = null;
let dreamAudioChunks = [];
let dreamRecognition = null;
let dreamTranscript = '';
let dreamSelectedTags = new Set();
let dreamAudioBlob = null;
let dreamCurrentAudio = null;

function initDreams() {
  const tagsEl = $('#dream-tags');
  DREAM_TAGS.forEach(tag => {
    const btn = document.createElement('button');
    btn.className = 'dream-tag';
    btn.textContent = tag.label;
    btn.dataset.tagId = tag.id;
    btn.addEventListener('click', () => {
      btn.classList.toggle('active');
      if (dreamSelectedTags.has(tag.id)) dreamSelectedTags.delete(tag.id);
      else dreamSelectedTags.add(tag.id);
    });
    tagsEl.appendChild(btn);
  });

  $('#dream-record-btn').addEventListener('click', startDreamRecording);
  $('#dream-type-btn').addEventListener('click', startDreamTyping);
  $('#dream-stop-btn').addEventListener('click', stopDreamRecording);
  $('#dream-save-btn').addEventListener('click', saveDream);
  $('#dream-discard-btn').addEventListener('click', discardDream);
  $('#dream-no-recall-btn').addEventListener('click', saveNoRecall);
  $('#dream-recover-btn').addEventListener('click', recoverDreamsFromFirebase);
  $('#dream-cleanup-btn').addEventListener('click', cleanupDreamDuplicates);

  // Tab navigation
  $('#dream-tab-record').addEventListener('click', () => switchDreamTab('record'));
  $('#dream-tab-history').addEventListener('click', () => switchDreamTab('history'));

  // History controls
  $('#dream-search').addEventListener('input', filterDreamHistory);
  $('#dream-filter-all').addEventListener('click', () => setDreamFilter('all'));
  $('#dream-filter-vivid').addEventListener('click', () => setDreamFilter('vivid'));
  $('#dream-filter-nightmare').addEventListener('click', () => setDreamFilter('nightmare'));
  $('#dream-filter-lucid').addEventListener('click', () => setDreamFilter('lucid'));
}

function startDreamTyping() {
  dreamAudioBlob = null;
  dreamTranscript = '';
  $('#dream-rec-idle').classList.add('hidden');
  $('#dream-rec-active').classList.add('hidden');
  $('#dream-rec-edit').classList.remove('hidden');
  $('#dream-transcript').value = '';
  $('#dream-transcript').focus();
  dreamSelectedTags.clear();
  $$('#dream-tags .dream-tag').forEach(b => b.classList.remove('active'));
}

async function startDreamRecording() {
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (e) {
    showToast('🎙 Microphone access needed');
    return;
  }

  $('#dream-rec-idle').classList.add('hidden');
  $('#dream-rec-active').classList.remove('hidden');
  $('#dream-rec-edit').classList.add('hidden');

  dreamAudioChunks = [];
  dreamTranscript = '';
  dreamAudioBlob = null;

  const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus'
    : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus') ? 'audio/ogg;codecs=opus' : '';
  dreamMediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
  dreamMediaRecorder.ondataavailable = e => { if (e.data.size > 0) dreamAudioChunks.push(e.data); };
  dreamMediaRecorder.onstop = () => {
    stream.getTracks().forEach(t => t.stop());
    dreamAudioBlob = new Blob(dreamAudioChunks, { type: dreamMediaRecorder.mimeType });
  };
  dreamMediaRecorder.start(500);

  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRec) {
    dreamRecognition = new SpeechRec();
    dreamRecognition.continuous = true;
    dreamRecognition.interimResults = true;
    dreamRecognition.lang = 'en-US';
    let finalTranscript = '';
    dreamRecognition.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalTranscript += e.results[i][0].transcript + ' ';
        else interim += e.results[i][0].transcript;
      }
      dreamTranscript = finalTranscript;
      $('#dream-live-text').textContent = (finalTranscript + interim) || 'Listening…';
    };
    dreamRecognition.onerror = () => {};
    dreamRecognition.onend = () => {
      if (dreamMediaRecorder && dreamMediaRecorder.state === 'recording') {
        try { dreamRecognition.start(); } catch {}
      }
    };
    dreamRecognition.start();
  } else {
    $('#dream-live-text').textContent = 'Recording audio (speech-to-text not supported)';
  }
}

function stopDreamRecording() {
  if (dreamRecognition) { try { dreamRecognition.abort(); } catch {} dreamRecognition = null; }
  if (dreamMediaRecorder && dreamMediaRecorder.state !== 'inactive') {
    dreamMediaRecorder.stop();
  }

  $('#dream-rec-active').classList.add('hidden');
  $('#dream-rec-edit').classList.remove('hidden');
  $('#dream-transcript').value = dreamTranscript.trim();

  dreamSelectedTags.clear();
  $$('#dream-tags .dream-tag').forEach(b => b.classList.remove('active'));
}

async function saveDream() {
  const saveBtn = $('#dream-save-btn');
  if (saveBtn.disabled) return;
  saveBtn.disabled = true;
  
  try {
    const text = $('#dream-transcript').value.trim();
    if (!text) { 
      showToast('Write something about your dream'); 
      saveBtn.disabled = false;
      return; 
    }

    const ts = Date.now();
    const hasAudio = dreamAudioBlob && dreamAudioBlob.size > 0;

    if (hasAudio) {
      try { await saveAudioBlob(String(ts), dreamAudioBlob); } catch {}
    }

    saveDreamEntry({ ts, text, tags: [...dreamSelectedTags], hasAudio });

    showToast('Dream saved 🌙');
    resetDreamUI();
    renderDreams();
  } finally {
    setTimeout(() => { saveBtn.disabled = false; }, 1000);
  }
}

function discardDream() {
  dreamAudioBlob = null;
  resetDreamUI();
}

function saveNoRecall() {
  // Add a unique ID to prevent conflicts
  const dream = {
    id: `norecall-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    ts: Date.now(), 
    text: '', 
    tags: ['no-recall'], 
    noRecall: true
  };
  saveDreamEntry(dream);
  showToast('Logged — no dream recalled 😶‍🌫️');
  renderDreams();
}

function resetDreamUI() {
  $('#dream-rec-idle').classList.remove('hidden');
  $('#dream-rec-active').classList.add('hidden');
  $('#dream-rec-edit').classList.add('hidden');
  $('#dream-live-text').textContent = 'Listening…';
  $('#dream-transcript').value = '';
  dreamSelectedTags.clear();
  $$('#dream-tags .dream-tag').forEach(b => b.classList.remove('active'));
}

function recoverDreamsFromFirebase() {
  if (!currentUser || !db) {
    showToast('Not connected to sync - please wait or refresh');
    return;
  }
  
  const userDoc = db.collection('users').doc(currentUser.uid);
  showToast('🔍 Searching for lost dreams...');
  
  userDoc.collection('dreams').get().then(snapshot => {
    if (snapshot.empty) {
      showToast('No dreams found in cloud storage');
      return;
    }
    
    const cloudDreams = [];
    snapshot.forEach(doc => cloudDreams.push({id: doc.id, ...doc.data()}));
    
    const currentDreams = loadDreams();
    const missingDreams = cloudDreams.filter(cloud => 
      !currentDreams.find(local => local.id === cloud.id || local.ts === cloud.ts)
    );
    
    if (missingDreams.length === 0) {
      showToast('No missing dreams found');
      return;
    }
    
    const allDreams = [...currentDreams, ...missingDreams];
    const dedupedDreams = deduplicateDreams(allDreams);
    localStorage.setItem(DREAM_STORE_KEY, JSON.stringify(dedupedDreams));
    renderDreams();
    showToast(`✅ Recovered ${missingDreams.length} dream(s) from cloud`);
    
  }).catch(err => {
    showToast('Recovery failed - check connection');
  });
}

function cleanupDreamDuplicates() {
  const dreams = loadDreams();
  const cleaned = deduplicateDreams(dreams);
  
  if (cleaned.length < dreams.length) {
    localStorage.setItem(DREAM_STORE_KEY, JSON.stringify(cleaned));
    renderDreams();
    const removed = dreams.length - cleaned.length;
    showToast(`🧹 Removed ${removed} duplicate dream(s)`);
  } else {
    showToast('No duplicates found');
  }
}

function deduplicateDreams(dreams) {
  const seen = new Set();
  const unique = [];
  
  dreams.forEach(dream => {
    // Create multiple possible keys to catch duplicates
    const keys = [
      dream.id,
      `ts_${dream.ts}`,
      `content_${dream.ts}_${(dream.text || '').slice(0, 100)}`
    ].filter(Boolean);
    
    const isNewDream = keys.every(key => !seen.has(key));
    
    if (isNewDream) {
      keys.forEach(key => seen.add(key));
      unique.push(dream);
    }
  });
  
  return unique.sort((a, b) => b.ts - a.ts);
}

function renderDreams() {
  $('#dreams-date').textContent = dateStr(new Date());
  
  // Check which tab is active and render accordingly
  if ($('#dream-tab-history').classList.contains('active')) {
    renderDreamHistory();
  } else {
    renderRecentDreams();
  }
}

/* ── Dream History Management ── */
let currentDreamFilter = 'all';

function switchDreamTab(tab) {
  // Update tab buttons
  $$('.dream-tab').forEach(btn => btn.classList.remove('active'));
  $(`#dream-tab-${tab}`).classList.add('active');
  
  // Show/hide panels
  $$('.dream-panel').forEach(panel => panel.classList.add('hidden'));
  $(`#dream-${tab}-panel`).classList.remove('hidden');
  
  if (tab === 'history') {
    renderDreamHistory();
  } else {
    renderRecentDreams();
  }
}

function renderRecentDreams() {
  const dreams = loadDreams().sort((a, b) => b.ts - a.ts).slice(0, 3);
  const list = $('#dream-recent-list');
  const empty = $('#dream-recent-empty');
  
  list.innerHTML = '';
  
  if (!dreams.length) {
    empty.classList.add('show');
    return;
  }
  
  empty.classList.remove('show');
  dreams.forEach(dream => {
    const card = createDreamCard(dream, true);
    list.appendChild(card);
  });
}

function renderDreamHistory() {
  const dreams = loadDreams().sort((a, b) => b.ts - a.ts);
  updateDreamStats(dreams);
  
  const filteredDreams = filterDreams(dreams);
  const timeline = $('#dream-history-timeline');
  const empty = $('#dream-history-empty');
  
  timeline.innerHTML = '';
  
  if (!filteredDreams.length) {
    empty.classList.add('show');
    return;
  }
  
  empty.classList.remove('show');
  renderDreamTimeline(filteredDreams);
}

function updateDreamStats(dreams) {
  const totalCount = dreams.length;
  const thisMonth = dreams.filter(d => {
    const dreamDate = new Date(d.ts);
    const now = new Date();
    return dreamDate.getMonth() === now.getMonth() && 
           dreamDate.getFullYear() === now.getFullYear();
  }).length;
  
  const noRecallCount = dreams.filter(d => d.noRecall).length;
  const recallRate = totalCount > 0 ? Math.round(((totalCount - noRecallCount) / totalCount) * 100) : 0;
  
  $('#dream-total-count').textContent = totalCount;
  $('#dream-month-count').textContent = thisMonth;
  $('#dream-recall-rate').textContent = recallRate + '%';
}

function filterDreams(dreams) {
  let filtered = dreams;
  
  // Apply tag filter
  if (currentDreamFilter !== 'all') {
    filtered = filtered.filter(dream => 
      dream.tags && dream.tags.includes(currentDreamFilter)
    );
  }
  
  // Apply search filter
  const searchTerm = $('#dream-search').value.toLowerCase();
  if (searchTerm) {
    filtered = filtered.filter(dream => 
      dream.text.toLowerCase().includes(searchTerm) ||
      (dream.tags && dream.tags.some(tag => tag.toLowerCase().includes(searchTerm)))
    );
  }
  
  return filtered;
}

function setDreamFilter(filter) {
  currentDreamFilter = filter;
  
  // Update filter buttons
  $$('.dream-filter-btn').forEach(btn => btn.classList.remove('active'));
  $(`#dream-filter-${filter}`).classList.add('active');
  
  renderDreamHistory();
}

function filterDreamHistory() {
  renderDreamHistory();
}

function renderDreamTimeline(dreams) {
  const timeline = $('#dream-history-timeline');
  const dreamsByMonth = groupDreamsByMonth(dreams);
  
  Object.keys(dreamsByMonth).forEach(monthKey => {
    const monthDreams = dreamsByMonth[monthKey];
    const monthContainer = document.createElement('div');
    monthContainer.className = 'dream-timeline-month';
    
    // Month header
    const header = document.createElement('div');
    header.className = 'dream-timeline-month-header';
    header.innerHTML = `
      <span class="dream-timeline-month-title">${formatMonthYear(monthKey)}</span>
      <span class="dream-timeline-month-count">${monthDreams.length}</span>
    `;
    monthContainer.appendChild(header);
    
    // Group by week
    const dreamsByWeek = groupDreamsByWeek(monthDreams);
    Object.keys(dreamsByWeek).forEach(weekKey => {
      const weekDreams = dreamsByWeek[weekKey];
      const weekContainer = document.createElement('div');
      weekContainer.className = 'dream-timeline-week';
      
      // Group by day
      const dreamsByDay = groupDreamsByDay(weekDreams);
      Object.keys(dreamsByDay).forEach(dayKey => {
        const dayDreams = dreamsByDay[dayKey];
        const dayContainer = document.createElement('div');
        dayContainer.className = 'dream-timeline-day';
        
        const dateHeader = document.createElement('div');
        dateHeader.className = 'dream-timeline-date';
        dateHeader.textContent = formatDayDate(dayKey);
        dayContainer.appendChild(dateHeader);
        
        dayDreams.forEach(dream => {
          const card = createHistoryDreamCard(dream);
          dayContainer.appendChild(card);
        });
        
        weekContainer.appendChild(dayContainer);
      });
      
      monthContainer.appendChild(weekContainer);
    });
    
    timeline.appendChild(monthContainer);
  });
}

function createHistoryDreamCard(dream) {
  const card = document.createElement('div');
  card.className = `dream-history-card ${dream.noRecall ? 'no-recall' : ''}`;
  
  const time = new Date(dream.ts).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
  const tags = dream.tags ? dream.tags.filter(t => t !== 'no-recall') : [];
  const tagsHTML = tags.map(tag => {
    const tagData = DREAM_TAGS.find(t => t.id === tag);
    return `<span class="dream-history-card-tag">${tagData ? tagData.label : tag}</span>`;
  }).join('');
  
  const preview = dream.noRecall 
    ? '<div class="dream-history-card-no-recall-text">😶‍🌫️ No dream remembered</div>'
    : `<div class="dream-history-card-preview">${dream.text || 'No description'}</div>`;
  
  card.innerHTML = `
    <div class="dream-history-card-header">
      <span class="dream-history-card-time">${time}</span>
    </div>
    ${tagsHTML ? `<div class="dream-history-card-tags">${tagsHTML}</div>` : ''}
    ${preview}
    <div class="dream-history-card-actions">
      ${dream.hasAudio ? '<button class="dream-history-card-action" title="Play audio">▶</button>' : ''}
      <button class="dream-history-card-action" title="Delete" data-action="delete">×</button>
    </div>
  `;
  
  // Add event listeners
  card.addEventListener('click', (e) => {
    if (!e.target.matches('.dream-history-card-action')) {
      expandDreamCard(dream);
    }
  });
  
  const deleteBtn = card.querySelector('[data-action="delete"]');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteDreamFromHistory(dream.ts);
    });
  }
  
  const playBtn = card.querySelector('[data-action="play"]');
  if (playBtn) {
    playBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      playDreamAudio(dream.ts);
    });
  }
  
  return card;
}

function groupDreamsByMonth(dreams) {
  return dreams.reduce((groups, dream) => {
    const date = new Date(dream.ts);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(dream);
    return groups;
  }, {});
}

function groupDreamsByWeek(dreams) {
  return dreams.reduce((groups, dream) => {
    const date = new Date(dream.ts);
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());
    const key = startOfWeek.toISOString().split('T')[0];
    if (!groups[key]) groups[key] = [];
    groups[key].push(dream);
    return groups;
  }, {});
}

function groupDreamsByDay(dreams) {
  return dreams.reduce((groups, dream) => {
    const key = new Date(dream.ts).toISOString().split('T')[0];
    if (!groups[key]) groups[key] = [];
    groups[key].push(dream);
    return groups;
  }, {});
}

function formatMonthYear(monthKey) {
  const [year, month] = monthKey.split('-');
  const date = new Date(year, month - 1);
  return date.toLocaleDateString([], { month: 'long', year: 'numeric' });
}

function formatDayDate(dayKey) {
  const date = new Date(dayKey);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  
  return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
}

function expandDreamCard(dream) {
  // Create modal or expanded view
  // For now, just show a toast with the full content
  const content = dream.noRecall 
    ? 'No dream remembered on this night'
    : dream.text || 'No description available';
  showToast(content.slice(0, 100) + (content.length > 100 ? '...' : ''));
}

function deleteDreamFromHistory(timestamp) {
  const dreams = loadDreams();
  const deletedDream = dreams.find(d => d.ts === timestamp);
  deleteDreamEntry(timestamp);
  renderDreamHistory();
  showToast('Dream deleted', () => {
    if (deletedDream) {
      saveDreamEntry(deletedDream);
      renderDreamHistory();
    }
  });
}

async function playDreamAudio(timestamp) {
  try {
    const blob = await getAudioBlob(String(timestamp));
    if (!blob) {
      showToast('Audio not found');
      return;
    }
    
    if (dreamCurrentAudio) {
      dreamCurrentAudio.pause();
      dreamCurrentAudio = null;
    }
    
    const url = URL.createObjectURL(blob);
    dreamCurrentAudio = new Audio(url);
    dreamCurrentAudio.play();
    
    dreamCurrentAudio.onended = () => {
      URL.revokeObjectURL(url);
      dreamCurrentAudio = null;
    };
    
    showToast('Playing dream audio');
  } catch (error) {
    showToast('Failed to play audio');
  }
}

function createDreamCard(dream, isRecent = false) {
  const card = document.createElement('div');
  card.className = 'dream-card';
  if (!isRecent) card.style.animationDelay = '0s';

  const tagsHTML = dream.tags ? dream.tags.map(tid => {
    const t = DREAM_TAGS.find(x => x.id === tid);
    return t ? `<span class="dream-card-tag">${t.label}</span>` : '';
  }).join('') : '';

  const playBtn = dream.hasAudio
    ? `<button class="dream-card-play" data-ts="${dream.ts}">▶ Play audio</button>` : '';

  card.innerHTML = `
    <div class="dream-card-header">
      <span class="dream-card-time">${new Date(dream.ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
      <button class="entry-delete" data-ts="${dream.ts}" title="Delete">✕</button>
    </div>
    ${tagsHTML ? `<div class="dream-card-tags">${tagsHTML}</div>` : ''}
    ${dream.noRecall
      ? `<div class="dream-card-no-recall">😶‍🌫️ No dream remembered</div>`
      : `<div class="dream-card-text collapsed">${(dream.text || '').replace(/</g,'&lt;')}</div>`}
    ${playBtn}
  `;

  const textEl = card.querySelector('.dream-card-text');
  if (textEl) {
    textEl.addEventListener('click', () => textEl.classList.toggle('collapsed'));
  }

  card.querySelector('.entry-delete').addEventListener('click', async (e) => {
    e.stopPropagation();
    card.style.transform = 'translateX(100%)';
    card.style.opacity = '0';
    const deletedDream = { ...dream };
    let deletedAudioBlob = null;
    if (dream.hasAudio) {
      try { deletedAudioBlob = await getAudioBlob(String(dream.ts)); } catch {}
    }
    setTimeout(async () => {
      if (dream.hasAudio) try { await deleteAudioBlob(String(dream.ts)); } catch {}
      deleteDreamEntry(dream.ts);
      renderDreams();
      showToast('Dream deleted', () => {
        saveDreamEntry(deletedDream);
        if (deletedAudioBlob) { saveAudioBlob(String(deletedDream.ts), deletedAudioBlob).catch(() => {}); }
        renderDreams();
      });
    }, 300);
  });

  const playBtnEl = card.querySelector('.dream-card-play');
  if (playBtnEl) {
    playBtnEl.addEventListener('click', async () => {
      if (dreamCurrentAudio) { dreamCurrentAudio.pause(); dreamCurrentAudio = null; }
      try {
        const blob = await getAudioBlob(String(dream.ts));
        if (!blob) { showToast('Audio not found'); return; }
        const url = URL.createObjectURL(blob);
        dreamCurrentAudio = new Audio(url);
        playBtnEl.classList.add('playing');
        dreamCurrentAudio.onended = () => { 
          playBtnEl.classList.remove('playing'); 
          URL.revokeObjectURL(url); 
          dreamCurrentAudio = null;
        };
        dreamCurrentAudio.play();
      } catch { showToast('Failed to play audio'); }
    });
  }

  return card;
}
