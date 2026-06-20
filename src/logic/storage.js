'use strict';
export const StorageUtil = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      console.error("StorageUtil.get 失败:", key, e);
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error("StorageUtil.set 失败:", key, e);
    }
  },
  getString(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : raw;
    } catch (e) {
      console.error("StorageUtil.getString 失败:", key, e);
      return fallback;
    }
  },
  setString(key, value) {
    try {
      localStorage.setItem(key, String(value));
    } catch (e) {
      console.error("StorageUtil.setString 失败:", key, e);
    }
  }
};
