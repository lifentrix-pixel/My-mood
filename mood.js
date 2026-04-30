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

  const optionalSection = document.createElement('section');
  optionalSection.className = 'optional-checkin-section';
  optionalSection.innerHTML = `
    <div class="optional-checkin-header">
      <div>
        <h2>Optional deeper reads</h2>
        <p>Only saved when you move a scale.</p>
      </div>
    </div>
  `;
  container.appendChild(optionalSection);

  OPTIONAL_CATS.forEach(cat => {
    const card = document.createElement('div');
    card.className = 'slider-card optional-slider-card';
    card.dataset.cat = cat.id;
    card.innerHTML = `
      <div class="slider-header">
        <div class="slider-label"><span class="emoji">${cat.emoji}</span> ${cat.label}</div>
        <div class="optional-value-wrap">
          <span class="optional-pill">optional</span>
          <div class="slider-value optional-value" id="val-${cat.id}">—</div>
          <button class="optional-clear" type="button" data-cat="${cat.id}" aria-label="Clear ${cat.label}">Clear</button>
        </div>
      </div>
      <div class="slider-question">${cat.question}</div>
      <div class="slider-track">
        <input type="range" id="slider-${cat.id}" min="1" max="10" step="0.1" value="5" aria-label="${cat.label}">
      </div>
      <div class="optional-scale-labels">
        <span>${cat.low}</span>
        <span>${cat.high}</span>
      </div>
    `;
    optionalSection.appendChild(card);

    const slider = card.querySelector('input[type="range"]');
    const valEl = card.querySelector('.slider-value');
    const clearBtn = card.querySelector('.optional-clear');
    updateSliderFill(slider);

    const markTouched = () => {
      const v = parseFloat(slider.value);
      slider.dataset.touched = 'true';
      card.classList.add('touched');
      clearBtn.classList.add('show');
      valEl.textContent = fmt(v);
      valEl.style.color = cat.color;
      updateSliderFill(slider);
    };

    const clearTouched = () => {
      slider.value = 5;
      delete slider.dataset.touched;
      card.classList.remove('touched');
      clearBtn.classList.remove('show');
      valEl.textContent = '—';
      valEl.style.color = '';
      updateSliderFill(slider);
    };

    slider.addEventListener('pointerdown', markTouched);
    slider.addEventListener('input', () => {
      markTouched();
    });
    clearBtn.addEventListener('click', clearTouched);
  });
}

function handleSubmit() {
  const btn = $('#submit-btn');
  const now = Date.now();
  const entry = { id: 'ci-' + now, ts: now, scores: {}, notes: {} };
  CATS.forEach(cat => {
    entry.scores[cat.id] = parseFloat($(`#slider-${cat.id}`).value);
    const note = $(`#notes-${cat.id}`).value.trim();
    if (note) entry.notes[cat.id] = note;
  });
  OPTIONAL_CATS.forEach(cat => {
    const slider = $(`#slider-${cat.id}`);
    if (slider?.dataset.touched === 'true') {
      entry.scores[cat.id] = parseFloat(slider.value);
    }
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
    OPTIONAL_CATS.forEach(cat => {
      const slider = $(`#slider-${cat.id}`);
      const card = slider?.closest('.optional-slider-card');
      const clearBtn = card?.querySelector('.optional-clear');
      if (!slider || !card) return;
      slider.value = 5;
      delete slider.dataset.touched;
      card.classList.remove('touched');
      clearBtn?.classList.remove('show');
      $(`#val-${cat.id}`).textContent = '—';
      $(`#val-${cat.id}`).style.color = '';
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

    let optionalHTML = '';
    const optionalScores = OPTIONAL_CATS.filter(cat => Number.isFinite(entry.scores?.[cat.id]));
    if (optionalScores.length) {
      optionalHTML = `
        <div class="entry-optional-scores">
          ${optionalScores.map(cat => {
            const v = entry.scores[cat.id];
            const pct = ((v - 1) / 9) * 100;
            return `
              <div class="entry-optional-score">
                <span class="score-emoji">${cat.emoji}</span>
                <span class="entry-optional-label">${cat.label}</span>
                <div class="entry-bar"><div class="entry-bar-fill" style="width:${pct}%;background:${cat.color}"></div></div>
                <span class="entry-score-val" style="color:${cat.color}">${fmt(v)}</span>
              </div>`;
          }).join('')}
        </div>`;
    }
    
    card.innerHTML = `
      <div class="entry-header">
        <div class="entry-time">${timeStr(entry.ts)}</div>
        <button class="entry-delete" data-ts="${entry.ts}" title="Delete">✕</button>
      </div>
      <div class="entry-scores">${scoresHTML}</div>
      ${optionalHTML}
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
