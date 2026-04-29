/**
 * ui.js — All rendering logic, page views, charts, modals, and UI state
 */

const UI = {

  // ─── Theme ─────────────────────────────────────────────────────────────────

  applyTheme({ mode, scheme }) {
    const root = document.documentElement;
    root.setAttribute('data-theme', mode);
    root.setAttribute('data-scheme', scheme);
    Storage.saveTheme({ mode, scheme });
  },

  // ─── Toast Notifications ────────────────────────────────────────────────────

  showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
    toast.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ'}</span><span>${message}</span>`;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 350);
    }, duration);
  },

  // ─── Nav Bar ───────────────────────────────────────────────────────────────

  updateNavBar() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.page === App.currentPage);
    });
  },

  // ─── Page Router ───────────────────────────────────────────────────────────

  renderPage(page) {
    const main = document.getElementById('main-content');
    main.innerHTML = '';
    main.classList.remove('page-enter');
    void main.offsetWidth;
    main.classList.add('page-enter');

    const pages = {
      dashboard: this.renderDashboard,
      scan:      this.renderScan,
      log:       this.renderLog,
      progress:  this.renderProgress,
      settings:  this.renderSettings,
    };

    (pages[page] || pages.dashboard).call(this, main);
  },

  // ─── DASHBOARD ─────────────────────────────────────────────────────────────

  renderDashboard(container) {
    const profile = Storage.getProfile() || {};
    const goals   = Storage.getGoals()   || {};
    const dayLog  = Storage.getTodayLog();
    const streak  = Storage.getStreak();
    const totals  = dayLog.totals;

    const consumed  = totals.calories;
    const remaining = Math.max(0, (goals.calories || 0) - consumed);
    const burned    = 0; // Could extend with exercise log
    const pct = Math.min(100, goals.calories ? (consumed / goals.calories) * 100 : 0);

    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

    const weightLog = Storage.getWeightLog();
    const lastWeight = weightLog.length ? weightLog[weightLog.length - 1].weight : profile.weight;

    container.innerHTML = `
      <div class="page-dashboard">

        <!-- Header -->
        <div class="dashboard-header">
          <div class="greeting-block">
            <p class="greeting-text">${greeting},</p>
            <h1 class="greeting-name">${profile.name || 'Friend'} 👋</h1>
          </div>
          <div class="avatar-wrap" onclick="App.navigate('settings')">
            ${profile.pfp
              ? `<img src="${profile.pfp}" class="avatar" alt="Profile">`
              : `<div class="avatar avatar-initials">${(profile.name || '?')[0].toUpperCase()}</div>`}
            ${streak.current > 1 ? `<div class="streak-badge">${streak.current}🔥</div>` : ''}
          </div>
        </div>

        <!-- Weight Log Card -->
        <div class="card weight-log-card">
          <div class="card-row">
            <div>
              <p class="card-label">Today's weight</p>
              <p class="card-value">${lastWeight || '—'} <span class="card-unit">kg</span></p>
            </div>
            <button class="btn-icon" onclick="UI.showWeightDialog()">+ Log</button>
          </div>
        </div>

        <!-- Calorie Ring Card -->
        <div class="card calorie-card">
          <div class="calorie-ring-wrap">
            ${this.renderCalorieRing(consumed, goals.calories || 2000)}
            <div class="ring-center">
              <span class="ring-value">${consumed}</span>
              <span class="ring-label">eaten</span>
            </div>
          </div>
          <div class="calorie-stats">
            <div class="cal-stat">
              <span class="cal-stat-value">${goals.calories || '—'}</span>
              <span class="cal-stat-label">Goal</span>
            </div>
            <div class="cal-stat cal-stat-remaining ${remaining === 0 ? 'over' : ''}">
              <span class="cal-stat-value">${remaining}</span>
              <span class="cal-stat-label">Remaining</span>
            </div>
            <div class="cal-stat">
              <span class="cal-stat-value">${burned}</span>
              <span class="cal-stat-label">Burned</span>
            </div>
          </div>
        </div>

        <!-- Macros -->
        <div class="card">
          <h3 class="card-title">Macros</h3>
          <div class="macros-grid">
            ${this.renderMacroBar('Protein', totals.protein, goals.protein, '#4caf90', '🥩')}
            ${this.renderMacroBar('Carbs',   totals.carbs,   goals.carbs,   '#f59e0b', '🍚')}
            ${this.renderMacroBar('Fat',     totals.fat,     goals.fat,     '#ef6c6c', '🥑')}
          </div>
        </div>

        <!-- Today's Food Log Preview -->
        <div class="card">
          <div class="card-header-row">
            <h3 class="card-title">Today's log</h3>
            <button class="btn-text" onclick="App.navigate('log')">View all</button>
          </div>
          ${dayLog.entries.length === 0
            ? `<div class="empty-state">
                <span class="empty-icon">🍽️</span>
                <p>No food logged yet.</p>
                <button class="btn-primary btn-sm" onclick="App.navigate('scan')">Scan food</button>
               </div>`
            : dayLog.entries.slice(-3).reverse().map(e => this.renderFoodItem(e, true)).join('')
          }
        </div>

        <!-- Quick add FAB hint -->
        <div style="height: 5rem;"></div>
      </div>
    `;
  },

  renderCalorieRing(consumed, goal) {
    const r = 70, cx = 90, cy = 90;
    const circumference = 2 * Math.PI * r;
    const pct = Math.min(1, consumed / goal);
    const dash = pct * circumference;
    const over = consumed > goal;

    return `
      <svg class="calorie-ring" viewBox="0 0 180 180" width="180" height="180">
        <circle class="ring-track" cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke-width="14"/>
        <circle class="ring-fill ${over ? 'ring-over' : ''}" cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke-width="14"
          stroke-dasharray="${dash} ${circumference}"
          stroke-dashoffset="0"
          transform="rotate(-90 ${cx} ${cy})"
          style="transition: stroke-dasharray .8s cubic-bezier(.4,0,.2,1)"/>
      </svg>
    `;
  },

  renderMacroBar(label, consumed, goal, color, icon) {
    const pct = Math.min(100, goal ? (consumed / goal) * 100 : 0);
    return `
      <div class="macro-bar-wrap">
        <div class="macro-bar-header">
          <span>${icon} ${label}</span>
          <span class="macro-nums">${consumed}g <span class="macro-goal">/ ${goal || '?'}g</span></span>
        </div>
        <div class="macro-track">
          <div class="macro-fill" style="width:${pct}%;background:${color}"></div>
        </div>
      </div>
    `;
  },

  renderFoodItem(entry, compact = false) {
    return `
      <div class="food-item" data-id="${entry.id}">
        ${entry.image ? `<img src="${entry.image}" class="food-thumb" alt="${entry.name}">` : `<div class="food-thumb food-thumb-placeholder">${this.foodEmoji(entry.name)}</div>`}
        <div class="food-info">
          <p class="food-name">${entry.name}</p>
          <p class="food-meta">${entry.servingSize || '1 serving'} · ${entry.calories} kcal</p>
          ${!compact ? `<div class="food-macros-mini">P ${entry.protein}g · F ${entry.fat}g · C ${entry.carbs}g</div>` : ''}
        </div>
        <div class="food-actions">
          <span class="food-kcal">${entry.calories}</span>
          ${!compact ? `
            <button class="btn-icon-sm" onclick="UI.editFoodEntry('${entry.id}')" title="Edit">✏️</button>
            <button class="btn-icon-sm btn-danger" onclick="UI.deleteFoodEntry('${entry.id}')" title="Delete">🗑️</button>
          ` : ''}
        </div>
      </div>
    `;
  },

  foodEmoji(name = '') {
    const n = name.toLowerCase();
    if (n.includes('chicken') || n.includes('meat'))  return '🍗';
    if (n.includes('rice') || n.includes('grain'))    return '🍚';
    if (n.includes('salad') || n.includes('vegetable'))return '🥗';
    if (n.includes('fruit') || n.includes('apple'))   return '🍎';
    if (n.includes('egg'))                            return '🥚';
    if (n.includes('milk') || n.includes('dairy'))    return '🥛';
    if (n.includes('bread') || n.includes('toast'))   return '🍞';
    if (n.includes('fish') || n.includes('salmon'))   return '🐟';
    if (n.includes('pizza'))                          return '🍕';
    if (n.includes('burger') || n.includes('sandwich'))return '🍔';
    return '🍽️';
  },

  // ─── SCAN PAGE ─────────────────────────────────────────────────────────────

  renderScan(container) {
    const settings = Storage.getApiSettings();
    const hasKey = settings.apiKey;

    container.innerHTML = `
      <div class="page-scan">
        <div class="page-header">
          <h2 class="page-title">Scan Food</h2>
          <p class="page-subtitle">Upload a photo or enter food manually</p>
        </div>

        ${!hasKey ? `
          <div class="alert alert-warning">
            <span>⚠️ No API key set. </span>
            <button class="btn-text" onclick="App.navigate('settings')">Add in Settings →</button>
          </div>
        ` : ''}

        <!-- Image Scanner -->
        <div class="card">
          <h3 class="card-title">📷 Image Scan</h3>
          <div class="drop-zone" id="drop-zone" onclick="document.getElementById('food-image-input').click()">
            <div class="drop-content" id="drop-content">
              <span class="drop-icon">📸</span>
              <p>Tap to upload or take a photo</p>
              <small>Supports JPG, PNG, WEBP</small>
            </div>
          </div>
          <input type="file" id="food-image-input" accept="image/*" capture="environment" style="display:none" onchange="UI.handleScanImage(this)">
          <button class="btn-primary btn-full" id="scan-btn" style="margin-top:1rem;display:none" onclick="UI.performScan()">
            🔍 Analyze with AI
          </button>
        </div>

        <!-- Manual Entry -->
        <div class="card">
          <h3 class="card-title">✏️ Manual Entry</h3>
          <div id="manual-form">
            ${this.renderManualForm()}
          </div>
        </div>

        <!-- Scan Result (hidden until scan) -->
        <div id="scan-result-card" style="display:none">
          <!-- Filled by JS after scan -->
        </div>

        <div style="height:5rem"></div>
      </div>
    `;

    this.setupDropZone();
  },

  renderManualForm(prefill = {}) {
    return `
      <div class="form-group">
        <label class="form-label">Food name *</label>
        <input class="form-input" id="manual-name" type="text" placeholder="e.g. Grilled Chicken Breast" value="${prefill.name || ''}">
      </div>
      <div class="form-group">
        <label class="form-label">Serving size</label>
        <input class="form-input" id="manual-serving" type="text" placeholder="e.g. 200g, 1 cup" value="${prefill.servingSize || ''}">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Calories *</label>
          <input class="form-input" id="manual-calories" type="number" min="0" placeholder="350" value="${prefill.calories || ''}">
        </div>
        <div class="form-group">
          <label class="form-label">Protein (g)</label>
          <input class="form-input" id="manual-protein" type="number" min="0" placeholder="30" value="${prefill.protein || ''}">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Fat (g)</label>
          <input class="form-input" id="manual-fat" type="number" min="0" placeholder="10" value="${prefill.fat || ''}">
        </div>
        <div class="form-group">
          <label class="form-label">Carbs (g)</label>
          <input class="form-input" id="manual-carbs" type="number" min="0" placeholder="30" value="${prefill.carbs || ''}">
        </div>
      </div>
      <button class="btn-primary btn-full" onclick="UI.addManualFood()">+ Add to Log</button>
    `;
  },

  setupDropZone() {
    const dz = document.getElementById('drop-zone');
    if (!dz) return;
    dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('dragover'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
    dz.addEventListener('drop', e => {
      e.preventDefault();
      dz.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        document.getElementById('food-image-input').files = e.dataTransfer.files;
        UI.handleScanImage({ files: e.dataTransfer.files });
      }
    });
  },

  _scanFile: null,

  handleScanImage(input) {
    const file = input.files?.[0];
    if (!file) return;
    this._scanFile = file;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dc = document.getElementById('drop-content');
      if (dc) dc.innerHTML = `
        <img src="${e.target.result}" style="max-height:200px;max-width:100%;border-radius:12px;object-fit:contain" alt="Food preview">
        <p style="margin-top:.5rem;color:var(--md-on-surface-variant)">Image ready</p>
      `;
      const btn = document.getElementById('scan-btn');
      if (btn) btn.style.display = 'block';
    };
    reader.readAsDataURL(file);
  },

  async performScan() {
    if (!this._scanFile) return;
    const btn = document.getElementById('scan-btn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Analyzing…'; }

    try {
      const result = await FoodAPI.scanFood(this._scanFile);
      App.scanResult = result;

      // Get image preview
      const reader = new FileReader();
      reader.onload = (e) => {
        App.scanResult.image = e.target.result;
        this.showScanResult(result);
      };
      reader.readAsDataURL(this._scanFile);
    } catch (err) {
      this.showToast(err.message || 'Scan failed. Check your API key.', 'error', 5000);
      if (btn) { btn.disabled = false; btn.textContent = '🔍 Analyze with AI'; }
    }
  },

  showScanResult(result) {
    const card = document.getElementById('scan-result-card');
    if (!card) return;
    card.style.display = 'block';
    card.innerHTML = `
      <div class="card scan-result-card">
        <div class="scan-result-header">
          ${result.image ? `<img src="${result.image}" class="scan-result-img" alt="Scanned food">` : ''}
          <div>
            <h3 class="card-title">Scan Result</h3>
            <span class="confidence-badge confidence-${result.confidence}">${result.confidence} confidence</span>
          </div>
        </div>
        <p class="scan-note">${result.notes || ''}</p>
        <p style="font-size:.8rem;color:var(--md-on-surface-variant);margin-bottom:.75rem">Edit values if needed before adding</p>
        <div class="form-group">
          <label class="form-label">Food name</label>
          <input class="form-input" id="sr-name" value="${result.name}">
        </div>
        <div class="form-group">
          <label class="form-label">Serving size</label>
          <input class="form-input" id="sr-serving" value="${result.servingSize}">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Calories</label>
            <input class="form-input" id="sr-calories" type="number" value="${result.calories}">
          </div>
          <div class="form-group">
            <label class="form-label">Protein (g)</label>
            <input class="form-input" id="sr-protein" type="number" value="${result.protein}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Fat (g)</label>
            <input class="form-input" id="sr-fat" type="number" value="${result.fat}">
          </div>
          <div class="form-group">
            <label class="form-label">Carbs (g)</label>
            <input class="form-input" id="sr-carbs" type="number" value="${result.carbs}">
          </div>
        </div>
        <button class="btn-primary btn-full" onclick="UI.confirmScanResult()">✓ Add to Log</button>
      </div>
    `;
    card.scrollIntoView({ behavior: 'smooth' });
  },

  confirmScanResult() {
    const entry = {
      name:        document.getElementById('sr-name')?.value || 'Unknown',
      servingSize: document.getElementById('sr-serving')?.value || '1 serving',
      calories:    Number(document.getElementById('sr-calories')?.value) || 0,
      protein:     Number(document.getElementById('sr-protein')?.value)  || 0,
      fat:         Number(document.getElementById('sr-fat')?.value)      || 0,
      carbs:       Number(document.getElementById('sr-carbs')?.value)    || 0,
      image:       App.scanResult?.image || null,
    };
    Storage.addFoodEntry(entry);
    this.showToast(`${entry.name} added to log ✓`, 'success');
    App.scanResult = null;
    this._scanFile = null;
    App.navigate('dashboard');
  },

  addManualFood(prefill) {
    const name = document.getElementById('manual-name')?.value?.trim();
    if (!name) return this.showToast('Please enter a food name', 'error');
    const calories = Number(document.getElementById('manual-calories')?.value);
    if (!calories) return this.showToast('Please enter calories', 'error');

    const entry = {
      name,
      servingSize: document.getElementById('manual-serving')?.value || '1 serving',
      calories,
      protein: Number(document.getElementById('manual-protein')?.value) || 0,
      fat:     Number(document.getElementById('manual-fat')?.value)     || 0,
      carbs:   Number(document.getElementById('manual-carbs')?.value)   || 0,
    };

    if (App.editingEntryId) {
      Storage.updateFoodEntry(App.editingEntryId, entry);
      App.editingEntryId = null;
      this.showToast('Entry updated ✓', 'success');
    } else {
      Storage.addFoodEntry(entry);
      this.showToast(`${name} added to log ✓`, 'success');
    }
    App.navigate('dashboard');
  },

  // ─── LOG PAGE ──────────────────────────────────────────────────────────────

  renderLog(container) {
    const dayLog = Storage.getTodayLog();
    const goals  = Storage.getGoals() || {};

    container.innerHTML = `
      <div class="page-log">
        <div class="page-header">
          <h2 class="page-title">Today's Log</h2>
          <p class="page-subtitle">${new Date().toLocaleDateString('en-US', { weekday:'long', month:'short', day:'numeric' })}</p>
        </div>

        <!-- Macro Summary -->
        <div class="card">
          <div class="macro-summary-row">
            ${this.renderMacroCircle('Cal', dayLog.totals.calories, goals.calories, 'var(--md-primary)')}
            ${this.renderMacroCircle('Pro', dayLog.totals.protein,  goals.protein,  '#4caf90')}
            ${this.renderMacroCircle('Fat', dayLog.totals.fat,      goals.fat,      '#ef6c6c')}
            ${this.renderMacroCircle('Carb', dayLog.totals.carbs,   goals.carbs,    '#f59e0b')}
          </div>
        </div>

        <!-- Food Entries -->
        <div class="card">
          <div class="card-header-row">
            <h3 class="card-title">Entries (${dayLog.entries.length})</h3>
            <button class="btn-text" onclick="App.navigate('scan')">+ Add</button>
          </div>
          ${dayLog.entries.length === 0
            ? `<div class="empty-state"><span class="empty-icon">📭</span><p>No entries yet today.</p></div>`
            : dayLog.entries.slice().reverse().map(e => this.renderFoodItem(e, false)).join('')
          }
        </div>
        <div style="height:5rem"></div>
      </div>
    `;
  },

  renderMacroCircle(label, value, goal, color) {
    const r = 28, circumference = 2 * Math.PI * r;
    const pct = Math.min(1, goal ? value / goal : 0);
    const dash = pct * circumference;
    return `
      <div class="macro-circle-wrap">
        <svg viewBox="0 0 72 72" width="72" height="72">
          <circle class="ring-track" cx="36" cy="36" r="${r}" fill="none" stroke-width="7"/>
          <circle cx="36" cy="36" r="${r}" fill="none" stroke-width="7"
            stroke="${color}" stroke-linecap="round"
            stroke-dasharray="${dash} ${circumference}"
            transform="rotate(-90 36 36)"
            style="transition:stroke-dasharray .6s ease"/>
        </svg>
        <div class="macro-circle-center">
          <span class="macro-circle-val">${value}</span>
        </div>
        <p class="macro-circle-label">${label}</p>
        <p class="macro-circle-goal">/ ${goal || '?'}</p>
      </div>
    `;
  },

  editFoodEntry(id) {
    const dayLog = Storage.getTodayLog();
    const entry  = dayLog.entries.find(e => e.id === id);
    if (!entry) return;

    App.editingEntryId = id;
    App.navigate('scan');

    // After page render, pre-fill the manual form
    setTimeout(() => {
      const form = document.getElementById('manual-form');
      if (form) {
        form.innerHTML = this.renderManualForm(entry);
        form.scrollIntoView({ behavior: 'smooth' });
        const btn = form.querySelector('button');
        if (btn) btn.textContent = '✓ Update Entry';
      }
    }, 100);
  },

  deleteFoodEntry(id) {
    if (!confirm('Delete this food entry?')) return;
    Storage.deleteFoodEntry(id);
    this.showToast('Entry deleted', 'info');
    App.navigate('log');
  },

  // ─── PROGRESS PAGE ─────────────────────────────────────────────────────────

  renderProgress(container) {
    const weeklyLogs = Storage.getWeeklyLogs();
    const goals      = Storage.getGoals() || {};
    const streak     = Storage.getStreak();
    const weightLog  = Storage.getWeightLog();
    const profile    = Storage.getProfile() || {};

    const days = weeklyLogs.map(l => {
      const d = new Date(l.date + 'T00:00:00');
      return d.toLocaleDateString('en-US', { weekday: 'short' });
    });
    const calories = weeklyLogs.map(l => l.totals.calories);
    const maxCal   = Math.max(...calories, goals.calories || 2000, 100);

    // Weight chart data
    const recentWeight = weightLog.slice(-14);

    container.innerHTML = `
      <div class="page-progress">
        <div class="page-header">
          <h2 class="page-title">Progress</h2>
        </div>

        <!-- Streak -->
        <div class="card streak-card">
          <div class="streak-row">
            <div>
              <p class="streak-label">Current streak</p>
              <p class="streak-value">${streak.current} 🔥 days</p>
            </div>
            <div>
              <p class="streak-label">Longest streak</p>
              <p class="streak-value">${streak.longest} days</p>
            </div>
          </div>
        </div>

        <!-- Weekly Calories Chart -->
        <div class="card">
          <h3 class="card-title">Weekly Calories</h3>
          <div class="chart-wrap">
            <svg id="weekly-chart" viewBox="0 0 320 160" class="bar-chart">
              ${this.renderBarChart(days, calories, maxCal, goals.calories)}
            </svg>
          </div>
          <div class="chart-legend">
            <span class="legend-dot" style="background:var(--md-primary)"></span> Calories eaten
            <span class="legend-dot legend-dash"></span> Goal
          </div>
        </div>

        <!-- Weekly Summary Stats -->
        <div class="card">
          <h3 class="card-title">This Week</h3>
          <div class="stats-row">
            ${this.renderStatBox('Total cal', calories.reduce((a,b)=>a+b,0).toLocaleString(), 'kcal')}
            ${this.renderStatBox('Avg daily', Math.round(calories.reduce((a,b)=>a+b,0) / 7).toLocaleString(), 'kcal')}
            ${this.renderStatBox('Days logged', calories.filter(c=>c>0).length, 'days')}
          </div>
        </div>

        <!-- Weight Chart -->
        ${recentWeight.length >= 2 ? `
          <div class="card">
            <h3 class="card-title">Weight History</h3>
            <div class="chart-wrap">
              <svg viewBox="0 0 320 140" class="line-chart">
                ${this.renderLineChart(recentWeight)}
              </svg>
            </div>
            <div class="weight-range">
              <span>Low: ${Math.min(...recentWeight.map(e=>e.weight))}kg</span>
              <span>High: ${Math.max(...recentWeight.map(e=>e.weight))}kg</span>
            </div>
          </div>
        ` : `
          <div class="card">
            <h3 class="card-title">Weight History</h3>
            <div class="empty-state"><span class="empty-icon">📊</span><p>Log your weight for at least 2 days to see a chart.</p></div>
          </div>
        `}

        <!-- BMI -->
        ${profile.weight && profile.height ? (() => {
          const bmi = Nutrition.calcBMI(profile.weight, profile.height);
          const cat = Nutrition.getBMICategory(bmi);
          return `
            <div class="card">
              <h3 class="card-title">BMI</h3>
              <div class="bmi-display">
                <span class="bmi-value" style="color:${cat.color}">${bmi}</span>
                <span class="bmi-category" style="color:${cat.color}">${cat.label}</span>
              </div>
              <div class="bmi-scale">
                <div class="bmi-segment" style="background:#60a5fa">Under<br><small>&lt;18.5</small></div>
                <div class="bmi-segment" style="background:#4ade80">Normal<br><small>18.5–25</small></div>
                <div class="bmi-segment" style="background:#fb923c">Over<br><small>25–30</small></div>
                <div class="bmi-segment" style="background:#f87171">Obese<br><small>&gt;30</small></div>
              </div>
            </div>
          `;
        })() : ''}

        <div style="height:5rem"></div>
      </div>
    `;
  },

  renderBarChart(labels, values, maxVal, goalLine) {
    const W = 320, H = 140, padL = 8, padB = 20, padT = 10, padR = 8;
    const chartW = W - padL - padR;
    const chartH = H - padB - padT;
    const barW   = (chartW / labels.length) * 0.6;
    const gap    = (chartW / labels.length);

    let bars = '';
    labels.forEach((lbl, i) => {
      const x  = padL + i * gap + gap * 0.2;
      const barH = values[i] ? (values[i] / maxVal) * chartH : 2;
      const y  = padT + chartH - barH;
      const isToday = i === labels.length - 1;
      bars += `
        <rect x="${x}" y="${y}" width="${barW}" height="${barH}" rx="5"
          fill="${isToday ? 'var(--md-primary)' : 'var(--md-primary-container)'}" opacity="${values[i] ? 1 : 0.3}"/>
        <text x="${x + barW/2}" y="${H - 5}" text-anchor="middle" font-size="9" fill="var(--md-on-surface-variant)">${lbl}</text>
      `;
    });

    // Goal line
    let goalSvg = '';
    if (goalLine) {
      const gy = padT + chartH - (goalLine / maxVal) * chartH;
      goalSvg = `<line x1="${padL}" y1="${gy}" x2="${W - padR}" y2="${gy}" stroke="var(--md-error)" stroke-width="1.5" stroke-dasharray="4 3" opacity="0.7"/>`;
    }

    return bars + goalSvg;
  },

  renderLineChart(weightEntries) {
    const W = 320, H = 120, padL = 30, padB = 20, padT = 10, padR = 10;
    const chartW = W - padL - padR;
    const chartH = H - padB - padT;

    const weights = weightEntries.map(e => e.weight);
    const minW = Math.min(...weights) - 1;
    const maxW = Math.max(...weights) + 1;
    const range = maxW - minW || 1;

    const points = weightEntries.map((e, i) => {
      const x = padL + (i / (weightEntries.length - 1)) * chartW;
      const y = padT + chartH - ((e.weight - minW) / range) * chartH;
      return `${x},${y}`;
    });

    const dotsSvg = weightEntries.map((e, i) => {
      const [x, y] = points[i].split(',');
      return `<circle cx="${x}" cy="${y}" r="3" fill="var(--md-primary)"/>`;
    }).join('');

    // Y axis labels
    const yLabels = `
      <text x="${padL - 4}" y="${padT + 4}"         text-anchor="end" font-size="9" fill="var(--md-on-surface-variant)">${maxW.toFixed(1)}</text>
      <text x="${padL - 4}" y="${padT + chartH + 4}" text-anchor="end" font-size="9" fill="var(--md-on-surface-variant)">${minW.toFixed(1)}</text>
    `;

    return `
      <polyline points="${points.join(' ')}" fill="none" stroke="var(--md-primary)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
      ${dotsSvg}
      ${yLabels}
    `;
  },

  renderStatBox(label, value, unit) {
    return `
      <div class="stat-box">
        <span class="stat-box-value">${value}</span>
        <span class="stat-box-unit">${unit}</span>
        <span class="stat-box-label">${label}</span>
      </div>
    `;
  },

  // ─── SETTINGS PAGE ─────────────────────────────────────────────────────────

  renderSettings(container) {
    const profile  = Storage.getProfile()    || {};
    const api      = Storage.getApiSettings();
    const theme    = Storage.getTheme();
    const goals    = Storage.getGoals()      || {};

    container.innerHTML = `
      <div class="page-settings">
        <div class="page-header">
          <h2 class="page-title">Settings</h2>
        </div>

        <!-- Profile Section -->
        <div class="card settings-card">
          <h3 class="card-title">👤 Profile</h3>

          <div class="pfp-upload-area">
            <div class="pfp-preview" id="settings-pfp-preview" onclick="document.getElementById('settings-pfp-input').click()">
              ${profile.pfp
                ? `<img src="${profile.pfp}" alt="Profile" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
                : `<div class="avatar-initials">${(profile.name || '?')[0].toUpperCase()}</div>`
              }
            </div>
            <input type="file" id="settings-pfp-input" accept="image/*" style="display:none" onchange="UI.updateProfilePfp(this)">
          </div>

          <div class="form-group">
            <label class="form-label">Name</label>
            <input class="form-input" id="s-name" value="${profile.name || ''}">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Age</label>
              <input class="form-input" id="s-age" type="number" value="${profile.age || ''}">
            </div>
            <div class="form-group">
              <label class="form-label">Sex</label>
              <select class="form-input" id="s-sex">
                <option value="male"   ${profile.sex === 'male'   ? 'selected' : ''}>Male</option>
                <option value="female" ${profile.sex === 'female' ? 'selected' : ''}>Female</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Height (cm)</label>
              <input class="form-input" id="s-height" type="number" value="${profile.height || ''}">
            </div>
            <div class="form-group">
              <label class="form-label">Weight (kg)</label>
              <input class="form-input" id="s-weight" type="number" step="0.1" value="${profile.weight || ''}">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Goal</label>
            <select class="form-input" id="s-goal">
              <option value="lose"     ${profile.goal === 'lose'     ? 'selected' : ''}>Lose weight</option>
              <option value="maintain" ${profile.goal === 'maintain' ? 'selected' : ''}>Maintain weight</option>
              <option value="gain"     ${profile.goal === 'gain'     ? 'selected' : ''}>Gain weight</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Activity level</label>
            <select class="form-input" id="s-activity">
              <option value="sedentary" ${profile.activity === 'sedentary' ? 'selected' : ''}>Sedentary</option>
              <option value="light"     ${profile.activity === 'light'     ? 'selected' : ''}>Lightly active</option>
              <option value="moderate"  ${profile.activity === 'moderate'  ? 'selected' : ''}>Moderately active</option>
              <option value="active"    ${profile.activity === 'active'    ? 'selected' : ''}>Very active</option>
            </select>
          </div>
          <button class="btn-primary btn-full" onclick="UI.saveProfileSettings()">Save Profile</button>
        </div>

        <!-- Appearance -->
        <div class="card settings-card">
          <h3 class="card-title">🎨 Appearance</h3>
          <div class="form-group">
            <label class="form-label">Color scheme</label>
            <div class="theme-picker">
              ${['green','blue','purple','orange','red'].map(s => `
                <button class="theme-dot scheme-${s} ${theme.scheme === s ? 'active' : ''}"
                  onclick="UI.applyTheme({mode:'${theme.mode}',scheme:'${s}'});document.querySelectorAll('.theme-dot').forEach(b=>b.classList.remove('active'));this.classList.add('active')"
                  title="${s}"></button>
              `).join('')}
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Mode</label>
            <div style="display:flex;gap:.5rem">
              <button class="btn-outline flex-1 ${theme.mode === 'light' ? 'active' : ''}" onclick="UI.applyTheme({mode:'light',scheme:'${theme.scheme}'})">☀️ Light</button>
              <button class="btn-outline flex-1 ${theme.mode === 'dark' ? 'active' : ''}" onclick="UI.applyTheme({mode:'dark',scheme:'${theme.scheme}'})">🌙 Dark</button>
            </div>
          </div>
        </div>

        <!-- API Settings -->
        <div class="card settings-card">
          <h3 class="card-title">🔑 AI API Settings</h3>
          <p class="card-subtitle">Keys stored locally only, never sent to our servers</p>

          <div class="form-group">
            <label class="form-label">Provider</label>
            <select class="form-input" id="s-provider" onchange="UI.toggleCustomEndpoint()">
              <option value="openai"  ${api.provider === 'openai'  ? 'selected' : ''}>OpenAI (GPT-4o)</option>
              <option value="gemini"  ${api.provider === 'gemini'  ? 'selected' : ''}>Google Gemini 2.0 Flash</option>
              <option value="custom"  ${api.provider === 'custom'  ? 'selected' : ''}>Custom endpoint</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">API Key</label>
            <input class="form-input" id="s-apikey" type="password" placeholder="sk-… or AIza…" value="${api.apiKey || ''}">
          </div>
          <div class="form-group" id="custom-endpoint-group" style="display:${api.provider === 'custom' ? 'block' : 'none'}">
            <label class="form-label">Custom endpoint URL</label>
            <input class="form-input" id="s-endpoint" type="url" placeholder="https://openrouter.ai/api/v1/chat/completions" value="${api.customEndpoint || ''}">
            <label class="form-label" style="margin-top:10px">Model name</label>
            <input class="form-input" id="s-model" type="text" placeholder="e.g. openai/gpt-4o, meta-llama/llama-4-maverick" value="${api.customModel || 'openai/gpt-4o'}">
            <p style="font-size:.75rem;color:var(--md-on-surface-variant);margin-top:4px">Compatible with OpenRouter, Together AI, Groq, Ollama, and any OpenAI-format API.</p>
          </div>
          <button class="btn-primary btn-full" onclick="UI.saveApiSettings()">Save API Settings</button>
        </div>

        <!-- Nutrition Goals (manual override) -->
        <div class="card settings-card">
          <h3 class="card-title">🎯 Nutrition Goals</h3>
          <p class="card-subtitle">Auto-calculated from your profile. Override if needed.</p>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Calories</label>
              <input class="form-input" id="s-gcal" type="number" value="${goals.calories || ''}">
            </div>
            <div class="form-group">
              <label class="form-label">Protein (g)</label>
              <input class="form-input" id="s-gpro" type="number" value="${goals.protein || ''}">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Fat (g)</label>
              <input class="form-input" id="s-gfat" type="number" value="${goals.fat || ''}">
            </div>
            <div class="form-group">
              <label class="form-label">Carbs (g)</label>
              <input class="form-input" id="s-gcar" type="number" value="${goals.carbs || ''}">
            </div>
          </div>
          <button class="btn-outline btn-full" onclick="UI.saveGoalsOverride()">Save Goals</button>
          <button class="btn-text btn-full" onclick="UI.recalcGoals()">↩ Recalculate from profile</button>
        </div>

        <!-- Danger Zone -->
        <div class="card settings-card danger-card">
          <h3 class="card-title">⚠️ Data</h3>
          <button class="btn-outline btn-danger btn-full" onclick="UI.resetToday()">Reset Today's Log</button>
          <button class="btn-outline btn-danger btn-full" style="margin-top:.5rem" onclick="UI.resetAll()">Reset Entire App</button>
        </div>

        <div style="height:5rem"></div>
      </div>
    `;
  },

  toggleCustomEndpoint() {
    const provider = document.getElementById('s-provider')?.value;
    const group = document.getElementById('custom-endpoint-group');
    if (group) group.style.display = provider === 'custom' ? 'block' : 'none';
  },

  updateProfilePfp(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = document.getElementById('settings-pfp-preview');
      if (preview) preview.innerHTML = `<img src="${e.target.result}" alt="Profile" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
      const profile = Storage.getProfile() || {};
      profile.pfp = e.target.result;
      Storage.saveProfile(profile);
    };
    reader.readAsDataURL(file);
  },

  saveProfileSettings() {
    const profile = Storage.getProfile() || {};
    const updated = {
      ...profile,
      name:     document.getElementById('s-name')?.value?.trim()     || profile.name,
      age:      Number(document.getElementById('s-age')?.value)       || profile.age,
      sex:      document.getElementById('s-sex')?.value               || profile.sex,
      height:   Number(document.getElementById('s-height')?.value)    || profile.height,
      weight:   Number(document.getElementById('s-weight')?.value)    || profile.weight,
      goal:     document.getElementById('s-goal')?.value              || profile.goal,
      activity: document.getElementById('s-activity')?.value          || profile.activity,
    };
    Storage.saveProfile(updated);

    // Recalculate goals
    const goals = Nutrition.calcGoals(updated);
    Storage.saveGoals(goals);

    this.showToast('Profile saved & goals recalculated ✓', 'success');
    App.navigate('settings');
  },

  saveApiSettings() {
    const settings = {
      provider:       document.getElementById('s-provider')?.value  || 'openai',
      apiKey:         document.getElementById('s-apikey')?.value    || '',
      customEndpoint: document.getElementById('s-endpoint')?.value  || '',
      customModel:    document.getElementById('s-model')?.value     || 'openai/gpt-4o',
    };
    Storage.saveApiSettings(settings);
    this.showToast('API settings saved ✓', 'success');
  },

  saveGoalsOverride() {
    const goals = {
      calories: Number(document.getElementById('s-gcal')?.value) || 0,
      protein:  Number(document.getElementById('s-gpro')?.value) || 0,
      fat:      Number(document.getElementById('s-gfat')?.value) || 0,
      carbs:    Number(document.getElementById('s-gcar')?.value) || 0,
    };
    Storage.saveGoals(goals);
    this.showToast('Goals saved ✓', 'success');
  },

  recalcGoals() {
    const profile = Storage.getProfile();
    if (!profile) return this.showToast('No profile found', 'error');
    const goals = Nutrition.calcGoals(profile);
    Storage.saveGoals(goals);
    this.showToast('Goals recalculated from profile ✓', 'success');
    App.navigate('settings');
  },

  resetToday() {
    if (!confirm('Reset today\'s food log? This cannot be undone.')) return;
    Storage.resetTodayLog();
    this.showToast('Today\'s log cleared', 'info');
    App.navigate('dashboard');
  },

  resetAll() {
    if (!confirm('⚠️ This will delete ALL your data and reset the app. Are you sure?')) return;
    if (!confirm('Last chance — are you really sure?')) return;
    Storage.resetAll();
    location.reload();
  },

  // ─── Weight Dialog ─────────────────────────────────────────────────────────

  showWeightDialog() {
    const existing = document.getElementById('weight-modal');
    if (existing) existing.remove();

    const weightLog = Storage.getWeightLog();
    const profile   = Storage.getProfile() || {};
    const lastWeight = weightLog.length ? weightLog[weightLog.length - 1].weight : profile.weight || '';

    const modal = document.createElement('div');
    modal.id = 'weight-modal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-card">
        <h3 class="modal-title">Log Today's Weight</h3>
        <div class="form-group">
          <label class="form-label">Weight (kg)</label>
          <input class="form-input" id="weight-input" type="number" step="0.1" min="20" max="400" value="${lastWeight}" placeholder="70.0">
        </div>
        <div class="modal-actions">
          <button class="btn-outline" onclick="document.getElementById('weight-modal').remove()">Cancel</button>
          <button class="btn-primary" onclick="UI.saveWeight()">Save</button>
        </div>
      </div>
    `;
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    document.body.appendChild(modal);
    setTimeout(() => document.getElementById('weight-input')?.focus(), 50);
  },

  saveWeight() {
    const val = document.getElementById('weight-input')?.value;
    if (!val || val < 20 || val > 400) return this.showToast('Enter a valid weight', 'error');
    Storage.addWeightEntry(Number(val));
    document.getElementById('weight-modal')?.remove();
    this.showToast(`Weight logged: ${val} kg ✓`, 'success');
    App.navigate('dashboard');
  },
};
