/* ── 🔮 Forecast v4 — Personal Insights Engine ── */

function showForecastPage() {
  const entries = loadEntries().sort((a, b) => a.ts - b.ts);
  const container = document.getElementById('forecast-content');

  if (entries.length < 3) {
    container.innerHTML = `
      <div class="fc-page">
        <div class="fc-hero"><div class="fc-hero-icon">🔮</div><h2>Forecast</h2>
        <p class="fc-subtitle">Need at least 3 check-ins to start building insights</p></div>
      </div>`;
    return;
  }

  const now = Date.now();
  const timeEntries = loadTimeEntries();
  const activities = loadActivities();
  const foodEntries = loadFoodEntries();
  const medications = loadMedications();
  const medLogs = loadMedicationLogs();
  const meditationEntries = typeof loadMeditations === 'function' ? loadMeditations() : [];
  const dreams = typeof loadDreams === 'function' ? loadDreams() : [];
  const quickNotes = fcLoadArray('innerscape_quick_notes');
  const stoolEntries = fcLoadArray('innerscape_stool_entries');
  const mediaSessions = fcLoadArray('innerscape_media_sessions');
  const oura = fcLoadOuraData();

  // Core calculations
  const recent24 = entries.filter(e => now - e.ts < 24 * 3600000);
  const recent48 = entries.filter(e => now - e.ts < 48 * 3600000);
  const currentAvg = recent24.length ? fcAvg(recent24.map(fcAvgScore)) : fcAvgScore(entries[entries.length - 1]);
  const prev24 = recent48.filter(e => now - e.ts >= 24 * 3600000);
  const prevAvg = prev24.length ? fcAvg(prev24.map(fcAvgScore)) : null;
  const velocity = fcGetVelocity(recent24.length >= 2 ? recent24 : entries.slice(-5));

  // Build all sections
  const html = [];
  html.push('<div class="fc-page">');

  // 1. Hero
  html.push(fcBuildHero(entries, currentAvg, prevAvg, velocity, now));

  // 2. Check-in nudge (if needed)
  html.push(fcBuildCheckinNudge(entries, now));

  // 3. Today's dynamic brief
  html.push(fcBuildTodayBrief(entries, timeEntries, activities, foodEntries, medLogs, medications, oura, dreams, quickNotes, now, velocity));

  // 4. What the forecast can currently see
  html.push(fcBuildDataPulse(entries, timeEntries, foodEntries, medLogs, oura, dreams, quickNotes, meditationEntries, stoolEntries, mediaSessions, now));

  // 5. Momentum streaks
  html.push(fcBuildMomentum(entries, now));

  // 6. Active Insights — the most important personalized statements
  html.push(fcBuildActiveInsights(entries, timeEntries, activities, foodEntries, medLogs, medications, oura, now));

  // 7. Tomorrow's Prediction
  html.push(fcBuildPrediction(entries, timeEntries, activities, oura, velocity, now));

  // 8. What Works For You
  html.push(fcBuildWhatWorks(entries, timeEntries, activities, foodEntries, medLogs, medications, now));

  // 9. Spiral Risk
  html.push(fcBuildSpiralRisk(entries, recent24, oura));

  // 10. Sleep Integration
  html.push(fcBuildSleepCard(oura, entries));

  // 11. Recovery Insights (after sleep, only when low)
  html.push(fcBuildRecoveryInsights(entries, timeEntries, activities, foodEntries, now));

  // 12. Your Trajectory (weekly trends)
  html.push(fcBuildTrajectory(entries, now));

  // 13. Current Dimensions
  html.push(fcBuildDimensions(entries, recent24));

  // 14. Pattern Warnings (now proactive)
  html.push(fcBuildPatternWarnings(entries, recent24, timeEntries, activities, now));

  // 15. Alerts
  html.push(fcBuildAlerts(entries, recent24));

  // 16. Time-of-Day Patterns
  html.push(fcBuildTimeOfDay(entries));

  // 17. Day-of-Week Patterns
  html.push(fcBuildDayOfWeek(entries));

  // 18. Your Patterns (collapsible — historical)
  html.push(fcBuildPatterns(entries, now));

  html.push('</div>');
  container.innerHTML = html.join('');
}


/* ═══════════════════════════════════
   HERO — Your Story Right Now
   ═══════════════════════════════════ */

function fcBuildHero(entries, currentAvg, prevAvg, velocity, now) {
  const sparkline = fcBuildSparkline(entries, now);
  const daySpan = Math.ceil((now - entries[0].ts) / 86400000);

  // Weekly comparison
  const thisWeek = entries.filter(e => now - e.ts < 7 * 86400000);
  const lastWeek = entries.filter(e => now - e.ts >= 7 * 86400000 && now - e.ts < 14 * 86400000);
  const thisWeekAvg = thisWeek.length ? fcAvg(thisWeek.map(fcAvgScore)) : null;
  const lastWeekAvg = lastWeek.length ? fcAvg(lastWeek.map(fcAvgScore)) : null;
  let weekComparison = '';
  if (thisWeekAvg !== null && lastWeekAvg !== null) {
    const diff = thisWeekAvg - lastWeekAvg;
    const arrow = diff > 0.3 ? '↗' : diff < -0.3 ? '↘' : '→';
    const color = diff > 0.3 ? '#34d399' : diff < -0.3 ? '#f87171' : '#fbbf24';
    weekComparison = `<div class="fc-week-compare">This week <strong>${thisWeekAvg.toFixed(1)}</strong> <span style="color:${color}">${arrow}</span> last week <strong>${lastWeekAvg.toFixed(1)}</strong></div>`;
  }

  // Tracking streak
  const streak = fcGetTrackingStreak(entries, now);
  const streakText = streak > 1 ? `<div class="fc-streak">🔥 ${streak}-day tracking streak</div>` : '';

  return `
    <div class="fc-hero">
      <div class="fc-hero-icon">🔮</div>
      <h2>Forecast</h2>
      <p class="fc-subtitle">${entries.length} check-ins over ${daySpan} days</p>
      ${streakText}
    </div>

    <div class="fc-card fc-state-card">
      <div class="fc-state-ring" style="--ring-color:${fcStateColor(currentAvg)}">
        <div class="fc-state-num">${currentAvg.toFixed(1)}</div>
      </div>
      <div class="fc-state-info">
        <div class="fc-state-label">${fcStateLabel(currentAvg)}</div>
        <div class="fc-state-trend">
          ${fcTrendArrow(velocity)} ${fcTrendLabel(velocity)}
          ${prevAvg !== null ? `<span class="fc-vs">(was ${prevAvg.toFixed(1)} yesterday)</span>` : ''}
        </div>
        ${sparkline}
        ${weekComparison}
      </div>
    </div>
  `;
}


/* ═══════════════════════════════════
   MOMENTUM / STREAK DETECTION
   ═══════════════════════════════════ */

function fcBuildMomentum(entries, now) {
  if (entries.length < 5) return '';

  const streaks = [];
  const dims = ['body', 'energy', 'mood', 'mind'];
  const dimNames = { body: 'Body', energy: 'Energy', mood: 'Mood', mind: 'Mind' };
  const dimIcons = { body: '🫀', energy: '⚡', mood: '💜', mind: '🧠' };

  // Build daily averages per dimension
  const dayMap = {};
  entries.forEach(e => {
    const dk = dayKey(e.ts);
    if (!dayMap[dk]) dayMap[dk] = {};
    dims.forEach(d => {
      const v = fcGetScore(e, d);
      if (v > 0) {
        if (!dayMap[dk][d]) dayMap[dk][d] = [];
        dayMap[dk][d].push(v);
      }
    });
  });

  const sortedDays = Object.keys(dayMap).sort().slice(-14); // last 14 days
  if (sortedDays.length < 3) return '';

  dims.forEach(dim => {
    const dailyAvgs = sortedDays.map(dk => {
      const vals = dayMap[dk] && dayMap[dk][dim];
      return vals && vals.length ? fcAvg(vals) : null;
    }).filter(v => v !== null);

    if (dailyAvgs.length < 3) return;

    // Climbing streak
    let climbing = 1;
    for (let i = dailyAvgs.length - 1; i > 0; i--) {
      if (dailyAvgs[i] > dailyAvgs[i - 1]) climbing++;
      else break;
    }
    if (climbing >= 3) {
      streaks.push({ icon: dimIcons[dim], text: `${dimNames[dim]} climbing ${climbing} days in a row`, type: 'positive' });
    }

    // Dropping streak
    let dropping = 1;
    for (let i = dailyAvgs.length - 1; i > 0; i--) {
      if (dailyAvgs[i] < dailyAvgs[i - 1]) dropping++;
      else break;
    }
    if (dropping >= 3) {
      streaks.push({ icon: dimIcons[dim], text: `${dimNames[dim]} dropping ${dropping} entries in a row`, type: 'negative' });
    }

    // Above threshold streak
    const last = dailyAvgs[dailyAvgs.length - 1];
    if (last >= 4.5) {
      let aboveCount = 0;
      for (let i = dailyAvgs.length - 1; i >= 0; i--) {
        if (dailyAvgs[i] >= 4.5) aboveCount++;
        else break;
      }
      if (aboveCount >= 5) {
        streaks.push({ icon: dimIcons[dim], text: `${dimNames[dim]} above 4.5 for ${aboveCount} days straight`, type: 'positive' });
      }
    }

    // Steady streak (low variance)
    if (dailyAvgs.length >= 5) {
      const tail = dailyAvgs.slice(-7);
      const avg = fcAvg(tail);
      const variance = fcAvg(tail.map(v => Math.abs(v - avg)));
      if (variance < 0.3 && tail.length >= 5) {
        streaks.push({ icon: dimIcons[dim], text: `${dimNames[dim]} steady for ${tail.length} days (around ${avg.toFixed(1)})`, type: 'neutral' });
      }
    }
  });

  if (!streaks.length) return '';

  // Limit to top 4
  const ordered = [...streaks.filter(s => s.type === 'negative'), ...streaks.filter(s => s.type === 'positive'), ...streaks.filter(s => s.type === 'neutral')].slice(0, 4);

  const typeEmoji = { positive: '📈', negative: '📉', neutral: '➡️' };

  return `
    <div class="fc-card">
      <div class="fc-card-header"><span>🔥</span> Momentum</div>
      <div class="fc-insights-list">
        ${ordered.map(s => `
          <div class="fc-insight fc-insight-${s.type === 'negative' ? 'warning' : 'info'}">
            <span class="fc-insight-emoji">${s.icon}</span>
            <div class="fc-insight-text">${typeEmoji[s.type]} ${s.text}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}


/* ═══════════════════════════════════
   TODAY BRIEF — Recency-aware forecast
   ═══════════════════════════════════ */

