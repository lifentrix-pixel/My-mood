/* ── Insights / Charts / Export ── */

let weeklyChart = null, monthlyChart = null, trendsChart = null, todayChart = null;
let weeklyVisible = { body: true, energy: true, mood: true, mind: true };
let monthlyVisible = { body: true, energy: true, mood: true, mind: true };
let trendsVisible = { overall: true, body: true, energy: true, mood: true, mind: true };
let trendsZoom = 90;
let todayVisible = { body: true, energy: true, mood: true, mind: true };

function renderTodayChart(todayEntries) {
  const chronological = [...todayEntries].sort((a,b) => a.ts - b.ts);
  const data = makeIntradayData(chronological, todayVisible);
  buildToggles('today-toggles', todayVisible, () => renderTodayChart(todayEntries));
  
  if (todayChart) { todayChart.data = data; todayChart.update(); return; }
  todayChart = new Chart($('#today-chart'), { type: 'line', data, options: intradayChartOpts });
}

function makeIntradayData(entries, visible) {
  const labels = entries.map(e => {
    const date = new Date(e.ts);
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  });
  
  const datasets = CATS.filter(c => visible[c.id]).map(cat => ({
    label: cat.label,
    data: entries.map(e => e.scores[cat.id] || 5),
    borderColor: cat.color,
    backgroundColor: cat.color + '18',
    tension: 0.3,
    pointRadius: 5,
    pointHoverRadius: 7,
    borderWidth: 2.5,
    fill: false,
    spanGaps: false,
  }));
  
  return { labels, datasets };
}

const intradayChartOpts = {
  responsive: true,
  maintainAspectRatio: true,
  aspectRatio: 1.8,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#1e1e2a',
      titleColor: '#e8e4f0',
      bodyColor: '#9892a6',
      borderColor: '#3a3a52',
      borderWidth: 1,
    },
  },
  scales: {
    x: { 
      grid: { color: '#2a2a3a' },
      ticks: { color: '#9892a6' },
      title: { display: true, text: 'Time', color: '#9892a6' }
    },
    y: { 
      min: 1, max: 10,
      grid: { color: '#2a2a3a' },
      ticks: { color: '#9892a6', stepSize: 1 },
      title: { display: true, text: 'Score', color: '#9892a6' }
    }
  }
};

function buildToggles(containerId, state, redraw) {
  const el = document.getElementById(containerId);
  el.innerHTML = '';
  CATS.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'chart-toggle' + (state[cat.id] ? ' active' : '');
    btn.style.setProperty('--toggle-color', cat.color);
    if (state[cat.id]) {
      btn.style.borderColor = cat.color;
      btn.style.color = cat.color;
    }
    btn.textContent = `${cat.emoji} ${cat.label}`;
    btn.addEventListener('click', () => {
      state[cat.id] = !state[cat.id];
      btn.classList.toggle('active');
      if (state[cat.id]) {
        btn.style.borderColor = cat.color;
        btn.style.color = cat.color;
      } else {
        btn.style.borderColor = '';
        btn.style.color = '';
      }
      redraw();
    });
    el.appendChild(btn);
  });
}

function aggregateByDay(entries, days) {
  const now = new Date();
  const result = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    const key = dayKey(d);
    result[key] = { label: days <= 7 ? d.toLocaleDateString([], { weekday: 'short' }) : shortDate(d), values: {} };
    CATS.forEach(c => result[key].values[c.id] = []);
  }
  entries.forEach(e => {
    const key = dayKey(e.ts);
    if (result[key]) {
      CATS.forEach(c => {
        if (e.scores[c.id] != null) result[key].values[c.id].push(e.scores[c.id]);
      });
    }
  });
  return result;
}

function makeChartData(agg, visible) {
  const labels = Object.values(agg).map(d => d.label);
  const datasets = CATS.filter(c => visible[c.id]).map(cat => ({
    label: cat.label,
    data: Object.values(agg).map(d => {
      const vals = d.values[cat.id];
      return vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : null;
    }),
    borderColor: cat.color,
    backgroundColor: cat.color + '18',
    tension: 0.35,
    pointRadius: 4,
    pointHoverRadius: 6,
    borderWidth: 2.5,
    fill: true,
    spanGaps: true,
  }));
  return { labels, datasets };
}

function makeTrendsData(agg, visible) {
  const labels = Object.values(agg).map(d => d.label);
  const datasets = [];
  
  if (visible.overall) {
    datasets.push({
      label: 'Overall Wellbeing',
      data: Object.values(agg).map(d => {
        const allVals = [];
        CATS.forEach(cat => allVals.push(...d.values[cat.id]));
        return allVals.length ? allVals.reduce((a,b)=>a+b,0)/allVals.length : null;
      }),
      borderColor: '#a78bfa',
      backgroundColor: '#a78bfa18',
      tension: 0.35,
      pointRadius: 0,
      pointHoverRadius: 5,
      borderWidth: 2.5,
      fill: true,
      spanGaps: true,
    });
  }
  
  CATS.filter(c => visible[c.id]).forEach(cat => {
    datasets.push({
      label: cat.label,
      data: Object.values(agg).map(d => {
        const vals = d.values[cat.id];
        return vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : null;
      }),
      borderColor: cat.color,
      backgroundColor: cat.color + '18',
      tension: 0.35,
      pointRadius: 0,
      pointHoverRadius: 4,
      borderWidth: 2,
      fill: false,
      spanGaps: true,
    });
  });
  
  return { labels, datasets };
}

function buildTrendsToggles(containerId, state, redraw) {
  const el = document.getElementById(containerId);
  el.innerHTML = '';
  
  const overallBtn = document.createElement('button');
  overallBtn.className = 'chart-toggle' + (state.overall ? ' active' : '');
  overallBtn.textContent = 'Overall';
  overallBtn.style.background = state.overall ? '#a78bfa' : '';
  overallBtn.addEventListener('click', () => { state.overall = !state.overall; redraw(); });
  el.appendChild(overallBtn);
  
  CATS.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'chart-toggle' + (state[cat.id] ? ' active' : '');
    btn.textContent = cat.label;
    btn.style.background = state[cat.id] ? cat.color : '';
    btn.addEventListener('click', () => { state[cat.id] = !state[cat.id]; redraw(); });
    el.appendChild(btn);
  });
}

