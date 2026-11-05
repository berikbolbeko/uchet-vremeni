'use strict';

/* =========================================================
   Учет времени — куда уходит ваше время.
   Все данные хранятся только на устройстве (localStorage).
   ========================================================= */

const STORAGE_KEY = 'uchet-vremeni.v1';
const DAY = 86400000;
/** Ночной сон, начатый с этого часа, целиком засчитывается в день пробуждения. */
const NIGHT_HOUR = 22;
const NONE_COLOR = '#8E8E93';
const PALETTE = [
  '#FF6B6B', '#FF9F43', '#FECA57', '#1DD1A1', '#10AC84', '#54A0FF',
  '#2E86DE', '#5F27CD', '#A29BFE', '#FF6B9D', '#8395A7', '#576574',
];
/** Иконки для занятий: эмодзи или собственные SVG-значки (ключи «svg:…», см. SVG_ICONS). */
const EMOJIS = [
  '💼', '💻', 'svg:code', '🔍', '✍️', '📖', '🗣️',          // работа, разработка, поиск, учёба
  '🏃', '🏋️', '🛌', '🍽️', '🙏', '🎵', '⭐',               // спорт, сон, еда, отдых
  '🚗', '🚌', '🛒', '🏠', '🧹', '👨‍👩‍👧', '👶',            // дорога, дом, семья, дети
  '📱', 'svg:tiktok', 'svg:instagram', 'svg:youtube', '📺', '🎮', '🎉', // соцсети, медиа, развлечения
];
const ICON_LABELS = {
  'svg:code': 'Разработка', '🔍': 'Поиск', '🛌': 'Сон', '👶': 'Дети', '🎉': 'Развлечения',
  'svg:tiktok': 'TikTok', 'svg:instagram': 'Instagram', 'svg:youtube': 'YouTube',
};

/* Значки, которых нет среди эмодзи. Рисуются в размер шрифта (1em), как эмодзи. */
let svgUid = 0;
const TIKTOK_NOTE = '<path d="M13.4 5.4v9.8a3.1 3.1 0 1 1-3.1-3.1"/><path d="M13.4 5.6c.4 2.1 1.9 3.4 4 3.6"/>';
const SVG_ICONS = {
  'svg:code': {
    text: '💻',
    html: () => {
      const id = `cd${++svgUid}`;
      return `<svg class="ico-svg" viewBox="0 0 24 24" aria-hidden="true">
        <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#3B4A66"/><stop offset="1" stop-color="#171D2B"/></linearGradient></defs>
        <rect x="1.8" y="1.8" width="20.4" height="20.4" rx="6" fill="url(#${id})"/>
        <path d="M9.1 8.3L5.5 12l3.6 3.7M14.9 8.3l3.6 3.7-3.6 3.7" fill="none" stroke="#fff"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M13.1 7.3l-2.2 9.4" stroke="#5EEAD4" stroke-width="2" stroke-linecap="round"/></svg>`;
    },
  },
  'svg:tiktok': {
    text: '🎵',
    html: () => `<svg class="ico-svg" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="1.8" y="1.8" width="20.4" height="20.4" rx="6" fill="#111"/>
      <g fill="none" stroke-width="2.3" stroke-linecap="round">
        <g stroke="#25F4EE" transform="translate(-.7 -.5)">${TIKTOK_NOTE}</g>
        <g stroke="#FE2C55" transform="translate(.7 .5)">${TIKTOK_NOTE}</g>
        <g stroke="#fff">${TIKTOK_NOTE}</g>
      </g></svg>`,
  },
  'svg:youtube': {
    text: '▶️',
    html: () => `<svg class="ico-svg" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="1.2" y="4.6" width="21.6" height="14.8" rx="4.4" fill="#FF0033"/>
      <path d="M9.8 8.7v6.6l5.7-3.3z" fill="#fff"/></svg>`,
  },
  'svg:instagram': {
    text: '📷',
    html: () => {
      const id = `ig${++svgUid}`;
      return `<svg class="ico-svg" viewBox="0 0 24 24" aria-hidden="true">
        <defs><radialGradient id="${id}" cx="0.28" cy="1.05" r="1.25">
          <stop offset="0" stop-color="#FFDD80"/><stop offset=".22" stop-color="#FCA03E"/>
          <stop offset=".48" stop-color="#F0386B"/><stop offset=".75" stop-color="#C32AA3"/>
          <stop offset="1" stop-color="#5B4BDB"/></radialGradient></defs>
        <rect x="1.8" y="1.8" width="20.4" height="20.4" rx="6" fill="url(#${id})"/>
        <rect x="6" y="6" width="12" height="12" rx="3.7" fill="none" stroke="#fff" stroke-width="1.8"/>
        <circle cx="12" cy="12" r="2.9" fill="none" stroke="#fff" stroke-width="1.8"/>
        <circle cx="16.2" cy="7.8" r="1.05" fill="#fff"/></svg>`;
    },
  },
};
/** HTML иконки занятия (эмодзи или SVG). */
const iconHTML = icon => {
  if (SVG_ICONS[icon]) return SVG_ICONS[icon].html();
  if (String(icon ?? '').startsWith('svg:')) return '⭐';
  return esc(icon ?? '❔');
};
/** Текстовый вариант иконки — для мест, где SVG невозможен (список <select>). */
const iconText = icon => SVG_ICONS[icon]?.text ?? (String(icon ?? '').startsWith('svg:') ? '⭐' : (icon ?? '❔'));
const PERIODS = [['day', 'День'], ['week', 'Неделя'], ['month', 'Месяц'], ['year', 'Год']];

