'use strict';
import { StorageUtil } from '../logic/storage.js';
export const SETTINGS_STORAGE_KEY = "mountain_post_settings";
export const DEFAULT_SETTINGS = {
  compactLog: false,
  autoReplay: false,
  hideAchvHint: false,
  lowAnim: false,
  disableCareerBonus: false
};
export const settingsState = { settings: null };
export function loadSettings() {
  const parsed = StorageUtil.get(SETTINGS_STORAGE_KEY, {});
  return { ...DEFAULT_SETTINGS, ...parsed };
}
export function saveSettings() {
  StorageUtil.set(SETTINGS_STORAGE_KEY, settingsState.settings);
}
export function applySettings() {
  if (typeof document !== 'undefined') {
    document.body.classList.toggle("log-compact", !!settingsState.settings.compactLog);
    document.body.classList.toggle("no-anim", !!settingsState.settings.lowAnim);
  }
}
export function resetSettings() {
  settingsState.settings = { ...DEFAULT_SETTINGS };
  saveSettings();
  applySettings();
}
export function bindSettingToggle(inputEl, key) {
  inputEl.onchange = () => {
    settingsState.settings[key] = inputEl.checked;
    saveSettings();
    applySettings();
  };
}
