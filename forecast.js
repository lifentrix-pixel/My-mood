/* ── 🔮 Forecast Module — v2 Mega Upgrade ── */

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
  const recent = entries.filter(e => now - e.ts < 24 * 3600000);
  const recent48 = entries.filter(e => now - e.ts < 48 * 3600000);

  // Current state
  const currentAvg = recent.length ? avg(recent.map(avgScore)) : avgScore(entries[entries.length - 1]);
  const prev24Avg = recent48.filter(e => now - e.ts >= 24 * 3600000);
  const prevAvg = prev24Avg.length ? avg(prev24Avg.map(avgScore)) : null;

  // Trend & velocity
  const velocity = getVelocity(recent.length >= 2 ? recent : entries.slice(-5));

  // Analysis
  const alerts = detectAlerts(entries, recent);
  const suggestions = getSuggestions(entries, alerts);
  const spiralRisk = calculateSpiralRisk(entries, recent);
  const patterns = findPatterns(entries);

  // New analyses
  const sleepData = fcLoadOuraData();
  const sleepCard = fcBuildSleepCard(sleepData, entries);
  const dowCard = fcBuildDayOfWeekCard(entries);
  const predictionCard = fcBuildPredictionCard(entries, sleepData, velocity);
  const foodCard = fcBuildFoodMoodCard(entries);
  const medCard = fcBuildMedicationCard(entries);
  const sparklineSvg = fcBuildSparkline(entries);
  const patternWarnings = fcBuildPatternWarnings(entries, recent);
  const checkinNudge = fcBuildCheckinNudge(entries);

  container.innerHTML = `
    <div class="fc-page">
      <div class="fc-hero">
        <div class="fc-hero-icon">🔮</div>
        <h2>Forecast</h2>
        <p class="fc-subtitle">Based on ${entries.length} check-ins over ${Math.ceil((now - entries[0].ts) / 86400000)} days</p>
      </div>

      <!-- Time Since Check-in Nudge -->
      ${checkinNudge}

      <!-- Current State + Sparkline -->
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
          ${sparklineSvg}
        </div>
      </div>

      <!-- Next-Day Prediction -->
      ${predictionCard}

      <!-- Pattern Warnings -->
      ${patternWarnings}

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

      <!-- Sleep Integration -->
      ${sleepCard}

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

      <!-- Day-of-Week Patterns -->
      ${dowCard}

      <!-- Food-Mood Correlation -->
      ${foodCard}

      <!-- Medication Correlation -->
      ${medCard}

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
      <div class="fc-card fc-collapsible">
        <div class="fc-card-header fc-toggle" onclick="this.parentElement.classList.toggle('fc-open')"><span>📊</span> Your Patterns <span class="fc-chevron">›</span></div>
        <div class="fc-collapsible-body">
          <div class="fc-patterns">
            ${patterns.map(p => `
              <div class="fc-pattern">
                <span class="fc-pattern-emoji">${p.emoji}</span>
                <span>${p.text}</span>
              </div>
            `).join('')}
          </div>
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

/* ══════════════════════════════════════════
   NEW FEATURE: Sleep Integration (Oura)
   ══════════════════════════════════════════ */

function fcLoadOuraData() {
  try {
    const raw = localStorage.getItem('innerscape_oura_data');
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data.sleep || !data.sleep.length) return null;
    return data;
  } catch { return null; }
}

function fcBuildSleepCard(oura, entries) {
  if (!oura || !oura.sleep || !oura.sleep.length) return '';

  // Find last night's sleep (most recent)
  const sorted = [...oura.sleep].sort((a, b) => (b.day || '').localeCompare(a.day || ''));
  const lastNight = sorted[0];
  if (!lastNight) return '';

  const score = lastNight.score;
  const hrv = lastNight.average_hrv || (lastNight.heart_rate && lastNight.heart_rate.rmssd) || null;
  const totalSleep = lastNight.total_sleep_duration; // seconds
  const sleepHrs = totalSleep ? `${Math.floor(totalSleep / 3600)}h ${Math.floor((totalSleep % 3600) / 60)}m` : 'N/A';

  const isPoor = score && score < 65;

  // Correlate: low sleep → next day mood
  let correlation = '';
  if (oura.sleep.length >= 5 && entries.length >= 10) {
    const sleepMoodPairs = [];
    oura.sleep.forEach(s => {
      if (!s.score || !s.day) return;
      const sleepDate = new Date(s.day);
      const nextDayStart = new Date(sleepDate); nextDayStart.setDate(nextDayStart.getDate() + 1); nextDayStart.setHours(0,0,0,0);
      const nextDayEnd = new Date(nextDayStart); nextDayEnd.setDate(nextDayEnd.getDate() + 1);
      const nextDayEntries = entries.filter(e => e.ts >= nextDayStart.getTime() && e.ts < nextDayEnd.getTime());
      if (nextDayEntries.length) {
        sleepMoodPairs.push({ sleepScore: s.score, moodAvg: avg(nextDayEntries.map(avgScore)) });
      }
    });

    if (sleepMoodPairs.length >= 3) {
      const lowSleep = sleepMoodPairs.filter(p => p.sleepScore < 65);
      const goodSleep = sleepMoodPairs.filter(p => p.sleepScore >= 75);
      if (lowSleep.length >= 2 && goodSleep.length >= 2) {
        const lowMood = avg(lowSleep.map(p => p.moodAvg));
        const goodMood = avg(goodSleep.map(p => p.moodAvg));
        const diff = goodMood - lowMood;
        if (diff > 0.5) {
          correlation = `<div class="fc-sleep-corr">💡 After good sleep (75+), your mood averages <strong>${goodMood.toFixed(1)}</strong> vs <strong>${lowMood.toFixed(1)}</strong> after poor sleep. Difference: <strong>+${diff.toFixed(1)}</strong></div>`;
        }
      }
    }
  }

  return `
    <div class="fc-card">
      <div class="fc-card-header"><span>🌙</span> Last Night's Sleep</div>
      <div class="fc-sleep-grid">
        <div class="fc-sleep-stat">
          <div class="fc-sleep-val ${isPoor ? 'fc-sleep-poor' : ''}">${score || 'N/A'}</div>
          <div class="fc-sleep-label">Score</div>
        </div>
        <div class="fc-sleep-stat">
          <div class="fc-sleep-val">${hrv ? Math.round(hrv) + 'ms' : 'N/A'}</div>
          <div class="fc-sleep-label">HRV</div>
        </div>
        <div class="fc-sleep-stat">
          <div class="fc-sleep-val">${sleepHrs}</div>
          <div class="fc-sleep-label">Total Sleep</div>
        </div>
      </div>
      ${isPoor ? '<div class="fc-sleep-warn">⚠️ Poor sleep last night — be extra gentle with yourself today. Sleep is your strongest mood predictor.</div>' : ''}
      ${correlation}
    </div>
  `;
}

/* ══════════════════════════════════════════
   NEW FEATURE: Day-of-Week Patterns
   ══════════════════════════════════════════ */

function fcBuildDayOfWeekCard(entries) {
  if (entries.length < 14) return '';

  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const dayBuckets = Array.from({length: 7}, () => []);

  entries.forEach(e => {
    const d = new Date(e.ts).getDay();
    dayBuckets[d].push(avgScore(e));
  });

  const dayAvgs = dayBuckets.map((scores, i) => ({
    day: dayNames[i],
    short: dayNames[i].slice(0, 3),
    avg: scores.length >= 2 ? avg(scores) : null,
    count: scores.length
  })).filter(d => d.avg !== null);

  if (dayAvgs.length < 3) return '';

  const best = dayAvgs.reduce((a, b) => a.avg > b.avg ? a : b);
  const worst = dayAvgs.reduce((a, b) => a.avg < b.avg ? a : b);
  const today = new Date().getDay();
  const todayData = dayAvgs.find(d => d.day === dayNames[today]);
  const todayIsHard = todayData && todayData.avg < worst.avg + 0.3;

  // Mini bar chart
  const maxAvg = Math.max(...dayAvgs.map(d => d.avg));
  const bars = dayNames.map((name, i) => {
    const d = dayAvgs.find(x => x.day === name);
    if (!d) return `<div class="fc-dow-bar-col"><div class="fc-dow-bar" style="height:4px;background:var(--border)"></div><div class="fc-dow-day">${name.slice(0,1)}</div></div>`;
    const pct = (d.avg / 10) * 100;
    const isToday = i === today;
    return `<div class="fc-dow-bar-col ${isToday ? 'fc-dow-today' : ''}">
      <div class="fc-dow-bar" style="height:${pct}%;background:${stateColor(d.avg)}"></div>
      <div class="fc-dow-day">${name.slice(0,1)}</div>
    </div>`;
  }).join('');

  return `
    <div class="fc-card fc-collapsible">
      <div class="fc-card-header fc-toggle" onclick="this.parentElement.classList.toggle('fc-open')"><span>📅</span> Day-of-Week Patterns <span class="fc-chevron">›</span></div>
      <div class="fc-collapsible-body">
        <div class="fc-dow-chart">${bars}</div>
        <div class="fc-dow-summary">
          <div>✨ Best: <strong>${best.day}</strong> (${best.avg.toFixed(1)} avg)</div>
          <div>💔 Hardest: <strong>${worst.day}</strong> (${worst.avg.toFixed(1)} avg)</div>
        </div>
        ${todayIsHard ? `<div class="fc-dow-warn">⚠️ ${dayNames[today]}s tend to be harder for you (${todayData.avg.toFixed(1)} avg). Be mindful today.</div>` : ''}
      </div>
    </div>
  `;
}

/* ══════════════════════════════════════════
   NEW FEATURE: Next-Day Prediction
   ══════════════════════════════════════════ */

function fcBuildPredictionCard(entries, oura, velocity) {
  if (entries.length < 10) return '';

  const now = Date.now();
  const recent = entries.filter(e => now - e.ts < 24 * 3600000);
  const currentAvg = recent.length ? avg(recent.map(avgScore)) : avgScore(entries[entries.length - 1]);

  // Factor 1: current trajectory
  let predicted = currentAvg + velocity * 0.5; // dampened

  // Factor 2: day-of-week pattern
  const tomorrow = (new Date().getDay() + 1) % 7;
  const tomorrowEntries = entries.filter(e => new Date(e.ts).getDay() === tomorrow);
  let dowAdjust = 0;
  if (tomorrowEntries.length >= 3) {
    const dowAvg = avg(tomorrowEntries.map(avgScore));
    const overallAvg = avg(entries.map(avgScore));
    dowAdjust = (dowAvg - overallAvg) * 0.3;
  }
  predicted += dowAdjust;

  // Factor 3: sleep quality
  let sleepAdjust = 0;
  let sleepNote = '';
  if (oura && oura.sleep && oura.sleep.length) {
    const sorted = [...oura.sleep].sort((a, b) => (b.day || '').localeCompare(a.day || ''));
    const lastScore = sorted[0]?.score;
    if (lastScore) {
      if (lastScore < 60) { sleepAdjust = -0.5; sleepNote = 'poor sleep'; }
      else if (lastScore < 70) { sleepAdjust = -0.2; sleepNote = 'below-average sleep'; }
      else if (lastScore >= 85) { sleepAdjust = 0.3; sleepNote = 'great sleep'; }
    }
  }
  predicted += sleepAdjust;

  // Factor 4: mean reversion
  const overallAvg = avg(entries.map(avgScore));
  predicted = predicted * 0.7 + overallAvg * 0.3;

  // Clamp
  predicted = Math.max(1, Math.min(10, predicted));

  // Confidence range based on data variance
  const recentScores = entries.slice(-14).map(avgScore);
  const stdDev = Math.sqrt(avg(recentScores.map(s => Math.pow(s - avg(recentScores), 2))));
  const range = Math.max(0.5, Math.min(2, stdDev));

  const low = Math.max(1, predicted - range).toFixed(1);
  const high = Math.min(10, predicted + range).toFixed(1);

  const factors = [];
  if (velocity > 0.3) factors.push('upward trend');
  else if (velocity < -0.3) factors.push('downward trend');
  else factors.push('steady trajectory');
  if (dowAdjust > 0.1) factors.push(`${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][tomorrow]}s are good for you`);
  else if (dowAdjust < -0.1) factors.push(`${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][tomorrow]}s tend to be harder`);
  if (sleepNote) factors.push(sleepNote);

  return `
    <div class="fc-card fc-prediction-card">
      <div class="fc-card-header"><span>🔮</span> Tomorrow's Forecast</div>
      <div class="fc-prediction-range">
        <div class="fc-prediction-low">${low}</div>
        <div class="fc-prediction-bar-wrap">
          <div class="fc-prediction-bar" style="left:${(parseFloat(low)-1)/9*100}%;right:${100-(parseFloat(high)-1)/9*100}%;background:${stateColor(predicted)}"></div>
          <div class="fc-prediction-dot" style="left:${(predicted-1)/9*100}%;background:${stateColor(predicted)}"></div>
        </div>
        <div class="fc-prediction-high">${high}</div>
      </div>
      <div class="fc-prediction-label">You'll likely feel around <strong>${predicted.toFixed(1)}</strong> tomorrow</div>
      <div class="fc-prediction-factors">Based on: ${factors.join(' · ')}</div>
    </div>
  `;
}

/* ══════════════════════════════════════════
   NEW FEATURE: Food-Mood Correlation
   ══════════════════════════════════════════ */

function fcBuildFoodMoodCard(entries) {
  const foodEntries = loadFoodEntries();
  if (!foodEntries.length || entries.length < 10) return '';

  const insights = [];

  // Late eating correlation (after 9pm)
  const lateEats = foodEntries.filter(f => {
    const h = new Date(f.timestamp).getHours();
    return h >= 21;
  });

  if (lateEats.length >= 3) {
    // Find mood the morning after late eating
    const lateDates = new Set(lateEats.map(f => dayKey(f.timestamp)));
    const morningAfterLate = [];
    const morningAfterNormal = [];

    entries.forEach(e => {
      const h = new Date(e.ts).getHours();
      if (h < 6 || h > 12) return;
      const prevDay = new Date(e.ts);
      prevDay.setDate(prevDay.getDate() - 1);
      const prevDk = dayKey(prevDay);
      if (lateDates.has(prevDk)) morningAfterLate.push(avgScore(e));
      else morningAfterNormal.push(avgScore(e));
    });

    if (morningAfterLate.length >= 2 && morningAfterNormal.length >= 2) {
      const diff = avg(morningAfterNormal) - avg(morningAfterLate);
      if (diff > 0.5) {
        insights.push(`🌙 After eating late (9pm+), your next-morning mood is <strong>${diff.toFixed(1)} lower</strong> on average`);
      }
    }
  }

  // Satisfaction correlation
  const highSat = foodEntries.filter(f => f.satisfaction >= 7);
  const lowSat = foodEntries.filter(f => f.satisfaction <= 4);

  if (highSat.length >= 3 && lowSat.length >= 3) {
    // Find mood within 4 hours after meal
    const moodAfterMeal = (meals) => {
      const scores = [];
      meals.forEach(f => {
        const after = entries.filter(e => e.ts > f.timestamp && e.ts - f.timestamp < 4 * 3600000);
        if (after.length) scores.push(avgScore(after[0]));
      });
      return scores;
    };

    const highMood = moodAfterMeal(highSat);
    const lowMood = moodAfterMeal(lowSat);

    if (highMood.length >= 2 && lowMood.length >= 2) {
      const diff = avg(highMood) - avg(lowMood);
      if (Math.abs(diff) > 0.3) {
        insights.push(`😋 When you rate food satisfaction high (7+), mood afterward is <strong>${diff > 0 ? '+' : ''}${diff.toFixed(1)}</strong> compared to low-satisfaction meals`);
      }
    }
  }

  // Meal skipping (days with fewer food entries)
  const foodByDay = {};
  foodEntries.forEach(f => {
    const dk = dayKey(f.timestamp);
    foodByDay[dk] = (foodByDay[dk] || 0) + 1;
  });

  const daysWithFew = Object.entries(foodByDay).filter(([,c]) => c <= 1).map(([dk]) => dk);
  const daysWithGood = Object.entries(foodByDay).filter(([,c]) => c >= 3).map(([dk]) => dk);

  if (daysWithFew.length >= 3 && daysWithGood.length >= 3) {
    const fewMood = [], goodMood = [];
    entries.forEach(e => {
      const dk = dayKey(e.ts);
      if (daysWithFew.includes(dk)) fewMood.push(avgScore(e));
      else if (daysWithGood.includes(dk)) goodMood.push(avgScore(e));
    });
    if (fewMood.length >= 3 && goodMood.length >= 3) {
      const diff = avg(goodMood) - avg(fewMood);
      if (diff > 0.3) {
        insights.push(`🍽 On days you eat 3+ meals, mood averages <strong>${diff.toFixed(1)} higher</strong> than days with 1 or fewer`);
      }
    }
  }

  if (!insights.length) return '';

  return `
    <div class="fc-card fc-collapsible">
      <div class="fc-card-header fc-toggle" onclick="this.parentElement.classList.toggle('fc-open')"><span>🍽</span> Food & Mood <span class="fc-chevron">›</span></div>
      <div class="fc-collapsible-body">
        <div class="fc-food-insights">
          ${insights.map(i => `<div class="fc-food-insight">${i}</div>`).join('')}
        </div>
      </div>
    </div>
  `;
}

/* ══════════════════════════════════════════
   NEW FEATURE: Medication Correlation
   ══════════════════════════════════════════ */

function fcBuildMedicationCard(entries) {
  const medications = loadMedications();
  const logs = loadMedicationLogs();
  if (!logs.length || entries.length < 10) return '';

  const insights = [];

  // For each medication, compare mood on days taken vs not taken
  medications.forEach(med => {
    const medLogs = logs.filter(l => l.medicationId === med.id);
    if (medLogs.length < 5) return;

    const takenDays = new Set(medLogs.map(l => dayKey(l.timestamp)));

    // Get all tracked days
    const allDays = {};
    entries.forEach(e => {
      const dk = dayKey(e.ts);
      if (!allDays[dk]) allDays[dk] = [];
      allDays[dk].push(avgScore(e));
    });

    const takenScores = [], skippedScores = [];
    Object.entries(allDays).forEach(([dk, scores]) => {
      if (takenDays.has(dk)) takenScores.push(avg(scores));
      else skippedScores.push(avg(scores));
    });

    if (takenScores.length >= 3 && skippedScores.length >= 3) {
      const diff = avg(takenScores) - avg(skippedScores);
      if (Math.abs(diff) > 0.3) {
        insights.push(`💊 <strong>${med.name}</strong>: mood averages <strong>${avg(takenScores).toFixed(1)}</strong> on days taken vs <strong>${avg(skippedScores).toFixed(1)}</strong> when skipped (${diff > 0 ? '+' : ''}${diff.toFixed(1)})`);
      }
    }
  });

  // Check for timing patterns — mood after taking meds
  if (logs.length >= 10) {
    const moodAfterMed = [];
    const moodBeforeMed = [];
    logs.forEach(l => {
      const before = entries.filter(e => e.ts < l.timestamp && l.timestamp - e.ts < 4 * 3600000);
      const after = entries.filter(e => e.ts > l.timestamp && e.ts - l.timestamp < 6 * 3600000);
      if (before.length) moodBeforeMed.push(avgScore(before[before.length - 1]));
      if (after.length) moodAfterMed.push(avgScore(after[0]));
    });

    if (moodBeforeMed.length >= 5 && moodAfterMed.length >= 5) {
      const diff = avg(moodAfterMed) - avg(moodBeforeMed);
      if (Math.abs(diff) > 0.3) {
        insights.push(`⏰ Mood tends to be <strong>${diff > 0 ? 'higher' : 'lower'}</strong> in the hours after taking medication (${diff > 0 ? '+' : ''}${diff.toFixed(1)})`);
      }
    }
  }

  if (!insights.length) return '';

  return `
    <div class="fc-card fc-collapsible">
      <div class="fc-card-header fc-toggle" onclick="this.parentElement.classList.toggle('fc-open')"><span>💊</span> Medication Insights <span class="fc-chevron">›</span></div>
      <div class="fc-collapsible-body">
        <div class="fc-med-insights">
          ${insights.map(i => `<div class="fc-med-insight">${i}</div>`).join('')}
        </div>
      </div>
    </div>
  `;
}

/* ══════════════════════════════════════════
   NEW FEATURE: Mini Sparkline
   ══════════════════════════════════════════ */

function fcBuildSparkline(entries) {
  // Get daily averages for last 14 days
  const now = Date.now();
  const dayMap = {};
  entries.filter(e => now - e.ts < 14 * 86400000).forEach(e => {
    const dk = dayKey(e.ts);
    if (!dayMap[dk]) dayMap[dk] = [];
    dayMap[dk].push(avgScore(e));
  });

  const sortedDays = Object.keys(dayMap).sort();
  if (sortedDays.length < 3) return '';

  const points = sortedDays.map(dk => avg(dayMap[dk]));
  const width = 120, height = 32, pad = 2;
  const xStep = (width - pad * 2) / (points.length - 1);
  const minV = Math.min(...points), maxV = Math.max(...points);
  const range = maxV - minV || 1;

  const pathPts = points.map((v, i) => {
    const x = pad + i * xStep;
    const y = pad + (1 - (v - minV) / range) * (height - pad * 2);
    return `${x},${y}`;
  });

  const lastVal = points[points.length - 1];
  const lineColor = stateColor(lastVal);

  return `
    <div class="fc-sparkline-wrap">
      <svg class="fc-sparkline" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
        <polyline points="${pathPts.join(' ')}" fill="none" stroke="${lineColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="${pathPts[pathPts.length-1].split(',')[0]}" cy="${pathPts[pathPts.length-1].split(',')[1]}" r="3" fill="${lineColor}"/>
      </svg>
      <div class="fc-sparkline-label">${sortedDays.length}d trend</div>
    </div>
  `;
}

/* ══════════════════════════════════════════
   NEW FEATURE: Recurring Pattern Warnings
   ══════════════════════════════════════════ */

function fcBuildPatternWarnings(entries, recent) {
  if (entries.length < 20) return '';
  const warnings = [];
  const r = recent.length >= 2 ? recent : entries.slice(-3);

  // Pattern: body below 3 for 2+ entries → mood crash within 48h
  const recentBody = r.map(e => getScore(e, 'body')).filter(v => v > 0);
  if (recentBody.length >= 2 && recentBody.slice(-2).every(s => s < 3)) {
    // Check history: when body was <3 for 2+ entries, what happened to mood?
    let crashes = 0, total = 0;
    for (let i = 2; i < entries.length - 2; i++) {
      const b1 = getScore(entries[i-1], 'body'), b2 = getScore(entries[i], 'body');
      if (b1 > 0 && b2 > 0 && b1 < 3 && b2 < 3) {
        total++;
        // Check next 48h mood
        const futureEntries = entries.filter(e => e.ts > entries[i].ts && e.ts - entries[i].ts < 48 * 3600000);
        const futureMood = futureEntries.map(e => getScore(e, 'mood')).filter(v => v > 0);
        if (futureMood.length && avg(futureMood) < 3.5) crashes++;
      }
    }
    if (total >= 2 && crashes / total > 0.4) {
      warnings.push({
        icon: '🫀',
        title: 'Body distress pattern detected',
        desc: `Your body has been below 3 for multiple entries. Historically, ${Math.round(crashes/total*100)}% of the time this led to a mood crash within 48 hours.`,
        severity: 'danger'
      });
    }
  }

  // Pattern: consecutive drops (3+ entries each lower than last)
  if (r.length >= 3) {
    const scores = r.slice(-3).map(avgScore);
    if (scores[0] > scores[1] && scores[1] > scores[2] && scores[2] < 4.5) {
      // Check historical pattern
      let escalated = 0, totalPatterns = 0;
      for (let i = 2; i < entries.length - 3; i++) {
        const s0 = avgScore(entries[i-2]), s1 = avgScore(entries[i-1]), s2 = avgScore(entries[i]);
        if (s0 > s1 && s1 > s2 && s2 < 4.5) {
          totalPatterns++;
          const next3 = entries.slice(i+1, i+4).map(avgScore);
          if (next3.length && avg(next3) < s2 - 0.5) escalated++;
        }
      }
      if (totalPatterns >= 2 && escalated / totalPatterns > 0.4) {
        warnings.push({
          icon: '📉',
          title: 'Downward spiral pattern',
          desc: `Three consecutive drops while below 4.5. In your history, this continued dropping ${Math.round(escalated/totalPatterns*100)}% of the time. Consider intervening now.`,
          severity: 'warning'
        });
      }
    }
  }

  // Pattern: low mind score → everything else drops
  const recentMind = r.map(e => getScore(e, 'mind')).filter(v => v > 0);
  if (recentMind.length >= 2 && avg(recentMind) < 3) {
    warnings.push({
      icon: '🧠',
      title: 'Mental fog detected',
      desc: 'Low mind clarity scores often precede broader drops. Grounding exercises, fresh air, or a simple task might help.',
      severity: 'warning'
    });
  }

  if (!warnings.length) return '';

  return `
    <div class="fc-card fc-pattern-warnings">
      <div class="fc-card-header"><span>🔁</span> Pattern Warnings</div>
      ${warnings.map(w => `
        <div class="fc-pattern-warn fc-pattern-warn-${w.severity}">
          <span class="fc-pattern-warn-icon">${w.icon}</span>
          <div>
            <div class="fc-pattern-warn-title">${w.title}</div>
            <div class="fc-pattern-warn-desc">${w.desc}</div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

/* ══════════════════════════════════════════
   NEW FEATURE: Time Since Last Check-in
   ══════════════════════════════════════════ */

function fcBuildCheckinNudge(entries) {
  if (!entries.length) return '';

  const now = Date.now();
  const last = entries[entries.length - 1];
  const hoursSince = (now - last.ts) / 3600000;
  const currentHour = new Date().getHours();
  const isWakingHours = currentHour >= 7 && currentHour <= 23;

  if (hoursSince < 4) return '';

  const timeAgo = hoursSince < 1 ? `${Math.round(hoursSince * 60)} minutes`
    : hoursSince < 24 ? `${Math.round(hoursSince)} hours`
    : `${Math.round(hoursSince / 24)} days`;

  if (hoursSince > 24) {
    return `
      <div class="fc-card fc-nudge fc-nudge-strong">
        <div class="fc-nudge-icon">⏰</div>
        <div>
          <div class="fc-nudge-title">It's been ${timeAgo} since your last check-in</div>
          <div class="fc-nudge-desc">Your forecast works best with regular data. Even a quick check-in helps. 💜</div>
        </div>
      </div>
    `;
  }

  if (hoursSince > 8 && isWakingHours) {
    return `
      <div class="fc-card fc-nudge fc-nudge-gentle">
        <div class="fc-nudge-icon">✦</div>
        <div>
          <div class="fc-nudge-title">Last check-in was ${timeAgo} ago</div>
          <div class="fc-nudge-desc">A quick check-in would improve your forecast accuracy ✨</div>
        </div>
      </div>
    `;
  }

  return '';
}

/* ── Original Helpers (unchanged) ── */
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

  if (currentAvg < 3) { score += 30; reasons.push('Overall scores are very low'); }
  else if (currentAvg < 4) { score += 15; reasons.push('Scores are below average'); }

  if (scores.length >= 3) {
    const dropping = scores.slice(-3).every((s, i, a) => i === 0 || s <= a[i-1]);
    if (dropping && scores[scores.length-1] < 4) {
      score += 20; reasons.push('Scores dropping for 3+ entries in a row');
    }
  }

  if (bodyScores.length && avg(bodyScores) < 3) {
    score += 15; reasons.push('Body scores are very low — physical distress');
  }

  if (moodScores.length && avg(moodScores) < 3) {
    score += 15; reasons.push('Mood scores critically low');
  }

  const recentNotes = r.map(e => {
    if (!e.notes) return '';
    return Object.values(e.notes).join(' ').toLowerCase();
  }).join(' ');

  const dangerWords = ['powerless', 'hopeless', 'scared', 'doom', 'catastroph', 'spiralling', 'can\'t sleep', 'no sleep'];
  const found = dangerWords.filter(w => recentNotes.includes(w));
  if (found.length >= 3) { score += 20; reasons.push('Multiple distress words in recent notes'); }
  else if (found.length >= 1) { score += 10; reasons.push('Some distress signals in notes'); }

  const now = Date.now();
  const nightEntries = r.filter(e => {
    const h = new Date(e.ts).getHours();
    return h >= 0 && h < 5;
  });
  if (nightEntries.length >= 2) { score += 10; reasons.push('Multiple middle-of-night entries (sleep disruption)'); }

  // Oura sleep bonus
  const oura = fcLoadOuraData();
  if (oura && oura.sleep && oura.sleep.length) {
    const sorted = [...oura.sleep].sort((a, b) => (b.day || '').localeCompare(a.day || ''));
    const lastScore = sorted[0]?.score;
    if (lastScore && lastScore < 55) { score += 10; reasons.push('Very poor sleep last night (Oura)'); }
  }

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

  if (bodyScores.length >= 2 && bodyScores.slice(-2).every(s => s < 3)) {
    alerts.push({
      level: 'danger',
      title: 'Body in distress',
      desc: 'Body scores below 3 for multiple entries. Last time this happened, mood followed within hours.'
    });
  }

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

  const activityBoosts = findActivityBoosts(entries, timeEntries, activities);

  if (currentAvg < 4 || hasAlerts) {
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
    const actTimes = timeEntries.filter(t => t.activityId === act.id && t.endTime && t.endTime > t.startTime);
    if (actTimes.length < 2) return;

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

  const overallAvg = avg(entries.map(avgScore));
  patterns.push({ emoji: '📊', text: `Your overall average is ${overallAvg.toFixed(1)}/10 across ${entries.length} check-ins` });

  const lowBody = entries.filter(e => getScore(e, 'body') < 3 && getScore(e, 'body') > 0);
  const highBody = entries.filter(e => getScore(e, 'body') >= 5);
  if (lowBody.length >= 5 && highBody.length >= 5) {
    const lowBodyMood = avg(lowBody.map(e => getScore(e, 'mood')));
    const highBodyMood = avg(highBody.map(e => getScore(e, 'mood')));
    if (highBodyMood - lowBodyMood > 1) {
      patterns.push({ emoji: '🫀', text: `When your body is above 5, mood averages ${highBodyMood.toFixed(1)}. Below 3, mood drops to ${lowBodyMood.toFixed(1)}. Your body drives your mood.` });
    }
  }

  const daySpan = (now - entries[0].ts) / 86400000;
  const perDay = entries.length / Math.max(1, daySpan);
  patterns.push({ emoji: '✍️', text: `You log about ${perDay.toFixed(1)} times per day on average` });

  const sorted = [...entries].sort((a, b) => avgScore(b) - avgScore(a));
  const highest = sorted[0];
  const lowest = sorted[sorted.length - 1];
  if (highest && lowest) {
    patterns.push({ emoji: '🌟', text: `Best moment: ${avgScore(highest).toFixed(1)} on ${new Date(highest.ts).toLocaleDateString()}` });
    patterns.push({ emoji: '💔', text: `Hardest moment: ${avgScore(lowest).toFixed(1)} on ${new Date(lowest.ts).toLocaleDateString()}` });
  }

  return patterns;
}
