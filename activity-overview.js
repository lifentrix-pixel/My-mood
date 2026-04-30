/* ── Activity Overview Module — Visual Rework ── */

// Deduplicate entries: when a parent session has sub-activity entries,
// only count the parent (which spans the full time), skip subs for totals
function dedupeEntries(entries) {
  // Find parent entries (no subActivityId)
  const parents = entries.filter(e => !e.subActivityId);
  // Find sub entries
  const subs = entries.filter(e => e.subActivityId);
  
  // For each sub, check if a parent exists that covers its time range
  // If so, skip the sub for calculations (parent already covers it)
  const standaloneSubsOnly = subs.filter(sub => {
    return !parents.some(p => 
      p.activityId === sub.activityId && 
      p.startTime <= sub.startTime && 
      p.endTime >= sub.endTime - 60000 // 1min tolerance
    );
  });
  
  return [...parents, ...standaloneSubsOnly];
}

// Get sub-entries for a parent entry (for timeline display)
function getSubEntries(parentEntry, allEntries) {
  return allEntries.filter(e => 
    e.subActivityId && 
    e.activityId === parentEntry.activityId &&
    e.startTime >= parentEntry.startTime - 1000 &&
    e.endTime <= parentEntry.endTime + 60000
  ).sort((a, b) => a.startTime - b.startTime);
}

function showActivityOverview() {
  const container = document.getElementById('activity-overview-content');
  const timeEntries = loadTimeEntries();
  const activities = loadActivities();

  const allValid = timeEntries.filter(e =>
    e.startTime && e.endTime &&
    e.endTime > e.startTime &&
    (e.endTime - e.startTime) >= 30000
  ).sort((a, b) => a.startTime - b.startTime);
  
  // Deduplicated entries for calculations
  const validEntries = dedupeEntries(allValid);

  if (!validEntries.length) {
    container.innerHTML = `
      <div class="ao-page">
        <div class="ao-empty">
          <div class="ao-empty-icon">✦</div>
          <h3>Your story starts here</h3>
          <p>Start tracking activities with the Timer to see your beautiful day unfold</p>
        </div>
      </div>`;
    return;
  }

  const period = document.querySelector('.ao-tab.active')?.dataset.period || 'today';

  container.innerHTML = `
    <div class="ao-page">
      <div class="ao-tabs">
        <button class="ao-tab ${period==='today'?'active':''}" data-period="today" onclick="switchOverviewPeriod('today')">Today</button>
        <button class="ao-tab ${period==='week'?'active':''}" data-period="week" onclick="switchOverviewPeriod('week')">Week</button>
        <button class="ao-tab ${period==='month'?'active':''}" data-period="month" onclick="switchOverviewPeriod('month')">Month</button>
      </div>
      <div id="ao-content"></div>
    </div>`;

  renderPeriod(period, validEntries, activities);
}

function switchOverviewPeriod(period) {
  document.querySelectorAll('.ao-tab').forEach(t =>
    t.classList.toggle('active', t.dataset.period === period)
  );
  const timeEntries = loadTimeEntries();
  const activities = loadActivities();
  const allValid = timeEntries.filter(e =>
    e.startTime && e.endTime && e.endTime > e.startTime && (e.endTime - e.startTime) >= 30000
  ).sort((a, b) => a.startTime - b.startTime);
  const validEntries = dedupeEntries(allValid);

  renderPeriod(period, validEntries, activities);
}

function renderPeriod(period, entries, activities) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const weekStart = todayStart - 6 * 86400000;
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  let filtered;
  if (period === 'today') filtered = entries.filter(e => e.startTime >= todayStart);
  else if (period === 'week') filtered = entries.filter(e => e.startTime >= weekStart);
  else filtered = entries.filter(e => e.startTime >= monthStart);

  const el = document.getElementById('ao-content');
  if (!el) return;

  const stats = calcStats(filtered, activities);

  let html = `
    <div class="ao-actions">
      <button class="ao-add-entry-btn" onclick="addManualEntry()">+ Add Entry</button>
    </div>
  `;
  html += renderStatPills(stats);

  if (period === 'today') {
    html += `<div class="ao-subtabs">
      <button class="ao-subtab active" onclick="switchTodayView('timeline')">🕐 Timeline</button>
      <button class="ao-subtab" onclick="switchTodayView('summary')">📊 Summary</button>
    </div>`;
    html += `<div id="ao-today-timeline">${renderDayTimeline(filtered, activities, todayStart)}</div>`;
    html += `<div id="ao-today-summary" style="display:none">${filtered.length > 0 ? renderTopActivities(stats.sorted) : ''}</div>`;
  } else if (period === 'week') {
    html += renderWeekGrid(entries, activities, todayStart);
    if (filtered.length > 0) html += renderTopActivities(stats.sorted);
  } else {
    html += renderMonthView(entries, activities, now);
    if (filtered.length > 0) html += renderTopActivities(stats.sorted);
  }

  el.innerHTML = html;
}

