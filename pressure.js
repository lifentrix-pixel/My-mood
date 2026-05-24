/* ── Overhead / Pressure Dump ── */

const PRESSURE_KIND = 'pressure_item';
const PRESSURE_PILES = [
  { id: 'avoided_tasks', label: 'Avoided To-Do', icon: '✓', color: '#fb7185', todoCategory: 'important' },
  { id: 'subscriptions', label: 'Time Running Out', icon: '⏳', color: '#fbbf24', todoCategory: 'urgent' },
  { id: 'finance', label: 'Money', icon: '€', color: '#34d399', todoCategory: 'important' },
  { id: 'work', label: 'Work', icon: '⚙', color: '#38bdf8', todoCategory: 'urgent' },
  { id: 'personal', label: 'Personal', icon: '♡', color: '#f472b6', todoCategory: 'other' },
  { id: 'home', label: 'Home', icon: '⌂', color: '#a78bfa', todoCategory: 'other' },
];

let selectedPressurePile = 'avoided_tasks';
let pressureShowDone = false;

function pressureEscape(value) {
  return typeof escapeTimerHtml === 'function'
    ? escapeTimerHtml(value)
    : String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      }[char]));
}

function pressurePile(id) {
  return PRESSURE_PILES.find(pile => pile.id === id) || PRESSURE_PILES[0];
}

function loadPressureItems() {
  return loadTodos().filter(todo => todo.kind === PRESSURE_KIND);
}

function savePressureTodos(todos) {
  saveTodos(todos);
  if (typeof syncToSupabase === 'function') setTimeout(() => syncToSupabase(false), 500);
}

function activePressureItems() {
  return loadPressureItems().filter(item => !item.completed && item.status !== 'converted');
}

function pressureDueLabel(dateValue) {
  if (!dateValue) return '';
  const due = new Date(`${dateValue}T12:00:00`);
  const today = startOfDay(new Date());
  const diff = Math.round((startOfDay(due).getTime() - today.getTime()) / 86400000);
  if (diff < 0) return `${Math.abs(diff)}d late`;
  if (diff === 0) return 'today';
  if (diff === 1) return 'tomorrow';
  return `${diff}d`;
}

function pressureAgeLabel(ts) {
  const diff = Date.now() - (ts || Date.now());
  const days = Math.floor(diff / 86400000);
  if (days > 0) return `${days}d`;
  const hours = Math.floor(diff / 3600000);
  if (hours > 0) return `${hours}h`;
  return 'now';
}

function updatePressureSlider() {
  const slider = $('#pressure-level');
  const valueEl = $('#pressure-level-value');
  if (!slider || !valueEl) return;
  const value = parseInt(slider.value, 10) || 3;
  valueEl.textContent = value;
  const pct = ((value - 1) / 4) * 100;
  const color = value >= 5 ? '#fb7185' : value >= 4 ? '#f97316' : value >= 3 ? '#fbbf24' : '#34d399';
  slider.style.background = `linear-gradient(to right, ${color} 0%, ${color} ${pct}%, rgba(255,255,255,0.08) ${pct}%)`;
}

function renderPressurePilePicker() {
  const host = $('#pressure-pile-picker');
  if (!host) return;
  host.innerHTML = PRESSURE_PILES.map(pile => `
    <button type="button" class="pressure-pile-chip ${pile.id === selectedPressurePile ? 'active' : ''}" data-pile="${pile.id}" style="--pile-color:${pile.color}">
      <span>${pile.icon}</span>
      <strong>${pile.label}</strong>
    </button>
  `).join('');
}

function renderPressureMeter(items) {
  const meter = $('#pressure-meter');
  if (!meter) return;
  const total = items.reduce((sum, item) => sum + (parseInt(item.pressure, 10) || 1), 0);
  const level = total >= 28 ? 'Heavy' : total >= 14 ? 'Stacked' : total > 0 ? 'Held' : 'Clear';
  meter.innerHTML = `
    <strong>${total}</strong>
    <span>${level}</span>
  `;
}

