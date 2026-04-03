/* ── To-Do System Module ── */

const TODO_CATEGORIES = [
  { id: 'important', label: '🔴 Important', color: '#F44336' },
  { id: 'urgent',    label: '🟠 Urgent',    color: '#FF9800' },
  { id: 'other',     label: '🔵 Other',     color: '#42A5F5' },
];

let editingTodoId = null;
let todoSelectedPriority = 3;

function initTodos() {
  $$('.todo-add-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      openTodoModal(btn.dataset.category);
    });
  });

  $('#todo-cancel').addEventListener('click', closeTodoModal);
  $('#todo-save').addEventListener('click', saveTodo);

  $$('.todo-priority-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.todo-priority-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      todoSelectedPriority = parseInt(btn.dataset.priority);
    });
  });

  $('#todo-show-completed').addEventListener('click', () => {
    const list = $('#todo-completed-list');
    list.classList.toggle('hidden');
  });
}

function renderTodos() {
  const todos = loadTodos();
  const active = todos.filter(t => !t.completed);
  const completed = todos.filter(t => t.completed);

  TODO_CATEGORIES.forEach(cat => {
    const catTodos = active
      .filter(t => t.category === cat.id)
      .sort((a, b) => b.priority - a.priority);

    const listEl = $(`#todo-list-${cat.id}`);
    const emptyEl = $(`#todo-empty-${cat.id}`);
    listEl.innerHTML = '';

    if (!catTodos.length) {
      emptyEl.classList.add('show');
      return;
    }
    emptyEl.classList.remove('show');

    catTodos.forEach(todo => {
      listEl.appendChild(buildTodoItem(todo));
    });
  });

  const completedList = $('#todo-completed-list');
  const completedCount = $('#completed-count');
  completedList.innerHTML = '';
  completedCount.textContent = completed.length ? `(${completed.length})` : '';

  completed.sort((a, b) => b.completedAt - a.completedAt).forEach(todo => {
    completedList.appendChild(buildTodoItem(todo));
  });
}

function buildTodoItem(todo) {
  const item = document.createElement('div');
  item.className = 'todo-item' + (todo.completed ? ' completed' : '');
  const progressLog = todo.progress || [];
  const progressHtml = !todo.completed && progressLog.length ? `
    <div class="todo-progress-log">
      ${progressLog.slice(-3).map(p => {
        const d = new Date(p.ts);
        const timeAgo = formatTodoTimeAgo(p.ts);
        return `<span class="todo-progress-entry">🔨 ${timeAgo}</span>`;
      }).join('')}
      ${progressLog.length > 3 ? `<span class="todo-progress-more">+${progressLog.length - 3} more</span>` : ''}
    </div>
  ` : '';

  item.innerHTML = `
    <div class="todo-checkbox ${todo.completed ? 'checked' : ''}">${todo.completed ? '✓' : ''}</div>
    <div class="todo-content">
      <div class="todo-text">${todo.text}</div>
      ${todo.notes ? `<div class="todo-notes-display">${todo.notes}</div>` : ''}
      ${progressHtml}
    </div>
    <div class="todo-priority" data-priority="${todo.priority}">${todo.priority}</div>
    <div class="todo-actions">
      ${!todo.completed ? '<button class="todo-worked-btn" title="Worked on it">🔨</button>' : ''}
      <button class="todo-edit-btn" title="Edit">✏️</button>
      <button class="todo-delete-btn" title="Delete">×</button>
    </div>
  `;

  item.querySelector('.todo-checkbox').addEventListener('click', () => toggleTodo(todo.id));
  const workedBtn = item.querySelector('.todo-worked-btn');
  if (workedBtn) {
    workedBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      logTodoProgress(todo.id);
    });
  }
  item.querySelector('.todo-edit-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    openTodoModal(todo.category, todo);
  });
  item.querySelector('.todo-delete-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    deleteTodo(todo.id);
  });

  return item;
}

function openTodoModal(category, existingTodo) {
  editingTodoId = existingTodo ? existingTodo.id : null;
  $('#todo-modal-title').textContent = existingTodo ? 'Edit Task' : 'Add Task';
  $('#todo-save').textContent = existingTodo ? 'Save Changes' : 'Save Task';
  $('#todo-modal').classList.remove('hidden');
  $('#todo-text').value = existingTodo ? existingTodo.text : '';
  $('#todo-category').value = category || 'important';
  $('#todo-notes').value = existingTodo ? (existingTodo.notes || '') : '';

  todoSelectedPriority = existingTodo ? existingTodo.priority : 3;
  $$('.todo-priority-btn').forEach(btn => {
    btn.classList.toggle('selected', parseInt(btn.dataset.priority) === todoSelectedPriority);
  });

  setTimeout(() => $('#todo-text').focus(), 100);
}

function closeTodoModal() {
  $('#todo-modal').classList.add('hidden');
  editingTodoId = null;
}

function saveTodo() {
  const saveBtn = $('#todo-save');
  if (saveBtn.disabled) return;
  saveBtn.disabled = true;

  try {
    const text = $('#todo-text').value.trim();
    if (!text) {
      showToast('Enter a task');
      $('#todo-text').focus();
      saveBtn.disabled = false;
      return;
    }

    const category = $('#todo-category').value;
    const notes = $('#todo-notes').value.trim();
    const todos = loadTodos();

    if (editingTodoId) {
      const todo = todos.find(t => t.id === editingTodoId);
      if (todo) {
        todo.text = text;
        todo.category = category;
        todo.priority = todoSelectedPriority;
        todo.notes = notes;
        todo.updatedAt = Date.now();
      }
    } else {
      todos.push({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        text,
        category,
        priority: todoSelectedPriority,
        notes,
        completed: false,
        completedAt: null,
        createdAt: Date.now(),
      });
    }

    saveTodos(todos);
    closeTodoModal();
    renderTodos();
    showToast(editingTodoId ? 'Task updated ✓' : 'Task added ✓');

  } finally {
    setTimeout(() => { saveBtn.disabled = false; }, 1000);
  }
}

function toggleTodo(id) {
  const todos = loadTodos();
  const todo = todos.find(t => t.id === id);
  if (!todo) return;

  todo.completed = !todo.completed;
  todo.completedAt = todo.completed ? Date.now() : null;
  saveTodos(todos);
  renderTodos();
  showToast(todo.completed ? 'Task completed ✓' : 'Task reopened');
}

function logTodoProgress(id) {
  const todos = loadTodos();
  const todo = todos.find(t => t.id === id);
  if (!todo) return;

  if (!todo.progress) todo.progress = [];
  todo.progress.push({ ts: Date.now() });
  saveTodos(todos);
  renderTodos();
  showToast('Progress logged 🔨');
}

function formatTodoTimeAgo(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function deleteTodo(id) {
  const todos = loadTodos();
  const deleted = todos.find(t => t.id === id);
  if (!deleted) return;

  saveTodos(todos.filter(t => t.id !== id));
  renderTodos();
  showToast('Task deleted', () => {
    const current = loadTodos();
    current.push(deleted);
    saveTodos(current);
    renderTodos();
  });
}
