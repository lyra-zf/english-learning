/* ============================================================
   English Learning App — app.js
   All localStorage keys are prefixed with "el_"
   ============================================================ */

'use strict';

// ─── Storage helpers ──────────────────────────────────────────────────────────

const KEY = {
  goal:     'el_goal',
  tasks:    'el_tasks',
  resources:'el_resources',
  checkins: 'el_checkins',
  reminder: 'el_reminder',
  reviews:  'el_reviews',
};

function load(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// ─── Unique ID ────────────────────────────────────────────────────────────────

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function todayStr() {
  const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}-${String(n.getDate()).padStart(2,"0")}`;
}

function formatDate(str) {
  const d = new Date(str + 'T00:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── Modal helpers ────────────────────────────────────────────────────────────

function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

document.addEventListener('click', e => {
  const close = e.target.closest('[data-close]');
  if (close) closeModal(close.dataset.close);

  // Close on overlay click
  if (e.target.classList.contains('modal-overlay')) {
    closeModal(e.target.id);
  }
});

// ─── Tabs ─────────────────────────────────────────────────────────────────────

function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');

      if (btn.dataset.tab === 'progress') renderChart(currentChartRange);
    });
  });
}

// ─── PLAN: Goal ───────────────────────────────────────────────────────────────

function initGoal() {
  renderGoal();

  document.getElementById('openGoalModal').addEventListener('click', () => {
    document.getElementById('goalInput').value = load(KEY.goal, '');
    openModal('goalModal');
  });

  document.getElementById('saveGoal').addEventListener('click', () => {
    const val = document.getElementById('goalInput').value.trim();
    save(KEY.goal, val);
    renderGoal();
    closeModal('goalModal');
  });
}

function renderGoal() {
  const goal = load(KEY.goal, '');
  document.getElementById('goalText').textContent =
    goal || '暂未设置目标，点击"设置目标"开始。No goal set yet. Click "Set Goal" to get started.';
}

// ─── PLAN: Date navigation ────────────────────────────────────────────────────

const TYPE_LABELS = {
  listening:  '🔊 听力 Listening',
  speaking:   '🎤 口语 Speaking',
  reading:    '📖 阅读 Reading',
  writing:    '✏️ 写作 Writing',
  vocabulary: '📘 词汇 Vocabulary',
};

const SCHEDULE_LABELS = {
  daily:   '每日 Daily',
  weekday: '工作日 Weekday',
  weekend: '周末 Weekend',
  date:    '指定日期 Specific Date',
};

const WEEKDAY_ZH = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const WEEKDAY_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MAX_NAV_DAYS = 7;

// Current date the Plan tab is viewing (YYYY-MM-DD string)
let currentPlanDate = todayStr();

function offsetDate(str, days) {
  const d = new Date(str + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function initDateNav() {
  renderDateNav();
  document.getElementById('planPrevDay').addEventListener('click', () => {
    currentPlanDate = offsetDate(currentPlanDate, -1);
    renderDateNav();
    renderTasks();
  });
  document.getElementById('planNextDay').addEventListener('click', () => {
    currentPlanDate = offsetDate(currentPlanDate, +1);
    renderDateNav();
    renderTasks();
  });
}

function renderDateNav() {
  const today  = todayStr();
  const d      = new Date(currentPlanDate + 'T00:00:00');
  const dow    = d.getDay();
  const isToday = currentPlanDate === today;
  const daysBefore = Math.round((new Date(today + 'T00:00:00') - new Date(currentPlanDate + 'T00:00:00')) / 86400000);
  const daysAfter  = -daysBefore;

  // Format label
  const monthDay = d.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
  const todayBadge = isToday ? ' <span class="date-today-badge">今天 Today</span>' : '';
  document.getElementById('planDateLabel').innerHTML =
    `${monthDay} ${WEEKDAY_ZH[dow]} / ${WEEKDAY_EN[dow]}${todayBadge}`;

  // Update section title
  document.getElementById('taskSectionTitle').textContent =
    isToday ? '今日任务 Today\'s Tasks' : `${monthDay} 任务 Tasks`;

  // Arrow states
  document.getElementById('planPrevDay').disabled = daysBefore >= MAX_NAV_DAYS;
  document.getElementById('planNextDay').disabled = daysAfter  >= MAX_NAV_DAYS;
}

// ─── PLAN: Completions (per-date) ─────────────────────────────────────────────

function getCompletions(dateStr) {
  const all = load('el_completions', {});
  return all[dateStr] || [];
}

function setCompletion(dateStr, taskId, done) {
  const all  = load('el_completions', {});
  const list = all[dateStr] ? [...all[dateStr]] : [];
  if (done && !list.includes(taskId)) list.push(taskId);
  if (!done) { const i = list.indexOf(taskId); if (i !== -1) list.splice(i, 1); }
  all[dateStr] = list;
  save('el_completions', all);
}

// ─── PLAN: Task visibility for a given date ───────────────────────────────────

function taskVisibleOnDate(t, dateStr) {
  const d   = new Date(dateStr + 'T00:00:00');
  const dow = d.getDay(); // 0=Sun,1=Mon,...,6=Sat
  if (t.schedule === 'daily')   return true;
  if (t.schedule === 'weekday') return dow >= 1 && dow <= 5;
  if (t.schedule === 'weekend') return dow === 0 || dow === 6;
  if (t.schedule === 'date')    return t.date === dateStr;
  // legacy fallbacks
  if (t.schedule === 'weekly')  return dow === 0 || dow === 6;
  if (t.schedule === 'once')    return (t.createdAt || '') === dateStr;
  return false;
}

// ─── PLAN: Tasks ──────────────────────────────────────────────────────────────

let taskFilter = 'all';

function initTasks() {
  renderTasks();

  // Show/hide date field based on schedule selection
  document.getElementById('taskSchedule').addEventListener('change', function () {
    document.getElementById('taskDateRow').style.display =
      this.value === 'date' ? '' : 'none';
  });

  document.getElementById('openTaskModal').addEventListener('click', () => {
    clearTaskForm();
    document.getElementById('taskModalTitle').textContent = '添加任务 Add Task';
    openModal('taskModal');
  });

  document.getElementById('saveTask').addEventListener('click', saveTask);

  document.querySelectorAll('[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      taskFilter = btn.dataset.filter;
      renderTasks();
    });
  });
}

function clearTaskForm() {
  document.getElementById('taskEditId').value    = '';
  document.getElementById('taskName').value      = '';
  document.getElementById('taskType').value      = 'listening';
  document.getElementById('taskDuration').value  = '30';
  document.getElementById('taskSchedule').value  = 'date';
  document.getElementById('taskDate').value      = currentPlanDate;
  document.getElementById('taskDateRow').style.display = '';
}

function saveTask() {
  const name = document.getElementById('taskName').value.trim();
  if (!name) { document.getElementById('taskName').focus(); return; }

  const tasks    = load(KEY.tasks, []);
  const editId   = document.getElementById('taskEditId').value;
  const schedule = document.getElementById('taskSchedule').value;

  const data = {
    name,
    type:     document.getElementById('taskType').value,
    duration: parseInt(document.getElementById('taskDuration').value, 10) || 30,
    schedule,
    done:     false,
  };
  if (schedule === 'date') {
    data.date = document.getElementById('taskDate').value || currentPlanDate;
  }

  if (editId) {
    const idx = tasks.findIndex(t => t.id === editId);
    if (idx !== -1) { tasks[idx] = { ...tasks[idx], ...data }; }
  } else {
    tasks.push({ id: uid(), createdAt: todayStr(), ...data });
  }

  save(KEY.tasks, tasks);
  renderTasks();
  closeModal('taskModal');
}

function renderTasks() {
  const tasks      = load(KEY.tasks, []);
  const list       = document.getElementById('taskList');
  const completions = getCompletions(currentPlanDate);

  // First filter by date visibility, then by type
  let visible = tasks.filter(t => taskVisibleOnDate(t, currentPlanDate));
  if (taskFilter !== 'all') {
    visible = visible.filter(t => t.type === taskFilter);
  }

  if (visible.length === 0) {
    list.innerHTML = `<li class="empty-state">今天没有安排任务 No tasks for today</li>`;
    return;
  }

  list.innerHTML = visible.map(t => {
    const done = completions.includes(t.id);
    const schedLabel = t.schedule === 'date'
      ? `📅 ${t.date}`
      : (SCHEDULE_LABELS[t.schedule] || t.schedule);
    return `
    <li class="task-item ${done ? 'done' : ''}" data-id="${t.id}">
      <button class="task-check" data-action="toggle" title="标记完成 Toggle complete">
        ${done ? '✓' : ''}
      </button>
      <div class="task-info">
        <div class="task-name">${escHtml(t.name)}</div>
        <div class="task-meta">${TYPE_LABELS[t.type] || t.type} · ${t.duration} min · ${schedLabel}</div>
      </div>
      <div class="task-actions">
        <button class="icon-btn edit" data-action="edit"   title="编辑 Edit">✏️</button>
        <button class="icon-btn"      data-action="delete" title="删除 Delete">🗑️</button>
      </div>
    </li>`;
  }).join('');

  list.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', e => {
      const item   = e.target.closest('.task-item');
      const id     = item.dataset.id;
      const action = btn.dataset.action;
      if (action === 'toggle') toggleTask(id);
      if (action === 'edit')   editTask(id);
      if (action === 'delete') deleteTask(id);
    });
  });
}

function toggleTask(id) {
  const completions = getCompletions(currentPlanDate);
  const wasDone = completions.includes(id);
  setCompletion(currentPlanDate, id, !wasDone);
  renderTasks();

  // Toast prompt when marking complete (not uncomplete)
  if (!wasDone) {
    const tasks = load(KEY.tasks, []);
    const t = tasks.find(t => t.id === id);
    if (t && t.type === 'listening') {
      showToast('✏️ 记录今日跟读内容？', '去记录 Log it', () => {
        switchToNotebookSubtab('shadowing');
        openModal('shadowingModal');
        document.getElementById('shadowingDate').value = currentPlanDate;
      });
    } else if (t && t.type === 'vocabulary') {
      showToast('📖 记录今日新词？', '去记录 Log it', () => {
        switchToNotebookSubtab('vocab');
        openModal('vocabModal');
      });
    }
  }
}

function editTask(id) {
  const tasks = load(KEY.tasks, []);
  const t = tasks.find(t => t.id === id);
  if (!t) return;
  document.getElementById('taskEditId').value    = t.id;
  document.getElementById('taskName').value      = t.name;
  document.getElementById('taskType').value      = t.type;
  document.getElementById('taskDuration').value  = t.duration;
  document.getElementById('taskSchedule').value  = t.schedule;
  document.getElementById('taskDate').value      = t.date || currentPlanDate;
  document.getElementById('taskDateRow').style.display = t.schedule === 'date' ? '' : 'none';
  document.getElementById('taskModalTitle').textContent = '编辑任务 Edit Task';
  openModal('taskModal');
}

function deleteTask(id) {
  if (!confirm('删除此任务？Delete this task?')) return;
  const tasks = load(KEY.tasks, []).filter(t => t.id !== id);
  save(KEY.tasks, tasks);
  renderTasks();
}

// ─── RESOURCES ────────────────────────────────────────────────────────────────

const RCAT_LABELS = {
  listening:  '🔊 听力 Listening',
  speaking:   '🎤 口语 Speaking',
  reading:    '📖 阅读 Reading',
  writing:    '✏️ 写作 Writing',
  vocabulary: '📘 词汇 Vocabulary',
  other:      '📁 其他 Other',
};

let resourceFilter = 'all';

function initResources() {
  renderResources();

  document.getElementById('openResourceModal').addEventListener('click', () => {
    clearResourceForm();
    document.getElementById('resourceModalTitle').textContent = '添加资源 Add Resource';
    openModal('resourceModal');
  });

  document.getElementById('saveResource').addEventListener('click', saveResource);

  document.querySelectorAll('[data-rfilter]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-rfilter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      resourceFilter = btn.dataset.rfilter;
      renderResources();
    });
  });
}

function clearResourceForm() {
  document.getElementById('resourceEditId').value   = '';
  document.getElementById('resourceTitle').value    = '';
  document.getElementById('resourceUrl').value      = '';
  document.getElementById('resourceCategory').value = 'listening';
  document.getElementById('resourceNote').value     = '';
}

function saveResource() {
  const title = document.getElementById('resourceTitle').value.trim();
  if (!title) { document.getElementById('resourceTitle').focus(); return; }

  const resources = load(KEY.resources, []);
  const editId    = document.getElementById('resourceEditId').value;

  const data = {
    title,
    url:      document.getElementById('resourceUrl').value.trim(),
    category: document.getElementById('resourceCategory').value,
    note:     document.getElementById('resourceNote').value.trim(),
  };

  if (editId) {
    const idx = resources.findIndex(r => r.id === editId);
    if (idx !== -1) resources[idx] = { ...resources[idx], ...data };
  } else {
    resources.push({ id: uid(), createdAt: todayStr(), ...data });
  }

  save(KEY.resources, resources);
  renderResources();
  closeModal('resourceModal');
}

function renderResources() {
  const resources = load(KEY.resources, []);
  const grid = document.getElementById('resourceGrid');

  const filtered = resourceFilter === 'all'
    ? resources
    : resources.filter(r => r.category === resourceFilter);

  if (filtered.length === 0) {
    grid.innerHTML = `<p class="empty-state">暂无资源，添加你的第一条资源吧！No resources yet. Add your first resource!</p>`;
    return;
  }

  grid.innerHTML = filtered.map(r => `
    <div class="resource-card" data-id="${r.id}">
      <div class="resource-card-header">
        <div class="resource-card-title">${escHtml(r.title)}</div>
        <div class="resource-card-actions">
          <button class="icon-btn edit" data-action="redit" title="Edit">✏️</button>
          <button class="icon-btn"      data-action="rdelete" title="Delete">🗑️</button>
        </div>
      </div>
      <span class="tag">${RCAT_LABELS[r.category] || r.category}</span>
      ${r.url ? `<a class="resource-link" href="${escAttr(r.url)}" target="_blank" rel="noopener noreferrer">🔗 ${escHtml(truncate(r.url, 48))}</a>` : ''}
      ${r.note ? `<p class="resource-note">${escHtml(r.note)}</p>` : ''}
    </div>
  `).join('');

  grid.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', e => {
      const card   = e.target.closest('.resource-card');
      const id     = card.dataset.id;
      const action = btn.dataset.action;
      if (action === 'redit')   editResource(id);
      if (action === 'rdelete') deleteResource(id);
    });
  });
}

function editResource(id) {
  const resources = load(KEY.resources, []);
  const r = resources.find(r => r.id === id);
  if (!r) return;
  document.getElementById('resourceEditId').value   = r.id;
  document.getElementById('resourceTitle').value    = r.title;
  document.getElementById('resourceUrl').value      = r.url;
  document.getElementById('resourceCategory').value = r.category;
  document.getElementById('resourceNote').value     = r.note;
  document.getElementById('resourceModalTitle').textContent = '编辑资源 Edit Resource';
  openModal('resourceModal');
}

function deleteResource(id) {
  if (!confirm('Delete this resource?')) return;
  save(KEY.resources, load(KEY.resources, []).filter(r => r.id !== id));
  renderResources();
}

// ─── PROGRESS ─────────────────────────────────────────────────────────────────

let currentChartRange = 'week';

function initProgress() {
  renderStats();
  renderCheckinList();

  document.getElementById('openCheckinModal').addEventListener('click', () => {
    const today = todayStr();
    // Pre-fill minutes from existing check-in if any
    const existing = load(KEY.checkins, []).find(c => c.date === today);
    document.getElementById('checkinMinutes').value = existing ? existing.minutes : '30';
    document.getElementById('checkinNote').value    = existing ? (existing.note || '') : '';
    // Auto-fill task count from completions
    const completedCount = getCompletions(today).length;
    document.getElementById('checkinTasksDisplay').textContent = completedCount;
    openModal('checkinModal');
  });

  document.getElementById('saveCheckin').addEventListener('click', saveCheckin);

  document.querySelectorAll('.chart-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.chart-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentChartRange = btn.dataset.range;
      renderChart(currentChartRange);
    });
  });

  // Render chart on init if progress tab is visible
  renderChart(currentChartRange);
}

function saveCheckin() {
  const minutes = parseInt(document.getElementById('checkinMinutes').value, 10) || 0;
  const tasks   = getCompletions(todayStr()).length;
  const note    = document.getElementById('checkinNote').value.trim();

  const checkins = load(KEY.checkins, []);
  const today    = todayStr();

  // Update or replace today's check-in
  const idx = checkins.findIndex(c => c.date === today);
  const entry = { date: today, minutes, tasks, note };
  if (idx !== -1) checkins[idx] = entry;
  else checkins.push(entry);

  checkins.sort((a, b) => a.date.localeCompare(b.date));
  save(KEY.checkins, checkins);
  renderStats();
  renderCheckinList();
  renderChart(currentChartRange);
  closeModal('checkinModal');
}

function computeStreak(checkins) {
  if (checkins.length === 0) return 0;
  const sorted = [...checkins].sort((a, b) => b.date.localeCompare(a.date));
  const today  = todayStr();
  let streak   = 0;
  let current  = today;

  for (const c of sorted) {
    if (c.date === current) {
      streak++;
      // Move to previous day
      const d = new Date(current + 'T00:00:00');
      d.setDate(d.getDate() - 1);
      current = d.toISOString().slice(0, 10);
    } else {
      break;
    }
  }
  return streak;
}

function renderStats() {
  const checkins = load(KEY.checkins, []);
  const tasks    = load(KEY.tasks, []);

  const streak      = computeStreak(checkins);
  const totalMin    = checkins.reduce((s, c) => s + (c.minutes || 0), 0);
  const totalHours  = (totalMin / 60).toFixed(1);
  // Completion rate: today's completed vs today's visible tasks
  const today = todayStr();
  const todayVisible = tasks.filter(t => taskVisibleOnDate(t, today));
  const todayDone    = getCompletions(today).length;
  const completionRate = todayVisible.length
    ? Math.round((todayDone / todayVisible.length) * 100)
    : 0;

  // This-week minutes
  const now     = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 6);
  const weekStr = weekAgo.toISOString().slice(0, 10);
  const weekMin = checkins
    .filter(c => c.date >= weekStr)
    .reduce((s, c) => s + (c.minutes || 0), 0);

  document.getElementById('statStreak').textContent        = streak;
  document.getElementById('statTotalHours').textContent    = totalHours + 'h';
  document.getElementById('statCompletionRate').textContent = completionRate + '%';
  document.getElementById('statThisWeek').textContent      = (weekMin / 60).toFixed(1) + 'h';

  const vocab = load('el_vocab', []);
  document.getElementById('statVocabTotal').textContent   = vocab.length;
  document.getElementById('statVocabMastered').textContent = vocab.filter(v => v.level === 'mastered').length;

  // Update header streak badge
  const badge = document.getElementById('streakBadge');
  if (streak > 0) {
    badge.textContent = '🔥 ' + streak + (streak === 1 ? ' day' : ' days');
    badge.style.display = '';
  } else {
    badge.style.display = 'none';
  }
}

function renderCheckinList() {
  const checkins = load(KEY.checkins, []);
  const list     = document.getElementById('checkinList');

  if (checkins.length === 0) {
    list.innerHTML = `<li class="empty-state">暂无打卡记录，记录今天的学习吧！No check-ins yet. Log today's study session!</li>`;
    return;
  }

  const recent = [...checkins].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 14);
  list.innerHTML = recent.map(c => `
    <li class="checkin-item">
      <span class="checkin-date">${formatDate(c.date)}</span>
      <span class="checkin-detail">${c.minutes} min · ${c.tasks} task${c.tasks !== 1 ? 's' : ''}${c.note ? ' · ' + escHtml(truncate(c.note, 40)) : ''}</span>
    </li>
  `).join('');
}

