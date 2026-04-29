/**
 * main.js — Core application logic
 * Handles navigation, nutrition calculations, setup wizard, and app state
 */

// ─── Nutrition Math ────────────────────────────────────────────────────────────

const Nutrition = {
  /**
   * Mifflin-St Jeor BMR
   * Male:   10*w + 6.25*h - 5*a + 5
   * Female: 10*w + 6.25*h - 5*a - 161
   */
  calcBMR(profile) {
    const { weight, height, age, sex } = profile;
    const base = 10 * weight + 6.25 * height - 5 * age;
    return sex === 'female' ? base - 161 : base + 5;
  },

  ACTIVITY_MULTIPLIERS: {
    sedentary:   1.2,
    light:       1.375,
    moderate:    1.55,
    active:      1.725,
  },

  GOAL_ADJUSTMENTS: {
    lose:     -400,
    gain:     +400,
    maintain:    0,
  },

  calcGoals(profile) {
    const bmr = this.calcBMR(profile);
    const tdee = bmr * (this.ACTIVITY_MULTIPLIERS[profile.activity] || 1.2);
    const adjustment = this.GOAL_ADJUSTMENTS[profile.goal] || 0;
    const calories = Math.round(tdee + adjustment);

    // Protein: 1.8g per kg body weight
    const protein = Math.round(profile.weight * 1.8);
    // Fat: 25% of calories → each gram fat = 9 kcal
    const fat = Math.round((calories * 0.25) / 9);
    // Carbs: remaining calories → each gram carb = 4 kcal
    const proteinKcal = protein * 4;
    const fatKcal     = fat * 9;
    const carbs = Math.max(0, Math.round((calories - proteinKcal - fatKcal) / 4));

    return { calories, protein, fat, carbs, bmr: Math.round(bmr), tdee: Math.round(tdee) };
  },

  calcBMI(weight, height) {
    const hm = height / 100;
    return (weight / (hm * hm)).toFixed(1);
  },

  getBMICategory(bmi) {
    if (bmi < 18.5) return { label: 'Underweight', color: 'var(--md-warning)' };
    if (bmi < 25)   return { label: 'Normal',      color: 'var(--md-primary)' };
    if (bmi < 30)   return { label: 'Overweight',  color: 'var(--md-warning)' };
    return                 { label: 'Obese',        color: 'var(--md-error)' };
  }
};

// ─── App State ─────────────────────────────────────────────────────────────────

const App = {
  currentPage: 'dashboard',
  scanResult: null,        // holds pending scan result for confirmation
  editingEntryId: null,    // for food entry edit mode

  init() {
    // Apply saved theme immediately
    UI.applyTheme(Storage.getTheme());

    if (!Storage.isSetupComplete()) {
      this.showSetup();
    } else {
      this.showApp();
      this.navigate('dashboard');
    }
  },

  showSetup() {
    document.getElementById('setup-wizard').style.display = 'flex';
    document.getElementById('app-shell').style.display = 'none';
    SetupWizard.init();
  },

  showApp() {
    document.getElementById('setup-wizard').style.display = 'none';
    document.getElementById('app-shell').style.display = 'flex';
    UI.updateNavBar();
  },

  navigate(page) {
    this.currentPage = page;
    UI.renderPage(page);
    UI.updateNavBar();
    // Update URL hash without reload
    history.replaceState(null, '', `#${page}`);
  },
};

// ─── Setup Wizard ──────────────────────────────────────────────────────────────