function fcBuildTodayBrief(entries, timeEntries, activities, foodEntries, medLogs, medications, oura, dreams, quickNotes, now, velocity) {
  if (entries.length < 3) return '';

  const model = fcBuildTodayModel(entries, oura, now, velocity);
  const dims = fcBuildDimensionSignals(entries, now);
  const pressure = dims[0];
  const lever = fcPickTodayLever(entries, timeEntries, activities, foodEntries, medLogs, medications, oura, dims, now);
  const timeSignal = fcBuildTimeWindowSignal(entries, now);
  const textSignal = fcBuildTextSignal(entries, dreams, quickNotes, now);
  const sources = fcBuildSourceStats(entries, timeEntries, foodEntries, medLogs, oura, dreams, quickNotes, [], [], [], now);
  const confidence = fcForecastConfidence(entries, sources, now);

  const signals = [];
  if (pressure) {
    const deltaText = Math.abs(pressure.delta) >= 0.2
      ? `${pressure.delta > 0 ? '+' : ''}${pressure.delta.toFixed(1)} vs baseline`
      : 'near baseline';
    signals.push({
      score: pressure.score,
      type: pressure.current < 4.2 ? 'warning' : 'info',
      icon: pressure.icon,
      title: `${pressure.label} needs the most attention`,
      body: `${pressure.label} is at ${pressure.current.toFixed(1)} (${deltaText}). Start there if today gets wobbly.`,
      meta: 'current pressure point'
    });
  }
  if (lever) signals.push(lever);
  if (timeSignal) signals.push(timeSignal);
  if (textSignal) signals.push(textSignal);

  const orderedSignals = signals
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  const rangePctLeft = ((model.low - 1) / 9) * 100;
  const rangePctRight = 100 - ((model.high - 1) / 9) * 100;
  const dotPct = ((model.score - 1) / 9) * 100;
  const baselineDiff = model.score - model.baselineAvg;
  const baselineLabel = Math.abs(baselineDiff) < 0.2
    ? 'near your baseline'
    : `${baselineDiff > 0 ? '+' : ''}${baselineDiff.toFixed(1)} vs baseline`;

  return `
    <div class="fc-card fc-brief-card">
      <div class="fc-brief-topline">
        <div>
          <div class="fc-card-header"><span>🧭</span> Today's Brief</div>
          <div class="fc-brief-summary">${model.label}. Forecast is <strong>${baselineLabel}</strong>.</div>
        </div>
        <div class="fc-confidence-pill" style="--conf:${confidence}%">
          <span>${confidence}%</span>
          <small>confidence</small>
        </div>
      </div>

      <div class="fc-today-meter">
        <div class="fc-today-low">${model.low.toFixed(1)}</div>
        <div class="fc-today-track">
          <div class="fc-today-range" style="left:${rangePctLeft}%;right:${rangePctRight}%;background:${fcStateColor(model.score)}"></div>
          <div class="fc-today-dot" style="left:${dotPct}%;background:${fcStateColor(model.score)}"></div>
        </div>
        <div class="fc-today-high">${model.high.toFixed(1)}</div>
      </div>

      <div class="fc-factor-row">
        ${model.factors.map(f => `<span>${f}</span>`).join('')}
      </div>

      <div class="fc-brief-grid">
        ${orderedSignals.map(s => `
          <div class="fc-brief-signal fc-brief-${s.type || 'info'}">
            <div class="fc-brief-signal-head">
              <span class="fc-brief-icon">${s.icon}</span>
              <div>
                <div class="fc-brief-title">${s.title}</div>
                <div class="fc-brief-meta">${s.meta || ''}</div>
              </div>
            </div>
            <div class="fc-brief-body">${s.body}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function fcBuildTodayModel(entries, oura, now, velocity) {
  const recent24 = entries.filter(e => now - e.ts < 24 * 3600000);
  const currentEntries = recent24.length ? recent24 : [entries[entries.length - 1]];
  const currentAvg = fcAvg(currentEntries.map(fcAvgScore));
  const baselineEntries = entries.filter(e => now - e.ts >= 24 * 3600000 && now - e.ts < 60 * 86400000);
  const baselineAvg = baselineEntries.length >= 5 ? fcAvg(baselineEntries.map(fcAvgScore)) : fcAvg(entries.map(fcAvgScore));
  const dayProfile = fcGetDayProfile(entries, now, 0);
  const sleep = fcLatestSleepSignal(oura);
  let score = currentAvg + velocity * 0.35;
  const factors = [];

  if (velocity > 0.35) factors.push('rising now');
  else if (velocity < -0.35) factors.push('dropping now');
  else factors.push('steady now');

  if (dayProfile && dayProfile.count >= 3 && Math.abs(dayProfile.diff) >= 0.25) {
    score += dayProfile.diff * 0.25;
    factors.push(`${dayProfile.label} pattern ${dayProfile.diff > 0 ? '+' : ''}${dayProfile.diff.toFixed(1)}`);
  }

  if (sleep && sleep.score) {
    score += sleep.adjust;
    if (sleep.score < 65) factors.push('sleep drag');
    else if (sleep.score >= 82) factors.push('sleep support');
  }

  score = score * 0.78 + baselineAvg * 0.22;
  score = Math.max(1, Math.min(10, score));

  const recentScores = entries.slice(-14).map(fcAvgScore);
  const mean = fcAvg(recentScores);
  const variance = recentScores.length ? fcAvg(recentScores.map(s => Math.pow(s - mean, 2))) : 0;
  const spread = Math.max(0.45, Math.min(1.6, Math.sqrt(variance) || 0.7));
  const low = Math.max(1, score - spread);
  const high = Math.min(10, score + spread);

  return {
    score,
    low,
    high,
    currentAvg,
    baselineAvg,
    factors: factors.slice(0, 4),
    label: fcStateLabel(score).replace(/[💚]/g, '').trim()
  };
}

function fcBuildDimensionSignals(entries, now) {
  const recent24 = entries.filter(e => now - e.ts < 24 * 3600000);
  const currentEntries = recent24.length ? recent24 : [entries[entries.length - 1]];
  const baselineEntries = entries.filter(e => now - e.ts >= 24 * 3600000 && now - e.ts < 60 * 86400000);
  const baselinePool = baselineEntries.length >= 5 ? baselineEntries : entries;
  const meta = {
    body: { label: 'Body', icon: '🫀' },
    energy: { label: 'Energy', icon: '⚡' },
    mood: { label: 'Mood', icon: '💜' },
    mind: { label: 'Mind', icon: '🧠' }
  };

  return Object.keys(meta).map(dim => {
    const currentVals = currentEntries.map(e => fcGetScore(e, dim)).filter(v => v > 0);
    const baselineVals = baselinePool.map(e => fcGetScore(e, dim)).filter(v => v > 0);
    const current = currentVals.length ? fcAvg(currentVals) : 5;
    const baseline = baselineVals.length ? fcAvg(baselineVals) : current;
    const delta = current - baseline;
    const lowPressure = Math.max(0, 5.5 - current) * 11;
    const dropPressure = Math.max(0, -delta) * 12;
    const score = lowPressure + dropPressure + (dim === 'body' ? 3 : 0);
    return { dim, ...meta[dim], current, baseline, delta, score };
  }).sort((a, b) => b.score - a.score);
}

function fcPickTodayLever(entries, timeEntries, activities, foodEntries, medLogs, medications, oura, dims, now) {
  const candidates = [];
  const todayStart = startOfDay(new Date(now)).getTime();
  const hour = new Date(now).getHours();
  const sleep = fcLatestSleepSignal(oura);

  if (sleep && sleep.score && sleep.score < 68) {
    candidates.push({
      score: 90 - sleep.score,
      type: 'warning',
      icon: '🌙',
      title: 'Recovery pacing will matter',
      body: `Last sleep score was ${sleep.score}. Keep the day lighter where you can and watch body/energy first.`,
      meta: 'Oura sleep signal'
    });
  }

  const boosts = fcFindActivityBoosts(entries, timeEntries, activities)
    .map(b => {
      const lastSession = timeEntries
        .filter(t => t.activityId === b.id)
        .sort((a, b2) => b2.endTime - a.endTime)[0];
      const daysSince = lastSession ? Math.floor((now - lastSession.endTime) / 86400000) : 99;
      return { ...b, daysSince };
    });
  const staleBoost = boosts.find(b => b.daysSince >= 2) || boosts[0];
  if (staleBoost) {
    const name = fcEscape(staleBoost.name);
    const when = staleBoost.daysSince === 0 ? 'today' : staleBoost.daysSince === 1 ? 'yesterday' : `${staleBoost.daysSince} days ago`;
    candidates.push({
      score: 42 + Math.min(28, staleBoost.boost * 10) + Math.min(18, staleBoost.daysSince * 3),
      type: staleBoost.daysSince >= 3 ? 'action' : 'info',
      icon: staleBoost.emoji || '⏱',
      title: staleBoost.daysSince >= 2 ? `Bring back ${name}` : `${name} is a strong lever`,
      body: `Tracked sessions of ${name} are associated with +${staleBoost.boost.toFixed(1)} mood. Last logged ${when}.`,
      meta: `${staleBoost.sessions} sessions`
    });
  }

  const todayFoods = foodEntries.filter(f => f.timestamp >= todayStart && f.timestamp < todayStart + 86400000);
  if (foodEntries.length >= 5 && ((hour >= 13 && todayFoods.length === 0) || (hour >= 17 && todayFoods.length <= 1))) {
    candidates.push({
      score: 64 + (hour >= 17 ? 10 : 0),
      type: 'action',
      icon: '🍽',
      title: 'Food rhythm is thin today',
      body: `${todayFoods.length} meal${todayFoods.length === 1 ? '' : 's'} logged today. If you have eaten, logging it will sharpen the forecast; if not, food may be the simplest lever.`,
      meta: 'today data gap'
    });
  }

  const todayMedLogs = medLogs.filter(log => log.timestamp >= todayStart && log.timestamp < todayStart + 86400000);
  if (medications.length && !todayMedLogs.length && hour >= 9) {
    candidates.push({
      score: 58,
      type: 'info',
      icon: '💊',
      title: 'Medication log is empty today',
      body: 'Nothing is logged yet. Check the medication page if something belongs there today.',
      meta: `${medications.length} saved`
    });
  }

  const pressure = dims[0];
  if (pressure && pressure.current < 4.2) {
    candidates.push({
      score: 68 + (4.2 - pressure.current) * 8,
      type: 'warning',
      icon: pressure.icon,
      title: `${pressure.label}-first plan`,
      body: `${pressure.label} is low enough that big plans may cost more than usual. Choose the smallest helpful version of the day.`,
      meta: `${pressure.current.toFixed(1)} now`
    });
  }

  if (!candidates.length) return null;
  return candidates.sort((a, b) => b.score - a.score)[0];
}

function fcBuildTimeWindowSignal(entries, now) {
  const slots = fcTimeOfDayScores(entries);
  if (slots.length < 2) return null;
  const best = slots.reduce((a, b) => a.avg > b.avg ? a : b);
  const worst = slots.reduce((a, b) => a.avg < b.avg ? a : b);
  if (best.avg - worst.avg < 0.35) return null;

  const hour = new Date(now).getHours();
  const currentDef = fcTimeSlotForHour(hour);
  const current = currentDef ? slots.find(s => s.label === currentDef.label) : null;
  const upcoming = fcUpcomingSlot(slots, hour);

  if (current && current.label === worst.label) {
    return {
      score: 58 + (best.avg - worst.avg) * 8,
      type: 'warning',
      icon: '🕐',
      title: `${current.label} is your lower window`,
      body: `Historically ${current.label.toLowerCase()} averages ${current.avg.toFixed(1)}, while ${best.label.toLowerCase()} averages ${best.avg.toFixed(1)}. Avoid judging the whole day from this window.`,
      meta: 'time pattern'
    };
  }

  if (upcoming && upcoming.label === best.label && current?.label !== best.label) {
    return {
      score: 54 + (best.avg - worst.avg) * 7,
      type: 'info',
      icon: '🌤',
      title: `${best.label} may be your best window`,
      body: `${best.label} tends to score highest for you (${best.avg.toFixed(1)} avg). Put the thing that needs care there if you can.`,
      meta: 'upcoming support'
    };
  }

  return {
    score: 48 + (best.avg - worst.avg) * 6,
    type: 'info',
    icon: '🕐',
    title: `${best.label} is your strongest window`,
    body: `Best: ${best.label} (${best.avg.toFixed(1)}). Hardest: ${worst.label} (${worst.avg.toFixed(1)}).`,
    meta: 'time pattern'
  };
}

function fcBuildTextSignal(entries, dreams, quickNotes, now) {
  const weekText = [];
  entries.filter(e => now - e.ts < 7 * 86400000).forEach(e => {
    if (e.notes) weekText.push(Object.values(e.notes).join(' '));
  });
  dreams.filter(d => now - d.ts < 7 * 86400000).forEach(d => weekText.push(d.text || (d.noRecall ? 'no dream recall' : '')));
  quickNotes.filter(n => now - n.ts < 7 * 86400000).forEach(n => weekText.push(n.text || ''));

  const text = weekText.join(' ').toLowerCase();
  if (!text.trim()) return null;

  const tenseWords = ['anxious', 'tired', 'stressed', 'sad', 'frustrated', 'angry', 'overwhelmed', 'lonely', 'exhausted', 'worried', 'scared', 'pressure'];
  const anchorWords = ['calm', 'creative', 'proud', 'connected', 'hopeful', 'inspired', 'peaceful', 'grateful', 'focused', 'joy', 'soft', 'rest'];
  const tense = tenseWords.filter(w => text.includes(w));
  const anchors = anchorWords.filter(w => text.includes(w));

  if (tense.length >= 2 && tense.length > anchors.length) {
    return {
      score: 55 + Math.min(20, tense.length * 4),
      type: 'warning',
      icon: '📝',
      title: 'Recent notes sound loaded',
      body: `Words like ${tense.slice(0, 3).map(fcEscape).join(', ')} showed up this week. The forecast is treating your mind/emotion load as active context.`,
      meta: `${weekText.length} text signals`
    };
  }

  if (anchors.length >= 2) {
    return {
      score: 50 + Math.min(14, anchors.length * 3),
      type: 'info',
      icon: '✨',
      title: 'There are positive anchors in the text',
      body: `Recent notes include ${anchors.slice(0, 3).map(fcEscape).join(', ')}. Those are useful clues for what supports you.`,
      meta: `${weekText.length} text signals`
    };
  }

  if (dreams.filter(d => now - d.ts < 7 * 86400000).length >= 2) {
    return {
      score: 46,
      type: 'info',
      icon: '🌙',
      title: 'Dream data is active',
      body: 'You have recent dream entries, so the forecast is reading sleep/reflective patterns as part of the week.',
      meta: 'dream journal'
    };
  }

  return null;
}

function fcBuildDataPulse(entries, timeEntries, foodEntries, medLogs, oura, dreams, quickNotes, meditationEntries, stoolEntries, mediaSessions, now) {
  const sources = fcBuildSourceStats(entries, timeEntries, foodEntries, medLogs, oura, dreams, quickNotes, meditationEntries, stoolEntries, mediaSessions, now);
  const confidence = fcForecastConfidence(entries, sources, now);
  const active = sources.filter(s => s.status === 'active').length;
  const quiet = sources.filter(s => s.status === 'quiet').length;

  return `
    <div class="fc-card fc-data-card">
      <div class="fc-card-header"><span>📡</span> Forecast Ingredients</div>
      <div class="fc-data-summary">
        <strong>${active}</strong> active source${active === 1 ? '' : 's'} this week${quiet ? ` · ${quiet} quiet but available` : ''}.
        The forecast trusts fresh check-ins most, then looks for support from activity, sleep, food, meds, dreams, and notes.
      </div>
      <div class="fc-source-grid">
        ${sources.map(s => `
          <div class="fc-source-chip fc-source-${s.status}">
            <span>${s.icon}</span>
            <div>
              <strong>${s.label}</strong>
              <small>${s.detail}</small>
            </div>
          </div>
        `).join('')}
      </div>
      <div class="fc-confidence-line">
        <div class="fc-confidence-fill" style="width:${confidence}%"></div>
      </div>
    </div>
  `;
}

/* ═══════════════════════════════════
   ACTIVE INSIGHTS — Front & Center
   ═══════════════════════════════════ */

function fcBuildActiveInsights(entries, timeEntries, activities, foodEntries, medLogs, medications, oura, now) {
  const insights = [];

  // 1. Activity that helps most + days since last session
  const boosts = fcFindActivityBoosts(entries, timeEntries, activities);
  if (boosts.length) {
    const top = boosts[0];
    const lastSession = timeEntries
      .filter(t => t.activityId === top.id)
      .sort((a, b) => b.endTime - a.endTime)[0];
    const daysSince = lastSession ? Math.floor((now - lastSession.endTime) / 86400000) : null;
    let extra = '';
    if (daysSince !== null && daysSince >= 2) {
      extra = ` — you haven't done it in ${daysSince} days`;
    } else if (daysSince === 1) {
      extra = ' — last done yesterday';
    } else if (daysSince === 0) {
      extra = ' — you did this today ✓';
    }
    insights.push({
      emoji: top.emoji || '⭐',
      text: `<strong>${top.name}</strong> boosts your mood by <strong>+${top.boost.toFixed(1)}</strong> on average${extra}`,
      type: daysSince >= 3 ? 'action' : 'info'
    });
  }

  // 1b. Activity withdrawal patterns
  const withdrawals = fcDetectWithdrawals(entries, timeEntries, activities, now);
  withdrawals.forEach(w => {
    insights.push({
      emoji: w.emoji || '⏳',
      text: `When you go ${w.threshold}+ days without <strong>${w.name}</strong>, mood drops by <strong>${w.drop.toFixed(1)}</strong>`,
      type: w.currentDays >= w.threshold ? 'action' : 'info'
    });
  });

  // 2. Day-of-week insight for today
  const todayDow = new Date().getDay();
  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const todayEntries = entries.filter(e => new Date(e.ts).getDay() === todayDow);
  if (todayEntries.length >= 3) {
    const todayAvg = fcAvg(todayEntries.map(fcAvgScore));
    const overallAvg = fcAvg(entries.map(fcAvgScore));
    const diff = todayAvg - overallAvg;
    if (Math.abs(diff) > 0.4) {
      if (diff < -0.4) {
        insights.push({
          emoji: '📅',
          text: `${dayNames[todayDow]}s tend to be harder for you (<strong>${todayAvg.toFixed(1)}</strong> vs your <strong>${overallAvg.toFixed(1)}</strong> average) — be gentle with yourself`,
          type: 'warning'
        });
      } else {
        insights.push({
          emoji: '📅',
          text: `${dayNames[todayDow]}s are usually good for you (<strong>${todayAvg.toFixed(1)}</strong> vs your <strong>${overallAvg.toFixed(1)}</strong> average)`,
          type: 'info'
        });
      }
    }
  }

  // 3. Food pattern — meal count impact
  const foodByDay = {};
  foodEntries.forEach(f => {
    const dk = dayKey(f.timestamp);
    foodByDay[dk] = (foodByDay[dk] || 0) + 1;
  });
  const fewMealDays = Object.entries(foodByDay).filter(([, c]) => c <= 1).map(([dk]) => dk);
  const goodMealDays = Object.entries(foodByDay).filter(([, c]) => c >= 3).map(([dk]) => dk);
  if (fewMealDays.length >= 3 && goodMealDays.length >= 3) {
    const fewMood = [], goodMood = [];
    entries.forEach(e => {
      const dk = dayKey(e.ts);
      if (fewMealDays.includes(dk)) fewMood.push(fcAvgScore(e));
      else if (goodMealDays.includes(dk)) goodMood.push(fcAvgScore(e));
    });
    if (fewMood.length >= 3 && goodMood.length >= 3) {
      const diff = fcAvg(goodMood) - fcAvg(fewMood);
      if (diff > 0.3) {
        insights.push({
          emoji: '🍽',
          text: `When you eat <strong>3+ meals</strong>, your mood is <strong>+${diff.toFixed(1)} higher</strong> than on days with 1 or fewer meals`,
          type: 'info'
        });
      }
    }
  }

  // 3b. Specific food keyword analysis
  const foodKeywordInsights = fcAnalyzeFoodKeywords(entries, foodEntries);
  foodKeywordInsights.forEach(fi => insights.push(fi));

  // 4. Sleep impact (if Oura data)
  if (oura && oura.sleep && oura.sleep.length >= 5) {
    const sleepMoodPairs = [];
    oura.sleep.forEach(s => {
      if (!s.score || !s.day) return;
      const nextDay = new Date(s.day);
      nextDay.setDate(nextDay.getDate() + 1);
      const ndStart = startOfDay(nextDay).getTime();
      const ndEnd = ndStart + 86400000;
      const nextDayEntries = entries.filter(e => e.ts >= ndStart && e.ts < ndEnd);
      if (nextDayEntries.length) {
        sleepMoodPairs.push({ score: s.score, mood: fcAvg(nextDayEntries.map(fcAvgScore)) });
      }
    });
    const lowSleep = sleepMoodPairs.filter(p => p.score < 65);
    const goodSleep = sleepMoodPairs.filter(p => p.score >= 75);
    if (lowSleep.length >= 2 && goodSleep.length >= 2) {
      const diff = fcAvg(goodSleep.map(p => p.mood)) - fcAvg(lowSleep.map(p => p.mood));
      if (diff > 0.5) {
        insights.push({
          emoji: '🌙',
          text: `Good sleep (75+) gives you <strong>+${diff.toFixed(1)}</strong> mood the next day vs poor sleep`,
          type: 'info'
        });
      }
    }
  }

  // 5. Body-mood connection
  const lowBody = entries.filter(e => fcGetScore(e, 'body') > 0 && fcGetScore(e, 'body') < 3);
  const highBody = entries.filter(e => fcGetScore(e, 'body') >= 5);
  if (lowBody.length >= 5 && highBody.length >= 5) {
    const lowMood = fcAvg(lowBody.map(e => fcGetScore(e, 'mood')));
    const highMood = fcAvg(highBody.map(e => fcGetScore(e, 'mood')));
    if (highMood - lowMood > 1) {
      insights.push({
        emoji: '🫀',
        text: `Your body drives your mood — when body is <strong>5+</strong>, mood averages <strong>${highMood.toFixed(1)}</strong>. Below 3, it drops to <strong>${lowMood.toFixed(1)}</strong>`,
        type: 'info'
      });
    }
  }

  // 6. Medication insight
  medications.forEach(med => {
    const logs = medLogs.filter(l => l.medicationId === med.id);
    if (logs.length < 5) return;
    const takenDays = new Set(logs.map(l => dayKey(l.timestamp)));
    const dayScores = {};
    entries.forEach(e => {
      const dk = dayKey(e.ts);
      if (!dayScores[dk]) dayScores[dk] = [];
      dayScores[dk].push(fcAvgScore(e));
    });
    const takenAvgs = [], skippedAvgs = [];
    Object.entries(dayScores).forEach(([dk, scores]) => {
      if (takenDays.has(dk)) takenAvgs.push(fcAvg(scores));
      else skippedAvgs.push(fcAvg(scores));
    });
    if (takenAvgs.length >= 3 && skippedAvgs.length >= 3) {
      const diff = fcAvg(takenAvgs) - fcAvg(skippedAvgs);
      if (Math.abs(diff) > 0.3) {
        insights.push({
          emoji: '💊',
          text: `<strong>${med.name}</strong>: mood averages <strong>${fcAvg(takenAvgs).toFixed(1)}</strong> on days taken vs <strong>${fcAvg(skippedAvgs).toFixed(1)}</strong> when skipped`,
          type: 'info'
        });
      }
    }
  });

  // 7. Positive note detection
  const noteInsights = fcDetectPositiveNotes(entries, now);
  noteInsights.forEach(ni => insights.push(ni));

  if (!insights.length) return '';

  // Sort: action items first, then warnings, then info
  const order = { action: 0, warning: 1, info: 2 };
  insights.sort((a, b) => (order[a.type] || 2) - (order[b.type] || 2));
  const picked = fcPickDailyInsights(insights, now, 6);

  return `
    <div class="fc-card fc-insights-card">
      <div class="fc-card-header"><span>💡</span> What Your Data Says</div>
      <div class="fc-insights-list">
        ${picked.visible.map(fcRenderInsight).join('')}
      </div>
      ${picked.hidden.length ? `
        <details class="fc-more-insights">
          <summary>Show ${picked.hidden.length} more background pattern${picked.hidden.length === 1 ? '' : 's'}</summary>
          <div class="fc-insights-list">
            ${picked.hidden.map(fcRenderInsight).join('')}
          </div>
        </details>
      ` : ''}
    </div>
  `;
}


/* ═══════════════════════════════════
   WHAT WORKS FOR YOU
   ═══════════════════════════════════ */

function fcBuildWhatWorks(entries, timeEntries, activities, foodEntries, medLogs, medications, now) {
  const boosts = fcFindActivityBoosts(entries, timeEntries, activities);
  if (boosts.length < 1 && entries.length < 10) return '';

  const items = [];

  // Activities ranked by mood boost
  boosts.slice(0, 6).forEach(b => {
    const lastSession = timeEntries
      .filter(t => t.activityId === b.id)
      .sort((a, b2) => b2.endTime - a.endTime)[0];
    const daysSince = lastSession ? Math.floor((now - lastSession.endTime) / 86400000) : null;
    items.push({
      emoji: b.emoji || '⏱',
      name: b.name,
      boost: b.boost,
      sessions: b.sessions,
      daysSince,
      type: 'activity'
    });
  });

  // Time of day patterns
  const timeSlots = fcTimeOfDayScores(entries);
  const bestTime = timeSlots.reduce((a, b) => (a.avg || 0) > (b.avg || 0) ? a : b, {});

  if (!items.length) return '';

  return `
    <div class="fc-card">
      <div class="fc-card-header"><span>✨</span> What Works For You</div>
      <div class="fc-works-list">
        ${items.map(item => {
          const boostColor = item.boost > 1.5 ? '#34d399' : item.boost > 0.5 ? '#a7f3d0' : '#fbbf24';
          const sinceTag = item.daysSince !== null && item.daysSince >= 3
            ? `<span class="fc-works-stale">${item.daysSince}d ago</span>`
            : item.daysSince === 0
            ? `<span class="fc-works-recent">today</span>`
            : item.daysSince === 1
            ? `<span class="fc-works-recent">yesterday</span>`
            : '';
          return `
            <div class="fc-works-item">
              <span class="fc-works-emoji">${item.emoji}</span>
              <div class="fc-works-info">
                <div class="fc-works-name">${item.name} ${sinceTag}</div>
                <div class="fc-works-detail">${item.sessions} sessions tracked</div>
              </div>
              <div class="fc-works-boost" style="color:${boostColor}">+${item.boost.toFixed(1)}</div>
            </div>
          `;
        }).join('')}
      </div>
      ${bestTime.label ? `<div class="fc-works-time">🕐 You tend to feel best in the <strong>${bestTime.label.toLowerCase()}</strong> (${bestTime.avg.toFixed(1)} avg)</div>` : ''}
    </div>
  `;
}


/* ═══════════════════════════════════
   PREDICTION — Tomorrow's Forecast
   ═══════════════════════════════════ */

function fcBuildPrediction(entries, timeEntries, activities, oura, velocity, now) {
  if (entries.length < 10) return '';

  const recent = entries.filter(e => now - e.ts < 24 * 3600000);
  const currentAvg = recent.length ? fcAvg(recent.map(fcAvgScore)) : fcAvgScore(entries[entries.length - 1]);
  const overallAvg = fcAvg(entries.map(fcAvgScore));

  let predicted = currentAvg + velocity * 0.5;

  // Day-of-week factor
  const tomorrow = (new Date().getDay() + 1) % 7;
  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const tomorrowEntries = entries.filter(e => new Date(e.ts).getDay() === tomorrow);
  let dowAdjust = 0;
  if (tomorrowEntries.length >= 3) {
    dowAdjust = (fcAvg(tomorrowEntries.map(fcAvgScore)) - overallAvg) * 0.3;
  }
  predicted += dowAdjust;

  // Sleep factor
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

  // Time-of-day awareness: evening low → morning bounce pattern
  const currentHour = new Date(now).getHours();
  let timeAdjust = 0;
  let timeNote = '';
  if (currentHour >= 18 && currentAvg < overallAvg - 0.5) {
    // Check historical: do evenings tend to be lower and mornings bounce?
    const eveningEntries = entries.filter(e => { const h = new Date(e.ts).getHours(); return h >= 18 && h < 24; });
    const morningEntries = entries.filter(e => { const h = new Date(e.ts).getHours(); return h >= 6 && h < 12; });
    if (eveningEntries.length >= 5 && morningEntries.length >= 5) {
      const eveningAvg = fcAvg(eveningEntries.map(fcAvgScore));
      const morningAvg = fcAvg(morningEntries.map(fcAvgScore));
      if (morningAvg > eveningAvg + 0.3) {
        timeAdjust = (morningAvg - eveningAvg) * 0.3;
        timeNote = 'mornings usually bounce back';
      }
    }
  }
  predicted += timeAdjust;

  // Day-to-day transition pattern
  let transitionAdjust = 0;
  const dayAvgMap = fcDailyAverages(entries);
  const sortedDayKeys = Object.keys(dayAvgMap).sort();
  if (sortedDayKeys.length >= 7) {
    // Find transitions from similar daily averages
    const todayDk = sortedDayKeys[sortedDayKeys.length - 1];
    const todayAvg = dayAvgMap[todayDk];
    let transSum = 0, transCount = 0;
    for (let i = 0; i < sortedDayKeys.length - 1; i++) {
      const dAvg = dayAvgMap[sortedDayKeys[i]];
      const nextAvg = dayAvgMap[sortedDayKeys[i + 1]];
      if (Math.abs(dAvg - todayAvg) < 0.5) {
        transSum += nextAvg;
        transCount++;
      }
    }
    if (transCount >= 3) {
      const expectedNext = transSum / transCount;
      transitionAdjust = (expectedNext - predicted) * 0.2;
    }
  }
  predicted += transitionAdjust;

  // Pattern matching — find similar historical states and what happened next
  const patternResult = fcFindSimilarPattern(entries, now);

  // Blend pattern match into prediction
  if (patternResult.avgOutcome > 0 && patternResult.count >= 2) {
    const blendWeight = Math.min(0.3, patternResult.count * 0.05);
    predicted = predicted * (1 - blendWeight) + patternResult.avgOutcome * blendWeight;
  }

  // Mean reversion
  predicted = predicted * 0.7 + overallAvg * 0.3;
  predicted = Math.max(1, Math.min(10, predicted));

  // Confidence range
  const recentScores = entries.slice(-14).map(fcAvgScore);
  const recentMean = fcAvg(recentScores);
  const stdDev = Math.sqrt(fcAvg(recentScores.map(s => Math.pow(s - recentMean, 2))));
  const range = Math.max(0.5, Math.min(2, stdDev));
  const low = Math.max(1, predicted - range).toFixed(1);
  const high = Math.min(10, predicted + range).toFixed(1);

  const factors = [];
  if (velocity > 0.3) factors.push('upward trend');
  else if (velocity < -0.3) factors.push('downward trend');
  else factors.push('steady trajectory');
  if (dowAdjust > 0.1) factors.push(`${dayNames[tomorrow]}s are good for you`);
  else if (dowAdjust < -0.1) factors.push(`${dayNames[tomorrow]}s tend to be harder`);
  if (sleepNote) factors.push(sleepNote);
  if (timeNote) factors.push(timeNote);

  const patternHtml = patternResult.count >= 2
    ? `<div class="fc-pattern-match">📊 Found <strong>${patternResult.count} similar moments</strong> in your history — in similar moments, you averaged <strong>${patternResult.avgOutcome.toFixed(1)}</strong> next day</div>`
    : '';

  return `
    <div class="fc-card fc-prediction-card">
      <div class="fc-card-header"><span>🔮</span> Tomorrow's Forecast</div>
      <div class="fc-prediction-range">
        <div class="fc-prediction-low">${low}</div>
        <div class="fc-prediction-bar-wrap">
          <div class="fc-prediction-bar" style="left:${(parseFloat(low)-1)/9*100}%;right:${100-(parseFloat(high)-1)/9*100}%;background:${fcStateColor(predicted)}"></div>
          <div class="fc-prediction-dot" style="left:${(predicted-1)/9*100}%;background:${fcStateColor(predicted)}"></div>
        </div>
        <div class="fc-prediction-high">${high}</div>
      </div>
      <div class="fc-prediction-label">You'll likely feel around <strong>${predicted.toFixed(1)}</strong> tomorrow</div>
      <div class="fc-prediction-factors">Based on: ${factors.join(' · ')}</div>
      ${patternHtml}
    </div>
  `;
}

function fcFindSimilarPattern(entries, now) {
  if (entries.length < 30) return { count: 0, avgOutcome: 0 };

  const recent3 = entries.slice(-3).map(fcAvgScore);
  const currentSig = fcAvg(recent3);
  const currentVel = recent3.length >= 2 ? recent3[recent3.length - 1] - recent3[0] : 0;

  const matches = [];
  for (let i = 2; i < entries.length - 5; i++) {
    const window = [entries[i - 2], entries[i - 1], entries[i]].map(fcAvgScore);
    const sig = fcAvg(window);
    const vel = window[window.length - 1] - window[0];

    // Tightened window: 0.5 instead of 1.0
    if (Math.abs(sig - currentSig) < 0.5 && Math.sign(vel) === Math.sign(currentVel)) {
      const futureEntries = entries.filter(e => e.ts > entries[i].ts && e.ts - entries[i].ts < 48 * 3600000);
      if (futureEntries.length) {
        matches.push({
          futureAvg: fcAvg(futureEntries.map(fcAvgScore)),
          sig
        });
      }
    }
  }

  if (matches.length < 2) return { count: 0, avgOutcome: 0 };

  return {
    count: matches.length,
    avgOutcome: fcAvg(matches.map(m => m.futureAvg))
  };
}


/* ═══════════════════════════════════
   SPIRAL RISK
   ═══════════════════════════════════ */

function fcBuildSpiralRisk(entries, recent, oura) {
  const r = recent.length ? recent : entries.slice(-3);
  let score = 0;
  const reasons = [];
  const scores = r.map(fcAvgScore);
  const currentAvg = fcAvg(scores);
  const bodyScores = r.map(e => fcGetScore(e, 'body')).filter(v => v > 0);
  const moodScores = r.map(e => fcGetScore(e, 'mood')).filter(v => v > 0);

  if (currentAvg < 3) { score += 30; reasons.push('Overall scores very low'); }
  else if (currentAvg < 4) { score += 15; reasons.push('Scores below average'); }

  if (scores.length >= 3 && scores.slice(-3).every((s, i, a) => i === 0 || s <= a[i - 1]) && scores[scores.length - 1] < 4) {
    score += 20; reasons.push('Scores dropping 3+ entries in a row');
  }

  if (bodyScores.length && fcAvg(bodyScores) < 3) {
    score += 15; reasons.push('Body scores very low');
  }
  if (moodScores.length && fcAvg(moodScores) < 3) {
    score += 15; reasons.push('Mood critically low');
  }

  // Distress words in notes
  const recentNotes = r.map(e => e.notes ? Object.values(e.notes).join(' ').toLowerCase() : '').join(' ');
  const dangerWords = ['powerless', 'hopeless', 'scared', 'doom', 'catastroph', 'spiralling', "can't sleep", 'no sleep'];
  const found = dangerWords.filter(w => recentNotes.includes(w));
  if (found.length >= 3) { score += 20; reasons.push('Multiple distress words in notes'); }
  else if (found.length >= 1) { score += 10; reasons.push('Some distress signals in notes'); }

  // Night entries
  const nightEntries = r.filter(e => { const h = new Date(e.ts).getHours(); return h >= 0 && h < 5; });
  if (nightEntries.length >= 2) { score += 10; reasons.push('Multiple middle-of-night entries'); }

  // Oura
  if (oura && oura.sleep && oura.sleep.length) {
    const sorted = [...oura.sleep].sort((a, b) => (b.day || '').localeCompare(a.day || ''));
    const lastScore = sorted[0]?.score;
    if (lastScore && lastScore < 55) { score += 10; reasons.push('Very poor sleep (Oura)'); }
  }

  score = Math.min(100, score);
  const label = score >= 70 ? 'High — please take care of yourself 💛'
    : score >= 40 ? 'Moderate — watch for escalation'
    : score >= 20 ? 'Mild — some signals present'
    : 'Low — looking stable right now';

  return `
    <div class="fc-card">
      <div class="fc-card-header"><span>⚠️</span> Spiral Risk</div>
      <div class="fc-risk-bar">
        <div class="fc-risk-fill" style="width:${score}%;background:${fcRiskColor(score)}"></div>
      </div>
      <div class="fc-risk-label" style="color:${fcRiskColor(score)}">${label}</div>
      ${reasons.length ? `<div class="fc-risk-reasons">${reasons.map(r2 => `<div class="fc-risk-reason">· ${r2}</div>`).join('')}</div>` : ''}
    </div>
  `;
}


/* ═══════════════════════════════════
   SLEEP INTEGRATION (Oura)
   ═══════════════════════════════════ */

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

  const sorted = [...oura.sleep].sort((a, b) => (b.day || '').localeCompare(a.day || ''));
  const lastNight = sorted[0];
  if (!lastNight) return '';

  const score = lastNight.score;
  const hrv = lastNight.average_hrv || null;
  const totalSleep = lastNight.total_sleep_duration;
  const sleepHrs = totalSleep ? `${Math.floor(totalSleep / 3600)}h ${Math.floor((totalSleep % 3600) / 60)}m` : 'N/A';
  const isPoor = score && score < 65;

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
      ${isPoor ? '<div class="fc-sleep-warn">⚠️ Poor sleep last night — be extra gentle with yourself today</div>' : ''}
    </div>
  `;
}


/* ═══════════════════════════════════
   RECOVERY INSIGHTS — NEW
   ═══════════════════════════════════ */

function fcBuildRecoveryInsights(entries, timeEntries, activities, foodEntries, now) {
  const recent24 = entries.filter(e => now - e.ts < 24 * 3600000);
  const currentAvg = recent24.length ? fcAvg(recent24.map(fcAvgScore)) : fcAvgScore(entries[entries.length - 1]);

  // Only show when below 5
  if (currentAvg >= 5 || entries.length < 20) return '';

  // Find historical moments with similar low scores that then improved
  const dayAvgMap = fcDailyAverages(entries);
  const sortedDays = Object.keys(dayAvgMap).sort();
  const recoveries = [];

  for (let i = 0; i < sortedDays.length - 2; i++) {
    const dayAvg = dayAvgMap[sortedDays[i]];
    // Similar to current state
    if (Math.abs(dayAvg - currentAvg) > 0.5) continue;

    // Check if next 1-3 days improved
    let improved = false;
    let recoveryAvg = 0;
    let recoveryDays = 0;
    for (let j = i + 1; j <= Math.min(i + 3, sortedDays.length - 1); j++) {
      if (dayAvgMap[sortedDays[j]] > dayAvg + 0.5) {
        improved = true;
        recoveryAvg = dayAvgMap[sortedDays[j]];
        recoveryDays = j - i;
        break;
      }
    }

    if (!improved) continue;

    // What was present during the low day and recovery?
    const lowDayStart = new Date(sortedDays[i]).getTime();
    const recoveryEnd = lowDayStart + (recoveryDays + 1) * 86400000;

    // Activities during recovery window
    const recoveryActivities = timeEntries.filter(t =>
      t.endTime >= lowDayStart && t.startTime < recoveryEnd
    ).map(t => {
      const act = activities.find(a => a.id === t.activityId);
      return act ? act.name : null;
    }).filter(Boolean);

    // Food count during recovery
    const recoveryFoods = foodEntries.filter(f =>
      f.timestamp >= lowDayStart && f.timestamp < recoveryEnd
    ).length;

    // Time of entries during recovery (morning vs evening)
    const recoveryEntries = entries.filter(e => e.ts >= lowDayStart && e.ts < recoveryEnd);
    const morningRecovery = recoveryEntries.filter(e => {
      const h = new Date(e.ts).getHours();
      return h >= 6 && h < 12;
    }).length;

    recoveries.push({
      fromAvg: dayAvg,
      toAvg: recoveryAvg,
      days: recoveryDays,
      activities: recoveryActivities,
      foodCount: recoveryFoods,
      hadMorningEntries: morningRecovery > 0
    });
  }

  if (recoveries.length < 2) return '';

  // Aggregate: what activities appeared most during recoveries?
  const actCount = {};
  recoveries.forEach(r => {
    const unique = [...new Set(r.activities)];
    unique.forEach(a => { actCount[a] = (actCount[a] || 0) + 1; });
  });

  const topActivities = Object.entries(actCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .filter(([, c]) => c >= 2);

  const avgFoods = fcAvg(recoveries.map(r => r.foodCount));
  const avgDays = fcAvg(recoveries.map(r => r.days));

  const tips = [];
  if (topActivities.length) {
    tips.push(topActivities.map(([name, count]) => `<strong>${name}</strong> (${count} times)`).join(', '));
  }
  if (avgFoods >= 3) {
    tips.push(`eating ${Math.round(avgFoods)}+ meals`);
  }
  const morningPct = recoveries.filter(r => r.hadMorningEntries).length / recoveries.length;
  if (morningPct > 0.6) {
    tips.push('morning check-ins');
  }

  if (!tips.length) return '';

  return `
    <div class="fc-card">
      <div class="fc-card-header"><span>🌱</span> Recovery Insights</div>
      <div class="fc-recovery-intro">When you've been around <strong>${currentAvg.toFixed(1)}</strong> before, you bounced back in ~${avgDays.toFixed(0)} days.</div>
      <div class="fc-recovery-tips">What helped: ${tips.join(' · ')}</div>
      <div class="fc-recovery-count">Based on ${recoveries.length} similar recoveries in your history</div>
    </div>
  `;
}


/* ═══════════════════════════════════
   TRAJECTORY — Weekly Trends
   ═══════════════════════════════════ */

function fcBuildTrajectory(entries, now) {
  // Build weekly averages for last 8 weeks
  const weeks = [];
  for (let w = 7; w >= 0; w--) {
    const weekStart = now - (w + 1) * 7 * 86400000;
    const weekEnd = now - w * 7 * 86400000;
    const weekEntries = entries.filter(e => e.ts >= weekStart && e.ts < weekEnd);
    if (weekEntries.length) {
      weeks.push({
        avg: fcAvg(weekEntries.map(fcAvgScore)),
        body: fcAvg(weekEntries.map(e => fcGetScore(e, 'body')).filter(v => v > 0)),
        energy: fcAvg(weekEntries.map(e => fcGetScore(e, 'energy')).filter(v => v > 0)),
        mood: fcAvg(weekEntries.map(e => fcGetScore(e, 'mood')).filter(v => v > 0)),
        mind: fcAvg(weekEntries.map(e => fcGetScore(e, 'mind')).filter(v => v > 0)),
        count: weekEntries.length,
        label: w === 0 ? 'This wk' : w === 1 ? 'Last wk' : `${w}w ago`
      });
    }
  }

  if (weeks.length < 2) return '';

  // SVG line chart — increased height
  const width = 280, height = 140, pad = 25;
  const xStep = (width - pad * 2) / (weeks.length - 1);
  const allAvgs = weeks.map(w => w.avg);
  const minV = Math.max(0, Math.min(...allAvgs) - 0.5);
  const maxV = Math.min(10, Math.max(...allAvgs) + 0.5);
  const range = maxV - minV || 1;

  const points = weeks.map((w, i) => {
    const x = pad + i * xStep;
    const y = pad + (1 - (w.avg - minV) / range) * (height - pad * 2);
    return { x, y, avg: w.avg };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');

  // Grid lines
  const gridLines = [];
  const gridSteps = 4;
  for (let g = 0; g <= gridSteps; g++) {
    const gy = pad + (g / gridSteps) * (height - pad * 2);
    const gVal = maxV - (g / gridSteps) * range;
    gridLines.push(`<line x1="${pad}" y1="${gy}" x2="${width - pad}" y2="${gy}" stroke="var(--border)" stroke-width="0.5" stroke-dasharray="4,4" opacity="0.4"/>`);
    gridLines.push(`<text x="${pad - 4}" y="${gy + 3}" font-size="8" fill="var(--text-secondary)" text-anchor="end">${gVal.toFixed(1)}</text>`);
  }

  // Trend description
  const firstHalf = weeks.slice(0, Math.floor(weeks.length / 2));
  const secondHalf = weeks.slice(Math.floor(weeks.length / 2));
  const firstAvg = fcAvg(firstHalf.map(w => w.avg));
  const secondAvg = fcAvg(secondHalf.map(w => w.avg));
  const weeklyTrend = secondAvg - firstAvg;
  const trendText = weeklyTrend > 0.3 ? 'trending up' : weeklyTrend < -0.3 ? 'trending down' : 'holding steady';

  // Best/worst weeks
  const bestWeek = weeks.reduce((a, b) => a.avg > b.avg ? a : b);
  const worstWeek = weeks.reduce((a, b) => a.avg < b.avg ? a : b);

  // Dimension mini-trends
  const dims = ['body', 'energy', 'mood', 'mind'];
  const dimIcons = { body: '🫀', energy: '⚡', mood: '💜', mind: '🧠' };
  const dimTrends = dims.map(d => {
    const first = fcAvg(firstHalf.map(w => w[d]).filter(v => v > 0));
    const second = fcAvg(secondHalf.map(w => w[d]).filter(v => v > 0));
    const diff = second - first;
    return { dim: d, icon: dimIcons[d], diff, current: second || 0 };
  }).filter(d => d.current > 0);

  return `
    <div class="fc-card">
      <div class="fc-card-header"><span>📈</span> Your Trajectory</div>
      <div class="fc-trajectory-summary">Over ${weeks.length} weeks, you're <strong>${trendText}</strong> (${weeklyTrend > 0 ? '+' : ''}${weeklyTrend.toFixed(1)})</div>
      <div class="fc-trajectory-chart">
        <svg viewBox="0 0 ${width} ${height}" class="fc-traj-svg">
          ${gridLines.join('')}
          <path d="${linePath}" fill="none" stroke="${fcStateColor(secondAvg)}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          ${points.map(p => `
            <circle cx="${p.x}" cy="${p.y}" r="4" fill="${fcStateColor(p.avg)}" stroke="var(--bg)" stroke-width="2"/>
            <text x="${p.x}" y="${p.y - 8}" font-size="9" fill="var(--text)" text-anchor="middle" font-weight="600">${p.avg.toFixed(1)}</text>
          `).join('')}
        </svg>
        <div class="fc-traj-labels">
          ${weeks.map(w => `<span>${w.label}</span>`).join('')}
        </div>
      </div>
      ${bestWeek !== worstWeek ? `
        <div class="fc-traj-extremes">
          <span>✨ Best: <strong>${bestWeek.avg.toFixed(1)}</strong> (${bestWeek.label})</span>
          <span>💔 Lowest: <strong>${worstWeek.avg.toFixed(1)}</strong> (${worstWeek.label})</span>
        </div>
      ` : ''}
      ${dimTrends.length ? `
        <div class="fc-dim-trends">
          ${dimTrends.map(d => {
            const arrow = d.diff > 0.3 ? '↗' : d.diff < -0.3 ? '↘' : '→';
            const color = d.diff > 0.3 ? '#34d399' : d.diff < -0.3 ? '#f87171' : '#fbbf24';
            return `<div class="fc-dim-trend"><span>${d.icon}</span> <strong>${d.current.toFixed(1)}</strong> <span style="color:${color}">${arrow}</span></div>`;
          }).join('')}
        </div>
      ` : ''}
    </div>
  `;
}


