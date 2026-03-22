/* ── Innerscape — Intentions ── */

let currentIntentionType = 'daily';

// Voice recording state
let intentionMediaRecorder = null;
let intentionAudioChunks = [];
let intentionRecognition = null;
let intentionTranscript = '';

// Initialize intentions module
function initIntentions() {
  updateIntentionTypeDisplay();
  loadIntentionHistory();
  
  // Event listeners
  $('#intention-daily-btn')?.addEventListener('click', () => switchIntentionType('daily'));
  $('#intention-weekly-btn')?.addEventListener('click', () => switchIntentionType('weekly'));
  $('#intention-monthly-btn')?.addEventListener('click', () => switchIntentionType('monthly'));
  $('#intention-save-btn')?.addEventListener('click', saveIntention);
  $('#intention-history-btn')?.addEventListener('click', showIntentionHistory);
  $('#intention-voice-btn')?.addEventListener('click', startIntentionRecording);
  $('#intention-stop-btn')?.addEventListener('click', stopIntentionRecording);
}

function switchIntentionType(type) {
  currentIntentionType = type;
  updateIntentionTypeDisplay();
  
  // Update active button
  $$('.intention-type-btn').forEach(btn => btn.classList.remove('active'));
  $(`#intention-${type}-btn`)?.classList.add('active');
}

function updateIntentionTypeDisplay() {
  const titleEl = $('#intention-title');
  const subtitleEl = $('#intention-subtitle');
  const placeholderEl = $('#intention-input');
  const promptEl = $('#intention-prompt');
  
  const config = {
    daily: {
      title: 'Daily Intention',
      subtitle: 'What energy do you want to embody today?',
      placeholder: 'Today I intend to...',
      prompt: 'Set your intention for this day ✨'
    },
    weekly: {
      title: 'Weekly Vision',
      subtitle: 'What theme will guide this week?',
      placeholder: 'This week I focus on...',
      prompt: 'Plant seeds for the week ahead 🌱'
    },
    monthly: {
      title: 'Monthly Manifestation',
      subtitle: 'What wants to emerge this month?',
      placeholder: 'This month I am creating...',
      prompt: 'Set your lunar intention 🌙'
    }
  };

  const curr = config[currentIntentionType];
  if (titleEl) titleEl.textContent = curr.title;
  if (subtitleEl) subtitleEl.textContent = curr.subtitle;
  if (placeholderEl) placeholderEl.placeholder = curr.placeholder;
  if (promptEl) promptEl.textContent = curr.prompt;

  // Load existing intention for this period
  loadCurrentIntention();
}

function loadCurrentIntention() {
  const intentions = JSON.parse(localStorage.getItem('innerscape_intentions') || '[]');
  const period = getCurrentPeriod(currentIntentionType);
  const existing = intentions.find(i => i.type === currentIntentionType && i.period === period);
  
  const inputEl = $('#intention-input');
  const saveBtn = $('#intention-save-btn');
  
  if (existing) {
    if (inputEl) inputEl.value = existing.text;
    if (saveBtn) saveBtn.textContent = '✨ Update Intention';
  } else {
    if (inputEl) inputEl.value = '';
    if (saveBtn) saveBtn.textContent = '✨ Set Intention';
  }
}

function getCurrentPeriod(type) {
  const now = new Date();
  switch (type) {
    case 'daily':
      return now.toISOString().split('T')[0]; // YYYY-MM-DD
    case 'weekly':
      // Get Monday of current week
      const monday = new Date(now);
      monday.setDate(now.getDate() - now.getDay() + 1);
      return monday.toISOString().split('T')[0];
    case 'monthly':
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    default:
      return now.toISOString().split('T')[0];
  }
}

