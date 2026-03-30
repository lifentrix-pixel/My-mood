/* ── Meditation Timer ── */

const CIRC = 2 * Math.PI * 90;

let medState = {
  phaseDuration: 8,
  running: false,
  phase: 'clean',
  round: 1,
  secondsLeft: 0,
  totalSeconds: 0,
  startTime: 0,
  interval: null,
  audioCtx: null,
  ambientNodes: null,
  muted: false,
  volume: 0.5,
};

function initMeditate() {
  const durSlider = $('#med-dur-slider');
  const durVal = $('#med-dur-value');
  const durDown = $('#med-dur-down');
  const durUp = $('#med-dur-up');

  durSlider.addEventListener('input', () => {
    medState.phaseDuration = parseInt(durSlider.value);
    durVal.textContent = medState.phaseDuration;
  });
  durDown.addEventListener('click', () => {
    if (medState.phaseDuration > 7) {
      medState.phaseDuration--;
      durSlider.value = medState.phaseDuration;
      durVal.textContent = medState.phaseDuration;
    }
  });
  durUp.addEventListener('click', () => {
    if (medState.phaseDuration < 10) {
      medState.phaseDuration++;
      durSlider.value = medState.phaseDuration;
      durVal.textContent = medState.phaseDuration;
    }
  });

  $('#med-begin-btn').addEventListener('click', startMedSession);
  $('#med-end-btn').addEventListener('click', endMedSession);
  $('#med-save-btn').addEventListener('click', saveMedSession);

  const moodSlider = $('#med-mood-slider');
  const moodVal = $('#med-mood-val');
  moodSlider.addEventListener('input', () => { moodVal.textContent = moodSlider.value; });

  const volSlider = $('#med-vol-slider');
  volSlider.addEventListener('input', () => {
    medState.volume = parseInt(volSlider.value) / 100;
    updateAmbientVolume();
  });
  $('#med-mute-btn').addEventListener('click', () => {
    medState.muted = !medState.muted;
    $('#med-mute-btn').textContent = medState.muted ? '🔇' : '🔊';
    updateAmbientVolume();
  });

  renderMedHistory();
}

function startMedSession() {
  medState.running = true;
  medState.phase = 'clean';
  medState.round = 1;
  medState.totalSeconds = 0;
  medState.startTime = Date.now();
  medState.secondsLeft = medState.phaseDuration * 60;

  $('#med-setup').classList.add('hidden');
  $('#med-history').classList.add('hidden');
  $('#med-empty').classList.add('hidden');
  $('#med-active').classList.remove('hidden');
  $('#med-complete').classList.add('hidden');

  updatePhaseUI();
  startAmbientSound();
  startMedCanvasAnim();
  medState.interval = setInterval(medTick, 1000);
}

function medTick() {
  if (!medState.running) return;
  medState.secondsLeft--;
  medState.totalSeconds++;
  updateTimerUI();

  if (medState.secondsLeft <= 0) {
    playChime();
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    medState.phase = medState.phase === 'clean' ? 'feel' : 'clean';
    if (medState.phase === 'clean') medState.round++;
    medState.secondsLeft = medState.phaseDuration * 60;
    updatePhaseUI();
    updateAmbientTone();
    switchMedCanvasPhase(medState.phase);
  }
}

function updateTimerUI() {
  const mins = Math.floor(medState.secondsLeft / 60);
  const secs = medState.secondsLeft % 60;
  $('#med-timer-text').textContent = `${mins}:${String(secs).padStart(2, '0')}`;

  const total = medState.phaseDuration * 60;
  const progress = medState.secondsLeft / total;
  const offset = CIRC * (1 - progress);
  $('#med-timer-ring').style.strokeDashoffset = offset;
}

