'use strict';
import { StorageUtil } from '../logic/storage.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
export const ACHIEVEMENT_STORAGE_KEY = "mountain_post_achievements";
export function loadAchievements() {
  return StorageUtil.get(ACHIEVEMENT_STORAGE_KEY, {});
}
export function saveAchievements(achievements) {
  StorageUtil.set(ACHIEVEMENT_STORAGE_KEY, achievements);
}
export function checkScenarioAchievements(scenarioId, game, archive) {
  const achievements = ACHIEVEMENTS[scenarioId];
  if (!achievements) return [];
  const unlocked = [];
  achievements.forEach(achv => {
    try {
      if (achv.check(game, archive)) {
        unlocked.push(achv.id);
      }
    } catch (e) {
      console.error("成就检测出错:", achv.id, e);
    }
  });
  return unlocked;
}
export function unlockAchievements(scenarioId, achievementIds) {
  const allAchievements = loadAchievements();
  if (!allAchievements[scenarioId]) allAchievements[scenarioId] = [];
  const newlyUnlocked = [];
  achievementIds.forEach(id => {
    if (!allAchievements[scenarioId].includes(id)) {
      allAchievements[scenarioId].push(id);
      newlyUnlocked.push(id);
    }
  });
  if (newlyUnlocked.length > 0) {
    saveAchievements(allAchievements);
  }
  return newlyUnlocked;
}
export function isAchievementUnlocked(scenarioId, achievementId) {
  const allAchievements = loadAchievements();
  return allAchievements[scenarioId] && allAchievements[scenarioId].includes(achievementId);
}
export function getScenarioAchievementProgress(scenarioId) {
  const achievements = ACHIEVEMENTS[scenarioId];
  const allAchievements = loadAchievements();
  const unlockedIds = allAchievements[scenarioId] || [];
  return {
    total: achievements ? achievements.length : 0,
    unlocked: unlockedIds.length,
    ids: unlockedIds
  };
}
