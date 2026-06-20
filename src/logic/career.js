'use strict';
import { StorageUtil } from '../logic/storage.js';
import { TRAITS } from '../data/traits.js';
export const CAREER_STORAGE_KEY = "mountain_post_career";
export const DEFAULT_CAREER = {
  version: 1,
  guides: {
    "阿措": {
      totalGames: 0,
      totalDays: 0,
      totalRoutes: 0,
      totalSuccesses: 0,
      totalFailures: 0,
      routeStats: {},
      stormDays: 0,
      restDays: 0,
      consecutiveRest: 0,
      maxConsecutiveRest: 0,
      rescueFailStreak: 0,
      traits: []
    },
    "洛桑": {
      totalGames: 0,
      totalDays: 0,
      totalRoutes: 0,
      totalSuccesses: 0,
      totalFailures: 0,
      routeStats: {},
      stormDays: 0,
      restDays: 0,
      consecutiveRest: 0,
      maxConsecutiveRest: 0,
      rescueFailStreak: 0,
      traits: []
    }
  },
  unlockedTraits: {}
};
export const careerState = { data: null, settings: null };
export function loadCareerData() {
  const stored = StorageUtil.get(CAREER_STORAGE_KEY, null);
  if (!stored) return JSON.parse(JSON.stringify(DEFAULT_CAREER));
  return migrateCareerData(stored);
}
export function migrateCareerData(data) {
  const result = JSON.parse(JSON.stringify(DEFAULT_CAREER));
  if (!data) return result;
  if (data.guides) {
    for (const name in result.guides) {
      if (data.guides[name]) {
        result.guides[name] = { ...result.guides[name], ...data.guides[name] };
        if (!result.guides[name].routeStats) result.guides[name].routeStats = {};
        if (!result.guides[name].traits) result.guides[name].traits = [];
      }
    }
  }
  if (data.unlockedTraits) result.unlockedTraits = { ...data.unlockedTraits };
  result.version = DEFAULT_CAREER.version;
  return result;
}
export function saveCareerData() {
  StorageUtil.set(CAREER_STORAGE_KEY, careerState.data);
}
export function resetCareerData() {
  careerState.data = JSON.parse(JSON.stringify(DEFAULT_CAREER));
  saveCareerData();
}
export function getGuideTraits(guideName) {
  if (!careerState.data || !careerState.data.guides[guideName]) return [];
  const stats = careerState.data.guides[guideName];
  const activeTraits = [];
  for (const tid in TRAITS) {
    const trait = TRAITS[tid];
    if (stats.traits.includes(tid)) {
      activeTraits.push(trait);
    }
  }
  return activeTraits;
}
export function checkTraitUnlocks(guideName) {
  if (!careerState.data || !careerState.data.guides[guideName]) return [];
  const stats = careerState.data.guides[guideName];
  const newTraits = [];
  for (const tid in TRAITS) {
    const trait = TRAITS[tid];
    if (!stats.traits.includes(tid) && trait.unlockCondition(stats)) {
      stats.traits.push(tid);
      newTraits.push(trait);
      if (!careerState.data.unlockedTraits[guideName]) careerState.data.unlockedTraits[guideName] = [];
      if (!careerState.data.unlockedTraits[guideName].includes(tid)) {
        careerState.data.unlockedTraits[guideName].push(tid);
      }
    }
  }
  return newTraits;
}
export function isCareerBonusEnabled() {
  return !careerState.settings || !careerState.settings.disableCareerBonus;
}
export function applyMedCostModifier(baseMedCost, medCostMod) {
  if (!medCostMod || baseMedCost <= 0) return baseMedCost;
  return Math.max(0, Math.round(baseMedCost * (1 + medCostMod)));
}
export function getGuideTraitEffects(guideName, context) {
  const effects = {
    successMod: 0,
    fatigueMod: 0,
    medCostMod: 0,
    recoveryBonus: 0,
    riskMod: 0,
    routeSpecific: {}
  };
  if (!isCareerBonusEnabled()) return effects;
  const traits = getGuideTraits(guideName);
  const stats = careerState.data.guides[guideName];
  traits.forEach(trait => {
    if (!trait.effects) return;
    if (trait.effects.stormFatigueMod && context && context.isStormDay) {
      effects.fatigueMod += trait.effects.stormFatigueMod;
    }
    if (trait.effects.flatRecoveryBonus) {
      effects.recoveryBonus += trait.effects.flatRecoveryBonus;
    }
    if (trait.effects.restBonus && context && context.consecutiveRestDays >= trait.effects.restBonus.consecutiveThreshold) {
      effects.recoveryBonus += trait.effects.restBonus.extraRecovery;
    }
    if (trait.effects.caravanSuccessBonus && context && context.isCaravanRoute) {
      effects.successMod += trait.effects.caravanSuccessBonus;
    }
    if (trait.effects.routeBonus && context && context.routeId && trait.effects.routeBonus[context.routeId]) {
      const routeEffect = trait.effects.routeBonus[context.routeId];
      if (routeEffect.successMod) effects.successMod += routeEffect.successMod;
      if (routeEffect.medCostMod) effects.medCostMod += routeEffect.medCostMod;
    }
    if (trait.effects.veteranRoute && context && context.routeId && stats) {
      const routeStat = stats.routeStats[context.routeId];
      if (routeStat && routeStat.attempts >= trait.effects.veteranRoute.threshold) {
        effects.riskMod += trait.effects.veteranRoute.riskMod;
      }
    }
    if (trait.effects.failurePenalty && context && stats && stats.rescueFailStreak > 0) {
      const penalty = trait.effects.failurePenalty;
      effects.successMod += penalty.successMod;
    }
  });
  return effects;
}
export function updateCareerAfterDay(guideName, dayResult) {
  if (!careerState.data || !careerState.data.guides[guideName]) return;
  const stats = careerState.data.guides[guideName];
  stats.totalDays++;
  if (dayResult.routeId) {
    stats.totalRoutes++;
    if (!stats.routeStats[dayResult.routeId]) {
      stats.routeStats[dayResult.routeId] = { attempts: 0, successes: 0, failures: 0 };
    }
    stats.routeStats[dayResult.routeId].attempts++;
    if (dayResult.success) {
      stats.totalSuccesses++;
      stats.routeStats[dayResult.routeId].successes++;
      if (stats.rescueFailStreak > 0) stats.rescueFailStreak--;
    } else if (dayResult.failure) {
      stats.totalFailures++;
      stats.routeStats[dayResult.routeId].failures++;
      stats.rescueFailStreak = 2;
    }
    stats.consecutiveRest = 0;
  }
  if (dayResult.rested) {
    stats.restDays++;
    stats.consecutiveRest++;
    if (stats.consecutiveRest > stats.maxConsecutiveRest) {
      stats.maxConsecutiveRest = stats.consecutiveRest;
    }
    if (stats.rescueFailStreak > 0) stats.rescueFailStreak--;
  }
  if (dayResult.isStormDay) {
    stats.stormDays++;
  }
  const newTraits = checkTraitUnlocks(guideName);
  saveCareerData();
  return newTraits;
}
export function updateCareerAfterGame(guideName, gameResult) {
  if (!careerState.data || !careerState.data.guides[guideName]) return;
  const stats = careerState.data.guides[guideName];
  stats.totalGames++;
  saveCareerData();
}
export function initCareerSystem() {
  careerState.data = loadCareerData();
}
