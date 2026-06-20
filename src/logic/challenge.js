'use strict';
import { mulberry32, hashStringToSeed } from './rng.js';
import { SCENARIOS, CUSTOM_SCENARIO_PREFIX } from '../data/scenarios.js';
import { DIFF } from '../data/difficulty.js';
import { loadCustomScenarios, getAllScenarios } from './custom-scenarios.js';
export const CHALLENGE_VERSION = 1;
export const CHALLENGE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function getEventChoiceKey(eventId, choiceIndex) {
  return eventId + "__" + choiceIndex;
}
export function encodeChallengeCode(scenarioId, difficulty, seedNum) {
  const scenarioIndex = Object.keys(SCENARIOS).indexOf(scenarioId);
  const customScenarios = loadCustomScenarios();
  const allScenarioIds = Object.keys(SCENARIOS).concat(Object.keys(customScenarios));
  let scIndex = allScenarioIds.indexOf(scenarioId);
  if (scIndex < 0) scIndex = 0;
  const diffMap = { safe: 0, normal: 1, hard: 2 };
  const diffIndex = diffMap[difficulty] !== undefined ? diffMap[difficulty] : 1;
  const version = CHALLENGE_VERSION;
  function base32Encode(num, length) {
    let result = "";
    let n = num >>> 0;
    for (let i = 0; i < length; i++) {
      result = CHALLENGE_ALPHABET[n % 32] + result;
      n = Math.floor(n / 32);
    }
    return result;
  }
  function xorShiftSeed(seed) {
    let s = seed >>> 0;
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s >>> 0;
  }
  const seedPart = xorShiftSeed(seedNum >>> 0);
  const header = (version << 6) | (scIndex << 3) | diffIndex;
  const part1 = base32Encode(header, 2);
  const part2 = base32Encode(seedPart >>> 10, 3);
  const part3 = base32Encode(seedPart & 0x3FF, 2);
  const raw = part1 + part2 + part3;
  return raw.substring(0, 3) + "-" + raw.substring(3, 5) + "-" + raw.substring(5, 7);
}
export function decodeChallengeCode(code) {
  try {
    const clean = code.toUpperCase().replace(/[^A-Z2-9]/g, "");
    if (clean.length !== 7) return null;
    function base32Decode(str) {
      let num = 0;
      for (let i = 0; i < str.length; i++) {
        num = num * 32 + CHALLENGE_ALPHABET.indexOf(str[i]);
        if (CHALLENGE_ALPHABET.indexOf(str[i]) < 0) return -1;
      }
      return num;
    }
    const header = base32Decode(clean.substring(0, 2));
    if (header < 0) return null;
    const version = (header >>> 6) & 0x03;
    if (version !== CHALLENGE_VERSION) return null;
    const scIndex = (header >>> 3) & 0x07;
    const diffIndex = header & 0x07;
    const seedHi = base32Decode(clean.substring(2, 5));
    const seedLo = base32Decode(clean.substring(5, 7));
    if (seedHi < 0 || seedLo < 0) return null;
    let seedPart = (seedHi << 10) | (seedLo & 0x3FF);
    function xorUnshiftSeed(s) {
      s = s >>> 0;
      let t = s;
      t ^= t << 5; t >>>= 0;
      t = Math.imul(t, 0x7f6a621d); t >>>= 0;
      t ^= t >>> 17;
      t ^= t << 13; t >>>= 0;
      return t >>> 0;
    }
    const seed = xorUnshiftSeed(seedPart);
    const customScenarios = loadCustomScenarios();
    const allScenarioIds = Object.keys(SCENARIOS).concat(Object.keys(customScenarios));
    const scenarioId = allScenarioIds[scIndex] || "standard";
    const diffMapInv = { 0: "safe", 1: "normal", 2: "hard" };
    const difficulty = diffMapInv[diffIndex] || "normal";
    const formatted = clean.substring(0, 3) + "-" + clean.substring(3, 5) + "-" + clean.substring(5, 7);
    return { scenarioId, difficulty, seed, valid: true, formatted };
  } catch (e) {
    return null;
  }
}
export function formatChallengeInfo(decoded) {
  if (!decoded) return null;
  const all = getAllScenarios();
  const sc = all[decoded.scenarioId];
  const d = DIFF[decoded.difficulty];
  return {
    scenarioName: sc ? sc.name : decoded.scenarioId,
    difficultyLabel: d ? d.label : decoded.difficulty,
    seed: decoded.seed
  };
}