// ─── Canvas Bar Chart ─────────────────────────────────────────────────────────

function renderChart(range) {
  const canvas  = document.getElementById('progressChart');
  const ctx     = canvas.getContext('2d');
  const checkins = load(KEY.checkins, []);

  // Build labels & data
  const entries = buildChartData(checkins, range);
  drawBarChart(ctx, canvas, entries, range);
}

function buildChartData(checkins, range) {
  const today = new Date();
  const entries = [];

  if (range === 'week') {
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const str   = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString(undefined, { weekday: 'short' });
      const checkin = checkins.find(c => c.date === str);
      entries.push({ label, minutes: checkin ? checkin.minutes : 0, date: str });
    }
  } else {
    // Month view: last 30 days grouped by week
    for (let w = 3; w >= 0; w--) {
      const endD = new Date(today);
      endD.setDate(endD.getDate() - w * 7);
      const startD = new Date(endD);
      startD.setDate(startD.getDate() - 6);
      const endStr   = endD.toISOString().slice(0, 10);
      const startStr = startD.toISOString().slice(0, 10);
      const total = checkins
        .filter(c => c.date >= startStr && c.date <= endStr)
        .reduce((s, c) => s + (c.minutes || 0), 0);
      const label = startD.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      entries.push({ label, minutes: total });
    }
  }
  return entries;
}

