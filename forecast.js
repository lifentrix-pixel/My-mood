/* ── 🔮 Forecast Module ── */

function showForecastPage() {
  const entries = loadEntries().sort((a, b) => a.ts - b.ts);
  const container = document.getElementById('forecast-content');

  if (entries.length < 5) {
    container.innerHTML = `
      <div class="fc-page">
        <div class="fc-hero"><div class="fc-hero-icon">🔮</div><h2>Forecast</h2>
        <p class="fc-subtitle">Need at least 5 check-ins to start predicting</p></div>
      </div>`;
    return;
  }

  const now = Date.now();
  const recent = entries.filter(e => now - e.ts < 24 * 3600000); // last 24h
  const recent48 = entries.filter(e => now - e.ts < 48 * 3600000);
  const allScores = entries.map(e => avgScore(e));

  // Current state
  const currentAvg = recent.length ? avg(recent.map(avgScore)) : avgScore(entries[entries.length - 1]);
  const prev24Avg = recent48.filter(e => now - e.ts >= 24 * 3600000);
  const prevAvg = prev24Avg.length ? avg(prev24Avg.map(avgScore)) : null;

  // Trend
  const trend = getTrend(entries);
  const velocity = getVelocity(recent.length >= 2 ? recent : entries.slice(-5));

  // Pattern detection
  const alerts = detectAlerts(entries, recent);
  const suggestions = getSuggestions(entries, alerts);
  const spiralRisk = calculateSpiralRisk(entries, recent);

  // Historical patterns
  const patterns = findPatterns(entries);

  container.innerHTML = `
    <div class="fc-page">
      <div class="fc-hero">
        <div class="fc-hero-icon">🔮</div>
        <h2>Forecast</h2>
        <p class="fc-subtitle">Based on ${entries.length} check-ins over ${Math.ceil((now - entries[0].ts) / 86400000)} days</p>
      </div>

      <!-- Current State -->
      <div class="fc-card fc-state-card">
        <div class="fc-state-ring" style="--ring-color:${stateColor(currentAvg)}">
          <div class="fc-state-num">${currentAvg.toFixed(1)}</div>
        </div>
        <div class="fc-state-info">
          <div class="fc-state-label">${stateLabel(currentAvg)}</div>
          <div class="fc-state-trend">
            ${trendArrow(velocity)} ${trendLabel(velocity)}
            ${prevAvg !== null ? `<span class="fc-vs">(was ${prevAvg.toFixed(1)} yesterday)</span>` : ''}
          </div>
        </div>
      </div>

      <!-- Spiral Risk -->
      <div class="fc-card">
        <div class="fc-card-header"><span>⚠️</span> Spiral Risk</div>
        <div class="fc-risk-bar">
          <div class="fc-risk-fill" style="width:${spiralRisk.score}%;background:${riskColor(spiralRisk.score)}"></div>
        </div>
        <div class="fc-risk-label" style="color:${riskColor(spiralRisk.score)}">${spiralRisk.label}</div>
        ${spiralRisk.reasons.length ? `
          <div class="fc-risk-reasons">
            ${spiralRisk.reasons.map(r => `<div class="fc-risk-reason">· ${r}</div>`).join('')}
          </div>
        ` : ''}
      </div>

      <!-- Alerts -->
      ${alerts.length ? `
        <div class="fc-card fc-alerts-card">
          <div class="fc-card-header"><span>🚨</span> Active Alerts</div>
          ${alerts.map(a => `
            <div class="fc-alert fc-alert-${a.level}">
              <span class="fc-alert-icon">${a.level === 'warning' ? '🟡' : '🔴'}</span>
              <div>
                <div class="fc-alert-title">${a.title}</div>
                <div class="fc-alert-desc">${a.desc}</div>
              </div>
            </div>
          `).join('')}
        </div>
      ` : `
        <div class="fc-card">
          <div class="fc-card-header"><span>✅</span> No Active Alerts</div>
          <p class="fc-muted">No concerning patterns detected right now</p>
        </div>
      `}

      <!-- Suggestions -->
      ${suggestions.length ? `
        <div class="fc-card">
          <div class="fc-card-header"><span>💡</span> What Might Help</div>
          <div class="fc-suggestions">
            ${suggestions.map(s => `
              <div class="fc-suggestion">
                <span class="fc-sug-emoji">${s.emoji}</span>
                <div>
                  <div class="fc-sug-title">${s.title}</div>
                  <div class="fc-sug-desc">${s.desc}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Your Patterns -->
      <div class="fc-card">
        <div class="fc-card-header"><span>📊</span> Your Patterns</div>
        <div class="fc-patterns">
          ${patterns.map(p => `
            <div class="fc-pattern">
              <span class="fc-pattern-emoji">${p.emoji}</span>
              <span>${p.text}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Score Breakdown -->
      <div class="fc-card">
        <div class="fc-card-header"><span>📈</span> Current Dimensions</div>
        <div class="fc-dims">
          ${['body','energy','mood','mind'].map(dim => {
            const vals = recent.length ? recent.map(e => getScore(e, dim)).filter(v => v > 0) : [getScore(entries[entries.length-1], dim)];
            const v = vals.length ? avg(vals) : 0;
            const icon = {body:'🫀',energy:'⚡',mood:'💜',mind:'🧠'}[dim];
            return `
              <div class="fc-dim">
                <span class="fc-dim-icon">${icon}</span>
                <div class="fc-dim-bar-wrap">
                  <div class="fc-dim-bar" style="width:${v*10}%;background:${stateColor(v)}"></div>
                </div>
                <span class="fc-dim-val">${v.toFixed(1)}</span>
              </div>`;
          }).join('')}
        </div>
      </div>
    </div>
  `;
}

/* ── Helpers ── */
function getScore(e, dim) {
  if (e.scores) return e.scores[dim] || 0;
  return e[dim] || 0;
}
function avgScore(e) {
  const s = e.scores || e;
  const vals = [s.body, s.energy, s.mood, s.mind].filter(v => v && v > 0);
  return vals.length ? vals.reduce((a,b) => a+b, 0) / vals.length : 5;
}
function avg(arr) { return arr.length ? arr.reduce((a,b) => a+b, 0) / arr.length : 0; }

function getTrend(entries) {
  if (entries.length < 4) return 0;
  const last8 = entries.slice(-8).map(avgScore);
  const first = avg(last8.slice(0, Math.floor(last8.length/2)));
  const second = avg(last8.slice(Math.floor(last8.length/2)));
  return second - first;
}

function getVelocity(recent) {
  if (recent.length < 2) return 0;
  const scores = recent.map(avgScore);
  const first = avg(scores.slice(0, Math.floor(scores.length/2)));
  const second = avg(scores.slice(Math.floor(scores.length/2)));
  return second - first;
}

function stateColor(v) {
  if (v >= 6) return '#34d399';
  if (v >= 4.5) return '#fbbf24';
  if (v >= 3) return '#fb923c';
  return '#f87171';
}
function stateLabel(v) {
  if (v >= 7) return 'Doing well 💚';
  if (v >= 5.5) return 'Okay';
  if (v >= 4) return 'Struggling';
  if (v >= 3) return 'Rough patch';
  return 'In distress';
}
function trendArrow(v) {
  if (v > 0.5) return '<span class="fc-arrow up">↗</span>';
  if (v < -0.5) return '<span class="fc-arrow down">↘</span>';
  return '<span class="fc-arrow flat">→</span>';
}
function trendLabel(v) {
  if (v > 1) return 'Rising noticeably';
  if (v > 0.5) return 'Trending up';
  if (v < -1) return 'Dropping fast';
  if (v < -0.5) return 'Trending down';
  return 'Holding steady';
}
function riskColor(score) {
  if (score >= 70) return '#f87171';
  if (score >= 40) return '#fb923c';
  if (score >= 20) return '#fbbf24';
  return '#34d399';
}

/* ── Spiral Risk Calculator ── */
function calculateSpiralRisk(entries, recent) {
  let score = 0;
  const reasons = [];
  const r = recent.length ? recent : entries.slice(-3);
  const scores = r.map(avgScore);
  const currentAvg = avg(scores);
  const moodScores = r.map(e => getScore(e, 'mood')).filter(v => v > 0);
  const bodyScores = r.map(e => getScore(e, 'body')).filter(v => v > 0);

  // Low current scores
  if (currentAvg < 3) { score += 30; reasons.push('Overall scores are very low'); }
  else if (currentAvg < 4) { score += 15; reasons.push('Scores are below average'); }

  // Consecutive drops
  if (scores.length >= 3) {
    const dropping = scores.slice(-3).every((s, i, a) => i === 0 || s <= a[i-1]);
    if (dropping && scores[scores.length-1] < 4) {
      score += 20; reasons.push('Scores dropping for 3+ entries in a row');
    }
  }

  // Body below 3 (physical distress predicts spiral)
  if (bodyScores.length && avg(bodyScores) < 3) {
    score += 15; reasons.push('Body scores are very low — physical distress');
  }

  // Mood below 3
  if (moodScores.length && avg(moodScores) < 3) {
    score += 15; reasons.push('Mood scores critically low');
  }

  // Keyword scanning in recent notes
  const recentNotes = r.map(e => {
    if (!e.notes) return '';
    return Object.values(e.notes).join(' ').toLowerCase();
  }).join(' ');

  const dangerWords = ['powerless', 'hopeless', 'scared', 'doom', 'catastroph', 'spiralling', 'can\'t sleep', 'no sleep'];
  const found = dangerWords.filter(w => recentNotes.includes(w));
  if (found.length >= 3) { score += 20; reasons.push('Multiple distress words in recent notes'); }
  else if (found.length >= 1) { score += 10; reasons.push('Some distress signals in notes'); }

  // Night entries (logging between midnight and 5am = sleep disruption)
  const nightEntries = r.filter(e => {
    const h = new Date(e.ts).getHours();
    return h >= 0 && h < 5;
  });
  if (nightEntries.length >= 2) { score += 10; reasons.push('Multiple middle-of-night entries (sleep disruption)'); }

  score = Math.min(100, score);

  let label;
  if (score >= 70) label = 'High — please take care of yourself 💛';
  else if (score >= 40) label = 'Moderate — watch for escalation';
  else if (score >= 20) label = 'Mild — some signals present';
  else label = 'Low — looking stable right now';

  return { score, label, reasons };
}

/* ── Alert Detection ── */
function detectAlerts(entries, recent) {
  const alerts = [];
  const r = recent.length >= 2 ? recent : entries.slice(-3);
  const scores = r.map(avgScore);
  const bodyScores = r.map(e => getScore(e, 'body')).filter(v => v > 0);
  const moodScores = r.map(e => getScore(e, 'mood')).filter(v => v > 0);

  // Consecutive body drops below 3
  if (bodyScores.length >= 2 && bodyScores.slice(-2).every(s => s < 3)) {
    alerts.push({
      level: 'danger',
      title: 'Body in distress',
      desc: 'Body scores below 3 for multiple entries. Last time this happened, mood followed within hours.'
    });
  }

  // Rapid mood drop
  if (moodScores.length >= 2) {
    const drop = moodScores[moodScores.length - 2] - moodScores[moodScores.length - 1];
    if (drop >= 2) {
      alerts.push({
        level: 'warning',
        title: 'Mood dropped sharply',
        desc: `Mood fell ${drop.toFixed(1)} points since your last entry.`
      });
    }
  }

  // High energy + low mood = anger/fight phase
  const lastEntry = r[r.length - 1];
  if (lastEntry) {
    const energy = getScore(lastEntry, 'energy');
    const mood = getScore(lastEntry, 'mood');
    if (energy > 5 && mood < 3) {
      alerts.push({
        level: 'warning',
        title: 'Fight mode detected',
        desc: 'High energy + low mood often means anger/anxiety. This energy can crash into exhaustion.'
      });
    }
  }

  // Sleep disruption (entries between midnight-5am)
  const now = Date.now();
  const last12h = entries.filter(e => now - e.ts < 12 * 3600000);
  const nightLogs = last12h.filter(e => {
    const h = new Date(e.ts).getHours();
    return h >= 0 && h < 5;
  });
  if (nightLogs.length >= 2) {
    alerts.push({
      level: 'danger',
      title: 'Sleep disruption',
      desc: 'Multiple entries during the night. Sleep loss is your strongest spiral trigger.'
    });
  }

  // Sustained low (3+ entries below 3.5)
  if (scores.length >= 3 && scores.slice(-3).every(s => s < 3.5)) {
    alerts.push({
      level: 'danger',
      title: 'Sustained low',
      desc: 'Your last 3 entries average below 3.5. This is when spirals tend to deepen without intervention.'
    });
  }

  return alerts;
}

/* ── Suggestions ── */
function getSuggestions(entries, alerts) {
  const suggestions = [];
  const timeEntries = JSON.parse(localStorage.getItem('innerscape_time_entries') || '[]');
  const activities = JSON.parse(localStorage.getItem('innerscape_activities') || '[]');
  const hasAlerts = alerts.length > 0;
  const currentAvg = avg(entries.slice(-3).map(avgScore));

  // Find which activities correlate with mood improvements
  const activityBoosts = findActivityBoosts(entries, timeEntries, activities);

  if (currentAvg < 4 || hasAlerts) {
    // Art is almost always helpful based on the data
    if (activityBoosts.find(a => a.name.toLowerCase().includes('art') || a.name.toLowerCase().includes('drawing'))) {
      suggestions.push({
        emoji: '🎨',
        title: 'Make some art',
        desc: 'Drawing and art-making consistently lifts your scores. Even 20 minutes helps.'
      });
    }

    suggestions.push({
      emoji: '🧘‍♀️',
      title: 'Meditation or guided visualization',
      desc: 'Teal\'s meditations often help reset your nervous system when you\'re activated.'
    });

    if (currentAvg < 3) {
      suggestions.push({
        emoji: '📞',
        title: 'Reach out to someone safe',
        desc: 'Connection helps. Your partner, a friend, or even that conversation on Teal\'s platform.'
      });
    }

    suggestions.push({
      emoji: '🧹',
      title: 'Meditative cleaning',
      desc: 'Light physical activity with structure. Works when you can\'t sit still.'
    });
  }

  if (currentAvg >= 4 && currentAvg < 6) {
    suggestions.push({
      emoji: '🎹',
      title: 'Play some piano',
      desc: 'Music engages your mind in a different way. Good for maintaining stability.'
    });
  }

  // Add top activity boost if not already suggested
  if (activityBoosts.length && !suggestions.find(s => s.title.toLowerCase().includes(activityBoosts[0].name.toLowerCase()))) {
    const top = activityBoosts[0];
    suggestions.push({
      emoji: top.emoji || '⭐',
      title: top.name,
      desc: `This activity is associated with +${top.boost.toFixed(1)} average mood improvement for you.`
    });
  }

  return suggestions.slice(0, 4);
}

/* ── Activity Boost Analysis ── */
function findActivityBoosts(entries, timeEntries, activities) {
  if (!timeEntries.length || !activities.length) return [];

  const boosts = [];

  activities.forEach(act => {
    // Find time entries for this activity
    const actTimes = timeEntries.filter(t => t.activityId === act.id && t.endTime && t.endTime > t.startTime);
    if (actTimes.length < 2) return;

    // For each activity session, find mood before and after
    let totalBoost = 0;
    let count = 0;

    actTimes.forEach(t => {
      const before = entries.filter(e => e.ts < t.startTime && t.startTime - e.ts < 4 * 3600000);
      const after = entries.filter(e => e.ts > t.endTime && e.ts - t.endTime < 4 * 3600000);

      if (before.length && after.length) {
        const bScore = avgScore(before[before.length - 1]);
        const aScore = avgScore(after[0]);
        totalBoost += aScore - bScore;
        count++;
      }
    });

    if (count >= 2) {
      boosts.push({
        name: act.name,
        emoji: act.emoji,
        boost: totalBoost / count,
        sessions: count
      });
    }
  });

  return boosts.filter(b => b.boost > 0).sort((a, b) => b.boost - a.boost);
}

/* ── Pattern Discovery ── */
function findPatterns(entries) {
  const patterns = [];
  const now = Date.now();

  // Average by time of day
  const morning = entries.filter(e => { const h = new Date(e.ts).getHours(); return h >= 6 && h < 12; });
  const afternoon = entries.filter(e => { const h = new Date(e.ts).getHours(); return h >= 12 && h < 18; });
  const evening = entries.filter(e => { const h = new Date(e.ts).getHours(); return h >= 18 && h < 24; });
  const night = entries.filter(e => { const h = new Date(e.ts).getHours(); return h >= 0 && h < 6; });

  const timeAvgs = [
    { label: 'Morning', avg: morning.length ? avg(morning.map(avgScore)) : 0, count: morning.length },
    { label: 'Afternoon', avg: afternoon.length ? avg(afternoon.map(avgScore)) : 0, count: afternoon.length },
    { label: 'Evening', avg: evening.length ? avg(evening.map(avgScore)) : 0, count: evening.length },
    { label: 'Night', avg: night.length ? avg(night.map(avgScore)) : 0, count: night.length },
  ].filter(t => t.count >= 3);

  if (timeAvgs.length >= 2) {
    const best = timeAvgs.reduce((a, b) => a.avg > b.avg ? a : b);
    const worst = timeAvgs.reduce((a, b) => a.avg < b.avg ? a : b);
    if (best.avg - worst.avg > 0.5) {
      patterns.push({ emoji: '🕐', text: `You tend to feel best in the ${best.label.toLowerCase()} (${best.avg.toFixed(1)}) and worst at ${worst.label.toLowerCase()} (${worst.avg.toFixed(1)})` });
    }
  }

  // Overall average
  const overallAvg = avg(entries.map(avgScore));
  patterns.push({ emoji: '📊', text: `Your overall average is ${overallAvg.toFixed(1)}/10 across ${entries.length} check-ins` });

  // Body-mood connection
  const lowBody = entries.filter(e => getScore(e, 'body') < 3 && getScore(e, 'body') > 0);
  const highBody = entries.filter(e => getScore(e, 'body') >= 5);
  if (lowBody.length >= 5 && highBody.length >= 5) {
    const lowBodyMood = avg(lowBody.map(e => getScore(e, 'mood')));
    const highBodyMood = avg(highBody.map(e => getScore(e, 'mood')));
    if (highBodyMood - lowBodyMood > 1) {
      patterns.push({ emoji: '🫀', text: `When your body is above 5, mood averages ${highBodyMood.toFixed(1)}. Below 3, mood drops to ${lowBodyMood.toFixed(1)}. Your body drives your mood.` });
    }
  }

  // Frequency of logging
  const daySpan = (now - entries[0].ts) / 86400000;
  const perDay = entries.length / Math.max(1, daySpan);
  patterns.push({ emoji: '✍️', text: `You log about ${perDay.toFixed(1)} times per day on average` });

  // Highest and lowest
  const sorted = [...entries].sort((a, b) => avgScore(b) - avgScore(a));
  const highest = sorted[0];
  const lowest = sorted[sorted.length - 1];
  if (highest && lowest) {
    patterns.push({ emoji: '🌟', text: `Best moment: ${avgScore(highest).toFixed(1)} on ${new Date(highest.ts).toLocaleDateString()}` });
    patterns.push({ emoji: '💔', text: `Hardest moment: ${avgScore(lowest).toFixed(1)} on ${new Date(lowest.ts).toLocaleDateString()}` });
  }

  return patterns;
}
