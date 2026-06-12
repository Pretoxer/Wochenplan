// --- Data Layer ---
const DB = {
  save(plans) {
    localStorage.setItem('wochenplan_data', JSON.stringify(plans));
  },
  load() {
    try {
      return JSON.parse(localStorage.getItem('wochenplan_data')) || {};
    } catch { return {}; }
  },
  saveProud(list) {
    localStorage.setItem('wochenplan_proud', JSON.stringify(list));
  },
  loadProud() {
    try {
      return JSON.parse(localStorage.getItem('wochenplan_proud')) || [];
    } catch { return []; }
  }
};

const MOODS = ['--', '-', '-/+', '+', '++'];
const MOOD_COLORS = {
  '--': '#C4756E',
  '-': '#D4A07A',
  '-/+': '#C9BFA4',
  '+': '#A8C5B8',
  '++': '#7BAF9E'
};
const WEEKDAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const WEEKDAYS_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

// --- State ---
let state = {
  plans: DB.load(),
  proudList: DB.loadProud(),
  selectedDate: new Date(),
  view: 'day', // 'day', 'week'
  tab: 'plan'  // 'plan', 'reflect'
};

function dateKey(d) {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

function getPlan(date) {
  const key = dateKey(date);
  if (!state.plans[key]) {
    state.plans[key] = { date: key, activities: [] };
  }
  return state.plans[key];
}

function savePlans() {
  DB.save(state.plans);
}

function isToday(d) {
  return dateKey(d) === dateKey(new Date());
}

function isTomorrow(d) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return dateKey(d) === dateKey(tomorrow);
}

