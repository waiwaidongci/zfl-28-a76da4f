'use strict';
export { routesBase, ALL_ROUTES_MAP } from './data/routes.js';
export { DIFF } from './data/difficulty.js';
export { EVENTS_POOL, EVENT_CATEGORY_LABELS } from './data/events.js';
export { SCENARIOS, CUSTOM_SCENARIO_PREFIX } from './data/scenarios.js';
export { mulberry32, hashStringToSeed, generateRandomSeed } from './logic/rng.js';
export { CHALLENGE_VERSION, CHALLENGE_ALPHABET, encodeChallengeCode, decodeChallengeCode, formatChallengeInfo } from './logic/challenge.js';
export { CUSTOM_SCENARIOS_KEY, loadCustomScenarios, saveCustomScenarios, mergeCustomScenarios, getAllScenarios, getScenarioById } from './logic/custom-scenarios.js';
export { formatSign, validateScenarioConfig } from './logic/validate.js';

export function formatChallengeCodeInput(value) {
  if (!value) return "";
  let cleaned = value.toUpperCase().replace(/[^A-Z2-9]/g, "");
  if (cleaned.length > 7) cleaned = cleaned.slice(0, 7);
  const parts = [];
  if (cleaned.length > 0) parts.push(cleaned.slice(0, Math.min(3, cleaned.length)));
  if (cleaned.length > 3) parts.push(cleaned.slice(3, Math.min(5, cleaned.length)));
  if (cleaned.length > 5) parts.push(cleaned.slice(5, cleaned.length));
  return parts.join("-");
}