/* ---------- Утилиты ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeColor = c => (/^#[0-9a-f]{6}$/i.test(c || '') ? c : NONE_COLOR);
function soft(hex, a = 0.16) {
  const n = parseInt(safeColor(hex).slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
const rgbOf = hex => { const n = parseInt(safeColor(hex).slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
/** Темнее (f < 0) или светлее (f > 0) исходного цвета. */
const shade = (hex, f) => `rgb(${rgbOf(hex).map(v => Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f)).join(',')})`;
/** Цвет текста поверх цветного фона: тёмный на светлых цветах, белый на остальных. */
const onColor = hex => { const [r, g, b] = rgbOf(hex); return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.68 ? '#1C1C1E' : '#FFFFFF'; };
const cvars = hex => `--c:${safeColor(hex)};--c-soft:${soft(hex)};--c-deep:${shade(hex, -0.3)};--on-c:${onColor(hex)}`;

/* SF Symbols-подобные иконки */
const ICON = {
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  xmark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>',
  stop: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="5" width="14" height="14" rx="3.5"/></svg>',
  reorder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 19V5M4.5 8.5L8 5l3.5 3.5M16 5v14M12.5 15.5L16 19l3.5-3.5"/></svg>',
  grip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M5 8h14M5 12h14M5 16h14"/></svg>',
  bars: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M5 20V5M12 20V10M19 20v-5"/></svg>',
};
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

const fmtClock = ms => {
  const s = Math.floor(Math.max(0, ms) / 1000);
  return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60]
    .map(n => String(n).padStart(2, '0')).join(':');
};
const fmtDur = ms => {
  const m = Math.floor(Math.max(0, ms) / 60000);
  const h = Math.floor(m / 60), mm = m % 60;
  if (h > 0) return mm > 0 ? `${h} ч ${mm} мин` : `${h} ч`;
  return `${mm} мин`;
};
const fmtTime = t => new Date(t).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
const fmtPct = (part, total) => (total > 0 ? `${Math.round((part / total) * 100)}%` : '0%');

function startOfDay(t) { const d = new Date(t); d.setHours(0, 0, 0, 0); return d; }
function dayTitle(t) {
  const d = startOfDay(t).getTime(), today = startOfDay(Date.now()).getTime();
  if (d === today) return 'Сегодня';
  if (d === startOfDay(today - DAY / 2).getTime()) return 'Вчера';
  return cap(new Date(t).toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }));
}
function toLocalInput(t) {
  const d = new Date(t);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}
const fromLocalInput = v => (v ? new Date(v).getTime() : NaN);

function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.setAttribute('role', 'status');
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add('hide'), 1800);
  setTimeout(() => t.remove(), 2200);
}

/* ---------- Данные ---------- */
function defaultState() {
  const now = Date.now();
  const defs = [
    ['Работа', '💼', '#2E86DE'], ['Разработка', 'svg:code', '#A29BFE'], ['Учёба', '📚', '#5F27CD'],
    ['Спорт', '🏃', '#10AC84'], ['Сон', '🛌', '#576574'], ['Еда', '🍽️', '#FF9F43'],
    ['Дорога', '🚗', '#FECA57'], ['Соцсети', '📱', '#FF6B6B'], ['Отдых', '🎮', '#FF6B9D'],
  ];
  return {
    version: 4,
    activities: defs.map(([name, icon, color], i) =>
      ({ id: uid() + i, name, icon, color, createdAt: now + i, order: i, overnight: name === 'Сон' })),
    entries: [],
  };
}
/** Обновление данных старых версий (и старых резервных копий). */
function migrate(s) {
  if (!(s.version >= 2)) {
    // v2: у занятия «Сон» включается режим «ночной сон»
    s.activities.forEach(a => { if (a.name.trim().toLowerCase() === 'сон') a.overnight = true; });
    s.version = 2;
  }
  if (!(s.version >= 3)) {
    // v3: новые иконки сна и разработки + занятие «Разработка» сразу после «Работы»
    s.activities.forEach(a => {
      if (a.icon === '😴') a.icon = '🛌';
      if (a.icon === '⌨️') a.icon = 'svg:code';
    });
    if (!s.activities.some(a => a.name.trim().toLowerCase() === 'разработка')) {
      const work = s.activities.find(a => a.name.trim().toLowerCase() === 'работа');
      s.activities.push({
        id: uid(), name: 'Разработка', icon: 'svg:code', color: '#A29BFE',
        createdAt: work ? Number(work.createdAt) + 0.5 : Date.now(), overnight: false,
      });
    }
    s.version = 3;
  }
  if (!(s.version >= 4)) {
    // v4: собственный порядок занятий (поле order), изначально — по дате создания
    [...s.activities].sort((a, b) => a.createdAt - b.createdAt).forEach((a, i) => { a.order = i; });
    s.version = 4;
  }
  return s;
}
function isValidState(s) {
  return !!s && Array.isArray(s.activities) && Array.isArray(s.entries)
    && s.activities.every(a => a && typeof a.id === 'string' && typeof a.name === 'string')
    && s.entries.every(e => e && typeof e.id === 'string' && Number.isFinite(e.start)
      && (e.end == null || Number.isFinite(e.end)));
}
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (isValidState(s)) return migrate(s);
  } catch { /* повреждённые данные — начинаем заново */ }
  return defaultState();
}
function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch { toast('Не удалось сохранить данные'); }
}

let state = load();
save();

/** Занятия в порядке пользователя (поле order), при равенстве — по дате создания. */
const sortedActivities = () => [...state.activities]
  .sort((a, b) => ((a.order ?? Infinity) - (b.order ?? Infinity)) || (a.createdAt - b.createdAt));
const nextOrder = () => state.activities.reduce((m, a) => Math.max(m, Number.isFinite(a.order) ? a.order : -1), -1) + 1;
const activityById = id => state.activities.find(a => a.id === id);
const runningEntry = () => state.entries.find(e => e.end == null);

function overlap(e, from, to, now) {
  const s = Math.max(e.start, from);
  const en = Math.min(e.end ?? now, to);
  return Math.max(0, en - s);
}
/** Ночной сон: занятие помечено как «ночное» и начато в NIGHT_HOUR или позже. */
function isOvernight(e) {
  return !!activityById(e.activityId)?.overnight && new Date(e.start).getHours() >= NIGHT_HOUR;
}
/** День, к которому относится запись: для ночного сна — день пробуждения. */
function creditDay(e, now) {
  return startOfDay(isOvernight(e) ? (e.end ?? now) : e.start).getTime();
}
/**
 * Сколько времени записи засчитывается в интервал [from, to).
 * Обычные записи делятся по реальному времени (часть до полуночи, часть после),
 * а ночной сон целиком идёт в день пробуждения.
 */