function nearestQuarter() {
  const now = new Date();
  const m = Math.floor(now.getMinutes() / 15) * 15;
  return `${String(now.getHours()).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function roundTo15(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const rounded = Math.round(m / 15) * 15;
  const finalH = rounded === 60 ? (h + 1) % 24 : h;
  const finalM = rounded === 60 ? 0 : rounded;
  return `${String(finalH).padStart(2, '0')}:${String(finalM).padStart(2, '0')}`;
}

function createTimeInput(id, defaultVal) {
  const input = el('input', 'form-input time-input');
  input.type = 'time';
  input.id = id;
  if (defaultVal) input.value = defaultVal;
  input.onchange = () => { input.value = roundTo15(input.value); };
  return input;
}

function formatDate(d) {
  const dt = new Date(d);
  const day = dt.getDate();
  const months = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  return `${WEEKDAYS[dt.getDay()]}, ${day}. ${months[dt.getMonth()]}`;
}

function formatDateShort(d) {
  const dt = new Date(d);
  return `${dt.getDate()}.${dt.getMonth() + 1}.`;
}

function formatTime(t) {
  if (!t) return '';
  return t;
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// --- Rendering ---
function render() {
  const app = document.getElementById('app');
  app.innerHTML = '';

  if (state.view === 'proud') {
    app.appendChild(renderHeader());
    app.appendChild(renderProudView());
  } else if (state.view === 'week') {
    app.appendChild(renderHeader());
    app.appendChild(renderWeekView());
  } else {
    app.appendChild(renderHeader());
    app.appendChild(renderDateNav());
    app.appendChild(renderTabs());
    app.appendChild(renderDayView());
  }
  app.appendChild(renderBottomNav());
}

function renderHeader() {
  const header = el('div', 'header');
  const h1 = el('h1');
  h1.textContent = 'Wochenplan';
  const sub = el('span', 'header-date');
  const now = new Date();
  sub.textContent = formatDateShort(now);
  header.append(h1, sub);
  return header;
}

function renderDateNav() {
  const nav = el('div', 'date-nav');

  const prev = el('button');
  prev.innerHTML = '‹';
  prev.onclick = () => {
    state.selectedDate.setDate(state.selectedDate.getDate() - 1);
    render();
  };

  const label = el('span', 'date-label');
  let text = formatDate(state.selectedDate);
  if (isToday(state.selectedDate)) text += ' (Heute)';
  else if (isTomorrow(state.selectedDate)) text += ' (Morgen)';
  label.textContent = text;
  if (isToday(state.selectedDate)) label.classList.add('today-marker');
  if (!isToday(state.selectedDate)) {
    label.style.cursor = 'pointer';
    label.style.textDecoration = 'underline';
    label.style.textDecorationColor = 'var(--accent)';
    label.onclick = () => { state.selectedDate = new Date(); render(); };
  }

  const next = el('button');
  next.innerHTML = '›';
  next.onclick = () => {
    state.selectedDate.setDate(state.selectedDate.getDate() + 1);
    render();
  };

  nav.append(prev, label, next);
  return nav;
}

function renderTabs() {
  const tabs = el('div', 'tabs');

  const planTab = el('button', 'tab');
  planTab.textContent = 'Planen';
  if (state.tab === 'plan') planTab.classList.add('active');
  planTab.onclick = () => { state.tab = 'plan'; render(); };

  const reflectTab = el('button', 'tab');
  reflectTab.textContent = 'Reflektieren';
  if (state.tab === 'reflect') reflectTab.classList.add('active');
  reflectTab.onclick = () => { state.tab = 'reflect'; render(); };

  tabs.append(planTab, reflectTab);
  return tabs;
}

function renderDayView() {
  const content = el('div', 'content');
  const plan = getPlan(state.selectedDate);
  const sorted = [...plan.activities].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

  if (state.tab === 'plan') {
    if (sorted.length === 0) {
      content.appendChild(renderEmptyState('Noch keine Aktivitäten geplant', 'Füge unten deine erste Aktivität hinzu.'));
    } else {
      const list = el('div', 'activity-list');
      sorted.forEach(act => list.appendChild(renderPlanCard(act)));
      content.appendChild(list);
    }
    content.appendChild(renderAddForm());
  } else {
    if (sorted.length > 0) {
      const list = el('div', 'activity-list');
      sorted.forEach(act => list.appendChild(renderReflectCard(act)));
      content.appendChild(list);
    }
    content.appendChild(renderAddReflectForm());
  }

  return content;
}

function renderPlanCard(activity) {
  const card = el('div', 'activity-card');

  const del = el('button', 'btn-delete');
  del.innerHTML = '×';
  del.onclick = (e) => {
    e.stopPropagation();
    const plan = getPlan(state.selectedDate);
    plan.activities = plan.activities.filter(a => a.id !== activity.id);
    savePlans();
    render();
  };

  const time = el('div', 'activity-time');
  if (activity.startTime && activity.endTime) {
    time.textContent = `${formatTime(activity.startTime)} – ${formatTime(activity.endTime)}`;
  } else if (activity.startTime) {
    time.textContent = formatTime(activity.startTime);
  }

  const title = el('div', 'activity-title');
  title.textContent = activity.title;

  card.append(del);
  if (activity.startTime) card.append(time);
  card.append(title);
  return card;
}

function renderReflectCard(activity) {
  const card = el('div', 'activity-card');
  if (activity.status === 'done') card.classList.add('completed');
  if (activity.status === 'replaced') card.classList.add('replaced');

  const time = el('div', 'activity-time');
  if (activity.startTime && activity.endTime) {
    time.textContent = `${formatTime(activity.startTime)} – ${formatTime(activity.endTime)}`;
  } else if (activity.startTime) {
    time.textContent = formatTime(activity.startTime);
  }

  const title = el('div', 'activity-title');
  title.textContent = activity.title;

  if (activity.startTime) card.append(time);
  card.append(title);

  // Status buttons
  const statusRow = el('div', 'status-row');

  const doneBtn = el('button', 'status-btn');
  doneBtn.textContent = 'Erledigt';
  if (activity.status === 'done') doneBtn.classList.add('active');
  doneBtn.onclick = () => {
    activity.status = activity.status === 'done' ? null : 'done';
    activity.alternative = '';
    savePlans();
    render();
  };

  const replBtn = el('button', 'status-btn');
  replBtn.textContent = 'Anderes gemacht';
  if (activity.status === 'replaced') replBtn.classList.add('active');
  replBtn.onclick = () => {
    activity.status = activity.status === 'replaced' ? null : 'replaced';
    savePlans();
    render();
  };

  statusRow.append(doneBtn, replBtn);
  card.append(statusRow);

  // Alternative text field
  if (activity.status === 'replaced') {
    const alt = el('textarea', 'alt-input');
    alt.placeholder = 'Was hast du stattdessen gemacht?';
    alt.rows = 2;
    alt.value = activity.alternative || '';
    alt.oninput = (e) => {
      activity.alternative = e.target.value;
      savePlans();
    };
    card.append(alt);
  }

  // Mood selector
  if (activity.status) {
    const moodRow = el('div', 'mood-selector');
    MOODS.forEach(m => {
      const btn = el('button', 'mood-btn');
      btn.textContent = m;
      btn.dataset.mood = m;
      if (activity.mood === m) btn.classList.add('selected');
      btn.onclick = () => {
        activity.mood = activity.mood === m ? null : m;
        savePlans();
        render();
      };
      moodRow.append(btn);
    });
    card.append(moodRow);
  }

  return card;
}

function renderAddForm() {
  const wrap = el('div', 'add-form');
  const card = el('div', 'add-card');
  const h3 = el('h3');
  h3.textContent = 'Aktivität hinzufügen';

  const row1 = el('div', 'form-row');
  const titleInput = el('input', 'form-input');
  titleInput.type = 'text';
  titleInput.placeholder = 'Was machst du?';
  titleInput.id = 'add-title';

  row1.append(titleInput);

  const row2 = el('div', 'form-row');
  const startInput = createTimeInput('add-start');
  const bis = el('span');
  bis.textContent = '–';
  bis.style.cssText = 'display:flex;align-items:center;color:var(--text-light);font-size:16px;';
  const endInput = createTimeInput('add-end');
  row2.append(startInput, bis, endInput);

  const addBtn = el('button', 'btn-add');
  addBtn.textContent = 'Hinzufügen';
  addBtn.onclick = () => {
    const title = document.getElementById('add-title').value.trim();
    if (!title) return;
    const start = document.getElementById('add-start').value;
    const end = document.getElementById('add-end').value;

    const plan = getPlan(state.selectedDate);
    plan.activities.push({
      id: uid(),
      title,
      startTime: start || null,
      endTime: end || null,
      status: null,
      alternative: '',
      mood: null
    });
    savePlans();
    render();
  };

  card.append(h3, row1, row2, addBtn);
  wrap.append(card);
  return wrap;
}

function renderAddReflectForm() {
  const wrap = el('div', 'add-form');
  const card = el('div', 'add-card');
  const h3 = el('h3');
  h3.textContent = 'Was hast du gemacht?';

  const row1 = el('div', 'form-row');
  const titleInput = el('input', 'form-input');
  titleInput.type = 'text';
  titleInput.placeholder = 'Aktivität';
  titleInput.id = 'add-reflect-title';
  row1.append(titleInput);

  const row2 = el('div', 'form-row');
  const startInput = createTimeInput('add-reflect-start');
  const bis = el('span');
  bis.textContent = '–';
  bis.style.cssText = 'display:flex;align-items:center;color:var(--text-light);font-size:16px;';
  const endInput = createTimeInput('add-reflect-end');
  row2.append(startInput, bis, endInput);

  let selectedMood = null;
  const moodLabel = el('h3');
  moodLabel.textContent = 'Stimmung';
  moodLabel.style.marginTop = '8px';
  const moodRow = el('div', 'mood-selector');
  moodRow.style.marginBottom = '12px';
  MOODS.forEach(m => {
    const btn = el('button', 'mood-btn');
    btn.textContent = m;
    btn.dataset.mood = m;
    btn.onclick = (e) => {
      e.preventDefault();
      selectedMood = selectedMood === m ? null : m;
      moodRow.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
      if (selectedMood) btn.classList.add('selected');
    };
    moodRow.append(btn);
  });

  const addBtn = el('button', 'btn-add');
  addBtn.textContent = 'Eintragen';
  addBtn.onclick = () => {
    const title = document.getElementById('add-reflect-title').value.trim();
    if (!title) return;
    const start = document.getElementById('add-reflect-start').value;
    const end = document.getElementById('add-reflect-end').value;

    const plan = getPlan(state.selectedDate);
    plan.activities.push({
      id: uid(),
      title,
      startTime: start || null,
      endTime: end || null,
      status: 'done',
      alternative: '',
      mood: selectedMood
    });
    savePlans();
    render();
  };

  card.append(h3, row1, row2, moodLabel, moodRow, addBtn);
  wrap.append(card);
  return wrap;
}

function renderEmptyState(title, subtitle) {
  const wrap = el('div', 'empty-state');
  const icon = el('div', 'icon');
  icon.textContent = '📋';
  const p1 = el('p');
  p1.innerHTML = `<strong>${title}</strong><br>${subtitle}`;
  wrap.append(icon, p1);
  return wrap;
}

function renderWeekView() {
  const content = el('div', 'content');
  const overview = el('div', 'week-overview');

  const monday = getMonday(state.selectedDate);

  for (let i = 0; i < 7; i++) {
    const day = new Date(monday);
    day.setDate(day.getDate() + i);
    const plan = getPlan(day);
    const sorted = [...plan.activities].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

    const card = el('div', 'week-day-card');
    if (isToday(day)) card.classList.add('today');
    card.style.cursor = 'pointer';
    card.onclick = () => {
      state.selectedDate = new Date(day);
      state.view = 'day';
      render();
    };

    const header = el('div', 'week-day-header');
    const name = el('span', 'week-day-name');
    name.textContent = WEEKDAYS_SHORT[day.getDay()];
    const date = el('span', 'week-day-date');
    date.textContent = `${day.getDate()}.${day.getMonth() + 1}.`;
    header.append(name, date);
    card.append(header);

    if (sorted.length > 0) {
      const acts = el('div', 'week-day-activities');
      sorted.forEach(act => {
        const row = el('div', 'week-activity');
        const t = el('span', 'time');
        t.textContent = act.startTime || '';
        const title = el('span', 'title');
        title.textContent = act.status === 'replaced' && act.alternative
          ? `${act.title} → ${act.alternative}`
          : act.title;
        if (act.status === 'done') title.style.textDecoration = 'line-through';
        row.append(t, title);

        if (act.mood) {
          const dot = el('span', 'mood-dot');
          dot.style.background = MOOD_COLORS[act.mood];
          row.append(dot);
        }
        acts.append(row);
      });
      card.append(acts);

      // Mood bar
      const moodActs = sorted.filter(a => a.mood);
      if (moodActs.length > 0) {
        const bar = el('div', 'week-mood-summary');
        moodActs.forEach(a => {
          const seg = el('div', 'week-mood-bar');
          seg.style.background = MOOD_COLORS[a.mood];
          bar.append(seg);
        });
        card.append(bar);
      }
    } else {
      const empty = el('div');
      empty.style.cssText = 'font-size:12px;color:var(--text-light);';
      empty.textContent = 'Keine Aktivitäten';
      card.append(empty);
    }

    overview.append(card);
  }

  // Week navigation
  const weekNav = el('div', 'date-nav');
  const prevW = el('button');
  prevW.innerHTML = '‹';
  prevW.onclick = () => {
    state.selectedDate.setDate(state.selectedDate.getDate() - 7);
    render();
  };
  const weekLabel = el('span', 'date-label');
  const end = new Date(monday);
  end.setDate(end.getDate() + 6);
  weekLabel.textContent = `${formatDateShort(monday)} – ${formatDateShort(end)}`;
  const nextW = el('button');
  nextW.innerHTML = '›';
  nextW.onclick = () => {
    state.selectedDate.setDate(state.selectedDate.getDate() + 7);
    render();
  };
  weekNav.append(prevW, weekLabel, nextW);

  // Export button
  const exportSection = el('div', 'export-section');
  const exportBtn = el('button', 'export-btn');
  exportBtn.textContent = 'Wochenrückblick als PDF teilen';
  exportBtn.onclick = () => exportWeekPDF();
  exportSection.append(exportBtn);

  const container = el('div');
  container.append(weekNav, overview, exportSection);
  content.append(container);
  return content;
}

function renderProudView() {
  const content = el('div', 'content');

  const addSection = el('div', 'add-form');
  addSection.style.marginTop = '0';
  const addCard = el('div', 'add-card');
  const h3 = el('h3');
  h3.textContent = 'Worauf bist du stolz?';
  const row = el('div', 'form-row');
  const input = el('input', 'form-input');
  input.type = 'text';
  input.placeholder = 'Ich bin stolz auf...';
  input.id = 'proud-input';
  row.append(input);
  const row2 = el('div', 'form-row');
  const dateInput = el('input', 'form-input');
  dateInput.type = 'date';
  dateInput.id = 'proud-date';
  dateInput.style.flex = '1';
  row2.append(dateInput);
  const dateHint = el('span');
  dateHint.textContent = 'Leer = heute';
  dateHint.style.cssText = 'display:flex;align-items:center;font-size:12px;color:var(--text-light);white-space:nowrap;';
  row2.append(dateHint);
  const addBtn = el('button', 'btn-add');
  addBtn.textContent = 'Eintragen';
  addBtn.onclick = () => {
    const text = document.getElementById('proud-input').value.trim();
    if (!text) return;
    const dateVal = document.getElementById('proud-date').value;
    const date = dateVal || dateKey(new Date());
    state.proudList.push({ id: uid(), text, date });
    state.proudList.sort((a, b) => b.date.localeCompare(a.date));
    DB.saveProud(state.proudList);
    render();
  };
  addCard.append(h3, row, row2, addBtn);
  addSection.append(addCard);
  content.append(addSection);

  if (state.proudList.length === 0) {
    content.appendChild(renderEmptyState('Noch keine Einträge', 'Schreibe oben auf, worauf du stolz bist.'));
  } else {
    const list = el('div', 'activity-list');
    let lastDate = null;
    state.proudList.forEach(item => {
      if (item.date !== lastDate) {
        lastDate = item.date;
        const dateHeader = el('div', 'activity-time');
        dateHeader.style.cssText = 'padding: 8px 0 2px; margin-top: 4px;';
        const [y, m, d] = item.date.split('-');
        const dt = new Date(y, m - 1, d);
        dateHeader.textContent = formatDate(dt);
        list.append(dateHeader);
      }
      const card = el('div', 'activity-card');
      card.classList.add('completed');
      const del = el('button', 'btn-delete');
      del.innerHTML = '×';
      del.onclick = (e) => {
        e.stopPropagation();
        state.proudList = state.proudList.filter(p => p.id !== item.id);
        DB.saveProud(state.proudList);
        render();
      };
      const title = el('div', 'activity-title');
      title.textContent = item.text;
      card.append(del, title);
      list.append(card);
    });
    content.append(list);

    const exportSection = el('div', 'export-section');
    const exportBtn = el('button', 'export-btn');
    exportBtn.textContent = 'Stolz-Liste als PDF teilen';
    exportBtn.onclick = () => exportProudPDF();
    exportSection.append(exportBtn);
    content.append(exportSection);
  }

  return content;
}

function renderBottomNav() {
  const nav = el('div', 'bottom-nav');

  const dayBtn = el('button', 'nav-btn');
  if (state.view === 'day') dayBtn.classList.add('active');
  dayBtn.innerHTML = '<span class="nav-icon">☀</span><span class="nav-label">Tag</span>';
  dayBtn.onclick = () => { state.view = 'day'; render(); };

  const weekBtn = el('button', 'nav-btn');
  if (state.view === 'week') weekBtn.classList.add('active');
  weekBtn.innerHTML = '<span class="nav-icon">▦</span><span class="nav-label">Woche</span>';
  weekBtn.onclick = () => { state.view = 'week'; render(); };

  const proudBtn = el('button', 'nav-btn');
  if (state.view === 'proud') proudBtn.classList.add('active');
  proudBtn.innerHTML = '<span class="nav-icon">★</span><span class="nav-label">Stolz</span>';
  proudBtn.onclick = () => { state.view = 'proud'; render(); };

  nav.append(dayBtn, weekBtn, proudBtn);
  return nav;
}

// --- Export ---
function openPrintWindow(title, bodyHTML) {
  const w = window.open('', '_blank');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif; background: #F5F0E8; color: #2C2C2C; padding: 28px; max-width: 700px; margin: 0 auto; }
  h1 { color: #2D4A3E; font-size: 26px; margin-bottom: 4px; }
  .subtitle { color: #8A8578; font-size: 14px; margin-bottom: 24px; }
  .day-card { background: #FFFDF8; border-radius: 12px; padding: 14px 16px; margin-bottom: 8px; border: 1px solid #E5DFD3; }
  .day-card.today { border: 2px solid #2D4A3E; }
  .day-header { display: flex; justify-content: space-between; margin-bottom: 6px; }
  .day-name { font-weight: 700; font-size: 15px; }
  .day-date { font-size: 12px; color: #8A8578; }
  .activity { display: flex; align-items: center; gap: 8px; font-size: 13px; padding: 3px 0; }
  .activity .time { color: #8A8578; font-weight: 500; min-width: 42px; }
  .activity .title { flex: 1; }
  .activity .done { text-decoration: line-through; color: #8A8578; }
  .activity .mood { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
  .empty { font-size: 12px; color: #C9BFA4; }
  .section-title { color: #2D4A3E; font-size: 20px; font-weight: 700; margin: 28px 0 12px; }
  .proud-item { background: #FFFDF8; border-radius: 12px; padding: 12px 16px; margin-bottom: 6px; border-left: 3px solid #A8C5B8; font-size: 14px; }
  .proud-date { color: #8A8578; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 12px; margin-bottom: 4px; }
  .watermark { text-align: right; color: #C9BFA4; font-size: 11px; margin-top: 24px; }
  .share-hint { text-align: center; padding: 20px; color: #8A8578; font-size: 13px; }
  .share-hint button { display: block; margin: 12px auto 0; padding: 12px 32px; border: none; border-radius: 10px; background: #2D4A3E; color: white; font-size: 15px; font-weight: 600; cursor: pointer; }
  @media print { .share-hint { display: none; } body { background: white; } .day-card, .proud-item { break-inside: avoid; } }
</style></head><body>
${bodyHTML}
<div class="watermark">Wochenplan</div>
<div class="share-hint">
  <button onclick="window.print()">Als PDF teilen</button>
  Auf dem iPhone: Teilen → Als PDF sichern
</div>
</body></html>`);
  w.document.close();
}