function updatePhaseUI() {
  const container = $('#med-phase-container');
  const isClean = medState.phase === 'clean';

  container.className = 'med-phase-container ' + (isClean ? 'phase-clean' : 'phase-feel');
  container.classList.add('med-phase-transition');
  setTimeout(() => container.classList.remove('med-phase-transition'), 800);

  $('#med-phase-icon').textContent = isClean ? '🧹' : '🧘';
  $('#med-phase-name').textContent = isClean ? 'Clean' : 'Feel';
  $('#med-phase-name').style.color = isClean ? '#c4a882' : '#9b8fd4';
  $('#med-round').textContent = `Round ${medState.round}`;
  $('#med-timer-ring').style.stroke = isClean ? '#8b7355' : '#7c6dbd';
  $('#med-timer-ring').style.strokeDashoffset = 0;
  medState.secondsLeft = medState.phaseDuration * 60;
  updateTimerUI();
}

function endMedSession() {
  medState.running = false;
  clearInterval(medState.interval);
  stopAmbientSound();
  stopMedCanvasAnim();

  const totalMin = Math.round(medState.totalSeconds / 60);
  const completedRounds = medState.round - 1;

  $('#med-stat-time').textContent = totalMin || '<1';
  $('#med-stat-rounds').textContent = completedRounds;
  $('#med-mood-slider').value = 5;
  $('#med-mood-val').textContent = '5';

  $('#med-active').classList.add('hidden');
  $('#med-complete').classList.remove('hidden');

  medState._totalMin = totalMin;
  medState._rounds = completedRounds;
}

function saveMedSession() {
  const mood = parseInt($('#med-mood-slider').value);
  const sessionEnd = Date.now();
  const sessionStart = sessionEnd - (medState._totalMin * 60 * 1000);
  
  saveMeditation({
    ts: sessionEnd,
    duration: medState._totalMin,
    rounds: medState._rounds,
    mood,
  });

  addMeditationToTimer(sessionStart, sessionEnd, medState._totalMin, medState._rounds);

  $('#med-complete').classList.add('hidden');
  $('#med-setup').classList.remove('hidden');
  $('#med-history').classList.remove('hidden');
  showToast('Session saved ✦');
  renderMedHistory();
}

function migrateMeditationToTimer() {
  const migrationKey = 'innerscape_meditation_timer_migration';
  if (localStorage.getItem(migrationKey)) return;
  
  const meditations = loadMeditations();
  const existingTimeEntries = loadTimeEntries();
  
  meditations.forEach(med => {
    const exists = existingTimeEntries.find(e => 
      e.activityId === 'meditation-cleaning' && e.endTime === med.ts
    );
    if (!exists) {
      const startTime = med.ts - (med.duration * 60 * 1000);
      addMeditationToTimer(startTime, med.ts, med.duration, med.rounds);
    }
  });
  
  localStorage.setItem(migrationKey, 'true');
}

function addMeditationToTimer(startTime, endTime, durationMin, rounds) {
  let activities = loadActivities();
  let meditationActivity = activities.find(a => a.id === 'meditation-cleaning');
  
  if (!meditationActivity) {
    meditationActivity = {
      id: 'meditation-cleaning',
      name: 'Meditative Cleaning',
      emoji: '🧹',
      color: '#7c6dbd',
      usageCount: 0,
      lastUsed: null,
      createdAt: Date.now(),
    };
    activities.push(meditationActivity);
    saveActivities(activities);
  }
  
  meditationActivity.usageCount = (meditationActivity.usageCount || 0) + 1;
  meditationActivity.lastUsed = endTime;
  saveActivities(activities);
  
  const timeEntries = loadTimeEntries();
  timeEntries.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    activityId: 'meditation-cleaning',
    startTime,
    endTime,
    meditationRounds: rounds,
  });
  saveTimeEntries(timeEntries);
}