function credit(e, from, to, now) {
  if (isOvernight(e)) {
    const day = creditDay(e, now);
    return day >= from && day < to ? Math.max(0, (e.end ?? now) - e.start) : 0;
  }
  return overlap(e, from, to, now);
}
/** Суммарное время по занятиям за интервал, по убыванию. */
function totals(from, to, now, entries = state.entries) {
  const map = new Map();
  for (const e of entries) {
    const ms = credit(e, from, to, now);
    if (ms > 0) map.set(e.activityId, (map.get(e.activityId) || 0) + ms);
  }
  return [...map].map(([id, ms]) => ({ id, ms, act: activityById(id) })).sort((a, b) => b.ms - a.ms);
}
const sumOf = list => list.reduce((s, t) => s + t.ms, 0);
const nameOf = t => (t.act ? t.act.name : 'Без категории');
const iconOf = t => (t.act ? t.act.icon : '❔');
const colorOf = t => safeColor(t.act?.color);

function periodRange(period, anchor) {
  const d = new Date(anchor);
  let from, to;
  if (period === 'day') {
    from = startOfDay(d); to = new Date(from); to.setDate(to.getDate() + 1);
  } else if (period === 'week') {
    from = startOfDay(d); from.setDate(from.getDate() - ((from.getDay() + 6) % 7));
    to = new Date(from); to.setDate(to.getDate() + 7);
  } else if (period === 'month') {
    from = new Date(d.getFullYear(), d.getMonth(), 1); to = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  } else {
    from = new Date(d.getFullYear(), 0, 1); to = new Date(d.getFullYear() + 1, 0, 1);
  }
  return [from.getTime(), to.getTime()];
}
function shiftAnchor(period, anchor, n) {
  const d = new Date(anchor);
  if (period === 'day') d.setDate(d.getDate() + n);
  else if (period === 'week') d.setDate(d.getDate() + 7 * n);
  else if (period === 'month') { d.setDate(1); d.setMonth(d.getMonth() + n); }
  else d.setFullYear(d.getFullYear() + n);
  return d.getTime();
}

/* ---------- Действия ---------- */
function toggleActivity(id) {
  const r = runningEntry();
  const same = r && r.activityId === id;
  if (r) stopEntry(r);
  if (!same) state.entries.push({ id: uid(), activityId: id, start: Date.now(), end: null, note: '' });
  save();
  render();
  navigator.vibrate?.(12);
}
function stopEntry(e) {
  e.end = Date.now();
  // Случайные нажатия короче 5 секунд не сохраняем
  if (e.end - e.start < 5000) state.entries = state.entries.filter(x => x !== e);
}

/* ---------- Состояние экранов ---------- */
let tab = 'timer';
let statsPeriod = 'day';
let statsAnchor = Date.now();
let historyDays = 30;
const view = $('#view');

const TABS = ['timer', 'stats', 'history', 'activities'];
const navbar = $('#navbar');

/**
 * Крупный заголовок в контенте + компактный заголовок и стеклянные кнопки в верхней панели.
 * Кнопка — строка с действием (кнопка «+») или объект { action, icon, label, prominent }.
 */
function header(title, ...actions) {
  $('.navbar-title', navbar).textContent = title;
  $('.navbar-actions', navbar).innerHTML = actions
    .map(a => (typeof a === 'string' ? { action: a, icon: ICON.plus, label: 'Добавить' } : a))
    .map(a => `<button class="glass-btn${a.prominent ? ' prominent' : ''}" data-action="${a.action}"
      aria-label="${a.label}" title="${a.label}">${a.icon}</button>`).join('');
  return `<h1 class="large-title">${title}</h1>`;
}

const updateScrolled = () => document.body.classList.toggle('scrolled', window.scrollY > 36);
window.addEventListener('scroll', updateScrolled, { passive: true });

function render() {
  $$('.tabbar button').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  $('.tabbar').style.setProperty('--i', TABS.indexOf(tab));
  ({ timer: renderTimer, stats: renderStats, history: renderHistory, activities: renderActivities })[tab]();
  updateScrolled();
}

/* ---------- Экран «Таймер» ---------- */
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

function stripHTML(tot, sum) {
  if (sum <= 0) return '';
  return tot.map(t => `<i style="flex:${t.ms};background:${colorOf(t)}"></i>`).join('');
}

function renderTimer() {
  const now = Date.now();
  const r = runningEntry();
  const [from, to] = periodRange('day', now);
  const tot = totals(from, to, now);
  const byId = new Map(tot.map(t => [t.id, t.ms]));
  const sum = sumOf(tot);

  let current;
  if (r) {
    const act = activityById(r.activityId);
    current = `
      <section class="current" style="${cvars(act?.color)}">
        <div class="current-name">${iconHTML(act?.icon)} ${esc(act?.name ?? 'Без категории')}</div>
        <div class="clock mono" data-live="clock">${fmtClock(now - r.start)}</div>
        <div class="since">начато в ${fmtTime(r.start)}</div>
        <button class="btn glass-tint" data-action="stop">${ICON.stop} Стоп</button>
      </section>`;
  } else {
    current = `
      <section class="placeholder">
        <div class="big">⏳</div>
        <strong>Сейчас ничего не отслеживается</strong>
        <span class="muted small">Нажмите на занятие ниже, чтобы запустить таймер</span>
      </section>`;
  }

  const banner = isIOS() && !isStandalone() && !localStorage.getItem('hideInstall') ? `
    <div class="banner">
      <span>📲</span>
      <span>Чтобы установить приложение, нажмите <b>«Поделиться»</b> внизу Safari и выберите <b>«На экран „Домой“»</b>.</span>
      <button data-action="hide-install" aria-label="Скрыть">×</button>
    </div>` : '';

  view.innerHTML = `
    ${header('Учет времени')}
    ${banner}
    ${current}
    <section class="today">
      <div class="row-line"><h2>Сегодня</h2><span class="muted mono" data-live="today-sum">${fmtDur(sum)}</span></div>
      <div class="strip" data-live="strip">${stripHTML(tot, sum)}</div>
    </section>
    <div class="grid">
      ${sortedActivities().map(a => {
        const active = r && r.activityId === a.id;
        const ms = byId.get(a.id) || 0;
        return `
          <button class="tile ${active ? 'active' : ''}" data-action="toggle" data-id="${esc(a.id)}" style="${cvars(a.color)}">
            <span class="tile-icon">${iconHTML(a.icon)}</span>
            <span class="tile-name">${esc(a.name)}</span>
            <span class="tile-time mono" data-tile="${esc(a.id)}">${ms > 0 ? fmtDur(ms) : ''}</span>
          </button>`;
      }).join('')}
      <button class="tile add" data-action="new-activity">
        <span class="tile-icon">${ICON.plus}</span>
        <span class="tile-name">Добавить</span>
        <span class="tile-time"></span>
      </button>
    </div>`;
}

