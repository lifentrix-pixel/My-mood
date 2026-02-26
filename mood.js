/* ── Mood Tracking ── */

function buildSliders() {
  const container = $('#sliders-container');
  CATS.forEach(cat => {
    const card = document.createElement('div');
    card.className = 'slider-card';
    card.dataset.cat = cat.id;
    card.innerHTML = `
      <div class="slider-header">
        <div class="slider-label"><span class="emoji">${cat.emoji}</span> ${cat.label}</div>
        <div class="slider-value" id="val-${cat.id}">5</div>
      </div>
      <div class="slider-question">${cat.question}</div>
      <div class="slider-track">
        <input type="range" id="slider-${cat.id}" min="1" max="10" step="0.1" value="5">
      </div>
      <button class="notes-toggle" data-cat="${cat.id}">
        <span class="chevron">›</span> Add note
      </button>
      <div class="notes-field" id="notes-field-${cat.id}">
        <textarea id="notes-${cat.id}" placeholder="Optional note..."></textarea>
      </div>
    `;
    container.appendChild(card);

    const slider = card.querySelector('input[type="range"]');
    const valEl = card.querySelector('.slider-value');
    updateSliderFill(slider);
    
    // Apply initial color styling
    const initialV = parseFloat(slider.value);
    valEl.textContent = fmt(initialV);
    valEl.style.color = gradientColor(initialV);
    
    slider.addEventListener('input', () => {
      const v = parseFloat(slider.value);
      valEl.textContent = fmt(v);
      valEl.style.color = gradientColor(v);
      updateSliderFill(slider);
    });

    const toggle = card.querySelector('.notes-toggle');
    const field = card.querySelector('.notes-field');
    toggle.addEventListener('click', () => {
      toggle.classList.toggle('open');
      field.classList.toggle('open');
      if (field.classList.contains('open')) {
        setTimeout(() => field.querySelector('textarea').focus(), 300);
      }
    });
  });
}

function handleSubmit() {
  const btn = $('#submit-btn');
  const entry = { ts: Date.now(), scores: {}, notes: {} };
  CATS.forEach(cat => {
    entry.scores[cat.id] = parseFloat($(`#slider-${cat.id}`).value);
    const note = $(`#notes-${cat.id}`).value.trim();
    if (note) entry.notes[cat.id] = note;
  });
  saveEntry(entry);
  
  btn.classList.add('saved');
  setTimeout(() => {
    btn.classList.remove('saved');
    CATS.forEach(cat => {
      const slider = $(`#slider-${cat.id}`);
      slider.value = 5;
      $(`#val-${cat.id}`).textContent = '5';
      $(`#val-${cat.id}`).style.color = CATS.find(c=>c.id===cat.id).color;
      $(`#notes-${cat.id}`).value = '';
      $(`#notes-field-${cat.id}`).classList.remove('open');
      $(`.notes-toggle[data-cat="${cat.id}"]`).classList.remove('open');
      updateSliderFill(slider);
    });
  }, 1500);
  
  showToast('Check-in saved ✓');
}

function renderTodayStats() {
  // placeholder — renderToday handles the view
}

function renderToday() {
  const entries = loadEntries();
  const todayStart = startOfDay(new Date()).getTime();
  const todayEntries = entries.filter(e => e.ts >= todayStart).sort((a,b) => b.ts - a.ts);
  
  const container = $('#today-entries');
  const empty = $('#today-empty');
  const chartSection = $('#today-chart-section');
  container.innerHTML = '';
  
  if (!todayEntries.length) {
    empty.classList.add('show');
    chartSection.style.display = 'none';
    return;
  }
  empty.classList.remove('show');
  
  if (todayEntries.length >= 2) {
    chartSection.style.display = 'block';
    renderTodayChart(todayEntries);
  } else {
    chartSection.style.display = 'none';
  }
  
  todayEntries.forEach((entry, i) => {
    const card = document.createElement('div');
    card.className = 'entry-card';
    card.style.animationDelay = `${i * 0.06}s`;
    
    let scoresHTML = CATS.map(cat => {
      const v = entry.scores[cat.id] || 5;
      const pct = ((v - 1) / 9) * 100;
      return `
        <div class="entry-score">
          <span class="score-emoji">${cat.emoji}</span>
          <div class="entry-bar"><div class="entry-bar-fill" style="width:${pct}%;background:${cat.color}"></div></div>
          <span class="entry-score-val" style="color:${cat.color}">${fmt(v)}</span>
        </div>`;
    }).join('');
    
    let notesHTML = '';
    const noteKeys = Object.keys(entry.notes || {});
    if (noteKeys.length) {
      notesHTML = '<div class="entry-notes">' + noteKeys.map(k => {
        const cat = CATS.find(c => c.id === k);
        return `<div class="entry-note-item"><span class="note-cat">${cat?.emoji || ''} ${cat?.label || k}:</span> ${entry.notes[k]}</div>`;
      }).join('') + '</div>';
    }
    
    card.innerHTML = `
      <div class="entry-header">
        <div class="entry-time">${timeStr(entry.ts)}</div>
        <button class="entry-delete" data-ts="${entry.ts}" title="Delete">✕</button>
      </div>
      <div class="entry-scores">${scoresHTML}</div>
      ${notesHTML}
    `;
    card.querySelector('.entry-delete').addEventListener('click', (e) => {
      e.stopPropagation();
      card.style.transform = 'translateX(100%)';
      card.style.opacity = '0';
      const deletedEntry = { ...entry };
      setTimeout(() => {
        deleteEntry(entry.ts);
        renderToday();
        showToast('Check-in deleted', () => {
          saveEntry(deletedEntry);
          renderToday();
        });
      }, 300);
    });
    container.appendChild(card);
  });
  
  $('#today-date').textContent = dateStr(new Date());
}
