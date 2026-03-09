/* ── Activity Overview Module ── */

function showActivityOverview() {
  const timeEntries = loadTimeEntries();
  const activities = loadActivities();
  const now = Date.now();
  
  // Filter out entries that are too short (< 30 seconds) or have invalid times
  const validEntries = timeEntries.filter(e => 
    e.startTime && e.endTime && 
    e.endTime > e.startTime && 
    (e.endTime - e.startTime) >= 30000
  ).sort((a, b) => b.startTime - a.startTime);
  
  if (!validEntries.length) {
    document.getElementById('activity-overview-content').innerHTML = `
      <div class="overview-empty">
        <span class="overview-empty-icon">📊</span>
        <h3>No Activity Data Yet</h3>
        <p>Start tracking time with the Timer to see patterns and insights here</p>
      </div>
    `;
    return;
  }

  // Time period selectors
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const weekStart = todayStart - (6 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).getTime();

  // Filter entries by time periods
  const todayEntries = validEntries.filter(e => e.startTime >= todayStart);
  const weekEntries = validEntries.filter(e => e.startTime >= weekStart);
  const monthEntries = validEntries.filter(e => e.startTime >= monthStart);

  document.getElementById('activity-overview-content').innerHTML = `
    <div class="overview-page">
      <div class="overview-header">
        <h2>📊 Activity Overview</h2>
        <p class="overview-subtitle">Insights from ${validEntries.length} sessions</p>
      </div>

      <div class="overview-tabs">
        <button class="overview-tab active" data-period="today" onclick="switchOverviewPeriod('today')">Today</button>
        <button class="overview-tab" data-period="week" onclick="switchOverviewPeriod('week')">Week</button>
        <button class="overview-tab" data-period="month" onclick="switchOverviewPeriod('month')">Month</button>
      </div>

      <div id="overview-content">
        ${renderOverviewPeriod('today', todayEntries, activities)}
      </div>
    </div>
  `;
}

function switchOverviewPeriod(period) {
  document.querySelectorAll('.overview-tab').forEach(tab => 
    tab.classList.toggle('active', tab.dataset.period === period)
  );

  const timeEntries = loadTimeEntries();
  const activities = loadActivities();
  const validEntries = timeEntries.filter(e => 
    e.startTime && e.endTime && 
    e.endTime > e.startTime && 
    (e.endTime - e.startTime) >= 30000
  ).sort((a, b) => b.startTime - a.startTime);

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const weekStart = todayStart - (6 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).getTime();

  let entries;
  switch(period) {
    case 'today':
      entries = validEntries.filter(e => e.startTime >= todayStart);
      break;
    case 'week':
      entries = validEntries.filter(e => e.startTime >= weekStart);
      break;
    case 'month':
      entries = validEntries.filter(e => e.startTime >= monthStart);
      break;
  }

  document.getElementById('overview-content').innerHTML = renderOverviewPeriod(period, entries, activities);
}