/* ── Stats ── */
function calcStats(entries, activities) {
  const totals = {}, counts = {};
  let totalTime = 0;
  const hourBuckets = new Array(24).fill(0);

  entries.forEach(e => {
    const dur = e.endTime - e.startTime;
    totalTime += dur;
    totals[e.activityId] = (totals[e.activityId] || 0) + dur;
    counts[e.activityId] = (counts[e.activityId] || 0) + 1;
    hourBuckets[new Date(e.startTime).getHours()] += dur;
  });

  const peakHour = hourBuckets.indexOf(Math.max(...hourBuckets));
  const peakLabel = peakHour === -1 ? '—' : formatHour(peakHour);

  const sorted = Object.entries(totals)
    .map(([id, total]) => {
      const act = activities.find(a => a.id === id);
      return act ? { act, total, count: counts[id], pct: totalTime ? (total/totalTime)*100 : 0 } : null;
    })
    .filter(Boolean)
    .sort((a,b) => b.total - a.total);

  return { totalTime, sessions: entries.length, peakLabel, sorted };
}

function renderStatPills(s) {
  return `<div class="ao-stats">
    <div class="ao-pill"><span class="ao-pill-val">${aoFmtDur(s.totalTime)}</span><span class="ao-pill-label">tracked</span></div>
    <div class="ao-pill"><span class="ao-pill-val">${s.sessions}</span><span class="ao-pill-label">sessions</span></div>
    <div class="ao-pill"><span class="ao-pill-val">${s.peakLabel}</span><span class="ao-pill-label">peak hour</span></div>
  </div>`;
}

