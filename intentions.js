/* ── Innerscape — Intentions ── */

let currentIntentionType = 'daily';

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
  
  showToast(`✨ ${currentIntentionType.charAt(0).toUpperCase() + currentIntentionType.slice(1)} intention set`);
  
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

// Export functions globally
window.initIntentions = initIntentions;
window.switchIntentionType = switchIntentionType;
window.saveIntention = saveIntention;
window.showIntentionHistory = showIntentionHistory;
window.showIntentionSet = showIntentionSet;
window.deleteIntention = deleteIntention;