'use strict';
import { StorageUtil } from '../logic/storage.js';
import { DIFF } from '../data/difficulty.js';
import { getAllScenarios } from '../logic/custom-scenarios.js';
import { checkScenarioAchievements } from '../logic/achievements.js';

export const ARCHIVE_STORAGE_KEY = "mountain_post_archives";
const ARCHIVE_VERSION = 3;

export function getDefaultArchiveFields() {
  return {
    version: ARCHIVE_VERSION,
    id: null,
    win: false,
    scenario: "standard",
    scenarioLabel: "标准雪线",
    scenarioColor: "#315c72",
    day: 0,
    difficulty: "normal",
    difficultyLabel: "标准",
    savedCaravans: 0,
    reputation: 0,
    targetDays: 15,
    winTarget: null,
    minResources: { wood: 0, med: 0, food: 0 },
    failureReason: null,
    routePreference: { north: 0, ridge: 0, valley: 0 },
    keyLogs: [],
    timestamp: 0,
    dateStr: "",
    replayHistory: [],
    turningPoints: [],
    achievements: [],
    consequencesTimeline: [],
    consequenceHistory: [],
    challengeMode: false,
    challengeCode: null,
    challengeSeed: null
  };
}

export function migrateArchive(archive) {
  if (!archive || typeof archive !== 'object') {
    return { ...getDefaultArchiveFields(), id: Date.now(), timestamp: Date.now(), dateStr: new Date().toLocaleString("zh-CN") };
  }
  const defaults = getDefaultArchiveFields();
  const migrated = { ...defaults, ...archive };
  if (!migrated.minResources || typeof migrated.minResources !== 'object') {
    migrated.minResources = { ...defaults.minResources };
  } else {
    migrated.minResources = { ...defaults.minResources, ...migrated.minResources };
    migrated.minResources.wood = parseInt(migrated.minResources.wood) || 0;
    migrated.minResources.med = parseInt(migrated.minResources.med) || 0;
    migrated.minResources.food = parseInt(migrated.minResources.food) || 0;
  }
  if (!migrated.routePreference || typeof migrated.routePreference !== 'object') {
    migrated.routePreference = { ...defaults.routePreference };
  } else {
    migrated.routePreference = { ...defaults.routePreference, ...migrated.routePreference };
    Object.keys(migrated.routePreference).forEach(key => {
      migrated.routePreference[key] = parseInt(migrated.routePreference[key]) || 0;
    });
  }
  if (!Array.isArray(migrated.keyLogs)) migrated.keyLogs = [];
  if (!Array.isArray(migrated.replayHistory)) migrated.replayHistory = [];
  if (!Array.isArray(migrated.turningPoints)) migrated.turningPoints = [];
  if (!Array.isArray(migrated.achievements)) migrated.achievements = [];
  if (!Array.isArray(migrated.consequencesTimeline)) migrated.consequencesTimeline = [];
  if (!Array.isArray(migrated.consequenceHistory)) migrated.consequenceHistory = [];
  if (typeof migrated.challengeMode !== 'boolean') migrated.challengeMode = false;
  if (!migrated.challengeCode) migrated.challengeCode = null;
  if (!migrated.challengeSeed) migrated.challengeSeed = null;
  if (!migrated.version) migrated.version = ARCHIVE_VERSION;
  if (!migrated.scenario) {
    migrated.scenario = "standard";
    migrated.scenarioLabel = "标准雪线";
    migrated.scenarioColor = "#315c72";
    migrated.targetDays = 15;
    migrated.winTarget = { type: "days", label: "坚守到最后" };
  }
  const all = getAllScenarios();
  if (!migrated.scenarioLabel && all[migrated.scenario]) {
    migrated.scenarioLabel = all[migrated.scenario].name;
    migrated.scenarioColor = all[migrated.scenario].color;
    migrated.scenarioSubtitle = all[migrated.scenario].subtitle;
  }
  if (!migrated.targetDays && all[migrated.scenario]) {
    migrated.targetDays = all[migrated.scenario].targetDays;
  }
  if (!migrated.winTarget && all[migrated.scenario]) {
    migrated.winTarget = { ...all[migrated.scenario].win };
  }
  if (!migrated.difficultyLabel && DIFF[migrated.difficulty]) {
    migrated.difficultyLabel = DIFF[migrated.difficulty].label;
  }
  migrated.day = parseInt(migrated.day) || 0;
  migrated.savedCaravans = parseInt(migrated.savedCaravans) || 0;
  migrated.reputation = parseInt(migrated.reputation) || 0;
  migrated.targetDays = parseInt(migrated.targetDays) || 15;
  if (migrated.win !== true && migrated.win !== false) {
    migrated.win = false;
  }
  if (migrated.replayHistory && Array.isArray(migrated.replayHistory)) {
    migrated.replayHistory.forEach(day => {
      if (!day || typeof day !== 'object') return;
      if (!day.estimate) day.estimate = null;
      if (!day.startResources) day.startResources = { wood: 0, med: 0, food: 0, rep: 0 };
      if (!day.endResources) day.endResources = { wood: 0, med: 0, food: 0, rep: 0 };
      if (!day.startGuides) day.startGuides = [];
      if (!day.endGuides) day.endGuides = [];
      if (!day.routes) day.routes = [];
      if (!day.logs) day.logs = [];
      if (!day.resourceChanges) day.resourceChanges = [];
      if (!day.consequencesSnapshot) day.consequencesSnapshot = [];
      if (!day.consequencesExpired) day.consequencesExpired = [];
      if (!day.consequencesTriggered) day.consequencesTriggered = [];
    });
  }
  if (!migrated.timestamp) migrated.timestamp = Date.now();
  if (!migrated.dateStr) {
    try {
      migrated.dateStr = new Date(migrated.timestamp).toLocaleString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
    } catch (e) {
      migrated.dateStr = "未知日期";
    }
  }
  if (!migrated.id) migrated.id = migrated.timestamp;
  return migrated;
}