function renderOverviewPeriod(period, entries, activities) {
  if (!entries.length) {
    return `
      <div class="overview-empty-period">
        <p>No activities tracked ${period === 'today' ? 'today' : `this ${period}`}</p>
      </div>
    `;
  }

  // Calculate totals by activity
  const activityTotals = {};
  const activityCounts = {};
  let totalTime = 0;

  entries.forEach(entry => {
    const duration = entry.endTime - entry.startTime;
    totalTime += duration;
    
    const actId = entry.activityId;
    activityTotals[actId] = (activityTotals[actId] || 0) + duration;
    activityCounts[actId] = (activityCounts[actId] || 0) + 1;
  });

  // Sort activities by time spent
  const sortedActivities = Object.entries(activityTotals)
    .map(([actId, total]) => {
      const activity = activities.find(a => a.id === actId);
      return {
        id: actId,
        activity,
        total,
        count: activityCounts[actId],
        percentage: (total / totalTime) * 100
      };
    })
    .filter(item => item.activity)
    .sort((a, b) => b.total - a.total);

  // Timeline view for today
  const timelineHtml = period === 'today' ? renderDayTimeline(entries, activities) : '';

  // Weekly pattern for week/month views
  const patternHtml = (period === 'week' || period === 'month') ? renderWeeklyPattern(entries, activities, period) : '';

  return `
    <!-- Summary Stats -->
    <div class="overview-stats">
      <div class="overview-stat-card">
        <div class="stat-icon">⏱</div>
        <div class="stat-content">
          <div class="stat-value">${formatDuration(totalTime)}</div>
          <div class="stat-label">Total Time</div>
        </div>
      </div>
      <div class="overview-stat-card">
        <div class="stat-icon">🎯</div>
        <div class="stat-content">
          <div class="stat-value">${entries.length}</div>
          <div class="stat-label">Sessions</div>
        </div>
      </div>
      <div class="overview-stat-card">
        <div class="stat-icon">📊</div>
        <div class="stat-content">
          <div class="stat-value">${sortedActivities.length}</div>
          <div class="stat-label">Activities</div>
        </div>
      </div>
    </div>

    ${timelineHtml}
    ${patternHtml}

    <!-- Top Activities -->
    <div class="overview-section">
      <h3>🏆 Top Activities</h3>
      <div class="activity-breakdown">
        ${sortedActivities.slice(0, 8).map(item => `
          <div class="activity-break-item">
            <div class="activity-break-left">
              <span class="activity-break-emoji">${item.activity.emoji}</span>
              <div>
                <div class="activity-break-name">${item.activity.name}</div>
                <div class="activity-break-meta">${item.count} session${item.count !== 1 ? 's' : ''}</div>
              </div>
            </div>
            <div class="activity-break-right">
              <div class="activity-break-time">${formatDuration(item.total)}</div>
              <div class="activity-break-percent">${item.percentage.toFixed(1)}%</div>
            </div>
            <div class="activity-break-bar">
              <div class="activity-break-fill" style="width:${item.percentage}%;background:${item.activity.color}"></div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Recent Sessions -->
    <div class="overview-section">
      <h3>🕐 Recent Sessions</h3>
      <div class="session-list">
        ${entries.slice(0, 10).map(entry => {
          const activity = activities.find(a => a.id === entry.activityId);
          if (!activity) return '';
          
          const duration = entry.endTime - entry.startTime;
          const startTime = new Date(entry.startTime);
          const endTime = new Date(entry.endTime);
          
          return `
            <div class="session-item">
              <div class="session-left">
                <span class="session-emoji">${activity.emoji}</span>
                <div>
                  <div class="session-activity">${activity.name}</div>
                  ${entry.subActivityName ? `<div class="session-sub">↳ ${entry.subActivityName}</div>` : ''}
                  ${entry.note ? `<div class="session-note">"${entry.note}"</div>` : ''}
                </div>
              </div>
              <div class="session-right">
                <div class="session-duration">${formatDuration(duration)}</div>
                <div class="session-time">
                  ${startTime.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})} - 
                  ${endTime.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                </div>
                <div class="session-date">${formatDate(entry.startTime)}</div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function renderDayTimeline(entries, activities) {
  if (!entries.length) return '';

  // Group by hour and create timeline
  const hours = new Array(24).fill(null).map((_, i) => ({
    hour: i,
    entries: [],
    total: 0
  }));

  entries.forEach(entry => {
    const startHour = new Date(entry.startTime).getHours();
    const endHour = new Date(entry.endTime).getHours();
    const duration = entry.endTime - entry.startTime;
    
    // Add to the start hour (simplified - could be more precise)
    hours[startHour].entries.push(entry);
    hours[startHour].total += duration;
  });

  const maxHourTotal = Math.max(...hours.map(h => h.total));

  return `
    <div class="overview-section">
      <h3>🌅 Today's Timeline</h3>
      <div class="timeline-chart">
        ${hours.map(hour => `
          <div class="timeline-hour" title="${hour.entries.length} sessions">
            <div class="timeline-bar" style="height:${maxHourTotal > 0 ? (hour.total / maxHourTotal * 100) : 0}%;background:${hour.total > 0 ? 'var(--accent)' : 'var(--surface2)'}"></div>
            <div class="timeline-label">${hour.hour}</div>
          </div>
        `).join('')}
      </div>
      <div class="timeline-legend">
        <span>Hourly activity distribution</span>
      </div>
    </div>
  `;
}

function renderWeeklyPattern(entries, activities, period) {
  if (!entries.length) return '';

  // Group by day of week
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayTotals = new Array(7).fill(0);
  
  entries.forEach(entry => {
    const day = new Date(entry.startTime).getDay();
    dayTotals[day] += entry.endTime - entry.startTime;
  });

  const maxDayTotal = Math.max(...dayTotals);

  return `
    <div class="overview-section">
      <h3>📅 ${period === 'week' ? 'This Week' : 'Daily'} Pattern</h3>
      <div class="weekly-chart">
        ${daysOfWeek.map((dayName, index) => `
          <div class="weekly-day">
            <div class="weekly-bar" style="height:${maxDayTotal > 0 ? (dayTotals[index] / maxDayTotal * 100) : 0}%;background:var(--accent)"></div>
            <div class="weekly-time">${dayTotals[index] > 0 ? formatDuration(dayTotals[index]) : ''}</div>
            <div class="weekly-label">${dayName}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// Helper functions
function formatDuration(ms) {
  if (!ms || ms < 0) return '0m';
  
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function formatDate(timestamp) {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  
  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
}