const chartOpts = {
  responsive: true,
  maintainAspectRatio: true,
  aspectRatio: 1.4,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#1e1e2a',
      titleColor: '#e8e4f0',
      bodyColor: '#9892a6',
      borderColor: '#2a2a3a',
      borderWidth: 1,
      cornerRadius: 10,
      padding: 10,
      callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y != null ? fmt(ctx.parsed.y) : '—'}` }
    }
  },
  scales: {
    y: { min: 1, max: 10, grid: { color: '#1e1e2a' }, ticks: { color: '#9892a6', stepSize: 2 } },
    x: { grid: { display: false }, ticks: { color: '#9892a6', font: { size: 11 } } }
  }
};

function renderWeekly() {
  const entries = loadEntries();
  const agg = aggregateByDay(entries, 7);
  const data = makeChartData(agg, weeklyVisible);
  buildToggles('weekly-toggles', weeklyVisible, renderWeekly);
  
  if (weeklyChart) { weeklyChart.data = data; weeklyChart.update(); return; }
  weeklyChart = new Chart($('#weekly-chart'), { type: 'line', data, options: chartOpts });
}

function renderMonthly() {
  const entries = loadEntries();
  const agg = aggregateByDay(entries, 30);
  const data = makeChartData(agg, monthlyVisible);
  buildToggles('monthly-toggles', monthlyVisible, renderMonthly);
  
  if (monthlyChart) { monthlyChart.data = data; monthlyChart.update(); return; }
  monthlyChart = new Chart($('#monthly-chart'), { type: 'line', data, options: chartOpts });
}

function renderTrends() {
  const entries = loadEntries();
  const totalDays = entries.length ? Math.ceil((Date.now() - entries[0].ts) / 86400000) : 0;
  const days = trendsZoom === 'all' ? Math.max(totalDays, 90) : trendsZoom;
  const agg = aggregateByDay(entries, days);
  const data = makeTrendsData(agg, trendsVisible);
  buildTrendsToggles('trends-toggles', trendsVisible, renderTrends);
  buildTrendsZoom('trends-zoom', totalDays);
  
  // Update subtitle
  const sub = document.querySelector('#view-trends .subtitle');
  if (sub) sub.textContent = `Daily averages over ${days} days`;
  
  const trendsOpts = JSON.parse(JSON.stringify(chartOpts));
  trendsOpts.aspectRatio = days > 60 ? 0.7 : days > 30 ? 0.85 : 1.0;
  // Grid: lines at every integer, dashed at halves
  trendsOpts.scales.y = {
    min: 1, max: 10,
    ticks: { color: '#9892a6', stepSize: 1, font: { size: 11 } },
    grid: {
      color: (ctx) => {
        const v = ctx.tick.value;
        return Number.isInteger(v) ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.10)';
      },
      lineWidth: (ctx) => Number.isInteger(ctx.tick.value) ? 2 : 1,
    },
    afterBuildTicks: (axis) => {
      // Add half-step ticks: 1.5, 2.5, ... 9.5
      const ticks = [];
      for (let v = 1; v <= 10; v++) {
        ticks.push({ value: v });
        if (v < 10) ticks.push({ value: v + 0.5 });
      }
      axis.ticks = ticks;
    },
    afterTickToLabelConversion: (axis) => {
      // Only show labels for integers
      axis.ticks.forEach(t => {
        if (!Number.isInteger(t.value)) t.label = '';
      });
    },
  };
  trendsOpts.scales.x.ticks = { color: '#9892a6', font: { size: 11 }, maxTicksLimit: days > 60 ? 8 : 12 };
  
  if (trendsChart) { trendsChart.data = data; trendsChart.options = trendsOpts; trendsChart.update(); return; }
  trendsChart = new Chart($('#trends-chart'), { type: 'line', data, options: trendsOpts });
}

function buildTrendsZoom(containerId, totalDays) {
  let el = document.getElementById(containerId);
  if (!el) {
    // Create zoom container after toggles
    const toggles = document.getElementById('trends-toggles');
    if (!toggles) return;
    el = document.createElement('div');
    el.id = containerId;
    el.className = 'trends-zoom-row';
    toggles.after(el);
  }
  const zoomLevels = [7, 15, 30, 60, 90];
  if (totalDays > 90) zoomLevels.push('all');
  const currentIdx = trendsZoom === 'all' ? zoomLevels.indexOf('all') : zoomLevels.indexOf(trendsZoom);
  // − zooms out (more days = higher index), + zooms in (fewer days = lower index)
  const canMinus = currentIdx < zoomLevels.length - 1; // can go to more days
  const canPlus = currentIdx > 0; // can go to fewer days

  const currentLabel = trendsZoom === 'all' ? 'All' : `${trendsZoom}d`;

  el.innerHTML = `
    <button class="trends-zoom-arrow ${canMinus ? '' : 'disabled'}" id="trends-zoom-minus">−</button>
    <span class="trends-zoom-label">${currentLabel}</span>
    <button class="trends-zoom-arrow ${canPlus ? '' : 'disabled'}" id="trends-zoom-plus">+</button>
  `;

  const stepZoom = (dir) => {
    const idx = trendsZoom === 'all' ? zoomLevels.indexOf('all') : zoomLevels.indexOf(trendsZoom);
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= zoomLevels.length) return;
    trendsZoom = zoomLevels[newIdx];
    if (trendsChart) { trendsChart.destroy(); trendsChart = null; }
    renderTrends();
  };
  $('#trends-zoom-minus')?.addEventListener('click', () => stepZoom(1));  // more days
  $('#trends-zoom-plus')?.addEventListener('click', () => stepZoom(-1)); // fewer days
}

// ── Export Functions ──

function initExport() {
  // Legacy import functionality
  const importInput = $('#import-file-input');
  if (importInput) {
    importInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = JSON.parse(evt.target.result);
          importBackup(data);
        } catch(err) {
          $('#import-result').innerHTML = '<p style="color:#f87171;margin-top:8px">❌ ' + err.message + '</p>';
        }
      };
      reader.readAsText(file);
    });
  }
}

// ── Enhanced Export System ──

// Toggle all data types selection
function toggleAllDataTypes() {
  const checkboxes = document.querySelectorAll('input[name="datatype"]');
  const allChecked = Array.from(checkboxes).every(cb => cb.checked);
  
  checkboxes.forEach(cb => cb.checked = !allChecked);
  
  const btn = document.querySelector('.export-select-all');
  btn.textContent = allChecked ? 'Select All' : 'Deselect All';
}

// Get selected export settings
function getExportSettings() {
  const timeframe = document.querySelector('input[name="timeframe"]:checked')?.value || 'all';
  const selectedTypes = Array.from(document.querySelectorAll('input[name="datatype"]:checked'))
    .map(cb => cb.value);
  
  return { timeframe, selectedTypes };
}

// Show/hide custom date range
document.addEventListener('change', (e) => {
  if (e.target.name === 'timeframe') {
    const customRange = document.getElementById('export-custom-range');
    if (customRange) customRange.style.display = e.target.value === 'custom' ? 'flex' : 'none';
  }
});

// Filter data by timeframe
function filterDataByTimeframe(data, timeframe, timestampField = 'ts') {
  if (timeframe === 'all') return data;
  
  const now = Date.now();
  let cutoffStart, cutoffEnd;
  
  if (timeframe === 'yesterday') {
    const today = new Date(); today.setHours(0,0,0,0);
    cutoffStart = today.getTime() - 86400000;
    cutoffEnd = today.getTime();
  } else if (timeframe === 'custom') {
    const fromEl = document.getElementById('export-date-from');
    const toEl = document.getElementById('export-date-to');
    if (fromEl?.value) cutoffStart = new Date(fromEl.value).getTime();
    if (toEl?.value) cutoffEnd = new Date(toEl.value).getTime() + 86400000; // include end day
    if (!cutoffStart && !cutoffEnd) return data;
  } else {
    const days = parseInt(timeframe);
    cutoffStart = now - (days * 24 * 60 * 60 * 1000);
    cutoffEnd = null;
  }
  
  return data.filter(item => {
    const timestamp = item[timestampField] || item.timestamp || item.createdAt || item.startTime;
    if (!timestamp) return false;
    if (cutoffStart && timestamp < cutoffStart) return false;
    if (cutoffEnd && timestamp >= cutoffEnd) return false;
    return true;
  });
}

// Main export function
function performExport(format) {
  console.log('performExport called with format:', format);
  showToast(`Starting ${format} export...`);
  
  const { timeframe, selectedTypes } = getExportSettings();
  console.log('Export settings:', { timeframe, selectedTypes });
  
  if (selectedTypes.length === 0) {
    showToast('Please select at least one data type');
    return;
  }
  
  // Collect filtered data
  const exportData = {};
  let totalEntries = 0;
  
  if (selectedTypes.includes('mood')) {
    const entries = filterDataByTimeframe(loadEntries(), timeframe, 'ts');
    exportData.mood_entries = entries;
    totalEntries += entries.length;
  }
  
  if (selectedTypes.includes('dreams')) {
    const dreams = filterDataByTimeframe(loadDreams(), timeframe, 'ts');
    exportData.dreams = dreams;
    totalEntries += dreams.length;
  }
  
  if (selectedTypes.includes('activities')) {
    const timeEntries = filterDataByTimeframe(loadTimeEntries(), timeframe, 'startTime');
    const activities = loadActivities();
    exportData.time_entries = timeEntries;
    exportData.activities = activities;
    totalEntries += timeEntries.length;
  }
  
  if (selectedTypes.includes('meditation')) {
    const meditations = filterDataByTimeframe(loadMeditations(), timeframe, 'timestamp');
    exportData.meditations = meditations;
    totalEntries += meditations.length;
  }
  
  if (selectedTypes.includes('food')) {
    const foodEntries = filterDataByTimeframe(loadFoodEntries(), timeframe, 'timestamp');
    exportData.food_entries = foodEntries;
    totalEntries += foodEntries.length;
  }
  
  if (selectedTypes.includes('medication')) {
    const medications = loadMedications();
    const medicationLogs = filterDataByTimeframe(loadMedicationLogs(), timeframe, 'timestamp');
    exportData.medications = medications;
    exportData.medication_logs = medicationLogs;
    totalEntries += medicationLogs.length;
  }
  
  if (selectedTypes.includes('todos')) {
    const todos = filterDataByTimeframe(loadTodos(), timeframe, 'createdAt');
    exportData.todos = todos;
    totalEntries += todos.length;
  }
  
  if (selectedTypes.includes('wishlist')) {
    const wishes = filterDataByTimeframe(loadWishes(), timeframe, 'createdAt');
    exportData.wishes = wishes;
    totalEntries += wishes.length;
  }
  
  if (selectedTypes.includes('stool')) {
    const stoolEntries = filterDataByTimeframe(loadStoolEntries(), timeframe, 'timestamp');
    exportData.stool_entries = stoolEntries;
    totalEntries += stoolEntries.length;
  }
  
  if (selectedTypes.includes('oura')) {
    const ouraData = JSON.parse(localStorage.getItem('innerscape_oura_data') || '{"sleep":[],"readiness":[],"activity":[]}');
    exportData.oura_data = ouraData;
    totalEntries += (ouraData.sleep?.length || 0) + (ouraData.readiness?.length || 0) + (ouraData.activity?.length || 0);
  }
  
  if (selectedTypes.includes('intentions')) {
    const intentions = filterDataByTimeframe(loadIntentions(), timeframe, 'createdAt');
    exportData.intentions = intentions;
    totalEntries += intentions.length;
  }
  
  console.log('Total entries found:', totalEntries);
  
  if (totalEntries === 0) {
    showToast('No data found for selected time period');
    return;
  }
  
  // Export in the requested format
  const timeframeName = timeframe === 'all' ? 'all-time' : `${timeframe}days`;
  const filename = `innerscape-${format}-${timeframeName}-${Date.now()}`;
  
  console.log('About to export with filename:', filename);
  
  try {
    switch(format) {
      case 'json':
        exportAsJSON(exportData, filename, totalEntries);
        break;
      case 'csv':
        exportAsCSV(exportData, filename, totalEntries);
        break;
      case 'html':
        exportAsHTML(exportData, filename, totalEntries, timeframe);
        break;
      case 'text':
        exportAsText(exportData, filename, totalEntries);
        break;
    }
  } catch(error) {
    console.error('Export error:', error);
    showToast('Export failed: ' + error.message);
  }
}

// Export formats
function exportAsJSON(data, filename, totalEntries) {
  const jsonData = {
    exported_at: new Date().toISOString(),
    export_version: 'v2.0',
    total_entries: totalEntries,
    data: data
  };
  
  const jsonString = JSON.stringify(jsonData, null, 2);
  downloadFile(jsonString, `${filename}.json`, 'application/json');
  showToast(`📁 JSON export downloaded (${totalEntries} entries)`);
}

function exportAsCSV(data, filename, totalEntries) {
  let csvContent = 'Innerscape CSV Export\n';
  csvContent += `Generated: ${new Date().toLocaleString()}\n\n`;
  
  // Mood entries
  if (data.mood_entries?.length) {
    csvContent += 'MOOD_ENTRIES\n';
    csvContent += 'Date,Time,Body,Energy,Mood,Mind,Average\n';
    
    data.mood_entries.forEach(entry => {
      const date = new Date(entry.ts);
      const scores = entry.scores || {};
      const avg = ((scores.body || 0) + (scores.energy || 0) + (scores.mood || 0) + (scores.mind || 0)) / 4;
      
      csvContent += [
        date.toLocaleDateString(),
        date.toLocaleTimeString(),
        scores.body || '',
        scores.energy || '',
        scores.mood || '',
        scores.mind || '',
        avg.toFixed(1)
      ].join(',') + '\n';
    });
    csvContent += '\n';
  }
  
  downloadFile(csvContent, `${filename}.csv`, 'text/csv');
  showToast(`📊 CSV exported (${totalEntries} entries)`);
}

function exportAsHTML(data, filename, totalEntries, timeframe) {
  const timeframeName = timeframe === 'all' ? 'All Time' : `Last ${timeframe} Days`;
  
  let html = `<!DOCTYPE html>
