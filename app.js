```javascript
// Simple function to get elements
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
  // Set up navigation
  setupNavigation();
  
  // Set up mood slider
  setupMoodSlider();
  
  // Set up save button
  setupSaveButton();
  
  // Update date display
  updateDateDisplay();
});

function setupNavigation() {
  // Handle main navigation
  $$('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const group = btn.dataset.group;
      
      // Update active nav button
      $$('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Show corresponding sub-nav
      $$('.sub-nav-group').forEach(g => g.classList.remove('active'));
      $(`.sub-nav-group[data-group="${group}"]`)?.classList.add('active');
      
      // Show first view of this group
      const firstSubBtn = $(`.sub-nav-group[data-group="${group}"] .sub-nav-btn`);
      if (firstSubBtn) {
        const view = firstSubBtn.dataset.view;
        showView(view);
        
        // Update sub-nav active state
        $$('.sub-nav-btn').forEach(b => b.classList.remove('active'));
        firstSubBtn.classList.add('active');
      }
    });
  });
  
  // Handle sub-navigation
  $$('.sub-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      
      // Update active sub-nav button
      const group = btn.closest('.sub-nav-group');
      group.querySelectorAll('.sub-nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Show corresponding view
      showView(view);
    });
  });
}

function showView(viewName) {
  // Hide all views
  $$('.view').forEach(view => view.classList.remove('active'));
  
  // Show the selected view
  const targetView = $(`#view-${viewName}`);
  if (targetView) {
    targetView.classList.add('active');
  }
}

function setupMoodSlider() {
  const slider = $('#mood-slider');
  const display = $('#mood-display');
  
  if (slider && display) {
    slider.addEventListener('input', () => {
      display.textContent = slider.value;
    });
  }
  
  // Quick mood buttons
  $$('.quick-mood-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const mood = btn.dataset.mood;
      const note = btn.dataset.note;
      
      if (slider) slider.value = mood;
      if (display) display.textContent = mood;
      if ($('#mood-note')) $('#mood-note').value = note;
    });
  });
}

function setupSaveButton() {
  const saveBtn = $('#save-checkin');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const mood = $('#mood-slider')?.value || '5';
      const note = $('#mood-note')?.value || '';
      
      // Simple feedback
      alert(`Mood check-in saved!\nMood: ${mood}/10\nNote: ${note || 'No note'}`);
      
      // Clear the form
      if ($('#mood-note')) $('#mood-note').value = '';
      if ($('#mood-slider')) $('#mood-slider').value = '5';
      if ($('#mood-display')) $('#mood-display').textContent = '5';
    });
  }
}

function updateDateDisplay() {
  const dateEl = $('#checkin-date');
  if (dateEl) {
    const today = new Date();
    const options = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    dateEl.textContent = today.toLocaleDateString('en-US', options);
  }
  
  // Update sync status
  const syncEl = $('#sync-status');
  if (syncEl) {
    syncEl.textContent = '📱 Ready';
  }
}
```