function renderPressurePiles(items) {
  const host = $('#pressure-piles');
  if (!host) return;
  host.innerHTML = PRESSURE_PILES.map(pile => {
    const pileItems = items.filter(item => item.pile === pile.id);
    const weight = pileItems.reduce((sum, item) => sum + (parseInt(item.pressure, 10) || 1), 0);
    const blocks = Math.max(1, Math.min(7, Math.ceil(weight / 3)));
    const stack = Array.from({ length: blocks }, (_, i) => {
      const width = Math.max(34, 82 - i * 7 - pileItems.length * 2);
      return `<span class="pressure-stack-block" style="--pile-color:${pile.color};--block-width:${width}%;--delay:${i * 70}ms"></span>`;
    }).join('');
    return `
      <article class="pressure-pile-card" style="--pile-color:${pile.color}">
        <div class="pressure-pile-visual">${stack}</div>
        <div class="pressure-pile-info">
          <span>${pile.icon}</span>
          <strong>${pile.label}</strong>
          <small>${pileItems.length} item${pileItems.length === 1 ? '' : 's'} · ${weight} pressure</small>
        </div>
      </article>
    `;
  }).join('');
}

function renderPressureList() {
  const host = $('#pressure-list');
  if (!host) return;
  const items = loadPressureItems()
    .filter(item => pressureShowDone ? item.completed || item.status === 'converted' : !item.completed && item.status !== 'converted')
    .sort((a, b) => {
      const dueA = a.dueDate ? new Date(`${a.dueDate}T12:00:00`).getTime() : Infinity;
      const dueB = b.dueDate ? new Date(`${b.dueDate}T12:00:00`).getTime() : Infinity;
      if (dueA !== dueB) return dueA - dueB;
      return (b.pressure || 1) - (a.pressure || 1);
    });

  if (!items.length) {
    host.innerHTML = `
      <div class="pressure-empty">
        <strong>${pressureShowDone ? 'No released items yet' : 'Nothing hovering here right now'}</strong>
        <span>${pressureShowDone ? 'Released and converted items will collect here.' : 'The piles will grow when something gets dropped in.'}</span>
      </div>
    `;
    return;
  }

  host.innerHTML = items.map(item => {
    const pile = pressurePile(item.pile);
    const due = pressureDueLabel(item.dueDate);
    const converted = item.status === 'converted';
    return `
      <article class="pressure-item" style="--pile-color:${pile.color}">
        <div class="pressure-item-top">
          <span class="pressure-item-pile">${pile.icon} ${pressureEscape(pile.label)}</span>
          <span class="pressure-item-score">${pressureEscape(item.pressure || 1)}/5</span>
        </div>
        <h3>${pressureEscape(item.text)}</h3>
        ${item.notes ? `<p>${pressureEscape(item.notes)}</p>` : ''}
        <div class="pressure-item-meta">
          ${due ? `<span>${pressureEscape(due)}</span>` : ''}
          <span>${pressureEscape(pressureAgeLabel(item.createdAt))}</span>
          ${converted ? '<span>to-do made</span>' : ''}
        </div>
        <div class="pressure-item-actions">
          ${!pressureShowDone ? `<button type="button" data-pressure-action="todo" data-pressure-id="${pressureEscape(item.id)}">To-Do</button>` : ''}
          ${!pressureShowDone ? `<button type="button" data-pressure-action="done" data-pressure-id="${pressureEscape(item.id)}">Done</button>` : ''}
          <button type="button" data-pressure-action="delete" data-pressure-id="${pressureEscape(item.id)}">Delete</button>
        </div>
      </article>
    `;
  }).join('');
}

function renderPressurePage() {
  const page = $('.pressure-page');
  if (!page) return;
  const items = activePressureItems();
  renderPressurePilePicker();
  renderPressureMeter(items);
  renderPressurePiles(items);
  renderPressureList();
  updatePressureSlider();
  const doneBtn = $('#pressure-show-done');
  if (doneBtn) doneBtn.classList.toggle('active', pressureShowDone);
}