export function loadGameArchives() {
  const data = StorageUtil.get(ARCHIVE_STORAGE_KEY, []);
  if (!Array.isArray(data)) return [];
  return data.map(migrateArchive);
}

export function saveGameArchives(archives) {
  StorageUtil.set(ARCHIVE_STORAGE_KEY, archives);
}

export function getKeyLogs(game) {
  const logs = [];
  const importantKeywords = ["【事件】", "成功", "受挫", "接应", "暴雪", "封路", "耗尽", "疲劳", "商队"];
  for (const log of game.log) {
    if (importantKeywords.some(kw => log.includes(kw))) {
      logs.push(log);
    }
    if (logs.length >= 10) break;
  }
  return logs;
}

export function saveGameArchive(win, game) {
  const sc = game.scenarioConfig;
  const d = DIFF[game.diff];
  const now = new Date();
  const unlockedIds = checkScenarioAchievements(sc.id, game, null);
  var consequencesTimeline = []
  if (game.consequenceHistory && game.consequenceHistory.length > 0) {
    var consMap = {}
    game.consequenceHistory.forEach(function(entry) {
      var id = entry.id
      if (!consMap[id]) {
        consMap[id] = {
          id: id,
          consequence: null,
          triggerDay: null,
          expiredDay: null
        }
      }
      if (entry.event === "triggered") {
        consMap[id].consequence = entry.consequence
        consMap[id].triggerDay = entry.day
      } else if (entry.event === "expired") {
        consMap[id].expiredDay = entry.day
        if (!consMap[id].consequence) consMap[id].consequence = entry.consequence
      }
    })
    consequencesTimeline = Object.values(consMap).map(function(item) {
      return {
        id: item.id,
        sourceEventId: item.consequence ? item.consequence.sourceEventId : "",
        sourceEventName: item.consequence ? item.consequence.sourceEventName : "",
        sourceChoice: item.consequence ? item.consequence.sourceChoice : "",
        type: item.consequence ? item.consequence.type : "",
        description: item.consequence ? item.consequence.description : "",
        triggerDay: item.triggerDay,
        expiredDay: item.expiredDay,
        totalDays: item.consequence ? item.consequence.totalDays : 0,
        effectSummary: item.consequence ? (item.consequence.effectSummary || "") : "",
        routeName: item.consequence ? (item.consequence.routeName || "") : ""
      }
    }).sort(function(a, b) { return (a.triggerDay || 0) - (b.triggerDay || 0) })
  }
  const archive = {
    version: ARCHIVE_VERSION,
    id: now.getTime(),
    win: win,
    scenario: game.scenario,
    scenarioLabel: sc.name,
    scenarioColor: sc.color,
    scenarioSubtitle: sc.subtitle,
    targetDays: game.targetDays,
    winTarget: { ...sc.win },
    day: game.day,
    difficulty: game.diff,
    difficultyLabel: d.label,
    savedCaravans: game.saved,
    reputation: game.rep,
    minResources: { ...game.minResources },
    failureReason: win ? null : game.failureReason,
    routePreference: { ...game.routeDispatches },
    keyLogs: getKeyLogs(game),
    timestamp: now.getTime(),
    dateStr: now.toLocaleString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }),
    replayHistory: JSON.parse(JSON.stringify(game.replayHistory || [])),
    turningPoints: JSON.parse(JSON.stringify(game.turningPoints || [])),
    achievements: unlockedIds,
    consequencesTimeline: consequencesTimeline,
    consequenceHistory: JSON.parse(JSON.stringify(game.consequenceHistory || [])),
    challengeMode: !!game.challengeMode,
    challengeCode: game.challengeCode || null,
    challengeSeed: game.challengeSeed || null
  };
  const archives = loadGameArchives();
  archives.unshift(archive);
  if (archives.length > 100) archives.length = 100;
  saveGameArchives(archives);
}
