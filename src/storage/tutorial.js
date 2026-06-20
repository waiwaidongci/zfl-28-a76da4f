'use strict';
import { StorageUtil } from '../logic/storage.js';

export const TUTORIAL_STORAGE_KEY = "mountain_post_tutorial_completed";

export function loadTutorialCompleted() {
  const raw = StorageUtil.getString(TUTORIAL_STORAGE_KEY, null);
  return raw === "true" || raw === "\"true\"";
}

export function saveTutorialCompleted() {
  StorageUtil.setString(TUTORIAL_STORAGE_KEY, "true");
}