function renderMedHistory() {
  const entries = loadMeditations().sort((a, b) => b.ts - a.ts);
  const list = $('#med-history');
  const empty = $('#med-empty');
  list.innerHTML = '';

  if (!entries.length) { empty.classList.add('show'); list.style.display = 'none'; return; }
  empty.classList.remove('show');
  list.style.display = '';

  entries.forEach((entry, i) => {
    const card = document.createElement('div');
    card.className = 'med-card';
    card.style.animationDelay = `${i * 0.06}s`;
    card.innerHTML = `
      <div class="med-card-header">
        <span class="med-card-time">${new Date(entry.ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
        <button class="entry-delete" data-ts="${entry.ts}" title="Delete">✕</button>
      </div>
      <div class="med-card-stats">
        <span>⏱ ${entry.duration || '<1'} min</span>
        <span>🔄 ${entry.rounds} rounds</span>
      </div>
      ${entry.mood ? `<div class="med-card-mood">Mood after: ${entry.mood}/10</div>` : ''}
    `;
    card.querySelector('.entry-delete').addEventListener('click', (e) => {
      e.stopPropagation();
      card.style.transform = 'translateX(100%)';
      card.style.opacity = '0';
      const deletedMed = { ...entry };
      setTimeout(() => {
        deleteMeditation(entry.ts);
        renderMedHistory();
        showToast('Session deleted', () => {
          saveMeditation(deletedMed);
          renderMedHistory();
        });
      }, 300);
    });
    list.appendChild(card);
  });
}

// ── Background Canvas Animation ──
const medCanvas = {
  canvas: null, ctx: null, raf: null, active: false,
  phase: 'clean',
  crossfade: 1,
  particles: [],
  time: 0,
};

function initMedCanvas() {
  const c = document.getElementById('med-bg-canvas');
  if (!c) return;
  medCanvas.canvas = c;
  medCanvas.ctx = c.getContext('2d');
  medCanvas.particles = [];
  for (let i = 0; i < 25; i++) {
    medCanvas.particles.push({
      x: Math.random(), y: Math.random(),
      size: 20 + Math.random() * 40,
      speed: 0.0000026 + Math.random() * 0.000008,
      wobbleFreq: 0.07 + Math.random() * 0.2,
      wobbleAmp: 0.005 + Math.random() * 0.01,
      phase: Math.random() * Math.PI * 2,
      opacity: 0.2 + Math.random() * 0.4,
    });
  }
}

function startMedCanvasAnim() {
  if (!medCanvas.canvas) initMedCanvas();
  medCanvas.active = true;
  medCanvas.time = 0;
  medCanvas.phase = medState.phase;
  medCanvas.crossfade = 1;
  resizeMedCanvas();
  medCanvasLoop();
}

function stopMedCanvasAnim() {
  medCanvas.active = false;
  if (medCanvas.raf) cancelAnimationFrame(medCanvas.raf);
  medCanvas.raf = null;
}

function switchMedCanvasPhase(newPhase) {
  if (medCanvas.phase === newPhase) return;
  medCanvas.phase = newPhase;
  medCanvas.crossfade = 0;
}