/* ── TODAY: Vertical Timeline ── */
function renderDayTimeline(entries, activities, todayStart) {
  if (!entries.length) {
    return `<div class="ao-empty-period">
      <div class="ao-empty-icon">🌅</div>
      <p>No activities yet today — you've got this!</p>
    </div>`;
  }

  const sorted = [...entries].sort((a,b) => b.startTime - a.startTime);
  const now = Date.now();
  const isToday = (new Date()).setHours(0,0,0,0) === todayStart;
  const maxDur = Math.max(...sorted.map(e => e.endTime - e.startTime), 1);

  let html = '<div class="ao-timeline">';

  // Show currently running activity
  if (isToday) {
    try {
      const activeTimer = JSON.parse(localStorage.getItem('innerscape_active_timer') || 'null');
      if (activeTimer && activeTimer.activityId && activeTimer.startTime) {
        const act = activities.find(a => a.id === activeTimer.activityId);
        if (act) {
          const elapsed = now - activeTimer.startTime;
          const color = act.color || 'var(--accent)';
          
          // Check for active sub-activity
          const activeSub = JSON.parse(localStorage.getItem('innerscape_active_sub') || 'null');
          let subName = '';
          if (activeSub && activeSub.subActivityId) {
            const sub = (act.subActivities || []).find(s => s.id === activeSub.subActivityId);
            if (sub) subName = sub.name;
          }
          
          html += `
            <div class="ao-block ao-block-live" style="--ac:${color}">
              <div class="ao-block-bar" style="background:${color}"></div>
              <div class="ao-block-content">
                <div class="ao-block-body">
                  <div class="ao-block-left">
                    <span class="ao-block-emoji">${act.emoji || '⏱'}</span>
                    <div>
                      <div class="ao-block-name">${act.name} <span class="ao-live-badge">LIVE</span></div>
                      ${subName ? `<div class="ao-block-note">↳ ${subName}</div>` : ''}
                    </div>
                  </div>
                  <div class="ao-block-right">
                    <div class="ao-block-dur">${aoFmtDur(elapsed)}</div>
                    <div class="ao-block-time">Since ${fmtTime(new Date(activeTimer.startTime))}</div>
                  </div>
                </div>
              </div>
            </div>`;
        }
      }
    } catch(e) {}
  }

  sorted.forEach((entry, i) => {
    const act = activities.find(a => a.id === entry.activityId);
    if (!act) return;
    const dur = entry.endTime - entry.startTime;
    const minH = 52;
    const maxH = 140;
    const height = Math.max(minH, Math.min(maxH, (dur / maxDur) * maxH));
    const color = act.color || 'var(--accent)';

    // Gap before this entry
    if (i > 0) {
      const gap = sorted[i-1].startTime - entry.endTime;
      if (gap > 60000) {
        html += `<div class="ao-gap"><span class="ao-gap-line"></span><span class="ao-gap-text">${aoFmtDur(gap)} gap</span><span class="ao-gap-line"></span></div>`;
      }
    }

    // Find sub-entries for this parent
    const allEntries = loadTimeEntries().filter(e => e.startTime && e.endTime && e.endTime > e.startTime);
    const subs = !entry.subActivityId ? getSubEntries(entry, allEntries) : [];

    html += `
      <div class="ao-block" style="--ac:${color}">
        <div class="ao-block-bar" style="background:${color}"></div>
        <div class="ao-block-content">
          <div class="ao-block-body">
            <div class="ao-block-left">
              <span class="ao-block-emoji">${act.emoji || '⏱'}</span>
              <div>
                <div class="ao-block-name">${act.name}</div>
                ${entry.note ? `<div class="ao-block-note">"${entry.note}"</div>` : ''}
              </div>
            </div>
            <div class="ao-block-right">
              <div class="ao-block-dur">${aoFmtDur(dur)}</div>
              <div class="ao-block-time">${fmtTime(new Date(entry.startTime))} – ${fmtTime(new Date(entry.endTime))}</div>
              <div class="ao-block-actions">
                <button class="ao-edit-btn" onclick="editActivityEntry('${entry.id || entry.startTime}')" title="Edit entry">✏️</button>
                <button class="ao-delete-btn" onclick="deleteActivityEntry('${entry.id || entry.startTime}')" title="Delete entry">🗑️</button>
              </div>
            </div>
          </div>
          ${subs.length ? `<div class="ao-subs">${subs.map(s => {
            const subDur = s.endTime - s.startTime;
            return `<div class="ao-sub-item">
              <span class="ao-sub-dot" style="background:${color}"></span>
              <span class="ao-sub-name">${s.subActivityName || 'Sub-activity'}</span>
              <span class="ao-sub-dur">${aoFmtDur(subDur)}</span>
              <span class="ao-sub-time">${fmtTime(new Date(s.startTime))} – ${fmtTime(new Date(s.endTime))}</span>
              <div class="ao-sub-actions">
                <button class="ao-edit-btn ao-edit-btn-small" onclick="editActivityEntry('${s.id || s.startTime}')" title="Edit">✏️</button>
                <button class="ao-delete-btn ao-delete-btn-small" onclick="deleteActivityEntry('${s.id || s.startTime}')" title="Delete">🗑️</button>
              </div>
            </div>`;
          }).join('')}</div>` : ''}
        </div>
      </div>`;
  });

  html += '</div>';
  return html;
}

