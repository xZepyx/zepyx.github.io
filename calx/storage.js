/**
 * storage.js — Persistent data layer using localStorage
 * Handles all read/write operations with structured JSON
 */

const Storage = (() => {
  const KEYS = {
    USER_PROFILE: 'ct_userProfile',
    NUTRITION_GOALS: 'ct_nutritionGoals',
    DAILY_LOGS: 'ct_dailyLogs',
    API_SETTINGS: 'ct_apiSettings',
    THEME: 'ct_theme',
    STREAK: 'ct_streak',
    WEIGHT_LOG: 'ct_weightLog',
  };

  // ─── Generic Helpers ───────────────────────────────────────────────────────

  function get(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.error(`Storage.get(${key}) failed:`, e);
      return null;
    }
  }

  function set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error(`Storage.set(${key}) failed:`, e);
      return false;
    }
  }

  function remove(key) {
    localStorage.removeItem(key);
  }

  // ─── User Profile ──────────────────────────────────────────────────────────

  function getProfile() {
    return get(KEYS.USER_PROFILE);
  }

  function saveProfile(profile) {
    return set(KEYS.USER_PROFILE, { ...profile, updatedAt: Date.now() });
  }

  // ─── Nutrition Goals ───────────────────────────────────────────────────────

  function getGoals() {
    return get(KEYS.NUTRITION_GOALS);
  }

  function saveGoals(goals) {
    return set(KEYS.NUTRITION_GOALS, goals);
  }

  // ─── Daily Logs ────────────────────────────────────────────────────────────

  function getTodayKey() {
    return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  }

  function getAllLogs() {
    return get(KEYS.DAILY_LOGS) || {};
  }

  function getDayLog(dateKey) {
    const logs = getAllLogs();
    return logs[dateKey] || { date: dateKey, entries: [], totals: { calories: 0, protein: 0, fat: 0, carbs: 0 } };
  }

  function getTodayLog() {
    return getDayLog(getTodayKey());
  }

  function saveDayLog(dateKey, dayLog) {
    const logs = getAllLogs();
    logs[dateKey] = dayLog;
    return set(KEYS.DAILY_LOGS, logs);
  }

  function addFoodEntry(entry) {
    const dateKey = getTodayKey();
    const dayLog = getTodayLog();

    const newEntry = {
      id: `entry_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
      ...entry,
    };

    dayLog.entries.push(newEntry);
    recalcTotals(dayLog);
    saveDayLog(dateKey, dayLog);
    updateStreak();
    return newEntry;
  }

  function updateFoodEntry(entryId, updatedData) {
    const dateKey = getTodayKey();
    const dayLog = getTodayLog();
    const idx = dayLog.entries.findIndex(e => e.id === entryId);
    if (idx === -1) return false;
    dayLog.entries[idx] = { ...dayLog.entries[idx], ...updatedData };
    recalcTotals(dayLog);
    return saveDayLog(dateKey, dayLog);
  }

  function deleteFoodEntry(entryId) {
    const dateKey = getTodayKey();
    const dayLog = getTodayLog();
    dayLog.entries = dayLog.entries.filter(e => e.id !== entryId);
    recalcTotals(dayLog);
    return saveDayLog(dateKey, dayLog);
  }

  function recalcTotals(dayLog) {
    dayLog.totals = dayLog.entries.reduce((acc, e) => {
      acc.calories += Number(e.calories) || 0;
      acc.protein  += Number(e.protein)  || 0;
      acc.fat      += Number(e.fat)      || 0;
      acc.carbs    += Number(e.carbs)    || 0;
      return acc;
    }, { calories: 0, protein: 0, fat: 0, carbs: 0 });
  }

  function resetTodayLog() {
    const dateKey = getTodayKey();
    return saveDayLog(dateKey, { date: dateKey, entries: [], totals: { calories: 0, protein: 0, fat: 0, carbs: 0 } });
  }

  // ─── Weight Log ────────────────────────────────────────────────────────────

  function getWeightLog() {
    return get(KEYS.WEIGHT_LOG) || [];
  }

  function addWeightEntry(weight) {
    const log = getWeightLog();
    const dateKey = getTodayKey();
    // Replace today's entry if exists
    const filtered = log.filter(e => e.date !== dateKey);
    filtered.push({ date: dateKey, weight: Number(weight), timestamp: Date.now() });
    filtered.sort((a, b) => a.date.localeCompare(b.date));
    set(KEYS.WEIGHT_LOG, filtered);
    // Also update profile's current weight
    const profile = getProfile();
    if (profile) {
      profile.weight = Number(weight);
      saveProfile(profile);
    }
    return filtered;
  }

  // ─── API Settings ──────────────────────────────────────────────────────────

  function getApiSettings() {
    return get(KEYS.API_SETTINGS) || { provider: 'openai', apiKey: '', customEndpoint: '' };
  }

  function saveApiSettings(settings) {
    return set(KEYS.API_SETTINGS, settings);
  }

  // ─── Theme ─────────────────────────────────────────────────────────────────

  function getTheme() {
    return get(KEYS.THEME) || { mode: 'light', scheme: 'green' };
  }

  function saveTheme(theme) {
    return set(KEYS.THEME, theme);
  }

  // ─── Streak ────────────────────────────────────────────────────────────────

  function getStreak() {
    return get(KEYS.STREAK) || { current: 0, longest: 0, lastDate: null };
  }

  function updateStreak() {
    const streak = getStreak();
    const today = getTodayKey();
    if (streak.lastDate === today) return streak;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = yesterday.toISOString().split('T')[0];

    if (streak.lastDate === yesterdayKey) {
      streak.current += 1;
    } else {
      streak.current = 1;
    }
    streak.longest = Math.max(streak.current, streak.longest);
    streak.lastDate = today;
    set(KEYS.STREAK, streak);
    return streak;
  }

  // ─── Weekly History ────────────────────────────────────────────────────────

  function getWeeklyLogs() {
    const logs = getAllLogs();
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      result.push(logs[key] || { date: key, entries: [], totals: { calories: 0, protein: 0, fat: 0, carbs: 0 } });
    }
    return result;
  }

  // ─── Nuclear Reset ─────────────────────────────────────────────────────────

  function resetAll() {
    Object.values(KEYS).forEach(k => localStorage.removeItem(k));
  }

  // ─── Setup Check ───────────────────────────────────────────────────────────

  function isSetupComplete() {
    const profile = getProfile();
    return !!(profile && profile.name && profile.age && profile.height && profile.weight);
  }

  return {
    getProfile, saveProfile,
    getGoals, saveGoals,
    getTodayLog, getDayLog, getAllLogs, getWeeklyLogs,
    addFoodEntry, updateFoodEntry, deleteFoodEntry, resetTodayLog,
    getWeightLog, addWeightEntry,
    getApiSettings, saveApiSettings,
    getTheme, saveTheme,
    getStreak, updateStreak,
    isSetupComplete, resetAll,
    getTodayKey,
  };
})();