function drawBarChart(ctx, canvas, entries, range) {
  // Resolve CSS variables for colors (dark-mode aware)
  const style = getComputedStyle(document.documentElement);
  const primaryColor = style.getPropertyValue('--clr-primary').trim() || '#4CAF50';
  const textMuted    = style.getPropertyValue('--clr-text-muted').trim() || '#5A7A5A';
  const borderColor  = style.getPropertyValue('--clr-border').trim() || '#D0E8D0';
  const bgColor      = style.getPropertyValue('--clr-surface').trim() || '#fff';

  const dpr    = window.devicePixelRatio || 1;
  const W      = canvas.parentElement.clientWidth || 560;
  const H      = 220;

  canvas.width  = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width  = W + 'px';
  canvas.style.height = H + 'px';
  ctx.scale(dpr, dpr);

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, W, H);

  const padL = 48, padR = 16, padT = 20, padB = 40;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const maxMin  = Math.max(...entries.map(e => e.minutes), 60);
  const maxLabel = maxMin >= 60
    ? (maxMin / 60).toFixed(1) + 'h'
    : maxMin + 'm';

  // Y-axis gridlines
  ctx.strokeStyle = borderColor;
  ctx.lineWidth   = 1;
  const ySteps = 4;
  for (let i = 0; i <= ySteps; i++) {
    const y = padT + chartH - (i / ySteps) * chartH;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(padL + chartW, y);
    ctx.stroke();

    const val = (maxMin / ySteps) * i;
    const lbl = val >= 60 ? (val / 60).toFixed(1) + 'h' : Math.round(val) + 'm';
    ctx.fillStyle = textMuted;
    ctx.font = `${11 * dpr / dpr}px ${style.fontFamily || 'sans-serif'}`;
    ctx.textAlign = 'right';
    ctx.fillText(lbl, padL - 6, y + 4);
  }

  // Bars
  const n      = entries.length;
  const barW   = Math.max(8, (chartW / n) * 0.55);
  const gap    = chartW / n;

  entries.forEach((entry, i) => {
    const barH = entry.minutes > 0
      ? Math.max(4, (entry.minutes / maxMin) * chartH)
      : 0;
    const x = padL + i * gap + gap / 2 - barW / 2;
    const y = padT + chartH - barH;

    // Bar with rounded top
    ctx.fillStyle = entry.date === todayStr() ? primaryColor : primaryColor + 'BB';
    roundRect(ctx, x, y, barW, barH, Math.min(4, barW / 2));
    ctx.fill();

    // X-axis label
    ctx.fillStyle   = textMuted;
    ctx.font        = `11px sans-serif`;
    ctx.textAlign   = 'center';
    ctx.fillText(entry.label, padL + i * gap + gap / 2, H - padB + 16);

    // Value label on bar
    if (entry.minutes > 0) {
      const lbl = entry.minutes >= 60
        ? (entry.minutes / 60).toFixed(1) + 'h'
        : entry.minutes + 'm';
      ctx.fillStyle = textMuted;
      ctx.font      = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(lbl, padL + i * gap + gap / 2, y - 4);
    }
  });
}

