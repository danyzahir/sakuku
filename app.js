/* ==========================================================================
   NEO-BRUTALISM MOBILE FINANCIAL TRACKER LOGIC
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  // --- STATE MANAGEMENT ---
  const STORAGE_KEY = 'cuanku_neo_transactions_clean_v1';
  // Clear any past sample data keys if present
  localStorage.removeItem('cuanku_neo_transactions_v1');
  localStorage.removeItem('cuanku_neo_transactions_v2');

  let transactions = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  let activePeriod = 'all'; // 'all', 'daily', 'weekly', 'monthly'

  // --- DOM ELEMENTS ---
  const incomeForm = document.getElementById('income-form');
  const inputName = document.getElementById('input-name');
  const inputAmount = document.getElementById('input-amount');
  const totalBalanceDisplay = document.getElementById('total-balance-display');
  const heroPeriodTitle = document.getElementById('hero-period-title');
  const txCountBadge = document.getElementById('tx-count-badge');
  const txListContainer = document.getElementById('tx-list-container');
  const chartBars = document.getElementById('chart-bars');
  const chartPeriodTag = document.getElementById('chart-period-tag');
  const statAvg = document.getElementById('stat-avg');
  const statMax = document.getElementById('stat-max');
  const inputSearch = document.getElementById('input-search');
  const btnClearAll = document.getElementById('btn-clear-all');
  const toast = document.getElementById('toast');
  const toastText = document.getElementById('toast-text');
  const statusClock = document.getElementById('status-clock');
  const headerTodayDate = document.getElementById('header-today-date');

  // --- CUSTOM NEO-BRUTALIST DATE PICKER STATE & LOGIC ---
  const btnOpenDatepicker = document.getElementById('btn-open-datepicker');
  const displaySelectedDate = document.getElementById('display-selected-date');
  const neoDatepickerModal = document.getElementById('neo-datepicker-modal');
  const dpMonthYearLabel = document.getElementById('dp-month-year-label');
  const dpPrevMonth = document.getElementById('dp-prev-month');
  const dpNextMonth = document.getElementById('dp-next-month');
  const dpDaysGrid = document.getElementById('dp-days-grid');
  const dpCloseIcon = document.getElementById('dp-close-icon');
  const dpQuickToday = document.getElementById('dp-quick-today');
  const dpQuickYesterday = document.getElementById('dp-quick-yesterday');

  // Selected Date state (defaults to current date)
  let selectedDate = new Date();
  // Month/year currently visible in the calendar view
  let calendarViewDate = new Date(selectedDate);

  const monthNamesId = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  function formatDisplayDateOnly(d) {
    const day = d.getDate();
    const month = monthNamesId[d.getMonth()].slice(0, 3);
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  }

  function updateDateDisplay() {
    if (displaySelectedDate) {
      displaySelectedDate.textContent = formatDisplayDateOnly(selectedDate);
    }
  }

  function renderCalendar() {
    const year = calendarViewDate.getFullYear();
    const month = calendarViewDate.getMonth();

    if (dpMonthYearLabel) {
      dpMonthYearLabel.textContent = `${monthNamesId[month]} ${year}`;
    }

    dpDaysGrid.innerHTML = '';

    // First day of current month (0 = Sun, 1 = Mon...)
    const firstDay = new Date(year, month, 1).getDay();
    // Total days in current month
    const totalDays = new Date(year, month + 1, 0).getDate();
    // Total days in previous month
    const prevMonthDays = new Date(year, month, 0).getDate();

    // Previous month padding days
    for (let i = firstDay - 1; i >= 0; i--) {
      const dayNum = prevMonthDays - i;
      const cell = document.createElement('div');
      cell.className = 'dp-day-cell dp-day-other';
      cell.textContent = dayNum;
      dpDaysGrid.appendChild(cell);
    }

    const today = new Date();

    // Current month days
    for (let day = 1; day <= totalDays; day++) {
      const cell = document.createElement('div');
      cell.className = 'dp-day-cell';
      cell.textContent = day;

      const isToday = (day === today.getDate() && month === today.getMonth() && year === today.getFullYear());
      const isSelected = (day === selectedDate.getDate() && month === selectedDate.getMonth() && year === selectedDate.getFullYear());

      if (isToday) cell.classList.add('dp-day-today');
      if (isSelected) cell.classList.add('dp-day-selected');

      cell.addEventListener('click', () => {
        const now = new Date();
        const newD = new Date(year, month, day, now.getHours(), now.getMinutes());
        selectedDate = newD;
        updateDateDisplay();
        closeDatepicker();
      });

      dpDaysGrid.appendChild(cell);
    }

    // Next month padding days (to fill 35 grid cells)
    const currentGridCells = firstDay + totalDays;
    const remainingCells = (currentGridCells > 35 ? 42 : 35) - currentGridCells;

    for (let day = 1; day <= remainingCells; day++) {
      const cell = document.createElement('div');
      cell.className = 'dp-day-cell dp-day-other';
      cell.textContent = day;
      dpDaysGrid.appendChild(cell);
    }
  }

  function openDatepicker() {
    calendarViewDate = new Date(selectedDate);
    renderCalendar();
    neoDatepickerModal.classList.remove('hidden');
  }

  function closeDatepicker() {
    neoDatepickerModal.classList.add('hidden');
  }

  if (btnOpenDatepicker) {
    btnOpenDatepicker.addEventListener('click', openDatepicker);
  }

  if (dpCloseIcon) {
    dpCloseIcon.addEventListener('click', closeDatepicker);
  }

  if (neoDatepickerModal) {
    neoDatepickerModal.addEventListener('click', (e) => {
      if (e.target === neoDatepickerModal) closeDatepicker();
    });
  }

  if (dpPrevMonth) {
    dpPrevMonth.addEventListener('click', () => {
      calendarViewDate.setMonth(calendarViewDate.getMonth() - 1);
      renderCalendar();
    });
  }

  if (dpNextMonth) {
    dpNextMonth.addEventListener('click', () => {
      calendarViewDate.setMonth(calendarViewDate.getMonth() + 1);
      renderCalendar();
    });
  }

  if (dpQuickToday) {
    dpQuickToday.addEventListener('click', () => {
      selectedDate = new Date();
      updateDateDisplay();
      closeDatepicker();
    });
  }

  if (dpQuickYesterday) {
    dpQuickYesterday.addEventListener('click', () => {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      selectedDate = d;
      updateDateDisplay();
      closeDatepicker();
    });
  }

  // --- INITIALIZATION ---
  updateDateDisplay();
  updateClock();
  setInterval(updateClock, 1000);
  setupFilterTabs();
  setupNavigation();
  renderApp();

  function updateClock() {
    const now = new Date();
    
    // Status bar clock (HH:MM)
    if (statusClock) {
      statusClock.textContent = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':');
    }

    // Today Header Date
    const dateOptions = { day: 'numeric', month: 'short', year: 'numeric' };
    if (headerTodayDate) {
      headerTodayDate.textContent = now.toLocaleDateString('id-ID', dateOptions);
    }
  }

  // --- CURRENCY FORMATTER ---
  function formatRupiah(number) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(number);
  }

  // Format currency on typing in input field
  inputAmount.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value) {
      e.target.value = new Intl.NumberFormat('id-ID').format(value);
    } else {
      e.target.value = '';
    }
  });

  // --- PERIOD FILTER TABS ---
  function setupFilterTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        tabButtons.forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
        activePeriod = btn.dataset.period;
        renderApp();
      });
    });
  }

  // --- NAVIGATION BAR HANDLING ---
  function setupNavigation() {
    const navDashboard = document.getElementById('nav-dashboard');
    const navAdd = document.getElementById('nav-add');
    const navHistory = document.getElementById('nav-history');

    navDashboard.addEventListener('click', () => {
      setActiveNav(navDashboard);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    navAdd.addEventListener('click', () => {
      setActiveNav(navAdd);
      incomeForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
      inputName.focus();
    });

    navHistory.addEventListener('click', () => {
      setActiveNav(navHistory);
      txListContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function setActiveNav(element) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    element.classList.add('active');
  }

  // --- FORM SUBMISSION ---
  incomeForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = inputName.value.trim();
    const rawAmount = inputAmount.value.replace(/\D/g, '');
    const amount = parseInt(rawAmount, 10);

    if (!name || isNaN(amount) || amount <= 0) {
      showToast('⚠️ Mohon isi nama dan nominal valid!');
      return;
    }

    const txDate = selectedDate || new Date();

    const newTx = {
      id: 'tx_' + Date.now(),
      name: name,
      amount: amount,
      timestamp: txDate.toISOString(),
      displayDate: txDate.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })
    };

    transactions.unshift(newTx);
    saveTransactions();

    // Reset Form
    inputName.value = '';
    inputAmount.value = '';
    selectedDate = new Date();
    updateDateDisplay();
    
    renderApp();
    showToast('Data Pemasukan Berhasil Ditambahkan!');
  });

  // --- CUSTOM NEO-BRUTALIST CONFIRMATION MODAL ---
  const customConfirmModal = document.getElementById('custom-confirm-modal');
  const modalConfirmTitle = document.getElementById('modal-confirm-title');
  const modalConfirmDesc = document.getElementById('modal-confirm-desc');
  const btnModalCancel = document.getElementById('btn-modal-cancel');
  const btnModalConfirm = document.getElementById('btn-modal-confirm');
  let pendingConfirmResolve = null;

  function showCustomConfirm({ title, desc, confirmText = 'YA, HAPUS!' }) {
    return new Promise((resolve) => {
      modalConfirmTitle.textContent = title;
      modalConfirmDesc.textContent = desc;
      btnModalConfirm.textContent = confirmText;
      
      pendingConfirmResolve = resolve;
      customConfirmModal.classList.remove('hidden');
    });
  }

  function closeCustomConfirm(result) {
    customConfirmModal.classList.add('hidden');
    if (pendingConfirmResolve) {
      pendingConfirmResolve(result);
      pendingConfirmResolve = null;
    }
  }

  btnModalCancel.addEventListener('click', () => closeCustomConfirm(false));
  btnModalConfirm.addEventListener('click', () => closeCustomConfirm(true));
  customConfirmModal.addEventListener('click', (e) => {
    if (e.target === customConfirmModal) closeCustomConfirm(false);
  });

  // --- DELETE TRANSACTION ---
  txListContainer.addEventListener('click', async (e) => {
    const delBtn = e.target.closest('.tx-del-btn');
    if (!delBtn) return;

    const id = delBtn.dataset.id;
    const targetTx = transactions.find(t => t.id === id);
    const txName = targetTx ? `"${targetTx.name}"` : 'pemasukan ini';

    const confirmed = await showCustomConfirm({
      title: 'Hapus Pemasukan?',
      desc: `Apakah kamu yakin ingin menghapus catatan ${txName}? Data yang dihapus tidak dapat dikembalikan.`,
      confirmText: 'HAPUS NOW!'
    });

    if (confirmed) {
      transactions = transactions.filter(t => t.id !== id);
      saveTransactions();
      renderApp();
      showToast('Transaksi Berhasil Dihapus!');
    }
  });

  // Clear All
  btnClearAll.addEventListener('click', async () => {
    if (transactions.length === 0) {
      showToast('⚠️ Belum ada data untuk dibersihkan!');
      return;
    }

    const confirmed = await showCustomConfirm({
      title: 'Bersihkan Semua Data?',
      desc: 'PERINGATAN: Seluruh riwayat catatan pemasukan akan dihapus permanen!',
      confirmText: 'CLEAR SEMUA'
    });

    if (confirmed) {
      transactions = [];
      saveTransactions();
      renderApp();
      showToast('Seluruh data dibersihkan!');
    }
  });

  // Search Filter
  inputSearch.addEventListener('input', () => {
    renderTransactionList();
  });

  // --- FILTERING TRANSACTIONS BY PERIOD ---
  function getFilteredTransactions() {
    const now = new Date();

    return transactions.filter(tx => {
      const txDate = new Date(tx.timestamp);

      if (activePeriod === 'daily') {
        return txDate.getDate() === now.getDate() &&
               txDate.getMonth() === now.getMonth() &&
               txDate.getFullYear() === now.getFullYear();
      } else if (activePeriod === 'weekly') {
        const diffTime = now.getTime() - txDate.getTime();
        const diffDays = diffTime / (1000 * 3600 * 24);
        return diffDays >= 0 && diffDays <= 7;
      } else if (activePeriod === 'monthly') {
        return txDate.getMonth() === now.getMonth() &&
               txDate.getFullYear() === now.getFullYear();
      }
      return true; // 'all'
    });
  }

  // --- RENDER APP MAIN FUNCTION ---
  function renderApp() {
    const filtered = getFilteredTransactions();

    // 1. Calculate Total & Summary Stats
    const total = filtered.reduce((acc, curr) => acc + curr.amount, 0);
    const count = filtered.length;
    const avg = count > 0 ? Math.round(total / count) : 0;
    const max = count > 0 ? Math.max(...filtered.map(t => t.amount)) : 0;

    // Update Hero Display
    totalBalanceDisplay.textContent = formatRupiah(total);
    txCountBadge.textContent = `${count} Transaksi`;

    // Hero title text
    const periodNames = {
      'all': 'Total Pemasukan (Semua)',
      'daily': 'Total Pemasukan (Hari Ini)',
      'weekly': 'Total Pemasukan (7 Hari Terakhir)',
      'monthly': 'Total Pemasukan (Bulan Ini)'
    };
    heroPeriodTitle.textContent = periodNames[activePeriod];
    chartPeriodTag.textContent = activePeriod.toUpperCase();

    // Stats Grid
    statAvg.textContent = formatRupiah(avg);
    statMax.textContent = formatRupiah(max);

    // 2. Render Visual Chart Bars
    renderChart(filtered);

    // 3. Render Transaction List
    renderTransactionList(filtered);
  }

  // --- RENDER VISUAL BAR CHART ---
  function renderChart(filteredData) {
    chartBars.innerHTML = '';

    if (activePeriod === 'weekly') {
      const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
      const weeklyTotals = Array(7).fill(0);

      const now = new Date();
      filteredData.forEach(tx => {
        const txDate = new Date(tx.timestamp);
        const dayIdx = txDate.getDay();
        weeklyTotals[dayIdx] += tx.amount;
      });

      const maxVal = Math.max(...weeklyTotals, 1);

      for (let i = 6; i >= 0; i--) {
        const targetDate = new Date();
        targetDate.setDate(now.getDate() - i);
        const idx = targetDate.getDay();
        const label = days[idx];
        const amt = weeklyTotals[idx];
        const heightPct = Math.max(Math.round((amt / maxVal) * 100), 8);

        const barCol = document.createElement('div');
        barCol.className = 'bar-col';
        barCol.innerHTML = `
          <div class="bar-fill ${i === 0 ? 'active-period' : ''}" style="height: ${heightPct}%;" title="${label}: ${formatRupiah(amt)}"></div>
          <span class="bar-label">${label}</span>
        `;
        chartBars.appendChild(barCol);
      }

    } else if (activePeriod === 'monthly') {
      const weekTotals = [0, 0, 0, 0];
      filteredData.forEach(tx => {
        const dateNum = new Date(tx.timestamp).getDate();
        if (dateNum <= 7) weekTotals[0] += tx.amount;
        else if (dateNum <= 14) weekTotals[1] += tx.amount;
        else if (dateNum <= 21) weekTotals[2] += tx.amount;
        else weekTotals[3] += tx.amount;
      });

      const maxVal = Math.max(...weekTotals, 1);
      const weekLabels = ['W1', 'W2', 'W3', 'W4'];

      weekTotals.forEach((amt, i) => {
        const heightPct = Math.max(Math.round((amt / maxVal) * 100), 8);
        const barCol = document.createElement('div');
        barCol.className = 'bar-col';
        barCol.innerHTML = `
          <div class="bar-fill" style="height: ${heightPct}%;" title="Minggu ${i+1}: ${formatRupiah(amt)}"></div>
          <span class="bar-label">${weekLabels[i]}</span>
        `;
        chartBars.appendChild(barCol);
      });

    } else {
      // Breakdown by recent entries or days for 'all' / 'daily'
      const sampleBars = [
        { label: 'Sen', val: 0 },
        { label: 'Sel', val: 0 },
        { label: 'Rab', val: 0 },
        { label: 'Kam', val: 0 },
        { label: 'Jum', val: 0 }
      ];

      filteredData.slice(0, 5).forEach((tx, idx) => {
        if (sampleBars[idx]) {
          sampleBars[idx].val = tx.amount;
          sampleBars[idx].label = tx.name.slice(0, 4);
        }
      });

      const maxVal = Math.max(...filteredData.map(t => t.amount), 1);

      sampleBars.forEach((b, i) => {
        const heightPct = b.val > 0 ? Math.max(Math.round((b.val / maxVal) * 100), 10) : 8;
        const barCol = document.createElement('div');
        barCol.className = 'bar-col';
        barCol.innerHTML = `
          <div class="bar-fill ${i === 0 ? 'active-period' : ''}" style="height: ${heightPct}%;" title="${b.label}: ${formatRupiah(b.val)}"></div>
          <span class="bar-label">${b.label || 'Entry'}</span>
        `;
        chartBars.appendChild(barCol);
      });
    }
  }

  // --- RENDER TRANSACTION LIST ---
  function renderTransactionList(filteredData) {
    const listToRender = filteredData || getFilteredTransactions();
    const query = (inputSearch ? inputSearch.value.trim().toLowerCase() : '');

    const finalFiltered = listToRender.filter(tx => {
      return tx.name.toLowerCase().includes(query) || 
             tx.amount.toString().includes(query);
    });

    txListContainer.innerHTML = '';

    if (finalFiltered.length === 0) {
      txListContainer.innerHTML = `
        <div class="empty-state">
          💸 Belum ada catatan pemasukan.<br>
          <span style="font-size:0.8rem; font-weight:normal;">Yuk, tambahkan pemasukan baru di atas!</span>
        </div>
      `;
      return;
    }

    finalFiltered.forEach(tx => {
      const itemEl = document.createElement('div');
      itemEl.className = 'tx-item';
      itemEl.innerHTML = `
        <div class="tx-info">
          <div class="tx-title">${escapeHTML(tx.name)}</div>
          <div class="tx-meta">
            <span style="display:inline-flex; align-items:center; gap:4px;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              ${tx.displayDate}
            </span>
          </div>
        </div>
        <div class="tx-right">
          <div class="tx-amount">+ ${formatRupiah(tx.amount)}</div>
          <button class="tx-del-btn" data-id="${tx.id}" title="Hapus">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      `;
      txListContainer.appendChild(itemEl);
    });
  }

  // --- HELPERS ---
  function saveTransactions() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  }

  function showToast(msg) {
    toastText.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2500);
  }

  function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
      tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[tag] || tag)
    );
  }

});