/* ── WEEK: Activity Grid ── */
function renderWeekGrid(allEntries, activities, todayStart) {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = todayStart - i * 86400000;
    const dayEnd = dayStart + 86400000;
    const dayEntries = allEntries.filter(e => e.startTime >= dayStart && e.startTime < dayEnd);
    const d = new Date(dayStart);
    days.push({ dayStart, dayEnd, entries: dayEntries, date: d });
  }

  const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const maxTotal = Math.max(...days.map(d => d.entries.reduce((s,e) => s + e.endTime - e.startTime, 0)), 1);

  // Top activities for week
  const weekEntries = allEntries.filter(e => e.startTime >= todayStart - 6*86400000);
  const weekTotals = {};
  weekEntries.forEach(e => { weekTotals[e.activityId] = (weekTotals[e.activityId]||0) + e.endTime - e.startTime; });
  const topWeek = Object.entries(weekTotals).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([id,t]) => {
    const a = activities.find(x=>x.id===id);
    return a ? `<span class="ao-week-top-item"><span>${a.emoji||'⏱'}</span> ${a.name} <span class="ao-week-top-dur">${aoFmtDur(t)}</span></span>` : '';
  }).join('');

  let html = '';
  if (topWeek) html += `<div class="ao-week-summary">${topWeek}</div>`;

  html += '<div class="ao-week-grid">';
  days.forEach(day => {
    const isToday = day.dayStart === todayStart;
    const total = day.entries.reduce((s,e) => s + e.endTime - e.startTime, 0);
    const barH = maxTotal > 0 ? Math.max(4, (total / maxTotal) * 100) : 0;

    // Collect unique activities for pills
    const seen = new Set();
    const pills = [];
    day.entries.forEach(e => {
      if (!seen.has(e.activityId)) {
        seen.add(e.activityId);
        const a = activities.find(x=>x.id===e.activityId);
        if (a) pills.push(a);
      }
    });

    html += `
      <div class="ao-week-col ${isToday?'ao-week-today':''}" onclick="openDayDetail(${day.dayStart})" style="cursor:pointer">
        <div class="ao-week-pills">
          ${pills.slice(0,4).map(a => `<span class="ao-week-dot" style="background:${a.color||'var(--accent)'}" title="${a.emoji} ${a.name}"></span>`).join('')}
          ${pills.length > 4 ? `<span class="ao-week-more">+${pills.length-4}</span>` : ''}
        </div>
        <div class="ao-week-bar-wrap">
          <div class="ao-week-bar" style="height:${barH}%;background:${isToday?'var(--accent)':'var(--surface3)'}"></div>
        </div>
        <div class="ao-week-day">${dayNames[day.date.getDay()]}</div>
        <div class="ao-week-date">${day.date.getDate()}</div>
        <div class="ao-week-total">${total > 0 ? aoFmtDur(total) : '—'}</div>
      </div>`;
  });
  html += '</div>';
  return html;
}

/* ── MONTH: Calendar Heatmap ── */
function renderMonthView(allEntries, activities, now) {
  const year = now.getFullYear(), month = now.getMonth();
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month+1, 0);
  const daysInMonth = monthEnd.getDate();
  const firstDow = monthStart.getDay(); // 0=Sun

  // Build day totals
  const dayTotals = {};
  let monthTotal = 0, monthSessions = 0;
  allEntries.forEach(e => {
    const d = new Date(e.startTime);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const key = d.getDate();
      const dur = e.endTime - e.startTime;
      dayTotals[key] = (dayTotals[key] || 0) + dur;
      monthTotal += dur;
      monthSessions++;
    }
  });

  const maxDay = Math.max(...Object.values(dayTotals), 1);
  const todayDate = now.getDate();
  const avgDaily = daysInMonth > 0 ? monthTotal / Math.min(todayDate, daysInMonth) : 0;

  // Previous month comparison
  const prevMonthEntries = allEntries.filter(e => {
    const d = new Date(e.startTime);
    return d.getFullYear() === (month === 0 ? year-1 : year) && d.getMonth() === (month === 0 ? 11 : month-1);
  });
  const prevTotal = prevMonthEntries.reduce((s,e) => s + e.endTime - e.startTime, 0);

  // Month stats
  let html = `<div class="ao-month-stats">
    <div class="ao-month-stat"><span class="ao-month-stat-val">${aoFmtDur(monthTotal)}</span><span class="ao-month-stat-lbl">this month</span></div>
    <div class="ao-month-stat"><span class="ao-month-stat-val">${aoFmtDur(avgDaily)}</span><span class="ao-month-stat-lbl">daily avg</span></div>
    ${prevTotal > 0 ? `<div class="ao-month-stat"><span class="ao-month-stat-val">${monthTotal >= prevTotal ? '↑' : '↓'} ${Math.abs(Math.round((monthTotal - prevTotal)/prevTotal*100))}%</span><span class="ao-month-stat-lbl">vs last month</span></div>` : ''}
  </div>`;

  // Calendar heatmap
  const dayLabels = ['S','M','T','W','T','F','S'];
  html += '<div class="ao-cal">';
  html += '<div class="ao-cal-header">' + dayLabels.map(d => `<span class="ao-cal-dow">${d}</span>`).join('') + '</div>';
  html += '<div class="ao-cal-grid">';

  // Empty cells before first day
  for (let i = 0; i < firstDow; i++) html += '<div class="ao-cal-cell ao-cal-empty"></div>';

  for (let d = 1; d <= daysInMonth; d++) {
    const total = dayTotals[d] || 0;
    const intensity = total > 0 ? Math.max(0.15, Math.min(1, total / maxDay)) : 0;
    const isToday = d === todayDate;
    html += `<div class="ao-cal-cell ${isToday?'ao-cal-today':''} ${total>0?'ao-cal-active':''}" style="--int:${intensity}" title="${new Date(year,month,d).toLocaleDateString([], {month:'short',day:'numeric'})}: ${total>0?aoFmtDur(total):'no activity'}">
      <span class="ao-cal-num">${d}</span>
    </div>`;
  }

  html += '</div></div>';

  // Top activities for month
  const monthEntries = allEntries.filter(e => {
    const d = new Date(e.startTime);
    return d.getFullYear() === year && d.getMonth() === month;
  });
  const mTotals = {};
  monthEntries.forEach(e => { mTotals[e.activityId] = (mTotals[e.activityId]||0) + e.endTime - e.startTime; });
  const topMonth = Object.entries(mTotals).sort((a,b)=>b[1]-a[1]).slice(0,5);

  if (topMonth.length) {
    html += '<div class="ao-month-top">';
    topMonth.forEach(([id, t]) => {
      const a = activities.find(x=>x.id===id);
      if (!a) return;
      const pct = monthTotal > 0 ? (t/monthTotal*100) : 0;
      html += `<div class="ao-month-act">
        <span class="ao-month-act-emoji">${a.emoji||'⏱'}</span>
        <span class="ao-month-act-name">${a.name}</span>
        <span class="ao-month-act-bar"><span style="width:${pct}%;background:${a.color||'var(--accent)'}"></span></span>
        <span class="ao-month-act-dur">${aoFmtDur(t)}</span>
      </div>`;
    });
    html += '</div>';
  }

  return html;
}