function roundRect(ctx, x, y, w, h, r) {
  if (h <= 0) return;
  r = Math.min(r, h / 2, w / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// Redraw chart on resize
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (document.querySelector('#tab-progress.active')) {
      renderChart(currentChartRange);
    }
  }, 120);
});

// ─── REMINDER ─────────────────────────────────────────────────────────────────

let reminderIntervalId = null;

function initReminder() {
  const saved = load(KEY.reminder, { time: '09:00', enabled: false });
  document.getElementById('reminderTime').value = saved.time;
  document.getElementById('reminderEnabled').checked = saved.enabled;
  updatePermissionBadge();

  document.getElementById('saveReminder').addEventListener('click', () => {
    const time    = document.getElementById('reminderTime').value;
    const enabled = document.getElementById('reminderEnabled').checked;

    if (enabled && Notification.permission === 'default') {
      Notification.requestPermission().then(p => {
        updatePermissionBadge();
        if (p === 'granted') {
          saveReminderData(time, enabled);
          scheduleReminderCheck();
        }
      });
    } else {
      saveReminderData(time, enabled);
      if (enabled && Notification.permission === 'granted') {
        scheduleReminderCheck();
      }
    }
  });

  document.getElementById('testReminder').addEventListener('click', () => {
    if (Notification.permission !== 'granted') {
      Notification.requestPermission().then(updatePermissionBadge);
      return;
    }
    new Notification('English Learning Reminder 📚', {
      body: 'Time to study! Let\'s keep your streak going!',
      icon: 'https://cdn.jsdelivr.net/npm/twemoji@14.0.2/assets/72x72/1f4da.png',
    });
  });

  // Re-arm the scheduler on load if reminder is on
  const r = load(KEY.reminder, { enabled: false });
  if (r.enabled && Notification.permission === 'granted') {
    scheduleReminderCheck();
  }
}

function saveReminderData(time, enabled) {
  save(KEY.reminder, { time, enabled });
}

function updatePermissionBadge() {
  const badge = document.getElementById('permissionBadge');
  const perm  = Notification.permission;
  badge.textContent = perm.charAt(0).toUpperCase() + perm.slice(1);
  badge.className   = 'permission-badge ' + perm;
}

function scheduleReminderCheck() {
  if (reminderIntervalId) clearInterval(reminderIntervalId);
  reminderIntervalId = setInterval(checkReminder, 60 * 1000); // check every minute
  checkReminder();
}