/** Обновление «живых» значений раз в секунду без перерисовки всего экрана. */
function tickTimer(r) {
  const now = Date.now();
  const clock = $('[data-live="clock"]');
  if (clock) clock.textContent = fmtClock(now - r.start);
  const [from, to] = periodRange('day', now);
  const tot = totals(from, to, now);
  const sum = sumOf(tot);
  const sumEl = $('[data-live="today-sum"]');
  if (sumEl) sumEl.textContent = fmtDur(sum);
  const strip = $('[data-live="strip"]');
  if (strip) strip.innerHTML = stripHTML(tot, sum);
  const tile = $$('[data-tile]').find(el => el.dataset.tile === r.activityId);
  const mine = tot.find(t => t.id === r.activityId);
  if (tile && mine) tile.textContent = fmtDur(mine.ms);
}

/* ---------- Экран «Статистика» ---------- */
function periodTitle(from, to) {
  switch (statsPeriod) {
    case 'day': return dayTitle(from);
    case 'week': {
      const o = { day: 'numeric', month: 'short' };
      return `${new Date(from).toLocaleDateString('ru-RU', o)} – ${new Date(to - 1).toLocaleDateString('ru-RU', o)}`;
    }
    case 'month': return cap(new Date(from).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }));
    default: return String(new Date(from).getFullYear());
  }
}

function donutSVG(tot, sum) {
  const r = 78, C = 2 * Math.PI * r;
  const gap = tot.length > 1 ? 2.5 : 0;
  let acc = 0;
  const segs = tot.map(t => {
    const len = (C * t.ms) / sum;
    const seg = `<circle cx="100" cy="100" r="${r}" fill="none" stroke="${colorOf(t)}" stroke-width="26"
      stroke-dasharray="${Math.max(0.5, len - gap).toFixed(2)} ${C.toFixed(2)}" stroke-dashoffset="${(-acc).toFixed(2)}"/>`;
    acc += len;
    return seg;
  }).join('');
  return `<svg viewBox="0 0 200 200" class="donut" role="img" aria-label="Распределение времени">
    <g transform="rotate(-90 100 100)">${segs}</g>
    <text x="100" y="93" class="donut-label">Всего</text>
    <text x="100" y="117" class="donut-value">${fmtDur(sum)}</text>
  </svg>`;
}

function niceMax(h) {
  if (h <= 0) return 1;
  const mag = 10 ** Math.floor(Math.log10(h));
  for (const m of [1, 2, 2.5, 5, 10]) if (h <= m * mag) return m * mag;
  return 10 * mag;
}