function saveIntention() {
  const text = $('#intention-input')?.value.trim();
  if (!text) {
    showToast('✨ Write your intention first');
    return;
  }

  const intentions = JSON.parse(localStorage.getItem('innerscape_intentions') || '[]');
  const period = getCurrentPeriod(currentIntentionType);
  
  // Remove existing intention for this period if it exists
  const filteredIntentions = intentions.filter(i => !(i.type === currentIntentionType && i.period === period));
  
  // Add new intention
  const newIntention = {
    id: 'int-' + Date.now(),
    type: currentIntentionType,
    period: period,
    text: text,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  
  filteredIntentions.push(newIntention);
  localStorage.setItem('innerscape_intentions', JSON.stringify(filteredIntentions));
  
  // Trigger full-screen celebration animation
  createIntentionCelebration(text, currentIntentionType);
  
  // Update button text
  const saveBtn = $('#intention-save-btn');
  if (saveBtn) saveBtn.textContent = '✨ Update Intention';
  
  // Visual feedback
  createIntentionRipple();
}

function createIntentionRipple() {
  // Create magical ripple effect when intention is set
  const container = $('#intention-container');
  if (!container) return;
  
  const ripple = document.createElement('div');
  ripple.className = 'intention-ripple';
  container.appendChild(ripple);
  
  setTimeout(() => ripple.remove(), 2000);
}

function createIntentionCelebration(intentionText, type) {
  // Create full-screen celebration overlay
  const celebration = document.createElement('div');
  celebration.className = 'intention-celebration-overlay';
  
  const typeIcons = {
    daily: '☀️',
    weekly: '🌱', 
    monthly: '🌙'
  };
  
  celebration.innerHTML = `
    <div class="celebration-content">
      <div class="celebration-icon">${typeIcons[type] || '✨'}</div>
      <div class="celebration-title">Intention Set</div>
      <div class="celebration-text">"${intentionText}"</div>
      <div class="celebration-subtitle">The universe hears you ✨</div>
    </div>
    <div class="celebration-particles"></div>
    <div class="celebration-rays">
      <div class="ray ray-1"></div>
      <div class="ray ray-2"></div>
      <div class="ray ray-3"></div>
      <div class="ray ray-4"></div>
      <div class="ray ray-5"></div>
      <div class="ray ray-6"></div>
    </div>
  `;
  
  document.body.appendChild(celebration);
  
  // Create floating particles
  for (let i = 0; i < 20; i++) {
    setTimeout(() => createFloatingParticle(celebration), i * 100);
  }
  
  // Remove overlay after animation completes
  setTimeout(() => {
    if (celebration.parentNode) {
      celebration.style.opacity = '0';
      setTimeout(() => celebration.remove(), 500);
    }
  }, 3500);
  
  // Gentle haptic feedback if available
  if (navigator.vibrate) {
    navigator.vibrate([50, 100, 50]);
  }
  
  // Success sound (if user has interacted with page)
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (e) {
    // Ignore audio errors
  }
}

function createFloatingParticle(container) {
  const particle = document.createElement('div');
  particle.className = 'celebration-particle';
  
  // Random starting position
  const startX = Math.random() * window.innerWidth;
  const startY = window.innerHeight + 20;
  
  particle.style.left = startX + 'px';
  particle.style.top = startY + 'px';
  
  container.appendChild(particle);
  
  // Animate upward with random drift
  const endY = -50;
  const drift = (Math.random() - 0.5) * 200;
  
  particle.style.transform = `translate(${drift}px, ${endY - startY}px)`;
  
  setTimeout(() => particle.remove(), 4000);
}

function loadIntentionHistory() {
  // This will be called when switching to history view
  // For now, just ensure we have the data structure
  const intentions = JSON.parse(localStorage.getItem('innerscape_intentions') || '[]');
  console.log('Loaded intentions:', intentions.length);
}

function showIntentionHistory() {
  // Toggle to history view
  const setView = $('#intention-set-view');
  const historyView = $('#intention-history-view');
  
  if (setView) setView.style.display = 'none';
  if (historyView) historyView.style.display = 'block';
  
  renderIntentionHistory();
}

function showIntentionSet() {
  // Toggle back to set view
  const setView = $('#intention-set-view');
  const historyView = $('#intention-history-view');
  
  if (setView) setView.style.display = 'block';
  if (historyView) historyView.style.display = 'none';
}

function renderIntentionHistory() {
  const container = $('#intention-history-list');
  if (!container) return;
  
  const intentions = JSON.parse(localStorage.getItem('innerscape_intentions') || '[]');
  
  if (intentions.length === 0) {
    container.innerHTML = `
      <div class="empty-intentions">
        <div class="empty-icon">✨</div>
        <p>No intentions set yet</p>
        <p>Start by setting your first intention</p>
      </div>
    `;
    return;
  }
  
  // Group by type and sort by date
  const grouped = intentions.reduce((acc, intention) => {
    if (!acc[intention.type]) acc[intention.type] = [];
    acc[intention.type].push(intention);
    return acc;
  }, {});
  
  // Sort each group by date (newest first)
  Object.keys(grouped).forEach(type => {
    grouped[type].sort((a, b) => b.createdAt - a.createdAt);
  });
  
  let html = '';
  
  ['monthly', 'weekly', 'daily'].forEach(type => {
    if (grouped[type] && grouped[type].length > 0) {
      html += `<div class="intention-type-section">`;
      html += `<h3 class="intention-type-header">${getTypeIcon(type)} ${type.charAt(0).toUpperCase() + type.slice(1)} Intentions</h3>`;
      
      grouped[type].forEach(intention => {
        html += `
          <div class="intention-card">
            <div class="intention-card-header">
              <div class="intention-card-period">${formatPeriod(intention.period, intention.type)}</div>
              <button class="intention-delete" onclick="deleteIntention('${intention.id}')">×</button>
            </div>
            <div class="intention-card-text">${intention.text}</div>
            <div class="intention-card-meta">
              Set ${formatDate(intention.createdAt)}
              ${intention.updatedAt > intention.createdAt ? `• Updated ${formatDate(intention.updatedAt)}` : ''}
            </div>
          </div>
        `;
      });
      
      html += '</div>';
    }
  });
  
  container.innerHTML = html;
}

function getTypeIcon(type) {
  const icons = {
    daily: '☀️',
    weekly: '🌱', 
    monthly: '🌙'
  };
  return icons[type] || '✨';
}

function formatPeriod(period, type) {
  if (type === 'daily') {
    const date = new Date(period + 'T12:00:00');
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric'
    });
  } else if (type === 'weekly') {
    const date = new Date(period + 'T12:00:00');
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 6);
    return `Week of ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  } else if (type === 'monthly') {
    const [year, month] = period.split('-');
    const date = new Date(year, month - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }
  return period;
}

function formatDate(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
}

function deleteIntention(id) {
  if (!confirm('Delete this intention?')) return;
  
  const intentions = JSON.parse(localStorage.getItem('innerscape_intentions') || '[]');
  const filtered = intentions.filter(i => i.id !== id);
  localStorage.setItem('innerscape_intentions', JSON.stringify(filtered));
  
  showToast('✨ Intention deleted');
  renderIntentionHistory();
  
  // Refresh current intention display if we're viewing the same period
  loadCurrentIntention();
}

// Voice recording functions
async function startIntentionRecording() {
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (e) {
    showToast('🎙 Microphone access needed for voice intentions');
    return;
  }

  // Update UI - show recording state
  const voiceBtn = $('#intention-voice-btn');
  const stopBtn = $('#intention-stop-btn');
  const liveText = $('#intention-live-text');
  
  if (voiceBtn) voiceBtn.style.display = 'none';
  if (stopBtn) stopBtn.style.display = 'inline-flex';
  if (liveText) {
    liveText.style.display = 'block';
    liveText.textContent = 'Listening... speak your intention ✨';
  }

  intentionAudioChunks = [];
  intentionTranscript = '';

  // Set up media recorder
  const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus'
    : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus') ? 'audio/ogg;codecs=opus' : '';
  intentionMediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
  intentionMediaRecorder.ondataavailable = e => { if (e.data.size > 0) intentionAudioChunks.push(e.data); };
  intentionMediaRecorder.onstop = () => {
    stream.getTracks().forEach(t => t.stop());
  };
  intentionMediaRecorder.start(500);

  // Set up speech recognition
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRec) {
    intentionRecognition = new SpeechRec();
    intentionRecognition.continuous = true;
    intentionRecognition.interimResults = true;
    intentionRecognition.lang = 'en-US';
    let finalTranscript = '';
    
    intentionRecognition.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalTranscript += e.results[i][0].transcript + ' ';
        else interim += e.results[i][0].transcript;
      }
      intentionTranscript = finalTranscript;
      
      if (liveText) {
        liveText.textContent = (finalTranscript + interim) || 'Listening... speak your intention ✨';
      }
    };
    
    intentionRecognition.onerror = () => {};
    intentionRecognition.onend = () => {
      if (intentionMediaRecorder && intentionMediaRecorder.state === 'recording') {
        try { intentionRecognition.start(); } catch {}
      }
    };
    
    intentionRecognition.start();
  } else {
    if (liveText) liveText.textContent = 'Recording audio (speech-to-text not supported)';
  }
}

function stopIntentionRecording() {
  // Stop speech recognition
  if (intentionRecognition) { 
    try { intentionRecognition.abort(); } catch {} 
    intentionRecognition = null; 
  }
  
  // Stop media recorder
  if (intentionMediaRecorder && intentionMediaRecorder.state !== 'inactive') {
    intentionMediaRecorder.stop();
  }

  // Update UI - hide recording state
  const voiceBtn = $('#intention-voice-btn');
  const stopBtn = $('#intention-stop-btn');
  const liveText = $('#intention-live-text');
  const inputEl = $('#intention-input');
  
  if (voiceBtn) voiceBtn.style.display = 'inline-flex';
  if (stopBtn) stopBtn.style.display = 'none';
  if (liveText) liveText.style.display = 'none';
  
  // Put transcribed text into the input field
  if (inputEl && intentionTranscript.trim()) {
    inputEl.value = intentionTranscript.trim();
    showToast('✨ Intention captured from your voice');
    
    // Create magical ripple effect for voice capture
    createIntentionRipple();
  } else if (inputEl) {
    showToast('🎙 Try speaking again - no words were captured');
  }
}

// Exit intention realm back to main app
function exitIntentionRealm() {
  document.body.classList.remove('in-dreamland');
  switchGroup('track');
  switchView('checkin');
}

// Export functions globally
window.initIntentions = initIntentions;
window.switchIntentionType = switchIntentionType;
window.saveIntention = saveIntention;
window.showIntentionHistory = showIntentionHistory;
window.showIntentionSet = showIntentionSet;
window.deleteIntention = deleteIntention;
window.startIntentionRecording = startIntentionRecording;
window.stopIntentionRecording = stopIntentionRecording;
window.exitIntentionRealm = exitIntentionRealm;
window.createIntentionCelebration = createIntentionCelebration;