const SetupWizard = {
  step: 1,
  totalSteps: 4,
  data: {},

  init() {
    this.step = 1;
    this.data = {};
    this.renderStep();
  },

  renderStep() {
    const container = document.getElementById('wizard-content');
    container.innerHTML = '';
    container.classList.remove('slide-in');
    void container.offsetWidth; // reflow
    container.classList.add('slide-in');

    const renders = [null, this.renderStep1, this.renderStep2, this.renderStep3, this.renderStep4];
    renders[this.step].call(this, container);

    document.getElementById('wizard-progress').style.width = `${(this.step / this.totalSteps) * 100}%`;
    document.getElementById('wizard-step-label').textContent = `Step ${this.step} of ${this.totalSteps}`;
    document.getElementById('wizard-back').style.visibility = this.step > 1 ? 'visible' : 'hidden';
    document.getElementById('wizard-next').textContent = this.step === this.totalSteps ? 'Get Started' : 'Continue';
  },

  renderStep1(c) {
    c.innerHTML = `
      <div class="wizard-step">
        <div class="wizard-icon">👋</div>
        <h2 class="wizard-title">Welcome! Let's set you up</h2>
        <p class="wizard-subtitle">Tell us a bit about yourself to personalize your experience</p>

        <div class="pfp-upload-area" id="pfp-area">
          <div class="pfp-preview" id="pfp-preview">
            <span class="pfp-placeholder">📷</span>
          </div>
          <button class="btn-text" onclick="document.getElementById('pfp-input').click()">Upload photo (optional)</button>
          <input type="file" id="pfp-input" accept="image/*" style="display:none" onchange="SetupWizard.handlePfp(this)">
        </div>

        <div class="form-group">
          <label class="form-label">Your name *</label>
          <input class="form-input" id="sw-name" type="text" placeholder="e.g. Alex" value="${this.data.name || ''}">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Age *</label>
            <input class="form-input" id="sw-age" type="number" min="10" max="120" placeholder="25" value="${this.data.age || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Sex *</label>
            <select class="form-input" id="sw-sex">
              <option value="male"   ${this.data.sex === 'male'   ? 'selected' : ''}>Male</option>
              <option value="female" ${this.data.sex === 'female' ? 'selected' : ''}>Female</option>
            </select>
          </div>
        </div>
      </div>
    `;
  },

  renderStep2(c) {
    c.innerHTML = `
      <div class="wizard-step">
        <div class="wizard-icon">📏</div>
        <h2 class="wizard-title">Your measurements</h2>
        <p class="wizard-subtitle">Used to calculate your basal metabolic rate accurately</p>

        <div class="form-group">
          <label class="form-label">Height (cm) *</label>
          <input class="form-input" id="sw-height" type="number" min="100" max="250" placeholder="175" value="${this.data.height || ''}">
        </div>
        <div class="form-group">
          <label class="form-label">Weight (kg) *</label>
          <input class="form-input" id="sw-weight" type="number" min="20" max="400" step="0.1" placeholder="70.0" value="${this.data.weight || ''}">
        </div>

        ${this.data.height && this.data.weight ? `
          <div class="bmi-chip">
            BMI: ${Nutrition.calcBMI(this.data.weight, this.data.height)} — ${Nutrition.getBMICategory(Nutrition.calcBMI(this.data.weight, this.data.height)).label}
          </div>
        ` : ''}
      </div>
    `;
  },

  renderStep3(c) {
    const goals = [
      { value: 'lose',     icon: '📉', label: 'Lose weight',    desc: 'Calorie deficit (~400 kcal)' },
      { value: 'maintain', icon: '⚖️',  label: 'Maintain weight', desc: 'Eat at your TDEE' },
      { value: 'gain',     icon: '📈', label: 'Gain weight',    desc: 'Calorie surplus (~400 kcal)' },
    ];
    const activities = [
      { value: 'sedentary', label: 'Sedentary',         desc: 'Little or no exercise' },
      { value: 'light',     label: 'Lightly active',    desc: '1–3 days/week exercise' },
      { value: 'moderate',  label: 'Moderately active', desc: '3–5 days/week exercise' },
      { value: 'active',    label: 'Very active',       desc: '6–7 days/week exercise' },
    ];

    c.innerHTML = `
      <div class="wizard-step">
        <div class="wizard-icon">🎯</div>
        <h2 class="wizard-title">Your goal & activity</h2>
        <p class="wizard-subtitle">This shapes your daily calorie and macro targets</p>

        <div class="form-group">
          <label class="form-label">Primary goal</label>
          <div class="option-cards" id="goal-cards">
            ${goals.map(g => `
              <button class="option-card ${this.data.goal === g.value ? 'selected' : ''}" onclick="SetupWizard.selectOption('goal', '${g.value}', this)">
                <span class="option-icon">${g.icon}</span>
                <strong>${g.label}</strong>
                <small>${g.desc}</small>
              </button>
            `).join('')}
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Activity level</label>
          <div class="option-list" id="activity-list">
            ${activities.map(a => `
              <button class="option-row ${this.data.activity === a.value ? 'selected' : ''}" onclick="SetupWizard.selectOption('activity', '${a.value}', this)">
                <div>
                  <strong>${a.label}</strong>
                  <small>${a.desc}</small>
                </div>
                <span class="check-icon">✓</span>
              </button>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  },

  renderStep4(c) {
    // Preview calculated goals
    const preview = this.data.name ? Nutrition.calcGoals({
      ...this.data,
      age: Number(this.data.age),
      height: Number(this.data.height),
      weight: Number(this.data.weight),
    }) : null;

    c.innerHTML = `
      <div class="wizard-step">
        <div class="wizard-icon">🎉</div>
        <h2 class="wizard-title">Your personalized plan</h2>
        <p class="wizard-subtitle">Here's what we calculated for you, ${this.data.name || 'there'}!</p>

        ${preview ? `
          <div class="goals-preview">
            <div class="goal-stat">
              <span class="goal-stat-value">${preview.calories}</span>
              <span class="goal-stat-label">Daily Calories</span>
            </div>
            <div class="goal-stat">
              <span class="goal-stat-value">${preview.protein}g</span>
              <span class="goal-stat-label">Protein</span>
            </div>
            <div class="goal-stat">
              <span class="goal-stat-value">${preview.fat}g</span>
              <span class="goal-stat-label">Fat</span>
            </div>
            <div class="goal-stat">
              <span class="goal-stat-value">${preview.carbs}g</span>
              <span class="goal-stat-label">Carbs</span>
            </div>
          </div>
          <p class="wizard-hint">BMR: ${preview.bmr} kcal/day · TDEE: ${preview.tdee} kcal/day</p>
        ` : '<p class="wizard-hint text-error">Please complete all previous steps first.</p>'}

        <div class="form-group" style="margin-top: 1.5rem;">
          <label class="form-label">One last thing — what's your theme?</label>
          <div class="theme-picker">
            ${['green','blue','purple','orange','red'].map(s => `
              <button class="theme-dot scheme-${s}" onclick="SetupWizard.selectScheme('${s}', this)" title="${s}"></button>
            `).join('')}
          </div>
          <div style="display:flex;gap:.5rem;margin-top:.5rem;">
            <button class="btn-outline flex-1" onclick="SetupWizard.toggleMode('light')">☀️ Light</button>
            <button class="btn-outline flex-1" onclick="SetupWizard.toggleMode('dark')">🌙 Dark</button>
          </div>
        </div>
      </div>
    `;
  },

  handlePfp(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      this.data.pfp = e.target.result;
      const preview = document.getElementById('pfp-preview');
      preview.innerHTML = `<img src="${e.target.result}" alt="Profile photo" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
    };
    reader.readAsDataURL(file);
  },

  selectOption(field, value, el) {
    this.data[field] = value;
    const container = el.parentElement;
    container.querySelectorAll('.option-card, .option-row').forEach(b => b.classList.remove('selected'));
    el.classList.add('selected');
  },

  selectScheme(scheme, el) {
    this.data.scheme = scheme;
    document.querySelectorAll('.theme-dot').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
    UI.applyTheme({ mode: this.data.mode || 'light', scheme });
  },

  toggleMode(mode) {
    this.data.mode = mode;
    UI.applyTheme({ mode, scheme: this.data.scheme || 'green' });
  },

  collectStep() {
    if (this.step === 1) {
      const name   = document.getElementById('sw-name')?.value?.trim();
      const age    = document.getElementById('sw-age')?.value;
      const sex    = document.getElementById('sw-sex')?.value;
      if (!name) return UI.showToast('Please enter your name', 'error');
      if (!age || age < 10) return UI.showToast('Please enter a valid age', 'error');
      Object.assign(this.data, { name, age: Number(age), sex });
    }
    if (this.step === 2) {
      const height = document.getElementById('sw-height')?.value;
      const weight = document.getElementById('sw-weight')?.value;
      if (!height || height < 100) return UI.showToast('Please enter a valid height', 'error');
      if (!weight || weight < 20)  return UI.showToast('Please enter a valid weight', 'error');
      Object.assign(this.data, { height: Number(height), weight: Number(weight) });
    }
    if (this.step === 3) {
      if (!this.data.goal)     return UI.showToast('Please select a goal', 'error');
      if (!this.data.activity) return UI.showToast('Please select an activity level', 'error');
    }
    return true;
  },

  next() {
    if (!this.collectStep()) return;
    if (this.step < this.totalSteps) {
      this.step++;
      this.renderStep();
    } else {
      this.finish();
    }
  },

  back() {
    if (this.step > 1) {
      this.step--;
      this.renderStep();
    }
  },

  finish() {
    // Save profile
    Storage.saveProfile({
      name:     this.data.name,
      age:      this.data.age,
      sex:      this.data.sex,
      height:   this.data.height,
      weight:   this.data.weight,
      goal:     this.data.goal,
      activity: this.data.activity,
      pfp:      this.data.pfp || null,
      createdAt: Date.now(),
    });

    // Save calculated goals
    const goals = Nutrition.calcGoals({
      ...this.data,
      age:    Number(this.data.age),
      height: Number(this.data.height),
      weight: Number(this.data.weight),
    });
    Storage.saveGoals(goals);

    // Save theme
    Storage.saveTheme({ mode: this.data.mode || 'light', scheme: this.data.scheme || 'green' });

    // Save initial weight entry
    Storage.addWeightEntry(this.data.weight);

    UI.showToast(`Welcome, ${this.data.name}! 🎉`, 'success');
    App.showApp();
    App.navigate('dashboard');
  },
};

// ─── Boot ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  App.init();

  // Handle hash navigation
  window.addEventListener('hashchange', () => {
    const page = location.hash.slice(1);
    if (['dashboard', 'scan', 'log', 'progress', 'settings'].includes(page)) {
      App.navigate(page);
    }
  });

  // Wizard nav buttons
  document.getElementById('wizard-next')?.addEventListener('click', () => SetupWizard.next());
  document.getElementById('wizard-back')?.addEventListener('click', () => SetupWizard.back());
});
