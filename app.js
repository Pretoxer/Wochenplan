// --- Data Layer ---
const DB = {
  save(plans) {
    localStorage.setItem('wochenplan_data', JSON.stringify(plans));
  },
  load() {
    try {
      return JSON.parse(localStorage.getItem('wochenplan_data')) || {};
    } catch { return {}; }
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

  if (state.view === 'week') {
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
  const startInput = el('input', 'form-input time-input');
  startInput.type = 'time';
  startInput.id = 'add-start';

  const bis = el('span');
  bis.textContent = '–';
  bis.style.cssText = 'display:flex;align-items:center;color:var(--text-light);font-size:16px;';

  const endInput = el('input', 'form-input time-input');
  endInput.type = 'time';
  endInput.id = 'add-end';

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
  const startInput = el('input', 'form-input time-input');
  startInput.type = 'time';
  startInput.id = 'add-reflect-start';
  const bis = el('span');
  bis.textContent = '–';
  bis.style.cssText = 'display:flex;align-items:center;color:var(--text-light);font-size:16px;';
  const endInput = el('input', 'form-input time-input');
  endInput.type = 'time';
  endInput.id = 'add-reflect-end';
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
  exportBtn.textContent = 'Woche als Bild teilen';
  exportBtn.onclick = () => exportWeek(monday);
  exportSection.append(exportBtn);

  const container = el('div');
  container.append(weekNav, overview, exportSection);
  content.append(container);
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

  const todayBtn = el('button', 'nav-btn');
  todayBtn.innerHTML = '<span class="nav-icon">◎</span><span class="nav-label">Heute</span>';
  todayBtn.onclick = () => {
    state.selectedDate = new Date();
    state.view = 'day';
    state.tab = 'reflect';
    render();
  };

  nav.append(dayBtn, weekBtn, todayBtn);
  return nav;
}

// --- Export ---
async function exportWeek(monday) {
  const canvas = document.createElement('canvas');
  const w = 800;
  const rowH = 60;
  const headerH = 80;
  const padding = 24;
  const end = new Date(monday);
  end.setDate(end.getDate() + 6);

  let maxActs = 0;
  const days = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(monday);
    day.setDate(day.getDate() + i);
    const plan = getPlan(day);
    const sorted = [...plan.activities].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
    days.push({ day, activities: sorted });
    maxActs = Math.max(maxActs, sorted.length);
  }

  const dayBlockH = Math.max(rowH, 36 + maxActs * 26 + 10);
  const h = headerH + padding + days.length * dayBlockH + padding * 2;

  canvas.width = w * 2;
  canvas.height = h * 2;
  const ctx = canvas.getContext('2d');
  ctx.scale(2, 2);

  // Background
  ctx.fillStyle = '#F5F0E8';
  ctx.fillRect(0, 0, w, h);

  // Title
  ctx.fillStyle = '#2D4A3E';
  ctx.font = 'bold 24px -apple-system, sans-serif';
  ctx.fillText('Wochenplan', padding, padding + 28);

  ctx.fillStyle = '#8A8578';
  ctx.font = '14px -apple-system, sans-serif';
  ctx.fillText(`${formatDateShort(monday)} – ${formatDateShort(end)}`, padding, padding + 50);

  let y = headerH + padding;

  days.forEach(({ day, activities }) => {
    // Day card background
    ctx.fillStyle = isToday(day) ? '#FFFDF8' : '#FFFDF8';
    roundRect(ctx, padding, y, w - padding * 2, dayBlockH - 8, 10);
    ctx.fill();

    if (isToday(day)) {
      ctx.strokeStyle = '#2D4A3E';
      ctx.lineWidth = 2;
      roundRect(ctx, padding, y, w - padding * 2, dayBlockH - 8, 10);
      ctx.stroke();
    }

    // Day name
    ctx.fillStyle = '#2C2C2C';
    ctx.font = 'bold 15px -apple-system, sans-serif';
    ctx.fillText(WEEKDAYS_SHORT[day.getDay()], padding + 14, y + 24);

    ctx.fillStyle = '#8A8578';
    ctx.font = '12px -apple-system, sans-serif';
    ctx.fillText(`${day.getDate()}.${day.getMonth() + 1}.`, padding + 44, y + 24);

    // Activities
    let ax = padding + 90;
    let ay = y + 12;
    activities.forEach(act => {
      ctx.font = '12px -apple-system, sans-serif';
      ctx.fillStyle = '#8A8578';
      const timeStr = act.startTime || '';
      ctx.fillText(timeStr, ax, ay + 14);

      ctx.fillStyle = '#2C2C2C';
      ctx.font = '13px -apple-system, sans-serif';
      let displayTitle = act.title;
      if (act.status === 'replaced' && act.alternative) {
        displayTitle = `${act.title} → ${act.alternative}`;
      }
      ctx.fillText(displayTitle, ax + 50, ay + 14);

      if (act.mood) {
        ctx.fillStyle = MOOD_COLORS[act.mood];
        ctx.beginPath();
        ctx.arc(w - padding - 24, ay + 10, 6, 0, Math.PI * 2);
        ctx.fill();
      }

      if (act.status === 'done') {
        ctx.strokeStyle = '#8A8578';
        ctx.lineWidth = 1;
        const tw = ctx.measureText(displayTitle).width;
        ctx.beginPath();
        ctx.moveTo(ax + 50, ay + 11);
        ctx.lineTo(ax + 50 + tw, ay + 11);
        ctx.stroke();
      }

      ay += 26;
    });

    y += dayBlockH;
  });

  // Watermark
  ctx.fillStyle = '#C9BFA4';
  ctx.font = '11px -apple-system, sans-serif';
  ctx.fillText('Wochenplan', w - padding - 75, h - padding);

  canvas.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    if (navigator.share) {
      const file = new File([blob], 'wochenplan.png', { type: 'image/png' });
      navigator.share({ files: [file], title: 'Wochenplan' }).catch(() => {
        downloadBlob(url);
      });
    } else {
      downloadBlob(url);
    }
  }, 'image/png');
}

function downloadBlob(url) {
  const a = document.createElement('a');
  a.href = url;
  a.download = 'wochenplan.png';
  a.click();
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