function checkReminder() {
  const r = load(KEY.reminder, { enabled: false });
  if (!r.enabled) return;

  const now   = new Date();
  const hhmm  = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
  const today = todayStr();
  const lastFired = localStorage.getItem('el_lastReminderFired');

  if (hhmm === r.time && lastFired !== today && Notification.permission === 'granted') {
    localStorage.setItem('el_lastReminderFired', today);
    new Notification('English Learning Reminder 📚', {
      body: 'Time for your daily English study session!',
      tag: 'el-daily-reminder',
    });
  }
}

// ─── REVIEW ───────────────────────────────────────────────────────────────────

function initReview() {
  renderReviews();

  document.getElementById('openReviewModal').addEventListener('click', () => {
    clearReviewForm();
    document.getElementById('reviewDate').value = todayStr();
    document.getElementById('reviewModalTitle').textContent = '新建复盘 New Review Note';
    openModal('reviewModal');
  });

  document.getElementById('saveReview').addEventListener('click', saveReview);
}

function clearReviewForm() {
  document.getElementById('reviewEditId').value    = '';
  document.getElementById('reviewTitle').value     = '';
  document.getElementById('reviewDate').value      = todayStr();
  document.getElementById('reviewContent').value   = '';
  document.getElementById('reviewInsight').value   = '';
}

function saveReview() {
  const title = document.getElementById('reviewTitle').value.trim();
  if (!title) { document.getElementById('reviewTitle').focus(); return; }

  const reviews = load(KEY.reviews, []);
  const editId  = document.getElementById('reviewEditId').value;

  const data = {
    title,
    date:    document.getElementById('reviewDate').value,
    content: document.getElementById('reviewContent').value.trim(),
    insight: document.getElementById('reviewInsight').value.trim(),
  };

  if (editId) {
    const idx = reviews.findIndex(r => r.id === editId);
    if (idx !== -1) reviews[idx] = { ...reviews[idx], ...data };
  } else {
    reviews.push({ id: uid(), createdAt: new Date().toISOString(), ...data });
  }

  reviews.sort((a, b) => (b.date || b.createdAt).localeCompare(a.date || a.createdAt));
  save(KEY.reviews, reviews);
  renderReviews();
  closeModal('reviewModal');
}

function renderReviews() {
  const reviews = load(KEY.reviews, []);
  const list    = document.getElementById('reviewList');

  if (reviews.length === 0) {
    list.innerHTML = `<li class="empty-state">暂无复盘笔记，记录你的学习反思吧！No review notes yet. Reflect on your progress!</li>`;
    return;
  }

  list.innerHTML = reviews.map(r => `
    <li class="review-item" data-id="${r.id}">
      <div class="review-item-header">
        <div class="review-item-title">${escHtml(r.title)}</div>
        <div class="review-item-date">${formatDate(r.date)}</div>
        <div class="review-item-actions">
          <button class="icon-btn edit" data-action="view"   title="View">👁</button>
          <button class="icon-btn edit" data-action="redit2" title="Edit">✏️</button>
          <button class="icon-btn"      data-action="rdel2"  title="Delete">🗑️</button>
        </div>
      </div>
      ${r.content ? `<p class="review-item-preview">${escHtml(r.content)}</p>` : ''}
    </li>
  `).join('');

  list.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', e => {
      const item   = e.target.closest('.review-item');
      const id     = item.dataset.id;
      const action = btn.dataset.action;
      if (action === 'view')   viewReview(id);
      if (action === 'redit2') editReview(id);
      if (action === 'rdel2')  deleteReview(id);
    });
  });
}

function viewReview(id) {
  const reviews = load(KEY.reviews, []);
  const r = reviews.find(r => r.id === id);
  if (!r) return;
  document.getElementById('reviewViewTitle').textContent = r.title;
  document.getElementById('reviewViewBody').innerHTML = `
    <p style="color:var(--clr-text-muted);font-size:.85rem;margin-bottom:12px;">${formatDate(r.date)}</p>
    ${r.content ? `<h4 style="margin-bottom:6px;">内容 Notes</h4><p style="white-space:pre-wrap;font-size:.95rem;">${escHtml(r.content)}</p>` : ''}
    ${r.insight ? `<h4 style="margin-top:14px;margin-bottom:6px;">核心收获 Key Takeaway</h4><p style="white-space:pre-wrap;font-size:.95rem;color:var(--clr-primary-dark);">${escHtml(r.insight)}</p>` : ''}
  `;
  openModal('reviewViewModal');
}

function editReview(id) {
  const reviews = load(KEY.reviews, []);
  const r = reviews.find(r => r.id === id);
  if (!r) return;
  document.getElementById('reviewEditId').value    = r.id;
  document.getElementById('reviewTitle').value     = r.title;
  document.getElementById('reviewDate').value      = r.date;
  document.getElementById('reviewContent').value   = r.content;
  document.getElementById('reviewInsight').value   = r.insight;
  document.getElementById('reviewModalTitle').textContent = '编辑复盘 Edit Review';
  openModal('reviewModal');
}

function deleteReview(id) {
  if (!confirm('Delete this review note?')) return;
  save(KEY.reviews, load(KEY.reviews, []).filter(r => r.id !== id));
  renderReviews();
}