function barsSVG(from, to, now, order) {
  const unit = statsPeriod === 'year' ? 'month' : 'day';
  const relevant = state.entries.filter(e => credit(e, from, to, now) > 0);
  const buckets = [];
  for (let cur = new Date(from); cur.getTime() < to;) {
    const next = new Date(cur);
    if (unit === 'month') next.setMonth(next.getMonth() + 1); else next.setDate(next.getDate() + 1);
    const parts = totals(cur.getTime(), Math.min(next.getTime(), to), now, relevant);
    buckets.push({ start: cur.getTime(), parts, sum: sumOf(parts) });
    cur = next;
  }
  const maxH = niceMax(Math.max(...buckets.map(b => b.sum)) / 3600000);
  const W = 340, H = 180, L = 34, R = 4, T = 10, B = 22;
  const pw = W - L - R, ph = H - T - B;
  const bw = pw / buckets.length;
  const barW = Math.min(30, Math.max(3, bw * 0.62));
  let svg = '';
  for (const f of [0, 0.5, 1]) {
    const y = T + ph * (1 - f);
    const label = `${+(maxH * f).toFixed(1)} ч`.replace('.', ',');
    svg += `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" class="grid-line"/>
      <text x="${L - 6}" y="${y + 3.5}" class="axis" text-anchor="end">${label}</text>`;
  }
  buckets.forEach((b, i) => {
    const x = L + i * bw + (bw - barW) / 2;
    let y = T + ph;
    for (const id of order) {
      const p = b.parts.find(q => q.id === id);
      if (!p) continue;
      const h = (ph * (p.ms / 3600000)) / maxH;
      y -= h;
      svg += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}"
        height="${Math.max(0.5, h - 0.6).toFixed(1)}" rx="1.5" fill="${colorOf(p)}"/>`;
    }
    const d = new Date(b.start);
    let label = '';
    if (unit === 'month') label = d.toLocaleDateString('ru-RU', { month: 'narrow' }).toUpperCase();
    else if (statsPeriod === 'week') label = d.toLocaleDateString('ru-RU', { weekday: 'short' });
    else if (d.getDate() === 1 || d.getDate() % 5 === 0) label = String(d.getDate());
    if (label) svg += `<text x="${(x + barW / 2).toFixed(1)}" y="${H - 6}" class="axis" text-anchor="middle">${label}</text>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" class="bars" role="img" aria-label="Время по дням">${svg}</svg>`;
}

function renderStats() {
  const now = Date.now();
  const [from, to] = periodRange(statsPeriod, statsAnchor);
  const tot = totals(from, to, now);
  const sum = sumOf(tot);
  const days = Math.max(1, Math.ceil((Math.min(to, now) - from) / DAY));
  const maxMs = tot[0]?.ms || 1;

  let body;
  if (!tot.length) {
    body = `<div class="empty"><div class="big">📊</div><strong>Нет данных</strong>За этот период ничего не записано</div>`;
  } else {
    body = `
      <section class="card">${donutSVG(tot, sum)}</section>
      ${statsPeriod !== 'day' ? `
        <h3 class="section-title"><span>${statsPeriod === 'year' ? 'По месяцам' : 'По дням'}</span></h3>
        <section class="card">${barsSVG(from, to, now, tot.map(t => t.id))}</section>` : ''}
      <h3 class="section-title"><span>Куда ушло время</span></h3>
      <section class="card list">
        ${tot.map(t => `
          <div class="row-item">
            <span class="ticon" style="background:${soft(colorOf(t))}">${iconHTML(iconOf(t))}</span>
            <div class="row-main">
              <div class="row-line"><span class="row-name">${esc(nameOf(t))}</span><span class="mono">${fmtDur(t.ms)}</span></div>
              <div class="bar"><i style="width:${((t.ms / maxMs) * 100).toFixed(1)}%;background:${colorOf(t)}"></i></div>
              <div class="row-line small muted"><span>${fmtPct(t.ms, sum)}</span>${days > 1 ? `<span>≈ ${fmtDur(t.ms / days)} в день</span>` : ''}</div>
            </div>
          </div>`).join('')}
      </section>`;
  }

  const segIndex = PERIODS.findIndex(([k]) => k === statsPeriod);
  view.innerHTML = `
    ${header('Статистика')}
    <div class="segmented">
      <span class="seg-thumb" style="--i:${prevSegIndex}"></span>
      ${PERIODS.map(([k, label]) => `<button class="${k === statsPeriod ? 'on' : ''}" data-action="period" data-v="${k}">${label}</button>`).join('')}
    </div>
    <div class="navigator">
      <button class="glass-btn" data-action="prev" aria-label="Назад">${ICON.left}</button>
      <strong>${periodTitle(from, to)}</strong>
      <button class="glass-btn" data-action="next" aria-label="Вперёд" ${to > now ? 'disabled' : ''}>${ICON.right}</button>
    </div>
    ${body}`;
  // бегунок плавно «перетекает» к выбранному периоду
  if (segIndex !== prevSegIndex) {
    const thumb = $('.seg-thumb', view);
    requestAnimationFrame(() => requestAnimationFrame(() => thumb.style.setProperty('--i', segIndex)));
    prevSegIndex = segIndex;
  }
}
let prevSegIndex = 0;

/* ---------- Экран «История» ---------- */
function renderHistory() {
  const now = Date.now();
  const sorted = [...state.entries].sort((a, b) => b.start - a.start);
  const groups = new Map();
  for (const e of sorted) {
    const k = creditDay(e, now);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(e);
  }
  const keys = [...groups.keys()].sort((a, b) => b - a);
  const shown = keys.slice(0, historyDays);

  let body;
  if (!sorted.length) {
    body = `<div class="empty"><div class="big">🕘</div><strong>История пуста</strong>Запустите таймер или добавьте запись вручную кнопкой «+»</div>`;
  } else {
    body = shown.map(k => {
      const items = groups.get(k);
      const total = items.reduce((s, e) => s + ((e.end ?? now) - e.start), 0);
      return `
        <h3 class="section-title"><span>${dayTitle(k)}</span><span class="mono">${fmtDur(total)}</span></h3>
        <section class="card list">
          ${items.map(e => {
            const act = activityById(e.activityId);
            const color = safeColor(act?.color);
            const range = `${fmtTime(e.start)} – ${e.end == null ? 'идёт…' : fmtTime(e.end)}`;
            return `
              <button class="row-item" data-action="edit-entry" data-id="${esc(e.id)}">
                <span class="ticon" style="background:${soft(color)}">${iconHTML(act?.icon)}</span>
                <div class="row-main">
                  <div class="row-line"><span class="row-name">${esc(act?.name ?? 'Без категории')}</span>
                    <span class="mono" ${e.end == null ? `style="color:${color}"` : ''}>${fmtDur((e.end ?? now) - e.start)}</span></div>
                  <div class="row-sub">${range}${e.note ? ' · ' + esc(e.note) : ''}</div>
                </div>
              </button>`;
          }).join('')}
        </section>`;
    }).join('') + (keys.length > shown.length
      ? `<div style="margin-top:20px"><button class="btn plain" data-action="more-history">Показать ещё</button></div>` : '');
  }
  view.innerHTML = header('История', 'new-entry') + body;
}

/* ---------- Экран «Занятия» ---------- */
let reorderMode = false;
const USAGE_DAYS = 30;

/** Время по занятиям за последние USAGE_DAYS дней. */
function recentUsage() {
  const now = Date.now();
  return new Map(totals(now - USAGE_DAYS * DAY, now, now).map(t => [t.id, t.ms]));
}

/** Режим «Изменить порядок»: перетаскивание за ≡ и сортировка по частоте. */
function renderReorder(acts) {
  const usage = recentUsage();
  view.innerHTML = `
    ${header('Порядок', { action: 'reorder-done', icon: ICON.check, label: 'Готово', prominent: true })}
    <button class="btn plain usage-btn" data-action="sort-usage">${ICON.bars} Самые частые — наверх</button>
    <p class="note">Сортировка по времени за последние ${USAGE_DAYS} дней. Или перетащите занятие за ≡.</p>
    <section class="card list reorder-list" id="reorder-list">
      ${acts.map(a => `
        <div class="row-item" data-id="${esc(a.id)}">
          <span class="ticon" style="background:${soft(a.color)}">${iconHTML(a.icon)}</span>
          <div class="row-main"><div class="row-name">${esc(a.name)}</div>
            <div class="row-sub">${usage.get(a.id) ? `${fmtDur(usage.get(a.id))} за ${USAGE_DAYS} дн.` : 'не использовалось'}</div></div>
          <span class="grip" data-grip role="button" aria-label="Перетащить «${esc(a.name)}»">${ICON.grip}</span>
        </div>`).join('')}
    </section>`;
  initDrag($('#reorder-list', view));
}

function saveOrder(ids) {
  ids.forEach((id, i) => { const a = activityById(id); if (a) a.order = i; });
  save();
}

function sortByUsage() {
  const usage = recentUsage();
  // сортировка стабильная: при равном времени сохраняется текущий порядок
  const ids = sortedActivities().sort((a, b) => (usage.get(b.id) || 0) - (usage.get(a.id) || 0)).map(a => a.id);
  saveOrder(ids);
  render();
  toast('Самые частые занятия — наверху');
}

/** Перетаскивание строк за «ручку» ≡ (работает пальцем и мышью). */
function initDrag(list) {
  list.addEventListener('pointerdown', ev => {
    const grip = ev.target.closest('[data-grip]');
    if (!grip || ev.button > 0) return;
    ev.preventDefault();
    const row = grip.closest('.row-item');
    const rows = [...list.querySelectorAll('.row-item')];
    const rects = rows.map(r => r.getBoundingClientRect());
    const centers = rects.map(r => r.top + r.height / 2);
    const from = rows.indexOf(row);
    const h = rects[from].height;
    const minDy = rects[0].top - rects[from].top;
    const maxDy = rects[rects.length - 1].bottom - rects[from].bottom;
    const startY = ev.clientY;
    const startScroll = window.scrollY;
    let lastY = startY;
    let to = from;
    row.classList.add('dragging');
    list.classList.add('is-dragging');
    try { grip.setPointerCapture(ev.pointerId); } catch { /* синтетические события */ }

    const apply = () => {
      // смещение в координатах документа: учитываем прокрутку во время перетаскивания
      const dy = Math.max(minDy, Math.min(maxDy, lastY - startY + (window.scrollY - startScroll)));
      row.style.transform = `translateY(${dy}px) scale(1.02)`;
      const c = centers[from] + dy;
      to = centers.filter((y, i) => i !== from && y < c).length;
      rows.forEach((r, i) => {
        if (r === row) return;
        let shift = 0;
        if (from < to && i > from && i <= to) shift = -h;
        if (from > to && i < from && i >= to) shift = h;
        r.style.transform = shift ? `translateY(${shift}px)` : '';
      });
    };
    const move = e => { lastY = e.clientY; apply(); };
    // автопрокрутка, когда палец у верхнего или нижнего края экрана (внизу — таббар)
    let raf = 0;
    const autoScroll = () => {
      const top = 110, bottom = window.innerHeight - 140;
      let v = 0;
      if (lastY > bottom) v = Math.min(16, (lastY - bottom) / 5);
      else if (lastY < top) v = -Math.min(16, (top - lastY) / 5);
      if (v) { window.scrollBy(0, v); apply(); }
      raf = requestAnimationFrame(autoScroll);
    };
    raf = requestAnimationFrame(autoScroll);
    const up = () => {
      cancelAnimationFrame(raf);
      grip.removeEventListener('pointermove', move);
      grip.removeEventListener('pointerup', up);
      grip.removeEventListener('pointercancel', up);
      const ids = rows.map(r => r.dataset.id);
      const [moved] = ids.splice(from, 1);
      ids.splice(to, 0, moved);
      saveOrder(ids);
      if (to !== from) navigator.vibrate?.(8);
      render();
    };
    grip.addEventListener('pointermove', move);
    grip.addEventListener('pointerup', up);
    grip.addEventListener('pointercancel', up);
  });
}

function renderActivities() {
  const counts = new Map();
  for (const e of state.entries) counts.set(e.activityId, (counts.get(e.activityId) || 0) + 1);
  const bytes = new Blob([localStorage.getItem(STORAGE_KEY) || '']).size;
  const acts = sortedActivities();
  if (reorderMode && acts.length) return renderReorder(acts);

  view.innerHTML = `
    ${header('Занятия', { action: 'reorder', icon: ICON.reorder, label: 'Изменить порядок' }, 'new-activity')}
    ${acts.length ? `
    <section class="card list">
      ${acts.map(a => `
        <button class="row-item" data-action="edit-activity" data-id="${esc(a.id)}">
          <span class="ticon" style="background:${soft(a.color)}">${iconHTML(a.icon)}</span>
          <div class="row-main"><div class="row-line"><span class="row-name">${esc(a.name)}</span>
            <span class="muted small">${counts.get(a.id) || 0} зап.</span></div>
            ${a.overnight ? `<div class="row-sub">🌙 после ${NIGHT_HOUR}:00 — в день пробуждения</div>` : ''}</div>
          <span class="chev">${ICON.right}</span>
        </button>`).join('')}
    </section>` : `<div class="empty"><div class="big">🗂️</div><strong>Нет занятий</strong>Добавьте первое кнопкой «+»</div>`}

    <h3 class="section-title"><span>Данные</span></h3>
    <section class="card list">
      <button class="row-item" data-action="export">
        <span class="ticon" style="background:${soft('#2E86DE')}">💾</span>
        <div class="row-main"><div class="row-name">Сохранить резервную копию</div>
          <div class="row-sub">Файл можно сохранить в «Файлы» или iCloud</div></div>
      </button>
      <button class="row-item" data-action="import">
        <span class="ticon" style="background:${soft('#10AC84')}">📥</span>
        <div class="row-main"><div class="row-name">Восстановить из копии</div>
          <div class="row-sub">Заменит текущие данные</div></div>
      </button>
    </section>
    <p class="note">Записей: ${state.entries.length} · занято ${(bytes / 1024).toFixed(1)} КБ.<br>
      Данные хранятся только на этом телефоне. Если удалить иконку с экрана «Домой», они тоже удалятся —
      поэтому иногда сохраняйте резервную копию.</p>`;
}

/* ---------- Нижний лист (формы) ---------- */
const sheetRoot = $('#sheet-root');
let sheetHandler = null;

function openSheet(html, handler) {
  sheetRoot.innerHTML = `<div class="backdrop" data-action="close"></div><div class="sheet" role="dialog" aria-modal="true">${html}</div>`;
  sheetRoot.hidden = false;
  document.body.classList.add('noscroll');
  sheetHandler = handler;
  return $('.sheet', sheetRoot);
}
function closeSheet() {
  sheetRoot.hidden = true;
  sheetRoot.innerHTML = '';
  sheetHandler = null;
  document.body.classList.remove('noscroll');
}
/** Шапка листа в стиле iOS 26+: стеклянные круглые кнопки «✕» и «✓». */
const sheetHead = title => `
  <div class="grabber"></div>
  <div class="sheet-head">
    <button class="glass-btn" data-action="close" aria-label="Отмена">${ICON.xmark}</button>
    <strong>${title}</strong>
    <button class="glass-btn prominent" data-action="save" aria-label="Сохранить">${ICON.check}</button>
  </div>`;

function openEntryEditor(entry) {
  const isNew = !entry;
  const now = Date.now();
  const acts = sortedActivities();
  const d = entry ?? { activityId: acts[0]?.id ?? null, start: now - 3600000, end: now, note: '' };
  const wasRunning = !isNew && entry.end == null;
  const known = acts.some(a => a.id === d.activityId);

  const sheet = openSheet(`
    ${sheetHead(isNew ? 'Новая запись' : 'Запись')}
    <div class="form">
      <label class="field"><span>Занятие</span>
        <select name="activity">
          ${acts.map(a => `<option value="${esc(a.id)}" ${a.id === d.activityId ? 'selected' : ''}>${esc(iconText(a.icon))} ${esc(a.name)}</option>`).join('')}
          <option value="" ${known ? '' : 'selected'}>Без категории</option>
        </select>
      </label>
      <div class="group">
        <label class="field"><span>Начало</span><input type="datetime-local" name="start" value="${toLocalInput(d.start)}"></label>
        ${wasRunning ? '<label class="field"><span>Ещё идёт</span><input type="checkbox" name="running" class="switch" checked></label>' : ''}
        <label class="field" data-end ${wasRunning ? 'hidden' : ''}><span>Конец</span>
          <input type="datetime-local" name="end" value="${toLocalInput(d.end ?? now)}"></label>
        <div class="field"><span>Длительность</span><span class="muted" data-dur></span></div>
      </div>
      <label class="field col"><span class="label-small">Заметка</span>
        <textarea name="note" rows="2" placeholder="Что делали?" maxlength="200">${esc(d.note)}</textarea></label>
      ${isNew ? '' : '<button class="btn danger-soft" data-action="delete">Удалить запись</button>'}
    </div>`, action => {
    if (action === 'save') {
      const v = read();
      if (!valid(v)) return;
      if (isNew) state.entries.push({ id: uid(), activityId: v.activityId, start: v.start, end: v.end, note: v.note });
      else Object.assign(entry, { activityId: v.activityId, start: v.start, end: v.end, note: v.note });
      if (v.end == null) state.entries.forEach(e => { if (e !== entry && e.end == null) e.end = Date.now(); });
      save(); closeSheet(); render();
    } else if (action === 'delete') {
      if (!confirm('Удалить эту запись?')) return;
      state.entries = state.entries.filter(e => e !== entry);
      save(); closeSheet(); render();
    }
  });

  const read = () => {
    const running = $('[name="running"]', sheet)?.checked ?? false;
    return {
      activityId: $('[name="activity"]', sheet).value || null,
      start: fromLocalInput($('[name="start"]', sheet).value),
      end: running ? null : fromLocalInput($('[name="end"]', sheet).value),
      note: $('[name="note"]', sheet).value.trim(),
    };
  };
  const valid = v => Number.isFinite(v.start) && (v.end == null || (Number.isFinite(v.end) && v.end > v.start));
  const update = () => {
    const v = read();
    $('[data-end]', sheet).hidden = v.end == null && wasRunning && $('[name="running"]', sheet)?.checked;
    const ok = valid(v);
    const dur = $('[data-dur]', sheet);
    dur.textContent = ok ? fmtDur((v.end ?? Date.now()) - v.start) : 'конец раньше начала';
    dur.classList.toggle('err', !ok);
    $('[data-action="save"]', sheet).disabled = !ok;
  };
  sheet.addEventListener('input', update);
  sheet.addEventListener('change', update);
  update();
}

function openActivityEditor(act) {
  let color = safeColor(act?.color ?? PALETTE[5]);
  let icon = act?.icon ?? EMOJIS[0];

  const sheet = openSheet(`
    ${sheetHead(act ? 'Изменить' : 'Новое занятие')}
    <div class="form">
      <div class="field">
        <span class="ticon big" data-preview>${iconHTML(icon)}</span>
        <input name="name" class="grow" placeholder="Название" maxlength="30" autocomplete="off" value="${esc(act?.name ?? '')}">
      </div>
      <label class="field">
        <span>🌙 Ночной сон<span class="hint">Если начато в ${NIGHT_HOUR}:00 или позже — всё время
          засчитывается в день пробуждения</span></span>
        <input type="checkbox" name="overnight" class="switch" ${act?.overnight ? 'checked' : ''}>
      </label>
      <div class="label-small">Цвет</div>
      <div class="card swatches">
        ${PALETTE.map(c => `<button class="swatch" data-action="color" data-v="${c}" style="background:${c};--sw:${c}" aria-label="Цвет"></button>`).join('')}
      </div>
      <div class="label-small">Иконка</div>
      <div class="card emojis">
        ${EMOJIS.map(e => `<button class="emoji" data-action="icon" data-v="${esc(e)}"
          ${ICON_LABELS[e] ? `title="${ICON_LABELS[e]}" aria-label="${ICON_LABELS[e]}"` : ''}>${iconHTML(e)}</button>`).join('')}
      </div>
      ${act ? '<button class="btn danger-soft" data-action="delete">Удалить занятие</button>' : ''}
    </div>`, (action, el) => {
    if (action === 'color') { color = el.dataset.v; paint(); }
    else if (action === 'icon') { icon = el.dataset.v; paint(); }
    else if (action === 'save') {
      const name = nameInput.value.trim();
      if (!name) return;
      const overnight = $('[name="overnight"]', sheet).checked;
      if (act) Object.assign(act, { name, color, icon, overnight });
      else state.activities.push({ id: uid(), name, color, icon, overnight, createdAt: Date.now(), order: nextOrder() });
      save(); closeSheet(); render();
    } else if (action === 'delete') {
      const n = state.entries.filter(e => e.activityId === act.id).length;
      if (!confirm(`Удалить «${act.name}»?${n ? `\nВместе с ним удалятся записи: ${n}.` : ''}`)) return;
      state.activities = state.activities.filter(a => a !== act);
      state.entries = state.entries.filter(e => e.activityId !== act.id);
      save(); closeSheet(); render();
    }
  });

  const nameInput = $('[name="name"]', sheet);
  const paint = () => {
    sheet.setAttribute('style', cvars(color));
    const preview = $('[data-preview]', sheet);
    preview.innerHTML = iconHTML(icon);
    preview.style.background = soft(color);
    $$('.swatch', sheet).forEach(b => {
      const on = b.dataset.v === color;
      b.classList.toggle('on', on);
      b.textContent = on ? '✓' : '';
    });
    $$('.emoji', sheet).forEach(b => b.classList.toggle('on', b.dataset.v === icon));
    $('[data-action="save"]', sheet).disabled = !nameInput.value.trim();
  };
  nameInput.addEventListener('input', paint);
  paint();
}

/* ---------- Резервная копия ---------- */
async function exportData() {
  const name = `uchet-vremeni-${toLocalInput(Date.now()).slice(0, 10)}.json`;
  const file = new File([JSON.stringify(state, null, 1)], name, { type: 'application/json' });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: 'Учет времени' }); return; }
    catch (err) { if (err.name === 'AbortError') return; }
  }
  const url = URL.createObjectURL(file);
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