/* ── Top Activities Card ── */
function renderTopActivities(sorted) {
  if (!sorted.length) return '';
  return `<div class="ao-card">
    <div class="ao-card-title">🏆 Top Activities</div>
    ${sorted.slice(0,6).map(item => `
      <div class="ao-act-row">
        <span class="ao-act-emoji">${item.act.emoji||'⏱'}</span>
        <div class="ao-act-info">
          <div class="ao-act-name">${item.act.name}</div>
          <div class="ao-act-meta">${item.count} session${item.count!==1?'s':''} · ${item.pct.toFixed(0)}%</div>
        </div>
        <div class="ao-act-dur">${aoFmtDur(item.total)}</div>
      </div>
    `).join('')}
  </div>`;
}

/* ── Helpers ── */
function aoFmtDur(ms) {
  if (!ms || ms < 0) return '0m';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function fmtTime(d) {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatHour(h) {
  if (h === 0) return '12am';
  if (h < 12) return h + 'am';
  if (h === 12) return '12pm';
  return (h - 12) + 'pm';
}

// Keep old names for compat
function formatDuration(ms) { return aoFmtDur(ms); }
function formatDate(ts) {
  const d = new Date(ts), now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Today';
  const y = new Date(now.getTime() - 86400000);
  if (d.toDateString() === y.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function openDayDetail(dayStart) {
  const timeEntries = loadTimeEntries();
  const activities = loadActivities();
  const allValid = timeEntries.filter(e =>
    e.startTime && e.endTime && e.endTime > e.startTime && (e.endTime - e.startTime) >= 30000
  );
  const validEntries = dedupeEntries(allValid);
  const dayEnd = dayStart + 86400000;
  const dayEntries = validEntries.filter(e => e.startTime >= dayStart && e.startTime < dayEnd);
  
  const date = new Date(dayStart);
  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const dateLabel = `${dayNames[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
  
  const stats = calcStats(dayEntries, activities);
  
  const el = document.getElementById('ao-content');
  if (!el) return;
  
  let html = `
    <div class="ao-day-detail">
      <button class="ao-back-btn" onclick="closeDayDetail()">← Back to Week</button>
      <div class="ao-day-detail-header">
        <h3>${dateLabel}</h3>
      </div>
      ${renderStatPills(stats)}
      ${renderDayTimeline(dayEntries, activities, dayStart)}
      ${dayEntries.length > 0 ? renderTopActivities(stats.sorted) : ''}
    </div>
  `;
  
  el.innerHTML = html;
}

function closeDayDetail() {
  const timeEntries = loadTimeEntries();
  const activities = loadActivities();
  const allValid = timeEntries.filter(e =>
    e.startTime && e.endTime && e.endTime > e.startTime && (e.endTime - e.startTime) >= 30000
  ).sort((a, b) => a.startTime - b.startTime);
  const validEntries = dedupeEntries(allValid);
  renderPeriod('week', validEntries, activities);
}

function switchTodayView(view) {
  const timeline = document.getElementById('ao-today-timeline');
  const summary = document.getElementById('ao-today-summary');
  if (!timeline || !summary) return;
  
  timeline.style.display = view === 'timeline' ? '' : 'none';
  summary.style.display = view === 'summary' ? '' : 'none';
  
  document.querySelectorAll('.ao-subtab').forEach((btn, i) => {
    btn.classList.toggle('active', (i === 0 && view === 'timeline') || (i === 1 && view === 'summary'));
  });
}

/* ── Edit/Delete/Add Functions ── */
function editActivityEntry(entryId) {
  const timeEntries = loadTimeEntries();
  let entry;
  
  // Find entry by ID or timestamp
  if (entryId.includes('-')) {
    entry = timeEntries.find(e => e.id === entryId);
  } else {
    // Legacy: find by timestamp
    const timestamp = parseInt(entryId);
    entry = timeEntries.find(e => e.startTime === timestamp || e.endTime === timestamp);
  }
  
  if (!entry) {
    showToast('Entry not found');
    return;
  }
  
  // Find the activity for the entry
  const activities = loadActivities();
  const activity = activities.find(a => a.id === entry.activityId);
  
  // Use the existing timer edit function if available
  if (typeof window.openEditEntryModal === 'function' && activity) {
    window.openEditEntryModal(entry, activity);
  } else {
    // Fallback: populate modal directly
    const modal = $('#entry-edit-modal');
    if (!modal) {
      showToast('Edit modal not found');
      return;
    }
    
    $('#entry-edit-date').value = new Date(entry.startTime).toISOString().split('T')[0];
    $('#entry-edit-start').value = new Date(entry.startTime).toTimeString().slice(0,5);
    $('#entry-edit-end').value = new Date(entry.endTime).toTimeString().slice(0,5);
    $('#entry-edit-note').value = entry.note || '';
    $('#entry-edit-title').textContent = activity ? `Edit: ${activity.emoji} ${activity.name}` : 'Edit Entry';
    
    // Set the editing ID globally
    if (typeof window.editingEntryId !== 'undefined') {
      window.editingEntryId = entry.id || entry.startTime;
    }
    
    modal.classList.remove('hidden');
  }
}

function deleteActivityEntry(entryId) {
  if (!confirm('Delete this activity entry?')) return;
  
  const timeEntries = loadTimeEntries();
  let filtered;
  
  if (entryId.includes('-')) {
    filtered = timeEntries.filter(e => e.id !== entryId);
  } else {
    const timestamp = parseInt(entryId);
    filtered = timeEntries.filter(e => e.startTime !== timestamp && e.endTime !== timestamp);
  }
  
  saveTimeEntries(filtered);
  deleteFromSupabase('time_entries', entryId);
  showToast('Entry deleted');
  showActivityOverview(); // Refresh the view
}

function addManualEntry() {
  // Create our own modal since the timer's modal is hidden inside its view
  let modal = document.getElementById('ao-add-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'ao-add-modal';
    modal.className = 'timer-modal';
    
    const activities = loadActivities();
    const actOptions = activities.map(a => 
      `<option value="${a.id}">${a.emoji || '⏱'} ${a.name}</option>`
    ).join('');
    
    modal.innerHTML = `
      <div class="timer-modal-card">
        <h3>Add Activity Entry</h3>
        <div class="timer-modal-field">
          <label>Activity</label>
          <select id="ao-add-activity" class="timer-modal-input">${actOptions}</select>
        </div>
        <div class="timer-modal-field">
          <label>Date</label>
          <input type="date" id="ao-add-date" class="timer-modal-input">
        </div>
        <div class="timer-modal-field">
          <label>Start Time</label>
          <input type="time" id="ao-add-start" class="timer-modal-input">
        </div>
        <div class="timer-modal-field">
          <label>End Time</label>
          <input type="time" id="ao-add-end" class="timer-modal-input">
        </div>
        <div class="timer-modal-field">
          <label>Note (optional)</label>
          <input type="text" id="ao-add-note" class="timer-modal-input" placeholder="Optional note…">
        </div>
        <div class="timer-modal-actions">
          <button id="ao-add-cancel" class="dream-btn-secondary">Cancel</button>
          <button id="ao-add-save" class="dream-btn-primary">Add Entry</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    
    document.getElementById('ao-add-cancel').addEventListener('click', () => {
      modal.classList.add('hidden');
    });
    
    document.getElementById('ao-add-save').addEventListener('click', saveAoManualEntry);
  } else {
    // Refresh the activity list in case it changed
    const activities = loadActivities();
    const sel = document.getElementById('ao-add-activity');
    sel.innerHTML = activities.map(a => 
      `<option value="${a.id}">${a.emoji || '⏱'} ${a.name}</option>`
    ).join('');
  }
  
  // Set defaults
  document.getElementById('ao-add-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('ao-add-start').value = '';
  document.getElementById('ao-add-end').value = '';
  document.getElementById('ao-add-note').value = '';
  
  modal.classList.remove('hidden');
}

function saveAoManualEntry() {
  const actId = document.getElementById('ao-add-activity').value;
  const date = document.getElementById('ao-add-date').value;
  const startStr = document.getElementById('ao-add-start').value;
  const endStr = document.getElementById('ao-add-end').value;
  const note = document.getElementById('ao-add-note').value.trim();
  
  if (!actId || !date || !startStr || !endStr) {
    showToast('Fill in all required fields');
    return;
  }
  
  const startTime = new Date(`${date}T${startStr}`).getTime();
  let endTime = new Date(`${date}T${endStr}`).getTime();
  if (endTime <= startTime) endTime += 86400000; // crossed midnight
  
  const entries = loadTimeEntries();
  const newEntry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    activityId: actId,
    startTime,
    endTime,
  };
  if (note) newEntry.note = note;
  
  entries.push(newEntry);
  saveTimeEntries(entries);
  
  document.getElementById('ao-add-modal').classList.add('hidden');
  showToast('Entry added ✓');
  showActivityOverview();
}

// Refresh activity overview after edits
function refreshActivityOverviewIfActive() {
  setTimeout(() => {
    if (document.getElementById('view-activity-overview')?.classList.contains('active')) {
      showActivityOverview();
    }
  }, 100);
}

// Hook into existing save functions when they become available
document.addEventListener('DOMContentLoaded', function() {
  // Wait a bit for other modules to load
  setTimeout(() => {
    // Hook into edit entry save function
    if (typeof window.saveEditEntry === 'function') {
      const originalSaveEditEntry = window.saveEditEntry;
      window.saveEditEntry = function() {
        const result = originalSaveEditEntry.apply(this, arguments);
        refreshActivityOverviewIfActive();
        return result;
      };
    }

    // Hook into manual entry save function
    if (typeof window.saveManualEntry === 'function') {
      const originalSaveManualEntry = window.saveManualEntry;
      window.saveManualEntry = function() {
        const result = originalSaveManualEntry.apply(this, arguments);
        refreshActivityOverviewIfActive();
        return result;
      };
    }
  }, 500);
});

// Also listen for storage changes that might affect our view
window.addEventListener('storage', function(e) {
  if (e.key === 'innerscape_time_entries' || e.key === 'innerscape_activities') {
    refreshActivityOverviewIfActive();
  }
});

window.showActivityOverview = showActivityOverview;
window.switchOverviewPeriod = switchOverviewPeriod;
window.switchTodayView = switchTodayView;
window.openDayDetail = openDayDetail;
window.closeDayDetail = closeDayDetail;
window.editActivityEntry = editActivityEntry;
window.deleteActivityEntry = deleteActivityEntry;
window.addManualEntry = addManualEntry;