// ─── Security helpers ─────────────────────────────────────────────────────────

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escAttr(str) {
  // Only allow http/https URLs to prevent javascript: injection
  const s = String(str).trim();
  if (/^https?:\/\//i.test(s)) return escHtml(s);
  return '#';
}

function truncate(str, max) {
  return str.length > max ? str.slice(0, max) + '…' : str;
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function showToast(message, actionLabel, onAction) {
  const container = document.getElementById('toastContainer');
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<span>${escHtml(message)}</span>`;

  if (actionLabel && onAction) {
    const btn = document.createElement('button');
    btn.className = 'toast-btn';
    btn.textContent = actionLabel;
    btn.addEventListener('click', () => { dismissToast(el); onAction(); });
    el.appendChild(btn);
  }

  container.appendChild(el);

  // Auto-dismiss after 3 s
  const timer = setTimeout(() => dismissToast(el), 3000);
  el._dismissTimer = timer;
}

function dismissToast(el) {
  if (!el.parentNode) return;
  clearTimeout(el._dismissTimer);
  el.classList.add('toast-out');
  setTimeout(() => el.parentNode && el.parentNode.removeChild(el), 240);
}

// ─── Notebook: sub-tab helper ─────────────────────────────────────────────────

function switchToNotebookSubtab(subtab) {
  // Switch main tab to notebook first
  document.querySelectorAll('.tab-btn').forEach(b => {
    const isNb = b.dataset.tab === 'notebook';
    b.classList.toggle('active', isNb);
    b.setAttribute('aria-selected', isNb ? 'true' : 'false');
  });
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('tab-notebook').classList.add('active');

  // Switch sub-tab
  document.querySelectorAll('.sub-tab-btn').forEach(b => {
    const active = b.dataset.subtab === subtab;
    b.classList.toggle('active', active);
    b.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  document.querySelectorAll('.sub-tab-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('subtab-' + subtab).classList.add('active');
}

// ─── NOTEBOOK: Vocabulary ─────────────────────────────────────────────────────

const LEVEL_LABELS = {
  new:      '🔴 生疏 New',
  familiar: '🟠 模糊 Familiar',
  mastered: '🟢 熟悉 Mastered',
};

let vocabFilter  = 'all';
let vocabSearch  = '';

function initVocab() {
  renderVocab();

  document.getElementById('openVocabModal').addEventListener('click', () => {
    clearVocabForm();
    document.getElementById('vocabModalTitle').textContent = '添加单词 Add Word';
    openModal('vocabModal');
  });

  document.getElementById('saveVocab').addEventListener('click', saveVocab);

  // Auto-lookup on blur or Enter (only in add mode, not edit mode)
  const wordInput = document.getElementById('vocabWord');
  const triggerLookup = () => {
    const w = wordInput.value.trim();
    if (w && !document.getElementById('vocabEditId').value) lookupWord(w);
  };
  wordInput.addEventListener('blur', triggerLookup);
  wordInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); triggerLookup(); } });

  document.getElementById('vocabSearch').addEventListener('input', function () {
    vocabSearch = this.value.trim().toLowerCase();
    renderVocab();
  });

  document.querySelectorAll('[data-vfilter]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-vfilter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      vocabFilter = btn.dataset.vfilter;
      renderVocab();
    });
  });
}

// ─── VOCAB: Auto-lookup via Free Dictionary API ─────────────────────────────

async function lookupWord(word) {
  const statusEl = document.getElementById('vocabLookupStatus');
  const hintEl   = document.getElementById('vocabLookupHint');
  if (!word) return;
  statusEl.textContent = '查询中… Looking up…';
  statusEl.style.color = 'var(--clr-primary)';
  hintEl.textContent   = '';
  try {
    const res  = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
    if (!res.ok) throw new Error('not found');
    const data = await res.json();
    const entry = data[0];
    // phonetic
    const phonetic = (entry.phonetics || []).map(p => p.text).find(t => t && t.trim()) || '';
    if (phonetic) document.getElementById('vocabPhonetic').value = phonetic;
    // meaning + example from first definition
    const meanings = entry.meanings || [];
    if (meanings.length) {
      const def = meanings[0].definitions[0] || {};
      const partOfSpeech = meanings[0].partOfSpeech || '';
      const defText = def.definition || '';
      const existing = document.getElementById('vocabMeaning').value.trim();
      if (!existing) {
        document.getElementById('vocabMeaning').value =
          (partOfSpeech ? `[${partOfSpeech}] ` : '') + defText + '\n（在此补充中文释义 Add Chinese meaning here）';
      }
      if (def.example && !document.getElementById('vocabExample').value.trim()) {
        document.getElementById('vocabExample').value = def.example;
      }
    }
    statusEl.textContent = '✓ 已自动填充 Auto-filled';
    statusEl.style.color = '#10B981';
    setTimeout(() => { statusEl.textContent = ''; }, 2500);
  } catch (e) {
    statusEl.textContent = '';
    hintEl.textContent   = '未找到该单词，请手动填写 Word not found, please fill manually';
    hintEl.style.color   = '#EF4444';
  }
}

function clearVocabForm() {
  document.getElementById('vocabEditId').value   = '';
  document.getElementById('vocabWord').value     = '';
  document.getElementById('vocabPhonetic').value = '';
  document.getElementById('vocabMeaning').value  = '';
  document.getElementById('vocabExample').value  = '';
  document.getElementById('vocabSource').value   = '';
  document.getElementById('vocabLevel').value    = 'new';
  const s = document.getElementById('vocabLookupStatus');
  const h = document.getElementById('vocabLookupHint');
  if (s) s.textContent = '';
  if (h) h.textContent = '';
}

function saveVocab() {
  const word = document.getElementById('vocabWord').value.trim();
  if (!word) { document.getElementById('vocabWord').focus(); return; }

  const vocab  = load('el_vocab', []);
  const editId = document.getElementById('vocabEditId').value;

  const data = {
    word,
    phonetic: document.getElementById('vocabPhonetic').value.trim(),
    meaning:  document.getElementById('vocabMeaning').value.trim(),
    example:  document.getElementById('vocabExample').value.trim(),
    source:   document.getElementById('vocabSource').value.trim(),
    level:    document.getElementById('vocabLevel').value,
  };

  if (editId) {
    const idx = vocab.findIndex(v => v.id === editId);
    if (idx !== -1) vocab[idx] = { ...vocab[idx], ...data };
  } else {
    vocab.unshift({ id: 'v_' + uid(), createdAt: todayStr(), ...data });
  }

  save('el_vocab', vocab);
  renderVocab();
  renderStats(); // refresh vocab count cards
  closeModal('vocabModal');
}

function setVocabLevel(id, level) {
  const vocab = load('el_vocab', []);
  const v = vocab.find(v => v.id === id);
  if (!v) return;
  v.level = level;
  save('el_vocab', vocab);
  renderVocab();
  renderStats();
}

function deleteVocab(id) {
  if (!confirm('删除此词条？Delete this word?')) return;
  save('el_vocab', load('el_vocab', []).filter(v => v.id !== id));
  renderVocab();
  renderStats();
}

function renderVocab() {
  let vocab = load('el_vocab', []);
  const container = document.getElementById('vocabList');

  if (vocabFilter !== 'all') vocab = vocab.filter(v => v.level === vocabFilter);
  if (vocabSearch) {
    vocab = vocab.filter(v =>
      v.word.toLowerCase().includes(vocabSearch) ||
      (v.meaning || '').toLowerCase().includes(vocabSearch)
    );
  }

  if (vocab.length === 0) {
    container.innerHTML = `<div class="empty-state">还没有单词，去添加第一个吧！ No words yet, add your first one!</div>`;
    container.className = '';
    return;
  }

  container.className = 'flashcard-grid';
  container.innerHTML = vocab.map(v => `
    <div class="flashcard" data-id="${v.id}">
      <div class="flashcard-inner">
        <!-- FRONT -->
        <div class="flashcard-front">
          <span class="fc-level-badge level-badge ${v.level}">${LEVEL_LABELS[v.level] || v.level}</span>
          <div class="fc-word">${escHtml(v.word)}</div>
          ${v.phonetic ? `<div class="fc-phonetic">${escHtml(v.phonetic)}</div>` : ''}
          ${v.source ? `<div class="fc-source-badge">${escHtml(truncate(v.source, 20))}</div>` : ''}
          <div class="fc-hint">点击翻转 Tap to flip →</div>
        </div>
        <!-- BACK -->
        <div class="flashcard-back">
          <div class="fc-back-content">
            ${v.meaning  ? `<p class="fc-meaning">${escHtml(v.meaning)}</p>` : '<p class="fc-meaning fc-empty">（无释义 No meaning）</p>'}
            ${v.example  ? `<p class="fc-example">"${escHtml(v.example)}"</p>` : ''}
            ${v.source   ? `<p class="fc-back-source">📌 ${escHtml(v.source)}</p>` : ''}
          </div>
          <div class="fc-level-btns">
            ${['new','familiar','mastered'].map(lv => `
              <button class="level-btn ${lv}${v.level === lv ? ' active' : ''}"
                data-action="set-level" data-level="${lv}">
                ${LEVEL_LABELS[lv]}
              </button>`).join('')}
          </div>
          <button class="fc-delete-btn" data-action="delete-vocab" title="删除 Delete">🗑️</button>
        </div>
      </div>
    </div>
  `).join('');

  // event delegation
  container.querySelectorAll('.flashcard').forEach(card => {
    card.addEventListener('click', e => {
      const action = e.target.closest('[data-action]')?.dataset.action;
      const id = card.dataset.id;
      if (action === 'set-level') {
        e.stopPropagation();
        setVocabLevel(id, e.target.closest('[data-action]').dataset.level);
        return;
      }
      if (action === 'delete-vocab') {
        e.stopPropagation();
        deleteVocab(id);
        return;
      }
      // flip
      card.classList.toggle('flipped');
    });
  });
}

function editVocab(id) {
  const vocab = load('el_vocab', []);
  const v = vocab.find(v => v.id === id);
  if (!v) return;
  document.getElementById('vocabEditId').value   = v.id;
  document.getElementById('vocabWord').value     = v.word;
  document.getElementById('vocabPhonetic').value = v.phonetic || '';
  document.getElementById('vocabMeaning').value  = v.meaning  || '';
  document.getElementById('vocabExample').value  = v.example  || '';
  document.getElementById('vocabSource').value   = v.source   || '';
  document.getElementById('vocabLevel').value    = v.level;
  document.getElementById('vocabModalTitle').textContent = '编辑单词 Edit Word';
  openModal('vocabModal');
}

// ─── NOTEBOOK: Shadowing Log ──────────────────────────────────────────────────

const STYPE_LABELS = {
  tv:    '📺 美剧 TV',
  ted:   '🎙 TED',
  movie: '🎬 电影 Movie',
  other: '📁 其他 Other',
};

let shadowingFilter = 'all';

function initShadowing() {
  renderShadowing();

  document.getElementById('openShadowingModal').addEventListener('click', () => {
    clearShadowingForm();
    document.getElementById('shadowingModalTitle').textContent = '添加跟读记录 Add Shadowing Log';
    openModal('shadowingModal');
  });

  document.getElementById('saveShadowing').addEventListener('click', saveShadowing);

  document.querySelectorAll('[data-sfilter]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-sfilter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      shadowingFilter = btn.dataset.sfilter;
      renderShadowing();
    });
  });
}

function clearShadowingForm() {
  document.getElementById('shadowingEditId').value    = '';
  document.getElementById('shadowingSource').value    = '';
  document.getElementById('shadowingSourceType').value = 'tv';
  document.getElementById('shadowingContent').value   = '';
  document.getElementById('shadowingDifficulty').value = '';
  document.getElementById('shadowingDate').value      = todayStr();
}

function saveShadowing() {
  const source = document.getElementById('shadowingSource').value.trim();
  if (!source) { document.getElementById('shadowingSource').focus(); return; }

  const logs   = load('el_shadowing', []);
  const editId = document.getElementById('shadowingEditId').value;

  const data = {
    source,
    sourceType:  document.getElementById('shadowingSourceType').value,
    content:     document.getElementById('shadowingContent').value.trim(),
    difficulty:  document.getElementById('shadowingDifficulty').value.trim(),
    date:        document.getElementById('shadowingDate').value || todayStr(),
  };

  if (editId) {
    const idx = logs.findIndex(l => l.id === editId);
    if (idx !== -1) logs[idx] = { ...logs[idx], ...data };
  } else {
    logs.unshift({ id: 's_' + uid(), createdAt: todayStr(), ...data });
  }

  save('el_shadowing', logs);
  renderShadowing();
  closeModal('shadowingModal');
}

function deleteShadowing(id) {
  if (!confirm('删除此跟读记录？Delete this log?')) return;
  save('el_shadowing', load('el_shadowing', []).filter(l => l.id !== id));
  renderShadowing();
}

function renderShadowing() {
  let logs = load('el_shadowing', []);
  const container = document.getElementById('shadowingList');

  if (shadowingFilter !== 'all') logs = logs.filter(l => l.sourceType === shadowingFilter);

  if (logs.length === 0) {
    container.innerHTML = `<div class="empty-state">暂无跟读记录 No shadowing logs yet. Add your first log!</div>`;
    return;
  }

  container.innerHTML = logs.map(l => `
    <div class="shadowing-card" data-id="${l.id}">
      <div class="shadowing-card-head" data-action="toggle-card">
        <span class="shadowing-source">${escHtml(l.source)}</span>
        <span class="source-badge ${l.sourceType}">${STYPE_LABELS[l.sourceType] || l.sourceType}</span>
        <span class="shadowing-date">${formatDate(l.date)}</span>
        <button class="icon-btn edit" data-action="edit-shadow"   title="编辑 Edit">✏️</button>
        <button class="icon-btn"      data-action="delete-shadow" title="删除 Delete">🗑️</button>
      </div>
      <div class="shadowing-card-body">
        ${l.content    ? `<p class="shadowing-content">${escHtml(l.content)}</p>` : ''}
        ${l.difficulty ? `<p class="shadowing-difficulty">💡 ${escHtml(l.difficulty)}</p>` : ''}
      </div>
    </div>
  `).join('');

  container.querySelectorAll('[data-action]').forEach(el => {
    el.addEventListener('click', e => {
      e.stopPropagation();
      const card   = e.target.closest('.shadowing-card');
      const id     = card.dataset.id;
      const action = el.dataset.action;
      if (action === 'toggle-card')   card.classList.toggle('open');
      if (action === 'edit-shadow')   editShadowing(id);
      if (action === 'delete-shadow') deleteShadowing(id);
    });
  });
}

function editShadowing(id) {
  const logs = load('el_shadowing', []);
  const l = logs.find(l => l.id === id);
  if (!l) return;
  document.getElementById('shadowingEditId').value    = l.id;
  document.getElementById('shadowingSource').value    = l.source;
  document.getElementById('shadowingSourceType').value = l.sourceType;
  document.getElementById('shadowingContent').value   = l.content   || '';
  document.getElementById('shadowingDifficulty').value = l.difficulty || '';
  document.getElementById('shadowingDate').value      = l.date;
  document.getElementById('shadowingModalTitle').textContent = '编辑跟读记录 Edit Log';
  openModal('shadowingModal');
}

// ─── NOTEBOOK: init ───────────────────────────────────────────────────────────

function initNotebook() {
  initVocab();
  initShadowing();

  document.querySelectorAll('.sub-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.sub-tab-btn').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      document.querySelectorAll('.sub-tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      document.getElementById('subtab-' + btn.dataset.subtab).classList.add('active');
    });
  });
}

// ─── Seed initial data ────────────────────────────────────────────────────────

function seedInitialData() {
  if (localStorage.getItem('el_seeded')) return;

  save(KEY.goal, "3个月内提升英语口语流利度、准确性和表达自信，能在日常对话、工作交流及常见社交场景中自如运用英语。\nImprove spoken English fluency, accuracy and confidence within 3 months — able to communicate naturally in daily conversations, work settings and common social situations.");

  save(KEY.tasks, [
    {
      id: 't1', name: '晨间听力跟读 Morning Listening & Shadowing',
      duration: 30, type: 'listening', schedule: 'daily',
      detail: '使用"每日英语听力"APP，听VOA慢速英语，模仿语音语调，大声跟读。\nUse the \'Daily English Listening\' app, listen to VOA Special English, mimic pronunciation and intonation, read aloud.',
      timeSlot: '07:30–08:00', done: false, createdAt: '2026-06-04',
    },
    {
      id: 't2', name: '午间美剧精听 Midday TV Series Listening',
      duration: 45, type: 'listening', schedule: 'daily',
      detail: '看《生活大爆炸》，遮挡字幕尝试理解，之后用英语总结剧情。\nWatch The Big Bang Theory without subtitles, then summarize the episode in English.',
      timeSlot: '12:30–13:15', done: false, createdAt: '2026-06-04',
    },
    {
      id: 't3', name: '晚间口语练习 Evening Speaking Practice',
      duration: 30, type: 'speaking', schedule: 'daily',
      detail: '在"英语巴士"网站选择话题（如"环保"），进行3-5分钟口语表达，手机录音后复盘纠正。\nChoose a topic on \'English Bus\' website (e.g. \'Environment\'), speak for 3–5 minutes, record and review.',
      timeSlot: '19:00–19:30', done: false, createdAt: '2026-06-04',
    },
    {
      id: 't4', name: '睡前复习 Bedtime Review',
      duration: 30, type: 'vocabulary', schedule: 'daily',
      detail: '复习当天学习内容，背诵积累的词汇、短语和句式。\nReview the day\'s learning, memorize accumulated vocabulary, phrases and sentence patterns.',
      timeSlot: '21:30–22:00', done: false, createdAt: '2026-06-04',
    },
    {
      id: 't5', name: '周末TED精听 Weekend TED Listening',
      duration: 60, type: 'listening', schedule: 'weekly',
      detail: '精听一篇TED演讲，做笔记记录观点与精彩表达，之后模仿演讲者进行复述。\nIntensively listen to a TED talk, take notes on key ideas and expressions, then shadow the speaker.',
      timeSlot: '07:30–08:30', done: false, createdAt: '2026-06-04',
    },
    {
      id: 't6', name: '周末英文电影 Weekend English Movie',
      duration: 45, type: 'listening', schedule: 'weekly',
      detail: '看英文电影，观影后用英语写影评，梳理情节、分析人物。\nWatch an English movie, then write a review in English covering plot and character analysis.',
      timeSlot: '12:30–13:15', done: false, createdAt: '2026-06-04',
    },
    {
      id: 't7', name: '周末英语角 Weekend English Corner',
      duration: 30, type: 'speaking', schedule: 'weekly',
      detail: '参与英语角线上交流，与伙伴围绕给定主题讨论，注意互动回应，提升交流能力。\nJoin an online English corner, discuss a given topic with partners, focus on interaction and response.',
      timeSlot: '19:00–19:30', done: false, createdAt: '2026-06-04',
    },
    {
      id: 't8', name: '周末总结复盘 Weekend Weekly Review',
      duration: 30, type: 'vocabulary', schedule: 'weekly',
      detail: '复习本周学习内容，总结进步与不足，制定下周改进计划。\nReview the week\'s learning, summarize progress and gaps, plan improvements for next week.',
      timeSlot: '21:30–22:00', done: false, createdAt: '2026-06-04',
    },
  ]);

  save(KEY.resources, [
    {
      id: 'r1', title: '营造语言环境 Create an English Environment',
      url: '', category: 'other',
      note: '在家中张贴英语单词卡片，设置手机、电脑语言为英文，让自己沉浸在英语氛围中。\nPost English word cards at home, set your phone and computer language to English, immerse yourself in an English environment.',
      createdAt: '2026-06-04',
    },
    {
      id: 'r2', title: '影子跟读法 Shadowing Technique',
      url: '', category: 'other',
      note: '听英语音频时，滞后一小段时间跟读，模仿语音、语调、连读等，提升口语语感和流利度。\nWhile listening to English audio, repeat slightly behind the speaker, mimicking pronunciation, intonation and linking — builds fluency and natural rhythm.',
      createdAt: '2026-06-04',
    },
    {
      id: 'r3', title: '积累口语素材库 Build a Speaking Resource Library',
      url: '', category: 'other',
      note: '建立自己的口语素材库，按话题分类整理地道表达，如问候、购物、旅游等，定期复习运用。\nBuild a personal speaking library, organize authentic expressions by topic (greetings, shopping, travel, etc.), review and use them regularly.',
      createdAt: '2026-06-04',
    },
    {
      id: 'res1', title: 'VOA慢速英语 VOA Special English',
      url: 'https://learningenglish.voanews.com', category: 'listening',
      note: '适合中级学习者，语速慢、发音清晰，配有文字稿。\nIdeal for intermediate learners — slow pace, clear pronunciation, with transcripts.',
      createdAt: '2026-06-04',
    },
    {
      id: 'res2', title: 'TED演讲 TED Talks',
      url: 'https://www.ted.com', category: 'listening',
      note: '精听练习首选，话题广泛，有中英字幕。\nTop choice for intensive listening — wide range of topics, bilingual subtitles available.',
      createdAt: '2026-06-04',
    },
    {
      id: 'res3', title: '英语巴士 English Bus',
      url: 'https://www.en84.com', category: 'speaking',
      note: '口语话题练习网站，提供丰富的话题素材。\nSpeaking topic practice site with rich topic materials.',
      createdAt: '2026-06-04',
    },
  ]);

  localStorage.setItem('el_seeded', '1');
}

// ─── Init ─────────────────────────────────────────────────────────────────────

function init() {
  seedInitialData();
  initTabs();
  initGoal();
  initDateNav();
  initTasks();
  initResources();
  initProgress();
  initReminder();
  initReview();
  initNotebook();
}

document.addEventListener('DOMContentLoaded', init);
