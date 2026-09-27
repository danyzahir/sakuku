/* ==========================================================================
   NEO-BRUTALISM FINANCIAL TRACKER - SAKUKU / CUANKU
   3 TABS: DASHBOARD (GRAFIK PENDAPATAN VS PENGELUARAN), PENDAPATAN, PENGELUARAN
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  // --- STORAGE & DATA INITIALIZATION ---
  const STORAGE_KEY = 'cuanku_neo_transactions_clean_v1';
  let rawData = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

  // Ensure backwards compatibility: every transaction must have 'type' ('income' | 'expense')
  let transactions = rawData.map(tx => {
    return {
      id: tx.id || 'tx_' + Math.random().toString(36).substr(2, 9),
      type: tx.type === 'expense' ? 'expense' : 'income',
      name: tx.name || 'Transaksi',
      amount: Number(tx.amount) || 0,
      timestamp: tx.timestamp || new Date().toISOString(),
      displayDate: tx.displayDate || formatDisplayDateOnly(new Date(tx.timestamp || Date.now()))
    };
  });

  // Current Active Tab: 'dashboard' | 'income' | 'expense'
  let currentActiveTab = 'dashboard';

  // Period Filters per View
  let dashPeriod = 'all';    // 'all' | 'daily' | 'weekly' | 'monthly'
  let incomePeriod = 'all';
  let expensePeriod = 'all';

  // Date Picker States
  let incomeSelectedDate = new Date();
  let expenseSelectedDate = new Date();
  let currentDatePickerTarget = 'income'; // 'income' | 'expense'
  let calendarViewDate = new Date();

  const monthNamesId = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  // --- COMMON DOM ELEMENTS ---
  const toast = document.getElementById('toast');
  const toastText = document.getElementById('toast-text');
  const statusClock = document.getElementById('status-clock');
  const headerTodayDate = document.getElementById('header-today-date');

  // Tab View Containers
  const viewDashboard = document.getElementById('view-dashboard');
  const viewIncome = document.getElementById('view-income');
  const viewExpense = document.getElementById('view-expense');

  // Navigation Items
  const navDashboard = document.getElementById('nav-dashboard');
  const navIncome = document.getElementById('nav-income');
  const navExpense = document.getElementById('nav-expense');

  // --- CONFIRMATION MODAL DOM ---
  const customConfirmModal = document.getElementById('custom-confirm-modal');
  const modalConfirmTitle = document.getElementById('modal-confirm-title');
  const modalConfirmDesc = document.getElementById('modal-confirm-desc');
  const btnModalCancel = document.getElementById('btn-modal-cancel');
  const btnModalConfirm = document.getElementById('btn-modal-confirm');
  let pendingConfirmResolve = null;

  // --- DATEPICKER MODAL DOM ---
  const neoDatepickerModal = document.getElementById('neo-datepicker-modal');
  const dpCloseIcon = document.getElementById('dp-close-icon');
  const dpPrevMonth = document.getElementById('dp-prev-month');
  const dpNextMonth = document.getElementById('dp-next-month');
  const dpMonthYearLabel = document.getElementById('dp-month-year-label');
  const dpQuickToday = document.getElementById('dp-quick-today');
  const dpQuickYesterday = document.getElementById('dp-quick-yesterday');
  const dpDaysGrid = document.getElementById('dp-days-grid');

  // Income Datepicker Elements
  const incomeBtnDatepicker = document.getElementById('income-btn-datepicker');
  const incomeDisplaySelectedDate = document.getElementById('income-display-selected-date');

  // Expense Datepicker Elements
  const expenseBtnDatepicker = document.getElementById('expense-btn-datepicker');
  const expenseDisplaySelectedDate = document.getElementById('expense-display-selected-date');

  // --- DASHBOARD DOM ELEMENTS ---
  const dashPeriodTitle = document.getElementById('dash-period-title');
  const netBalanceDisplay = document.getElementById('net-balance-display');
  const dashIncomeDisplay = document.getElementById('dash-income-display');
  const dashIncomeCount = document.getElementById('dash-income-count');
  const dashExpenseDisplay = document.getElementById('dash-expense-display');
  const dashExpenseCount = document.getElementById('dash-expense-count');
  const dashChartPeriodTag = document.getElementById('dash-chart-period-tag');
  const dashChartBars = document.getElementById('dash-chart-bars');
  const ratioExpenseBar = document.getElementById('ratio-expense-bar');
  const ratioSavingsBar = document.getElementById('ratio-savings-bar');
  const ratioExpenseText = document.getElementById('ratio-expense-text');
  const ratioSavingsText = document.getElementById('ratio-savings-text');
  const dashStatAvgIncome = document.getElementById('dash-stat-avg-income');
  const dashStatAvgExpense = document.getElementById('dash-stat-avg-expense');
  const dashRecentList = document.getElementById('dash-recent-list');

  // --- INCOME VIEW DOM ELEMENTS ---
  const incomePeriodTitle = document.getElementById('income-period-title');
  const incomeHeroAmount = document.getElementById('income-hero-amount');
  const incomeTxCountBadge = document.getElementById('income-tx-count-badge');
  const incomeStatAvg = document.getElementById('income-stat-avg');
  const incomeStatMax = document.getElementById('income-stat-max');
  const incomeForm = document.getElementById('income-form');
  const incomeInputName = document.getElementById('income-input-name');
  const incomeInputAmount = document.getElementById('income-input-amount');
  const incomeFilterTag = document.getElementById('income-filter-tag');
  const incomeBtnClearAll = document.getElementById('income-btn-clear-all');
  const incomeInputSearch = document.getElementById('income-input-search');
  const incomeTxListContainer = document.getElementById('income-tx-list-container');

  // --- EXPENSE VIEW DOM ELEMENTS ---
  const expensePeriodTitle = document.getElementById('expense-period-title');
  const expenseHeroAmount = document.getElementById('expense-hero-amount');
  const expenseTxCountBadge = document.getElementById('expense-tx-count-badge');
  const expenseStatAvg = document.getElementById('expense-stat-avg');
  const expenseStatMax = document.getElementById('expense-stat-max');
  const expenseForm = document.getElementById('expense-form');
  const expenseInputName = document.getElementById('expense-input-name');
  const expenseInputAmount = document.getElementById('expense-input-amount');
  const expenseFilterTag = document.getElementById('expense-filter-tag');
  const expenseBtnClearAll = document.getElementById('expense-btn-clear-all');
  const expenseInputSearch = document.getElementById('expense-input-search');
  const expenseTxListContainer = document.getElementById('expense-tx-list-container');

  // --- INITIALIZATION ---
  updateClock();
  setInterval(updateClock, 1000);
  updatePickerButtonDisplays();
  setupNavigationTabs();
  setupPeriodFilters();
  setupFormFormatting();
  setupFormSubmissions();
  setupDatepicker();
  setupConfirmationModal();
  setupActionListeners();
  renderAllViews();

  // --- HELPERS: FORMATTING & CLOCK ---
  function updateClock() {
    const now = new Date();
    if (statusClock) {
      statusClock.textContent = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':');
    }
    if (headerTodayDate) {
      headerTodayDate.textContent = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    }
  }

  function formatRupiah(number) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(number);
  }

  function formatDisplayDateOnly(d) {
    const day = d.getDate();
    const month = monthNamesId[d.getMonth()].slice(0, 3);
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
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

  function showToast(msg) {
    toastText.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 600);
  }

  function saveTransactions() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  }

  // --- TAB NAVIGATION SYSTEM (3 TABS) ---
  function setupNavigationTabs() {
    const navItems = [
      { btn: navDashboard, view: viewDashboard, name: 'dashboard' },
      { btn: navIncome, view: viewIncome, name: 'income' },
      { btn: navExpense, view: viewExpense, name: 'expense' }
    ];

    navItems.forEach(item => {
      if (!item.btn) return;
      item.btn.addEventListener('click', () => {
        switchTab(item.name);
      });
    });
  }

  function switchTab(tabName) {
    currentActiveTab = tabName;

    // Update active nav button
    [navDashboard, navIncome, navExpense].forEach(btn => {
      if (!btn) return;
      if (btn.dataset.tab === tabName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Update view visibility
    [
      { view: viewDashboard, name: 'dashboard' },
      { view: viewIncome, name: 'income' },
      { view: viewExpense, name: 'expense' }
    ].forEach(tab => {
      if (!tab.view) return;
      if (tab.name === tabName) {
        tab.view.classList.remove('hidden');
      } else {
        tab.view.classList.add('hidden');
      }
    });

    // Scroll to top of content
    const scrollContainer = document.querySelector('.scroll-content');
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
    }

    renderAllViews();
  }

  // --- PERIOD FILTER TAB LOGIC ---
  function setupPeriodFilters() {
    // 1. Dashboard Filters
    document.querySelectorAll('#view-dashboard .tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#view-dashboard .tab-btn').forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
        dashPeriod = btn.dataset.period;
        renderDashboard();
      });
    });

    // 2. Income Filters
    document.querySelectorAll('#view-income .tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#view-income .tab-btn').forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
        incomePeriod = btn.dataset.period;
        renderIncomeView();
      });
    });

    // 3. Expense Filters
    document.querySelectorAll('#view-expense .tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#view-expense .tab-btn').forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
        expensePeriod = btn.dataset.period;
        renderExpenseView();
      });
    });
  }

  // Helper filter function
  function filterByPeriod(txList, period) {
    const now = new Date();
    return txList.filter(tx => {
      const txDate = new Date(tx.timestamp);
      if (period === 'daily') {
        return txDate.getDate() === now.getDate() &&
               txDate.getMonth() === now.getMonth() &&
               txDate.getFullYear() === now.getFullYear();
      } else if (period === 'weekly') {
        const diffTime = now.getTime() - txDate.getTime();
        const diffDays = diffTime / (1000 * 3600 * 24);
        return diffDays >= 0 && diffDays <= 7;
      } else if (period === 'monthly') {
        return txDate.getMonth() === now.getMonth() &&
               txDate.getFullYear() === now.getFullYear();
      }
      return true; // 'all'
    });
  }

  // --- FORM NUMBER FORMATTING (AUTO RUPIAH SEPARATOR) ---
  function setupFormFormatting() {
    [incomeInputAmount, expenseInputAmount].forEach(input => {
      if (!input) return;
      input.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value) {
          e.target.value = new Intl.NumberFormat('id-ID').format(value);
        } else {
          e.target.value = '';
        }
      });
    });
  }

  // --- DATEPICKER SYSTEM ---
  function updatePickerButtonDisplays() {
    if (incomeDisplaySelectedDate) {
      incomeDisplaySelectedDate.textContent = formatDisplayDateOnly(incomeSelectedDate);
    }
    if (expenseDisplaySelectedDate) {
      expenseDisplaySelectedDate.textContent = formatDisplayDateOnly(expenseSelectedDate);
    }
  }

  function setupDatepicker() {
    if (incomeBtnDatepicker) {
      incomeBtnDatepicker.addEventListener('click', () => {
        currentDatePickerTarget = 'income';
        calendarViewDate = new Date(incomeSelectedDate);
        renderCalendar();
        neoDatepickerModal.classList.remove('hidden');
      });
    }

    if (expenseBtnDatepicker) {
      expenseBtnDatepicker.addEventListener('click', () => {
        currentDatePickerTarget = 'expense';
        calendarViewDate = new Date(expenseSelectedDate);
        renderCalendar();
        neoDatepickerModal.classList.remove('hidden');
      });
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
        selectDateForTarget(new Date());
      });
    }

    if (dpQuickYesterday) {
      dpQuickYesterday.addEventListener('click', () => {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        selectDateForTarget(d);
      });
    }
  }

  function selectDateForTarget(d) {
    if (currentDatePickerTarget === 'income') {
      incomeSelectedDate = d;
    } else {
      expenseSelectedDate = d;
    }
    updatePickerButtonDisplays();
    closeDatepicker();
  }

  function closeDatepicker() {
    if (neoDatepickerModal) neoDatepickerModal.classList.add('hidden');
  }

  function renderCalendar() {
    const year = calendarViewDate.getFullYear();
    const month = calendarViewDate.getMonth();

    if (dpMonthYearLabel) {
      dpMonthYearLabel.textContent = `${monthNamesId[month]} ${year}`;
    }

    dpDaysGrid.innerHTML = '';

    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    // Previous month padding
    for (let i = firstDay - 1; i >= 0; i--) {
      const dayNum = prevMonthDays - i;
      const cell = document.createElement('div');
      cell.className = 'dp-day-cell dp-day-other';
      cell.textContent = dayNum;
      dpDaysGrid.appendChild(cell);
    }

    const today = new Date();
    const targetSelected = currentDatePickerTarget === 'income' ? incomeSelectedDate : expenseSelectedDate;

    // Current month days
    for (let day = 1; day <= totalDays; day++) {
      const cell = document.createElement('div');
      cell.className = 'dp-day-cell';
      cell.textContent = day;

      const isToday = (day === today.getDate() && month === today.getMonth() && year === today.getFullYear());
      const isSelected = (day === targetSelected.getDate() && month === targetSelected.getMonth() && year === targetSelected.getFullYear());

      if (isToday) cell.classList.add('dp-day-today');
      if (isSelected) cell.classList.add('dp-day-selected');

      cell.addEventListener('click', () => {
        const now = new Date();
        const newD = new Date(year, month, day, now.getHours(), now.getMinutes());
        selectDateForTarget(newD);
      });

      dpDaysGrid.appendChild(cell);
    }

    // Next month padding
    const currentGridCells = firstDay + totalDays;
    const remainingCells = (currentGridCells > 35 ? 42 : 35) - currentGridCells;

    for (let day = 1; day <= remainingCells; day++) {
      const cell = document.createElement('div');
      cell.className = 'dp-day-cell dp-day-other';
      cell.textContent = day;
      dpDaysGrid.appendChild(cell);
    }
  }

  // --- CUSTOM CONFIRMATION MODAL ---
  function setupConfirmationModal() {
    btnModalCancel.addEventListener('click', () => closeCustomConfirm(false));
    btnModalConfirm.addEventListener('click', () => closeCustomConfirm(true));
    customConfirmModal.addEventListener('click', (e) => {
      if (e.target === customConfirmModal) closeCustomConfirm(false);
    });
  }

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

  // --- FORM SUBMISSIONS (PENDAPATAN & PENGELUARAN) ---
  function setupFormSubmissions() {
    // 1. Tambah Pendapatan
    if (incomeForm) {
      incomeForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = incomeInputName.value.trim();
        const rawAmount = incomeInputAmount.value.replace(/\D/g, '');
        const amount = parseInt(rawAmount, 10);

        if (!name || isNaN(amount) || amount <= 0) {
          showToast('⚠️ Isi sumber & nominal!');
          return;
        }

        const txDate = incomeSelectedDate || new Date();
        const newTx = {
          id: 'tx_inc_' + Date.now(),
          type: 'income',
          name: name,
          amount: amount,
          timestamp: txDate.toISOString(),
          displayDate: formatDisplayDateOnly(txDate)
        };

        transactions.unshift(newTx);
        saveTransactions();

        incomeInputName.value = '';
        incomeInputAmount.value = '';
        incomeSelectedDate = new Date();
        updatePickerButtonDisplays();

        renderAllViews();
        showToast('Pemasukan Ditambahkan! 💰');
      });
    }

    // 2. Tambah Pengeluaran
    if (expenseForm) {
      expenseForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = expenseInputName.value.trim();
        const rawAmount = expenseInputAmount.value.replace(/\D/g, '');
        const amount = parseInt(rawAmount, 10);

        if (!name || isNaN(amount) || amount <= 0) {
          showToast('⚠️ Isi keperluan & nominal!');
          return;
        }

        const txDate = expenseSelectedDate || new Date();
        const newTx = {
          id: 'tx_exp_' + Date.now(),
          type: 'expense',
          name: name,
          amount: amount,
          timestamp: txDate.toISOString(),
          displayDate: formatDisplayDateOnly(txDate)
        };

        transactions.unshift(newTx);
        saveTransactions();

        expenseInputName.value = '';
        expenseInputAmount.value = '';
        expenseSelectedDate = new Date();
        updatePickerButtonDisplays();

        renderAllViews();
        showToast('Pengeluaran Dicatat! 💸');
      });
    }
  }

  // --- ACTIONS (DELETE & CLEAR ALL & SEARCH) ---
  function setupActionListeners() {
    // Search Filters
    if (incomeInputSearch) {
      incomeInputSearch.addEventListener('input', () => renderIncomeList());
    }
    if (expenseInputSearch) {
      expenseInputSearch.addEventListener('input', () => renderExpenseList());
    }

    // Clear All Pendapatan
    if (incomeBtnClearAll) {
      incomeBtnClearAll.addEventListener('click', async () => {
        const incomeList = transactions.filter(t => t.type === 'income');
        if (incomeList.length === 0) {
          showToast('⚠️ Belum ada data pendapatan!');
          return;
        }

        const confirmed = await showCustomConfirm({
          title: 'Hapus Semua Pendapatan?',
          desc: 'PERINGATAN: Seluruh riwayat catatan pendapatan akan dihapus permanen!',
          confirmText: 'CLEAR PENDAPATAN'
        });

        if (confirmed) {
          transactions = transactions.filter(t => t.type !== 'income');
          saveTransactions();
          renderAllViews();
          showToast('Riwayat Pendapatan Dibersihkan!');
        }
      });
    }

    // Clear All Pengeluaran
    if (expenseBtnClearAll) {
      expenseBtnClearAll.addEventListener('click', async () => {
        const expenseList = transactions.filter(t => t.type === 'expense');
        if (expenseList.length === 0) {
          showToast('⚠️ Belum ada data pengeluaran!');
          return;
        }

        const confirmed = await showCustomConfirm({
          title: 'Hapus Semua Pengeluaran?',
          desc: 'PERINGATAN: Seluruh riwayat catatan pengeluaran akan dihapus permanen!',
          confirmText: 'CLEAR PENGELUARAN'
        });

        if (confirmed) {
          transactions = transactions.filter(t => t.type !== 'expense');
          saveTransactions();
          renderAllViews();
          showToast('Riwayat Pengeluaran Dibersihkan!');
        }
      });
    }

    // Generic Delete Listener for any container with .tx-del-btn
    document.addEventListener('click', async (e) => {
      const delBtn = e.target.closest('.tx-del-btn');
      if (!delBtn) return;

      const id = delBtn.dataset.id;
      const targetTx = transactions.find(t => t.id === id);
      if (!targetTx) return;

      const isIncome = targetTx.type === 'income';
      const labelType = isIncome ? 'Pendapatan' : 'Pengeluaran';

      const confirmed = await showCustomConfirm({
        title: `Hapus ${labelType}?`,
        desc: `Apakah kamu yakin ingin menghapus catatan "${targetTx.name}" senilai ${formatRupiah(targetTx.amount)}?`,
        confirmText: 'HAPUS NOW!'
      });

      if (confirmed) {
        transactions = transactions.filter(t => t.id !== id);
        saveTransactions();
        renderAllViews();
        showToast(`${labelType} Dihapus!`);
      }
    });
  }

  // --- MAIN RENDER ORCHESTRATION ---
  function renderAllViews() {
    renderDashboard();
    renderIncomeView();
    renderExpenseView();
  }

  // ==========================================================================
  // VIEW 1: DASHBOARD (GRAFIK PENDAPATAN VS PENGELUARAN & RATIO ANALYTICS)
  // ==========================================================================
  function renderDashboard() {
    const periodFiltered = filterByPeriod(transactions, dashPeriod);

    const incomeFiltered = periodFiltered.filter(t => t.type === 'income');
    const expenseFiltered = periodFiltered.filter(t => t.type === 'expense');

    const totalIncome = incomeFiltered.reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = expenseFiltered.reduce((sum, t) => sum + t.amount, 0);
    const netBalance = totalIncome - totalExpense;

    // Period Titles
    const periodTitles = {
      all: 'Saldo Bersih (Semua)',
      daily: 'Saldo Bersih (Hari Ini)',
      weekly: 'Saldo Bersih (7 Hari Terakhir)',
      monthly: 'Saldo Bersih (Bulan Ini)'
    };
    if (dashPeriodTitle) dashPeriodTitle.textContent = periodTitles[dashPeriod];
    if (dashChartPeriodTag) dashChartPeriodTag.textContent = dashPeriod.toUpperCase();

    // 1. Net Balance Display
    if (netBalanceDisplay) {
      netBalanceDisplay.textContent = formatRupiah(netBalance);
      if (netBalance < 0) {
        netBalanceDisplay.style.color = '#BE123C';
      } else {
        netBalanceDisplay.style.color = '#0F0F0F';
      }
    }

    if (ratioExpenseBar) ratioExpenseBar.style.width = `${expensePct}%`;
    if (ratioSavingsBar) ratioSavingsBar.style.width = `${savingsPct}%`;
    if (ratioExpenseText) ratioExpenseText.textContent = `Pengeluaran: ${expensePct}%`;
    if (ratioSavingsText) ratioSavingsText.textContent = `Sisa Cuan: ${savingsPct}%`;

    // 4. Quick Comparison Stats
    const avgIncome = incomeFiltered.length > 0 ? Math.round(totalIncome / incomeFiltered.length) : 0;
    const avgExpense = expenseFiltered.length > 0 ? Math.round(totalExpense / expenseFiltered.length) : 0;
    if (dashStatAvgIncome) dashStatAvgIncome.textContent = formatRupiah(avgIncome);
    if (dashStatAvgExpense) dashStatAvgExpense.textContent = formatRupiah(avgExpense);

    // 5. Render Grouped Visual Chart (Pendapatan vs Pengeluaran)
    renderGroupedBarChart(incomeFiltered, expenseFiltered);

    // 6. Render Recent Combined Activity (5 latest items)
    renderRecentActivity();
  }

  // --- GROUPED BAR CHART: PENDAPATAN VS PENGELUARAN ---
  function renderGroupedBarChart(incomeList, expenseList) {
    if (!dashChartBars) return;
    dashChartBars.innerHTML = '';

    const now = new Date();

    if (dashPeriod === 'weekly') {
      // 7 days grouped (past 7 days)
      const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
      const incomeTotals = Array(7).fill(0);
      const expenseTotals = Array(7).fill(0);

      incomeList.forEach(tx => {
        const d = new Date(tx.timestamp).getDay();
        incomeTotals[d] += tx.amount;
      });

      expenseList.forEach(tx => {
        const d = new Date(tx.timestamp).getDay();
        expenseTotals[d] += tx.amount;
      });

      const maxVal = Math.max(...incomeTotals, ...expenseTotals, 1);

      for (let i = 6; i >= 0; i--) {
        const targetDate = new Date();
        targetDate.setDate(now.getDate() - i);
        const dayIdx = targetDate.getDay();
        const label = dayNames[dayIdx];

        const incVal = incomeTotals[dayIdx];
        const expVal = expenseTotals[dayIdx];

        const incHeight = incVal > 0 ? Math.max(Math.round((incVal / maxVal) * 100), 8) : 4;
        const expHeight = expVal > 0 ? Math.max(Math.round((expVal / maxVal) * 100), 8) : 4;

        const col = document.createElement('div');
        col.className = 'grouped-col';
        col.innerHTML = `
          <div class="bar-pair">
            <div class="bar-single income-bar" style="height: ${incHeight}%;" title="${label} - Pendapatan: ${formatRupiah(incVal)}"></div>
            <div class="bar-single expense-bar" style="height: ${expHeight}%;" title="${label} - Pengeluaran: ${formatRupiah(expVal)}"></div>
          </div>
          <span class="bar-label">${label}</span>
        `;
        dashChartBars.appendChild(col);
      }

    } else if (dashPeriod === 'monthly') {
      // 4 weeks grouped
      const incWeeks = [0, 0, 0, 0];
      const expWeeks = [0, 0, 0, 0];

      incomeList.forEach(tx => {
        const dateNum = new Date(tx.timestamp).getDate();
        if (dateNum <= 7) incWeeks[0] += tx.amount;
        else if (dateNum <= 14) incWeeks[1] += tx.amount;
        else if (dateNum <= 21) incWeeks[2] += tx.amount;
        else incWeeks[3] += tx.amount;
      });

      expenseList.forEach(tx => {
        const dateNum = new Date(tx.timestamp).getDate();
        if (dateNum <= 7) expWeeks[0] += tx.amount;
        else if (dateNum <= 14) expWeeks[1] += tx.amount;
        else if (dateNum <= 21) expWeeks[2] += tx.amount;
        else expWeeks[3] += tx.amount;
      });

      const maxVal = Math.max(...incWeeks, ...expWeeks, 1);
      const labels = ['W1', 'W2', 'W3', 'W4'];

      labels.forEach((label, i) => {
        const incVal = incWeeks[i];
        const expVal = expWeeks[i];

        const incHeight = incVal > 0 ? Math.max(Math.round((incVal / maxVal) * 100), 8) : 4;
        const expHeight = expVal > 0 ? Math.max(Math.round((expVal / maxVal) * 100), 8) : 4;

        const col = document.createElement('div');
        col.className = 'grouped-col';
        col.innerHTML = `
          <div class="bar-pair">
            <div class="bar-single income-bar" style="height: ${incHeight}%;" title="Minggu ${i+1} - Masuk: ${formatRupiah(incVal)}"></div>
            <div class="bar-single expense-bar" style="height: ${expHeight}%;" title="Minggu ${i+1} - Keluar: ${formatRupiah(expVal)}"></div>
          </div>
          <span class="bar-label">${label}</span>
        `;
        dashChartBars.appendChild(col);
      });

    } else {
      // 'all' or 'daily': compare by latest active 5 entries / slots
      const incTotal = incomeList.reduce((acc, t) => acc + t.amount, 0);
      const expTotal = expenseList.reduce((acc, t) => acc + t.amount, 0);

      // Create a comparative 5-column breakdown: Total, Rata-rata, Max, Entry 1, Entry 2
      const slotLabels = ['Total', 'Rerata', 'Maks', 'Entry1', 'Entry2'];
      const incMax = incomeList.length > 0 ? Math.max(...incomeList.map(t => t.amount)) : 0;
      const expMax = expenseList.length > 0 ? Math.max(...expenseList.map(t => t.amount)) : 0;
      const incAvg = incomeList.length > 0 ? Math.round(incTotal / incomeList.length) : 0;
      const expAvg = expenseList.length > 0 ? Math.round(expTotal / expenseList.length) : 0;

      const incSlots = [
        incTotal,
        incAvg,
        incMax,
        incomeList[0] ? incomeList[0].amount : 0,
        incomeList[1] ? incomeList[1].amount : 0
      ];

      const expSlots = [
        expTotal,
        expAvg,
        expMax,
        expenseList[0] ? expenseList[0].amount : 0,
        expenseList[1] ? expenseList[1].amount : 0
      ];

      const maxVal = Math.max(...incSlots, ...expSlots, 1);

      slotLabels.forEach((label, i) => {
        const incVal = incSlots[i];
        const expVal = expSlots[i];

        const incHeight = incVal > 0 ? Math.max(Math.round((incVal / maxVal) * 100), 8) : 4;
        const expHeight = expVal > 0 ? Math.max(Math.round((expVal / maxVal) * 100), 8) : 4;

        const col = document.createElement('div');
        col.className = 'grouped-col';
        col.innerHTML = `
          <div class="bar-pair">
            <div class="bar-single income-bar" style="height: ${incHeight}%;" title="${label} - Pendapatan: ${formatRupiah(incVal)}"></div>
            <div class="bar-single expense-bar" style="height: ${expHeight}%;" title="${label} - Pengeluaran: ${formatRupiah(expVal)}"></div>
          </div>
          <span class="bar-label">${label}</span>
        `;
        dashChartBars.appendChild(col);
      });
    }
  }

  // --- RECENT COMBINED ACTIVITY (DASHBOARD) ---
  function renderRecentActivity() {
    if (!dashRecentList) return;
    dashRecentList.innerHTML = '';

    const recent5 = transactions.slice(0, 5);

    if (recent5.length === 0) {
      dashRecentList.innerHTML = `
        <div class="empty-state">
          Belum ada catatan aktivitas keuangan.<br>
          <span style="font-size:0.8rem; font-weight:normal;">Mulai catat pendapatan & pengeluaranmu sekarang!</span>
        </div>
      `;
      return;
    }

    recent5.forEach(tx => {
      const isIncome = tx.type === 'income';
      const itemEl = document.createElement('div');
      itemEl.className = 'tx-item';
      itemEl.innerHTML = `
        <div class="tx-info">
          <div class="tx-title">${escapeHTML(tx.name)}</div>
          <div class="tx-meta">
            <span class="tx-badge-type ${isIncome ? 'tx-badge-income' : 'tx-badge-expense'}">
              ${isIncome ? 'MASUK' : 'KELUAR'}
            </span>
            <span style="display:inline-flex; align-items:center; gap:4px;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              ${tx.displayDate}
            </span>
          </div>
        </div>
        <div class="tx-right">
          <div class="tx-amount ${isIncome ? 'tx-amount-income' : 'tx-amount-expense'}">
            ${isIncome ? '+' : '-'} ${formatRupiah(tx.amount)}
          </div>
          <button class="tx-del-btn" data-id="${tx.id}" title="Hapus">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      `;
      dashRecentList.appendChild(itemEl);
    });
  }

  // ==========================================================================
  // VIEW 2: PENDAPATAN (INCOME SYSTEM)
  // ==========================================================================
  function renderIncomeView() {
    const allIncomes = transactions.filter(t => t.type === 'income');
    const filteredIncomes = filterByPeriod(allIncomes, incomePeriod);

    const totalIncome = filteredIncomes.reduce((acc, curr) => acc + curr.amount, 0);
    const count = filteredIncomes.length;
    const avg = count > 0 ? Math.round(totalIncome / count) : 0;
    const max = count > 0 ? Math.max(...filteredIncomes.map(t => t.amount)) : 0;

    const periodTitles = {
      all: 'Total Pendapatan (Semua)',
      daily: 'Total Pendapatan (Hari Ini)',
      weekly: 'Total Pendapatan (7 Hari Terakhir)',
      monthly: 'Total Pendapatan (Bulan Ini)'
    };

    if (incomePeriodTitle) incomePeriodTitle.textContent = periodTitles[incomePeriod];
    if (incomeHeroAmount) incomeHeroAmount.textContent = formatRupiah(totalIncome);
    if (incomeTxCountBadge) incomeTxCountBadge.textContent = `${count} Transaksi Masuk`;
    if (incomeFilterTag) incomeFilterTag.textContent = incomePeriod.toUpperCase();

    if (incomeStatAvg) incomeStatAvg.textContent = formatRupiah(avg);
    if (incomeStatMax) incomeStatMax.textContent = formatRupiah(max);

    renderIncomeList(filteredIncomes);
  }

  function renderIncomeList(data) {
    if (!incomeTxListContainer) return;
    const listToRender = data || filterByPeriod(transactions.filter(t => t.type === 'income'), incomePeriod);
    const query = incomeInputSearch ? incomeInputSearch.value.trim().toLowerCase() : '';

    const filtered = listToRender.filter(tx => {
      return tx.name.toLowerCase().includes(query) || tx.amount.toString().includes(query);
    });

    incomeTxListContainer.innerHTML = '';

    if (filtered.length === 0) {
      incomeTxListContainer.innerHTML = `
        <div class="empty-state">
          💸 Belum ada catatan pendapatan.<br>
          <span style="font-size:0.8rem; font-weight:normal;">Tambahkan pendapatan baru lewat form di atas!</span>
        </div>
      `;
      return;
    }

    filtered.forEach(tx => {
      const itemEl = document.createElement('div');
      itemEl.className = 'tx-item';
      itemEl.innerHTML = `
        <div class="tx-info">
          <div class="tx-title">${escapeHTML(tx.name)}</div>
          <div class="tx-meta">
            <span class="tx-badge-type tx-badge-income">MASUK</span>
            <span style="display:inline-flex; align-items:center; gap:4px;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              ${tx.displayDate}
            </span>
          </div>
        </div>
        <div class="tx-right">
          <div class="tx-amount tx-amount-income">+ ${formatRupiah(tx.amount)}</div>
          <button class="tx-del-btn" data-id="${tx.id}" title="Hapus">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      `;
      incomeTxListContainer.appendChild(itemEl);
    });
  }

  // ==========================================================================
  // VIEW 3: PENGELUARAN (EXPENSE SYSTEM)
  // ==========================================================================
  function renderExpenseView() {
    const allExpenses = transactions.filter(t => t.type === 'expense');
    const filteredExpenses = filterByPeriod(allExpenses, expensePeriod);

    const totalExpense = filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);
    const count = filteredExpenses.length;
    const avg = count > 0 ? Math.round(totalExpense / count) : 0;
    const max = count > 0 ? Math.max(...filteredExpenses.map(t => t.amount)) : 0;

    const periodTitles = {
      all: 'Total Pengeluaran (Semua)',
      daily: 'Total Pengeluaran (Hari Ini)',
      weekly: 'Total Pengeluaran (7 Hari Terakhir)',
      monthly: 'Total Pengeluaran (Bulan Ini)'
    };

    if (expensePeriodTitle) expensePeriodTitle.textContent = periodTitles[expensePeriod];
    if (expenseHeroAmount) expenseHeroAmount.textContent = formatRupiah(totalExpense);
    if (expenseTxCountBadge) expenseTxCountBadge.textContent = `${count} Transaksi Keluar`;
    if (expenseFilterTag) expenseFilterTag.textContent = expensePeriod.toUpperCase();

    if (expenseStatAvg) expenseStatAvg.textContent = formatRupiah(avg);
    if (expenseStatMax) expenseStatMax.textContent = formatRupiah(max);

    renderExpenseList(filteredExpenses);
  }

  function renderExpenseList(data) {
    if (!expenseTxListContainer) return;
    const listToRender = data || filterByPeriod(transactions.filter(t => t.type === 'expense'), expensePeriod);
    const query = expenseInputSearch ? expenseInputSearch.value.trim().toLowerCase() : '';

    const filtered = listToRender.filter(tx => {
      return tx.name.toLowerCase().includes(query) || tx.amount.toString().includes(query);
    });

    expenseTxListContainer.innerHTML = '';

    if (filtered.length === 0) {
      expenseTxListContainer.innerHTML = `
        <div class="empty-state">
          🛒 Belum ada catatan pengeluaran.<br>
          <span style="font-size:0.8rem; font-weight:normal;">Catat belanja dan kebutuhanmu lewat form di atas!</span>
        </div>
      `;
      return;
    }

    filtered.forEach(tx => {
      const itemEl = document.createElement('div');
      itemEl.className = 'tx-item';
      itemEl.innerHTML = `
        <div class="tx-info">
          <div class="tx-title">${escapeHTML(tx.name)}</div>
          <div class="tx-meta">
            <span class="tx-badge-type tx-badge-expense">KELUAR</span>
            <span style="display:inline-flex; align-items:center; gap:4px;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              ${tx.displayDate}
            </span>
          </div>
        </div>
        <div class="tx-right">
          <div class="tx-amount tx-amount-expense">- ${formatRupiah(tx.amount)}</div>
          <button class="tx-del-btn" data-id="${tx.id}" title="Hapus">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      `;
      expenseTxListContainer.appendChild(itemEl);
    });
  }

});