/* ═══════════════════════════════════
   CURRENT DIMENSIONS
   ═══════════════════════════════════ */

function fcBuildDimensions(entries, recent) {
  const r = recent.length ? recent : [entries[entries.length - 1]];
  return `
    <div class="fc-card">
      <div class="fc-card-header"><span>📊</span> Current Dimensions</div>
      <div class="fc-dims">
        ${['body', 'energy', 'mood', 'mind'].map(dim => {
          const vals = r.map(e => fcGetScore(e, dim)).filter(v => v > 0);
          const v = vals.length ? fcAvg(vals) : 0;
          const icon = { body: '🫀', energy: '⚡', mood: '💜', mind: '🧠' }[dim];
          return `
            <div class="fc-dim">
              <span class="fc-dim-icon">${icon}</span>
              <div class="fc-dim-bar-wrap">
                <div class="fc-dim-bar" style="width:${v * 10}%;background:${fcStateColor(v)}"></div>
              </div>
              <span class="fc-dim-val">${v.toFixed(1)}</span>
            </div>`;
        }).join('')}
      </div>
    </div>
  `;
}


/* ═══════════════════════════════════
   ALERTS
   ═══════════════════════════════════ */

function fcBuildAlerts(entries, recent) {
  const alerts = [];
  const r = recent.length >= 2 ? recent : entries.slice(-3);
  const bodyScores = r.map(e => fcGetScore(e, 'body')).filter(v => v > 0);
  const moodScores = r.map(e => fcGetScore(e, 'mood')).filter(v => v > 0);
  const scores = r.map(fcAvgScore);

  if (bodyScores.length >= 2 && bodyScores.slice(-2).every(s => s < 3)) {
    alerts.push({ level: 'danger', title: 'Body in distress', desc: 'Body scores below 3 for multiple entries.' });
  }

  if (moodScores.length >= 2) {
    const drop = moodScores[moodScores.length - 2] - moodScores[moodScores.length - 1];
    if (drop >= 2) {
      alerts.push({ level: 'warning', title: 'Mood dropped sharply', desc: `Mood fell ${drop.toFixed(1)} points since last entry.` });
    }
  }

  const lastEntry = r[r.length - 1];
  if (lastEntry) {
    const energy = fcGetScore(lastEntry, 'energy');
    const mood = fcGetScore(lastEntry, 'mood');
    if (energy > 5 && mood < 3) {
      alerts.push({ level: 'warning', title: 'Fight mode detected', desc: 'High energy + low mood often means anger/anxiety.' });
    }
  }

  const now = Date.now();
  const nightLogs = entries.filter(e => now - e.ts < 12 * 3600000).filter(e => {
    const h = new Date(e.ts).getHours(); return h >= 0 && h < 5;
  });
  if (nightLogs.length >= 2) {
    alerts.push({ level: 'danger', title: 'Sleep disruption', desc: 'Multiple entries during the night.' });
  }

  if (scores.length >= 3 && scores.slice(-3).every(s => s < 3.5)) {
    alerts.push({ level: 'danger', title: 'Sustained low', desc: 'Last 3 entries average below 3.5.' });
  }

  if (!alerts.length) return '';

  return `
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
  `;
}