function resizeMedCanvas() {
  const c = medCanvas.canvas;
  if (!c) return;
  const r = c.parentElement.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  c.width = r.width * dpr;
  c.height = r.height * dpr;
  c.style.width = r.width + 'px';
  c.style.height = r.height + 'px';
  medCanvas.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function medCanvasLoop() {
  if (!medCanvas.active) return;
  medCanvas.raf = requestAnimationFrame(medCanvasLoop);
  medCanvas.time += 1 / 60;

  if (medCanvas.crossfade < 1) medCanvas.crossfade = Math.min(1, medCanvas.crossfade + 0.008);

  const ctx = medCanvas.ctx;
  const w = medCanvas.canvas.width / (Math.min(window.devicePixelRatio || 1, 2));
  const h = medCanvas.canvas.height / (Math.min(window.devicePixelRatio || 1, 2));
  ctx.clearRect(0, 0, w, h);

  if (medCanvas.phase === 'clean') {
    if (medCanvas.crossfade < 1) drawAurora(ctx, w, h, 1 - medCanvas.crossfade);
    drawParticles(ctx, w, h, medCanvas.crossfade);
  } else {
    if (medCanvas.crossfade < 1) drawParticles(ctx, w, h, 1 - medCanvas.crossfade);
    drawAurora(ctx, w, h, medCanvas.crossfade);
  }
}

function drawParticles(ctx, w, h, alpha) {
  const t = medCanvas.time;
  medCanvas.particles.forEach(p => {
    p.y -= p.speed * 60;
    p.x += Math.sin(t * p.wobbleFreq + p.phase) * p.wobbleAmp;
    if (p.y < -0.05) { p.y = 1.05; p.x = Math.random(); }
    if (p.x < -0.05) p.x = 1.05;
    if (p.x > 1.05) p.x = -0.05;

    const px = p.x * w, py = p.y * h;
    const shimmer = 0.7 + 0.3 * Math.sin(t * 0.8 + p.phase);
    const op = p.opacity * alpha * shimmer;

    const grad = ctx.createRadialGradient(px, py, 0, px, py, p.size);
    grad.addColorStop(0, `rgba(212, 175, 120, ${op})`);
    grad.addColorStop(0.5, `rgba(196, 168, 130, ${op * 0.5})`);
    grad.addColorStop(1, `rgba(180, 150, 100, 0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(px, py, p.size, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawAurora(ctx, w, h, alpha) {
  const t = medCanvas.time;
  const waves = [
    { freq: 0.008, speed: 0.3, amp: 0.12, yOff: 0.4, color: [99, 102, 241] },
    { freq: 0.012, speed: 0.2, amp: 0.10, yOff: 0.5, color: [124, 109, 189] },
    { freq: 0.006, speed: 0.4, amp: 0.15, yOff: 0.55, color: [79, 70, 180] },
    { freq: 0.010, speed: 0.25, amp: 0.08, yOff: 0.45, color: [109, 90, 205] },
  ];

  waves.forEach(wave => {
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 4) {
      const nx = x / w;
      const y = h * (wave.yOff +
        wave.amp * Math.sin(nx / wave.freq * 0.01 + t * wave.speed) *
        Math.cos(nx * 3 + t * wave.speed * 0.7));
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.closePath();

    const [r, g, b] = wave.color;
    const grad = ctx.createLinearGradient(0, h * 0.3, 0, h);
    grad.addColorStop(0, `rgba(${r},${g},${b},${alpha * 0.15})`);
    grad.addColorStop(0.5, `rgba(${r},${g},${b},${alpha * 0.08})`);
    grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = grad;
    ctx.fill();
  });
}

// ── Web Audio: Ambient Sound ──
function createNoiseBuffer(ctx, seconds) {
  const sr = ctx.sampleRate;
  const len = sr * seconds;
  const buf = ctx.createBuffer(1, len, sr);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

function createNoiseSource(ctx, buffer) {
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  src.start(0);
  return src;
}

async function startAmbientSound() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    const ctx = new AC();
    medState.audioCtx = ctx;

    // iOS requires resume() from a user gesture — await it
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    // Play a silent buffer to fully unlock audio on iOS
    const unlock = ctx.createBuffer(1, 1, 22050);
    const unlockSrc = ctx.createBufferSource();
    unlockSrc.buffer = unlock;
    unlockSrc.connect(ctx.destination);
    unlockSrc.start(0);

    // Double-check it's running
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    
    console.log('Audio context state:', ctx.state, 'sampleRate:', ctx.sampleRate);

    const masterGain = ctx.createGain();
    masterGain.gain.value = medState.muted ? 0 : medState.volume;
    masterGain.connect(ctx.destination);

    const noiseBuf = createNoiseBuffer(ctx, 4);

    const cleanGain = ctx.createGain();
    const feelGain = ctx.createGain();
    cleanGain.connect(masterGain);
    feelGain.connect(masterGain);
    cleanGain.gain.value = medState.phase === 'clean' ? 1 : 0;
    feelGain.gain.value = medState.phase === 'feel' ? 1 : 0;

    // CLEAN PHASE
    const cleanNoise1 = createNoiseSource(ctx, noiseBuf);
    const cleanBrown = ctx.createBiquadFilter();
    cleanBrown.type = 'lowpass';
    cleanBrown.frequency.value = 200;
    cleanBrown.Q.value = 0.5;
    const cleanBandpass = ctx.createBiquadFilter();
    cleanBandpass.type = 'bandpass';
    cleanBandpass.frequency.value = 500;
    cleanBandpass.Q.value = 0.6;
    const cleanNoiseGain1 = ctx.createGain();
    cleanNoiseGain1.gain.value = 0.18;

    const cleanLfo = ctx.createOscillator();
    cleanLfo.type = 'sine';
    cleanLfo.frequency.value = 0.18;
    const cleanLfoGain = ctx.createGain();
    cleanLfoGain.gain.value = 0.09;
    cleanLfo.connect(cleanLfoGain);
    cleanLfoGain.connect(cleanNoiseGain1.gain);
    cleanLfo.start();

    cleanNoise1.connect(cleanBrown);
    cleanBrown.connect(cleanBandpass);
    cleanBandpass.connect(cleanNoiseGain1);
    cleanNoiseGain1.connect(cleanGain);

    const cleanNoise2 = createNoiseSource(ctx, noiseBuf);
    const cleanHighpass = ctx.createBiquadFilter();
    cleanHighpass.type = 'bandpass';
    cleanHighpass.frequency.value = 1800;
    cleanHighpass.Q.value = 0.8;
    const cleanNoiseGain2 = ctx.createGain();
    cleanNoiseGain2.gain.value = 0.03;
    const cleanLfo2 = ctx.createOscillator();
    cleanLfo2.type = 'sine';
    cleanLfo2.frequency.value = 0.25;
    const cleanLfo2Gain = ctx.createGain();
    cleanLfo2Gain.gain.value = 0.015;
    cleanLfo2.connect(cleanLfo2Gain);
    cleanLfo2Gain.connect(cleanNoiseGain2.gain);
    cleanLfo2.start();

    cleanNoise2.connect(cleanHighpass);
    cleanHighpass.connect(cleanNoiseGain2);
    cleanNoiseGain2.connect(cleanGain);

    // FEEL PHASE
    const feelNoise = createNoiseSource(ctx, noiseBuf);
    const feelLowpass = ctx.createBiquadFilter();
    feelLowpass.type = 'lowpass';
    feelLowpass.frequency.value = 600;
    feelLowpass.Q.value = 0.3;
    const feelNoiseGain = ctx.createGain();
    feelNoiseGain.gain.value = 0.06;
    feelNoise.connect(feelLowpass);
    feelLowpass.connect(feelNoiseGain);
    feelNoiseGain.connect(feelGain);

    const natureIntervals = [];

    function chirpBird(baseFreq, freqEnd, dur) {
      if (!medState.running) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq, t);
      osc.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.06, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(g);
      g.connect(feelGain);
      osc.start(t);
      osc.stop(t + dur);
    }

    function scheduleBird(minF, maxF, minEnd, maxEnd, minDur, maxDur, minInt, maxInt) {
      function go() {
        if (!medState.running) return;
        const f0 = minF + Math.random() * (maxF - minF);
        const f1 = minEnd + Math.random() * (maxEnd - minEnd);
        const dur = minDur + Math.random() * (maxDur - minDur);
        chirpBird(f0, f1, dur);
        if (Math.random() < 0.4) {
          setTimeout(() => chirpBird(f0 * 1.05, f1 * 0.95, dur * 0.8), dur * 1000 + 80);
        }
        const next = (minInt + Math.random() * (maxInt - minInt)) * 1000;
        const tid = setTimeout(go, next);
        natureIntervals.push(tid);
      }
      const tid = setTimeout(go, (minInt + Math.random() * (maxInt - minInt)) * 1000);
      natureIntervals.push(tid);
    }

    scheduleBird(2000, 2800, 3200, 4200, 0.06, 0.1, 2, 5);
    scheduleBird(1600, 2200, 2600, 3400, 0.08, 0.12, 3, 6);
    scheduleBird(1200, 1600, 1800, 2400, 0.1, 0.15, 4, 7);

    function playBubble() {
      if (!medState.running) return;
      const t = ctx.currentTime;
      const freq = 400 + Math.random() * 400;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.045, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      osc.connect(g);
      g.connect(feelGain);
      osc.start(t);
      osc.stop(t + 0.45);
      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.value = freq * 1.01;
      const g2 = ctx.createGain();
      g2.gain.setValueAtTime(0, t + 0.12);
      g2.gain.linearRampToValueAtTime(0.015, t + 0.13);
      g2.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc2.connect(g2);
      g2.connect(feelGain);
      osc2.start(t + 0.12);
      osc2.stop(t + 0.55);
    }
    function scheduleBubbles() {
      function go() {
        if (!medState.running) return;
        playBubble();
        const tid = setTimeout(go, (3 + Math.random() * 5) * 1000);
        natureIntervals.push(tid);
      }
      const tid = setTimeout(go, (3 + Math.random() * 5) * 1000);
      natureIntervals.push(tid);
    }
    scheduleBubbles();

    function playBee() {
      if (!medState.running) return;
      const t = ctx.currentTime;
      const freq = 120 + Math.random() * 60;
      const dur = 5 + Math.random() * 5;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.frequency.linearRampToValueAtTime(freq + (Math.random() * 30 - 15), t + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.025, t + dur * 0.4);
      g.gain.linearRampToValueAtTime(0, t + dur);
      osc.connect(g);
      g.connect(feelGain);
      osc.start(t);
      osc.stop(t + dur + 0.1);
    }
    function scheduleBee() {
      function go() {
        if (!medState.running) return;
        playBee();
        const tid = setTimeout(go, (15 + Math.random() * 15) * 1000);
        natureIntervals.push(tid);
      }
      const tid = setTimeout(go, (15 + Math.random() * 15) * 1000);
      natureIntervals.push(tid);
    }
    scheduleBee();

    medState.ambientNodes = {
      ctx, masterGain, cleanGain, feelGain, noiseBuf,
      cleanNoise1, cleanNoise2, cleanLfo, cleanLfo2,
      feelNoise,
      natureIntervals,
    };
  } catch(e) { console.error('Audio error:', e); }
}

function updateAmbientTone() {
  if (!medState.ambientNodes) return;
  const { cleanGain, feelGain } = medState.ambientNodes;
  const t = medState.audioCtx.currentTime;
  const isClean = medState.phase === 'clean';
  cleanGain.gain.linearRampToValueAtTime(isClean ? 1 : 0, t + 2);
  feelGain.gain.linearRampToValueAtTime(isClean ? 0 : 1, t + 2);
}

function updateAmbientVolume() {
  if (!medState.ambientNodes) return;
  const { masterGain } = medState.ambientNodes;
  const vol = medState.muted ? 0 : medState.volume;
  masterGain.gain.linearRampToValueAtTime(vol, medState.audioCtx.currentTime + 0.1);
}

function stopAmbientSound() {
  if (!medState.ambientNodes) return;
  try {
    const n = medState.ambientNodes;
    if (n.natureIntervals) n.natureIntervals.forEach(id => clearTimeout(id));
    try { n.cleanNoise1.stop(); } catch {}
    try { n.cleanNoise2.stop(); } catch {}
    try { n.cleanLfo.stop(); } catch {}
    try { n.cleanLfo2.stop(); } catch {}
    try { n.feelNoise.stop(); } catch {}
    n.ctx.close();
  } catch {}
  medState.ambientNodes = null;
  medState.audioCtx = null;
}

function playChime() {
  try {
    const ctx = medState.audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const t = ctx.currentTime;
    const vol = medState.muted ? 0 : Math.min(medState.volume * 0.4, 0.2);

    const partials = [
      { freq: 528,  gain: 1.0,  decay: 3.5 },
      { freq: 530,  gain: 0.3,  decay: 3.0 },
      { freq: 1580, gain: 0.15, decay: 2.0 },
      { freq: 2640, gain: 0.06, decay: 1.2 },
    ];

    partials.forEach(p => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = p.freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol * p.gain, t);
      g.gain.setValueAtTime(vol * p.gain, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + p.decay);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + p.decay + 0.1);
    });
  } catch {}
}
