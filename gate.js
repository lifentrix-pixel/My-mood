/* ── Innerscape gate ──
   Opened by the iPhone Shortcut ("When Instagram is opened") with ?s=<session id>&app=instagram.
   It never holds the tracker key: the fresh session id is the only permission it needs,
   and the database only honours it for 15 minutes. */

const GATE_SUPABASE_URL = 'https://dfjmuykhbqicpngxpbbe.supabase.co';
const GATE_SUPABASE_KEY = 'sb_publishable_84CJgj00hojh_ZliQP2vcg_SYGYHYsD';

const GATE_APPS = {
  instagram: { name: 'Instagram', open: 'instagram://' },
  youtube: { name: 'YouTube', open: 'youtube://' },
};

const GATE_REASONS = [
  ['social', 'Friends · messages'],
  ['specific', 'A specific thing'],
  ['inspiration', 'Inspiration'],
  ['post', 'Post something'],
  ['break', 'A real break'],
  ['learning', 'Learning'],
  ['music', 'Music · background'],
  ['autopilot', 'Bored · autopilot'],
];
const GATE_PULLS = ['Tired', 'Anxious', 'Lonely', 'Restless', 'Need comfort'];
const GATE_MINUTES = [5, 10, 20, 30];
const GATE_RAMPS = ['Phone down', '3 breaths', 'Glass of water', 'Stand up'];

const gateEl = document.querySelector('.gate');
const params = new URLSearchParams(location.search);
const sessionId = params.get('s') || '';
const app = GATE_APPS[params.get('app')] || GATE_APPS.instagram;
const choice = { reason: null, pull: null, minutes: 10 };

async function gateRpc(fn, body) {
  const res = await fetch(`${GATE_SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: GATE_SUPABASE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${fn} ${res.status}`);
  return res.json();
}

function setStep(step) {
  gateEl.dataset.step = step;
  window.scrollTo(0, 0);
}

function gone(message) {
  if (message) document.getElementById('gone-copy').textContent = message;
  setStep('gone');
}

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function renderChoices(container, items, isOn, onPick) {
  container.replaceChildren(...items.map(([value, label]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'choice';
    b.textContent = label;
    b.setAttribute('aria-pressed', String(isOn(value)));
    b.addEventListener('click', () => onPick(value));
    return b;
  }));
}

function renderChoose() {
  renderChoices(document.getElementById('reasons'), GATE_REASONS, (v) => choice.reason === v, (v) => {
    choice.reason = v;
    renderChoose();
  });
  renderChoices(document.getElementById('pulls'), GATE_PULLS.map((p) => [p, p]), (v) => choice.pull === v, (v) => {
    choice.pull = choice.pull === v ? null : v;
    renderChoose();
  });
  renderChoices(document.getElementById('durations'), GATE_MINUTES.map((m) => [m, `${m}m`]), (v) => choice.minutes === v, (v) => {
    choice.minutes = v;
    renderChoose();
  });
  gateEl.dataset.mood = choice.reason === 'autopilot' ? 'autopilot' : '';
  const enter = document.getElementById('enter');
  enter.disabled = !choice.reason;
  enter.textContent = choice.reason ? `Enter for ${choice.minutes} min` : 'Choose a reason to enter';
}

async function enter() {
  const enterBtn = document.getElementById('enter');
  enterBtn.disabled = true;
  const label = GATE_REASONS.find(([id]) => id === choice.reason)[1];
  try {
    const r = await gateRpc('brainrot_gate_choose', {
      s: sessionId, purpose_text: label, pull_text: choice.pull || '', minutes: choice.minutes,
    });
    if (!r.ok) return gone();
  } catch {
    enterBtn.disabled = false;
    enterBtn.textContent = 'Couldn’t reach Innerscape. Try again';
    return;
  }
  document.getElementById('entered-title').textContent = choice.reason === 'autopilot'
    ? `Honest answer. ${choice.minutes} minutes, then out.`
    : `${choice.minutes} minutes. Go get it.`;
  document.getElementById('recap-reason').textContent = label;
  document.getElementById('recap-pull').textContent = choice.pull || 'none named';
  document.getElementById('recap-min').textContent = `${choice.minutes} min`;
  const go = document.getElementById('continue');
  go.textContent = `Continue to ${app.name}`;
  go.href = app.open;
  setStep('entered');
}

async function turnBack(ramp = '') {
  try {
    const r = await gateRpc('brainrot_gate_turn_back', { s: sessionId, ramp });
    if (!r.ok) return gone();
    if (!ramp) {
      const n = r.turn_backs_week || 1;
      document.getElementById('turned-copy').textContent =
        `That’s your ${ordinal(n)} turn-back this week. It’s logged as a catch.`;
    }
  } catch {
    if (!ramp) return gone('Couldn’t reach Innerscape, so this turn-back wasn’t saved. It still counts.');
  }
  setStep('turned');
}

function renderRamps(picked) {
  renderChoices(document.getElementById('ramps'), GATE_RAMPS.map((r) => [r, r]), (v) => v === picked, (v) => {
    renderRamps(v);
    turnBack(v);
  });
}

async function init() {
  document.getElementById('beyond').textContent = `${app.name.toUpperCase()} IS BEYOND THE GATE`;
  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) return gone('This page opens from your iPhone Shortcut, with a fresh link each time.');

  try {
    const info = await gateRpc('brainrot_gate_info', { s: sessionId });
    if (!info.ok) return gone();
    if (info.turned_back) return setStep('turned');
    const today = document.getElementById('today');
    today.textContent = `${ordinal(info.opens_today)} time today · ${info.minutes_today} min so far`;
    today.hidden = false;
  } catch {
    // Offline: still let the gate do its job; the choice just won't be saved.
  }

  renderChoose();
  renderRamps(null);
  document.getElementById('enter').addEventListener('click', enter);
  document.getElementById('turn-back').addEventListener('click', () => turnBack());
  setStep('choose');
}

init();
