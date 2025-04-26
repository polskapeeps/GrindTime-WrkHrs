// grab references
const dInput = document.getElementById('date');
const sInput = document.getElementById('startTime');
const eInput = document.getElementById('endTime');
const rInput = document.getElementById('rate');
const addBtn = document.getElementById('addEntry');
const clearBtn = document.getElementById('clearData');
const exportBtn = document.getElementById('exportCSV');
const tbody   = document.querySelector('#historyTable tbody');
const totalH  = document.getElementById('totalHours');
const totalP  = document.getElementById('totalPay');

let entries = [];

// load from localStorage
function loadData() {
  entries = JSON.parse(localStorage.getItem('hoursData') || '[]');
}

// save to localStorage
function saveData() {
  localStorage.setItem('hoursData', JSON.stringify(entries));
}

// compute diff hours, two-decimal precision
function calcHours(date, start, end) {
  const startDt = new Date(`${date}T${start}`);
  const endDt   = new Date(`${date}T${end}`);
  const diffH   = (endDt - startDt) / 3600000;
  return Math.max(0, Math.round(diffH * 100) / 100);
}

// redraw table & totals
function render() {
  tbody.innerHTML = '';
  let hSum = 0, pSum = 0;
  entries.forEach(e => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${e.date}</td>
      <td>${e.start}</td>
      <td>${e.end}</td>
      <td>${e.hours.toFixed(2)}</td>
      <td>$${e.pay.toFixed(2)}</td>
    `;
    tbody.appendChild(tr);
    hSum += e.hours;
    pSum += e.pay;
  });
  totalH.textContent = hSum.toFixed(2);
  totalP.textContent = pSum.toFixed(2);
}

// add button handler
addBtn.onclick = () => {
  const date  = dInput.value;
  const start = sInput.value;
  const end   = eInput.value;
  const rate  = parseFloat(rInput.value) || 0;
  if (!date || !start || !end || !rate) {
    return alert('Fill out all fields!');
  }
  const hrs = calcHours(date, start, end);
  const pay = Math.round(hrs * rate * 100) / 100;
  entries.push({ date, start, end, hours: hrs, pay });
  saveData();
  render();
  sInput.value = eInput.value = '';
};

// clear history
clearBtn.onclick = () => {
  if (confirm('Really clear all entries?')) {
    entries = [];
    saveData();
    render();
  }
};

// export CSV
exportBtn.onclick = () => {
  const header = 'Date,Start,End,Hours,Pay\n';
  const rows = entries
    .map(e => `${e.date},${e.start},${e.end},${e.hours.toFixed(2)},${e.pay.toFixed(2)}`)
    .join('\n');
  const blob = new Blob([header + rows], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'hours_tracker.csv';
  a.click();
  URL.revokeObjectURL(url);
};

// init
loadData();
render();