function savePressureItem() {
  const textEl = $('#pressure-text');
  const text = (textEl?.value || '').trim();
  if (!text) {
    showToast('Add the thing first');
    textEl?.focus();
    return;
  }

  const pressure = parseInt($('#pressure-level')?.value, 10) || 3;
  const dueDate = $('#pressure-due')?.value || '';
  const now = Date.now();
  const todos = loadTodos();
  todos.push({
    id: `pressure-${now}-${Math.random().toString(36).slice(2, 6)}`,
    kind: PRESSURE_KIND,
    text,
    pile: selectedPressurePile,
    category: pressurePile(selectedPressurePile).todoCategory,
    priority: pressure,
    pressure,
    dueDate,
    completed: false,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
    notes: '',
    source: 'phone_app',
    schema_version: 1,
  });
  savePressureTodos(todos);
  textEl.value = '';
  const due = $('#pressure-due');
  if (due) due.value = '';
  showToast('Dropped into a pile');
  renderPressurePage();
}

function convertPressureToTodo(id) {
  const todos = loadTodos();
  const item = todos.find(todo => todo.id === id && todo.kind === PRESSURE_KIND);
  if (!item) return;
  const pile = pressurePile(item.pile);
  const now = Date.now();
  todos.push({
    id: `todo-${now}-${Math.random().toString(36).slice(2, 6)}`,
    text: item.text,
    category: pile.todoCategory,
    priority: item.pressure || 3,
    notes: [
      item.dueDate ? `Date: ${item.dueDate}` : '',
      `From overhead pile: ${pile.label}`,
      item.notes || '',
    ].filter(Boolean).join('\n'),
    completed: false,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
    sourcePressureId: item.id,
  });
  item.status = 'converted';
  item.completed = true;
  item.completedAt = now;
  item.updatedAt = now;
  savePressureTodos(todos);
  showToast('Moved into To-Do');
  renderPressurePage();
  if (typeof renderTodos === 'function') renderTodos();
}

function completePressureItem(id) {
  const todos = loadTodos();
  const item = todos.find(todo => todo.id === id && todo.kind === PRESSURE_KIND);
  if (!item) return;
  item.completed = true;
  item.completedAt = Date.now();
  item.updatedAt = Date.now();
  item.status = 'released';
  savePressureTodos(todos);
  showToast('Released');
  renderPressurePage();
}

function deletePressureItem(id) {
  const todos = loadTodos();
  const item = todos.find(todo => todo.id === id && todo.kind === PRESSURE_KIND);
  if (!item) return;
  savePressureTodos(todos.filter(todo => todo.id !== id));
  if (typeof deleteFromSupabase === 'function') deleteFromSupabase('todos', id).catch(() => {});
  showToast('Deleted');
  renderPressurePage();
}

function initPressurePage() {
  const page = $('.pressure-page');
  if (!page || page.dataset.bound === 'true') return;
  page.dataset.bound = 'true';

  $('#pressure-pile-picker')?.addEventListener('click', event => {
    const button = event.target.closest('button[data-pile]');
    if (!button) return;
    selectedPressurePile = button.dataset.pile;
    renderPressurePilePicker();
  });

  $('#pressure-level')?.addEventListener('input', updatePressureSlider);
  $('#pressure-save')?.addEventListener('click', savePressureItem);
  $('#pressure-text')?.addEventListener('keydown', event => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') savePressureItem();
  });

  $('#pressure-show-done')?.addEventListener('click', () => {
    pressureShowDone = !pressureShowDone;
    renderPressurePage();
  });

  $('#pressure-list')?.addEventListener('click', event => {
    const button = event.target.closest('button[data-pressure-action]');
    if (!button) return;
    const id = button.dataset.pressureId;
    if (button.dataset.pressureAction === 'todo') convertPressureToTodo(id);
    if (button.dataset.pressureAction === 'done') completePressureItem(id);
    if (button.dataset.pressureAction === 'delete') deletePressureItem(id);
  });

  renderPressurePage();
}

window.initPressurePage = initPressurePage;
window.renderPressurePage = renderPressurePage;

document.addEventListener('DOMContentLoaded', initPressurePage);