/* ═══════════════════════════════════
   PATTERN WARNINGS (now proactive)
   ═══════════════════════════════════ */

function fcBuildPatternWarnings(entries, recent, timeEntries, activities, now) {
  if (entries.length < 20) return '';
  const warnings = [];
  const r = recent.length >= 2 ? recent : entries.slice(-3);

  // Body < 3 for 2+ entries → crash pattern
  const recentBody = r.map(e => fcGetScore(e, 'body')).filter(v => v > 0);
  if (recentBody.length >= 2 && recentBody.slice(-2).every(s => s < 3)) {
    let crashes = 0, total = 0;
    for (let i = 2; i < entries.length - 2; i++) {
      const b1 = fcGetScore(entries[i - 1], 'body'), b2 = fcGetScore(entries[i], 'body');
      if (b1 > 0 && b2 > 0 && b1 < 3 && b2 < 3) {
        total++;
        const future = entries.filter(e => e.ts > entries[i].ts && e.ts - entries[i].ts < 48 * 3600000);
        if (future.length && fcAvg(future.map(e => fcGetScore(e, 'mood')).filter(v => v > 0)) < 3.5) crashes++;
      }
    }
    if (total >= 2 && crashes / total > 0.4) {
      warnings.push({ icon: '🫀', title: 'Body distress pattern', desc: `${Math.round(crashes / total * 100)}% of the time this led to a mood crash within 48h.`, severity: 'danger' });
    }
  }

  // Proactive: body approaching danger zone
  if (recentBody.length >= 1) {
    const lastBody = recentBody[recentBody.length - 1];
    if (lastBody >= 3 && lastBody < 4) {
      // Check: historically, when body dropped below 3, what happened to mood?
      let crashCount = 0, belowCount = 0;
      for (let i = 1; i < entries.length - 2; i++) {
        const b = fcGetScore(entries[i], 'body');
        if (b > 0 && b < 3) {
          belowCount++;
          const future = entries.filter(e => e.ts > entries[i].ts && e.ts - entries[i].ts < 48 * 3600000);
          if (future.length && fcAvg(future.map(e => fcGetScore(e, 'mood')).filter(v => v > 0)) < 3.5) crashCount++;
        }
      }
      if (belowCount >= 3 && crashCount / belowCount > 0.4) {
        warnings.push({ icon: '⚡', title: 'Body approaching danger zone', desc: `Your body is at ${lastBody.toFixed(1)} — last time it dropped below 3, mood crashed within 48h ${Math.round(crashCount / belowCount * 100)}% of the time.`, severity: 'warning' });
      }
    }
  }

  // Consecutive drops
  if (r.length >= 3) {
    const scores = r.slice(-3).map(fcAvgScore);
    if (scores[0] > scores[1] && scores[1] > scores[2] && scores[2] < 4.5) {
      let esc = 0, tot = 0;
      for (let i = 2; i < entries.length - 3; i++) {
        const s = [entries[i - 2], entries[i - 1], entries[i]].map(fcAvgScore);
        if (s[0] > s[1] && s[1] > s[2] && s[2] < 4.5) {
          tot++;
          const next = entries.slice(i + 1, i + 4).map(fcAvgScore);
          if (next.length && fcAvg(next) < s[2] - 0.5) esc++;
        }
      }
      if (tot >= 2 && esc / tot > 0.4) {
        warnings.push({ icon: '📉', title: 'Downward spiral pattern', desc: `In your history, this continued dropping ${Math.round(esc / tot * 100)}% of the time.`, severity: 'warning' });
      }
    }
  }

  // Low mind
  const recentMind = r.map(e => fcGetScore(e, 'mind')).filter(v => v > 0);
  if (recentMind.length >= 2 && fcAvg(recentMind) < 3) {
    warnings.push({ icon: '🧠', title: 'Mental fog detected', desc: 'Low mind clarity often precedes broader drops.', severity: 'warning' });
  }

  // Proactive: activity withdrawal warning
  if (timeEntries && activities) {
    const boosts = fcFindActivityBoosts(entries, timeEntries, activities);
    boosts.slice(0, 3).forEach(b => {
      const lastSession = timeEntries
        .filter(t => t.activityId === b.id)
        .sort((a, b2) => b2.endTime - a.endTime)[0];
      if (!lastSession) return;
      const daysSince = Math.floor((now - lastSession.endTime) / 86400000);
      if (daysSince >= 4) {
        warnings.push({
          icon: b.emoji || '⏳',
          title: `${b.name} withdrawal`,
          desc: `You haven't done ${b.name} in ${daysSince} days — historically mood drops after 3+ days without it.`,
          severity: 'warning'
        });
      }
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


/* ═══════════════════════════════════
   TIME OF DAY PATTERNS
   ═══════════════════════════════════ */

function fcTimeOfDayScores(entries) {
  const slots = [
    { label: 'Morning', from: 6, to: 12, scores: [] },
    { label: 'Afternoon', from: 12, to: 18, scores: [] },
    { label: 'Evening', from: 18, to: 24, scores: [] },
    { label: 'Night', from: 0, to: 6, scores: [] },
  ];
  entries.forEach(e => {
    const h = new Date(e.ts).getHours();
    const slot = slots.find(s => h >= s.from && h < s.to);
    if (slot) slot.scores.push(fcAvgScore(e));
  });
  return slots.filter(s => s.scores.length >= 3).map(s => ({ ...s, avg: fcAvg(s.scores) }));
}

function fcBuildTimeOfDay(entries) {
  const slots = fcTimeOfDayScores(entries);
  if (slots.length < 2) return '';

  const best = slots.reduce((a, b) => a.avg > b.avg ? a : b);
  const worst = slots.reduce((a, b) => a.avg < b.avg ? a : b);
  if (best.avg - worst.avg < 0.3) return '';

  const emojis = { Morning: '🌅', Afternoon: '☀️', Evening: '🌆', Night: '🌙' };

  return `
    <div class="fc-card">
      <div class="fc-card-header"><span>🕐</span> Time of Day</div>
      <div class="fc-tod-grid">
        ${slots.map(s => `
          <div class="fc-tod-item">
            <div class="fc-tod-emoji">${emojis[s.label] || '⏰'}</div>
            <div class="fc-tod-label">${s.label}</div>
            <div class="fc-tod-val" style="color:${fcStateColor(s.avg)}">${s.avg.toFixed(1)}</div>
          </div>
        `).join('')}
      </div>
      <div class="fc-tod-summary">Best: <strong>${best.label}</strong> (${best.avg.toFixed(1)}) · Hardest: <strong>${worst.label}</strong> (${worst.avg.toFixed(1)})</div>
    </div>
  `;
}


/* ═══════════════════════════════════
   DAY OF WEEK PATTERNS
   ═══════════════════════════════════ */

function fcBuildDayOfWeek(entries) {
  if (entries.length < 14) return '';

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const buckets = Array.from({ length: 7 }, () => []);
  entries.forEach(e => buckets[new Date(e.ts).getDay()].push(fcAvgScore(e)));

  const dayAvgs = buckets.map((scores, i) => ({
    day: dayNames[i],
    avg: scores.length >= 2 ? fcAvg(scores) : null,
    count: scores.length
  }));

  const valid = dayAvgs.filter(d => d.avg !== null);
  if (valid.length < 3) return '';

  const today = new Date().getDay();

  return `
    <div class="fc-card">
      <div class="fc-card-header"><span>📅</span> Day-of-Week</div>
      <div class="fc-dow-chart">
        ${dayAvgs.map((d, i) => {
          if (!d.avg) return `<div class="fc-dow-bar-col"><div class="fc-dow-bar" style="height:4px;background:var(--border)"></div><div class="fc-dow-day">${d.day}</div></div>`;
          const pct = (d.avg / 10) * 100;
          return `<div class="fc-dow-bar-col ${i === today ? 'fc-dow-today' : ''}">
            <div class="fc-dow-val">${d.avg.toFixed(1)}</div>
            <div class="fc-dow-bar" style="height:${pct}%;background:${fcStateColor(d.avg)}${i === today ? ';box-shadow:0 0 8px ' + fcStateColor(d.avg) : ''}"></div>
            <div class="fc-dow-day" ${i === today ? 'style="font-weight:700"' : ''}>${d.day}</div>
          </div>`;
        }).join('')}
      </div>
    </div>
  `;
}


/* ═══════════════════════════════════
   CHECK-IN NUDGE
   ═══════════════════════════════════ */

function fcBuildCheckinNudge(entries, now) {
  if (!entries.length) return '';
  const last = entries[entries.length - 1];
  const hoursSince = (now - last.ts) / 3600000;
  if (hoursSince < 4) return '';

  const timeAgo = hoursSince < 24 ? `${Math.round(hoursSince)} hours`
    : `${Math.round(hoursSince / 24)} days`;

  if (hoursSince > 24) {
    return `
      <div class="fc-card fc-nudge fc-nudge-strong">
        <div class="fc-nudge-icon">⏰</div>
        <div>
          <div class="fc-nudge-title">It's been ${timeAgo} since your last check-in</div>
          <div class="fc-nudge-desc">Your forecast works best with regular data 💜</div>
        </div>
      </div>`;
  }

  if (hoursSince > 8) {
    return `
      <div class="fc-card fc-nudge fc-nudge-gentle">
        <div class="fc-nudge-icon">✦</div>
        <div>
          <div class="fc-nudge-title">Last check-in was ${timeAgo} ago</div>
          <div class="fc-nudge-desc">A quick check-in would improve accuracy ✨</div>
        </div>
      </div>`;
  }

  return '';
}


/* ═══════════════════════════════════
   SPARKLINE
   ═══════════════════════════════════ */

function fcBuildSparkline(entries, now) {
  const dayMap = {};
  entries.filter(e => now - e.ts < 14 * 86400000).forEach(e => {
    const dk = dayKey(e.ts);
    if (!dayMap[dk]) dayMap[dk] = [];
    dayMap[dk].push(fcAvgScore(e));
  });

  const sortedDays = Object.keys(dayMap).sort();
  if (sortedDays.length < 3) return '';

  const points = sortedDays.map(dk => fcAvg(dayMap[dk]));
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
  const lineColor = fcStateColor(lastVal);

  return `
    <div class="fc-sparkline-wrap">
      <svg class="fc-sparkline" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
        <polyline points="${pathPts.join(' ')}" fill="none" stroke="${lineColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="${pathPts[pathPts.length - 1].split(',')[0]}" cy="${pathPts[pathPts.length - 1].split(',')[1]}" r="3" fill="${lineColor}"/>
      </svg>
      <div class="fc-sparkline-label">${sortedDays.length}d</div>
    </div>
  `;
}


/* ═══════════════════════════════════
   PATTERNS (Collapsible — Historical)
   ═══════════════════════════════════ */

function fcBuildPatterns(entries, now) {
  const patterns = [];
  const overallAvg = fcAvg(entries.map(fcAvgScore));
  const daySpan = Math.max(1, (now - entries[0].ts) / 86400000);
  const perDay = entries.length / daySpan;

  patterns.push({ emoji: '📊', text: `Overall average: ${overallAvg.toFixed(1)}/10 across ${entries.length} check-ins` });
  patterns.push({ emoji: '✍️', text: `You log about ${perDay.toFixed(1)} times per day` });

  const sorted = [...entries].sort((a, b) => fcAvgScore(b) - fcAvgScore(a));
  if (sorted.length >= 2) {
    patterns.push({ emoji: '🌟', text: `Best moment: ${fcAvgScore(sorted[0]).toFixed(1)} on ${new Date(sorted[0].ts).toLocaleDateString()}` });
    patterns.push({ emoji: '💔', text: `Hardest moment: ${fcAvgScore(sorted[sorted.length - 1]).toFixed(1)} on ${new Date(sorted[sorted.length - 1].ts).toLocaleDateString()}` });
  }

  return `
    <div class="fc-card fc-collapsible">
      <div class="fc-card-header fc-toggle" onclick="this.parentElement.classList.toggle('fc-open')"><span>📋</span> All-Time Stats <span class="fc-chevron">›</span></div>
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
  `;
}


/* ═══════════════════════════════════
   HELPER: Activity Boost Analysis (same-day)
   ═══════════════════════════════════ */

function fcFindActivityBoosts(entries, timeEntries, activities) {
  if (!timeEntries.length || !activities.length) return [];

  const boosts = [];
  activities.forEach(act => {
    const actTimes = timeEntries.filter(t => t.activityId === act.id && t.endTime && t.endTime > t.startTime);
    if (actTimes.length < 2) return;

    // Same-day analysis: compare mood on activity days vs non-activity days
    const actDays = new Set(actTimes.map(t => dayKey(t.startTime)));
    const dayScores = {};
    entries.forEach(e => {
      const dk = dayKey(e.ts);
      if (!dayScores[dk]) dayScores[dk] = [];
      dayScores[dk].push(fcAvgScore(e));
    });

    const withActivity = [], withoutActivity = [];
    Object.entries(dayScores).forEach(([dk, scores]) => {
      const avg = fcAvg(scores);
      if (actDays.has(dk)) withActivity.push(avg);
      else withoutActivity.push(avg);
    });

    if (withActivity.length >= 2 && withoutActivity.length >= 2) {
      const boost = fcAvg(withActivity) - fcAvg(withoutActivity);
      if (boost > 0) {
        boosts.push({ id: act.id, name: act.name, emoji: act.emoji, boost, sessions: actTimes.length });
      }
    }
  });

  return boosts.sort((a, b) => b.boost - a.boost);
}


/* ═══════════════════════════════════
   HELPER: Activity Withdrawal Detection
   ═══════════════════════════════════ */

function fcDetectWithdrawals(entries, timeEntries, activities, now) {
  if (!timeEntries.length || !activities.length || entries.length < 20) return [];

  const results = [];
  const dayScoresMap = {};
  entries.forEach(e => {
    const dk = dayKey(e.ts);
    if (!dayScoresMap[dk]) dayScoresMap[dk] = [];
    dayScoresMap[dk].push(fcAvgScore(e));
  });

  activities.forEach(act => {
    const actTimes = timeEntries.filter(t => t.activityId === act.id && t.endTime).sort((a, b) => a.endTime - b.endTime);
    if (actTimes.length < 5) return;

    // For each gap between sessions, measure mood during the gap
    const gapMoods = { short: [], long: [] }; // short: <=3 days, long: >3 days
    for (let i = 1; i < actTimes.length; i++) {
      const gapDays = Math.floor((actTimes[i].startTime - actTimes[i - 1].endTime) / 86400000);
      // Get mood scores during the gap
      const gapStart = actTimes[i - 1].endTime;
      const gapEnd = actTimes[i].startTime;
      const gapEntries = entries.filter(e => e.ts >= gapStart && e.ts <= gapEnd);
      if (gapEntries.length < 1) continue;
      const gapAvg = fcAvg(gapEntries.map(fcAvgScore));
      if (gapDays <= 3) gapMoods.short.push(gapAvg);
      else gapMoods.long.push(gapAvg);
    }

    if (gapMoods.short.length >= 3 && gapMoods.long.length >= 3) {
      const diff = fcAvg(gapMoods.short) - fcAvg(gapMoods.long);
      if (diff > 0.5) {
        // Current days since last session
        const lastSession = actTimes[actTimes.length - 1];
        const daysSince = Math.floor((now - lastSession.endTime) / 86400000);
        results.push({
          name: act.name,
          emoji: act.emoji,
          drop: diff,
          threshold: 3,
          currentDays: daysSince
        });
      }
    }
  });

  return results.sort((a, b) => b.drop - a.drop).slice(0, 3);
}


/* ═══════════════════════════════════
   HELPER: Food Keyword Analysis
   ═══════════════════════════════════ */

function fcAnalyzeFoodKeywords(entries, foodEntries) {
  if (!foodEntries.length || entries.length < 10) return [];

  const keywords = ['oat', 'coffee', 'sugar', 'chocolate', 'fruit', 'salad', 'rice', 'bread', 'egg', 'fish', 'chicken', 'pasta', 'soup', 'tea', 'water', 'juice', 'milk', 'cheese', 'yogurt', 'nuts', 'vegetables', 'pizza', 'burger', 'alcohol', 'wine', 'beer'];
  const insights = [];

  // Map food entries to days with keyword presence
  const dayFoodKeywords = {};
  foodEntries.forEach(f => {
    const dk = dayKey(f.timestamp);
    const desc = (f.description || f.name || '').toLowerCase();
    if (!dayFoodKeywords[dk]) dayFoodKeywords[dk] = new Set();
    keywords.forEach(kw => {
      if (desc.includes(kw)) dayFoodKeywords[dk].add(kw);
    });
  });

  // Map entries to daily mood averages
  const dayMoods = {};
  entries.forEach(e => {
    const dk = dayKey(e.ts);
    if (!dayMoods[dk]) dayMoods[dk] = [];
    dayMoods[dk].push(fcAvgScore(e));
  });

  keywords.forEach(kw => {
    const withDays = [], withoutDays = [];
    Object.keys(dayMoods).forEach(dk => {
      const avg = fcAvg(dayMoods[dk]);
      if (dayFoodKeywords[dk] && dayFoodKeywords[dk].has(kw)) {
        withDays.push(avg);
      } else if (dayFoodKeywords[dk]) {
        // Only count days where we have food data at all
        withoutDays.push(avg);
      }
    });

    if (withDays.length >= 3 && withoutDays.length >= 3) {
      const diff = fcAvg(withDays) - fcAvg(withoutDays);
      if (Math.abs(diff) > 0.5) {
        const emoji = diff > 0 ? '🟢' : '🔴';
        const direction = diff > 0 ? 'higher' : 'lower';
        insights.push({
          emoji,
          text: `Days with <strong>${kw}</strong>: mood is <strong>${Math.abs(diff).toFixed(1)} ${direction}</strong> (${withDays.length} days tracked)`,
          type: 'info',
          absDiff: Math.abs(diff)
        });
      }
    }
  });

  return insights.sort((a, b) => b.absDiff - a.absDiff).slice(0, 3);
}


/* ═══════════════════════════════════
   HELPER: Positive Note Detection
   ═══════════════════════════════════ */

function fcDetectPositiveNotes(entries, now) {
  const insights = [];
  const positiveWords = ['grateful', 'happy', 'proud', 'loved', 'creative', 'accomplished', 'calm', 'peaceful', 'connected', 'strong', 'hopeful', 'inspired', 'joyful', 'content', 'excited'];
  const negativeWords = ['anxious', 'tired', 'stressed', 'sad', 'frustrated', 'angry', 'overwhelmed', 'lonely', 'exhausted', 'worried'];

  // Last 7 days
  const weekEntries = entries.filter(e => now - e.ts < 7 * 86400000);
  if (weekEntries.length < 3) return insights;

  const positiveCounts = {};
  positiveWords.forEach(w => { positiveCounts[w] = 0; });

  weekEntries.forEach(e => {
    if (!e.notes) return;
    const allNotes = Object.values(e.notes).join(' ').toLowerCase();
    positiveWords.forEach(w => {
      if (allNotes.includes(w)) positiveCounts[w]++;
    });
  });

  // Report frequent positive words
  const frequent = Object.entries(positiveCounts)
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1]);

  if (frequent.length) {
    const top = frequent.slice(0, 3).map(([word, count]) => `<strong>${word}</strong> (${count}×)`).join(', ');
    insights.push({
      emoji: '✨',
      text: `This week you've expressed: ${top}`,
      type: 'info'
    });
  }

  // Compare positive vs negative note themes in good vs bad periods
  if (entries.length >= 20) {
    const goodEntries = entries.filter(e => fcAvgScore(e) >= 6 && e.notes);
    const badEntries = entries.filter(e => fcAvgScore(e) <= 3.5 && e.notes);

    if (goodEntries.length >= 5 && badEntries.length >= 5) {
      const goodNotes = goodEntries.map(e => Object.values(e.notes).join(' ').toLowerCase()).join(' ');
      const badNotes = badEntries.map(e => Object.values(e.notes).join(' ').toLowerCase()).join(' ');

      const goodPosCount = positiveWords.filter(w => goodNotes.includes(w)).length;
      const badNegCount = negativeWords.filter(w => badNotes.includes(w)).length;

      if (goodPosCount >= 3) {
        const topGoodWords = positiveWords.filter(w => goodNotes.includes(w)).slice(0, 3);
        insights.push({
          emoji: '📝',
          text: `When you're doing well, your notes often mention: <strong>${topGoodWords.join(', ')}</strong>`,
          type: 'info'
        });
      }
    }
  }

  return insights;
}


/* ═══════════════════════════════════
   HELPER: Daily Averages Map
   ═══════════════════════════════════ */

function fcDailyAverages(entries) {
  const dayMap = {};
  entries.forEach(e => {
    const dk = dayKey(e.ts);
    if (!dayMap[dk]) dayMap[dk] = [];
    dayMap[dk].push(fcAvgScore(e));
  });
  const result = {};
  Object.entries(dayMap).forEach(([dk, scores]) => {
    result[dk] = fcAvg(scores);
  });
  return result;
}


/* ═══════════════════════════════════
   HELPER: Tracking Streak
   ═══════════════════════════════════ */

function fcGetTrackingStreak(entries, now) {
  let streak = 0;
  const today = startOfDay(new Date(now));
  for (let d = 0; d < 365; d++) {
    const dayStart = new Date(today);
    dayStart.setDate(dayStart.getDate() - d);
    const dk = dayKey(dayStart);
    const hasEntry = entries.some(e => dayKey(e.ts) === dk);
    if (hasEntry) streak++;
    else break;
  }
  return streak;
}


/* ═══════════════════════════════════
   HELPER: Dynamic forecast utilities
   ═══════════════════════════════════ */

function fcLoadArray(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function fcBuildSourceStats(entries, timeEntries, foodEntries, medLogs, oura, dreams, quickNotes, meditationEntries, stoolEntries, mediaSessions, now) {
  const sleepRecords = oura && Array.isArray(oura.sleep)
    ? oura.sleep.map(s => ({ day: s.day, timestamp: fcDayToTs(s.day) }))
    : [];

  return [
    fcSourceStat('✦', 'Check-ins', entries, ['ts', 'timestamp'], now),
    fcSourceStat('⏱', 'Activities', timeEntries, ['endTime', 'startTime', 'timestamp'], now),
    fcSourceStat('🍽', 'Food', foodEntries, ['timestamp', 'ts'], now),
    fcSourceStat('💊', 'Meds', medLogs, ['timestamp', 'ts'], now),
    fcSourceStat('🌙', 'Oura', sleepRecords, ['timestamp', 'day'], now),
    fcSourceStat('🌌', 'Dreams', dreams, ['ts', 'timestamp'], now),
    fcSourceStat('📝', 'Notes', quickNotes, ['ts', 'timestamp'], now),
    fcSourceStat('🧘', 'Meditation', meditationEntries, ['ts', 'timestamp'], now),
    fcSourceStat('💩', 'Stool', stoolEntries, ['timestamp', 'ts'], now),
    fcSourceStat('📱', 'Media', mediaSessions, ['endTime', 'timestamp', 'ts'], now)
  ];
}

function fcSourceStat(icon, label, records, fields, now) {
  const list = Array.isArray(records) ? records : [];
  const times = list
    .map(r => fcRecordTime(r, fields))
    .filter(ts => Number.isFinite(ts) && ts > 0 && ts <= now + 3600000);
  const week = 7 * 86400000;
  const month = 30 * 86400000;
  const count7 = times.filter(ts => now - ts <= week).length;
  const latest = times.length ? Math.max(...times) : null;
  const status = count7 > 0 ? 'active' : latest && now - latest <= month ? 'quiet' : 'empty';
  const detail = count7 > 0 ? `${count7} in 7d` : latest ? `last ${fcHumanAge(latest, now)}` : 'no data';
  return { icon, label, count7, latest, status, detail };
}

function fcRecordTime(record, fields) {
  if (!record) return null;
  for (const field of fields) {
    const raw = record[field];
    if (raw == null || raw === '') continue;
    if (field === 'day') return fcDayToTs(raw);
    const asNumber = Number(raw);
    if (Number.isFinite(asNumber) && asNumber > 0) return asNumber;
    const parsed = Date.parse(raw);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function fcDayToTs(day) {
  if (!day || typeof day !== 'string') return null;
  const parts = day.split('-').map(Number);
  if (parts.length !== 3 || parts.some(n => !Number.isFinite(n))) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]).getTime();
}

function fcHumanAge(ts, now) {
  const diff = Math.max(0, now - ts);
  const hours = diff / 3600000;
  if (hours < 1) return 'just now';
  if (hours < 24) return `${Math.round(hours)}h ago`;
  const days = hours / 24;
  if (days < 14) return `${Math.round(days)}d ago`;
  if (days < 70) return `${Math.round(days / 7)}w ago`;
  return `${Math.round(days / 30)}mo ago`;
}

function fcForecastConfidence(entries, sources, now) {
  const latestEntry = entries.length ? Math.max(...entries.map(e => e.ts || 0)) : null;
  const hoursSince = latestEntry ? (now - latestEntry) / 3600000 : Infinity;
  const daySpan = entries.length > 1
    ? Math.max(1, (Math.max(...entries.map(e => e.ts || 0)) - Math.min(...entries.map(e => e.ts || 0))) / 86400000)
    : 1;
  const activeSources = (sources || []).filter(s => s.status === 'active').length;

  let score = 18;
  if (hoursSince <= 8) score += 28;
  else if (hoursSince <= 24) score += 22;
  else if (hoursSince <= 72) score += 12;
  else score += 4;

  if (entries.length >= 80) score += 25;
  else if (entries.length >= 35) score += 20;
  else if (entries.length >= 12) score += 12;
  else score += 6;

  if (daySpan >= 45) score += 14;
  else if (daySpan >= 14) score += 9;
  else if (daySpan >= 5) score += 5;

  score += Math.min(22, activeSources * 4);
  return Math.max(25, Math.min(95, Math.round(score)));
}

function fcLatestSleepSignal(oura) {
  if (!oura || !Array.isArray(oura.sleep) || !oura.sleep.length) return null;
  const sorted = [...oura.sleep]
    .filter(s => s && (s.score || s.score === 0))
    .sort((a, b) => (fcDayToTs(b.day) || 0) - (fcDayToTs(a.day) || 0));
  const last = sorted[0];
  if (!last) return null;
  const score = Math.round(Number(last.score));
  let adjust = 0;
  if (score < 55) adjust = -0.65;
  else if (score < 65) adjust = -0.45;
  else if (score < 75) adjust = -0.15;
  else if (score >= 85) adjust = 0.35;
  else if (score >= 80) adjust = 0.2;
  return { score, day: last.day, adjust };
}

function fcGetDayProfile(entries, now, offsetDays) {
  const target = new Date(now);
  target.setDate(target.getDate() + offsetDays);
  const dow = target.getDay();
  const labels = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const historical = entries.filter(e => now - e.ts > 24 * 3600000);
  const pool = historical.length >= 7 ? historical : entries;
  const dowEntries = pool.filter(e => new Date(e.ts).getDay() === dow);
  if (!dowEntries.length) return null;
  const overall = fcAvg(pool.map(fcAvgScore));
  const avg = fcAvg(dowEntries.map(fcAvgScore));
  return { label: labels[dow], avg, overall, diff: avg - overall, count: dowEntries.length };
}

function fcTimeSlotForHour(hour) {
  if (hour >= 6 && hour < 12) return { label: 'Morning', from: 6, to: 12 };
  if (hour >= 12 && hour < 18) return { label: 'Afternoon', from: 12, to: 18 };
  if (hour >= 18 && hour < 24) return { label: 'Evening', from: 18, to: 24 };
  return { label: 'Night', from: 0, to: 6 };
}

function fcUpcomingSlot(slots, hour) {
  const order = [
    { label: 'Morning', from: 6 },
    { label: 'Afternoon', from: 12 },
    { label: 'Evening', from: 18 },
    { label: 'Night', from: 24 }
  ];
  const upcoming = order.find(s => s.from > hour) || order[0];
  return slots.find(s => s.label === upcoming.label) || null;
}

function fcPickDailyInsights(insights, now, limit) {
  const seen = new Set();
  const unique = insights.filter(i => {
    const key = fcStripTags(i.text || '').toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const important = unique.filter(i => i.type === 'action' || i.type === 'warning');
  const background = unique.filter(i => i.type !== 'action' && i.type !== 'warning');
  const seed = Math.floor(now / 86400000);
  background.sort((a, b) => fcHashString(`${a.text}|${seed}`) - fcHashString(`${b.text}|${seed}`));

  const visible = important.slice(0, limit);
  const room = Math.max(0, limit - visible.length);
  visible.push(...background.slice(0, room));
  const hidden = unique.filter(i => !visible.includes(i));
  return { visible, hidden };
}

function fcRenderInsight(i) {
  return `
    <div class="fc-insight fc-insight-${i.type}">
      <span class="fc-insight-emoji">${i.emoji}</span>
      <div class="fc-insight-text">${i.text}</div>
    </div>
  `;
}

function fcHashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function fcStripTags(str) {
  return String(str || '').replace(/<[^>]*>/g, '');
}

function fcEscape(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]));
}


/* ═══════════════════════════════════
   CORE HELPERS (prefixed to avoid conflicts)
   ═══════════════════════════════════ */

function fcGetScore(e, dim) {
  if (e.scores) return e.scores[dim] || 0;
  return e[dim] || 0;
}

function fcAvgScore(e) {
  const s = e.scores || e;
  const vals = [s.body, s.energy, s.mood, s.mind].filter(v => v && v > 0);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 5;
}

function fcAvg(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }

function fcGetVelocity(recent) {
  if (recent.length < 2) return 0;
  const scores = recent.map(fcAvgScore);
  const first = fcAvg(scores.slice(0, Math.floor(scores.length / 2)));
  const second = fcAvg(scores.slice(Math.floor(scores.length / 2)));
  return second - first;
}

function fcStateColor(v) {
  if (v >= 6) return '#34d399';
  if (v >= 4.5) return '#fbbf24';
  if (v >= 3) return '#fb923c';
  return '#f87171';
}

function fcStateLabel(v) {
  if (v >= 7) return 'Doing well 💚';
  if (v >= 5.5) return 'Okay';
  if (v >= 4) return 'Struggling';
  if (v >= 3) return 'Rough patch';
  return 'In distress';
}

function fcTrendArrow(v) {
  if (v > 0.5) return '<span class="fc-arrow up">↗</span>';
  if (v < -0.5) return '<span class="fc-arrow down">↘</span>';
  return '<span class="fc-arrow flat">→</span>';
}

function fcTrendLabel(v) {
  if (v > 1) return 'Rising noticeably';
  if (v > 0.5) return 'Trending up';
  if (v < -1) return 'Dropping fast';
  if (v < -0.5) return 'Trending down';
  return 'Holding steady';
}

function fcRiskColor(score) {
  if (score >= 70) return '#f87171';
  if (score >= 40) return '#fb923c';
  if (score >= 20) return '#fbbf24';
  return '#34d399';
}