const importInput = $('#import-file');
importInput.addEventListener('change', async () => {
  const file = importInput.files[0];
  importInput.value = '';
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!isValidState(data)) throw new Error('bad');
    if (!confirm(`Заменить текущие данные копией?\nЗанятий: ${data.activities.length}, записей: ${data.entries.length}.`)) return;
    data.activities.forEach((a, i) => {
      a.color = safeColor(a.color); a.icon = String(a.icon ?? '⭐');
      a.createdAt = Number(a.createdAt) || i; a.overnight = !!a.overnight;
      if (!Number.isFinite(a.order)) delete a.order;
    });
    state = migrate(data);
    save(); render();
    toast('Данные восстановлены');
  } catch {
    alert('Не удалось прочитать файл. Выберите резервную копию «Учета времени» (.json).');
  }
});

/* ---------- Обработка нажатий ---------- */
document.addEventListener('click', ev => {
  const el = ev.target.closest('[data-action]');
  if (!el || el.disabled) return;
  const action = el.dataset.action;

  if (sheetRoot.contains(el)) {
    if (action === 'close') closeSheet();
    else sheetHandler?.(action, el);
    return;
  }

  switch (action) {
    case 'tab':
      if (tab !== el.dataset.tab) { tab = el.dataset.tab; reorderMode = false; render(); window.scrollTo(0, 0); }
      break;
    case 'reorder': reorderMode = true; render(); window.scrollTo(0, 0); break;
    case 'reorder-done': reorderMode = false; render(); break;
    case 'sort-usage': sortByUsage(); break;
    case 'toggle': toggleActivity(el.dataset.id); break;
    case 'stop': {
      const r = runningEntry();
      if (r) { stopEntry(r); save(); render(); navigator.vibrate?.(12); }
      break;
    }
    case 'new-activity': openActivityEditor(null); break;
    case 'edit-activity': openActivityEditor(activityById(el.dataset.id)); break;
    case 'new-entry': openEntryEditor(null); break;
    case 'edit-entry': {
      const e = state.entries.find(x => x.id === el.dataset.id);
      if (e) openEntryEditor(e);
      break;
    }
    case 'period': statsPeriod = el.dataset.v; statsAnchor = Date.now(); render(); break;
    case 'prev': statsAnchor = shiftAnchor(statsPeriod, statsAnchor, -1); render(); break;
    case 'next': statsAnchor = shiftAnchor(statsPeriod, statsAnchor, 1); render(); break;
    case 'more-history': historyDays += 30; render(); break;
    case 'export': exportData(); break;
    case 'import': importInput.click(); break;
    case 'hide-install': localStorage.setItem('hideInstall', '1'); render(); break;
  }
});

/* ---------- Таймер обновления ---------- */
let ticks = 0;
setInterval(() => {
  if (document.hidden) return;
  ticks++;
  const r = runningEntry();
  if (!r) return;
  if (tab === 'timer') tickTimer(r);
  else if (ticks % 30 === 0 && !sheetHandler) render();
}, 1000);

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && !sheetHandler) render();
});
// Данные могли измениться в другой вкладке
window.addEventListener('storage', ev => {
  if (ev.key === STORAGE_KEY) { state = load(); if (!sheetHandler) render(); }
});

render();

/* ---------- Офлайн-режим и постоянное хранилище ---------- */
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
navigator.storage?.persist?.().catch(() => {});
