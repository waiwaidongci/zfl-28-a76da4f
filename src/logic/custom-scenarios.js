'use strict';
import { StorageUtil } from '../logic/storage.js';
import { SCENARIOS, CUSTOM_SCENARIO_PREFIX } from '../data/scenarios.js';
import { ALL_ROUTES_MAP } from '../data/routes.js';
export const CUSTOM_SCENARIOS_KEY = "mountain_post_custom_scenarios";
export function loadCustomScenarios() {
  return StorageUtil.get(CUSTOM_SCENARIOS_KEY, {});
}
export function saveCustomScenarios(customScenarios) {
  StorageUtil.set(CUSTOM_SCENARIOS_KEY, customScenarios);
}
export function mergeCustomScenarios() {
  const custom = loadCustomScenarios();
  const merged = { ...SCENARIOS };
  Object.values(custom).forEach(sc => {
    merged[sc.id] = sc;
  });
  return merged;
}
export function getAllScenarios() {
  return mergeCustomScenarios();
}
export function getScenarioById(id) {
  const all = getAllScenarios();
  return all[id];
}
export function getScenarioRoutes(scenarioId) {
  const all = getAllScenarios();
  const sc = all[scenarioId];
  if (!sc) return [];
  return sc.routePool.map(id => ALL_ROUTES_MAP[id]).filter(Boolean);
}