<html><head><title>Innerscape Report</title>
<style>body{font-family:system-ui;margin:40px;background:#f8fafc}.header{text-align:center;margin-bottom:40px}.section{background:white;border-radius:12px;padding:24px;margin:20px 0;box-shadow:0 2px 8px rgba(0,0,0,0.1)}.section h2{color:#1e293b;border-bottom:2px solid #8b5cf6;padding-bottom:8px}</style>
</head><body>
<div class="header"><h1>🔮 Innerscape Report</h1><p>Period: ${timeframeName} • ${new Date().toLocaleDateString()}</p><p>Total: ${totalEntries} entries</p></div>`;
  
  if (data.mood_entries?.length) {
    html += `<div class="section"><h2>📊 Mood Check-ins (${data.mood_entries.length})</h2>`;
    data.mood_entries.slice(0, 20).forEach(entry => {
      const date = new Date(entry.ts);
      const scores = entry.scores || {};
      html += `<p><strong>${date.toLocaleDateString()}</strong> - Body:${scores.body} Energy:${scores.energy} Mood:${scores.mood} Mind:${scores.mind}</p>`;
    });
    html += '</div>';
  }
  
  html += '</body></html>';
  
  downloadFile(html, `${filename}.html`, 'text/html');
  showToast(`📖 HTML report downloaded`);
}

function exportAsText(data, filename, totalEntries) {
  let content = `INNERSCAPE EXPORT\nGenerated: ${new Date().toLocaleString()}\nTotal: ${totalEntries} entries\n${'='.repeat(50)}\n\n`;
  
  if (data.mood_entries?.length) {
    content += `MOOD CHECK-INS (${data.mood_entries.length})\n${'-'.repeat(30)}\n`;
    data.mood_entries.forEach(entry => {
      const date = new Date(entry.ts);
      const scores = entry.scores || {};
      content += `${date.toLocaleDateString()} ${date.toLocaleTimeString()}\n`;
      content += `Body:${scores.body} Energy:${scores.energy} Mood:${scores.mood} Mind:${scores.mind}\n\n`;
    });
  }
  
  downloadFile(content, `${filename}.txt`, 'text/plain');
  showToast(`📝 Text export downloaded`);
}

// Helper functions
function loadStoolEntries() {
  try { return JSON.parse(localStorage.getItem('innerscape_stool_entries') || '[]'); } catch (e) { return []; }
}
function loadWishes() {
  try { return JSON.parse(localStorage.getItem('innerscape_wishes') || '[]'); } catch (e) { return []; }
}
function loadMedicationLogs() {
  try { return JSON.parse(localStorage.getItem('innerscape_medication_logs') || '[]'); } catch (e) { return []; }
}
function loadIntentions() {
  try { return JSON.parse(localStorage.getItem('innerscape_intentions') || '[]'); } catch (e) { return []; }
}

// Make functions globally accessible for HTML onclick handlers
if (typeof window !== 'undefined') {
  window.toggleAllDataTypes = toggleAllDataTypes;
  window.performExport = performExport;
}

function importBackup(data) {
  const logs = [];

  function mergeKey(key, arr, label) {
    if (arr && arr.length) {
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      const ids = new Set(existing.map(e => e.id || e.ts));
      const fresh = arr.filter(e => !ids.has(e.id || e.ts));
      localStorage.setItem(key, JSON.stringify([...existing, ...fresh]));
      logs.push('✅ ' + label + ': ' + arr.length + ' (' + fresh.length + ' new)');
    }
  }

  mergeKey('innerscape_entries', data.mood_entries, 'Mood');
  mergeKey('innerscape_dreams', data.dreams, 'Dreams');
  mergeKey('innerscape_activities', data.activities, 'Activities');
  mergeKey('innerscape_time_entries', data.time_entries, 'Time entries');
  mergeKey('innerscape_meditations', data.meditation_sessions, 'Meditations');
  mergeKey('innerscape_food_entries', data.food_entries, 'Food');
  mergeKey('innerscape_medications', data.medications, 'Medications');
  mergeKey('innerscape_medication_logs', data.medication_logs, 'Med logs');
  mergeKey('innerscape_todos', data.todos, 'Todos');
  mergeKey('innerscape_wishes', data.wishes, 'Wishes');
  mergeKey('innerscape_stool_entries', data.stool_entries, 'Stool');
  mergeKey('innerscape_quick_notes', data.quick_notes, 'Quick notes');
  mergeKey('innerscape_intentions', data.intentions, 'Intentions');
  if (data.oura_config) { localStorage.setItem('innerscape_oura_config', JSON.stringify(data.oura_config)); logs.push('✅ Oura config'); }
  if (data.oura_data) { localStorage.setItem('innerscape_oura_data', JSON.stringify(data.oura_data)); logs.push('✅ Oura data'); }

  if (!logs.length) {
    $('#import-result').innerHTML = '<p style="color:#fbbf24;margin-top:8px">⚠️ No data found in file</p>';
  } else {
    $('#import-result').innerHTML = '<p style="color:#4ade80;margin-top:8px">🎉 Imported!<br>' + logs.join('<br>') + '</p>';
    showToast('Import complete ✓');
  }
}

function exportMoodCSV() {
  const entries = loadEntries();
  if (!entries.length) { showToast('No mood data to export'); return; }
  
  let csv = 'Date,Time,Body,Energy,Mood,Mind,Body Note,Energy Note,Mood Note,Mind Note\n';
  entries.forEach(e => {
    const d = new Date(e.ts);
    const date = d.toLocaleDateString();
    const time = d.toLocaleTimeString();
    csv += `"${date}","${time}",${e.body || ''},${e.energy || ''},${e.mood || ''},${e.mind || ''}`;
    csv += `,"${(e.notes?.body || '').replace(/"/g, '""')}","${(e.notes?.energy || '').replace(/"/g, '""')}"`;
    csv += `,"${(e.notes?.mood || '').replace(/"/g, '""')}","${(e.notes?.mind || '').replace(/"/g, '""')}"\n`;
  });
  
  downloadFile(csv, `innerscape-mood-${dayKey(Date.now())}.csv`, 'text/csv');
  showToast('Mood data exported ✓');
}

function exportMoodText() {
  const entries = loadEntries();
  if (!entries.length) { showToast('No mood data to export'); return; }
  
  let text = 'Innerscape Mood Journal\n' + '='.repeat(25) + '\n\n';
  entries.forEach(e => {
    const d = new Date(e.ts);
    text += `${dateStr(e.ts)} at ${timeStr(e.ts)}\n`;
    text += `🫀 Body: ${fmt(e.body || 0)}/10  ⚡ Energy: ${fmt(e.energy || 0)}/10  💜 Mood: ${fmt(e.mood || 0)}/10  🧠 Mind: ${fmt(e.mind || 0)}/10\n`;
    if (e.notes) {
      CATS.forEach(cat => {
        if (e.notes[cat.id]) text += `${cat.emoji} ${cat.label}: ${e.notes[cat.id]}\n`;
      });
    }
    text += '\n';
  });
  
  downloadFile(text, `innerscape-mood-${dayKey(Date.now())}.txt`);
  showToast('Mood journal exported ✓');
}

function exportDreamsText() {
  const dreams = loadDreams();
  if (!dreams.length) { showToast('No dreams to export'); return; }
  
  let text = 'Innerscape Dream Journal\n' + '='.repeat(26) + '\n\n';
  dreams.forEach(d => {
    text += `${dateStr(d.date)} - ${d.title}\n`;
    text += '-'.repeat(d.title.length + dateStr(d.date).length + 3) + '\n';
    if (d.tags.length) text += `Tags: ${d.tags.join(', ')}\n`;
    text += `${d.transcript}\n\n`;
  });
  
  downloadFile(text, `innerscape-dreams-${dayKey(Date.now())}.txt`);
  showToast('Dream journal exported ✓');
}

function exportDreamsJSON() {
  const dreams = loadDreams();
  if (!dreams.length) { showToast('No dreams to export'); return; }
  
  const data = JSON.stringify({ dreams, exported: new Date().toISOString() }, null, 2);
  downloadFile(data, `innerscape-dreams-${dayKey(Date.now())}.json`, 'application/json');
  showToast('Dreams with audio exported ✓');
}

function exportTimerCSV() {
  const activities = loadActivities();
  const entries = loadTimeEntries();
  if (!entries.length) { showToast('No timer data to export'); return; }
  
  let csv = 'Date,Activity,Start Time,End Time,Duration (minutes)\n';
  entries.forEach(e => {
    const act = activities.find(a => a.id === e.activityId);
    const date = new Date(e.startTime).toLocaleDateString();
    const start = timeStr(e.startTime);
    const end = timeStr(e.endTime);
    const mins = Math.round((e.endTime - e.startTime) / 60000);
    csv += `"${date}","${act ? act.emoji + ' ' + act.name : 'Unknown'}","${start}","${end}",${mins}\n`;
  });
  
  downloadFile(csv, `innerscape-timer-${dayKey(Date.now())}.csv`, 'text/csv');
  showToast('Timer log exported ✓');
}

function exportTimerSummary() {
  const activities = loadActivities();
  const entries = loadTimeEntries();
  if (!entries.length) { showToast('No timer data to export'); return; }
  
  let text = 'Innerscape Activity Summary\n' + '='.repeat(28) + '\n\n';
  
  const weekGroups = {};
  entries.forEach(e => {
    const d = new Date(e.startTime);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const weekKey = dayKey(weekStart);
    if (!weekGroups[weekKey]) weekGroups[weekKey] = [];
    weekGroups[weekKey].push(e);
  });
  
  Object.keys(weekGroups).sort().reverse().forEach(weekKey => {
    const weekEntries = weekGroups[weekKey];
    text += `Week of ${new Date(weekKey).toLocaleDateString()}\n`;
    text += '-'.repeat(20) + '\n';
    
    const actTotals = {};
    weekEntries.forEach(e => {
      const dur = e.endTime - e.startTime;
      actTotals[e.activityId] = (actTotals[e.activityId] || 0) + dur;
    });
    
    Object.entries(actTotals)
      .sort((a, b) => b[1] - a[1])
      .forEach(([id, ms]) => {
        const act = activities.find(a => a.id === id);
        text += `${act ? act.emoji + ' ' + act.name : 'Unknown'}: ${formatDuration(ms)}\n`;
      });
    
    text += '\n';
  });
  
  downloadFile(text, `innerscape-timer-summary-${dayKey(Date.now())}.txt`);
  showToast('Timer summary exported ✓');
}

function exportMeditationCSV() {
  const sessions = loadMeditations();
  if (!sessions.length) { showToast('No meditation data to export'); return; }
  
  let csv = 'Date,Time,Duration (minutes),Rounds,Mood After\n';
  sessions.forEach(s => {
    const date = new Date(s.ts).toLocaleDateString();
    const time = timeStr(s.ts);
    csv += `"${date}","${time}",${s.duration || 0},${s.rounds || 0},${s.mood || ''}\n`;
  });
  
  downloadFile(csv, `innerscape-meditation-${dayKey(Date.now())}.csv`, 'text/csv');
  showToast('Meditation log exported ✓');
}

function exportAllJSON() {
  const data = {
    exported: new Date().toISOString(),
    version: 'innerscape-v14',
    mood_entries: loadEntries(),
    dreams: loadDreams(),
    activities: loadActivities(),
    time_entries: loadTimeEntries(),
    meditation_sessions: loadMeditations(),
    food_entries: JSON.parse(localStorage.getItem('innerscape_food_entries') || '[]'),
    medications: JSON.parse(localStorage.getItem('innerscape_medications') || '[]'),
    medication_logs: JSON.parse(localStorage.getItem('innerscape_medication_logs') || '[]'),
    todos: JSON.parse(localStorage.getItem('innerscape_todos') || '[]'),
    wishes: JSON.parse(localStorage.getItem('innerscape_wishes') || '[]'),
    stool_entries: JSON.parse(localStorage.getItem('innerscape_stool_entries') || '[]'),
    quick_notes: JSON.parse(localStorage.getItem('innerscape_quick_notes') || '[]'),
    intentions: JSON.parse(localStorage.getItem('innerscape_intentions') || '[]'),
    oura_config: JSON.parse(localStorage.getItem('innerscape_oura_config') || 'null'),
    oura_data: JSON.parse(localStorage.getItem('innerscape_oura_data') || 'null'),
  };
  
  // Count what's included
  const counts = [];
  if (data.mood_entries.length) counts.push(`${data.mood_entries.length} mood`);
  if (data.dreams.length) counts.push(`${data.dreams.length} dreams`);
  if (data.time_entries.length) counts.push(`${data.time_entries.length} time`);
  if (data.meditation_sessions.length) counts.push(`${data.meditation_sessions.length} meditation`);
  if (data.food_entries.length) counts.push(`${data.food_entries.length} food`);
  if (data.medication_logs.length) counts.push(`${data.medication_logs.length} med logs`);
  if (data.todos.length) counts.push(`${data.todos.length} todos`);
  if (data.wishes.length) counts.push(`${data.wishes.length} wishes`);
  if (data.stool_entries.length) counts.push(`${data.stool_entries.length} stool`);
  if (data.oura_data) counts.push('Oura data');
  
  const json = JSON.stringify(data, null, 2);
  const uid = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
  downloadFile(json, `innerscape-backup-${dayKey(Date.now())}---${uid}.json`, 'application/json');
  showToast(`Backup exported ✓ (${counts.join(', ')})`);
}

function exportHTMLReport() {
  const entries = loadEntries();
  const dreams = loadDreams();
  const activities = loadActivities();
  const timeEntries = loadTimeEntries();
  const medSessions = loadMeditations();
  
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Innerscape Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #0a0a0f; color: #e8e4f0; }
    h1 { color: #a78bfa; text-align: center; }
    h2 { color: #34d399; border-bottom: 2px solid #1e1e2a; padding-bottom: 5px; }
    .section { background: #141420; padding: 20px; margin: 20px 0; border-radius: 12px; border: 1px solid #2a2a3a; }
    .entry { background: #1e1e2a; padding: 15px; margin: 10px 0; border-radius: 8px; }
    .date { color: #9892a6; font-size: 14px; }
    .ratings { margin: 10px 0; }
    .rating { display: inline-block; margin-right: 15px; background: #2a2a3a; padding: 5px 10px; border-radius: 6px; }
    .dream-tags { margin: 10px 0; }
    .tag { background: #a78bfa; color: white; padding: 3px 8px; border-radius: 12px; font-size: 12px; margin-right: 5px; }
  </style>
</head>
<body>
  <h1>🔮 Innerscape Report</h1>
  <p style="text-align: center; color: #9892a6;">Generated ${new Date().toLocaleDateString()}</p>
  
  ${entries.length ? `<div class="section">
    <h2>📊 Mood Check-ins (${entries.length})</h2>
    ${entries.slice(-10).reverse().map(e => `
      <div class="entry">
        <div class="date">${dateStr(e.ts)} at ${timeStr(e.ts)}</div>
        <div class="ratings">
          <span class="rating">🫀 Body: ${fmt(e.body || 0)}/10</span>
          <span class="rating">⚡ Energy: ${fmt(e.energy || 0)}/10</span>
          <span class="rating">💜 Mood: ${fmt(e.mood || 0)}/10</span>
          <span class="rating">🧠 Mind: ${fmt(e.mind || 0)}/10</span>
        </div>
        ${e.notes ? CATS.map(cat => e.notes[cat.id] ? `<p><strong>${cat.emoji} ${cat.label}:</strong> ${e.notes[cat.id]}</p>` : '').join('') : ''}
      </div>
    `).join('')}
  </div>` : ''}
  
  ${dreams.length ? `<div class="section">
    <h2>🌙 Dream Journal (${dreams.length})</h2>
    ${dreams.slice(-5).reverse().map(d => `
      <div class="entry">
        <div class="date">${dateStr(d.date)} - <strong>${d.title}</strong></div>
        ${d.tags.length ? `<div class="dream-tags">${d.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div>` : ''}
        <p>${d.transcript}</p>
      </div>
    `).join('')}
  </div>` : ''}
  
  ${timeEntries.length ? `<div class="section">
    <h2>⏱ Activity Timer (${timeEntries.length} sessions)</h2>
    ${timeEntries.slice(-10).reverse().map(e => {
      const act = activities.find(a => a.id === e.activityId);
      return `
        <div class="entry">
          <div class="date">${new Date(e.startTime).toLocaleDateString()}</div>
          <p><strong>${act ? act.emoji + ' ' + act.name : 'Unknown Activity'}</strong></p>
          <p>${timeStr(e.startTime)} – ${timeStr(e.endTime)} (${formatDuration(e.endTime - e.startTime)})</p>
        </div>
      `;
    }).join('')}
  </div>` : ''}
  
  ${medSessions.length ? `<div class="section">
    <h2>🧹 Meditation Sessions (${medSessions.length})</h2>
    ${medSessions.slice(-10).reverse().map(s => `
      <div class="entry">
        <div class="date">${new Date(s.ts).toLocaleDateString()}</div>
        <p><strong>${s.duration || 0} minutes</strong> · ${s.rounds || 0} rounds</p>
        ${s.mood ? `<p>Mood after: ${s.mood}/10</p>` : ''}
      </div>
    `).join('')}
  </div>` : ''}
  
</body>
</html>`;
  
  downloadFile(html, `innerscape-report-${dayKey(Date.now())}.html`, 'text/html');
  showToast('Beautiful report exported ✓');
}

let lastExportTime = 0;
const EXPORT_COOLDOWN = 2000; // 2 seconds

function withCooldown(fn, name) {
  return function(...args) {
    const now = Date.now();
    if (now - lastExportTime < EXPORT_COOLDOWN) {
      showToast('Please wait before exporting again');
      return;
    }
    lastExportTime = now;
    try {
      return fn.apply(this, args);
    } catch (error) {
      showToast(`Export failed: ${error.message}`);
      console.error(`Export error (${name}):`, error);
    }
  };
}

const shareWithDaisy = withCooldown(function() {
  const entries = loadEntries();
  const dreams = loadDreams();
  const activities = loadActivities();
  const timeEntries = loadTimeEntries();
  const medSessions = loadMeditations();
  const foodEntries = loadFoodEntries();
  const medicationLogs = loadMedicationLogs();
  const medications = loadMedications();
  const todos = loadTodos();
  
  const now = Date.now();
  const last7Days = now - (7 * 24 * 60 * 60 * 1000);
  
  const recentMood = entries.filter(e => e.ts >= last7Days);
  const recentTimer = timeEntries.filter(e => e.startTime >= last7Days);
  const recentDreams = dreams.filter(d => new Date(d.date).getTime() >= last7Days);
  const recentMed = medSessions.filter(s => s.ts >= last7Days);
  const recentFood = foodEntries.filter(f => f.timestamp >= last7Days);
  const recentMedicationLogs = medicationLogs.filter(log => log.timestamp >= last7Days);
  const activeTodos = todos.filter(t => !t.completed);
  const completedTodos = todos.filter(t => t.completed && t.completedAt >= last7Days);
  
  const avgMood7d = recentMood.length ? {
    body: recentMood.reduce((s, e) => s + (e.body || 0), 0) / recentMood.length,
    energy: recentMood.reduce((s, e) => s + (e.energy || 0), 0) / recentMood.length,
    mood: recentMood.reduce((s, e) => s + (e.mood || 0), 0) / recentMood.length,
    mind: recentMood.reduce((s, e) => s + (e.mind || 0), 0) / recentMood.length,
  } : null;
  
  const totalTimerThisWeek = recentTimer.reduce((sum, e) => sum + (e.endTime - e.startTime), 0);
  
  const shareData = {
    exported: new Date().toISOString(),
    summary: {
      total_entries: {
        mood_checkins: entries.length,
        dreams: dreams.length,
        timer_sessions: timeEntries.length,
        meditation_sessions: medSessions.length,
        food_entries: foodEntries.length,
        medications: medications.length,
        medication_logs: medicationLogs.length,
        todos: todos.length
      },
      date_range: {
        first_entry: entries.length ? new Date(Math.min(...entries.map(e => e.ts))).toISOString().split('T')[0] : null,
        last_entry: entries.length ? new Date(Math.max(...entries.map(e => e.ts))).toISOString().split('T')[0] : null
      },
      last_7_days: {
        mood_checkins: recentMood.length,
        avg_ratings: avgMood7d ? {
          body: Math.round(avgMood7d.body * 10) / 10,
          energy: Math.round(avgMood7d.energy * 10) / 10,
          mood: Math.round(avgMood7d.mood * 10) / 10,
          mind: Math.round(avgMood7d.mind * 10) / 10
        } : null,
        dreams_logged: recentDreams.length,
        timer_sessions: recentTimer.length,
        total_activity_time: Math.round(totalTimerThisWeek / 60000) + ' minutes',
        meditation_sessions: recentMed.length,
        food_entries: recentFood.length,
        medication_logs: recentMedicationLogs.length,
        todos_active: activeTodos.length,
        todos_completed: completedTodos.length
      }
    },
    full_data: {
      mood_entries: entries.map(e => ({
        date: new Date(e.ts).toISOString().split('T')[0],
        time: timeStr(e.ts),
        ratings: { body: e.body, energy: e.energy, mood: e.mood, mind: e.mind },
        notes: e.notes
      })),
      dreams: dreams.map(d => ({
        date: d.date,
        title: d.title,
        tags: d.tags,
        transcript: d.transcript
      })),
      timer_sessions: timeEntries.map(e => {
        const act = activities.find(a => a.id === e.activityId);
        return {
          date: new Date(e.startTime).toISOString().split('T')[0],
          activity: act ? act.emoji + ' ' + act.name : 'Unknown',
          start_time: timeStr(e.startTime),
          end_time: timeStr(e.endTime),
          duration_minutes: Math.round((e.endTime - e.startTime) / 60000)
        };
      }),
      meditation_sessions: medSessions.map(s => ({
        date: new Date(s.ts).toISOString().split('T')[0],
        duration_minutes: s.duration,
        rounds: s.rounds,
        mood_after: s.mood
      })),
      food_entries: foodEntries.map(f => ({
        date: new Date(f.timestamp).toISOString().split('T')[0],
        time: timeStr(f.timestamp),
        meal_type: f.mealType,
        description: f.description,
        satisfaction: f.satisfaction,
        tags: f.tags,
        has_photo: !!f.photo
      })),
      medications: medications.map(m => ({
        name: m.name,
        dosage: m.dosage,
        frequency: m.frequency,
        color: m.color,
        created: new Date(m.createdAt).toISOString().split('T')[0]
      })),
      medication_logs: medicationLogs.map(log => ({
        medication_name: medications.find(m => m.id === log.medicationId)?.name || 'Unknown',
        date: new Date(log.timestamp).toISOString().split('T')[0],
        time: timeStr(log.timestamp),
        notes: log.notes
      })),
      todos: todos.map(t => ({
        text: t.text,
        category: t.category,
        priority: t.priority,
        completed: t.completed,
        created: new Date(t.createdAt).toISOString().split('T')[0],
        completed_date: t.completed ? new Date(t.completedAt).toISOString().split('T')[0] : null,
        notes: t.notes
      }))
    }
  };
  
  const formatted = `🌼 Complete Innerscape Data for Daisy 🔮

Hey Daisy! Here's my COMPLETE wellness data for deep analysis:

**Summary:**
• ${shareData.summary.total_entries.mood_checkins} mood check-ins
• ${shareData.summary.total_entries.dreams} dreams logged  
• ${shareData.summary.total_entries.timer_sessions} activity sessions
• ${shareData.summary.total_entries.meditation_sessions} meditation sessions
• ${shareData.summary.total_entries.food_entries} food entries
• ${shareData.summary.total_entries.medications} medications tracked
• ${shareData.summary.total_entries.medication_logs} medication logs
• ${shareData.summary.total_entries.todos} to-do items
• Data from ${shareData.summary.date_range.first_entry || 'N/A'} to ${shareData.summary.date_range.last_entry || 'today'}

**Last 7 days:**
• ${shareData.summary.last_7_days.mood_checkins} mood check-ins${avgMood7d ? ` (avg: 🫀${avgMood7d.body.toFixed(1)} ⚡${avgMood7d.energy.toFixed(1)} 💜${avgMood7d.mood.toFixed(1)} 🧠${avgMood7d.mind.toFixed(1)})` : ''}
• ${shareData.summary.last_7_days.dreams_logged} dreams logged
• ${shareData.summary.last_7_days.timer_sessions} activities (${shareData.summary.last_7_days.total_activity_time})
• ${shareData.summary.last_7_days.meditation_sessions} meditation sessions
• ${shareData.summary.last_7_days.food_entries} food entries
• ${shareData.summary.last_7_days.medication_logs} medication doses logged
• ${shareData.summary.last_7_days.todos_active} active to-dos, ${shareData.summary.last_7_days.todos_completed} completed

\`\`\`json
${JSON.stringify(shareData, null, 2)}
\`\`\`

Please analyze this data and share any insights, patterns, or recommendations! ✨`;
  
  downloadFile(formatted, `daisy-analysis-${dayKey(Date.now())}.txt`, 'text/plain');
  showToast('📄 File saved! Send it to Daisy via WhatsApp');
}, 'shareWithDaisy');

function showShareModal(content) {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
    background: rgba(0,0,0,0.8); z-index: 1000; padding: 20px;
    display: flex; align-items: center; justify-content: center;
  `;
  
  const card = document.createElement('div');
  card.style.cssText = `
    background: var(--surface); border-radius: 16px; padding: 24px;
    max-width: 500px; width: 100%; max-height: 80vh; overflow: hidden;
    display: flex; flex-direction: column;
  `;
  
  card.innerHTML = `
    <h3 style="margin: 0 0 16px 0; color: var(--text);">Share with Daisy 🌼</h3>
    <textarea style="
      width: 100%; height: 300px; padding: 12px; border: 1px solid var(--border);
      border-radius: 8px; background: var(--surface2); color: var(--text);
      font-family: monospace; font-size: 12px; resize: vertical;
    " readonly>${content}</textarea>
    <div style="margin-top: 16px; display: flex; gap: 8px; justify-content: flex-end;">
      <button id="copy-share-data" style="padding: 8px 16px; border: none; border-radius: 8px; background: var(--accent); color: white; cursor: pointer;">Copy</button>
      <button id="close-share-modal" style="padding: 8px 16px; border: 1px solid var(--border); border-radius: 8px; background: var(--surface2); color: var(--text); cursor: pointer;">Close</button>
    </div>
  `;
  
  modal.appendChild(card);
  document.body.appendChild(modal);
  
  const textarea = card.querySelector('textarea');
  textarea.select();
  
  card.querySelector('#copy-share-data').addEventListener('click', () => {
    textarea.select();
    document.execCommand('copy');
    showToast('📋 Copied! Paste in our chat');
  });
  
  card.querySelector('#close-share-modal').addEventListener('click', () => {
    document.body.removeChild(modal);
  });
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) document.body.removeChild(modal);
  });
}
