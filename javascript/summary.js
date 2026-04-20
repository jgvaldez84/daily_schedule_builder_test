const STORAGE_KEY = 'daily_schedule_v2';
const EXCLUDED_COLS = ['Lunch Break'];

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : { names: [], schedule: {} };
  } catch(e) { return { names: [], schedule: {} }; }
}

function dateKey(d) {
  return d.toISOString().slice(0, 10);
}

function generateWindows() {
  const windows = [];
  const start = new Date(2026, 4, 10);
  const end = new Date(2026, 5, 27);

  let d = new Date(start);
  while (d.getDay() !== 0) d.setDate(d.getDate() - 1);

  while (d <= end) {
    const windowStart = new Date(d);
    const windowEnd = new Date(d);
    windowEnd.setDate(windowEnd.getDate() + 13);
    windows.push({ start: new Date(windowStart), end: new Date(windowEnd) });
    d.setDate(d.getDate() + 14);
  }
  return windows;
}

const WINDOWS = generateWindows();
let currentWindow = 0;

function fmtShort(d) {
  return d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
}

function fmtDayCol(d) {
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const months = ['1','2','3','4','5','6','7','8','9','10','11','12'];
  return `${days[d.getDay()]} ${months[d.getMonth()]}/${d.getDate()}`;
}

function getDatesInWindow(win) {
  const dates = [];
  let d = new Date(win.start);
  while (d <= win.end) {
    dates.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

function countHours(state, name, dk) {
  const dayData = state.schedule[dk];
  if (!dayData) return 0;
  let slots = 0;
  Object.values(dayData).forEach(colData => {
    Object.entries(colData).forEach(([col, names]) => {
      if (EXCLUDED_COLS.includes(col)) return;
      if (Array.isArray(names) && names.includes(name)) slots++;
    });
  });
  return slots * 0.5;
}

function fmt(n) {
  if (n === 0) return '0';
  return n % 1 === 0 ? n.toString() : n.toFixed(1);
}

function renderTable() {
  const state = loadState();
  const win = WINDOWS[currentWindow];
  const dates = getDatesInWindow(win);
  const week1 = dates.slice(0, 7);
  const week2 = dates.slice(7, 14);

  document.getElementById('dateDisplay').textContent =
    `${fmtShort(win.start)} to ${fmtShort(win.end)}`;

  document.getElementById('prevBtn').disabled = currentWindow === 0;
  document.getElementById('nextBtn').disabled = currentWindow === WINDOWS.length - 1;

  const names = state.names.length > 0 ? state.names : [];
  const head = document.getElementById('summaryHead');
  const body = document.getElementById('summaryBody');
  const foot = document.getElementById('summaryFoot');

  head.innerHTML = '';
  body.innerHTML = '';
  foot.innerHTML = '';

  if (names.length === 0) {
    body.innerHTML = `<tr><td colspan="16" class="no-data">No names found. Add names in the schedule app first.</td></tr>`;
    return;
  }

  const tr1 = document.createElement('tr');
  const nameTh = document.createElement('th');
  nameTh.className = 'name-col';
  nameTh.rowSpan = 2;
  nameTh.textContent = 'Agent';
  tr1.appendChild(nameTh);

  const w1Th = document.createElement('th');
  w1Th.colSpan = 7;
  w1Th.textContent = `Week 1: ${fmtShort(week1[0])} – ${fmtShort(week1[6])}`;
  w1Th.style.background = '#a82020';
  tr1.appendChild(w1Th);

  const w2Th = document.createElement('th');
  w2Th.colSpan = 7;
  w2Th.textContent = `Week 2: ${fmtShort(week2[0])} – ${fmtShort(week2[6])}`;
  w2Th.style.background = '#a82020';
  tr1.appendChild(w2Th);

  const totalTh = document.createElement('th');
  totalTh.className = 'total-col';
  totalTh.rowSpan = 2;
  totalTh.textContent = 'Total';
  tr1.appendChild(totalTh);

  head.appendChild(tr1);

  const tr2 = document.createElement('tr');
  dates.forEach(d => {
    const th = document.createElement('th');
    th.className = 'day-col';
    th.innerHTML = fmtDayCol(d).replace(' ', '<br>');
    th.style.top = '128px';
    if (d.getDay() === 0) th.style.borderLeft = '2px solid rgba(255,255,255,0.4)';
    tr2.appendChild(th);
  });
  head.appendChild(tr2);

  const colTotals = {};
  dates.forEach(d => colTotals[dateKey(d)] = 0);
  let grandTotal = 0;

  names.forEach(name => {
    const tr = document.createElement('tr');

    const nameTd = document.createElement('td');
    nameTd.className = 'name-cell';
    nameTd.textContent = name;
    tr.appendChild(nameTd);

    let rowTotal = 0;

    dates.forEach(d => {
      const dk = dateKey(d);
      const hrs = countHours(state, name, dk);
      rowTotal += hrs;
      colTotals[dk] += hrs;

      const td = document.createElement('td');
      td.className = hrs === 0 ? 'zero' : 'has-hours';
      td.textContent = fmt(hrs);
      if (d.getDay() === 0) td.style.borderLeft = '2px solid #e8d0d0';
      tr.appendChild(td);
    });

    grandTotal += rowTotal;

    const totalTd = document.createElement('td');
    totalTd.className = 'total-cell';
    totalTd.textContent = fmt(rowTotal);
    tr.appendChild(totalTd);

    body.appendChild(tr);
  });

  const footTr = document.createElement('tr');
  const footLabel = document.createElement('td');
  footLabel.className = 'name-cell';
  footLabel.textContent = 'Daily Total';
  footTr.appendChild(footLabel);

  dates.forEach(d => {
    const dk = dateKey(d);
    const val = colTotals[dk];
    const td = document.createElement('td');
    td.className = val === 0 ? 'zero' : '';
    td.textContent = fmt(val);
    if (d.getDay() === 0) td.style.borderLeft = '2px solid #e0c8c8';
    footTr.appendChild(td);
  });

  const footTotal = document.createElement('td');
  footTotal.className = 'total-cell';
  footTotal.textContent = fmt(grandTotal);
  footTr.appendChild(footTotal);
  foot.appendChild(footTr);
}

function prevWindow() {
  if (currentWindow > 0) { currentWindow--; renderTable(); }
}

function nextWindow() {
  if (currentWindow < WINDOWS.length - 1) { currentWindow++; renderTable(); }
}

function exportCSV() {
  const state = loadState();
  const win = WINDOWS[currentWindow];
  const dates = getDatesInWindow(win);
  const names = state.names;

  const headers = ['Agent', ...dates.map(d => fmtDayCol(d)), 'Total'];
  const rows = [headers.join(',')];

  names.forEach(name => {
    let total = 0;
    const cols = [name];
    dates.forEach(d => {
      const hrs = countHours(state, name, dateKey(d));
      total += hrs;
      cols.push(fmt(hrs));
    });
    cols.push(fmt(total));
    rows.push(cols.join(','));
  });

  const colTotals = ['Daily Total'];
  let grand = 0;
  dates.forEach(d => {
    let t = 0;
    names.forEach(n => t += countHours(state, n, dateKey(d)));
    colTotals.push(fmt(t));
    grand += t;
  });
  colTotals.push(fmt(grand));
  rows.push(colTotals.join(','));

  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `hours-summary-${dateKey(win.start)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

renderTable();