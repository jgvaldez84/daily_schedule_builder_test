const COLUMNS = ['HDQA','Phones','Chat/Email','Lunch Break','Onsite FTE','Onsite SD','Remote FTE','Embedded FTE'];

function generateDates() {
  const dates = [];
  const start = new Date(2026, 4, 10);
  const end = new Date(2026, 5, 27);
  let d = new Date(start);
  while (d <= end) {
    dates.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

const ALL_DATES = generateDates();

function generateTimes() {
  const times = [];
  for (let h = 7; h < 23; h++) {
    times.push(`${h}:00`);
    times.push(`${h}:30`);
  }
  return times;
}

const ALL_TIMES = generateTimes();

function fmt12(t) {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${h12}:${m === 0 ? '00' : '30'} ${ampm}`;
}

function dateKey(d) {
  return d.toISOString().slice(0, 10);
}

function fmtDateDisplay(d) {
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

let state = {
  currentIndex: 0,
  names: ['JOSE','AMST','CDIL','YANG','BXIO','EHUG'],
  schedule: {}
};

const MAX_UNDO = 20;
let undoHistory = [];

function deepCloneSchedule() {
  return JSON.parse(JSON.stringify(state.schedule));
}

function pushUndo() {
  undoHistory.push(deepCloneSchedule());
  if (undoHistory.length > MAX_UNDO) undoHistory.shift();
  updateUndoBtn();
}

function undo() {
  if (undoHistory.length === 0) return;
  state.schedule = undoHistory.pop();
  saveState();
  renderTable();
  updateUndoBtn();
  showToast('Undo successful');
}

function updateUndoBtn() {
  const btn = document.getElementById('undoBtn');
  if (!btn) return;
  btn.disabled = undoHistory.length === 0;
  btn.style.opacity = undoHistory.length === 0 ? '0.4' : '1';
  btn.style.cursor = undoHistory.length === 0 ? 'default' : 'pointer';
}

function loadState() {
  try {
    const saved = localStorage.getItem('daily_schedule_v2');
    if (saved) {
      const parsed = JSON.parse(saved);
      state.names = parsed.names || state.names;
      state.schedule = parsed.schedule || {};
      state.currentIndex = parsed.currentIndex || 0;
    }
  } catch(e) {}
}

function saveState() {
  try {
    localStorage.setItem('daily_schedule_v2', JSON.stringify({
      names: state.names,
      schedule: state.schedule,
      currentIndex: state.currentIndex
    }));
  } catch(e) {}
}

function currentDate() {
  return ALL_DATES[state.currentIndex];
}

function getCell(dateStr, time, col) {
  return (state.schedule[dateStr]?.[time]?.[col]) || [];
}

function setCell(dateStr, time, col, arr) {
  if (!state.schedule[dateStr]) state.schedule[dateStr] = {};
  if (!state.schedule[dateStr][time]) state.schedule[dateStr][time] = {};
  state.schedule[dateStr][time][col] = arr;
}

function prevDay() {
  if (state.currentIndex > 0) { state.currentIndex--; saveState(); renderTable(); }
}

function nextDay() {
  if (state.currentIndex < ALL_DATES.length - 1) { state.currentIndex++; saveState(); renderTable(); }
}

function renderTable() {
  const d = currentDate();
  document.getElementById('dateDisplay').textContent = fmtDateDisplay(d);
  const dk = dateKey(d);
  const body = document.getElementById('scheduleBody');
  body.innerHTML = '';

  ALL_TIMES.forEach((t) => {
    const tr = document.createElement('tr');
    tr.className = t.endsWith(':00') ? 'full-hour' : 'half-hour';

    const timeTd = document.createElement('td');
    timeTd.className = 'time-cell';
    timeTd.textContent = fmt12(t);
    tr.appendChild(timeTd);

    COLUMNS.forEach(col => {
      const td = document.createElement('td');
      const inner = document.createElement('div');
      inner.className = 'cell-inner';
      inner.dataset.time = t;
      inner.dataset.col = col;
      inner.title = 'Click to add name here';
      inner.onclick = () => openAddModalAt(t, col);

      const names = getCell(dk, t, col);
      names.forEach(name => {
        const badge = document.createElement('span');
        badge.className = 'badge';
        badge.innerHTML = `${name}<span class="remove-x">✕</span>`;
        badge.onclick = (e) => {
          e.stopPropagation();
          removeName(dk, t, col, name);
        };
        inner.appendChild(badge);
      });

      td.appendChild(inner);
      tr.appendChild(td);
    });

    body.appendChild(tr);
  });
}

function removeName(dk, t, col, name) {
  pushUndo();
  const arr = getCell(dk, t, col).filter(n => n !== name);
  setCell(dk, t, col, arr);
  saveState();
  renderTable();
}

let selectedNames = [];
let presetTime = null;
let presetCol = null;

function openAddModal() {
  selectedNames = [];
  presetTime = null;
  presetCol = null;
  document.getElementById('addModalSubtitle').textContent = `Editing: ${fmtDateDisplay(currentDate())}`;
  populateTimeSelects();
  renderNameRoster();
  renderDateCheckboxes();
  document.getElementById('addModalOverlay').classList.add('open');
}

function openAddModalAt(time, col) {
  selectedNames = [];
  presetTime = time;
  presetCol = col;
  document.getElementById('addModalSubtitle').textContent = `${fmtDateDisplay(currentDate())} — ${col} @ ${fmt12(time)}`;
  populateTimeSelects(time);
  const colSel = document.getElementById('colSelect');
  colSel.value = col;
  renderNameRoster();
  renderDateCheckboxes();
  document.getElementById('addModalOverlay').classList.add('open');
}

function populateTimeSelects(preset) {
  const from = document.getElementById('timeFrom');
  const to = document.getElementById('timeTo');
  from.innerHTML = '';
  to.innerHTML = '';
  ALL_TIMES.forEach(t => {
    const o1 = new Option(fmt12(t), t);
    const o2 = new Option(fmt12(t), t);
    from.appendChild(o1);
    to.appendChild(o2);
  });
  const endTimes = [...ALL_TIMES.slice(1), '23:00'];
  to.innerHTML = '';
  endTimes.forEach(t => {
    const o = new Option(fmt12(t), t);
    to.appendChild(o);
  });
  if (preset) {
    from.value = preset;
    const nextIdx = ALL_TIMES.indexOf(preset) + 1;
    to.value = ALL_TIMES[nextIdx] || ALL_TIMES[ALL_TIMES.length - 1];
  }
}

function renderNameRoster() {
  const roster = document.getElementById('nameRoster');
  roster.innerHTML = '';
  state.names.forEach(name => {
    const chip = document.createElement('span');
    chip.className = 'name-chip' + (selectedNames.includes(name) ? ' selected' : '');
    chip.textContent = name;
    chip.onclick = () => {
      if (selectedNames.includes(name)) {
        selectedNames = selectedNames.filter(n => n !== name);
      } else {
        selectedNames.push(name);
      }
      renderNameRoster();
    };
    roster.appendChild(chip);
  });
}

function renderDateCheckboxes() {
  const list = document.getElementById('dateCheckboxList');
  list.innerHTML = '';
  const currentDk = dateKey(currentDate());
  ALL_DATES.forEach(d => {
    const dk = dateKey(d);
    const label = document.createElement('label');
    label.style.cssText = 'display:flex;align-items:center;gap:4px;font-size:11px;font-weight:600;cursor:pointer;white-space:nowrap;';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.value = dk;
    cb.checked = dk === currentDk;
    label.appendChild(cb);
    label.appendChild(document.createTextNode(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })));
    list.appendChild(label);
  });
}

function selectAllDates() {
  document.querySelectorAll('#dateCheckboxList input[type=checkbox]')
    .forEach(cb => cb.checked = true);
}

function selectNoDatesBut() {
  const dk = dateKey(currentDate());
  document.querySelectorAll('#dateCheckboxList input[type=checkbox]')
    .forEach(cb => cb.checked = cb.value === dk);
}

function applyAdd() {
  if (selectedNames.length === 0) { showToast('Select at least one name.'); return; }
  const col = document.getElementById('colSelect').value;
  const from = document.getElementById('timeFrom').value;
  const to = document.getElementById('timeTo').value;
  const fromIdx = ALL_TIMES.indexOf(from);
  const toIdx = ALL_TIMES.indexOf(to);
  if (fromIdx === -1 || toIdx <= fromIdx) { showToast('Invalid time range.'); return; }

  const checkedDates = [...document.querySelectorAll('#dateCheckboxList input[type=checkbox]:checked')]
    .map(cb => cb.value);

  if (checkedDates.length === 0) { showToast('Select at least one date.'); return; }

  pushUndo();

  checkedDates.forEach(dk => {
    for (let i = fromIdx; i < toIdx; i++) {
      const t = ALL_TIMES[i];
      COLUMNS.forEach(otherCol => {
        if (otherCol !== col) {
          const existing = getCell(dk, t, otherCol);
          const cleaned = existing.filter(n => !selectedNames.includes(n));
          setCell(dk, t, otherCol, cleaned);
        }
      });
      const existing = getCell(dk, t, col);
      const merged = [...new Set([...existing, ...selectedNames])];
      setCell(dk, t, col, merged);
    }
  });

  saveState();
  renderTable();
  closeModal('addModalOverlay');
  showToast(`Added ${selectedNames.join(', ')} to ${col} on ${checkedDates.length} day(s)`);
}

function getWeekSunday(d) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() - copy.getDay());
  return copy;
}

function duplicateWeek() {
  const today = currentDate();
  const sourceSunday = getWeekSunday(today);

  const sourceDates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(sourceSunday);
    d.setDate(d.getDate() + i);
    sourceDates.push(d);
  }

  const targetSunday = new Date(sourceSunday);
  targetSunday.setDate(targetSunday.getDate() + 7);

  const targetDates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(targetSunday);
    d.setDate(d.getDate() + i);
    targetDates.push(d);
  }

  const lastAllowedDate = ALL_DATES[ALL_DATES.length - 1];
  if (targetSunday > lastAllowedDate) {
    showToast('No next week available within the schedule range.');
    return;
  }

  const targetHasData = targetDates.some(d => {
    const dk = dateKey(d);
    const dayData = state.schedule[dk];
    if (!dayData) return false;
    return Object.values(dayData).some(timeSlot =>
      Object.values(timeSlot).some(names => Array.isArray(names) && names.length > 0)
    );
  });

  const sourceFmt = sourceSunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const targetFmt = targetSunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const msg = targetHasData
    ? `The week of ${targetFmt} already has data. Duplicating will overwrite it. Continue?`
    : `Duplicate the week of ${sourceFmt} to the week of ${targetFmt}?`;

  if (!confirm(msg)) return;

  pushUndo();

  sourceDates.forEach((srcDate, i) => {
    const srcKey = dateKey(srcDate);
    const tgtKey = dateKey(targetDates[i]);
    if (state.schedule[srcKey]) {
      state.schedule[tgtKey] = JSON.parse(JSON.stringify(state.schedule[srcKey]));
    } else {
      delete state.schedule[tgtKey];
    }
  });

  saveState();
  renderTable();
  showToast(`Week of ${sourceFmt} duplicated to ${targetFmt}`);
}

function openManageModal() {
  renderAllNamesList();
  document.getElementById('newNameInput').value = '';
  document.getElementById('manageModalOverlay').classList.add('open');
}

function renderAllNamesList() {
  const list = document.getElementById('allNamesList');
  list.innerHTML = '';
  state.names.forEach(name => {
    const chip = document.createElement('span');
    chip.className = 'manage-chip';
    chip.innerHTML = `${name}<button onclick="deleteName('${name}')" title="Remove">✕</button>`;
    list.appendChild(chip);
  });
}

function addNewName() {
  const val = document.getElementById('newNameInput').value.trim().toUpperCase();
  if (!val) return;
  if (state.names.includes(val)) { showToast('Name already exists.'); return; }
  if (val.length > 8) { showToast('Max 8 characters.'); return; }
  state.names.push(val);
  saveState();
  renderAllNamesList();
  document.getElementById('newNameInput').value = '';
  showToast(`Added "${val}" to roster`);
}

function deleteName(name) {
  if (!confirm(`Remove "${name}" from the name roster? (Won't remove from existing schedule.)`)) return;
  state.names = state.names.filter(n => n !== name);
  saveState();
  renderAllNamesList();
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

function handleOverlayClick(e, id) {
  if (e.target.id === id) closeModal(id);
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeModal('addModalOverlay');
    closeModal('manageModalOverlay');
  }
  if (e.key === 'ArrowLeft' && !document.querySelector('.modal-overlay.open')) prevDay();
  if (e.key === 'ArrowRight' && !document.querySelector('.modal-overlay.open')) nextDay();
  if (e.ctrlKey && e.key === 'z' && !document.querySelector('.modal-overlay.open')) {
    e.preventDefault();
    undo();
  }
});

function exportData() {
  const data = JSON.stringify(state, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'schedule-backup.json';
  a.click();
  URL.revokeObjectURL(url);
}

function triggerImport() {
  document.getElementById('importFile').click();
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const parsed = JSON.parse(e.target.result);
      state.names = parsed.names || state.names;
      state.schedule = parsed.schedule || state.schedule;
      state.currentIndex = parsed.currentIndex || 0;
      saveState();
      renderTable();
      showToast('Schedule imported successfully!');
    } catch(err) {
      showToast('Error reading file — make sure it\'s a valid export.');
    }
  };
  reader.readAsText(file);
}

loadState();
renderTable();
updateUndoBtn();