function exportWeekPDF() {
  const today = new Date();
  const days = [];
  for (let i = 1; i <= 7; i++) {
    const day = new Date(today);
    day.setDate(day.getDate() - i);
    days.push(day);
  }
  const newest = days[0];
  const oldest = days[6];

  let html = `<h1>Wochenrückblick</h1>
<div class="subtitle">${formatDateShort(oldest)} – ${formatDateShort(newest)}</div>`;

  days.forEach(day => {
    const plan = getPlan(day);
    const sorted = [...plan.activities].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

    html += `<div class="day-card">
<div class="day-header"><span class="day-name">${WEEKDAYS_SHORT[day.getDay()]}</span><span class="day-date">${day.getDate()}.${day.getMonth() + 1}.</span></div>`;

    if (sorted.length === 0) {
      html += '<div class="empty">—</div>';
    } else {
      sorted.forEach(act => {
        let title = act.title;
        if (act.status === 'replaced' && act.alternative) {
          title = `${act.title} → ${act.alternative}`;
        }
        const titleClass = act.status === 'done' ? ' done' : '';
        const moodDot = act.mood ? `<span class="mood" style="background:${MOOD_COLORS[act.mood]}"></span>` : '';
        html += `<div class="activity"><span class="time">${act.startTime || ''}</span><span class="title${titleClass}">${title}</span>${moodDot}</div>`;
      });
    }
    html += '</div>';
  });

  // Stolz-Liste der letzten 7 Tage
  const weekStart = dateKey(oldest);
  const weekEnd = dateKey(newest);
  const weekProud = state.proudList.filter(p => p.date >= weekStart && p.date <= weekEnd);

  if (weekProud.length > 0) {
    html += '<div class="section-title">Worauf ich stolz bin</div>';
    let lastDate = null;
    weekProud.forEach(item => {
      if (item.date !== lastDate) {
        lastDate = item.date;
        const [y, m, d] = item.date.split('-');
        const dt = new Date(y, m - 1, d);
        html += `<div class="proud-date">${formatDate(dt)}</div>`;
      }
      html += `<div class="proud-item">★ ${item.text}</div>`;
    });
  }

  openPrintWindow('Wochenrückblick', html);
}

function exportProudPDF() {
  if (state.proudList.length === 0) return;

  let html = `<h1>Worauf ich stolz bin</h1>
<div class="subtitle">${state.proudList.length} Einträge</div>`;

  let lastDate = null;
  state.proudList.forEach(item => {
    if (item.date !== lastDate) {
      lastDate = item.date;
      const [y, m, d] = item.date.split('-');
      const dt = new Date(y, m - 1, d);
      html += `<div class="proud-date">${formatDate(dt)}</div>`;
    }
    html += `<div class="proud-item">★ ${item.text}</div>`;
  });

  openPrintWindow('Stolz-Liste', html);
}

// --- Helpers ---
function el(tag, className) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  return e;
}

function getMonday(d) {
  const dt = new Date(d);
  const day = dt.getDay();
  const diff = dt.getDate() - day + (day === 0 ? -6 : 1);
  dt.setDate(diff);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// --- Init ---
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

render();
