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

  // Dashboard Year & Month Selection States (12-Month System)
  let dashYear = new Date().getFullYear();
  let dashSelectedMonth = 'all'; // 'all' or 0..11

  // Notes State (Independent from financial transactions)
  const NOTES_STORAGE_KEY = 'cuanku_neo_notes_clean_v1';
  let notes = JSON.parse(localStorage.getItem(NOTES_STORAGE_KEY)) || [];
  let notesSelectedDate = new Date();
  sortNotesInPlace();

  function sortNotesInPlace() {
    notes.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      if (timeA !== timeB) {
        return timeA - timeB; // Tanggal terkecil (terawal) muncul di atas
      }
      return (a.id || '').localeCompare(b.id || '');
    });
  }

  // Date Picker States
  let incomeSelectedDate = new Date();
  let expenseSelectedDate = new Date();
  let currentDatePickerTarget = 'income'; // 'income' | 'expense' | 'notes'
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

  // Tab View Containers (4 Halaman Utama)
  const viewDashboard = document.getElementById('view-dashboard');
  const viewIncome = document.getElementById('view-income');
  const viewExpense = document.getElementById('view-expense');
  const viewNotes = document.getElementById('view-notes');

  // Navigation Items
  const navDashboard = document.getElementById('nav-dashboard');
  const navIncome = document.getElementById('nav-income');
  const navVoice = document.getElementById('nav-voice');
  const navExpense = document.getElementById('nav-expense');
  const navNotes = document.getElementById('nav-notes');

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
  const chartPrevYear = document.getElementById('chart-prev-year');
  const chartNextYear = document.getElementById('chart-next-year');
  const chartYearDisplay = document.getElementById('chart-year-display');
  const dashMonthChips = document.getElementById('dash-month-chips');
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

  // --- NOTES VIEW DOM ELEMENTS ---
  const notesHeroCount = document.getElementById('notes-hero-count');
  const notesForm = document.getElementById('notes-form');
  const notesBtnDatepicker = document.getElementById('notes-btn-datepicker');
  const notesDisplaySelectedDate = document.getElementById('notes-display-selected-date');
  const notesInputTitle = document.getElementById('notes-input-title');
  const notesBtnClearAll = document.getElementById('notes-btn-clear-all');
  const notesInputSearch = document.getElementById('notes-input-search');
  const notesListContainer = document.getElementById('notes-list-container');

  // --- VOICE POP-UP MODAL & DETECTED MODAL DOM ELEMENTS ---
  const voicePopupModal = document.getElementById('voice-popup-modal');
  const voiceModalCloseBtn = document.getElementById('voice-modal-close-btn');
  const voiceStatusDot = document.getElementById('voice-status-dot');
  const voiceStatusText = document.getElementById('voice-status-text');
  const btnToggleMic = document.getElementById('btn-toggle-mic');
  const micPulseRing = document.getElementById('mic-pulse-ring');
  const micPromptLabel = document.getElementById('mic-prompt-label');
  const voiceWaveContainer = document.getElementById('voice-wave-container');
  const voiceTranscriptText = document.getElementById('voice-transcript-text');
  const btnClearVoice = document.getElementById('btn-clear-voice');

  // Pop-Up Konfirmasi Otomatis (Pemasukan / Pengeluaran)
  const voiceDetectedModal = document.getElementById('voice-detected-modal');
  const detectedModalCard = document.getElementById('detected-modal-card');
  const detectedBadgeTitle = document.getElementById('detected-badge-title');
  const detectedAmountDisplay = document.getElementById('detected-amount-display');
  const detectedNameDisplay = document.getElementById('detected-name-display');
  const detectedDateDisplay = document.getElementById('detected-date-display');
  const btnDetectedSwitchType = document.getElementById('btn-detected-switch-type');
  const detectedEditDetails = document.getElementById('detected-edit-details');
  const detectedInputName = document.getElementById('detected-input-name');
  const detectedInputAmount = document.getElementById('detected-input-amount');
  const btnDetectedSave = document.getElementById('btn-detected-save');
  const btnDetectedRetry = document.getElementById('btn-detected-retry');
  const btnDetectedCancel = document.getElementById('btn-detected-cancel');

  let isRecording = false;
  let recognitionInstance = null;
  let currentDetectedTx = {
    type: 'expense',
    name: 'Pengeluaran Baru',
    amount: 0,
    date: new Date()
  };

  // --- INITIALIZATION ---
  updateClock();
  setInterval(updateClock, 1000);
  updatePickerButtonDisplays();
  setupNavigationTabs();
  setupPeriodFilters();
  setupDashboardYearMonthNav();
  setupFormFormatting();
  setupFormSubmissions();
  setupVoiceAssistant();
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

  // --- TAB NAVIGATION SYSTEM (4 TAB HALAMAN + TOMBOL VOICE MODAL DI TENGAH) ---
  function setupNavigationTabs() {
    const navItems = [
      { btn: navDashboard, view: viewDashboard, name: 'dashboard' },
      { btn: navIncome, view: viewIncome, name: 'income' },
      { btn: navExpense, view: viewExpense, name: 'expense' },
      { btn: navNotes, view: viewNotes, name: 'notes' }
    ];

    navItems.forEach(item => {
      if (!item.btn) return;
      item.btn.addEventListener('click', () => {
        switchTab(item.name);
      });
    });

    // Tombol Voice di tengah: Tidak pindah halaman, tapi buka pop-up modal!
    if (navVoice) {
      navVoice.addEventListener('click', () => {
        openVoiceModal();
      });
    }
  }

  function openVoiceModal() {
    if (voicePopupModal) {
      voicePopupModal.classList.remove('hidden');
    }
  }

  function closeVoiceModal() {
    if (voicePopupModal) {
      voicePopupModal.classList.add('hidden');
    }
    if (isRecording && recognitionInstance) {
      try {
        recognitionInstance.stop();
      } catch (err) {
        console.warn(err);
      }
    }
  }

  function switchTab(tabName) {
    currentActiveTab = tabName;

    // Update active nav button (halaman tetap pada tab yang dipilih)
    [navDashboard, navIncome, navExpense, navNotes].forEach(btn => {
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
      { view: viewExpense, name: 'expense' },
      { view: viewNotes, name: 'notes' }
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
    [incomeInputAmount, expenseInputAmount, detectedInputAmount].forEach(input => {
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
    if (notesDisplaySelectedDate) {
      notesDisplaySelectedDate.textContent = formatDisplayDateOnly(notesSelectedDate);
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

    if (notesBtnDatepicker) {
      notesBtnDatepicker.addEventListener('click', () => {
        currentDatePickerTarget = 'notes';
        calendarViewDate = new Date(notesSelectedDate);
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
    } else if (currentDatePickerTarget === 'expense') {
      expenseSelectedDate = d;
    } else if (currentDatePickerTarget === 'voice') {
      voiceSelectedDate = d;
    } else {
      notesSelectedDate = d;
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
    const targetSelected = currentDatePickerTarget === 'income' 
      ? incomeSelectedDate 
      : (currentDatePickerTarget === 'expense' 
          ? expenseSelectedDate 
          : (currentDatePickerTarget === 'voice' ? voiceSelectedDate : notesSelectedDate));

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
          showToast('Isi sumber & nominal!');
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
        showToast('Pemasukan Ditambahkan!');
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
          showToast('Isi keperluan & nominal!');
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
        showToast('Pengeluaran Dicatat!');
      });
    }

    // 3. Tambah Catatan
    if (notesForm) {
      notesForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = notesInputTitle.value.trim();

        if (!title) {
          showToast('Masukkan judul catatan!');
          return;
        }

        const noteDate = notesSelectedDate || new Date();
        const newNote = {
          id: 'note_' + Date.now(),
          title: title,
          done: false,
          timestamp: noteDate.toISOString(),
          displayDate: formatDisplayDateOnly(noteDate)
        };

        notes.push(newNote);
        sortNotesInPlace();
        saveNotes();

        notesInputTitle.value = '';
        notesSelectedDate = new Date();
        updatePickerButtonDisplays();

        renderNotesView();
        showToast('Catatan Disimpan!');
      });
    }
  }

  function saveNotes() {
    localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
  }

  // ==========================================================================
  // VOICE ASSISTANT & TRANSACTION PARSER ENGINE
  // ==========================================================================
  function setupVoiceAssistant() {
    // 1. Inisialisasi Web Speech API jika didukung browser
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        recognitionInstance = new SpeechRecognition();
        recognitionInstance.lang = 'id-ID';
        recognitionInstance.continuous = false;
        recognitionInstance.interimResults = true;

        recognitionInstance.onstart = () => {
          isRecording = true;
          updateVoiceUIState(true);
        };

        recognitionInstance.onresult = (event) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }

          const currentSpeech = finalTranscript || interimTranscript;
          if (currentSpeech && voiceTranscriptText) {
            voiceTranscriptText.textContent = `"${currentSpeech}"`;
          }

          if (finalTranscript && finalTranscript.trim().length > 0) {
            // Selesai mengucapkan -> Hentikan mic & tutup perekam
            if (isRecording && recognitionInstance) {
              try { recognitionInstance.stop(); } catch (err) {}
            }
            closeVoiceModal();

            // Langsung munculkan pop-up pemasukan / pengeluaran sesuai ucapan!
            processVoiceInput(finalTranscript);
          }
        };

        recognitionInstance.onerror = (event) => {
          console.warn('Speech recognition error:', event.error);
          isRecording = false;
          updateVoiceUIState(false);
          if (event.error === 'not-allowed') {
            showToast('Izin mic belum diizinkan');
            if (voiceStatusText) voiceStatusText.textContent = 'Izin mikrofon ditolak / diblokir browser';
          } else if (event.error === 'no-speech') {
            if (voiceStatusText) voiceStatusText.textContent = 'Tidak ada suara terdengar. Coba lagi!';
          } else {
            if (voiceStatusText) voiceStatusText.textContent = 'Gagal mendengar. Silakan coba lagi!';
          }
        };

        recognitionInstance.onend = () => {
          isRecording = false;
          updateVoiceUIState(false);
        };
      } catch (err) {
        console.error('Speech recognition init error:', err);
      }
    } else {
      if (voiceStatusText) {
        voiceStatusText.textContent = 'Browser belum mendukung Web Speech API (Gunakan Chrome/Edge/Android)';
      }
    }

    // Toggle Mic Button Click
    if (btnToggleMic) {
      btnToggleMic.addEventListener('click', () => {
        if (!recognitionInstance) {
          showToast('Browser belum mendukung mic langsung!');
          return;
        }

        if (isRecording) {
          try {
            recognitionInstance.stop();
          } catch (e) {
            console.warn(e);
          }
        } else {
          try {
            if (voiceTranscriptText) {
              voiceTranscriptText.textContent = '"Mendengarkan suara Anda..."';
            }
            recognitionInstance.start();
          } catch (e) {
            console.warn('Mic restart attempt:', e);
            try {
              recognitionInstance.stop();
              setTimeout(() => {
                try { recognitionInstance.start(); } catch (err) { console.error(err); }
              }, 200);
            } catch (err) {
              console.error(err);
            }
          }
        }
      });
    }

    // Clear transcript
    if (btnClearVoice) {
      btnClearVoice.addEventListener('click', () => {
        if (voiceTranscriptText) {
          voiceTranscriptText.textContent = '"Silakan ketuk tombol di atas dan sebutkan transaksi Anda..."';
        }
        showToast('Hasil ucapan dibersihkan');
      });
    }

    // Modal Close Button & Backdrop Click Listeners
    if (voiceModalCloseBtn) {
      voiceModalCloseBtn.addEventListener('click', closeVoiceModal);
    }

    if (voicePopupModal) {
      voicePopupModal.addEventListener('click', (e) => {
        if (e.target === voicePopupModal) {
          closeVoiceModal();
        }
      });
    }

    // --- SETUP DETECTED POP-UP LISTENERS ---
    setupDetectedModalListeners();
  }

  function setupDetectedModalListeners() {
    // Switch Tipe Transaksi (Pemasukan <-> Pengeluaran)
    if (btnDetectedSwitchType) {
      btnDetectedSwitchType.addEventListener('click', () => {
        currentDetectedTx.type = currentDetectedTx.type === 'income' ? 'expense' : 'income';
        openVoiceDetectedModal();
      });
    }

    // Sinkronkan input nama koreksi secara real-time
    if (detectedInputName) {
      detectedInputName.addEventListener('input', (e) => {
        currentDetectedTx.name = e.target.value.trim();
        if (detectedNameDisplay) {
          detectedNameDisplay.textContent = currentDetectedTx.name || '-';
        }
      });
    }

    // Sinkronkan input nominal koreksi secara real-time
    if (detectedInputAmount) {
      detectedInputAmount.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value) {
          e.target.value = new Intl.NumberFormat('id-ID').format(value);
          currentDetectedTx.amount = parseInt(value, 10);
        } else {
          e.target.value = '';
          currentDetectedTx.amount = 0;
        }
        if (detectedAmountDisplay) {
          detectedAmountDisplay.textContent = formatRupiah(currentDetectedTx.amount);
        }
      });
    }

    // Simpan Transaksi Otomatis
    if (btnDetectedSave) {
      btnDetectedSave.addEventListener('click', () => {
        const name = (detectedInputName ? detectedInputName.value.trim() : '') || currentDetectedTx.name || 'Transaksi';
        const rawAmount = detectedInputAmount ? detectedInputAmount.value.replace(/\D/g, '') : '';
        const amount = parseInt(rawAmount, 10) || currentDetectedTx.amount;

        if (!name || isNaN(amount) || amount <= 0) {
          showToast('Masukkan nominal transaksi!');
          if (detectedEditDetails) detectedEditDetails.open = true;
          if (detectedInputAmount) detectedInputAmount.focus();
          return;
        }

        const isIncome = currentDetectedTx.type === 'income';
        const newTx = {
          id: (isIncome ? 'tx_inc_' : 'tx_exp_') + Date.now(),
          type: isIncome ? 'income' : 'expense',
          name: name,
          amount: amount,
          timestamp: (currentDetectedTx.date || new Date()).toISOString(),
          displayDate: formatDisplayDateOnly(currentDetectedTx.date || new Date())
        };

        transactions.unshift(newTx);
        saveTransactions();
        renderAllViews();

        showToast(isIncome ? 'Pemasukan Ditambahkan via Voice!' : 'Pengeluaran Dicatat via Voice!');
        closeVoiceDetectedModal();
      });
    }

    // Tombol Bicara Lagi
    if (btnDetectedRetry) {
      btnDetectedRetry.addEventListener('click', () => {
        closeVoiceDetectedModal();
        openVoiceModal();
        // Otomatis mulai merekam kembali
        setTimeout(() => {
          if (btnToggleMic && recognitionInstance && !isRecording) {
            try { recognitionInstance.start(); } catch (err) {}
          }
        }, 300);
      });
    }

    // Tombol Batal & Backdrop Click
    if (btnDetectedCancel) {
      btnDetectedCancel.addEventListener('click', closeVoiceDetectedModal);
    }

    if (voiceDetectedModal) {
      voiceDetectedModal.addEventListener('click', (e) => {
        if (e.target === voiceDetectedModal) {
          closeVoiceDetectedModal();
        }
      });
    }
  }

  function openVoiceDetectedModal() {
    if (!voiceDetectedModal) return;

    const isIncome = currentDetectedTx.type === 'income';

    if (detectedModalCard) {
      detectedModalCard.className = `detected-modal-card ${isIncome ? 'is-income' : 'is-expense'}`;
    }

    if (detectedBadgeTitle) {
      detectedBadgeTitle.textContent = isIncome ? 'PEMASUKAN TERDETEKSI' : 'PENGELUARAN TERDETEKSI';
    }

    if (btnDetectedSwitchType) {
      btnDetectedSwitchType.textContent = isIncome ? 'Ganti ke Pengeluaran' : 'Ganti ke Pemasukan';
    }

    if (btnDetectedSave) {
      btnDetectedSave.textContent = isIncome ? 'SIMPAN PEMASUKAN' : 'SIMPAN PENGELUARAN';
    }

    if (detectedAmountDisplay) {
      detectedAmountDisplay.textContent = formatRupiah(currentDetectedTx.amount || 0);
    }

    if (detectedNameDisplay) {
      detectedNameDisplay.textContent = currentDetectedTx.name || '-';
    }

    if (detectedDateDisplay) {
      detectedDateDisplay.textContent = formatDisplayDateOnly(currentDetectedTx.date || new Date());
    }

    if (detectedInputName) {
      detectedInputName.value = currentDetectedTx.name || '';
    }

    if (detectedInputAmount) {
      detectedInputAmount.value = currentDetectedTx.amount > 0 ? new Intl.NumberFormat('id-ID').format(currentDetectedTx.amount) : '';
    }

    if (detectedEditDetails) {
      detectedEditDetails.open = false;
    }

    voiceDetectedModal.classList.remove('hidden');
  }

  function closeVoiceDetectedModal() {
    if (voiceDetectedModal) {
      voiceDetectedModal.classList.add('hidden');
    }
  }

  function updateVoiceUIState(recording) {
    if (recording) {
      if (btnToggleMic) btnToggleMic.classList.add('recording');
      if (micPulseRing) micPulseRing.classList.add('active');
      if (voiceWaveContainer) voiceWaveContainer.classList.add('active');
      if (voiceStatusDot) voiceStatusDot.classList.add('listening');
      if (voiceStatusText) voiceStatusText.textContent = 'Mendengarkan ucapan... Silakan bicara!';
      if (micPromptLabel) micPromptLabel.textContent = 'Mendengarkan... Ketuk lagi untuk selesai';
    } else {
      if (btnToggleMic) btnToggleMic.classList.remove('recording');
      if (micPulseRing) micPulseRing.classList.remove('active');
      if (voiceWaveContainer) voiceWaveContainer.classList.remove('active');
      if (voiceStatusDot) voiceStatusDot.classList.remove('listening');
      if (voiceStatusText) voiceStatusText.textContent = 'Selesai mendengarkan';
      if (micPromptLabel) micPromptLabel.textContent = 'Ketuk tombol mikrofon untuk bicara';
    }
  }

  // --- SMART PARSER UNTUK BAHASA INDONESIA ---
  function processVoiceInput(text) {
    if (!text || typeof text !== 'string') return;
    const cleanText = text.trim();

    // 1. Ekstrak Nominal Rupiah
    const parsedAmount = extractAmountFromIndonesian(cleanText);

    // 2. Deteksi Tipe (Income vs Expense)
    const detectedType = detectTransactionType(cleanText);

    // 3. Ekstrak Nama / Keterangan Transaksi
    const extractedName = extractTransactionTitle(cleanText, detectedType);

    // Simpan ke state detected tx
    currentDetectedTx = {
      type: detectedType,
      name: extractedName,
      amount: parsedAmount,
      date: new Date()
    };

    // Buka pop-up konfirmasi pemasukan / pengeluaran otomatis!
    openVoiceDetectedModal();
  }

  function detectTransactionType(text) {
    const lower = text.toLowerCase();
    
    // Kata kunci Pendapatan
    const incomeKeywords = [
      'pendapatan', 'pemasukan', 'masuk', 'gaji', 'bonus', 'dapat', 'mendapatkan',
      'terima', 'diterima', 'uang masuk', 'untung', 'cuan', 'jual', 'penjualan',
      'thr', 'hadiah', 'kembalian', 'piutang', 'dividen', 'freelance', 'sampingan',
      'saku', 'transfer masuk'
    ];

    // Kata kunci Pengeluaran
    const expenseKeywords = [
      'pengeluaran', 'keluar', 'beli', 'membeli', 'bayar', 'membayar', 'belanja',
      'makan', 'minum', 'jajan', 'ngopi', 'kopi', 'ongkos', 'bensin', 'parkir',
      'pulsa', 'kuota', 'listrik', 'air', 'pdam', 'wifi', 'internet', 'kos',
      'kontrakan', 'sewa', 'cicilan', 'utang', 'hutang', 'obat', 'sedekah',
      'infaq', 'donasi', 'nongkrong', 'topup', 'top up', 'transfer'
    ];

    let incomeScore = 0;
    let expenseScore = 0;

    for (const kw of incomeKeywords) {
      if (lower.includes(kw)) incomeScore++;
    }

    for (const kw of expenseKeywords) {
      if (lower.includes(kw)) expenseScore++;
    }

    if (incomeScore > expenseScore) {
      return 'income';
    }
    return 'expense'; // Default transaksi harian adalah pengeluaran
  }

  function extractAmountFromIndonesian(text) {
    const lower = text.toLowerCase().replace(/rp\.?/g, '').trim();

    // 1. Cek pola angka eksplisit dengan satuan juta / jt / rb / ribu / k
    const jutaMatch = lower.match(/(\d+(?:[\.,]\d+)?)\s*(?:juta|jt)\b/);
    if (jutaMatch) {
      const num = parseFloat(jutaMatch[1].replace(',', '.'));
      if (!isNaN(num)) return Math.round(num * 1000000);
    }

    const ribuMatch = lower.match(/(\d+(?:[\.,]\d+)?)\s*(?:ribu|rb|k)\b/);
    if (ribuMatch) {
      const num = parseFloat(ribuMatch[1].replace(',', '.'));
      if (!isNaN(num)) return Math.round(num * 1000);
    }

    // 2. Cek kata bilangan gabungan
    if (lower.includes('satu setengah juta') || lower.includes('1 setengah juta')) return 1500000;
    if (lower.includes('dua setengah juta') || lower.includes('2 setengah juta')) return 2500000;
    if (lower.includes('tiga setengah juta') || lower.includes('3 setengah juta')) return 3500000;
    if (lower.includes('setengah juta')) return 500000;

    // 3. Cek kata jutaan
    const kataAngka = {
      'se': 1, 'satu': 1, 'dua': 2, 'tiga': 3, 'empat': 4, 'lima': 5,
      'enam': 6, 'tujuh': 7, 'delapan': 8, 'sembilan': 9, 'sepuluh': 10,
      'sebelas': 11, 'dua belas': 12, 'tiga belas': 13, 'empat belas': 14,
      'lima belas': 15, 'enam belas': 16, 'tujuh belas': 17, 'delapan belas': 18,
      'sembilan belas': 19, 'dua puluh': 20, 'tiga puluh': 30, 'empat puluh': 40,
      'lima puluh': 50, 'seratus': 100, 'seribu': 1000
    };

    const wordJutaMatch = lower.match(/(satu|dua|tiga|empat|lima|enam|tujuh|delapan|sembilan|sepuluh)\s+juta\b/);
    if (wordJutaMatch) {
      const mult = kataAngka[wordJutaMatch[1]] || 1;
      return mult * 1000000;
    }

    // 4. Cek kata ribuan ejaan
    if (lower.includes('ribu')) {
      const beforeRibu = lower.split('ribu')[0].trim();
      let ribuanVal = parseIndonesianWordsToNumber(beforeRibu);
      if (ribuanVal > 0) return ribuanVal * 1000;
    }

    // 5. Cek nominal angka biasa (contoh: "50000", "25.000", "100.000")
    const plainNumMatch = lower.match(/\b\d{1,3}(?:\.\d{3})+(?!\d)|\b\d{4,9}\b/);
    if (plainNumMatch) {
      const cleanNum = plainNumMatch[0].replace(/\./g, '');
      const num = parseInt(cleanNum, 10);
      if (!isNaN(num) && num > 0) return num;
    }

    return 0;
  }

  function parseIndonesianWordsToNumber(wordsStr) {
    const tokens = wordsStr.split(/\s+/);
    let total = 0;
    let current = 0;

    const map = {
      'nol': 0, 'satu': 1, 'se': 1, 'dua': 2, 'tiga': 3, 'empat': 4,
      'lima': 5, 'enam': 6, 'tujuh': 7, 'delapan': 8, 'sembilan': 9,
      'sepuluh': 10, 'sebelas': 11, 'seratus': 100, 'seribu': 1000
    };

    for (let i = 0; i < tokens.length; i++) {
      const w = tokens[i];
      if (w === 'belas') {
        current += 10;
      } else if (w === 'puluh') {
        current = (current === 0 ? 1 : current) * 10;
      } else if (w === 'ratus') {
        current = (current === 0 ? 1 : current) * 100;
      } else if (map[w] !== undefined) {
        current += map[w];
      } else if (/^\d+$/.test(w)) {
        current += parseInt(w, 10);
      }
    }
    total += current;
    return total;
  }

  function extractTransactionTitle(text, type) {
    let title = text;

    // Hapus nominal dari teks
    title = title.replace(/\brp\.?\s*\d+(?:[\.,]\d+)?\b/gi, '');
    title = title.replace(/\b\d+(?:[\.,]\d+)?\s*(?:juta|jt|ribu|rb|k)\b/gi, '');
    title = title.replace(/\b\d{1,3}(?:\.\d{3})+\b/g, '');
    title = title.replace(/\b\d{4,9}\b/g, '');

    // Hapus ejaan nominal umum
    title = title.replace(/\b(?:satu|dua|tiga|empat|lima|enam|tujuh|delapan|sembilan|sepuluh|sebelas|seratus|seribu|setengah)\s+(?:juta|ribu)\b/gi, '');
    title = title.replace(/\b(?:dua|tiga|empat|lima)\s+puluh\s+(?:lima\s+)?ribu\b/gi, '');
    title = title.replace(/\b(?:ribu|juta|rupiah)\b/gi, '');

    // Hapus kata perintah/awalan
    title = title.replace(/\b(?:tolong|catatkan|catat|tambahkan|tambah|masukkan|buatkan|buat)\b/gi, '');
    title = title.replace(/\b(?:sebesar|senilai|seharga|harga|sejumlah)\b/gi, '');
    title = title.replace(/\b(?:pengeluaran|pemasukan|pendapatan)\b/gi, '');

    // Rapikan spasi dan tanda baca
    title = title.replace(/[,\.!\?]/g, ' ').replace(/\s+/g, ' ').trim();

    if (!title) {
      title = type === 'income' ? 'Pendapatan Baru' : 'Pengeluaran Baru';
    } else {
      title = title.charAt(0).toUpperCase() + title.slice(1);
    }

    return title;
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
    if (notesInputSearch) {
      notesInputSearch.addEventListener('input', () => renderNotesList());
    }

    // Clear All Catatan
    if (notesBtnClearAll) {
      notesBtnClearAll.addEventListener('click', async () => {
        if (notes.length === 0) {
          showToast('Belum ada catatan!');
          return;
        }

        const confirmed = await showCustomConfirm({
          title: 'Hapus Semua Catatan?',
          desc: 'PERINGATAN: Seluruh riwayat catatan pribadi akan dihapus permanen!',
          confirmText: 'CLEAR CATATAN'
        });

        if (confirmed) {
          notes = [];
          saveNotes();
          renderNotesView();
          showToast('Semua Catatan Dibersihkan!');
        }
      });
    }

    // Clear All Pendapatan
    if (incomeBtnClearAll) {
      incomeBtnClearAll.addEventListener('click', async () => {
        const incomeList = transactions.filter(t => t.type === 'income');
        if (incomeList.length === 0) {
          showToast('Belum ada data pendapatan!');
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
          showToast('Belum ada data pengeluaran!');
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

    // Toggle single Note Done / Checklist listener
    document.addEventListener('click', (e) => {
      const checkBtn = e.target.closest('.note-check-btn');
      if (!checkBtn) return;

      const id = checkBtn.dataset.id;
      const targetNote = notes.find(n => n.id === id);
      if (!targetNote) return;

      targetNote.done = !targetNote.done;
      saveNotes();
      renderNotesView();
      showToast(targetNote.done ? 'Catatan Ditandai Selesai!' : 'Catatan Belum Selesai');
    });

    // Delete single Note listener
    document.addEventListener('click', async (e) => {
      const delNoteBtn = e.target.closest('.note-del-btn');
      if (!delNoteBtn) return;

      const id = delNoteBtn.dataset.id;
      const targetNote = notes.find(n => n.id === id);
      if (!targetNote) return;

      const confirmed = await showCustomConfirm({
        title: 'Hapus Catatan?',
        desc: `Apakah kamu yakin ingin menghapus catatan "${targetNote.title}"?`,
        confirmText: 'HAPUS NOW!'
      });

      if (confirmed) {
        notes = notes.filter(n => n.id !== id);
        saveNotes();
        renderNotesView();
        showToast('Catatan Dihapus!');
      }
    });

    // Generic Delete Listener for any transaction with .tx-del-btn

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
    renderNotesView();
  }

  // --- DASHBOARD YEAR & MONTH SELECTOR LOGIC ---
  function setupDashboardYearMonthNav() {
    if (chartPrevYear) {
      chartPrevYear.addEventListener('click', () => {
        dashYear--;
        updateYearMonthUI();
        renderDashboard();
      });
    }

    if (chartNextYear) {
      chartNextYear.addEventListener('click', () => {
        dashYear++;
        updateYearMonthUI();
        renderDashboard();
      });
    }

    if (dashMonthChips) {
      dashMonthChips.addEventListener('click', (e) => {
        const chip = e.target.closest('.month-chip');
        if (!chip) return;
        const val = chip.dataset.month;
        dashSelectedMonth = val === 'all' ? 'all' : parseInt(val, 10);
        updateMonthChipActiveState();
        renderDashboard();
      });
    }
  }

  function updateYearMonthUI() {
    if (chartYearDisplay) {
      chartYearDisplay.textContent = `Tahun ${dashYear}`;
    }
    if (dashChartPeriodTag) {
      dashChartPeriodTag.textContent = dashSelectedMonth === 'all' 
        ? `${dashYear}` 
        : `${monthNamesId[dashSelectedMonth].slice(0, 3)} ${dashYear}`;
    }
  }

  function updateMonthChipActiveState() {
    if (!dashMonthChips) return;
    dashMonthChips.querySelectorAll('.month-chip').forEach(c => {
      const val = c.dataset.month;
      if ((val === 'all' && dashSelectedMonth === 'all') || (val !== 'all' && parseInt(val, 10) === dashSelectedMonth)) {
        c.classList.add('active');
      } else {
        c.classList.remove('active');
      }
    });
  }

  // ==========================================================================
  // VIEW 1: DASHBOARD (GRAFIK 12 BULAN PENDAPATAN VS PENGELUARAN & CASHFLOW)
  // ==========================================================================
  function renderDashboard() {
    updateYearMonthUI();
    updateMonthChipActiveState();

    let periodFiltered;
    let periodTitle;

    if (dashPeriod === 'daily') {
      periodFiltered = filterByPeriod(transactions, 'daily');
      periodTitle = 'Saldo Bersih (Hari Ini)';
    } else if (dashPeriod === 'weekly') {
      periodFiltered = filterByPeriod(transactions, 'weekly');
      periodTitle = 'Saldo Bersih (7 Hari Terakhir)';
    } else if (dashSelectedMonth !== 'all') {
      // Specific month selected
      periodFiltered = transactions.filter(t => {
        const d = new Date(t.timestamp);
        return d.getFullYear() === dashYear && d.getMonth() === dashSelectedMonth;
      });
      periodTitle = `Saldo Bersih (${monthNamesId[dashSelectedMonth]} ${dashYear})`;
    } else {
      // Whole 12 months for dashYear
      periodFiltered = transactions.filter(t => {
        const d = new Date(t.timestamp);
        return d.getFullYear() === dashYear;
      });
      periodTitle = `Saldo Bersih (Tahun ${dashYear})`;
    }

    const incomeFiltered = periodFiltered.filter(t => t.type === 'income');
    const expenseFiltered = periodFiltered.filter(t => t.type === 'expense');

    const totalIncome = incomeFiltered.reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = expenseFiltered.reduce((sum, t) => sum + t.amount, 0);
    const netBalance = totalIncome - totalExpense;

    if (dashPeriodTitle) dashPeriodTitle.textContent = periodTitle;

    // 1. Net Balance Display
    if (netBalanceDisplay) {
      netBalanceDisplay.textContent = formatRupiah(netBalance);
      if (netBalance < 0) {
        netBalanceDisplay.style.color = '#BE123C';
      } else {
        netBalanceDisplay.style.color = '#0F0F0F';
      }
    }

    // 2. Dual Mini Hero Cards
    if (dashIncomeDisplay) dashIncomeDisplay.textContent = formatRupiah(totalIncome);
    if (dashIncomeCount) dashIncomeCount.textContent = `${incomeFiltered.length} Masuk`;

    if (dashExpenseDisplay) dashExpenseDisplay.textContent = formatRupiah(totalExpense);
    if (dashExpenseCount) dashExpenseCount.textContent = `${expenseFiltered.length} Keluar`;

    // 3. Ratio Progress Bar
    let expensePct = 0;
    let savingsPct = 100;

    if (totalIncome > 0) {
      expensePct = Math.min(Math.round((totalExpense / totalIncome) * 100), 100);
      savingsPct = Math.max(100 - expensePct, 0);
    } else if (totalExpense > 0) {
      expensePct = 100;
      savingsPct = 0;
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

    // 5. Render 12-Month Grouped Bar Chart (Jan - Des)
    render12MonthChart();

    // 6. Render Recent Combined Activity
    renderRecentActivity(periodFiltered);
  }

  // --- RENDER 12-MONTH GROUPED VISUAL BAR CHART ---
  function render12MonthChart() {
    if (!dashChartBars) return;
    dashChartBars.innerHTML = '';

    const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const monthlyIncome = Array(12).fill(0);
    const monthlyExpense = Array(12).fill(0);

    // Aggregate all transactions for dashYear
    transactions.forEach(tx => {
      const d = new Date(tx.timestamp);
      if (d.getFullYear() === dashYear) {
        const m = d.getMonth();
        if (tx.type === 'income') {
          monthlyIncome[m] += tx.amount;
        } else {
          monthlyExpense[m] += tx.amount;
        }
      }
    });

    const maxVal = Math.max(...monthlyIncome, ...monthlyExpense, 1);
    const currentCalMonth = new Date().getMonth();
    const currentCalYear = new Date().getFullYear();

    shortMonths.forEach((label, m) => {
      const inc = monthlyIncome[m];
      const exp = monthlyExpense[m];

      const incHeight = inc > 0 ? Math.max(Math.round((inc / maxVal) * 100), 8) : 4;
      const expHeight = exp > 0 ? Math.max(Math.round((exp / maxVal) * 100), 8) : 4;

      const isSelected = (dashSelectedMonth === m);
      const isCurrentMonth = (currentCalYear === dashYear && currentCalMonth === m);

      const col = document.createElement('div');
      col.className = `grouped-col ${isSelected ? 'active-month' : ''} ${isCurrentMonth ? 'current-calendar-month' : ''}`;
      col.title = `${monthNamesId[m]} ${dashYear}\nPendapatan: ${formatRupiah(inc)}\nPengeluaran: ${formatRupiah(exp)}`;
      col.innerHTML = `
        <div class="bar-pair">
          <div class="bar-single income-bar" style="height: ${incHeight}%;" title="Pendapatan: ${formatRupiah(inc)}"></div>
          <div class="bar-single expense-bar" style="height: ${expHeight}%;" title="Pengeluaran: ${formatRupiah(exp)}"></div>
        </div>
        <span class="bar-label" style="font-size:0.68rem; font-weight:800; ${isCurrentMonth ? 'color:#047857; text-decoration:underline;' : ''}">${label}</span>
      `;

      col.addEventListener('click', () => {
        if (dashSelectedMonth === m) {
          dashSelectedMonth = 'all';
        } else {
          dashSelectedMonth = m;
        }
        updateMonthChipActiveState();
        renderDashboard();
      });

      dashChartBars.appendChild(col);
    });

    // Auto scroll to active month or current calendar month
    setTimeout(() => {
      const activeCol = dashChartBars.querySelector('.active-month') || dashChartBars.querySelector('.current-calendar-month');
      if (activeCol) {
        activeCol.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }, 60);
  }

  // --- RECENT COMBINED ACTIVITY (DASHBOARD) ---
  function renderRecentActivity(filteredList) {
    if (!dashRecentList) return;
    dashRecentList.innerHTML = '';

    const sourceList = filteredList || transactions;
    const recent5 = sourceList.slice(0, 5);

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
            <span>${tx.displayDate}</span>
          </div>
        </div>
        <div class="tx-right">
          <div class="tx-amount ${isIncome ? 'tx-amount-income' : 'tx-amount-expense'}">
            ${isIncome ? '+' : '-'} ${formatRupiah(tx.amount)}
          </div>
          <button class="tx-del-btn" data-id="${tx.id}" title="Hapus">✕</button>
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
          Belum ada catatan pendapatan.<br>
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
            <span>${tx.displayDate}</span>
          </div>
        </div>
        <div class="tx-right">
          <div class="tx-amount tx-amount-income">+ ${formatRupiah(tx.amount)}</div>
          <button class="tx-del-btn" data-id="${tx.id}" title="Hapus">✕</button>
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
          Belum ada catatan pengeluaran.<br>
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
            <span>${tx.displayDate}</span>
          </div>
        </div>
        <div class="tx-right">
          <div class="tx-amount tx-amount-expense">- ${formatRupiah(tx.amount)}</div>
          <button class="tx-del-btn" data-id="${tx.id}" title="Hapus">✕</button>
        </div>
      `;
      expenseTxListContainer.appendChild(itemEl);
    });
  }

  // ==========================================================================
  // VIEW 4: CATATAN (INDEPENDENT NOTES & MEMO SYSTEM)
  // ==========================================================================
  function renderNotesView() {
    if (notesHeroCount) {
      notesHeroCount.textContent = `${notes.length} Catatan`;
    }
    renderNotesList();
  }

  function renderNotesList() {
    if (!notesListContainer) return;
    const query = notesInputSearch ? notesInputSearch.value.trim().toLowerCase() : '';

    sortNotesInPlace();

    const filtered = notes.filter(n => {
      return n.title.toLowerCase().includes(query);
    });

    notesListContainer.innerHTML = '';

    if (filtered.length === 0) {
      notesListContainer.innerHTML = `
        <div class="empty-state">
          Belum ada catatan tersimpan.<br>
          <span style="font-size:0.8rem; font-weight:normal;">Tulis catatan barumu lewat form di atas!</span>
        </div>
      `;
      return;
    }

    filtered.forEach(note => {
      const isDone = Boolean(note.done);
      const itemEl = document.createElement('div');
      itemEl.className = `note-item ${isDone ? 'is-done' : ''}`;
      itemEl.innerHTML = `
        <div class="note-header">
          <div style="flex:1; padding-right:8px;">
            <div class="note-title">${escapeHTML(note.title)}</div>
            <div style="display:flex; align-items:center; gap:6px; margin-top:4px; flex-wrap:wrap;">
              <div class="note-date-badge">
                ${note.displayDate}
              </div>
              ${isDone ? `<span class="note-done-badge">SELESAI</span>` : ''}
            </div>
          </div>
          <div class="note-actions">
            <button class="note-check-btn ${isDone ? 'checked' : ''}" data-id="${note.id}" title="${isDone ? 'Batal Selesai' : 'Tandai Selesai'}">
              ✓
            </button>
            <button class="tx-del-btn note-del-btn" data-id="${note.id}" title="Hapus Catatan">
              ✕
            </button>
          </div>
        </div>
      `;
      notesListContainer.appendChild(itemEl);
    });
  }

});
