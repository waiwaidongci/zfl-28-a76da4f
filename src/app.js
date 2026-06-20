'use strict';
import { routesBase, ALL_ROUTES_MAP } from './data/routes.js';
import { DIFF } from './data/difficulty.js';
import { EVENTS_POOL, EVENT_CATEGORY_LABELS } from './data/events.js';
import { SCENARIOS, CUSTOM_SCENARIO_PREFIX } from './data/scenarios.js';
import { ACHIEVEMENTS } from './data/achievements.js';
import { TRAITS } from './data/traits.js';
import { mulberry32, hashStringToSeed, generateRandomSeed } from './logic/rng.js';
import { StorageUtil } from './logic/storage.js';
import { CHALLENGE_VERSION, CHALLENGE_ALPHABET, getEventChoiceKey, encodeChallengeCode, decodeChallengeCode, formatChallengeInfo } from './logic/challenge.js';
import { formatSign, validateScenarioConfig } from './logic/validate.js';
import { CUSTOM_SCENARIOS_KEY, loadCustomScenarios, saveCustomScenarios, mergeCustomScenarios, getAllScenarios, getScenarioById, getScenarioRoutes } from './logic/custom-scenarios.js';
import { CAREER_STORAGE_KEY, careerState, loadCareerData, migrateCareerData, saveCareerData, resetCareerData, getGuideTraits, checkTraitUnlocks, isCareerBonusEnabled, applyMedCostModifier, getGuideTraitEffects, updateCareerAfterDay, updateCareerAfterGame, initCareerSystem } from './logic/career.js';
import { ACHIEVEMENT_STORAGE_KEY, loadAchievements, saveAchievements, checkScenarioAchievements, unlockAchievements, isAchievementUnlocked, getScenarioAchievementProgress } from './logic/achievements.js';
import { SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS, settingsState, loadSettings, saveSettings, applySettings, resetSettings, bindSettingToggle } from './logic/settings.js';
import { migrateArchive, loadGameArchives, saveGameArchives, getKeyLogs, saveGameArchive } from './storage/archive.js';
import { loadTutorialCompleted, saveTutorialCompleted } from './storage/tutorial.js';


let challengeMode = false;
let currentChallengeCode = null;
let currentChallengeSeed = null;
let rng = null;
function rand() {
  if (rng) return rng();
  return Math.random();
}
function randInt(min, max) {
  return Math.floor(rand() * (max - min + 1)) + min;
}
function randChoice(arr) {
  return arr[Math.floor(rand() * arr.length)];
}
function setupChallengeRNG(seedNum, scenarioId, difficulty) {
  const salt = scenarioId + "|" + difficulty + "|" + CHALLENGE_VERSION;
  const combinedSeed = (hashStringToSeed(salt) ^ seedNum) >>> 0;
  rng = mulberry32(combinedSeed);
  currentChallengeSeed = combinedSeed;
}
function clearChallengeRNG() {
  rng = null;
  currentChallengeSeed = null;
}
let game;
let chosenDiff = "normal";
let chosenScenario = "standard";
let pendingEvent = null;
let editingCustomId = null;
let currentEditorScenario = null;
const els = {
  day: document.querySelector("#dayText"), weather: document.querySelector("#weatherText"), wood: document.querySelector("#woodText"),
  med: document.querySelector("#medText"), food: document.querySelector("#foodText"), rep: document.querySelector("#repText"),
  guides: document.querySelector("#guides"), routes: document.querySelector("#routes"), log: document.querySelector("#log"),
  overlay: document.querySelector("#overlay"), diffOverlay: document.querySelector("#diffOverlay"),
  resultTitle: document.querySelector("#resultTitle"), resultText: document.querySelector("#resultText"),
  briefingOverlay: document.querySelector("#briefingOverlay"), briefingTitle: document.querySelector("#briefingTitle"),
  briefingDate: document.querySelector("#briefingDate"), briefingGrid: document.querySelector("#briefingGrid"),
  briefingCloseBtn: document.querySelector("#briefingCloseBtn"),
  eventOverlay: document.querySelector("#eventOverlay"), eventCategory: document.querySelector("#eventCategory"),
  eventTitle: document.querySelector("#eventTitle"), eventDesc: document.querySelector("#eventDesc"),
  eventOptions: document.querySelector("#eventOptions"), codexGrid: document.querySelector("#codexGrid"),
  archiveOverlay: document.querySelector("#archiveOverlay"), archiveList: document.querySelector("#archiveList"),
  confirmOverlay: document.querySelector("#confirmOverlay"), confirmTitle: document.querySelector("#confirmTitle"),
  confirmText: document.querySelector("#confirmText"), scenarioOptions: document.querySelector("#scenarioOptions"),
  scenarioNameEl: document.querySelector("#scenarioName"), scenarioIntroEl: document.querySelector("#scenarioIntro"),
  replayOverlay: document.querySelector("#replayOverlay"), replayTitle: document.querySelector("#replayTitle"),
  replayTimeline: document.querySelector("#replayTimeline"), replayDayInfo: document.querySelector("#replayDayInfo"),
  replayGrid: document.querySelector("#replayGrid"), replaySummaryBar: document.querySelector("#replaySummaryBar"),
  replayTurningBanner: document.querySelector("#replayTurningBanner"),
  replayPrevBtn: document.querySelector("#replayPrevBtn"), replayNextBtn: document.querySelector("#replayNextBtn"),
  replayCloseBtn: document.querySelector("#replayCloseBtn"),
  estimatePanel: document.querySelector("#estimatePanel"), estimateGrid: document.querySelector("#estimateGrid"), estimateDetails: document.querySelector("#estimateDetails"),
  settingsOverlay: document.querySelector("#settingsOverlay"),
  settingCompactLog: document.querySelector("#settingCompactLog"),
  settingAutoReplay: document.querySelector("#settingAutoReplay"),
  settingHideAchvHint: document.querySelector("#settingHideAchvHint"),
  settingLowAnim: document.querySelector("#settingLowAnim"),
  settingDisableCareer: document.querySelector("#settingDisableCareer"),
  settingsBtn: document.querySelector("#settingsBtn"),
  settingsCloseBtn: document.querySelector("#settingsCloseBtn"),
  settingsResetBtn: document.querySelector("#settingsResetBtn"),
  tutorialOverlay: document.querySelector("#tutorialOverlay"),
  tutorialIcon: document.querySelector("#tutorialIcon"),
  tutorialTitle: document.querySelector("#tutorialTitle"),
  tutorialContent: document.querySelector("#tutorialContent"),
  tutorialStepIndicator: document.querySelector("#tutorialStepIndicator"),
  tutorialPrevBtn: document.querySelector("#tutorialPrevBtn"),
  tutorialNextBtn: document.querySelector("#tutorialNextBtn"),
  tutorialSkipBtn: document.querySelector("#tutorialSkipBtn"),
  tutorialCloseBtn: document.querySelector("#tutorialCloseBtn"),
  tutorialBtn: document.querySelector("#tutorialBtn"),
  statsDashboard: document.querySelector("#statsDashboard"),
  loadSampleBtn: document.querySelector("#loadSampleBtn"),
  archiveFilter: document.querySelector("#archiveFilter"),
  editorOverlay: document.querySelector("#editorOverlay"),
  editorCloseBtn: document.querySelector("#editorCloseBtn"),
  editorBtn: document.querySelector("#editorBtn"),
  editorValidation: document.querySelector("#editorValidation"),
  editorTabs: document.querySelector("#editorTabs"),
  editorBaseScenario: document.querySelector("#editorBaseScenario"),
  editorName: document.querySelector("#editorName"),
  editorSubtitle: document.querySelector("#editorSubtitle"),
  editorColor: document.querySelector("#editorColor"),
  editorTargetDays: document.querySelector("#editorTargetDays"),
  editorTargetDaysValue: document.querySelector("#editorTargetDaysValue"),
  editorEventChance: document.querySelector("#editorEventChance"),
  editorEventChanceValue: document.querySelector("#editorEventChanceValue"),
  editorCaravanChance: document.querySelector("#editorCaravanChance"),
  editorCaravanChanceValue: document.querySelector("#editorCaravanChanceValue"),
  editorStormBlockChance: document.querySelector("#editorStormBlockChance"),
  editorStormBlockChanceValue: document.querySelector("#editorStormBlockChanceValue"),
  editorStartWood: document.querySelector("#editorStartWood"),
  editorStartWoodValue: document.querySelector("#editorStartWoodValue"),
  editorStartMed: document.querySelector("#editorStartMed"),
  editorStartMedValue: document.querySelector("#editorStartMedValue"),
  editorStartFood: document.querySelector("#editorStartFood"),
  editorStartFoodValue: document.querySelector("#editorStartFoodValue"),
  editorStartRep: document.querySelector("#editorStartRep"),
  editorStartRepValue: document.querySelector("#editorStartRepValue"),
  editorFatigueBonus: document.querySelector("#editorFatigueBonus"),
  editorFatigueBonusValue: document.querySelector("#editorFatigueBonusValue"),
  editorRewardBonus: document.querySelector("#editorRewardBonus"),
  editorRewardBonusValue: document.querySelector("#editorRewardBonusValue"),
  editorStormImmuneRoutes: document.querySelector("#editorStormImmuneRoutes"),
  editorRoutePool: document.querySelector("#editorRoutePool"),
  editorWeatherClear: document.querySelector("#editorWeatherClear"),
  editorWeatherClearValue: document.querySelector("#editorWeatherClearValue"),
  editorWeatherWind: document.querySelector("#editorWeatherWind"),
  editorWeatherWindValue: document.querySelector("#editorWeatherWindValue"),
  editorWeatherStorm: document.querySelector("#editorWeatherStorm"),
  editorWeatherStormValue: document.querySelector("#editorWeatherStormValue"),
  editorOverrideStorm: document.querySelector("#editorOverrideStorm"),
  editorOverrideStormValue: document.querySelector("#editorOverrideStormValue"),
  editorEventWeather: document.querySelector("#editorEventWeather"),
  editorEventWeatherValue: document.querySelector("#editorEventWeatherValue"),
  editorEventSupply: document.querySelector("#editorEventSupply"),
  editorEventSupplyValue: document.querySelector("#editorEventSupplyValue"),
  editorEventGuide: document.querySelector("#editorEventGuide"),
  editorEventGuideValue: document.querySelector("#editorEventGuideValue"),
  editorEventReputation: document.querySelector("#editorEventReputation"),
  editorEventReputationValue: document.querySelector("#editorEventReputationValue"),
  editorEventRandom: document.querySelector("#editorEventRandom"),
  editorEventRandomValue: document.querySelector("#editorEventRandomValue"),
  editorEventOverrides: document.querySelector("#editorEventOverrides"),
  editorConsequenceOverrides: document.querySelector("#editorConsequenceOverrides"),
  editorWinType: document.querySelector("#editorWinType"),
  editorWinCount: document.querySelector("#editorWinCount"),
  editorWinCountField: document.querySelector("#editorWinCountField"),
  editorWinRep: document.querySelector("#editorWinRep"),
  editorWinRepField: document.querySelector("#editorWinRepField"),
  editorWinLabel: document.querySelector("#editorWinLabel"),
  editorLoseResources: document.querySelector("#editorLoseResources"),
  editorLoseFatigue: document.querySelector("#editorLoseFatigue"),
  editorLoseMedCritical: document.querySelector("#editorLoseMedCritical"),
  editorMedCriticalFields: document.querySelector("#editorMedCriticalFields"),
  editorMedCriticalValue: document.querySelector("#editorMedCriticalValue"),
  editorMedCriticalDays: document.querySelector("#editorMedCriticalDays"),
  editorDesc: document.querySelector("#editorDesc"),
  editorIntro: document.querySelector("#editorIntro"),
  editorResultWin: document.querySelector("#editorResultWin"),
  editorResultLose: document.querySelector("#editorResultLose"),
  editorWinTitle: document.querySelector("#editorWinTitle"),
  editorLoseTitle: document.querySelector("#editorLoseTitle"),
  editorCustomList: document.querySelector("#editorCustomList"),
  editorLoadBtn: document.querySelector("#editorLoadBtn"),
  editorResetBtn: document.querySelector("#editorResetBtn"),
  editorDeleteBtn: document.querySelector("#editorDeleteBtn"),
  editorSaveBtn: document.querySelector("#editorSaveBtn"),
  challengeModeToggle: document.querySelector("#challengeModeToggle"),
  challengeSection: document.querySelector("#challengeSection"),
  challengeBody: document.querySelector("#challengeBody"),
  challengeCodeInput: document.querySelector("#challengeCodeInput"),
  challengeGenerateBtn: document.querySelector("#challengeGenerateBtn"),
  challengeValidateBtn: document.querySelector("#challengeValidateBtn"),
  challengeStatusHint: document.querySelector("#challengeStatusHint"),
  challengeInfo: document.querySelector("#challengeInfo"),
  challengeBanner: document.querySelector("#challengeBanner"),
  challengeBannerCode: document.querySelector("#challengeBannerCode"),
  resultReportBtn: document.querySelector("#resultReportBtn"),
  reportOverlay: document.querySelector("#reportOverlay"),
  reportTitle: document.querySelector("#reportTitle"),
  reportContent: document.querySelector("#reportContent"),
  reportCloseBtn: document.querySelector("#reportCloseBtn"),
  reportCopyBtn: document.querySelector("#reportCopyBtn"),
  reportReformatBtn: document.querySelector("#reportRegenBtn"),
  reportCopyHint: document.querySelector("#reportCopyHint")
};
function renderValidation(sc) {
  const result = validateScenarioConfig(sc);
  const container = els.editorValidation;
  if (result.errors.length === 0 && result.warnings.length === 0) {
    container.innerHTML = `
      <div class="editor-validation success">
        <div class="editor-validation-title">✅ 配置检查通过</div>
        <ul class="editor-validation-list">
          <li>所有配置项正常，可以保存剧本</li>
        </ul>
      </div>
    `;
  } else if (result.errors.length > 0) {
    container.innerHTML = `
      <div class="editor-validation error">
        <div class="editor-validation-title">❌ 存在严重配置问题（${result.errors.length}项）</div>
        <ul class="editor-validation-list">
          ${result.errors.map(e => `<li>${e}</li>`).join("")}
        </ul>
        ${result.warnings.length > 0 ? `
          <div style="margin-top:10px;font-weight:700;color:#b08a28">⚠️ 警告（${result.warnings.length}项）：</div>
          <ul class="editor-validation-list">
            ${result.warnings.map(w => `<li>${w}</li>`).join("")}
          </ul>
        ` : ""}
      </div>
    `;
  } else {
    container.innerHTML = `
      <div class="editor-validation">
        <div class="editor-validation-title">⚠️ 存在配置警告（${result.warnings.length}项）</div>
        <ul class="editor-validation-list">
          ${result.warnings.map(w => `<li>${w}</li>`).join("")}
        </ul>
        <div style="margin-top:8px;font-size:12px;color:#5a6e78">警告不影响保存，但可能影响游戏体验</div>
      </div>
    `;
  }
  return result;
}
function buildRouteCheckboxHTML(routeId, isChecked, containerId) {
  const r = ALL_ROUTES_MAP[routeId];
  if (!r) return "";
  return `
    <div class="editor-checkbox">
      <input type="checkbox" id="${containerId}_${routeId}" value="${routeId}" ${isChecked ? "checked" : ""}>
      <label for="${containerId}_${routeId}">${r.name} <span style="font-size:11px;color:#8a9ea5;font-weight:400">（风险${r.risk}，奖励${r.reward}）</span></label>
    </div>
  `;
}
function renderRoutePool() {
  const html = routesBase.map(r => {
    const isChecked = currentEditorScenario && currentEditorScenario.routePool.includes(r.id);
    return buildRouteCheckboxHTML(r.id, isChecked, "routePool");
  }).join("");
  els.editorRoutePool.innerHTML = html;
}
function renderStormImmuneRoutes() {
  const html = routesBase.map(r => {
    const isChecked = currentEditorScenario && currentEditorScenario.routeMod.stormRouteImmune && currentEditorScenario.routeMod.stormRouteImmune.includes(r.id);
    return buildRouteCheckboxHTML(r.id, isChecked, "stormImmune");
  }).join("");
  els.editorStormImmuneRoutes.innerHTML = html;
}
function renderEventOverrides() {
  const overrides = currentEditorScenario ? (currentEditorScenario.eventWeightOverrides || {}) : {};
  const html = EVENTS_POOL.map(e => {
    const currentVal = overrides[e.id] !== undefined ? overrides[e.id] : 1.0;
    const catLabel = EVENT_CATEGORY_LABELS[e.category] || e.category;
    return `
      <div class="editor-event-weight-row" style="grid-template-columns: 1fr 120px;">
        <label title="${e.desc}">
          <span class="editor-tag" style="background:${e.category === 'weather' ? '#5a7fa8' : e.category === 'supply' ? '#b08a28' : e.category === 'guide' ? '#4a7c5e' : e.category === 'reputation' ? '#8a5a9e' : '#a33d31'}">${catLabel}</span>
          ${e.name}
        </label>
        <div class="editor-slider-row">
          <input type="range" id="eventOverride_${e.id}" min="0" max="300" value="${Math.round(currentVal * 100)}">
          <span class="value" id="eventOverride_${e.id}_value">${currentVal.toFixed(1)}x</span>
        </div>
      </div>
    `;
  }).join("");
  els.editorEventOverrides.innerHTML = html;
  EVENTS_POOL.forEach(e => {
    const slider = document.querySelector(`#eventOverride_${e.id}`);
    const valueEl = document.querySelector(`#eventOverride_${e.id}_value`);
    if (slider && valueEl) {
      slider.oninput = () => {
        const val = slider.value / 100;
        valueEl.textContent = val.toFixed(1) + "x";
        if (!currentEditorScenario.eventWeightOverrides) currentEditorScenario.eventWeightOverrides = {};
        if (Math.abs(val - 1.0) < 0.01) {
          delete currentEditorScenario.eventWeightOverrides[e.id];
        } else {
          currentEditorScenario.eventWeightOverrides[e.id] = val;
        }
        renderValidation(currentEditorScenario);
      };
    }
  });
}
function getConsequenceByKey(sc, eventId, choiceIndex) {
  const key = getEventChoiceKey(eventId, choiceIndex);
  const overrides = (sc && sc.consequenceOverrides) || {};
  if (Object.prototype.hasOwnProperty.call(overrides, key)) return overrides[key];
  const event = EVENTS_POOL.find(e => e.id === eventId);
  const choice = event && event.options[choiceIndex];
  return choice && choice.effects && choice.effects.consequence ? choice.effects.consequence : null;
}
function getDefaultConsequenceForType(type, event, choice) {
  const base = choice && choice.effects ? choice.effects.consequence : null;
  if (base && base.type === type) return JSON.parse(JSON.stringify(base));
  const eventName = event ? event.name : "事件";
  switch (type) {
    case "weather":
      return { type, description: eventName + "改变了后续天气", totalDays: 2, effect: { stormProb: 0.1 } };
    case "routeBlock":
      return { type, description: eventName + "影响了路线通行", totalDays: 2, effect: { routeId: "random", blockChanceMod: 0.1 } };
    case "routeStatus":
      return { type, description: eventName + "改善了路线状态", totalDays: 2, effect: { routeId: "random", rewardBonus: 1, alwaysOpen: false } };
    case "guideFatigue":
      return { type, description: eventName + "影响了向导状态", totalDays: 2, effect: { fatigueRecoveryBonus: 1 } };
    case "caravanChance":
      return { type, description: eventName + "改变了商队出现概率", totalDays: 2, effect: { caravanChanceMod: 0.1 } };
    case "resource":
      return { type, description: eventName + "带来持续补给", totalDays: 2, effect: { dailyWood: 1, dailyFood: 0, dailyMed: 0 } };
    default:
      return null;
  }
}
function renderConsequenceEffectFields(key, consequence) {
  const effect = (consequence && consequence.effect) || {};
  const routeOptions = ['<option value="random">随机可用路线</option>'].concat(routesBase.map(r => '<option value="' + r.id + '">' + r.name + '</option>')).join("");
  switch (consequence.type) {
    case "weather":
      return `
        <div class="editor-field"><label>暴雪概率修正</label><input type="number" step="0.01" min="-1" max="1" data-cons-key="${key}" data-cons-field="stormProb" value="${effect.stormProb || 0}"><div class="hint">0.1 表示 +10%，-0.08 表示 -8%</div></div>
        <div class="editor-field"><label>晴天概率修正</label><input type="number" step="0.01" min="-1" max="1" data-cons-key="${key}" data-cons-field="clearProb" value="${effect.clearProb || 0}"></div>
      `;
    case "routeBlock":
      return `
        <div class="editor-field"><label>影响路线</label><select data-cons-key="${key}" data-cons-field="routeId">${routeOptions}</select></div>
        <div class="editor-field"><label>封路概率修正</label><input type="number" step="0.01" min="-1" max="1" data-cons-key="${key}" data-cons-field="blockChanceMod" value="${effect.blockChanceMod || 0}"></div>
      `;
    case "routeStatus":
      return `
        <div class="editor-field"><label>影响路线</label><select data-cons-key="${key}" data-cons-field="routeId">${routeOptions}</select></div>
        <div class="editor-field"><label>奖励修正</label><input type="number" min="-5" max="8" data-cons-key="${key}" data-cons-field="rewardBonus" value="${effect.rewardBonus || 0}"></div>
        <div class="editor-field"><label>风险修正</label><input type="number" min="-5" max="5" data-cons-key="${key}" data-cons-field="riskMod" value="${effect.riskMod || 0}"></div>
        <label class="editor-checkbox"><input type="checkbox" data-cons-key="${key}" data-cons-field="alwaysOpen" ${effect.alwaysOpen ? "checked" : ""}><span>持续期间强制畅通</span></label>
      `;
    case "guideFatigue":
      return `
        <div class="editor-field"><label>每日恢复修正</label><input type="number" min="-5" max="5" data-cons-key="${key}" data-cons-field="fatigueRecoveryBonus" value="${effect.fatigueRecoveryBonus || 0}"></div>
        <div class="editor-field"><label>疲劳增长倍率</label><input type="number" step="0.05" min="-1" max="3" data-cons-key="${key}" data-cons-field="fatigueGainMod" value="${effect.fatigueGainMod || 0}"><div class="hint">0.2 表示 +20%</div></div>
        <div class="editor-field"><label>疲劳上限修正</label><input type="number" min="-6" max="8" data-cons-key="${key}" data-cons-field="maxFatigueMod" value="${effect.maxFatigueMod || 0}"></div>
      `;
    case "caravanChance":
      return `
        <div class="editor-field"><label>商队概率修正</label><input type="number" step="0.01" min="-1" max="1" data-cons-key="${key}" data-cons-field="caravanChanceMod" value="${effect.caravanChanceMod || 0}"><div class="hint">0.15 表示 +15%</div></div>
      `;
    case "resource":
      return `
        <div class="editor-field"><label>每日柴火</label><input type="number" min="-5" max="8" data-cons-key="${key}" data-cons-field="dailyWood" value="${effect.dailyWood || 0}"></div>
        <div class="editor-field"><label>每日干粮</label><input type="number" min="-5" max="8" data-cons-key="${key}" data-cons-field="dailyFood" value="${effect.dailyFood || 0}"></div>
        <div class="editor-field"><label>每日药品</label><input type="number" min="-5" max="8" data-cons-key="${key}" data-cons-field="dailyMed" value="${effect.dailyMed || 0}"></div>
      `;
  }
  return "";
}
function renderConsequenceOverrides() {
  if (!els.editorConsequenceOverrides || !currentEditorScenario) return;
  const overrides = currentEditorScenario.consequenceOverrides || {};
  let html = "";
  EVENTS_POOL.forEach(event => {
    event.options.forEach((choice, idx) => {
      const key = getEventChoiceKey(event.id, idx);
      const base = choice.effects && choice.effects.consequence ? choice.effects.consequence : null;
      const consequence = getConsequenceByKey(currentEditorScenario, event.id, idx);
      const type = consequence ? consequence.type : "none";
      const isCustom = Object.prototype.hasOwnProperty.call(overrides, key);
      html += `
        <div class="editor-consequence-item" data-cons-key="${key}" data-event-id="${event.id}" data-choice-index="${idx}">
          <div class="editor-consequence-item-header">
            <strong>${event.name} · ${choice.title}</strong>
            <span class="editor-tag" style="background:${isCustom ? '#b08a28' : (base ? '#5a7fa8' : '#8a9ea5')}">${isCustom ? '已覆盖' : (base ? '模板效果' : '无持续效果')}</span>
          </div>
          <div class="editor-consequence-meta">${choice.hint || ""}</div>
          <div class="editor-consequence-fields">
            <div class="editor-field">
              <label>后果类型</label>
              <select data-cons-key="${key}" data-cons-field="type">
                <option value="none" ${type === "none" ? "selected" : ""}>不触发连续后果</option>
                <option value="weather" ${type === "weather" ? "selected" : ""}>天气概率</option>
                <option value="routeBlock" ${type === "routeBlock" ? "selected" : ""}>路线封锁概率</option>
                <option value="routeStatus" ${type === "routeStatus" ? "selected" : ""}>路线状态</option>
                <option value="guideFatigue" ${type === "guideFatigue" ? "selected" : ""}>向导疲劳</option>
                <option value="caravanChance" ${type === "caravanChance" ? "selected" : ""}>商队出现概率</option>
                <option value="resource" ${type === "resource" ? "selected" : ""}>每日资源</option>
              </select>
            </div>
            <div class="editor-field">
              <label>持续天数</label>
              <input type="number" min="1" max="10" data-cons-key="${key}" data-cons-field="totalDays" value="${consequence ? consequence.totalDays || 1 : 1}" ${type === "none" ? "disabled" : ""}>
            </div>
            <div class="editor-field">
              <label>状态</label>
              <button class="secondary" data-cons-key="${key}" data-cons-action="reset" ${base ? "" : "disabled"}>恢复模板</button>
            </div>
          </div>
          <div class="editor-field" style="margin-top:8px">
            <label>后果文案</label>
            <input type="text" data-cons-key="${key}" data-cons-field="description" value="${consequence ? consequence.description || "" : ""}" ${type === "none" ? "disabled" : ""}>
          </div>
          <div class="editor-consequence-effect-grid">${consequence ? renderConsequenceEffectFields(key, consequence) : ""}</div>
        </div>
      `;
    });
  });
  els.editorConsequenceOverrides.innerHTML = html;
  els.editorConsequenceOverrides.querySelectorAll('select[data-cons-field="routeId"]').forEach(select => {
    const key = select.dataset.consKey;
    const consequence = getConsequenceByEditorKey(key);
    if (consequence && consequence.effect && consequence.effect.routeId) select.value = consequence.effect.routeId;
  });
}
function getConsequenceByEditorKey(key) {
  const item = els.editorConsequenceOverrides.querySelector(`[data-cons-key="${key}"]`);
  if (!item) return null;
  const eventId = item.dataset.eventId;
  const choiceIndex = parseInt(item.dataset.choiceIndex);
  return getConsequenceByKey(currentEditorScenario, eventId, choiceIndex);
}
function collectConsequenceOverridesFromEditor(sc) {
  const overrides = {};
  if (!els.editorConsequenceOverrides) return sc.consequenceOverrides || {};
  els.editorConsequenceOverrides.querySelectorAll(".editor-consequence-item").forEach(item => {
    const key = item.dataset.consKey;
    const eventId = item.dataset.eventId;
    const choiceIndex = parseInt(item.dataset.choiceIndex);
    const event = EVENTS_POOL.find(e => e.id === eventId);
    const choice = event && event.options[choiceIndex];
    const base = choice && choice.effects ? choice.effects.consequence : null;
    const typeEl = item.querySelector('[data-cons-field="type"]');
    const type = typeEl ? typeEl.value : "none";
    if (type === "none") {
      if (base) overrides[key] = null;
      return;
    }
    const consequence = getDefaultConsequenceForType(type, event, choice);
    consequence.totalDays = Math.max(1, parseInt(item.querySelector('[data-cons-field="totalDays"]')?.value) || consequence.totalDays || 1);
    consequence.description = item.querySelector('[data-cons-field="description"]')?.value.trim() || consequence.description;
    const effect = {};
    item.querySelectorAll("[data-cons-field]").forEach(input => {
      const field = input.dataset.consField;
      if (field === "type" || field === "totalDays" || field === "description") return;
      if (input.type === "checkbox") {
        effect[field] = input.checked;
      } else if (field === "routeId") {
        effect[field] = input.value || "random";
      } else {
        const value = parseFloat(input.value);
        if (!Number.isNaN(value)) effect[field] = value;
      }
    });
    consequence.effect = effect;
    if (!base || JSON.stringify(consequence) !== JSON.stringify(base)) overrides[key] = consequence;
  });
  return overrides;
}
function renderCustomScenarioList() {
  const custom = loadCustomScenarios();
  const customList = Object.values(custom);
  if (customList.length === 0) {
    els.editorCustomList.innerHTML = '<div class="editor-empty">暂无自定义剧本，在左侧配置后点击「保存剧本」创建第一个吧！</div>';
    return;
  }
  els.editorCustomList.innerHTML = customList.map(sc => `
    <div class="editor-scenario-item ${editingCustomId === sc.id ? 'selected' : ''}" data-id="${sc.id}">
      <div class="editor-scenario-item-header">
        <span class="editor-scenario-item-name">
          <span class="editor-tag editor-badge-custom">自定义</span>
          <span style="color:${sc.color}">${sc.name}</span>
        </span>
        <div class="editor-scenario-item-actions">
          <button class="secondary" data-action="edit" data-id="${sc.id}">编辑</button>
          <button class="btn-danger" data-action="delete" data-id="${sc.id}">删除</button>
        </div>
      </div>
      <div style="font-size:12px;color:#5a6e78;margin-bottom:4px">${sc.subtitle}</div>
      <div style="font-size:11px;color:#8a9ea5">
        目标：${sc.targetDays}天 · 路线：${sc.routePool.length}条 · 
        ${sc.win.type === 'days' ? '坚守到最后' : sc.win.type === 'caravans' ? `接应≥${sc.win.count}队` : sc.win.type === 'days_and_rep' ? `坚守+声望≥${sc.win.rep}` : `接应≥${sc.win.count}队+声望≥${sc.win.rep}`}
      </div>
    </div>
  `).join("");
  els.editorCustomList.querySelectorAll("[data-action]").forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const action = btn.dataset.action;
      const id = btn.dataset.id;
      if (action === "edit") {
        loadCustomScenarioToEditor(id);
      } else if (action === "delete") {
        if (confirm(`确定要删除自定义剧本「${custom[id].name}」吗？此操作无法撤销。`)) {
          deleteCustomScenario(id);
        }
      }
    };
  });
  els.editorCustomList.querySelectorAll(".editor-scenario-item").forEach(item => {
    item.onclick = () => {
      loadCustomScenarioToEditor(item.dataset.id);
    };
  });
}
function loadScenarioToEditor(baseScenarioId) {
  const base = SCENARIOS[baseScenarioId];
  if (!base) return;
  currentEditorScenario = JSON.parse(JSON.stringify(base));
  editingCustomId = baseScenarioId.startsWith(CUSTOM_SCENARIO_PREFIX) ? baseScenarioId : null;
  currentEditorScenario.id = editingCustomId || (CUSTOM_SCENARIO_PREFIX + Date.now());
  currentEditorScenario.isCustom = true;
  renderEditorFormFromScenario();
  renderValidation(currentEditorScenario);
}
function loadCustomScenarioToEditor(customId) {
  const custom = loadCustomScenarios();
  if (!custom[customId]) return;
  currentEditorScenario = JSON.parse(JSON.stringify(custom[customId]));
  editingCustomId = customId;
  renderEditorFormFromScenario();
  renderValidation(currentEditorScenario);
  switchEditorTab("basic");
}
function renderEditorFormFromScenario() {
  const sc = currentEditorScenario;
  if (!sc) return;
  els.editorName.value = sc.name || "";
  els.editorSubtitle.value = sc.subtitle || "";
  els.editorColor.value = sc.color || "#315c72";
  els.editorTargetDays.value = sc.targetDays || 15;
  els.editorTargetDaysValue.textContent = sc.targetDays || 15;
  els.editorEventChance.value = Math.round((sc.eventTriggerChance || 0.75) * 100);
  els.editorEventChanceValue.textContent = Math.round((sc.eventTriggerChance || 0.75) * 100) + "%";
  els.editorCaravanChance.value = Math.round((sc.routeMod.caravanChance || 0.74) * 100);
  els.editorCaravanChanceValue.textContent = Math.round((sc.routeMod.caravanChance || 0.74) * 100) + "%";
  els.editorStormBlockChance.value = Math.round((sc.routeMod.stormBlockChance || 0.33) * 100);
  els.editorStormBlockChanceValue.textContent = Math.round((sc.routeMod.stormBlockChance || 0.33) * 100) + "%";
  els.editorStartWood.value = sc.startResources.wood || 0;
  els.editorStartWoodValue.textContent = formatSign(sc.startResources.wood || 0);
  els.editorStartMed.value = sc.startResources.med || 0;
  els.editorStartMedValue.textContent = formatSign(sc.startResources.med || 0);
  els.editorStartFood.value = sc.startResources.food || 0;
  els.editorStartFoodValue.textContent = formatSign(sc.startResources.food || 0);
  els.editorStartRep.value = sc.startResources.rep || 0;
  els.editorStartRepValue.textContent = sc.startResources.rep || 0;
  els.editorFatigueBonus.value = sc.routeMod.fatigueBonus || 0;
  els.editorFatigueBonusValue.textContent = "+" + (sc.routeMod.fatigueBonus || 0);
  els.editorRewardBonus.value = sc.routeMod.rewardBonus || 0;
  els.editorRewardBonusValue.textContent = "+" + (sc.routeMod.rewardBonus || 0);
  els.editorWeatherClear.value = Math.round((sc.weatherTable.clear || 0) * 100);
  els.editorWeatherClearValue.textContent = Math.round((sc.weatherTable.clear || 0) * 100) + "%";
  els.editorWeatherWind.value = Math.round((sc.weatherTable.wind || 0) * 100);
  els.editorWeatherWindValue.textContent = Math.round((sc.weatherTable.wind || 0) * 100) + "%";
  els.editorWeatherStorm.value = Math.round((sc.weatherTable.storm || 0) * 100);
  els.editorWeatherStormValue.textContent = Math.round((sc.weatherTable.storm || 0) * 100) + "%";
  const overrideStorm = sc.weatherTable.overrideStormProb !== null ? Math.round(sc.weatherTable.overrideStormProb * 100) : 0;
  els.editorOverrideStorm.value = overrideStorm;
  els.editorOverrideStormValue.textContent = overrideStorm === 0 ? "不覆盖" : overrideStorm + "%";
  els.editorEventWeather.value = Math.round((sc.eventWeightMul.weather || 1) * 100);
  els.editorEventWeatherValue.textContent = (sc.eventWeightMul.weather || 1).toFixed(1) + "x";
  els.editorEventSupply.value = Math.round((sc.eventWeightMul.supply || 1) * 100);
  els.editorEventSupplyValue.textContent = (sc.eventWeightMul.supply || 1).toFixed(1) + "x";
  els.editorEventGuide.value = Math.round((sc.eventWeightMul.guide || 1) * 100);
  els.editorEventGuideValue.textContent = (sc.eventWeightMul.guide || 1).toFixed(1) + "x";
  els.editorEventReputation.value = Math.round((sc.eventWeightMul.reputation || 1) * 100);
  els.editorEventReputationValue.textContent = (sc.eventWeightMul.reputation || 1).toFixed(1) + "x";
  els.editorEventRandom.value = Math.round((sc.eventWeightMul.random || 1) * 100);
  els.editorEventRandomValue.textContent = (sc.eventWeightMul.random || 1).toFixed(1) + "x";
  els.editorWinType.value = sc.win.type || "days";
  els.editorWinCount.value = sc.win.count || 12;
  els.editorWinRep.value = sc.win.rep || 25;
  els.editorWinLabel.value = sc.win.label || "";
  toggleWinFields();
  els.editorLoseResources.checked = sc.lose.resources !== false;
  els.editorLoseFatigue.checked = sc.lose.fatigue !== false;
  els.editorLoseMedCritical.checked = !!sc.lose.medCritical;
  if (sc.lose.medCritical) {
    els.editorMedCriticalValue.value = sc.lose.medCritical.value || 2;
    els.editorMedCriticalDays.value = sc.lose.medCritical.days || 2;
    els.editorMedCriticalFields.style.display = "block";
  } else {
    els.editorMedCriticalFields.style.display = "none";
  }
  els.editorDesc.value = sc.desc || "";
  els.editorIntro.value = sc.intro || "";
  els.editorResultWin.value = typeof sc.resultWin === "function" ? "坚守到第{day}天，接应商队 {saved} 队，累计声望 {rep}。" : (sc.resultWinText || "");
  els.editorResultLose.value = typeof sc.resultLose === "function" ? "坚持了 {day} 天，接应 {saved} 队商队。失败原因：{reason}。" : (sc.resultLoseText || "");
  els.editorWinTitle.value = sc.winTitle || "胜利！";
  els.editorLoseTitle.value = sc.loseTitle || "失败...";
  renderRoutePool();
  renderStormImmuneRoutes();
  renderEventOverrides();
  renderConsequenceOverrides();
}
function collectScenarioFromEditor() {
  if (!currentEditorScenario) return null;
  const sc = JSON.parse(JSON.stringify(currentEditorScenario));
  sc.name = els.editorName.value.trim();
  sc.subtitle = els.editorSubtitle.value.trim();
  sc.color = els.editorColor.value;
  sc.targetDays = parseInt(els.editorTargetDays.value) || 15;
  sc.eventTriggerChance = parseInt(els.editorEventChance.value) / 100;
  sc.routeMod.caravanChance = parseInt(els.editorCaravanChance.value) / 100;
  sc.routeMod.stormBlockChance = parseInt(els.editorStormBlockChance.value) / 100;
  sc.startResources.wood = parseInt(els.editorStartWood.value) || 0;
  sc.startResources.med = parseInt(els.editorStartMed.value) || 0;
  sc.startResources.food = parseInt(els.editorStartFood.value) || 0;
  sc.startResources.rep = parseInt(els.editorStartRep.value) || 0;
  sc.routeMod.fatigueBonus = parseInt(els.editorFatigueBonus.value) || 0;
  sc.routeMod.rewardBonus = parseInt(els.editorRewardBonus.value) || 0;
  const routePool = [];
  routesBase.forEach(r => {
    const cb = document.querySelector(`#routePool_${r.id}`);
    if (cb && cb.checked) routePool.push(r.id);
  });
  sc.routePool = routePool;
  const stormImmune = [];
  routesBase.forEach(r => {
    const cb = document.querySelector(`#stormImmune_${r.id}`);
    if (cb && cb.checked) stormImmune.push(r.id);
  });
  sc.routeMod.stormRouteImmune = stormImmune.length > 0 ? stormImmune : null;
  const clear = parseInt(els.editorWeatherClear.value) / 100;
  const wind = parseInt(els.editorWeatherWind.value) / 100;
  const storm = parseInt(els.editorWeatherStorm.value) / 100;
  const total = clear + wind + storm;
  if (total > 0) {
    sc.weatherTable.clear = clear / total;
    sc.weatherTable.wind = wind / total;
    sc.weatherTable.storm = storm / total;
  }
  const overrideVal = parseInt(els.editorOverrideStorm.value);
  sc.weatherTable.overrideStormProb = overrideVal > 0 ? (overrideVal / 100) : null;
  sc.eventWeightMul.weather = parseInt(els.editorEventWeather.value) / 100;
  sc.eventWeightMul.supply = parseInt(els.editorEventSupply.value) / 100;
  sc.eventWeightMul.guide = parseInt(els.editorEventGuide.value) / 100;
  sc.eventWeightMul.reputation = parseInt(els.editorEventReputation.value) / 100;
  sc.eventWeightMul.random = parseInt(els.editorEventRandom.value) / 100;
  sc.consequenceOverrides = collectConsequenceOverridesFromEditor(sc);
  sc.win.type = els.editorWinType.value;
  if (sc.win.type === "caravans" || sc.win.type === "caravans_and_rep") {
    sc.win.count = parseInt(els.editorWinCount.value) || 10;
  } else {
    delete sc.win.count;
  }
  if (sc.win.type === "days_and_rep" || sc.win.type === "caravans_and_rep") {
    sc.win.rep = parseInt(els.editorWinRep.value) || 20;
  } else {
    delete sc.win.rep;
  }
  sc.win.label = els.editorWinLabel.value.trim() || getDefaultWinLabel(sc.win);
  sc.lose.resources = els.editorLoseResources.checked;
  sc.lose.fatigue = els.editorLoseFatigue.checked;
  if (els.editorLoseMedCritical.checked) {
    sc.lose.medCritical = {
      value: parseInt(els.editorMedCriticalValue.value) || 2,
      days: parseInt(els.editorMedCriticalDays.value) || 2
    };
  } else {
    delete sc.lose.medCritical;
  }
  sc.desc = els.editorDesc.value.trim();
  sc.intro = els.editorIntro.value.trim();
  sc.resultWinText = els.editorResultWin.value.trim();
  sc.resultLoseText = els.editorResultLose.value.trim();
  sc.resultWin = function(game) {
    return (sc.resultWinText || "坚守到第{day}天，接应商队 {saved} 队，累计声望 {rep}。")
      .replace(/{day}/g, game.day)
      .replace(/{saved}/g, game.saved)
      .replace(/{rep}/g, game.rep);
  };
  sc.resultLose = function(game) {
    return (sc.resultLoseText || "坚持了 {day} 天，接应 {saved} 队商队。失败原因：{reason}。")
      .replace(/{day}/g, game.day)
      .replace(/{saved}/g, game.saved)
      .replace(/{reason}/g, game.failureReason || "未知");
  };
  sc.winTitle = els.editorWinTitle.value.trim() || "胜利！";
  sc.loseTitle = els.editorLoseTitle.value.trim() || "失败...";
  return sc;
}
function getDefaultWinLabel(win) {
  switch (win.type) {
    case "days": return "坚守到最后";
    case "caravans": return "接应足够商队";
    case "days_and_rep": return "熬到目标达成";
    case "caravans_and_rep": return "救出足够商队";
    default: return "达成目标";
  }
}
function toggleWinFields() {
  const type = els.editorWinType.value;
  els.editorWinCountField.style.display = (type === "caravans" || type === "caravans_and_rep") ? "block" : "none";
  els.editorWinRepField.style.display = (type === "days_and_rep" || type === "caravans_and_rep") ? "block" : "none";
}
function switchEditorTab(tabId) {
  document.querySelectorAll(".editor-tab").forEach(t => {
    t.classList.toggle("active", t.dataset.tab === tabId);
  });
  document.querySelectorAll(".editor-section").forEach(s => {
    s.classList.toggle("active", s.id === "editor-" + tabId);
  });
  if (tabId === "manage") {
    renderCustomScenarioList();
  }
}
function openEditor() {
  loadScenarioToEditor("standard");
  renderCustomScenarioList();
  els.editorOverlay.classList.remove("hidden");
}
function closeEditor() {
  els.editorOverlay.classList.add("hidden");
  editingCustomId = null;
  currentEditorScenario = null;
  renderScenarioOptions();
}
function deleteCustomScenario(id) {
  const custom = loadCustomScenarios();
  if (custom[id]) {
    delete custom[id];
    saveCustomScenarios(custom);
    if (editingCustomId === id) {
      editingCustomId = null;
      loadScenarioToEditor("standard");
    }
    renderCustomScenarioList();
    renderScenarioOptions();
  }
}
function saveCurrentScenario() {
  const sc = collectScenarioFromEditor();
  if (!sc) return;
  const validation = renderValidation(sc);
  if (!validation.isValid) {
    alert("存在严重配置问题，请先修复后再保存：\n\n" + validation.errors.map((e, i) => `${i + 1}. ${e}`).join("\n"));
    return;
  }
  if (!sc.name || sc.name.trim().length === 0) {
    alert("请输入剧本名称");
    return;
  }
  if (!editingCustomId) {
    editingCustomId = CUSTOM_SCENARIO_PREFIX + Date.now();
    sc.id = editingCustomId;
  }
  const custom = loadCustomScenarios();
  const savedSc = { ...sc };
  savedSc.resultWinText = els.editorResultWin.value.trim() || "坚守到第{day}天，接应商队 {saved} 队，累计声望 {rep}。";
  savedSc.resultLoseText = els.editorResultLose.value.trim() || "坚持了 {day} 天，接应 {saved} 队商队。失败原因：{reason}。";
  savedSc.resultWin = undefined;
  savedSc.resultLose = undefined;
  custom[editingCustomId] = savedSc;
  saveCustomScenarios(custom);
  currentEditorScenario = sc;
  currentEditorScenario.resultWin = function(game) {
    return (savedSc.resultWinText || "坚守到第{day}天，接应商队 {saved} 队，累计声望 {rep}。")
      .replace(/{day}/g, game.day)
      .replace(/{saved}/g, game.saved)
      .replace(/{rep}/g, game.rep);
  };
  currentEditorScenario.resultLose = function(game) {
    return (savedSc.resultLoseText || "坚持了 {day} 天，接应 {saved} 队商队。失败原因：{reason}。")
      .replace(/{day}/g, game.day)
      .replace(/{saved}/g, game.saved)
      .replace(/{reason}/g, game.failureReason || "未知");
  };
  alert(`剧本「${sc.name}」已保存！`);
  renderCustomScenarioList();
  renderScenarioOptions();
}
function setupEditorEventListeners() {
  els.editorBtn.onclick = openEditor;
  els.editorCloseBtn.onclick = closeEditor;
  els.editorTabs.querySelectorAll(".editor-tab").forEach(tab => {
    tab.onclick = () => switchEditorTab(tab.dataset.tab);
  });
  els.editorBaseScenario.onchange = () => {
    loadScenarioToEditor(els.editorBaseScenario.value);
  };
  els.editorLoadBtn.onclick = () => {
    loadScenarioToEditor(els.editorBaseScenario.value);
  };
  els.editorResetBtn.onclick = () => {
    if (confirm("确定要重置当前所有编辑吗？")) {
      loadScenarioToEditor(els.editorBaseScenario.value);
    }
  };
  els.editorDeleteBtn.onclick = () => {
    if (!editingCustomId) {
      alert("当前没有在编辑已保存的自定义剧本");
      return;
    }
    const custom = loadCustomScenarios();
    const sc = custom[editingCustomId];
    if (!sc) return;
    if (confirm(`确定要删除自定义剧本「${sc.name}」吗？此操作无法撤销。`)) {
      deleteCustomScenario(editingCustomId);
    }
  };
  els.editorSaveBtn.onclick = saveCurrentScenario;
  const bindSlider = (sliderEl, valueEl, formatFn) => {
    sliderEl.oninput = () => {
      valueEl.textContent = formatFn(sliderEl.value);
      if (currentEditorScenario) {
        currentEditorScenario = collectScenarioFromEditor();
        renderValidation(currentEditorScenario);
      }
    };
  };
  bindSlider(els.editorTargetDays, els.editorTargetDaysValue, v => v);
  bindSlider(els.editorEventChance, els.editorEventChanceValue, v => v + "%");
  bindSlider(els.editorCaravanChance, els.editorCaravanChanceValue, v => v + "%");
  bindSlider(els.editorStormBlockChance, els.editorStormBlockChanceValue, v => v + "%");
  bindSlider(els.editorStartWood, els.editorStartWoodValue, v => formatSign(parseInt(v)));
  bindSlider(els.editorStartMed, els.editorStartMedValue, v => formatSign(parseInt(v)));
  bindSlider(els.editorStartFood, els.editorStartFoodValue, v => formatSign(parseInt(v)));
  bindSlider(els.editorStartRep, els.editorStartRepValue, v => v);
  bindSlider(els.editorFatigueBonus, els.editorFatigueBonusValue, v => "+" + v);
  bindSlider(els.editorRewardBonus, els.editorRewardBonusValue, v => "+" + v);
  bindSlider(els.editorWeatherClear, els.editorWeatherClearValue, v => v + "%");
  bindSlider(els.editorWeatherWind, els.editorWeatherWindValue, v => v + "%");
  bindSlider(els.editorWeatherStorm, els.editorWeatherStormValue, v => v + "%");
  bindSlider(els.editorOverrideStorm, els.editorOverrideStormValue, v => parseInt(v) === 0 ? "不覆盖" : v + "%");
  bindSlider(els.editorEventWeather, els.editorEventWeatherValue, v => (parseInt(v) / 100).toFixed(1) + "x");
  bindSlider(els.editorEventSupply, els.editorEventSupplyValue, v => (parseInt(v) / 100).toFixed(1) + "x");
  bindSlider(els.editorEventGuide, els.editorEventGuideValue, v => (parseInt(v) / 100).toFixed(1) + "x");
  bindSlider(els.editorEventReputation, els.editorEventReputationValue, v => (parseInt(v) / 100).toFixed(1) + "x");
  bindSlider(els.editorEventRandom, els.editorEventRandomValue, v => (parseInt(v) / 100).toFixed(1) + "x");
  ["editorName", "editorSubtitle", "editorDesc", "editorIntro", "editorResultWin", "editorResultLose", "editorWinLabel", "editorWinTitle", "editorLoseTitle"].forEach(id => {
    els[id].oninput = () => {
      if (currentEditorScenario) {
        currentEditorScenario = collectScenarioFromEditor();
        renderValidation(currentEditorScenario);
      }
    };
  });
  ["editorWinType", "editorWinCount", "editorWinRep", "editorMedCriticalValue", "editorMedCriticalDays"].forEach(id => {
    els[id].onchange = () => {
      if (currentEditorScenario) {
        currentEditorScenario = collectScenarioFromEditor();
        renderValidation(currentEditorScenario);
      }
    };
  });
  els.editorWinType.onchange = () => {
    toggleWinFields();
    if (currentEditorScenario) {
      currentEditorScenario = collectScenarioFromEditor();
      renderValidation(currentEditorScenario);
    }
  };
  els.editorLoseMedCritical.onchange = () => {
    els.editorMedCriticalFields.style.display = els.editorLoseMedCritical.checked ? "block" : "none";
    if (currentEditorScenario) {
      currentEditorScenario = collectScenarioFromEditor();
      renderValidation(currentEditorScenario);
    }
  };
  ["editorLoseResources", "editorLoseFatigue", "editorLoseMedCritical"].forEach(id => {
    els[id].onchange = () => {
      if (currentEditorScenario) {
        currentEditorScenario = collectScenarioFromEditor();
        renderValidation(currentEditorScenario);
      }
    };
  });
  els.editorColor.onchange = () => {
    if (currentEditorScenario) {
      currentEditorScenario.color = els.editorColor.value;
      renderValidation(currentEditorScenario);
    }
  };
  const bindRouteCheckboxes = (containerId) => {
    const container = containerId === "routePool" ? els.editorRoutePool : els.editorStormImmuneRoutes;
    container.addEventListener("change", (e) => {
      if (e.target && e.target.type === "checkbox") {
        if (currentEditorScenario) {
          currentEditorScenario = collectScenarioFromEditor();
          renderValidation(currentEditorScenario);
        }
      }
    });
  };
  bindRouteCheckboxes("routePool");
  bindRouteCheckboxes("stormImmune");
  els.editorConsequenceOverrides.addEventListener("change", (e) => {
    if (!e.target || !e.target.dataset.consField || !currentEditorScenario) return;
    currentEditorScenario = collectScenarioFromEditor();
    if (e.target.dataset.consField === "type") {
      const item = e.target.closest(".editor-consequence-item");
      const event = EVENTS_POOL.find(ev => ev.id === item.dataset.eventId);
      const choice = event && event.options[parseInt(item.dataset.choiceIndex)];
      const key = item.dataset.consKey;
      if (e.target.value === "none") {
        if (!currentEditorScenario.consequenceOverrides) currentEditorScenario.consequenceOverrides = {};
        currentEditorScenario.consequenceOverrides[key] = null;
      } else {
        if (!currentEditorScenario.consequenceOverrides) currentEditorScenario.consequenceOverrides = {};
        currentEditorScenario.consequenceOverrides[key] = getDefaultConsequenceForType(e.target.value, event, choice);
      }
      renderConsequenceOverrides();
    }
    renderValidation(currentEditorScenario);
  });
  els.editorConsequenceOverrides.addEventListener("input", (e) => {
    if (!e.target || !e.target.dataset.consField || !currentEditorScenario) return;
    currentEditorScenario = collectScenarioFromEditor();
    renderValidation(currentEditorScenario);
  });
  els.editorConsequenceOverrides.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-cons-action='reset']");
    if (!btn || !currentEditorScenario) return;
    if (!currentEditorScenario.consequenceOverrides) currentEditorScenario.consequenceOverrides = {};
    delete currentEditorScenario.consequenceOverrides[btn.dataset.consKey];
    renderConsequenceOverrides();
    renderValidation(currentEditorScenario);
  });
}
function buildScenarioCardHTML(sc, isSelected) {
  const routes = getScenarioRoutes(sc.id);
  const routeNames = routes.map(r => r.name).join("、");
  let winDesc = "";
  switch (sc.win.type) {
    case "days": winDesc = "坚守 " + sc.targetDays + " 天"; break;
    case "caravans": winDesc = sc.targetDays + " 天内接应 ≥" + sc.win.count + " 队"; break;
    case "days_and_rep": winDesc = "坚守 " + sc.targetDays + " 天 且 声望 ≥" + sc.win.rep; break;
    case "caravans_and_rep": winDesc = sc.targetDays + " 天内接应 ≥" + sc.win.count + " 队 且 声望 ≥" + sc.win.rep; break;
  }
  const isCustom = sc.id && sc.id.startsWith(CUSTOM_SCENARIO_PREFIX);
  const progress = getScenarioAchievementProgress(sc.id);
  const achvList = ACHIEVEMENTS[sc.id] || [];
  let achvIconsHtml = '<div class="scenario-achievements">';
  achvIconsHtml += '<div style="display:flex;justify-content:space-between;align-items:center"><span style="font-size:11px;color:#5a6e78;font-weight:700">剧本成就</span><span style="font-size:11px;color:#5a6e78">' + progress.unlocked + '/' + progress.total + '</span></div>';
  achvIconsHtml += '<div class="scenario-achv-row">';
  achvList.forEach(achv => {
    const unlocked = isAchievementUnlocked(sc.id, achv.id);
    achvIconsHtml += '<div class="scenario-achv-icon ' + (unlocked ? 'unlocked' : 'locked') + '" title="' + achv.name + '：' + achv.desc + '">' + achv.icon + '</div>';
  });
  achvIconsHtml += '</div></div>';
  const customBadge = isCustom ? '<span class="editor-tag editor-badge-custom" style="margin-bottom:6px">自定义</span>' : '';
  return '<div class="scenario-card ' + (isSelected ? 'selected' : '') + '" data-scenario="' + sc.id + '" style="border-color:' + (isSelected ? sc.color : '') + '">' +
    customBadge +
    '<span class="scenario-subtitle" style="background:' + sc.color + '">' + sc.subtitle + '</span>' +
    '<h3 class="scenario-title" style="color:' + sc.color + '">' + sc.name + '</h3>' +
    '<p class="scenario-desc">' + sc.desc + '</p>' +
    '<div class="scenario-info">' +
    '<div class="scenario-info-row"><span>目标</span><span><b>' + winDesc + '</b></span></div>' +
    '<div class="scenario-info-row"><span>可用路线</span><span>' + routeNames + '</span></div>' +
    '<div class="scenario-info-row"><span>事件频率</span><span>' + Math.round(sc.eventTriggerChance * 100) + '%</span></div>' +
    achvIconsHtml +
    '</div></div>';
}
function renderScenarioOptions() {
  if (!els.scenarioOptions) return;
  const allScenarios = getAllScenarios();
  const html = Object.values(allScenarios).map(sc => buildScenarioCardHTML(sc, sc.id === chosenScenario)).join("");
  els.scenarioOptions.innerHTML = html;
  document.querySelectorAll(".scenario-card").forEach(card => {
    card.onclick = () => {
      chosenScenario = card.dataset.scenario;
      renderScenarioOptions();
    };
  });
}
function showDiffPicker() {
  els.overlay.classList.add("hidden");
  els.diffOverlay.classList.remove("hidden");
  renderScenarioOptions();
  document.querySelectorAll(".diff-card").forEach(c => c.classList.toggle("selected", c.dataset.diff === chosenDiff));
}
document.querySelectorAll(".diff-card").forEach(card => {
  card.onclick = () => {
    chosenDiff = card.dataset.diff;
    document.querySelectorAll(".diff-card").forEach(c => c.classList.toggle("selected", c.dataset.diff === chosenDiff));
  };
});
document.querySelector("#startBtn").onclick = () => {
  if (challengeMode) {
    const raw = els.challengeCodeInput ? els.challengeCodeInput.value.trim() : "";
    if (!raw) {
      if (els.challengeStatusHint) els.challengeStatusHint.textContent = "挑战码模式下请先输入或生成挑战码";
      if (els.challengeStatusHint) els.challengeStatusHint.className = "challenge-status-hint challenge-error";
      return;
    }
    const decoded = decodeChallengeCode(raw);
    if (!decoded || !decoded.valid) {
      if (els.challengeStatusHint) els.challengeStatusHint.textContent = "挑战码无效，请检查或重新生成";
      if (els.challengeStatusHint) els.challengeStatusHint.className = "challenge-status-hint challenge-error";
      return;
    }
    if (decoded.scenarioId !== chosenScenario) {
      if (els.challengeStatusHint) els.challengeStatusHint.textContent = "该挑战码对应剧本：" + (decoded.scenarioId || "未知") + "，请切换到对应剧本";
      if (els.challengeStatusHint) els.challengeStatusHint.className = "challenge-status-hint challenge-error";
      return;
    }
    if (decoded.difficulty !== chosenDiff) {
      if (els.challengeStatusHint) els.challengeStatusHint.textContent = "该挑战码对应难度：" + (DIFF[decoded.difficulty] ? DIFF[decoded.difficulty].label : "未知") + "，请切换到对应难度";
      if (els.challengeStatusHint) els.challengeStatusHint.className = "challenge-status-hint challenge-error";
      return;
    }
    currentChallengeCode = decoded.formatted;
  } else {
    currentChallengeCode = null;
  }
  els.diffOverlay.classList.add("hidden");
  fresh(chosenDiff);
};
function formatChallengeCodeInput(value) {
  if (!value) return "";
  let cleaned = value.toUpperCase().replace(/[^A-Z2-9]/g, "");
  if (cleaned.length > 7) cleaned = cleaned.slice(0, 7);
  const parts = [];
  if (cleaned.length > 0) parts.push(cleaned.slice(0, Math.min(3, cleaned.length)));
  if (cleaned.length > 3) parts.push(cleaned.slice(3, Math.min(5, cleaned.length)));
  if (cleaned.length > 5) parts.push(cleaned.slice(5, cleaned.length));
  return parts.join("-");
}
function updateChallengeMatchHighlight() {
  if (!els.challengeCodeInput || !els.challengeStatusHint) return;
  const raw = els.challengeCodeInput.value.trim();
  if (!raw) {
    els.challengeStatusHint.textContent = challengeMode ? "请输入或点击生成挑战码" : "关闭挑战模式即可使用完全随机的常规模式";
    els.challengeStatusHint.className = "challenge-status-hint";
    return;
  }
  const decoded = decodeChallengeCode(raw);
  if (!decoded) {
    els.challengeStatusHint.textContent = "挑战码格式错误（应为 ABC-DE-FG 格式的 7 字符码）";
    els.challengeStatusHint.className = "challenge-status-hint challenge-error";
    return;
  }
  if (!decoded.valid) {
    els.challengeStatusHint.textContent = "挑战码无效（校验位不匹配）";
    els.challengeStatusHint.className = "challenge-status-hint challenge-error";
    return;
  }
  let message = "挑战码有效 ✓";
  let cls = "challenge-status-hint challenge-success";
  if (decoded.scenarioId !== chosenScenario) {
    const scName = getAllScenarios()[decoded.scenarioId] ? getAllScenarios()[decoded.scenarioId].name : decoded.scenarioId;
    message += "｜剧本：" + scName + "（当前不一致）";
    cls = "challenge-status-hint challenge-warn";
  } else if (decoded.difficulty !== chosenDiff) {
    const dName = DIFF[decoded.difficulty] ? DIFF[decoded.difficulty].label : decoded.difficulty;
    message += "｜难度：" + dName + "（当前不一致）";
    cls = "challenge-status-hint challenge-warn";
  } else {
    message += "｜剧本与难度匹配 ✓";
  }
  els.challengeStatusHint.textContent = message;
  els.challengeStatusHint.className = cls;
}
if (els.challengeModeToggle) {
  els.challengeModeToggle.onchange = () => {
    challengeMode = els.challengeModeToggle.checked;
    if (els.challengeSection) els.challengeSection.style.opacity = challengeMode ? "1" : "0.6";
    if (els.challengeBody) els.challengeBody.classList.toggle("active", challengeMode);
    updateChallengeMatchHighlight();
  };
  if (els.challengeBody) els.challengeBody.classList.toggle("active", els.challengeModeToggle.checked);
  if (els.challengeSection) els.challengeSection.style.opacity = els.challengeModeToggle.checked ? "1" : "0.6";
  updateChallengeMatchHighlight();
}
if (els.challengeGenerateBtn) {
  els.challengeGenerateBtn.onclick = () => {
    const seedNum = generateRandomSeed();
    const code = encodeChallengeCode(chosenScenario, chosenDiff, seedNum);
    currentChallengeCode = code;
    if (els.challengeCodeInput) els.challengeCodeInput.value = code;
    updateChallengeMatchHighlight();
  };
}
if (els.challengeValidateBtn) {
  els.challengeValidateBtn.onclick = () => {
    const raw = els.challengeCodeInput ? els.challengeCodeInput.value.trim() : "";
    if (!raw) {
      updateChallengeMatchHighlight();
      return;
    }
    const decoded = decodeChallengeCode(raw);
    if (decoded && decoded.valid) {
      els.challengeCodeInput.value = decoded.formatted;
    }
    updateChallengeMatchHighlight();
  };
}
if (els.challengeCodeInput) {
  els.challengeCodeInput.addEventListener("input", (e) => {
    const pos = e.target.selectionStart;
    const oldLen = e.target.value.length;
    e.target.value = formatChallengeCodeInput(e.target.value);
    const newLen = e.target.value.length;
    const diff = newLen - oldLen;
    try { e.target.setSelectionRange(pos + diff, pos + diff); } catch (err) {}
    updateChallengeMatchHighlight();
  });
  els.challengeCodeInput.addEventListener("blur", () => {
    const raw = els.challengeCodeInput.value.trim();
    const decoded = decodeChallengeCode(raw);
    if (decoded && decoded.valid) {
      els.challengeCodeInput.value = decoded.formatted;
    }
    updateChallengeMatchHighlight();
  });
}
function checkEventConditions(event) {
  const c = event.conditions || {};
  if (c.minDay && game.day < c.minDay) return false;
  if (c.maxDay && game.day > c.maxDay) return false;
  if (c.minMed && game.med < c.minMed) return false;
  if (c.minRep && game.rep < c.minRep) return false;
  if (c.minFood && game.food < c.minFood) return false;
  if (c.minWood && game.wood < c.minWood) return false;
  return true;
}
function getResourceLevel(value, low, high) {
  if (value <= low) return "low";
  if (value >= high) return "high";
  return "medium";
}
function calculateEventWeight(event) {
  const sc = game.scenarioConfig;
  let weight = event.baseWeight;
  if (sc.eventWeightMul && sc.eventWeightMul[event.category]) {
    weight *= sc.eventWeightMul[event.category];
  }
  if (sc.eventWeightOverrides && sc.eventWeightOverrides[event.id]) {
    weight *= sc.eventWeightOverrides[event.id];
  }
  const mod = event.weightMod || {};
  if (mod.weather && mod.weather[game.weather] !== undefined) {
    weight *= mod.weather[game.weather];
  }
  if (mod.diff && mod.diff[game.diff] !== undefined) {
    weight *= mod.diff[game.diff];
  }
  if (mod.med) {
    const level = getResourceLevel(game.med, 4, 10);
    if (mod.med[level] !== undefined) weight *= mod.med[level];
  }
  if (mod.food) {
    const level = getResourceLevel(game.food, 10, 25);
    if (mod.food[level] !== undefined) weight *= mod.food[level];
  }
  if (mod.wood) {
    const level = getResourceLevel(game.wood, 8, 20);
    if (mod.wood[level] !== undefined) weight *= mod.wood[level];
  }
  if (mod.rep) {
    const level = getResourceLevel(game.rep, 3, 15);
    if (mod.rep[level] !== undefined) weight *= mod.rep[level];
  }
  if (mod.guideFatigue) {
    const avgFatigue = game.guides.reduce((sum, g) => sum + g.fatigue, 0) / game.guides.length;
    const level = getResourceLevel(avgFatigue, 2, 6);
    if (mod.guideFatigue[level] !== undefined) weight *= mod.guideFatigue[level];
  }
  return Math.max(0.1, weight);
}
function drawEvent() {
  const sc = game.scenarioConfig;
  const eligible = EVENTS_POOL.filter(e => checkEventConditions(e));
  if (eligible.length === 0) return null;
  if (game.day === 1) return null;
  if (rand() > sc.eventTriggerChance) return null;
  const totalWeight = eligible.reduce((sum, e) => sum + calculateEventWeight(e), 0);
  let random = rand() * totalWeight;
  for (const event of eligible) {
    random -= calculateEventWeight(event);
    if (random <= 0) return event;
  }
  return eligible[0];
}
function getEffectiveEventConsequence(event, choiceIndex) {
  const sc = game && game.scenarioConfig ? game.scenarioConfig : {};
  const overrides = sc.consequenceOverrides || {};
  const key = getEventChoiceKey(event.id, choiceIndex);
  if (Object.prototype.hasOwnProperty.call(overrides, key)) {
    return overrides[key] ? JSON.parse(JSON.stringify(overrides[key])) : null;
  }
  const choice = event.options[choiceIndex];
  return choice.effects && choice.effects.consequence ? JSON.parse(JSON.stringify(choice.effects.consequence)) : null;
}
function getEffectiveEventEffects(event, choiceIndex) {
  const effects = { ...event.options[choiceIndex].effects };
  const consequence = getEffectiveEventConsequence(event, choiceIndex);
  if (consequence) effects.consequence = consequence;
  else delete effects.consequence;
  return effects;
}
function renderEvent(event) {
  els.eventCategory.textContent = EVENT_CATEGORY_LABELS[event.category];
  els.eventCategory.className = "event-category " + event.category;
  els.eventTitle.textContent = event.name;
  els.eventDesc.textContent = event.desc;
  els.eventOptions.innerHTML = event.options.map((opt, i) => {
    const effectTags = getEffectTags(getEffectiveEventEffects(event, i));
    return '<div class="event-option" data-choice="' + i + '">' +
      '<div class="event-option-title">' + opt.title + '</div>' +
      '<div class="event-option-hint">' + opt.hint + '</div>' +
      '<div style="margin-top:6px">' + effectTags + '</div>' +
      '</div>';
  }).join("");
  document.querySelectorAll(".event-option").forEach(btn => {
    btn.onclick = () => resolveEvent(parseInt(btn.dataset.choice));
  });
  els.eventOverlay.classList.remove("hidden");
}
function getEffectTags(effects) {
  let tags = "";
  if (effects.wood > 0) tags += '<span class="event-tag tag-good">柴+' + effects.wood + '</span>';
  if (effects.wood < 0) tags += '<span class="event-tag tag-bad">柴' + effects.wood + '</span>';
  if (effects.food > 0) tags += '<span class="event-tag tag-good">粮+' + effects.food + '</span>';
  if (effects.food < 0) tags += '<span class="event-tag tag-bad">粮' + effects.food + '</span>';
  if (effects.med > 0) tags += '<span class="event-tag tag-good">药+' + effects.med + '</span>';
  if (effects.med < 0) tags += '<span class="event-tag tag-bad">药' + effects.med + '</span>';
  if (effects.rep > 0) tags += '<span class="event-tag tag-good">声望+' + effects.rep + '</span>';
  if (effects.rep < 0) tags += '<span class="event-tag tag-bad">声望' + effects.rep + '</span>';
  if (effects.consequence) tags += '<span class="event-tag tag-neutral">持续' + effects.consequence.totalDays + '天</span>';
  if (effects.routeEffect) tags += '<span class="event-tag tag-neutral">路线影响</span>';
  if (effects.guideEffect) tags += '<span class="event-tag tag-neutral">向导影响</span>';
  return tags || '<span class="event-tag tag-neutral">无直接影响</span>';
}
function resolveEvent(choiceIndex) {
  const event = pendingEvent;
  const choice = event.options[choiceIndex];
  const effects = getEffectiveEventEffects(event, choiceIndex);
  if (effects.wood) { game.wood += effects.wood; recordResourceChange("wood", effects.wood, "【事件】" + event.name + "：" + choice.title); }
  if (effects.food) { game.food += effects.food; recordResourceChange("food", effects.food, "【事件】" + event.name + "：" + choice.title); }
  if (effects.med) { game.med += effects.med; recordResourceChange("med", effects.med, "【事件】" + event.name + "：" + choice.title); }
  if (effects.rep) { game.rep += effects.rep; recordResourceChange("rep", effects.rep, "【事件】" + event.name + "：" + choice.title); }
  if (effects.consequence) {
    registerConsequence({
      sourceEventId: event.id,
      sourceEventName: event.name,
      sourceChoice: choice.title,
      type: effects.consequence.type,
      description: effects.consequence.description,
      totalDays: effects.consequence.totalDays,
      effect: effects.consequence.effect
    })
  }
  if (effects.routeEffect) applyRouteEffect(effects.routeEffect);
  if (effects.guideEffect) applyGuideEffect(effects.guideEffect);
  if (game.currentDayData) {
    game.currentDayData.eventChoice = {
      choiceIndex: choiceIndex,
      title: choice.title,
      hint: choice.hint,
      log: effects.log
    };
    recordReplayLog("【事件】" + event.name + "：" + effects.log);
  }
  if (!game.eventCodex[event.id]) {
    game.eventCodex[event.id] = { name: event.name, category: event.category, desc: event.desc, seen: 0, choices: {} };
  }
  game.eventCodex[event.id].seen++;
  const choiceKey = "choice_" + choiceIndex;
  if (!game.eventCodex[event.id].choices[choiceKey]) {
    game.eventCodex[event.id].choices[choiceKey] = { title: choice.title, count: 0 };
  }
  game.eventCodex[event.id].choices[choiceKey].count++;
  game.eventStats.triggered++;
  game.eventStats.byCategory[event.category] = (game.eventStats.byCategory[event.category] || 0) + 1;
  game.log.unshift("第" + game.day + "天【事件】" + event.name + "：" + effects.log);
  pendingEvent = null;
  els.eventOverlay.classList.add("hidden");
  if (game.wood < game.minResources.wood) game.minResources.wood = game.wood;
  if (game.med < game.minResources.med) game.minResources.med = game.med;
  if (game.food < game.minResources.food) game.minResources.food = game.food;
  const lc = game.scenarioConfig.lose || {};
  if (lc.resources) {
    if (game.food < 0) { game.failureReason = "粮食耗尽"; return finish(false); }
    if (game.wood < 0) { game.failureReason = "柴火耗尽"; return finish(false); }
    if (game.med < 0) { game.failureReason = "药品耗尽"; return finish(false); }
  }
  render();
}
function registerConsequence(consequenceData) {
  var effect = consequenceData.effect || {}
  if (consequenceData.type === "routeBlock" && effect.routeId === "random") {
    var available = game.routes.filter(function(r) { return !r.blocked })
    if (available.length > 0) {
      effect.routeId = randChoice(available).id
    } else {
      effect.routeId = randChoice(game.routes).id
    }
  }
  if (consequenceData.type === "routeStatus" && effect.routeId === "random") {
    var available2 = game.routes.filter(function(r) { return !r.blocked })
    if (available2.length > 0) {
      effect.routeId = randChoice(available2).id
    } else {
      effect.routeId = randChoice(game.routes).id
    }
  }
  var id = "cons_" + consequenceData.sourceEventId + "_" + game.day
  var existing = game.activeConsequences.find(function(c) { return c.id === id })
  if (existing) id = id + "_" + Date.now()
  var routeName = ""
  if (effect.routeId && effect.routeId !== "random") {
    var r = ALL_ROUTES_MAP[effect.routeId]
    routeName = r ? r.name : ""
  }
  var newCons = {
    id: id,
    sourceEventId: consequenceData.sourceEventId || "",
    sourceEventName: consequenceData.sourceEventName || "",
    sourceChoice: consequenceData.sourceChoice || "",
    triggerDay: game.day,
    remainingDays: consequenceData.totalDays || 1,
    totalDays: consequenceData.totalDays || 1,
    type: consequenceData.type || "weather",
    description: consequenceData.description || "",
    effect: JSON.parse(JSON.stringify(effect)),
    routeName: routeName,
    expiredDay: null,
    effectSummary: buildConsequenceEffectSummary(consequenceData.type, effect, routeName)
  }
  game.activeConsequences.push(newCons)
  var triggerMsg = "触发持续效果：「" + newCons.description + "」（来自【" + newCons.sourceEventName + "】的选择「" + newCons.sourceChoice + "」，持续" + newCons.totalDays + "天）"
  game.log.unshift("第" + game.day + "天" + triggerMsg)
  recordReplayLog(triggerMsg)
  if (!game.consequenceHistory) game.consequenceHistory = []
  game.consequenceHistory.push({
    id: newCons.id,
    event: "triggered",
    day: game.day,
    consequence: JSON.parse(JSON.stringify(newCons))
  })
  if (game.currentDayData) {
    game.currentDayData.consequencesTriggered.push(JSON.parse(JSON.stringify(newCons)))
  }
}
function buildConsequenceEffectSummary(type, effect, routeName) {
  var parts = []
  switch (type) {
    case "weather":
      if (effect.stormProb !== undefined) {
        var v = Math.round(effect.stormProb * 100)
        parts.push((v > 0 ? "暴雪概率+" : "暴雪概率") + v + "%")
      }
      if (effect.clearProb !== undefined) {
        var v2 = Math.round(effect.clearProb * 100)
        parts.push("天晴概率+" + v2 + "%")
      }
      break
    case "routeBlock":
      if (effect.blockChanceMod !== undefined) {
        var v3 = Math.round(effect.blockChanceMod * 100)
        var rn = routeName || "路线"
        parts.push(rn + "封路概率" + (v3 > 0 ? "+" : "") + v3 + "%")
      }
      break
    case "routeStatus":
      if (effect.rewardBonus !== undefined) {
        var rn2 = routeName || "路线"
        parts.push(rn2 + "奖励声望+" + effect.rewardBonus)
      }
      if (effect.riskMod !== undefined) {
        var rn3 = routeName || "路线"
        parts.push(rn3 + "风险" + (effect.riskMod > 0 ? "+" : "") + effect.riskMod)
      }
      if (effect.alwaysOpen === true) {
        var rn4 = routeName || "路线"
        parts.push(rn4 + "强制畅通")
      }
      break
    case "guideFatigue":
      if (effect.fatigueRecoveryBonus !== undefined) {
        parts.push("全员疲劳恢复+" + effect.fatigueRecoveryBonus + "/天")
      }
      if (effect.fatigueGainMod !== undefined) {
        var v4 = Math.round(effect.fatigueGainMod * 100)
        parts.push("任务疲劳增长" + (v4 > 0 ? "+" : "") + v4 + "%")
      }
      if (effect.maxFatigueMod !== undefined) {
        parts.push("全员疲劳上限+" + effect.maxFatigueMod)
      }
      break
    case "caravanChance":
      if (effect.caravanChanceMod !== undefined) {
        var v5 = Math.round(effect.caravanChanceMod * 100)
        parts.push("商队出现概率" + (v5 > 0 ? "+" : "") + v5 + "%")
      }
      break
    case "resource":
      if (effect.dailyWood !== undefined) parts.push("每日柴火" + (effect.dailyWood > 0 ? "+" : "") + effect.dailyWood)
      if (effect.dailyFood !== undefined) parts.push("每日干粮" + (effect.dailyFood > 0 ? "+" : "") + effect.dailyFood)
      if (effect.dailyMed !== undefined) parts.push("每日药品" + (effect.dailyMed > 0 ? "+" : "") + effect.dailyMed)
      break
  }
  return parts.length > 0 ? parts.join("，") : ""
}
function applyDailyConsequenceEffects() {
  if (!game.activeConsequences || game.activeConsequences.length === 0) return
  var resourceCons = getConsequenceEffectsByType("resource")
  resourceCons.forEach(function(c) {
    var e = c.effect || {}
    if (e.dailyWood) {
      game.wood += e.dailyWood
      recordResourceChange("wood", e.dailyWood, "【持续效果】" + c.sourceEventName + "：" + c.description)
    }
    if (e.dailyFood) {
      game.food += e.dailyFood
      recordResourceChange("food", e.dailyFood, "【持续效果】" + c.sourceEventName + "：" + c.description)
    }
    if (e.dailyMed) {
      game.med += e.dailyMed
      recordResourceChange("med", e.dailyMed, "【持续效果】" + c.sourceEventName + "：" + c.description)
    }
  })
  var routeStatusCons = getConsequenceEffectsByType("routeStatus")
  routeStatusCons.forEach(function(c) {
    var e = c.effect || {}
    var route = game.routes.find(function(r) { return r.id === e.routeId })
    if (!route) return
    if (e.alwaysOpen === true) {
      if (route.blocked) {
        route.blocked = false
        recordReplayLog("持续效果让【" + route.name + "】保持畅通。")
      }
    }
    if (e.rewardBonus !== undefined && !route._consequenceRewardApplied) {
      route.reward += e.rewardBonus
      route._consequenceRewardApplied = true
    }
    if (e.riskMod !== undefined && !route._consequenceRiskApplied) {
      route.risk += e.riskMod
      route._consequenceRiskApplied = true
    }
  })
}
function cleanupDailyConsequenceEffects() {
  if (!game.activeConsequences || game.activeConsequences.length === 0) return
  var routeStatusCons = getConsequenceEffectsByType("routeStatus")
  var stillActiveRouteIds = new Set(routeStatusCons.map(function(c) { return c.effect && c.effect.routeId }).filter(Boolean))
  game.routes.forEach(function(route) {
    if (!stillActiveRouteIds.has(route.id)) {
      if (route._consequenceRewardApplied) {
        var consForRoute = routeStatusCons.filter(function(c) { return c.effect.routeId === route.id })
        var totalRewardBonus = consForRoute.reduce(function(sum, c) { return sum + (c.effect.rewardBonus || 0) }, 0)
        if (totalRewardBonus !== 0) {
          route.reward -= totalRewardBonus
        }
        route._consequenceRewardApplied = false
      }
      if (route._consequenceRiskApplied) {
        var consForRoute2 = routeStatusCons.filter(function(c) { return c.effect.routeId === route.id })
        var totalRiskMod = consForRoute2.reduce(function(sum, c) { return sum + (c.effect.riskMod || 0) }, 0)
        if (totalRiskMod !== 0) {
          route.risk -= totalRiskMod
        }
        route._consequenceRiskApplied = false
      }
    }
  })
}
function tickConsequences() {
  if (!game.activeConsequences || game.activeConsequences.length === 0) return []
  var expired = []
  var expiredWithInfo = []
  cleanupDailyConsequenceEffects()
  game.activeConsequences = game.activeConsequences.filter(function(c) {
    c.remainingDays--
    if (c.remainingDays <= 0) {
      c.expiredDay = game.day
      expired.push(c)
      expiredWithInfo.push(JSON.parse(JSON.stringify(c)))
      if (!game.consequenceHistory) game.consequenceHistory = []
      game.consequenceHistory.push({
        id: c.id,
        event: "expired",
        day: game.day,
        consequence: JSON.parse(JSON.stringify(c))
      })
      return false
    }
    return true
  })
  expiredWithInfo.forEach(function(c) {
    var expireMsg = "持续效果「" + c.description + "」已到期（来自【" + c.sourceEventName + "】，第" + c.triggerDay + "天触发，持续了" + (game.day - c.triggerDay) + "天）"
    game.log.unshift("第" + game.day + "天" + expireMsg)
    recordReplayLog(expireMsg)
  })
  return expiredWithInfo
}
function getConsequenceEffectsByType(type) {
  if (!game.activeConsequences) return []
  return game.activeConsequences.filter(function(c) { return c.type === type })
}
function applyRouteEffect(routeEffect) {
  let targetRoute = routeEffect.route;
  const availableRouteIds = game.routes.map(r => r.id);
  if (targetRoute === "random") {
    const available = game.routes.filter(r => !r.blocked);
    if (available.length > 0) {
      targetRoute = randChoice(available).id;
    } else {
      targetRoute = randChoice(game.routes).id;
    }
  } else if (!availableRouteIds.includes(targetRoute)) {
    const available = game.routes.filter(r => !r.blocked);
    if (available.length > 0) {
      targetRoute = randChoice(available).id;
    } else {
      targetRoute = randChoice(game.routes).id;
    }
  }
  const route = game.routes.find(r => r.id === targetRoute);
  if (!route) return;
  switch (routeEffect.type) {
    case "block":
      route.blocked = true;
      if (game.codex[route.id]) game.codex[route.id].blocked++;
      break;
    case "ensureOpen":
      route.blocked = false;
      break;
    case "addCaravan":
      route.caravan = true;
      break;
    case "boostReward":
      route.reward += routeEffect.amount;
      break;
  }
}
function applyGuideEffect(guideEffect) {
  let targets = [];
  switch (guideEffect.target) {
    case "all":
      targets = game.guides;
      break;
    case "random":
      targets = [randChoice(game.guides)];
      break;
    case "mostFatigued":
      const most = game.guides.reduce((prev, curr) => prev.fatigue > curr.fatigue ? prev : curr);
      targets = [most];
      break;
    case "leastFatigued":
      const least = game.guides.reduce((prev, curr) => prev.fatigue < curr.fatigue ? prev : curr);
      targets = [least];
      break;
  }
  targets.forEach(guide => {
    switch (guideEffect.type) {
      case "heal":
        guide.fatigue = Math.max(0, guide.fatigue - guideEffect.amount);
        break;
      case "addFatigue":
        guide.fatigue += guideEffect.amount;
        break;
      case "rest":
        guide.task = "";
        guide.fatigue = Math.max(0, guide.fatigue - 2);
        break;
    }
  });
}
function getEffectiveWeatherProb(baseProb) {
  if (!game.activeConsequences || game.activeConsequences.length === 0) return baseProb;
  let mod = 0;
  game.activeConsequences.forEach(function(c) {
    if (c.type !== "weather") return;
    if (c.effect.stormProb !== undefined) mod += c.effect.stormProb;
    if (c.effect.clearProb !== undefined) mod -= c.effect.clearProb;
  });
  return Math.max(0, Math.min(1, baseProb + mod));
}
function buildEmptyRouteDispatches(routeIds) {
  const obj = {};
  routeIds.forEach(id => obj[id] = 0);
  return obj;
}
function fresh(diff) {
  clearChallengeRNG();
  let actualSeed = null;
  if (challengeMode && currentChallengeCode) {
    const decoded = decodeChallengeCode(currentChallengeCode);
    if (decoded && decoded.valid) {
      actualSeed = decoded.seed;
      setupChallengeRNG(decoded.seed, chosenScenario, diff);
    } else {
      challengeMode = false;
      currentChallengeCode = null;
    }
  }
  if (els.challengeBanner) {
    if (challengeMode && currentChallengeCode) {
      els.challengeBanner.classList.remove("hidden");
      if (els.challengeBannerCode) els.challengeBannerCode.textContent = currentChallengeCode;
    } else {
      els.challengeBanner.classList.add("hidden");
    }
  }
  const allScenarios = getAllScenarios();
  let sc = allScenarios[chosenScenario];
  if (!sc) {
    chosenScenario = "standard";
    sc = allScenarios.standard;
  }
  if (sc.id && sc.id.startsWith(CUSTOM_SCENARIO_PREFIX) && typeof sc.resultWin !== "function") {
    const winText = sc.resultWinText || "坚守到第{day}天，接应商队 {saved} 队，累计声望 {rep}。";
    const loseText = sc.resultLoseText || "坚持了 {day} 天，接应 {saved} 队商队。失败原因：{reason}。";
    sc.resultWin = function(game) {
      return winText.replace(/{day}/g, game.day).replace(/{saved}/g, game.saved).replace(/{rep}/g, game.rep);
    };
    sc.resultLose = function(game) {
      return loseText.replace(/{day}/g, game.day).replace(/{saved}/g, game.saved).replace(/{reason}/g, game.failureReason || "未知");
    };
  }
  const d = DIFF[diff];
  const sr = getScenarioRoutes(chosenScenario);
  const startWood = Math.max(0, d.wood + (sc.startResources.wood || 0));
  const startMed = Math.max(0, d.med + (sc.startResources.med || 0));
  const startFood = Math.max(0, d.food + (sc.startResources.food || 0));
  const startRep = Math.max(0, sc.startResources.rep || 0);
  game = {
    scenario: chosenScenario,
    scenarioConfig: sc,
    day: 1, targetDays: sc.targetDays, weather: "晴",
    wood: startWood, med: startMed, food: startFood, rep: startRep,
    saved: 0, ended: false, diff: diff,
    guides: [{ name: "阿措", fatigue: 0, task: "" }, { name: "洛桑", fatigue: 0, task: "" }],
    log: ["第1天，" + sc.intro + "（难度：" + d.label + "）" + (challengeMode && currentChallengeCode ? "（挑战码模式：" + currentChallengeCode + "）" : "")],
    routes: [],
    codex: {},
    eventCodex: {},
    eventStats: { triggered: 0, byCategory: {} },
    activeConsequences: [],
    consequenceHistory: [],
    turningPoints: [],
    minResources: { wood: startWood, med: startMed, food: startFood },
    routeDispatches: buildEmptyRouteDispatches(sc.routePool),
    failureReason: null,
    medCriticalStreak: 0,
    replayHistory: [],
    currentDayData: null,
    challengeMode: challengeMode,
    challengeCode: currentChallengeCode,
    challengeSeed: actualSeed
  };
  sr.forEach(r => {
    game.codex[r.id] = { name: r.name, risk: r.risk, reward: r.reward, desc: r.desc, wood: r.wood, food: r.food, med: r.med, seen: 0, blocked: 0, attempts: 0, successes: 0, rewards: { rep: 0, wood: 0, food: 0, med: 0 } };
  });
  EVENTS_POOL.forEach(e => {
    game.eventCodex[e.id] = { name: e.name, category: e.category, desc: e.desc, seen: 0, choices: {} };
  });
  if (els.scenarioNameEl) {
    els.scenarioNameEl.textContent = sc.name;
    els.scenarioNameEl.style.color = sc.color;
  }
  if (els.scenarioIntroEl) {
    let introText = "";
    switch (sc.win.type) {
      case "days": introText = "坚守 " + sc.targetDays + " 天即可胜利"; break;
      case "caravans": introText = sc.targetDays + " 天内接应 ≥" + sc.win.count + " 队商队"; break;
      case "days_and_rep": introText = "坚守 " + sc.targetDays + " 天 且 声望 ≥" + sc.win.rep; break;
      case "caravans_and_rep": introText = sc.targetDays + " 天内接应 ≥" + sc.win.count + " 队 且 声望 ≥" + sc.win.rep; break;
    }
    els.scenarioIntroEl.textContent = introText;
  }
  rollDay();
  els.overlay.classList.add("hidden");
  render();
}
function snapshotReplayRoutes() {
  return game.routes.map(r => ({ id: r.id, name: r.name, blocked: r.blocked, caravan: r.caravan, risk: r.risk, reward: r.reward }));
}
function startReplayDay(consequencesExpired, startResourcesOverride) {
  game.currentDayData = {
    day: game.day,
    weather: game.weather,
    startResources: startResourcesOverride || { wood: game.wood, med: game.med, food: game.food, rep: game.rep },
    dispatchStartResources: null,
    endResources: null,
    startGuides: game.guides.map(g => ({ name: g.name, fatigue: g.fatigue, task: g.task })),
    dispatchStartGuides: null,
    endGuides: null,
    routes: snapshotReplayRoutes(),
    guideAssignments: [],
    event: null,
    eventChoice: null,
    resourceChanges: [],
    logs: [],
    savedCaravans: game.saved,
    isTurningPoint: false,
    turningPointReason: null,
    consequencesSnapshot: game.activeConsequences ? JSON.parse(JSON.stringify(game.activeConsequences)) : [],
    consequencesExpired: consequencesExpired || [],
    consequencesTriggered: []
  };
}
function recordResourceChange(resource, amount, reason) {
  if (!game.currentDayData) return;
  if (amount === 0) return;
  game.currentDayData.resourceChanges.push({
    resource: resource,
    amount: amount,
    reason: reason
  });
}
function recordReplayLog(logText) {
  if (!game.currentDayData) return;
  game.currentDayData.logs.push(logText);
}
function endReplayDay() {
  if (!game.currentDayData) return;
  game.currentDayData.endResources = { wood: game.wood, med: game.med, food: game.food, rep: game.rep };
  game.currentDayData.endGuides = game.guides.map(g => ({ name: g.name, fatigue: g.fatigue, task: g.task }));
  game.currentDayData.routes = snapshotReplayRoutes();
  game.currentDayData.savedCaravans = game.saved;
  game.currentDayData.guideAssignments = game.guides
    .filter(g => g.task)
    .map(g => ({ guideName: g.name, routeId: g.task, routeName: getRouteName(g.task) }));
  game.replayHistory.push(game.currentDayData);
  game.currentDayData = null;
}
function detectTurningPoints(win) {
  if (!game.replayHistory || game.replayHistory.length === 0) return;
  const history = game.replayHistory;
  const totalDays = history.length;
  const turningPoints = [];
  for (let i = 0; i < totalDays; i++) {
    const day = history[i];
    const prev = i > 0 ? history[i - 1] : null;
    const reasons = [];
    if (i === totalDays - 1) {
      reasons.push(win ? "终局日：锁定胜利" : "终局日：" + (game.failureReason || "游戏结束"));
    }
    if (day.endResources) {
      if (day.endResources.food <= 0) reasons.push("干粮见底，濒临失败");
      if (day.endResources.wood <= 0) reasons.push("柴火耗尽，驿站失温");
      if (day.endResources.med <= 0) reasons.push("药品告罄，疫情风险");
    }
    if (prev && prev.endResources && day.endResources) {
      const checkResourceDrop = (res, label, threshold) => {
        const before = prev.endResources[res];
        const after = day.endResources[res];
        if (before > threshold && after <= before * 0.5) {
          reasons.push(label + "骤降（" + before + " → " + after + "）");
        }
      };
      checkResourceDrop("food", "干粮", 5);
      checkResourceDrop("wood", "柴火", 5);
      checkResourceDrop("med", "药品", 3);
      const repBefore = prev.endResources.rep;
      const repAfter = day.endResources.rep;
      if (repAfter - repBefore >= 6) {
        reasons.push("声望大幅提升（+" + (repAfter - repBefore) + "）");
      }
      const savedBefore = prev.savedCaravans;
      const savedAfter = day.savedCaravans;
      if (savedAfter > savedBefore) {
        reasons.push("成功接应商队（累计" + savedAfter + "队）");
      }
    }
    if (day.endGuides) {
      const fatiguedGuides = day.endGuides.filter(g => g.fatigue >= 8);
      if (fatiguedGuides.length >= 1) {
        reasons.push("向导疲劳预警：" + fatiguedGuides.map(g => g.name + "(" + g.fatigue + ")").join("、"));
      }
    }
    if (day.event && day.eventChoice) {
      const badEvent = day.resourceChanges.some(rc => rc.amount < -2);
      const goodEvent = day.resourceChanges.some(rc => rc.amount > 3);
      if (badEvent) reasons.push("关键事件选择导致资源大幅减少");
      if (goodEvent) reasons.push("关键事件选择获得大量收益");
    }
    if (day.weather === "暴雪" && day.routes.filter(r => r.blocked).length >= 2) {
      reasons.push("暴雪导致多条路线封路");
    }
    if (day.consequencesTriggered && day.consequencesTriggered.length >= 2) {
      reasons.push("同日触发" + day.consequencesTriggered.length + "项持续效果");
    } else if (day.consequencesTriggered && day.consequencesTriggered.length === 1) {
      var c = day.consequencesTriggered[0];
      if (c.totalDays >= 3) reasons.push("触发长周期持续效果：" + c.description + "（" + c.totalDays + "天）");
    }
    if (day.consequencesExpired && day.consequencesExpired.length >= 2) {
      reasons.push("同日" + day.consequencesExpired.length + "项持续效果到期失效");
    }
    if (reasons.length > 0) {
      day.isTurningPoint = true;
      day.turningPointReason = reasons.join("；");
      turningPoints.push({ day: day.day, reasons: reasons });
    }
  }
  game.turningPoints = turningPoints;
}
function getWeatherIcon(weather) {
  switch (weather) {
    case "晴": return "☀️";
    case "阴风": return "🌫️";
    case "暴雪": return "❄️";
    default: return "🌤️";
  }
}
function generateBriefingData() {
  const sc = game.scenarioConfig;
  const blockedRoutes = game.routes.filter(r => r.blocked);
  const caravanRoutes = game.routes.filter(r => r.caravan && !r.blocked);
  const normalRoutes = game.routes.filter(r => !r.blocked && !r.caravan);
  const activeEffects = [];
  if (game.activeConsequences && game.activeConsequences.length > 0) {
    game.activeConsequences.forEach(function(c) {
      var typeIcons = { weather: "🌤", routeBlock: "🛤", guideFatigue: "🥾", caravanChance: "🐫" }
      activeEffects.push({
        type: c.type,
        text: (typeIcons[c.type] || "") + " " + c.sourceEventName + "：" + c.description + "（剩余" + c.remainingDays + "天）",
        value: c.effect
      });
    });
  }
  let goalProgress = null;
  if (sc.win.type === "caravans" || sc.win.type === "caravans_and_rep") {
    goalProgress = {
      type: sc.win.type,
      caravanCurrent: game.saved,
      caravanTarget: sc.win.count,
      caravanPercent: Math.min(100, Math.round((game.saved / sc.win.count) * 100)),
      repCurrent: game.rep,
      repTarget: sc.win.rep || 0,
      repPercent: sc.win.rep ? Math.min(100, Math.round((game.rep / sc.win.rep) * 100)) : null
    };
  } else if (sc.win.type === "days_and_rep") {
    goalProgress = {
      type: sc.win.type,
      dayCurrent: game.day,
      dayTarget: game.targetDays,
      dayPercent: Math.min(100, Math.round((game.day / game.targetDays) * 100)),
      repCurrent: game.rep,
      repTarget: sc.win.rep,
      repPercent: Math.min(100, Math.round((game.rep / sc.win.rep) * 100))
    };
  } else {
    goalProgress = {
      type: sc.win.type,
      dayCurrent: game.day,
      dayTarget: game.targetDays,
      dayPercent: Math.min(100, Math.round((game.day / game.targetDays) * 100))
    };
  }
  let yesterdayChanges = [];
  if (game.day > 1 && game.replayHistory && game.replayHistory.length > 0) {
    const yesterday = game.replayHistory[game.replayHistory.length - 1];
    if (yesterday.endResources && yesterday.startResources) {
      const resKeys = ["wood", "food", "med", "rep"];
      resKeys.forEach(key => {
        const diff = yesterday.endResources[key] - yesterday.startResources[key];
        if (diff !== 0) {
          yesterdayChanges.push({
            type: diff > 0 ? "good" : "bad",
            text: RESOURCE_LABELS[key] + " " + (diff > 0 ? "+" : "") + diff
          });
        }
      });
    }
    if (yesterday.event && yesterday.eventChoice) {
      yesterdayChanges.push({
        type: "event",
        text: "【事件】" + yesterday.event.name + " - " + yesterday.eventChoice.title
      });
    }
    if (yesterday.savedCaravans !== undefined && game.replayHistory.length >= 2) {
      const prevSaved = game.replayHistory[game.replayHistory.length - 2].savedCaravans;
      const savedDiff = yesterday.savedCaravans - prevSaved;
      if (savedDiff > 0) {
        yesterdayChanges.push({
          type: "good",
          text: "接应商队 +" + savedDiff + " 队"
        });
      }
    }
  }
  let guideTraits = [];
  if (careerState.data) {
    game.guides.forEach(guide => {
      const stats = careerState.data.guides[guide.name];
      const traits = stats ? stats.traits : [];
      const traitDetails = traits.map(tid => {
        const trait = TRAITS[tid];
        return trait ? { id: tid, name: trait.name, icon: trait.icon, desc: trait.desc, isNegative: trait.isNegative } : null;
      }).filter(Boolean);
      guideTraits.push({
        name: guide.name,
        fatigue: guide.fatigue,
        traits: traitDetails
      });
    });
  }
  return {
    day: game.day,
    weather: game.weather,
    weatherIcon: getWeatherIcon(game.weather),
    blockedRoutes: blockedRoutes.map(r => ({ id: r.id, name: r.name })),
    caravanRoutes: caravanRoutes.map(r => ({ id: r.id, name: r.name })),
    normalRoutes: normalRoutes.map(r => ({ id: r.id, name: r.name })),
    activeEffects: activeEffects,
    goalProgress: goalProgress,
    yesterdayChanges: yesterdayChanges,
    scenarioName: sc.name,
    scenarioSubtitle: sc.subtitle,
    guideTraits: guideTraits
  };
}
function renderBriefing(briefingData) {
  const scenarioName = briefingData.scenarioName || (game && game.scenarioConfig ? game.scenarioConfig.name : "");
  const scenarioSubtitle = briefingData.scenarioSubtitle || (game && game.scenarioConfig ? game.scenarioConfig.subtitle : "");
  let goalHtml = "";
  const gp = briefingData.goalProgress;
  if (gp.type === "caravans" || gp.type === "caravans_and_rep") {
    goalHtml = '<div class="replay-row"><span>商队目标</span><span><b>' + gp.caravanCurrent + ' / ' + gp.caravanTarget + ' 队</b></span></div>';
    goalHtml += '<div class="briefing-progress-bar"><div class="briefing-progress-fill" style="width:' + gp.caravanPercent + '%"></div></div>';
    if (gp.repTarget) {
      goalHtml += '<div class="replay-row" style="margin-top:8px"><span>声望目标</span><span><b>' + gp.repCurrent + ' / ' + gp.repTarget + '</b></span></div>';
      goalHtml += '<div class="briefing-progress-bar"><div class="briefing-progress-fill" style="width:' + gp.repPercent + '%"></div></div>';
    }
  } else if (gp.type === "days_and_rep") {
    goalHtml = '<div class="replay-row"><span>天数进度</span><span><b>第 ' + gp.dayCurrent + ' / ' + gp.dayTarget + ' 天</b></span></div>';
    goalHtml += '<div class="briefing-progress-bar"><div class="briefing-progress-fill" style="width:' + gp.dayPercent + '%"></div></div>';
    goalHtml += '<div class="replay-row" style="margin-top:8px"><span>声望目标</span><span><b>' + gp.repCurrent + ' / ' + gp.repTarget + '</b></span></div>';
    goalHtml += '<div class="briefing-progress-bar"><div class="briefing-progress-fill" style="width:' + gp.repPercent + '%"></div></div>';
  } else {
    goalHtml = '<div class="replay-row"><span>天数进度</span><span><b>第 ' + gp.dayCurrent + ' / ' + gp.dayTarget + ' 天</b></span></div>';
    goalHtml += '<div class="briefing-progress-bar"><div class="briefing-progress-fill" style="width:' + gp.dayPercent + '%"></div></div>';
  }
  let routesHtml = "";
  if (briefingData.blockedRoutes.length > 0) {
    routesHtml += '<div class="briefing-route-list">';
    briefingData.blockedRoutes.forEach(r => {
      routesHtml += '<div class="briefing-route-item blocked"><span>' + r.name + '</span><span class="briefing-status-tag blocked">封路</span></div>';
    });
    routesHtml += '</div>';
  }
  if (briefingData.caravanRoutes.length > 0) {
    routesHtml += '<div class="briefing-route-list" style="margin-top:' + (briefingData.blockedRoutes.length > 0 ? '8px' : '0') + '">';
    briefingData.caravanRoutes.forEach(r => {
      routesHtml += '<div class="briefing-route-item caravan"><span>' + r.name + '</span><span class="briefing-status-tag caravan">商队求援</span></div>';
    });
    routesHtml += '</div>';
  }
  if (briefingData.normalRoutes.length > 0) {
    routesHtml += '<div class="briefing-route-list" style="margin-top:' + ((briefingData.blockedRoutes.length + briefingData.caravanRoutes.length) > 0 ? '8px' : '0') + '">';
    briefingData.normalRoutes.forEach(r => {
      routesHtml += '<div class="briefing-route-item normal"><span>' + r.name + '</span><span class="briefing-status-tag normal">正常</span></div>';
    });
    routesHtml += '</div>';
  }
  let effectsHtml = "";
  if (briefingData.activeEffects.length > 0) {
    effectsHtml = '<div class="briefing-effect-list">';
    briefingData.activeEffects.forEach(e => {
      effectsHtml += '<div class="briefing-effect-item">' + e.text + '</div>';
    });
    effectsHtml += '</div>';
  } else {
    effectsHtml = '<div class="briefing-empty">暂无持续影响</div>';
  }
  let yesterdayHtml = "";
  if (briefingData.yesterdayChanges.length > 0) {
    yesterdayHtml = '<div class="briefing-yesterday-list">';
    briefingData.yesterdayChanges.forEach(c => {
      yesterdayHtml += '<div class="briefing-yesterday-item ' + (c.type === "good" ? "good" : (c.type === "bad" ? "bad" : "")) + '">' + c.text + '</div>';
    });
    yesterdayHtml += '</div>';
  } else {
    yesterdayHtml = '<div class="briefing-empty">今日是第一天，暂无昨日记录</div>';
  }
  let guideTraitsHtml = "";
  if (briefingData.guideTraits && briefingData.guideTraits.length > 0) {
    guideTraitsHtml = '<div class="briefing-guide-list">';
    briefingData.guideTraits.forEach(g => {
      guideTraitsHtml += '<div class="briefing-guide-item">';
      guideTraitsHtml += '<div class="briefing-guide-name"><b>' + g.name + '</b> <span style="font-size:12px;color:#5a6e78">（疲劳：' + g.fatigue + '）</span></div>';
      if (g.traits.length > 0) {
        guideTraitsHtml += '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px">';
        g.traits.forEach(t => {
          const traitCls = t.isNegative ? 'trait-negative' : 'trait-positive';
          guideTraitsHtml += '<span class="trait-badge ' + traitCls + '" title="' + t.desc + '">' + t.icon + ' ' + t.name + '</span>';
        });
        guideTraitsHtml += '</div>';
      } else {
        guideTraitsHtml += '<div style="font-size:12px;color:#5a6e78;margin-top:4px">尚未解锁特质</div>';
      }
      guideTraitsHtml += '</div>';
    });
    guideTraitsHtml += '</div>';
  }
  els.briefingTitle.textContent = "每日简报 · 第 " + briefingData.day + " 天";
  els.briefingDate.textContent = scenarioName + " · " + scenarioSubtitle;
  els.briefingGrid.innerHTML =
    '<div class="briefing-section"><h3>🌤 今日天气</h3>' +
    '<div class="briefing-weather"><span class="briefing-weather-icon">' + briefingData.weatherIcon + '</span>' +
    '<div class="briefing-weather-info"><strong>' + briefingData.weather + '</strong><br><span>' + (briefingData.weather === "暴雪" ? "注意防寒与路线封锁" : (briefingData.weather === "阴风" ? "能见度降低，注意安全" : "天气晴好，适合出行") ) + '</span></div></div>' +
    '</div>' +
    '<div class="briefing-section"><h3>🎯 剧本目标进度</h3>' + goalHtml + '</div>' +
    (guideTraitsHtml ? '<div class="briefing-section"><h3>🌟 向导生涯特质</h3>' + guideTraitsHtml + '</div>' : '') +
    '<div class="briefing-section"><h3>🛤 路线状态</h3>' + routesHtml + '</div>' +
    '<div class="briefing-section"><h3>⚡ 持续影响</h3>' + effectsHtml + '</div>' +
    '<div class="briefing-section" style="grid-column:1/-1"><h3>📋 昨日关键变化</h3>' + yesterdayHtml + '</div>';
}
function showDailyBriefing() {
  const briefingData = generateBriefingData();
  if (game.currentDayData) {
    game.currentDayData.briefing = briefingData;
  }
  renderBriefing(briefingData);
  els.briefingOverlay.classList.remove("hidden");
}
function closeDailyBriefing() {
  if (isReplayBriefingMode) {
    closeReplayBriefing();
    return;
  }
  els.briefingOverlay.classList.add("hidden");
  if (pendingEvent) {
    renderEvent(pendingEvent);
  } else {
    render();
  }
}
function rollWeather(sc, d) {
  const wt = sc.weatherTable;
  const scenarioStormProb = wt.storm !== undefined ? wt.storm : d.stormProb;
  const difficultyStormDelta = d.stormProb - DIFF.normal.stormProb;
  let stormProb = wt.overrideStormProb !== null ? wt.overrideStormProb : scenarioStormProb + difficultyStormDelta;
  stormProb = getEffectiveWeatherProb(stormProb);
  const r = rand();
  if (r < stormProb * 0.95) return "暴雪";
  if (r < stormProb + wt.wind) return "阴风";
  if (rand() < wt.clear / (wt.clear + wt.wind)) return "晴";
  return "阴风";
}
function rollDay() {
  const sc = game.scenarioConfig;
  const d = DIFF[game.diff];
  const rm = sc.routeMod;
  const sr = getScenarioRoutes(game.scenario);
  var tickExpiredConsequences = tickConsequences()
  game.weather = rollWeather(sc, d);
  const isStorm = game.weather === "暴雪";
  var routeBlockConsequences = getConsequenceEffectsByType("routeBlock")
  var caravanConsequences = getConsequenceEffectsByType("caravanChance")
  var caravanMod = 0
  caravanConsequences.forEach(function(c) { caravanMod += c.effect.caravanChanceMod || 0 })
  var baseRoutes = sr.map(function(route) { return { ...route } })
  game.routes = baseRoutes.map(route => {
    const immune = rm.stormRouteImmune && rm.stormRouteImmune.includes(route.id);
    var blockChance = rm.stormBlockChance
    routeBlockConsequences.forEach(function(c) {
      var cRouteId = c.effect.routeId
      if (cRouteId === "random" || cRouteId === route.id) blockChance += c.effect.blockChanceMod || 0
    })
    blockChance = Math.max(0, Math.min(1, blockChance))
    let blocked = false;
    if (isStorm && !immune) {
      blocked = rand() < blockChance;
    }
    var effectiveCaravanChance = Math.max(0, Math.min(1, rm.caravanChance + caravanMod))
    return { ...route, caravan: rand() < effectiveCaravanChance, blocked: blocked };
  });
  var dayStartResources = { wood: game.wood, med: game.med, food: game.food, rep: game.rep }
  startReplayDay(tickExpiredConsequences, dayStartResources);
  applyDailyConsequenceEffects()
  if (game.currentDayData) {
    game.currentDayData.routes = snapshotReplayRoutes()
    game.currentDayData.consequencesSnapshot = game.activeConsequences ? JSON.parse(JSON.stringify(game.activeConsequences)) : []
  }
  game.routes.forEach(r => { if (game.codex[r.id]) { game.codex[r.id].seen++; if (r.blocked) game.codex[r.id].blocked++; } });
  game.guides.forEach(g => g.task = "");
  pendingEvent = drawEvent();
  if (pendingEvent) {
    if (game.currentDayData) {
      game.currentDayData.event = {
        id: pendingEvent.id,
        name: pendingEvent.name,
        category: pendingEvent.category,
        desc: pendingEvent.desc,
        options: pendingEvent.options.map(o => ({ title: o.title, hint: o.hint }))
      };
    }
  }
  showDailyBriefing();
}
function render() {
  const sc = game.scenarioConfig;
  const d = DIFF[game.diff];
  els.day.textContent = game.day + " / " + game.targetDays;
  els.weather.textContent = game.weather;
  els.wood.textContent = game.wood;
  els.med.textContent = game.med;
  els.food.textContent = game.food;
  els.rep.textContent = game.rep;
  let goalText = "";
  switch (sc.win.type) {
    case "days": goalText = ""; break;
    case "caravans": goalText = '<div class="'+(game.saved>=sc.win.count?'ok':'')+'" style="font-size:12px">商队目标：' + game.saved + '/' + sc.win.count + '</div>'; break;
    case "days_and_rep": goalText = '<div class="'+(game.rep>=sc.win.rep?'ok':'')+'" style="font-size:12px">声望目标：' + game.rep + '/' + sc.win.rep + '</div>'; break;
    case "caravans_and_rep": goalText = '<div style="font-size:12px"><span class="'+(game.saved>=sc.win.count?'ok':'')+'">商队：' + game.saved + '/' + sc.win.count + '</span> · <span class="'+(game.rep>=sc.win.rep?'ok':'')+'">声望：' + game.rep + '/' + sc.win.rep + '</span></div>'; break;
  }
  els.guides.innerHTML = game.guides.map((g, i) => '<div class="card"><b>'+g.name+'</b><div>疲劳：'+g.fatigue+'</div><select data-guide="'+i+'"><option value="">留守休整</option>'+game.routes.map(r => '<option value="'+r.id+'" '+(r.blocked?'disabled':'')+'>'+r.name+(r.blocked?' (封路)':'')+'</option>').join("")+'</select></div>').join("");
  document.querySelectorAll("[data-guide]").forEach(sel => { sel.value = game.guides[sel.dataset.guide].task; sel.onchange = () => { game.guides[sel.dataset.guide].task = sel.value; renderEstimate(); }; });
  const rewardBonus = sc.routeMod.rewardBonus || 0;
  els.routes.innerHTML = game.routes.map(r => {
    const realReward = r.reward + rewardBonus;
    return '<div class="card"><h3 style="color:'+sc.color+'">'+r.name+'</h3><div>风险 '+r.risk+' · 奖励声望 '+realReward+(rewardBonus>0?' (+'+rewardBonus+')':'')+'</div><div>消耗：柴'+r.wood+' 干粮'+r.food+' 药'+(r.med>0?r.med:'+'+Math.abs(r.med))+'</div><div class="'+(r.blocked?'danger':'ok')+'">'+(r.blocked?'暴雪封路':r.caravan?'有商队求援':'今日较安静')+'</div></div>';
  }).join("") + goalText;
  els.log.innerHTML = game.log.map(item => '<div class="entry">'+item+'</div>').join("");
  renderConsequencesPanel();
  renderEstimate();
}
function renderConsequencesPanel() {
  var panel = document.querySelector("#consequencesPanel")
  if (!panel) return
  if (!game.activeConsequences || game.activeConsequences.length === 0) {
    panel.innerHTML = '<div class="consequence-panel-title">⚡ 持续效果</div><div class="consequence-empty">暂无持续效果</div>'
    return
  }
  var typeIcons = { weather: "🌤", routeBlock: "🛤", guideFatigue: "🥾", caravanChance: "🐫", routeStatus: "🚀", resource: "📦" }
  var typeLabels = { weather: "天气", routeBlock: "路线封路", guideFatigue: "向导疲劳", caravanChance: "商队出现", routeStatus: "路线状态", resource: "每日资源" }
  var html = '<div class="consequence-panel-title">⚡ 持续效果（共 ' + game.activeConsequences.length + ' 项）</div>'
  game.activeConsequences.forEach(function(c) {
    var pct = Math.round((c.remainingDays / c.totalDays) * 100)
    var effectDetail = c.effectSummary || ""
    html += '<div class="consequence-item">'
    html += '<div class="consequence-source">'
    html += '<span class="consequence-type-icon" title="' + (typeLabels[c.type] || c.type) + '">' + (typeIcons[c.type] || "✨") + '</span>'
    html += '<b>' + c.sourceEventName + '</b>'
    html += '<span style="font-size:10px;color:#5a6e78;margin-left:4px">（第' + c.triggerDay + '天触发）</span>'
    html += '</div>'
    html += '<div class="consequence-desc">' + c.description + '</div>'
    if (effectDetail) {
      html += '<div style="font-size:11px;color:#315c72;margin-top:3px;background:#e8f0f2;padding:3px 6px;border-radius:3px;line-height:1.4">📊 效果：' + effectDetail + '</div>'
    }
    if (c.routeName) {
      html += '<div style="font-size:11px;color:#5a7fa8;margin-top:3px">🎯 目标路线：' + c.routeName + '</div>'
    }
    html += '<div class="consequence-meta">'
    html += '<span class="consequence-days">剩余 ' + c.remainingDays + '/' + c.totalDays + ' 天（持续至第' + (c.triggerDay + c.totalDays - 1) + '天）</span>'
    html += '<span style="font-size:11px;color:#315c72;font-weight:700">' + pct + '%</span>'
    html += '</div>'
    html += '<div class="consequence-bar"><div class="consequence-bar-fill ' + c.type + '" style="width:' + pct + '%"></div></div>'
    html += '</div>'
  })
  panel.innerHTML = html
}
function calculateEstimate() {
  if (!game || game.ended) return null;
  const sc = game.scenarioConfig;
  const d = DIFF[game.diff];
  const rm = sc.routeMod;
  const rewardBonus = rm.rewardBonus || 0;
  const fatigueBonus = rm.fatigueBonus || 0;
  const usedRoutes = new Set();
  const estimate = {
    wood: 0, food: 0, med: 0, rep: 0,
    fatigueChanges: [],
    successRate: 0,
    totalRoutes: 0,
    successRoutes: 0,
    details: [],
    storm: game.weather === "暴雪",
    blockedRoutes: 0,
    careerTraitEffects: []
  };
  for (const guide of game.guides) {
    const careerStats = careerState.data && careerState.data.guides[guide.name] ? careerState.data.guides[guide.name] : null;
    const consecutiveRestDays = careerStats ? careerStats.consecutiveRest : 0;
    const rescueFailStreak = careerStats ? careerStats.rescueFailStreak : 0;
    if (!guide.task) {
      let restAmount = 2;
      let traitRestBonus = 0;
      if (isCareerBonusEnabled() && careerStats) {
        const context = { consecutiveRestDays: consecutiveRestDays + 1 };
        const effects = getGuideTraitEffects(guide.name, context);
        traitRestBonus = effects.recoveryBonus;
        if (traitRestBonus !== 0) {
          estimate.careerTraitEffects.push({ guide: guide.name, type: "recovery", value: traitRestBonus });
        }
      }
      restAmount += traitRestBonus;
      const restChange = Math.max(0, guide.fatigue - restAmount) - guide.fatigue;
      const restDesc = traitRestBonus > 0 ? "留守休整（含生涯加成+" + traitRestBonus + "）" : "留守休整";
      estimate.fatigueChanges.push({ name: guide.name, change: restChange, task: restDesc });
      continue;
    }
    const route = game.routes.find(r => r.id === guide.task);
    if (!route) continue;
    if (route.blocked) {
      estimate.blockedRoutes++;
      estimate.details.push(guide.name + "尝试走【" + route.name + "】但道路已封，无功而返");
      estimate.fatigueChanges.push({ name: guide.name, change: 0, task: route.name + "(封路)" });
      continue;
    }
    if (usedRoutes.has(route.id)) {
      estimate.details.push(guide.name + "没有有效任务，留守整理马具");
      estimate.fatigueChanges.push({ name: guide.name, change: 0, task: "无有效任务" });
      continue;
    }
    usedRoutes.add(route.id);
    estimate.totalRoutes++;
    let traitEffects = { successMod: 0, fatigueMod: 0, medCostMod: 0, riskMod: 0 };
    if (isCareerBonusEnabled() && careerStats) {
      const context = {
        routeId: route.id,
        isStormDay: game.weather === "暴雪",
        isCaravanRoute: route.caravan,
        rescueFailStreak: rescueFailStreak
      };
      traitEffects = getGuideTraitEffects(guide.name, context);
      if (traitEffects.successMod !== 0 || traitEffects.fatigueMod !== 0 || traitEffects.medCostMod !== 0 || traitEffects.riskMod !== 0) {
        estimate.careerTraitEffects.push({ guide: guide.name, route: route.name, effects: { ...traitEffects } });
      }
    }
    const stormWoodCost = (rm.stormRouteImmune && rm.stormRouteImmune.includes(route.id)) ? 0 : (game.weather === "暴雪" ? 1 : 0);
    const woodCost = route.wood + stormWoodCost;
    estimate.wood -= woodCost;
    estimate.food -= route.food;
    const baseMedCost = route.med;
    const adjustedMedCost = applyMedCostModifier(baseMedCost, traitEffects.medCostMod);
    estimate.med -= adjustedMedCost;
    const adjustedRisk = Math.max(0, route.risk + traitEffects.riskMod);
    const rawFatigue = adjustedRisk + fatigueBonus + (game.weather === "暴雪" ? d.fatigueStorm : d.fatigueBase);
    let fatigueGain = Math.round(rawFatigue * d.fatigueMul);
    if (traitEffects.fatigueMod !== 0) {
      fatigueGain = Math.max(1, Math.round(fatigueGain * (1 + traitEffects.fatigueMod)));
    }
    estimate.fatigueChanges.push({ name: guide.name, change: fatigueGain, task: route.name });
    const failChance = (adjustedRisk + (guide.fatigue + fatigueGain) / 4) / 12;
    let successChance = Math.max(0, Math.min(1, 1 - failChance));
    if (traitEffects.successMod !== 0) {
      successChance = Math.max(0, Math.min(1, successChance + traitEffects.successMod));
    }
    const realReward = route.reward + rewardBonus;
    if (route.caravan) {
      estimate.successRate += successChance;
      estimate.successRoutes++;
      estimate.rep += realReward * successChance;
      estimate.med -= 1 * (1 - successChance);
      const successPct = Math.round(successChance * 100);
      const traitNote = traitEffects.successMod !== 0 ? "（生涯加成" + (traitEffects.successMod > 0 ? "+" : "") + Math.round(traitEffects.successMod * 100) + "%）" : "";
      estimate.details.push(guide.name + "走【" + route.name + "】接应商队：成功率约" + successPct + "%" + traitNote + "，成功声望+" + realReward + "，失败药品-1");
    } else {
      estimate.wood += 1;
      estimate.details.push(guide.name + "巡查【" + route.name + "】：带回柴火+1，疲劳+" + fatigueGain);
    }
  }
  estimate.food -= 2;
  const heatWoodCost = game.weather === "暴雪" ? 3 : 1;
  estimate.wood -= heatWoodCost;
  estimate.details.push("驿站日常：干粮-2，取暖柴火-" + heatWoodCost + (game.weather === "暴雪" ? "（暴雪）" : ""));
  if (estimate.successRoutes > 0) {
    estimate.successRate = Math.round((estimate.successRate / estimate.successRoutes) * 100);
  } else {
    estimate.successRate = 100;
  }
  return estimate;
}
function renderEstimate() {
  const estimate = calculateEstimate();
  if (!estimate) {
    els.estimatePanel.style.display = "none";
    return;
  }
  const hasTasks = game.guides.some(g => g.task);
  if (!hasTasks) {
    els.estimatePanel.style.display = "none";
    return;
  }
  els.estimatePanel.style.display = "block";
  const formatChange = (val, inverse = false) => {
    if (inverse) val = -val;
    if (val > 0) return '<span style="color:#2e7d32">+' + val.toFixed(1) + '</span>';
    if (val < 0) return '<span style="color:#c62828">' + val.toFixed(1) + '</span>';
    return '<span style="color:#5a6e78">±0</span>';
  };
  const formatIntChange = (val, inverse = false) => {
    if (inverse) val = -val;
    if (val > 0) return '<span style="color:#2e7d32">+' + val + '</span>';
    if (val < 0) return '<span style="color:#c62828">' + val + '</span>';
    return '<span style="color:#5a6e78">±0</span>';
  };
  let gridHtml = "";
  gridHtml += '<div style="padding:8px;background:#fff;border-radius:6px;border:1px solid #d6dde2;"><div style="color:#5a6e78;font-size:11px">柴火变化</div><div style="font-size:18px;font-weight:bold">' + formatIntChange(estimate.wood) + '</div></div>';
  gridHtml += '<div style="padding:8px;background:#fff;border-radius:6px;border:1px solid #d6dde2;"><div style="color:#5a6e78;font-size:11px">干粮变化</div><div style="font-size:18px;font-weight:bold">' + formatIntChange(estimate.food) + '</div></div>';
  gridHtml += '<div style="padding:8px;background:#fff;border-radius:6px;border:1px solid #d6dde2;"><div style="color:#5a6e78;font-size:11px">药品变化</div><div style="font-size:18px;font-weight:bold">' + formatChange(estimate.med) + '</div></div>';
  gridHtml += '<div style="padding:8px;background:#fff;border-radius:6px;border:1px solid #d6dde2;"><div style="color:#5a6e78;font-size:11px">声望变化</div><div style="font-size:18px;font-weight:bold">' + formatChange(estimate.rep) + '</div></div>';
  gridHtml += '<div style="padding:8px;background:#fff;border-radius:6px;border:1px solid #d6dde2;"><div style="color:#5a6e78;font-size:11px">平均成功率</div><div style="font-size:18px;font-weight:bold;' + (estimate.successRate < 50 ? 'color:#c62828' : estimate.successRate < 70 ? 'color:#f57c00' : 'color:#2e7d32') + '">' + estimate.successRate + '%</div></div>';
  els.estimateGrid.innerHTML = gridHtml;
  let detailsHtml = "";
  if (estimate.storm) detailsHtml += '<div style="margin-bottom:6px"><span style="background:#1565c0;color:#fff;padding:2px 6px;border-radius:4px;font-size:10px">暴雪</span> 御寒柴火+1/路线，取暖柴火+2，疲劳增长加剧</div>';
  if (estimate.blockedRoutes > 0) detailsHtml += '<div style="margin-bottom:6px"><span style="background:#c62828;color:#fff;padding:2px 6px;border-radius:4px;font-size:10px">封路</span> ' + estimate.blockedRoutes + '条路线无法通行</div>';
  detailsHtml += '<div style="margin-top:6px"><b>向导疲劳预估：</b></div>';
  detailsHtml += estimate.fatigueChanges.map(fc => {
    const changeStr = fc.change > 0 ? '<span style="color:#c62828">+' + fc.change + '</span>' : (fc.change < 0 ? '<span style="color:#2e7d32">' + fc.change + '</span>' : '<span style="color:#5a6e78">±0</span>');
    return '<div style="padding:3px 0">· ' + fc.name + '：' + changeStr + '（' + fc.task + '）</div>';
  }).join("");
  detailsHtml += '<div style="margin-top:6px"><b>详细说明：</b></div>';
  detailsHtml += estimate.details.map(d => '<div style="padding:2px 0">· ' + d + '</div>').join("");
  els.estimateDetails.innerHTML = detailsHtml;
  if (game.currentDayData) {
    game.currentDayData.estimate = estimate;
  }
}
function endDay() {
  if (game.ended) return;
  const sc = game.scenarioConfig;
  const d = DIFF[game.diff];
  const rm = sc.routeMod;
  const usedRoutes = new Set();
  const rewardBonus = rm.rewardBonus || 0;
  const fatigueBonus = rm.fatigueBonus || 0;
  const dayNewTraits = {};
  if (game.currentDayData) {
    game.currentDayData.dispatchStartResources = { wood: game.wood, med: game.med, food: game.food, rep: game.rep };
    game.currentDayData.dispatchStartGuides = game.guides.map(g => ({ name: g.name, fatigue: g.fatigue, task: g.task }));
    game.currentDayData.estimate = calculateEstimate();
  }
  var guideFatigueConsequences = getConsequenceEffectsByType("guideFatigue")
  var guideFatigueBonus = 0
  var guideFatigueGainMod = 0
  var guideMaxFatigueMod = 0
  guideFatigueConsequences.forEach(function(c) {
    guideFatigueBonus += c.effect.fatigueRecoveryBonus || 0
    guideFatigueGainMod += c.effect.fatigueGainMod || 0
    guideMaxFatigueMod += c.effect.maxFatigueMod || 0
  })
  for (const guide of game.guides) {
    const careerStats = careerState.data && careerState.data.guides[guide.name] ? careerState.data.guides[guide.name] : null;
    const consecutiveRestDays = careerStats ? careerStats.consecutiveRest : 0;
    const rescueFailStreak = careerStats ? careerStats.rescueFailStreak : 0;
    const dayResult = { rested: false, routeId: null, success: false, failure: false, isStormDay: game.weather === "暴雪" };
    if (!guide.task) {
      var restAmount = 2 + guideFatigueBonus
      let traitRestBonus = 0;
      if (isCareerBonusEnabled() && careerStats) {
        const context = { consecutiveRestDays: consecutiveRestDays + 1 };
        const effects = getGuideTraitEffects(guide.name, context);
        traitRestBonus = effects.recoveryBonus;
      }
      restAmount += traitRestBonus;
      guide.fatigue = Math.max(0, guide.fatigue - restAmount);
      const restDesc = traitRestBonus > 0 ? "（含生涯加成+" + traitRestBonus + "）" : "";
      recordReplayLog(guide.name + "留守休整" + restDesc + "，疲劳-" + restAmount + "。");
      dayResult.rested = true;
    } else {
      const route = game.routes.find(r => r.id === guide.task);
      if (!route || usedRoutes.has(route.id)) {
        const logMsg = guide.name + "没有有效任务，留守整理马具。";
        game.log.unshift(logMsg);
        recordReplayLog(logMsg);
        dayResult.rested = true;
      } else if (route.blocked) {
        const logMsg = guide.name + "尝试走" + route.name + "，但道路已封，无功而返。";
        game.log.unshift(logMsg);
        recordReplayLog(logMsg);
        dayResult.rested = true;
      } else {
        usedRoutes.add(route.id);
        if (game.routeDispatches[route.id] !== undefined) {
          game.routeDispatches[route.id]++;
        }
        let traitEffects = { successMod: 0, fatigueMod: 0, medCostMod: 0, riskMod: 0 };
        if (isCareerBonusEnabled() && careerStats) {
          const context = {
            routeId: route.id,
            isStormDay: game.weather === "暴雪",
            isCaravanRoute: route.caravan,
            rescueFailStreak: rescueFailStreak
          };
          traitEffects = getGuideTraitEffects(guide.name, context);
        }
        const stormWoodCost = (rm.stormRouteImmune && rm.stormRouteImmune.includes(route.id)) ? 0 : (game.weather === "暴雪" ? 1 : 0);
        const woodCost = route.wood + stormWoodCost;
        game.wood -= woodCost;
        recordResourceChange("wood", -woodCost, guide.name + "执行【" + route.name + "】调度消耗" + (stormWoodCost > 0 ? "（含暴雪御寒" + stormWoodCost + "）" : ""));
        game.food -= route.food;
        if (route.food !== 0) recordResourceChange("food", -route.food, guide.name + "执行【" + route.name + "】调度消耗");
        const baseMedCost = route.med;
        const adjustedMedCost = applyMedCostModifier(baseMedCost, traitEffects.medCostMod);
        game.med -= adjustedMedCost;
        if (adjustedMedCost !== baseMedCost) {
          recordResourceChange("med", -adjustedMedCost, guide.name + "执行【" + route.name + "】调度消耗（生涯调整）");
        } else if (route.med !== 0) {
          recordResourceChange("med", -route.med, guide.name + "执行【" + route.name + "】调度消耗");
        }
        const adjustedRisk = Math.max(0, route.risk + traitEffects.riskMod);
        const rawFatigue = adjustedRisk + fatigueBonus + (game.weather === "暴雪" ? d.fatigueStorm : d.fatigueBase);
        var fatigueGainMul = d.fatigueMul * (1 + guideFatigueGainMod);
        let fatigueGain = Math.max(1, Math.round(rawFatigue * fatigueGainMul));
        if (traitEffects.fatigueMod !== 0) {
          fatigueGain = Math.max(1, Math.round(fatigueGain * (1 + traitEffects.fatigueMod)));
        }
        guide.fatigue += fatigueGain;
        const failChance = route.blocked ? .75 : (adjustedRisk + guide.fatigue / 4) / 12;
        let actualFailChance = failChance;
        if (traitEffects.successMod !== 0) {
          actualFailChance = Math.max(0, Math.min(1, failChance - traitEffects.successMod));
        }
        const cx = game.codex[route.id];
        if (cx) cx.attempts++;
        const realReward = route.reward + rewardBonus;
        dayResult.routeId = route.id;
        if (route.caravan && rand() > actualFailChance) {
          game.rep += realReward;
          recordResourceChange("rep", realReward, guide.name + "在【" + route.name + "】接应商队成功");
          game.saved += 1;
          if (cx) { cx.successes++; cx.rewards.rep += realReward; cx.rewards.wood += route.wood; cx.rewards.food += route.food; cx.rewards.med += adjustedMedCost; }
          const traitNote = traitEffects.successMod > 0 ? "（生涯加成）" : "";
          const logMsg = "第"+game.day+"天，"+guide.name+"在"+route.name+"接应商队成功" + traitNote + "，声望+"+realReward+"，疲劳+" + fatigueGain + "。";
          game.log.unshift(logMsg);
          recordReplayLog(logMsg);
          dayResult.success = true;
        } else if (route.caravan) {
          game.med -= 1;
          recordResourceChange("med", -1, route.name + "救援受挫，消耗额外药品");
          const traitNote = traitEffects.successMod < 0 ? "（生涯减益）" : "";
          const logMsg = "第"+game.day+"天，"+guide.name+"在"+route.name+"救援受挫" + traitNote + "，消耗了额外药品，疲劳+" + fatigueGain + "。";
          game.log.unshift(logMsg);
          recordReplayLog(logMsg);
          dayResult.failure = true;
        } else {
          game.wood += 1;
          recordResourceChange("wood", 1, guide.name + "巡查【" + route.name + "】带回柴火");
          if (cx) cx.rewards.wood += 1;
          const logMsg = "第"+game.day+"天，"+guide.name+"巡查"+route.name+"，带回少量柴火，疲劳+" + fatigueGain + "。";
          game.log.unshift(logMsg);
          recordReplayLog(logMsg);
          dayResult.success = true;
        }
      }
    }
    const newTraits = updateCareerAfterDay(guide.name, dayResult);
    if (newTraits && newTraits.length > 0) {
      dayNewTraits[guide.name] = newTraits;
      newTraits.forEach(trait => {
        const logMsg = "🌟 " + guide.name + "解锁了新特质：" + trait.icon + "「" + trait.name + "」——" + trait.desc;
        game.log.unshift(logMsg);
        recordReplayLog(logMsg);
      });
    }
  }
  game.food -= 2;
  recordResourceChange("food", -2, "驿站日常口粮消耗");
  const heatWoodCost = game.weather === "暴雪" ? 3 : 1;
  game.wood -= heatWoodCost;
  recordResourceChange("wood", -heatWoodCost, "驿站取暖消耗（" + game.weather + "）");
  if (game.wood < game.minResources.wood) game.minResources.wood = game.wood;
  if (game.med < game.minResources.med) game.minResources.med = game.med;
  if (game.food < game.minResources.food) game.minResources.food = game.food;
  const lc = sc.lose || {};
  if (lc.resources) {
    if (game.food < 0) { game.failureReason = "粮食耗尽"; return finish(false); }
    if (game.wood < 0) { game.failureReason = "柴火耗尽"; return finish(false); }
    if (game.med < 0) { game.failureReason = "药品耗尽"; return finish(false); }
  }
  var maxFatigueThreshold = 12 + guideMaxFatigueMod
  if (lc.fatigue && game.guides.some(g => g.fatigue >= maxFatigueThreshold)) { game.failureReason = "向导疲劳过度"; return finish(false); }
  if (lc.medCritical) {
    if (game.med <= lc.medCritical.value) game.medCriticalStreak = (game.medCriticalStreak || 0) + 1;
    else game.medCriticalStreak = 0;
    if (game.medCriticalStreak >= lc.medCritical.days) { game.failureReason = "药品持续短缺，疫情恶化"; return finish(false); }
  }
  let win = false;
  const wc = sc.win;
  const prevTargetReached = game.caravanTargetReached || false;
  switch (wc.type) {
    case "days":
      if (game.day >= game.targetDays) win = true;
      break;
    case "caravans":
      if (game.day >= game.targetDays) win = game.saved >= wc.count;
      if (game.saved >= wc.count && game.day < game.targetDays && !prevTargetReached) {
        game.caravanTargetReached = true;
        game.log.unshift("已达成接应目标，继续坚持到剧本结束即可锁定胜利。");
      }
      break;
    case "days_and_rep":
      if (game.day >= game.targetDays) win = game.rep >= wc.rep;
      break;
    case "caravans_and_rep":
      if (game.day >= game.targetDays) win = (game.saved >= wc.count) && (game.rep >= wc.rep);
      break;
  }
  if (game.day >= game.targetDays) return finish(win);
  endReplayDay();
  game.day += 1;
  rollDay();
  render();
}
function finish(win) {
  game.ended = true;
  endReplayDay();
  detectTurningPoints(win);
  const sc = game.scenarioConfig;
  const d = DIFF[game.diff];
  for (const guide of game.guides) {
    updateCareerAfterGame(guide.name, { win: win, days: game.day });
  }
  saveGameArchive(win, game);
  const unlockedIds = checkScenarioAchievements(sc.id, game, null);
  const newlyUnlocked = unlockAchievements(sc.id, unlockedIds);
  const displayNewlyUnlocked = settingsState.settings.hideAchvHint ? [] : newlyUnlocked;
  const allAchv = ACHIEVEMENTS[sc.id] || [];
  const newlyUnlockedTraits = {};
  if (careerState.data) {
    for (const guideName of ["阿措", "洛桑"]) {
      const guideStats = careerState.data.guides[guideName];
      if (guideStats && guideStats.traits.length > 0) {
        newlyUnlockedTraits[guideName] = guideStats.traits.slice();
      }
    }
  }
  let achvHtml = '<div class="result-achievements"><h3>🏆 剧本成就</h3>';
  if (allAchv.length > 0) {
    achvHtml += allAchv.map(achv => {
      const isUnlocked = isAchievementUnlocked(sc.id, achv.id);
      const isNew = displayNewlyUnlocked.includes(achv.id);
      return '<div class="result-achv-item ' + (isNew ? 'new' : '') + '">' +
        '<div class="achievement-icon ' + (isUnlocked ? 'unlocked' : 'locked') + '">' + achv.icon + '</div>' +
        '<div class="achievement-info">' +
        '<div class="achievement-name">' + achv.name + '</div>' +
        '<div class="achievement-desc">' + achv.desc + '</div>' +
        '</div>' +
        '<span class="achievement-badge ' + (isUnlocked ? 'unlocked' : 'locked') + '">' + (isUnlocked ? '已获得' : '未获得') + '</span>' +
        '</div>';
    }).join("");
  } else {
    achvHtml += '<div style="font-size:12px;color:#5a6e78">此剧本暂无成就</div>';
  }
  achvHtml += '</div>';
  let traitHtml = '';
  if (careerState.data) {
    traitHtml = '<div class="result-achievements"><h3>🌟 向导生涯特质</h3>';
    for (const guideName of ["阿措", "洛桑"]) {
      const guideStats = careerState.data.guides[guideName];
      const traits = guideStats ? guideStats.traits : [];
      traitHtml += '<div style="margin-bottom:10px">';
      traitHtml += '<div style="font-weight:700;margin-bottom:4px">' + guideName + '</div>';
      if (traits.length > 0) {
        traitHtml += '<div style="display:flex;flex-wrap:wrap;gap:6px">';
        traits.forEach(tid => {
          const trait = TRAITS[tid];
          if (trait) {
            const traitCls = trait.isNegative ? 'trait-negative' : 'trait-positive';
            traitHtml += '<div class="trait-badge ' + traitCls + '" title="' + trait.desc + '">' + trait.icon + ' ' + trait.name + '</div>';
          }
        });
        traitHtml += '</div>';
      } else {
        traitHtml += '<div style="font-size:12px;color:#5a6e78">尚未解锁任何特质，继续冒险吧！</div>';
      }
      traitHtml += '</div>';
    }
    traitHtml += '</div>';
  }
  const winTitles = {
    standard: "驿站守住了雪线",
    medshortage: "疫情终于缓解",
    caravan: "旺季完美收官",
    rescue: "封山大获全胜"
  };
  const loseTitles = {
    standard: "驿站没能撑下去",
    medshortage: "疫病击溃了驿站",
    caravan: "旺季业绩惨淡",
    rescue: "救援未能完成"
  };
  const isCustom = sc.id && sc.id.startsWith(CUSTOM_SCENARIO_PREFIX);
  const defaultWinTitle = isCustom ? (sc.winTitle || "胜利！") : "胜利";
  const defaultLoseTitle = isCustom ? (sc.loseTitle || "失败...") : "失败";
  els.resultTitle.textContent = win ? (winTitles[sc.id] || defaultWinTitle) : (loseTitles[sc.id] || defaultLoseTitle);
  els.resultText.innerHTML = (win ? sc.resultWin(game) : sc.resultLose(game)) + " 难度：" + d.label + achvHtml + traitHtml;
  els.overlay.classList.remove("hidden");
  if (settingsState.settings.autoReplay && game.replayHistory && game.replayHistory.length > 0) {
    setTimeout(() => {
      openReplayFromGame();
    }, 300);
  }
}
document.querySelector("#endDayBtn").onclick = endDay;
els.briefingCloseBtn.onclick = closeDailyBriefing;
document.querySelector("#newBtn").onclick = showDiffPicker;
document.querySelector("#againBtn").onclick = showDiffPicker;
const codexOverlay = document.querySelector("#codexOverlay");
function getDefaultCodex(routeId) {
  const r = ALL_ROUTES_MAP[routeId];
  return {
    name: r.name, risk: r.risk, reward: r.reward, desc: r.desc,
    wood: r.wood, food: r.food, med: r.med,
    seen: 0, blocked: 0, attempts: 0, successes: 0,
    rewards: { rep: 0, wood: 0, food: 0, med: 0 }
  };
}
function renderCodex() {
  const scenarioId = game ? game.scenario : chosenScenario;
  const all = getAllScenarios();
  const sc = all[scenarioId];
  const sr = getScenarioRoutes(scenarioId);
  const rewardBonus = sc.routeMod.rewardBonus || 0;
  let html = '<h3 style="margin:0 0 8px;color:' + sc.color + '">剧本概览 · ' + sc.name + '</h3>';
  html += '<div class="codex-card">' +
    '<div class="codex-row"><span>剧本</span><span><span class="scenario-badge" style="background:'+sc.color+'">' + sc.subtitle + '</span> ' + sc.name + '</span></div>' +
    '<div class="codex-row"><span>目标</span><span>' + sc.win.label + '</span></div>' +
    '<div class="codex-row"><span>可用路线</span><span>' + sr.length + ' 条</span></div>' +
    '<div class="codex-row"><span>事件触发率</span><span>' + Math.round(sc.eventTriggerChance * 100) + '%</span></div>' +
    (rewardBonus > 0 ? '<div class="codex-row"><span>全局声望加成</span><span>+' + rewardBonus + ' / 次</span></div>' : '') +
    '<div style="font-size:12px;color:#5a6e78;line-height:1.5;margin-top:6px">' + sc.desc + '</div>' +
    '</div>';
  html += '<h3 style="margin:12px 0 8px;color:' + sc.color + '">路线图鉴</h3>';
  html += sr.map(r => {
    const c = (game && game.codex) ? (game.codex[r.id] || getDefaultCodex(r.id)) : getDefaultCodex(r.id);
    const blockProb = c.seen > 0 ? Math.round(c.blocked / c.seen * 100) : 0;
    const successRate = c.attempts > 0 ? Math.round(c.successes / c.attempts * 100) : 0;
    const riskPct = Math.min(c.risk / 5 * 100, 100);
    const rewardPct = Math.min((c.reward + rewardBonus) / 7 * 100, 100);
    const noData = c.seen === 0;
    const displayReward = c.reward + rewardBonus;
    return '<div class="codex-card"><h3 style="color:' + sc.color + '">' + c.name + '</h3>' +
      '<div style="font-size:13px;color:#5a6e78;margin-bottom:10px;line-height:1.5">' + r.desc + '</div>' +
      '<div class="codex-row"><span>调度消耗</span><span>柴 ' + r.wood + ' · 粮 ' + r.food + ' · 药 ' + (r.med > 0 ? r.med : '+' + Math.abs(r.med)) + '</span></div>' +
      '<div class="codex-row"><span>基础风险</span><span>' + c.risk + ' / 5</span></div>' +
      '<div class="codex-bar"><div class="codex-bar-fill risk" style="width:' + riskPct + '%"></div></div>' +
      '<div class="codex-row"><span>常见声望收益</span><span>' + displayReward + ' / 次' + (rewardBonus > 0 ? '（含剧本加成）' : '') + '</span></div>' +
      '<div class="codex-bar"><div class="codex-bar-fill reward" style="width:' + rewardPct + '%"></div></div>' +
      '<div class="codex-row"><span>暴雪封路概率</span><span>' + (noData ? '暂无数据' : blockProb + '%（' + c.blocked + '/' + c.seen + '天）') + '</span></div>' +
      (noData ? '' : '<div class="codex-bar"><div class="codex-bar-fill block" style="width:' + blockProb + '%"></div></div>') +
      '<div class="codex-row"><span>历史成功次数</span><span>' + (noData ? '暂无数据' : c.successes + ' / ' + c.attempts + ' 次（' + successRate + '%）') + '</span></div>' +
      (noData ? '' : '<div class="codex-row"><span>累计收益</span><span>声望+' + c.rewards.rep + ' 柴+' + c.rewards.wood + ' 粮+' + c.rewards.food + ' 药+' + c.rewards.med + '</span></div>') +
    '</div>';
  }).join("");
  html += '<h3 style="margin:12px 0 8px;color:#8a5a9e">事件图鉴</h3>';
  if (game && game.eventStats) {
    html += '<div class="codex-card"><h4>本局事件统计</h4>' +
      '<div class="stats-grid">' +
      '<div class="stat-item"><span>触发总数</span><span>' + game.eventStats.triggered + ' 次</span></div>' +
      '<div class="stat-item"><span>天气事件</span><span>' + (game.eventStats.byCategory.weather || 0) + ' 次</span></div>' +
      '<div class="stat-item"><span>物资事件</span><span>' + (game.eventStats.byCategory.supply || 0) + ' 次</span></div>' +
      '<div class="stat-item"><span>向导事件</span><span>' + (game.eventStats.byCategory.guide || 0) + ' 次</span></div>' +
      '<div class="stat-item"><span>声望事件</span><span>' + (game.eventStats.byCategory.reputation || 0) + ' 次</span></div>' +
      '<div class="stat-item"><span>随机事件</span><span>' + (game.eventStats.byCategory.random || 0) + ' 次</span></div>' +
      '</div></div>';
  }
  html += EVENTS_POOL.map(e => {
    let weightNote = "";
    if (sc.eventWeightOverrides && sc.eventWeightOverrides[e.id]) {
      weightNote = ' <span class="event-tag tag-good">剧本权重×' + sc.eventWeightOverrides[e.id] + '</span>';
    } else if (sc.eventWeightMul && sc.eventWeightMul[e.category]) {
      const m = sc.eventWeightMul[e.category];
      if (m > 1.1) weightNote = ' <span class="event-tag tag-good">高频</span>';
      else if (m < 0.9) weightNote = ' <span class="event-tag tag-bad">低频</span>';
    }
    const c = (game && game.eventCodex) ? game.eventCodex[e.id] : { name: e.name, category: e.category, desc: e.desc, seen: 0, choices: {} };
    const noData = !c.seen;
    let choicesHtml = '';
    if (!noData && c.choices) {
      choicesHtml = '<div style="margin-top:8px">';
      Object.keys(c.choices).forEach(key => {
        const choice = c.choices[key];
        choicesHtml += '<div class="choice-tag">· ' + choice.title + '：选择 ' + choice.count + ' 次</div>';
      });
      choicesHtml += '</div>';
    }
    const catLabel = EVENT_CATEGORY_LABELS[c.category];
    return '<div class="codex-card codex-event"><span class="event-category ' + c.category + '" style="font-size:11px;padding:1px 8px">' + catLabel + '</span>' + weightNote +
      '<h4>' + c.name + '</h4>' +
      '<div style="font-size:12px;color:#5a6e78;line-height:1.5">' + c.desc + '</div>' +
      '<div class="codex-row"><span>触发次数</span><span>' + (noData ? '尚未触发' : c.seen + ' 次') + '</span></div>' +
      choicesHtml +
    '</div>';
  }).join("");
  if (careerState.data) {
    html += '<h3 style="margin:12px 0 8px;color:#4a7c5e">🌟 向导生涯统计</h3>';
    for (const guideName of ["阿措", "洛桑"]) {
      const stats = careerState.data.guides[guideName];
      if (stats) {
        const traits = stats.traits || [];
        html += '<div class="codex-card">';
        html += '<h4 style="margin:0 0 8px;color:#315c72">' + guideName + '</h4>';
        html += '<div class="stats-grid">';
        html += '<div class="stat-item"><span>累计天数</span><span>' + (stats.totalDays || 0) + ' 天</span></div>';
        html += '<div class="stat-item"><span>累计局数</span><span>' + (stats.totalGames || 0) + ' 局</span></div>';
        html += '<div class="stat-item"><span>执行任务</span><span>' + (stats.totalRoutes || 0) + ' 次</span></div>';
        html += '<div class="stat-item"><span>任务成功</span><span>' + (stats.totalSuccesses || 0) + ' 次</span></div>';
        html += '<div class="stat-item"><span>留守休整</span><span>' + (stats.restDays || 0) + ' 天</span></div>';
        html += '<div class="stat-item"><span>暴雪经历</span><span>' + (stats.stormDays || 0) + ' 天</span></div>';
        html += '</div>';
        if (traits.length > 0) {
          html += '<div style="margin-top:8px"><b>已解锁特质：</b></div>';
          html += '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px">';
          traits.forEach(tid => {
            const trait = TRAITS[tid];
            if (trait) {
              const traitCls = trait.isNegative ? 'trait-negative' : 'trait-positive';
              html += '<span class="trait-badge ' + traitCls + '" title="' + trait.desc + '">' + trait.icon + ' ' + trait.name + '</span>';
            }
          });
          html += '</div>';
        } else {
          html += '<div style="margin-top:8px;font-size:12px;color:#5a6e78">尚未解锁任何特质，继续冒险吧！</div>';
        }
        html += '</div>';
      }
    }
    html += '<h3 style="margin:12px 0 8px;color:#4a7c5e">📚 所有特质一览</h3>';
    html += '<div class="codex-card">';
    html += '<div style="font-size:12px;color:#5a6e78;margin-bottom:8px">完成对应条件即可解锁特质，获得永久加成或触发特殊效果。</div>';
    for (const tid in TRAITS) {
      const trait = TRAITS[tid];
      const isUnlocked = careerState.data.guides["阿措"].traits.includes(tid) || careerState.data.guides["洛桑"].traits.includes(tid);
      const traitCls = trait.isNegative ? 'trait-negative' : 'trait-positive';
      const lockedStyle = isUnlocked ? '' : 'opacity:0.5;filter:grayscale(0.8)';
      html += '<div style="padding:6px 0;border-bottom:1px dashed #dde5e6;display:flex;align-items:center;gap:8px">';
      html += '<span class="trait-badge ' + traitCls + '" style="' + lockedStyle + '">' + trait.icon + ' ' + trait.name + '</span>';
      html += '<div style="flex:1;font-size:12px;color:#5a6e78">' + trait.desc + '</div>';
      html += '<span style="font-size:11px;padding:2px 6px;border-radius:3px;background:' + (isUnlocked ? '#d4ede0;color:#2e7d32' : '#e0e0e0;color:#757575') + '">' + (isUnlocked ? '已解锁' : '未解锁') + '</span>';
      html += '</div>';
    }
    html += '</div>';
  }
  if (game) {
    const d = DIFF[game.diff];
    html += '<h3 style="margin:12px 0 8px;color:' + sc.color + '">本局统计</h3>';
    html += '<div class="codex-card">' +
      '<div class="codex-row"><span>剧本</span><span>' + sc.name + '</span></div>' +
      '<div class="codex-row"><span>难度</span><span>' + d.label + '</span></div>' +
      '<div class="codex-row"><span>当前天数</span><span>' + game.day + ' / ' + game.targetDays + '</span></div>' +
      '<div class="codex-row"><span>接应商队</span><span>' + game.saved + ' 队' + (sc.win.type === 'caravans' || sc.win.type === 'caravans_and_rep' ? '（目标 ' + sc.win.count + '）' : '') + '</span></div>' +
      '<div class="codex-row"><span>当前声望</span><span>' + game.rep + (sc.win.type === 'days_and_rep' || sc.win.type === 'caravans_and_rep' ? '（目标 ' + sc.win.rep + '）' : '') + '</span></div>' +
      '<div class="codex-row"><span>当前物资</span><span>柴' + game.wood + ' 粮' + game.food + ' 药' + game.med + '</span></div>' +
      '<div class="codex-row"><span>向导状态</span><span>' + game.guides.map(g => g.name + '(' + g.fatigue + ')').join('、') + '</span></div>' +
      '<div class="codex-row"><span>事件触发</span><span>' + game.eventStats.triggered + ' 次</span></div>' +
    '</div>';
  }
  els.codexGrid.innerHTML = html;
}
function openCodex() {
  renderCodex();
  codexOverlay.classList.remove("hidden");
}
document.querySelector("#codexBtn").onclick = openCodex;
document.querySelector("#diffCodexBtn").onclick = openCodex;
document.querySelector("#resultCodexBtn").onclick = openCodex;
document.querySelector("#resultReplayBtn").onclick = openReplayFromGame;
document.querySelector("#codexCloseBtn").onclick = () => codexOverlay.classList.add("hidden");
if (els.resultReportBtn) {
  els.resultReportBtn.onclick = () => {
    if (!game || !game.ended) return;
    const tempArchive = buildTempArchiveFromGame();
    if (tempArchive) generateBattleReport(tempArchive);
  };
}
if (els.reportCloseBtn) {
  els.reportCloseBtn.onclick = () => {
    if (els.reportOverlay) els.reportOverlay.classList.add("hidden");
  };
}
if (els.reportOverlay) {
  els.reportOverlay.onclick = (e) => {
    if (e.target === els.reportOverlay) els.reportOverlay.classList.add("hidden");
  };
}
if (els.reportCopyBtn) {
  els.reportCopyBtn.onclick = copyReportToClipboard;
}
if (els.reportReformatBtn) {
  els.reportReformatBtn.onclick = reformatReport;
}
function buildTempArchiveFromGame() {
  if (!game) return null;
  const sc = game.scenarioConfig;
  const d = DIFF[game.diff];
  const unlockedIds = checkScenarioAchievements(sc.id, game, null);
  return {
    id: Date.now(),
    win: !game.failureReason,
    scenario: game.scenario,
    scenarioLabel: sc.name,
    scenarioColor: sc.color,
    day: game.day,
    difficulty: game.diff,
    difficultyLabel: d.label,
    savedCaravans: game.saved,
    reputation: game.rep,
    targetDays: game.targetDays,
    winTarget: { ...sc.win },
    minResources: { ...game.minResources },
    failureReason: game.failureReason,
    routePreference: { ...game.routeDispatches },
    keyLogs: getKeyLogs(game),
    dateStr: new Date().toLocaleString("zh-CN"),
    replayHistory: JSON.parse(JSON.stringify(game.replayHistory || [])),
    turningPoints: JSON.parse(JSON.stringify(game.turningPoints || [])),
    achievements: unlockedIds,
    challengeMode: !!game.challengeMode,
    challengeCode: game.challengeCode || null,
    challengeSeed: game.challengeSeed || null
  };
}
let currentReportText = "";
function generateBattleReport(archive) {
  const d = DIFF[archive.difficulty];
  const scName = archive.scenarioLabel;
  const diffName = archive.difficultyLabel;
  const winText = archive.win ? "✅ 胜利" : "❌ 失败";
  let targetInfo = "";
  if (archive.winTarget) {
    switch (archive.winTarget.type) {
      case "days": targetInfo = '坚守到第 ' + archive.targetDays + ' 天'; break;
      case "caravans": targetInfo = '接应 ≥ ' + archive.winTarget.count + ' 队商队'; break;
      case "days_and_rep": targetInfo = '坚守 ' + archive.targetDays + ' 天 且 声望 ≥' + archive.winTarget.rep; break;
      case "caravans_and_rep": targetInfo = '接应≥' + archive.winTarget.count + '队 且 声望≥' + archive.winTarget.rep; break;
    }
  }
  let html = '';
  let txt = '';
  html += '<div class="report-header" style="border-left:4px solid ' + (archive.scenarioColor || '#315c72') + '">';
  html += '<h2 style="margin:0 0 8px">📋 「' + scName + '」战报 · ' + winText + '</h2>';
  html += '<div class="report-meta-grid">';
  if (archive.challengeMode && archive.challengeCode) {
    html += '<div class="meta-item"><span class="meta-label">🔗 挑战码</span><span class="meta-value challenge-code-display" id="reportChallengeCodeDisplay">' + archive.challengeCode + '</span></div>';
  }
  html += '<div class="meta-item"><span class="meta-label">📜 剧本</span><span class="meta-value">' + scName + '</span></div>';
  html += '<div class="meta-item"><span class="meta-label">⚔️ 难度</span><span class="meta-value">' + diffName + '</span></div>';
  html += '<div class="meta-item"><span class="meta-label">🎯 胜利条件</span><span class="meta-value">' + targetInfo + '</span></div>';
  html += '<div class="meta-item"><span class="meta-label">📅 游玩时间</span><span class="meta-value">' + archive.dateStr + '</span></div>';
  html += '</div></div>';
  txt += '═══════════════════════════════════════\n';
  txt += '📋 「' + scName + '」战报 · ' + winText + '\n';
  txt += '═══════════════════════════════════════\n';
  if (archive.challengeMode && archive.challengeCode) {
    txt += '🔗 挑战码：' + archive.challengeCode + '\n';
  }
  txt += '📜 剧本：' + scName + '\n';
  txt += '⚔️ 难度：' + diffName + '\n';
  txt += '🎯 胜利条件：' + targetInfo + '\n';
  txt += '📅 游玩时间：' + archive.dateStr + '\n';
  txt += '\n';
  html += '<div class="report-section"><h3>📊 最终结果</h3>';
  html += '<div class="report-result-grid">';
  html += '<div class="result-item"><span class="ri-label">天数进度</span><span class="ri-value">' + archive.day + ' / ' + (archive.targetDays || 15) + ' 天</span></div>';
  html += '<div class="result-item"><span class="ri-label">接应商队</span><span class="ri-value">' + archive.savedCaravans + ' 队</span></div>';
  html += '<div class="result-item"><span class="ri-label">最终声望</span><span class="ri-value">' + archive.reputation + '</span></div>';
  html += '<div class="result-item"><span class="ri-label">最低柴火</span><span class="ri-value">' + archive.minResources.wood + '</span></div>';
  html += '<div class="result-item"><span class="ri-label">最低药品</span><span class="ri-value">' + archive.minResources.med + '</span></div>';
  html += '<div class="result-item"><span class="ri-label">最低干粮</span><span class="ri-value">' + archive.minResources.food + '</span></div>';
  if (archive.failureReason && !archive.win) {
    html += '<div class="result-item danger-item"><span class="ri-label">⚠️ 失败原因</span><span class="ri-value">' + archive.failureReason + '</span></div>';
  }
  html += '</div></div>';
  txt += '───────────────────────────────────────────\n';
  txt += '📊 最终结果\n';
  txt += '───────────────────────────────────────────\n';
  txt += '天数进度：' + archive.day + ' / ' + (archive.targetDays || 15) + ' 天\n';
  txt += '接应商队：' + archive.savedCaravans + ' 队\n';
  txt += '最终声望：' + archive.reputation + '\n';
  txt += '最低柴火：' + archive.minResources.wood + '｜最低药品：' + archive.minResources.med + '｜最低干粮：' + archive.minResources.food + '\n';
  if (archive.failureReason && !archive.win) {
    txt += '⚠️ 失败原因：' + archive.failureReason + '\n';
  }
  txt += '\n';
  html += '<div class="report-section"><h3>🏆 成就解锁</h3>';
  const scenarioAchv = ACHIEVEMENTS[archive.scenario] || [];
  let unlockedList = [];
  let lockedList = [];
  scenarioAchv.forEach(achv => {
    const unlocked = archive.achievements && archive.achievements.includes(achv.id);
    if (unlocked) unlockedList.push(achv); else lockedList.push(achv);
  });
  if (unlockedList.length > 0) {
    html += '<div class="report-achv-grid unlocked">';
    unlockedList.forEach(achv => {
      html += '<div class="report-achv-item unlocked"><span class="ra-icon">' + achv.icon + '</span><span class="ra-name">' + achv.name + '</span><span class="ra-desc">' + achv.desc + '</span></div>';
    });
    html += '</div>';
    txt += '───────────────────────────────────────────\n';
    txt += '🏆 成就解锁（' + unlockedList.length + '/' + scenarioAchv.length + '）\n';
    txt += '───────────────────────────────────────────\n';
    unlockedList.forEach(achv => {
      txt += '✅ [' + achv.icon + '] ' + achv.name + ' — ' + achv.desc + '\n';
    });
  }
  if (lockedList.length > 0) {
    html += '<div class="report-achv-grid locked"><div class="locked-title">未解锁（' + lockedList.length + '）</div>';
    lockedList.forEach(achv => {
      html += '<div class="report-achv-item locked"><span class="ra-icon">🔒</span><span class="ra-name">' + achv.name + '</span><span class="ra-desc">' + achv.desc + '</span></div>';
    });
    html += '</div>';
    txt += '未解锁：' + lockedList.map(a => '[' + a.name + ']').join('、') + '\n';
  }
  if (scenarioAchv.length === 0) {
    html += '<div style="color:#5a6e78;font-size:13px">此剧本暂无成就设定</div>';
    txt += '此剧本暂无成就设定\n';
  }
  html += '</div>';
  txt += '\n';
  if (archive.turningPoints && archive.turningPoints.length > 0) {
    html += '<div class="report-section"><h3>⚡ 关键转折点</h3>';
    html += '<ul class="report-turning-list">';
    txt += '───────────────────────────────────────────\n';
    txt += '⚡ 关键转折点\n';
    txt += '───────────────────────────────────────────\n';
    archive.turningPoints.forEach(tp => {
      html += '<li class="tp-item tp-' + tp.type + '">';
      html += '<span class="tp-day">D' + tp.day + '</span>';
      html += '<span class="tp-icon">' + (tp.type === 'turn' ? '🔀' : tp.type === 'risk' ? '⚠️' : tp.type === 'gain' ? '📈' : '✨') + '</span>';
      html += '<span class="tp-text">' + tp.reason + '</span>';
      html += '</li>';
      txt += 'D' + tp.day + ' ' + tp.reason + '\n';
    });
    html += '</ul></div>';
    txt += '\n';
  }
  if (archive.replayHistory && archive.replayHistory.length > 0) {
    html += '<div class="report-section"><h3>📅 每日调度摘要</h3>';
    html += '<ul class="report-daily-list">';
    txt += '───────────────────────────────────────────\n';
    txt += '📅 每日调度摘要\n';
    txt += '───────────────────────────────────────────\n';
    archive.replayHistory.forEach(day => {
      const guides = day.dispatchStartGuides || day.startGuides || [];
      const assignments = guides.map(g => {
        if (!g.task || g.task === "") return g.name + "休息";
        const rt = ALL_ROUTES_MAP[g.task];
        return g.name + "→" + (rt ? rt.name : g.task);
      }).join("｜");
      const weather = day.weather || "晴";
      const endRes = day.endResources || day.dispatchEndResources || day.endResources || {};
      const startRes = day.startResources || day.dispatchStartResources || {};
      const repDelta = (endRes.rep !== undefined && startRes.rep !== undefined) ? (endRes.rep - startRes.rep) : 0;
      const foodDelta = (endRes.food !== undefined && startRes.food !== undefined) ? (endRes.food - startRes.food) : 0;
      const medDelta = (endRes.med !== undefined && startRes.med !== undefined) ? (endRes.med - startRes.med) : 0;
      const woodDelta = (endRes.wood !== undefined && startRes.wood !== undefined) ? (endRes.wood - startRes.wood) : 0;
      const deltaStr = [
        repDelta !== 0 ? '声望' + (repDelta > 0 ? '+' : '') + repDelta : '',
        woodDelta !== 0 ? '柴火' + (woodDelta > 0 ? '+' : '') + woodDelta : '',
        foodDelta !== 0 ? '干粮' + (foodDelta > 0 ? '+' : '') + foodDelta : '',
        medDelta !== 0 ? '药品' + (medDelta > 0 ? '+' : '') + medDelta : ''
      ].filter(Boolean).join('，') || '无资源变化';
      let eventStr = '';
      if (day.event) {
        eventStr = '｜📜' + day.event.name;
        if (day.eventChoice) eventStr += '（选' + day.eventChoice.label + '）';
      }
      const blockedCount = day.routes ? day.routes.filter(r => r.blocked).length : 0;
      const caravanCount = day.routes ? day.routes.filter(r => r.caravan).length : 0;
      html += '<li class="daily-item">';
      html += '<div class="daily-head">';
      html += '<span class="daily-day">D' + day.day + '</span>';
      html += '<span class="daily-weather w-' + weather + '">' + weather + '</span>';
      if (blockedCount > 0) html += '<span class="daily-badge danger">封路×' + blockedCount + '</span>';
      if (caravanCount > 0) html += '<span class="daily-badge success">商队×' + caravanCount + '</span>';
      html += '</div>';
      html += '<div class="daily-dispatch">调度：' + assignments + '</div>';
      html += '<div class="daily-delta">' + deltaStr + '</div>';
      if (eventStr) html += '<div class="daily-event">' + eventStr + '</div>';
      html += '</li>';
      txt += 'D' + day.day + ' [' + weather + '] ' + assignments + '\n';
      if (blockedCount > 0 || caravanCount > 0) {
        txt += '    路况：' + (blockedCount > 0 ? '封路×' + blockedCount + ' ' : '') + (caravanCount > 0 ? '商队×' + caravanCount : '') + '\n';
      }
      txt += '    资源：' + deltaStr + '\n';
      if (eventStr) txt += '    ' + eventStr + '\n';
    });
    html += '</ul></div>';
    txt += '\n';
  }
  if (archive.challengeMode && archive.challengeCode) {
    html += '<div class="report-section report-verification">';
    html += '<h3>🔗 挑战码可复现验证说明</h3>';
    html += '<div class="verify-box">';
    html += '<p><b>复现方法：</b>重新开始游戏 → 在开局设置界面开启「挑战码模式」→ 输入上方挑战码 → 确保剧本和难度与战报一致 → 开始游戏。</p>';
    html += '<p><b>复现内容：</b>同一挑战码 + 相同剧本 + 相同难度，将保证<b>天气序列、封路序列、商队出现序列、随机事件触发序列、事件选项后果序列</b>与本局完全一致。</p>';
    html += '<p><b>结果差异：</b>即使使用相同挑战码，由于<b>玩家每日的向导调度选择</b>不同，最终的资源走向、商队接应成功率、事件选项决策都会导向不同结局。挑战码仅固定环境的随机因素，不固定玩家决策的后果。</p>';
    html += '<p><b>验证要点：</b>逐天对比可验证：每天的天气类型、暴雪天被封路的路线编号、出现商队的路线编号、被触发的随机事件及ID、同一事件选项产生的持续效果类型与目标路线，应与本战报完全一致。</p>';
    html += '</div></div>';
    txt += '───────────────────────────────────────────\n';
    txt += '🔗 挑战码可复现验证说明\n';
    txt += '───────────────────────────────────────────\n';
    txt += '复现方法：重新开始游戏 → 在开局设置界面开启「挑战码模式」→ 输入上方挑战码 → 确保剧本和难度与战报一致 → 开始游戏。\n';
    txt += '复现内容：同一挑战码 + 相同剧本 + 相同难度，将保证 天气序列、封路序列、商队出现序列、随机事件触发序列、事件选项后果序列 与本局完全一致。\n';
    txt += '结果差异：即使使用相同挑战码，由于玩家每日的向导调度选择不同，最终的资源走向、商队接应成功率、事件选项决策都会导向不同结局。挑战码仅固定环境的随机因素，不固定玩家决策的后果。\n';
    txt += '验证要点：逐天对比可验证：每天的天气类型、暴雪天被封路的路线编号、出现商队的路线编号、被触发的随机事件及ID、同一事件选项产生的持续效果类型与目标路线，应与本战报完全一致。\n';
  }
  txt += '═══════════════════════════════════════\n';
  txt += '— 战报生成自雪线驿站 · 挑战码模式 v' + CHALLENGE_VERSION + ' —\n';
  if (els.reportContent) els.reportContent.innerHTML = html;
  if (els.reportOverlay) els.reportOverlay.classList.remove("hidden");
  currentReportText = txt;
}
function copyReportToClipboard() {
  if (!currentReportText) return;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(currentReportText).then(() => {
      if (els.reportCopyHint) {
        els.reportCopyHint.textContent = "✅ 战报已复制到剪贴板";
        els.reportCopyHint.className = "report-copy-hint success";
        setTimeout(() => { els.reportCopyHint.className = "report-copy-hint"; }, 2500);
      }
    }).catch(() => {
      fallbackCopyText(currentReportText);
    });
  } else {
    fallbackCopyText(currentReportText);
  }
}
function fallbackCopyText(text) {
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    if (els.reportCopyHint) {
      els.reportCopyHint.textContent = "✅ 战报已复制到剪贴板";
      els.reportCopyHint.className = "report-copy-hint success";
      setTimeout(() => { els.reportCopyHint.className = "report-copy-hint"; }, 2500);
    }
  } catch (e) {
    if (els.reportCopyHint) {
      els.reportCopyHint.textContent = "❌ 复制失败，请手动选中文本复制";
      els.reportCopyHint.className = "report-copy-hint error";
    }
  }
}
function reformatReport() {
  if (els.reportContent) {
    els.reportContent.style.whiteSpace = (els.reportContent.style.whiteSpace === 'pre-wrap') ? '' : 'pre-wrap';
  }
}

let currentArchiveFilter = "recent";
function sortArchives(archives, filter) {
  const sorted = [...archives];
  const all = getAllScenarios();
  if (all[filter]) {
    return sorted.filter(a => a.scenario === filter).sort((a, b) => b.timestamp - a.timestamp);
  }
  switch (filter) {
    case "recent":
      sorted.sort((a, b) => b.timestamp - a.timestamp);
      break;
    case "win":
      return sorted.filter(a => a.win).sort((a, b) => b.timestamp - a.timestamp);
    case "lose":
      return sorted.filter(a => !a.win).sort((a, b) => b.timestamp - a.timestamp);
    case "rep":
      sorted.sort((a, b) => b.reputation - a.reputation);
      break;
  }
  return sorted;
}
function getRouteName(routeId) {
  const route = ALL_ROUTES_MAP[routeId];
  return route ? route.name : routeId;
}
function renderArchiveCard(archive) {
  const d = DIFF[archive.difficulty];
  const diffCls = d ? d.cls : "normal";
  const winCls = archive.win ? "win" : "lose";
  const winText = archive.win ? "胜利" : "失败";
  const scColor = archive.scenarioColor || "#315c72";
  let prefHtml = "";
  const routes = Object.entries(archive.routePreference).filter(([_, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  if (routes.length > 0) {
    prefHtml = '<div class="route-preference">' + routes.map(([id, count]) =>
      '<span class="route-tag">' + getRouteName(id) + ' × ' + count + '</span>'
    ).join("") + '</div>';
  } else {
    prefHtml = '<div style="font-size:12px;color:#5a6e78">无派遣记录</div>';
  }
  let logsHtml = "";
  if (archive.keyLogs && archive.keyLogs.length > 0) {
    logsHtml = '<div class="archive-log">' + archive.keyLogs.map(log =>
      '<div class="archive-log-entry">' + log + '</div>'
    ).join("") + '</div>';
  }
  let targetInfo = "";
  if (archive.winTarget) {
    switch (archive.winTarget.type) {
      case "days": targetInfo = '坚守到第 ' + archive.targetDays + ' 天'; break;
      case "caravans": targetInfo = '接应 ≥ ' + archive.winTarget.count + ' 队'; break;
      case "days_and_rep": targetInfo = '声望 ≥ ' + archive.winTarget.rep; break;
      case "caravans_and_rep": targetInfo = '接应≥' + archive.winTarget.count + '队 且 声望≥' + archive.winTarget.rep; break;
    }
  } else {
    targetInfo = '坚守到第 ' + (archive.targetDays || 15) + ' 天';
  }
  const hasReplay = archive.replayHistory && archive.replayHistory.length > 0;
  const scenarioAchv = ACHIEVEMENTS[archive.scenario] || [];
  let archiveAchvHtml = '';
  if (scenarioAchv.length > 0) {
    archiveAchvHtml = '<div class="archive-achievements">';
    archiveAchvHtml += '<div class="archive-achv-title">本局成就</div>';
    archiveAchvHtml += '<div class="archive-achv-grid">';
    scenarioAchv.forEach(achv => {
      const unlocked = archive.achievements && archive.achievements.includes(achv.id);
      archiveAchvHtml += '<span class="archive-achv-tag ' + (unlocked ? 'unlocked' : 'locked') + '" title="' + achv.desc + '">' + achv.icon + ' ' + achv.name + '</span>';
    });
    archiveAchvHtml += '</div></div>';
  }
  var consequenceHtml = ""
  var typeIcons = { weather: "🌤", routeBlock: "🛤", guideFatigue: "🥾", caravanChance: "🐫", routeStatus: "🚀", resource: "📦" }
  var typeLabels = { weather: "天气", routeBlock: "路线封路", guideFatigue: "向导疲劳", caravanChance: "商队出现", routeStatus: "路线状态", resource: "每日资源" }
  var consTimeline = archive.consequencesTimeline || []
  var consCount = consTimeline.length
  if (consCount === 0 && archive.replayHistory && archive.replayHistory.length > 0) {
    archive.replayHistory.forEach(function(day) {
      if (day.consequencesTriggered && day.consequencesTriggered.length > 0) {
        day.consequencesTriggered.forEach(function(c) {
          consTimeline.push({
            day: day.day,
            sourceEventName: c.sourceEventName,
            description: c.description,
            totalDays: c.totalDays,
            type: c.type,
            triggerDay: day.day,
            expiredDay: null,
            effectSummary: c.effectSummary || "",
            routeName: c.routeName || "",
            sourceChoice: c.sourceChoice || ""
          })
          consCount++
        })
      }
    })
  }
  if (consCount > 0) {
    var totalDurationDays = 0
    consTimeline.forEach(function(c) {
      var end = c.expiredDay || (c.triggerDay ? (c.triggerDay + (c.totalDays || 0) - 1) : archive.day)
      var start = c.triggerDay || c.day || 1
      totalDurationDays += Math.max(0, Math.min(end, archive.day) - start + 1)
    })
    consequenceHtml = '<div class="archive-detail-row" style="margin-top:8px"><span>⚡ 持续效果时间线</span><span>' + consCount + '项，累计影响' + totalDurationDays + '天</span></div>'
    consequenceHtml += '<div style="font-size:12px;margin-top:4px;background:#f5f8f8;padding:8px;border-radius:6px;border:1px solid #dde5e6">'
    consTimeline.slice(0, 8).forEach(function(c) {
      var start = c.triggerDay || c.day || 1
      var end = c.expiredDay || (start + (c.totalDays || 0) - 1)
      var actualEnd = Math.min(end, archive.day)
      var status = c.expiredDay ? ("已结束（共" + (actualEnd - start + 1) + "天）") : (end > archive.day ? "进行中（剩余" + (end - archive.day) + "天）" : "已结束")
      var statusCls = c.expiredDay ? "color:#a33d31" : (end > archive.day ? "color:#3f7a54" : "color:#5a6e78")
      consequenceHtml += '<div style="padding:4px 0;border-bottom:1px dashed #dde5e6">'
      consequenceHtml += '<div style="display:flex;align-items:center;gap:4px">'
      consequenceHtml += '<span title="' + (typeLabels[c.type] || c.type) + '">' + (typeIcons[c.type] || "✨") + '</span>'
      consequenceHtml += '<b style="color:#1f2a2f">' + (c.sourceEventName || "未知事件") + '</b>'
      consequenceHtml += '<span style="font-size:10px;color:#5a6e78;margin-left:auto">D' + start + ' → D' + actualEnd + '</span>'
      consequenceHtml += '</div>'
      consequenceHtml += '<div style="font-size:11px;color:#2d3a40;margin-top:2px;line-height:1.4">' + (c.description || "") + '</div>'
      if (c.effectSummary) {
        consequenceHtml += '<div style="font-size:10px;color:#315c72;margin-top:2px;background:#e8f0f2;padding:2px 4px;border-radius:3px;display:inline-block">📊 ' + c.effectSummary + '</div>'
      }
      if (c.routeName) {
        consequenceHtml += '<div style="font-size:10px;color:#5a7fa8;margin-top:2px">🎯 ' + c.routeName + '</div>'
      }
      consequenceHtml += '<div style="font-size:10px;margin-top:2px"><span style="' + statusCls + '">⏱ ' + status + '</span></div>'
      consequenceHtml += '</div>'
    })
    if (consTimeline.length > 8) consequenceHtml += '<div style="color:#5a6e78;margin-top:4px;text-align:center">...等' + consTimeline.length + '条持续效果，点击「调度复盘」查看完整详情</div>'
    consequenceHtml += '</div>'
  }
  return '<div class="archive-card ' + winCls + '" data-archive-id="' + archive.id + '">' +
    '<div class="archive-header">' +
      '<div class="archive-title">' +
        '<span class="archive-badge ' + winCls + '">' + winText + '</span>' +
        '<span class="archive-scenario-tag" style="background:' + scColor + '">' + archive.scenarioLabel + '</span>' +
        '<span class="diff-label ' + diffCls + '">' + archive.difficultyLabel + '</span>' +
        (archive.challengeMode && archive.challengeCode ?
          '<span class="challenge-tag" title="固定挑战码模式">' + '🔗 ' + archive.challengeCode + '</span>' : '') +
      '</div>' +
      '<div class="archive-date">' + archive.dateStr + '</div>' +
    '</div>' +
    '<div class="archive-stats">' +
      '<div class="archive-stat"><span class="archive-stat-label">天数进度</span><span class="archive-stat-value">第 ' + archive.day + ' / ' + (archive.targetDays || 15) + ' 天</span></div>' +
      '<div class="archive-stat"><span class="archive-stat-label">接应商队</span><span class="archive-stat-value">' + archive.savedCaravans + ' 队</span></div>' +
      '<div class="archive-stat"><span class="archive-stat-label">最终声望</span><span class="archive-stat-value">' + archive.reputation + '</span></div>' +
      '<div class="archive-stat"><span class="archive-stat-label">最低柴火</span><span class="archive-stat-value">' + archive.minResources.wood + '</span></div>' +
      '<div class="archive-stat"><span class="archive-stat-label">最低药品</span><span class="archive-stat-value">' + archive.minResources.med + '</span></div>' +
      '<div class="archive-stat"><span class="archive-stat-label">最低干粮</span><span class="archive-stat-value">' + archive.minResources.food + '</span></div>' +
    '</div>' +
    '<div class="archive-detail">' +
      '<div class="archive-detail-row"><span>胜利条件</span><span>' + targetInfo + '</span></div>' +
      (archive.failureReason ?
        '<div class="archive-detail-row"><span>主要失败原因</span><span class="danger">' + archive.failureReason + '</span></div>' : '') +
      '<div class="archive-detail-row"><span>路线派遣偏好</span><span></span></div>' +
      prefHtml +
      '<div class="archive-detail-row" style="margin-top:8px"><span>关键日志</span><span></span></div>' +
      logsHtml +
      consequenceHtml +
    '</div>' +
    archiveAchvHtml +
    (hasReplay ? '<button class="archive-replay-btn" data-archive-id="' + archive.id + '">★ 查看调度复盘</button>' : '') +
    (archive.challengeMode && archive.challengeCode ?
      '<button class="archive-challenge-replay-btn" data-archive-id="' + archive.id + '">🔗 用相同挑战码再战</button>' : '') +
    '<button class="archive-report-btn" data-archive-id="' + archive.id + '">📋 生成战报</button>' +
  '</div>';
}
function renderArchiveFilterButtons() {
  if (!els.archiveFilter) return;
  const customScenarios = loadCustomScenarios();
  const customList = Object.values(customScenarios);
  let html = `
    <button data-filter="recent" class="active">最近游玩</button>
    <button data-filter="win">胜利记录</button>
    <button data-filter="lose">失败记录</button>
    <button data-filter="rep">最高声望</button>
    <button data-filter="standard" style="background:#315c72">标准雪线</button>
    <button data-filter="medshortage" style="background:#a33d31">药品短缺</button>
    <button data-filter="caravan" style="background:#b08a28">商队旺季</button>
    <button data-filter="rescue" style="background:#5a7fa8">封山救援</button>
  `;
  customList.forEach(sc => {
    html += `<button data-filter="${sc.id}" style="background:${sc.color}"><span class="editor-tag editor-badge-custom" style="margin-right:4px">自定义</span>${sc.name}</button>`;
  });
  els.archiveFilter.innerHTML = html;
  document.querySelectorAll(".archive-filter button").forEach(btn => {
    btn.onclick = () => {
      currentArchiveFilter = btn.dataset.filter;
      document.querySelectorAll(".archive-filter button").forEach(b => b.classList.toggle("active", b === btn));
      renderArchiveList();
      renderStatsDashboard();
    };
  });
}
function renderArchiveList() {
  const archives = loadGameArchives();
  const filtered = sortArchives(archives, currentArchiveFilter);
  if (filtered.length === 0) {
    els.archiveList.innerHTML = '<div class="archive-empty">暂无档案记录<br><span style="font-size:12px">完成一局游戏后将自动保存战绩</span></div>';
    return;
  }
  els.archiveList.innerHTML = filtered.map(renderArchiveCard).join("");
  document.querySelectorAll(".archive-replay-btn").forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const archiveId = parseInt(btn.dataset.archiveId);
      const archive = loadGameArchives().find(a => a.id === archiveId);
      if (archive) {
        openReplayFromArchive(archive);
      }
    };
  });
  document.querySelectorAll(".archive-challenge-replay-btn").forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const archiveId = parseInt(btn.dataset.archiveId);
      const archive = loadGameArchives().find(a => a.id === archiveId);
      if (archive && archive.challengeMode && archive.challengeCode) {
        closeArchive();
        chosenScenario = archive.scenario;
        chosenDiff = archive.difficulty;
        challengeMode = true;
        currentChallengeCode = archive.challengeCode;
        setTimeout(() => {
          renderScenarioOptions();
          document.querySelectorAll(".diff-card").forEach(c => c.classList.toggle("selected", c.dataset.diff === chosenDiff));
          if (els.challengeModeToggle) els.challengeModeToggle.checked = true;
          if (els.challengeSection) els.challengeSection.style.opacity = "1";
          if (els.challengeSection) els.challengeSection.style.pointerEvents = "auto";
          if (els.challengeCodeInput) els.challengeCodeInput.value = archive.challengeCode;
          if (els.challengeStatusHint) {
            els.challengeStatusHint.textContent = "已从档案载入挑战码 ✓";
            els.challengeStatusHint.className = "challenge-status-hint challenge-success";
          }
          els.overlay.classList.add("hidden");
          els.diffOverlay.classList.remove("hidden");
        }, 100);
      }
    };
  });
  document.querySelectorAll(".archive-report-btn").forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const archiveId = parseInt(btn.dataset.archiveId);
      const archive = loadGameArchives().find(a => a.id === archiveId);
      if (archive) {
        generateBattleReport(archive);
      }
    };
  });
}
function openArchive() {
  currentArchiveFilter = "recent";
  renderArchiveFilterButtons();
  renderArchiveList();
  renderStatsDashboard();
  els.archiveOverlay.classList.remove("hidden");
}
function closeArchive() {
  els.archiveOverlay.classList.add("hidden");
}
function showConfirm(title, text, onConfirm) {
  els.confirmTitle.textContent = title;
  els.confirmText.textContent = text;
  els.confirmOverlay.classList.remove("hidden");
  document.querySelector("#confirmOkBtn").onclick = () => {
    els.confirmOverlay.classList.add("hidden");
    onConfirm();
  };
  document.querySelector("#confirmCancelBtn").onclick = () => {
    els.confirmOverlay.classList.add("hidden");
  };
}
function clearAllArchives() {
  showConfirm("清空档案", "确定要清空所有档案记录吗？此操作无法撤销。", () => {
    saveGameArchives([]);
    renderArchiveList();
    renderStatsDashboard();
  });
}
function createStatsBucket() {
  return { total: 0, wins: 0, daySum: 0, caravanSum: 0, maxRep: 0, routeMap: {}, failMap: {} };
}
function addArchiveToStatsBucket(bucket, archive) {
  if (!archive) return;
  bucket.total++;
  if (archive.win === true) bucket.wins++;
  bucket.daySum += parseInt(archive.day) || 0;
  bucket.caravanSum += parseInt(archive.savedCaravans) || 0;
  bucket.maxRep = Math.max(bucket.maxRep, parseInt(archive.reputation) || 0);
  if (archive.routePreference && typeof archive.routePreference === 'object') {
    Object.entries(archive.routePreference).forEach(([rid, cnt]) => {
      const count = parseInt(cnt) || 0;
      if (count > 0) bucket.routeMap[rid] = (bucket.routeMap[rid] || 0) + count;
    });
  }
  if (archive.win === false && archive.failureReason) {
    const reason = String(archive.failureReason).trim() || "未知原因";
    bucket.failMap[reason] = (bucket.failMap[reason] || 0) + 1;
  }
}
function rankedStatsEntries(map, limit) {
  return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, limit);
}
function finalizeStatsBucket(bucket, meta = {}) {
  const total = bucket.total;
  return {
    ...meta,
    total,
    wins: bucket.wins,
    winRate: total > 0 ? Math.round((bucket.wins / total) * 100) : 0,
    avgDays: total > 0 ? (bucket.daySum / total).toFixed(1) : "0.0",
    avgCaravans: total > 0 ? (bucket.caravanSum / total).toFixed(1) : "0.0",
    maxRep: bucket.maxRep,
    commonRoutes: rankedStatsEntries(bucket.routeMap, 5),
    commonFailures: rankedStatsEntries(bucket.failMap, 5)
  };
}
function computeStats(archives) {
  if (!archives || archives.length === 0) return null;
  const overallBucket = createStatsBucket();
  const scenarioMap = {};
  const diffMap = {};
  archives.forEach(a => {
    if (!a) return;
    addArchiveToStatsBucket(overallBucket, a);
    const scenarioKey = a.scenario || "standard";
    if (!scenarioMap[scenarioKey]) scenarioMap[scenarioKey] = createStatsBucket();
    addArchiveToStatsBucket(scenarioMap[scenarioKey], a);
    const diffKey = a.difficulty || "normal";
    if (!diffMap[diffKey]) diffMap[diffKey] = createStatsBucket();
    addArchiveToStatsBucket(diffMap[diffKey], a);
  });
  const overall = finalizeStatsBucket(overallBucket);
  const allScenarios = getAllScenarios();
  const scenarioStats = Object.entries(scenarioMap).map(([id, bucket]) => finalizeStatsBucket(bucket, {
    id,
    name: (allScenarios[id] && allScenarios[id].name) || id,
    color: (allScenarios[id] && allScenarios[id].color) || "#315c72"
  })).sort((a, b) => b.total - a.total);
  const diffStats = Object.entries(diffMap).map(([id, bucket]) => {
    const d = DIFF[id];
    return finalizeStatsBucket(bucket, {
      id,
      name: d ? d.label : id,
      cls: d ? d.cls : "normal"
    });
  }).sort((a, b) => b.total - a.total);
  return { ...overall, scenarioStats, diffStats };
}
function buildCompactRankText(entries, formatter, emptyText) {
  if (!entries || entries.length === 0) return emptyText;
  return entries.slice(0, 2).map(formatter).join("、");
}
function renderGroupedStatsRow(item, options) {
  const pct = options.maxTotal > 0 ? Math.round((item.total / options.maxTotal) * 100) : 0;
  const labelStyle = options.color ? ' style="color:' + options.color + '"' : '';
  const barStyle = options.color ? ' style="width:' + pct + '%;background:' + options.color + '"' : ' style="width:' + pct + '%"';
  const barClass = options.barClass || "";
  const routesText = buildCompactRankText(item.commonRoutes, ([rid, cnt]) => getRouteName(rid) + '×' + cnt, "暂无路线");
  const failuresText = buildCompactRankText(item.commonFailures, ([reason, cnt]) => reason + '×' + cnt, "暂无失败原因");
  let html = '<div class="stats-rank-item"><span class="stats-rank-label"' + labelStyle + '>' + item.name + '</span>';
  html += '<div class="stats-rank-bar-wrap"><div class="stats-rank-bar ' + barClass + '"' + barStyle + '></div></div>';
  html += '<span class="stats-rank-count">' + item.winRate + '%</span></div>';
  html += '<div class="stats-rank-detail"><b>' + item.wins + '/' + item.total + '胜</b> · 均' + item.avgDays + '天 · 商队' + item.avgCaravans + ' · 最高声望' + item.maxRep + '<br>路线：' + routesText + '<br>失败：' + failuresText + '</div>';
  return html;
}
function renderStatsDashboard() {
  const container = els.statsDashboard;
  const archives = loadGameArchives();
  const filtered = sortArchives(archives, currentArchiveFilter);
  const stats = computeStats(filtered);
  if (!stats) {
    container.innerHTML = '<div class="stats-empty">暂无统计数据 · 完成游戏后自动生成</div>';
    return;
  }
  const all = getAllScenarios();
  const filterLabels = {
    recent: "所有档案", win: "胜利记录", lose: "失败记录", rep: "按声望排序",
    standard: "标准雪线", medshortage: "药品短缺", caravan: "商队旺季", rescue: "封山救援"
  };
  let filterLabel = filterLabels[currentArchiveFilter];
  if (!filterLabel && all[currentArchiveFilter]) {
    filterLabel = all[currentArchiveFilter].name;
  }
  filterLabel = filterLabel || "当前筛选";
  let html = '<div class="stats-dashboard-title">跨局统计看板</div>';
  html += '<div class="stats-filter-info">当前筛选：' + filterLabel + ' · 共 ' + stats.total + ' 条档案</div>';
  html += '<div class="stats-grid-main">';
  html += '<div class="stats-cell"><span class="stats-cell-label">总胜率</span><span class="stats-cell-value">' + stats.winRate + '%</span><span class="stats-cell-sub">' + stats.wins + ' 胜 / ' + stats.total + ' 局</span></div>';
  html += '<div class="stats-cell"><span class="stats-cell-label">平均坚持天数</span><span class="stats-cell-value">' + stats.avgDays + '</span><span class="stats-cell-sub">天</span></div>';
  html += '<div class="stats-cell"><span class="stats-cell-label">平均接应商队</span><span class="stats-cell-value">' + stats.avgCaravans + '</span><span class="stats-cell-sub">队</span></div>';
  html += '<div class="stats-cell"><span class="stats-cell-label">最高声望</span><span class="stats-cell-value">' + stats.maxRep + '</span><span class="stats-cell-sub">点</span></div>';
  html += '</div>';
  html += '<div class="stats-breakdown">';
  html += '<div class="stats-breakdown-section"><div class="stats-breakdown-title">剧本统计</div>';
  if (stats.scenarioStats.length > 0) {
    const maxS = Math.max(...stats.scenarioStats.map(s => s.total));
    stats.scenarioStats.forEach(s => {
      html += renderGroupedStatsRow(s, { maxTotal: maxS, color: s.color, barClass: "scenario" });
    });
  } else {
    html += '<div style="font-size:12px;color:#5a6e78">暂无数据</div>';
  }
  html += '</div>';
  html += '<div class="stats-breakdown-section"><div class="stats-breakdown-title">难度统计</div>';
  if (stats.diffStats.length > 0) {
    const maxD = Math.max(...stats.diffStats.map(s => s.total));
    stats.diffStats.forEach(s => {
      html += renderGroupedStatsRow(s, { maxTotal: maxD, barClass: 'diff-' + s.cls });
    });
  } else {
    html += '<div style="font-size:12px;color:#5a6e78">暂无数据</div>';
  }
  html += '</div>';
  html += '<div class="stats-breakdown-section"><div class="stats-breakdown-title">常用路线</div>';
  if (stats.commonRoutes.length > 0) {
    const maxR = stats.commonRoutes[0][1];
    stats.commonRoutes.forEach(([rid, cnt]) => {
      const name = getRouteName(rid);
      const pct = maxR > 0 ? Math.round((cnt / maxR) * 100) : 0;
      html += '<div class="stats-rank-item"><span class="stats-rank-label">' + name + '</span>';
      html += '<div class="stats-rank-bar-wrap"><div class="stats-rank-bar route" style="width:' + pct + '%"></div></div>';
      html += '<span class="stats-rank-count">' + cnt + '</span></div>';
    });
  } else {
    html += '<div style="font-size:12px;color:#5a6e78">暂无数据</div>';
  }
  html += '</div>';
  html += '<div class="stats-breakdown-section"><div class="stats-breakdown-title">常见失败原因</div>';
  if (stats.commonFailures.length > 0) {
    const maxF = stats.commonFailures[0][1];
    stats.commonFailures.forEach(([reason, cnt]) => {
      const pct = maxF > 0 ? Math.round((cnt / maxF) * 100) : 0;
      html += '<div class="stats-rank-item"><span class="stats-rank-label" title="' + reason + '">' + reason + '</span>';
      html += '<div class="stats-rank-bar-wrap"><div class="stats-rank-bar failure" style="width:' + pct + '%"></div></div>';
      html += '<span class="stats-rank-count">' + cnt + '</span></div>';
    });
  } else {
    html += '<div style="font-size:12px;color:#5a6e78">暂无数据</div>';
  }
  html += '</div>';
  html += '</div>';
  container.innerHTML = html;
}
const SAMPLE_ARCHIVES = [
  { version: 3, id: 1001, win: true, scenario: "standard", scenarioLabel: "标准雪线", scenarioColor: "#315c72", day: 15, difficulty: "safe", difficultyLabel: "稳妥", savedCaravans: 6, reputation: 18, targetDays: 15, winTarget: { type: "days", label: "坚守到最后" }, minResources: { wood: 5, med: 3, food: 6 }, failureReason: null, routePreference: { north: 4, ridge: 3, valley: 3 }, keyLogs: ["【事件】暴雪预警", "成功接应商队"], timestamp: Date.now() - 86400000 * 5, dateStr: "2026/06/14 10:30", replayHistory: [{ day: 1, startResources: { wood: 25, med: 10, food: 28, rep: 0 }, endResources: { wood: 22, med: 9, food: 24, rep: 2 }, weather: "晴", routes: [], startGuides: [], endGuides: [], logs: [], estimate: null }], turningPoints: [], achievements: ["standard_survivor"] },
  { version: 3, id: 1002, win: false, scenario: "standard", scenarioLabel: "标准雪线", scenarioColor: "#315c72", day: 9, difficulty: "hard", difficultyLabel: "险境", savedCaravans: 2, reputation: 5, targetDays: 15, winTarget: { type: "days", label: "坚守到最后" }, minResources: { wood: 0, med: 0, food: 1 }, failureReason: "柴火耗尽", routePreference: { north: 3, ridge: 2 }, keyLogs: ["暴雪封路", "柴火耗尽"], timestamp: Date.now() - 86400000 * 4, dateStr: "2026/06/15 14:20", replayHistory: [], turningPoints: [], achievements: [] },
  { version: 3, id: 1003, win: true, scenario: "medshortage", scenarioLabel: "药品短缺", scenarioColor: "#a33d31", day: 18, difficulty: "normal", difficultyLabel: "标准", savedCaravans: 4, reputation: 28, targetDays: 18, winTarget: { type: "days_and_rep", rep: 25, label: "熬到疫情缓解" }, minResources: { wood: 3, med: 1, food: 4 }, failureReason: null, routePreference: { north: 4, herbal: 5, ridge: 2 }, keyLogs: ["向导受伤", "赠送药品博取名声"], timestamp: Date.now() - 86400000 * 3, dateStr: "2026/06/16 09:15", replayHistory: [], turningPoints: [], achievements: ["medshortage_no_outbreak", "medshortage_savior"] },
  { version: 3, id: 1004, win: false, scenario: "medshortage", scenarioLabel: "药品短缺", scenarioColor: "#a33d31", day: 7, difficulty: "hard", difficultyLabel: "险境", savedCaravans: 1, reputation: 3, targetDays: 18, winTarget: { type: "days_and_rep", rep: 25, label: "熬到疫情缓解" }, minResources: { wood: 2, med: 0, food: 1 }, failureReason: "药品持续短缺，疫情恶化", routePreference: { valley: 3, herbal: 2 }, keyLogs: ["【事件】向导受伤", "药品耗尽"], timestamp: Date.now() - 86400000 * 2, dateStr: "2026/06/17 16:45", replayHistory: [], turningPoints: [], achievements: [] },
  { version: 3, id: 1005, win: true, scenario: "caravan", scenarioLabel: "商队旺季", scenarioColor: "#b08a28", day: 12, difficulty: "normal", difficultyLabel: "标准", savedCaravans: 14, reputation: 22, targetDays: 12, winTarget: { type: "caravans", count: 12, label: "接应足够商队" }, minResources: { wood: 4, med: 2, food: 0 }, failureReason: null, routePreference: { north: 3, market: 6, ridge: 4 }, keyLogs: ["商队求援", "旺季完美收官"], timestamp: Date.now() - 86400000 * 1, dateStr: "2026/06/18 11:00", replayHistory: [], turningPoints: [], achievements: ["caravan_tycoon", "caravan_wealthy"] },
  { version: 3, id: 1006, win: false, scenario: "caravan", scenarioLabel: "商队旺季", scenarioColor: "#b08a28", day: 8, difficulty: "hard", difficultyLabel: "险境", savedCaravans: 6, reputation: 8, targetDays: 12, winTarget: { type: "caravans", count: 12, label: "接应足够商队" }, minResources: { wood: 1, med: 0, food: 0 }, failureReason: "粮食耗尽", routePreference: { ridge: 3, valley: 2 }, keyLogs: ["封路", "干粮耗尽"], timestamp: Date.now() - 86400000 * 1, dateStr: "2026/06/18 15:30", replayHistory: [], turningPoints: [], achievements: [] },
  { version: 3, id: 1007, win: true, scenario: "rescue", scenarioLabel: "封山救援", scenarioColor: "#5a7fa8", day: 10, difficulty: "safe", difficultyLabel: "稳妥", savedCaravans: 9, reputation: 35, targetDays: 10, winTarget: { type: "caravans_and_rep", count: 8, rep: 30, label: "救出足够商队" }, minResources: { wood: 4, med: 3, food: 2 }, failureReason: null, routePreference: { glacier: 4, cliff: 3, ridge: 2 }, keyLogs: ["暴雪预警", "派出向导接应"], timestamp: Date.now() - 43200000, dateStr: "2026/06/19 08:20", replayHistory: [], turningPoints: [], achievements: ["rescue_blizzard_hero", "rescue_extreme"] },
  { version: 3, id: 1008, win: false, scenario: "rescue", scenarioLabel: "封山救援", scenarioColor: "#5a7fa8", day: 5, difficulty: "hard", difficultyLabel: "险境", savedCaravans: 3, reputation: 10, targetDays: 10, winTarget: { type: "caravans_and_rep", count: 8, rep: 30, label: "救出足够商队" }, minResources: { wood: 0, med: 1, food: 0 }, failureReason: "柴火耗尽", routePreference: { cliff: 2, north: 1 }, keyLogs: ["暴雪封路", "柴火耗尽"], timestamp: Date.now() - 21600000, dateStr: "2026/06/19 12:50", replayHistory: [], turningPoints: [], achievements: [] },
  { version: 3, id: 1011, win: true, scenario: "standard", scenarioLabel: "标准雪线", scenarioColor: "#315c72", day: 15, difficulty: "normal", difficultyLabel: "标准", savedCaravans: 8, reputation: 25, targetDays: 15, winTarget: { type: "days", label: "坚守到最后" }, minResources: { wood: 2, med: 1, food: 3 }, failureReason: null, routePreference: { ridge: 5, north: 4, valley: 2 }, keyLogs: ["【事件】发现物资窖藏", "成功接应商队"], timestamp: Date.now() - 86400000 * 6, dateStr: "2026/06/13 09:45", replayHistory: [], turningPoints: [], achievements: ["standard_caravan_collector"] },
  { version: 3, id: 1012, win: false, scenario: "standard", scenarioLabel: "标准雪线", scenarioColor: "#315c72", day: 11, difficulty: "normal", difficultyLabel: "标准", savedCaravans: 3, reputation: 8, targetDays: 15, winTarget: { type: "days", label: "坚守到最后" }, minResources: { wood: 1, med: 0, food: 0 }, failureReason: "药品耗尽", routePreference: { north: 3, valley: 3, ridge: 2 }, keyLogs: ["【事件】向导受伤", "药品告急"], timestamp: Date.now() - 86400000 * 7, dateStr: "2026/06/12 14:10", replayHistory: [], turningPoints: [], achievements: [] },
  { version: 3, id: 1013, win: false, scenario: "standard", scenarioLabel: "标准雪线", scenarioColor: "#315c72", day: 8, difficulty: "hard", difficultyLabel: "险境", savedCaravans: 1, reputation: 2, targetDays: 15, winTarget: { type: "days", label: "坚守到最后" }, minResources: { wood: 0, med: 0, food: 0 }, failureReason: "向导疲劳过度", routePreference: { ridge: 4, north: 2 }, keyLogs: ["向导疲劳度过高", "暴雪连连"], timestamp: Date.now() - 86400000 * 8, dateStr: "2026/06/11 18:30", replayHistory: [], turningPoints: [], achievements: [] },
  { version: 1, id: 1009, win: true, scenario: "standard", scenarioLabel: "标准雪线", scenarioColor: "#315c72", day: 15, difficulty: "normal", difficultyLabel: "标准", savedCaravans: 5, reputation: 15, targetDays: 15, minResources: { wood: 3, med: 2, food: 4 }, failureReason: null, routePreference: { north: 3, ridge: 2, valley: 2 }, keyLogs: ["成功接应商队"], timestamp: Date.now() - 172800000, dateStr: "2026/06/13 20:10" },
  { version: 1, id: 1010, win: false, day: 6, difficulty: "hard", difficultyLabel: "险境", savedCaravans: 1, reputation: 2, targetDays: 15, minResources: { wood: 0, med: 0, food: 0 }, failureReason: "药品耗尽", routePreference: {}, keyLogs: [], timestamp: Date.now() - 259200000, dateStr: "2026/06/12 17:30" },
  { version: 2, id: 1014, win: true, day: 15, difficulty: "safe", difficultyLabel: "稳妥", savedCaravans: 7, reputation: 20, targetDays: 15, minResources: { wood: 4, med: 2, food: 5 }, failureReason: null, routePreference: { north: 5, valley: 4, ridge: 2 }, keyLogs: ["坚守到最后"], timestamp: Date.now() - 345600000, dateStr: "2026/06/11 10:00", replayHistory: [], turningPoints: [] }
];
function loadSampleData() {
  showConfirm("加载样例数据", "将 14 条样例档案（含不同剧本、难度和旧版本存档）追加到现有档案中，确定继续吗？", () => {
    const existing = loadGameArchives();
    const newArchives = SAMPLE_ARCHIVES.map(a => migrateArchive({ ...a }));
    const merged = [...newArchives, ...existing];
    if (merged.length > 100) merged.length = 100;
    saveGameArchives(merged);
    renderArchiveList();
    renderStatsDashboard();
  });
}
document.querySelector("#archiveBtn").onclick = openArchive;
document.querySelector("#archiveCloseBtn").onclick = closeArchive;
document.querySelector("#clearArchiveBtn").onclick = clearAllArchives;
if (els.loadSampleBtn) els.loadSampleBtn.onclick = loadSampleData;
let currentReplayData = null;
let currentReplayDayIndex = 0;
const RESOURCE_LABELS = { wood: "柴火", med: "药品", food: "干粮", rep: "声望" };
function openReplayFromGame() {
  if (!game || !game.replayHistory || game.replayHistory.length === 0) {
    alert("当前没有复盘数据");
    return;
  }
  const sc = game.scenarioConfig;
  const d = DIFF[game.diff];
  currentReplayData = {
    title: sc.name + " · " + d.label + "难度 · " + (game.ended ? (game.failureReason ? "失败" : "胜利") : "进行中"),
    scenarioLabel: sc.name,
    scenarioColor: sc.color,
    win: game.ended ? !game.failureReason : null,
    failureReason: game.failureReason,
    savedCaravans: game.saved,
    reputation: game.rep,
    targetDays: game.targetDays,
    winTarget: { ...sc.win },
    replayHistory: JSON.parse(JSON.stringify(game.replayHistory)),
    turningPoints: JSON.parse(JSON.stringify(game.turningPoints || []))
  };
  openReplayModal();
}
function openReplayFromArchive(archive) {
  if (!archive.replayHistory || archive.replayHistory.length === 0) {
    alert("该档案没有复盘数据（可能是旧版本存档）");
    return;
  }
  currentReplayData = {
    title: archive.scenarioLabel + " · " + archive.difficultyLabel + "难度 · " + (archive.win ? "胜利" : "失败"),
    scenarioLabel: archive.scenarioLabel,
    scenarioColor: archive.scenarioColor || "#315c72",
    win: archive.win,
    failureReason: archive.failureReason,
    savedCaravans: archive.savedCaravans,
    reputation: archive.reputation,
    targetDays: archive.targetDays,
    winTarget: archive.winTarget,
    replayHistory: JSON.parse(JSON.stringify(archive.replayHistory)),
    turningPoints: JSON.parse(JSON.stringify(archive.turningPoints || []))
  };
  openReplayModal();
}
function openReplayModal() {
  currentReplayDayIndex = 0;
  els.replayTitle.textContent = "调度复盘 · " + currentReplayData.title;
  els.replayTitle.style.color = currentReplayData.scenarioColor || "#315c72";
  renderReplaySummary();
  renderReplayTimeline();
  renderReplayDay();
  els.replayOverlay.classList.remove("hidden");
}
function closeReplay() {
  els.replayOverlay.classList.add("hidden");
  currentReplayData = null;
  currentReplayDayIndex = 0;
}
function renderReplaySummary() {
  const data = currentReplayData;
  let winTargetText = "";
  if (data.winTarget) {
    switch (data.winTarget.type) {
      case "days": winTargetText = "坚守 " + data.targetDays + " 天"; break;
      case "caravans": winTargetText = "接应 " + data.winTarget.count + " 队"; break;
      case "days_and_rep": winTargetText = "坚守 " + data.targetDays + " 天 + 声望 " + data.winTarget.rep; break;
      case "caravans_and_rep": winTargetText = "接应 " + data.winTarget.count + " 队 + 声望 " + data.winTarget.rep; break;
    }
  }
  const resultBadge = data.win === null ? '<span class="diff-label normal">进行中</span>' :
    (data.win ? '<span class="diff-label safe">胜利</span>' : '<span class="diff-label hard">失败</span>');
  els.replaySummaryBar.innerHTML =
    '<div class="replay-summary-item"><span class="replay-summary-label">剧本结果</span><span class="replay-summary-value">' + resultBadge + '</span></div>' +
    '<div class="replay-summary-item"><span class="replay-summary-label">接应商队</span><span class="replay-summary-value">' + data.savedCaravans + ' 队</span></div>' +
    '<div class="replay-summary-item"><span class="replay-summary-label">最终声望</span><span class="replay-summary-value">' + data.reputation + '</span></div>' +
    '<div class="replay-summary-item"><span class="replay-summary-label">胜利目标</span><span class="replay-summary-value" style="font-size:12px;color:#5a6e78">' + winTargetText + '</span></div>';
}
function renderReplayTimeline() {
  const history = currentReplayData.replayHistory;
  const turningSet = new Set((currentReplayData.turningPoints || []).map(tp => tp.day));
  let html = "";
  history.forEach((day, idx) => {
    const isTurning = day.isTurningPoint;
    const isActive = idx === currentReplayDayIndex;
    let cls = "replay-day-btn";
    if (isTurning) cls += " turning";
    if (isActive) cls += " active";
    html += '<button class="' + cls + '" data-day-idx="' + idx + '" title="第 ' + day.day + ' 天' + (day.turningPointReason ? '（转折点：' + day.turningPointReason + '）' : '') + '">D' + day.day + (isTurning ? '★' : '') + '</button>';
  });
  els.replayTimeline.innerHTML = html;
  document.querySelectorAll(".replay-day-btn").forEach(btn => {
    btn.onclick = () => {
      currentReplayDayIndex = parseInt(btn.dataset.dayIdx);
      renderReplayTimeline();
      renderReplayDay();
    };
  });
}
function renderReplayTurningBanner() {
  const day = currentReplayData.replayHistory[currentReplayDayIndex];
  if (day && day.isTurningPoint) {
    els.replayTurningBanner.innerHTML = '<div class="replay-turning-title">关键转折点</div><div style="font-size:13px;line-height:1.6"><strong>' + (day.turningPointReason || '') + '</strong></div>';
    els.replayTurningBanner.className = "replay-turning-banner";
  } else {
    els.replayTurningBanner.innerHTML = "";
    els.replayTurningBanner.className = "";
  }
}
function formatResourceDiff(res, before, after) {
  const diff = after - before;
  if (diff > 0) return '<span class="res-change up">+' + diff + '</span>';
  if (diff < 0) return '<span class="res-change down">' + diff + '</span>';
  return '<span class="res-change-flat">±0</span>';
}
function renderReplayResources(day) {
  if (!day.endResources) return '<div style="font-size:12px;color:#5a6e78">数据未记录</div>';
  let html = "";
  const resKeys = ["wood", "food", "med", "rep"];
  resKeys.forEach(key => {
    const before = day.startResources[key];
    const after = day.endResources[key];
    html += '<div class="replay-resource-row"><span><b>' + RESOURCE_LABELS[key] + '</b></span><span>' + before + ' → ' + after + ' ' + formatResourceDiff(key, before, after) + '</span></div>';
  });
  if (day.resourceChanges && day.resourceChanges.length > 0) {
    html += '<div class="replay-change-list">';
    day.resourceChanges.forEach(change => {
      const isGood = change.amount > 0;
      const cls = isGood ? 'good' : 'bad';
      const sign = change.amount > 0 ? '+' : '';
      html += '<div class="replay-change-item ' + cls + '"><b>' + RESOURCE_LABELS[change.resource] + ' ' + sign + change.amount + '</b> — ' + change.reason + '</div>';
    });
    html += '</div>';
  }
  return html;
}
function renderReplayEstimateCompare(day) {
  if (!day.estimate || !day.endResources) return '';
  const est = day.estimate;
  let html = '<div style="margin-top:12px;padding-top:12px;border-top:2px dashed #315c72;">';
  html += '<h4 style="margin:0 0 8px 0;color:#315c72;font-size:13px">📊 预估 vs 实际 对比</h4>';
  const resKeys = ["wood", "food", "med", "rep"];
  const baseResources = day.dispatchStartResources || day.startResources;
  html += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;font-size:12px;margin-bottom:8px;">';
  resKeys.forEach(key => {
    const actual = day.endResources[key] - baseResources[key];
    const estimated = est[key];
    const diff = actual - estimated;
    const diffCls = Math.abs(diff) <= 1 ? 'color:#2e7d32' : 'color:#f57c00';
    html += '<div style="padding:6px;background:#f5f7f9;border-radius:4px;text-align:center;">';
    html += '<div style="color:#5a6e78;font-size:10px">' + RESOURCE_LABELS[key] + '</div>';
    html += '<div style="font-weight:bold">预估: ' + (estimated > 0 ? '+' : '') + estimated.toFixed(1) + '</div>';
    html += '<div style="font-weight:bold">实际: ' + (actual > 0 ? '+' : '') + actual + '</div>';
    html += '<div style="' + diffCls + '">差异: ' + (diff > 0 ? '+' : '') + diff.toFixed(1) + '</div>';
    html += '</div>';
  });
  html += '</div>';
  if (est.successRoutes > 0) {
    html += '<div style="font-size:12px;margin-top:6px;">';
    html += '<b>成功率预估:</b> ' + est.successRate + '%';
    html += ' | <b>实际结果:</b> 请查看日志确认';
    html += '</div>';
  }
  const baseGuides = day.dispatchStartGuides || day.startGuides;
  if (est.fatigueChanges && est.fatigueChanges.length > 0 && baseGuides && day.endGuides) {
    html += '<div style="margin-top:8px;"><b style="font-size:12px">向导疲劳对比：</b>';
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:6px;font-size:11px;margin-top:4px;">';
    est.fatigueChanges.forEach((fc, i) => {
      if (!day.endGuides[i] || !baseGuides[i]) return;
      const actualFatigue = day.endGuides[i].fatigue - baseGuides[i].fatigue;
      const diff = actualFatigue - fc.change;
      const diffCls = Math.abs(diff) <= 1 ? 'color:#2e7d32' : 'color:#f57c00';
      html += '<div style="padding:4px;background:#f5f7f9;border-radius:4px;">';
      html += '<b>' + fc.name + '</b>: 预估' + (fc.change >= 0 ? '+' : '') + fc.change + ' / 实际' + (actualFatigue >= 0 ? '+' : '') + actualFatigue;
      html += ' <span style="' + diffCls + '">(' + (diff >= 0 ? '+' : '') + diff + ')</span>';
      html += '</div>';
    });
    html += '</div></div>';
  }
  html += '</div>';
  return html;
}
function renderReplayRoutes(day) {
  if (!day.routes || day.routes.length === 0) return '<div style="font-size:12px;color:#5a6e78">无路线数据</div>';
  return day.routes.map(route => {
    let statusTag = "";
    if (route.blocked) statusTag = '<span class="replay-route-status route-blocked">封路</span>';
    else if (route.caravan) statusTag = '<span class="replay-route-status route-caravan">商队</span>';
    else statusTag = '<span class="replay-route-status route-normal">正常</span>';
    return '<div class="replay-row"><span>' + route.name + '（风险' + route.risk + '）</span><span>' + statusTag + '</span></div>';
  }).join("");
}
function renderReplayGuides(day) {
  if (!day.startGuides || !day.endGuides) return '<div style="font-size:12px;color:#5a6e78">无向导数据</div>';
  return day.endGuides.map((g, i) => {
    const before = day.startGuides[i] ? day.startGuides[i].fatigue : 0;
    const after = g.fatigue;
    const taskText = g.task ? '派遣至【' + getRouteName(g.task) + '】' : '留守休整';
    const diff = after - before;
    const diffStr = diff > 0 ? '<span class="res-change down">+' + diff + '</span>' : (diff < 0 ? '<span class="res-change up">' + diff + '</span>' : '<span class="res-change-flat">±0</span>');
    let traitHtml = '';
    if (careerState.data) {
      const stats = careerState.data.guides[g.name];
      const traits = stats ? stats.traits : [];
      if (traits && traits.length > 0) {
        traitHtml = '<div style="margin-top:4px;display:flex;flex-wrap:wrap;gap:4px">';
        traits.forEach(tid => {
          const trait = TRAITS[tid];
          if (trait) {
            const traitCls = trait.isNegative ? 'trait-negative' : 'trait-positive';
            traitHtml += '<span class="trait-badge ' + traitCls + '" style="font-size:10px;padding:2px 6px" title="' + trait.desc + '">' + trait.icon + ' ' + trait.name + '</span>';
          }
        });
        traitHtml += '</div>';
      }
    }
    return '<div class="replay-guide-card"><div class="replay-guide-name">' + g.name + '</div><div class="replay-guide-meta">疲劳：' + before + ' → ' + after + ' ' + diffStr + '｜' + taskText + '</div>' + traitHtml + '</div>';
  }).join("");
}
function renderReplayEvent(day) {
  if (!day.event) return '<div style="font-size:12px;color:#5a6e78">今日无事件</div>';
  const catLabel = EVENT_CATEGORY_LABELS[day.event.category] || day.event.category;
  let html = '<div class="replay-event-card"><div class="replay-event-title"><span class="event-category ' + day.event.category + '" style="font-size:11px;padding:1px 8px">' + catLabel + '</span> ' + day.event.name + '</div><div class="replay-event-desc">' + day.event.desc + '</div>';
  if (day.eventChoice) {
    html += '<div class="replay-choice-made"><strong>你的选择：</strong>' + day.eventChoice.title + '</div>';
    if (day.eventChoice.log) {
      html += '<div style="margin-top:6px;font-size:12px;color:#5a6e78">结果：' + day.eventChoice.log + '</div>';
    }
  } else {
    html += '<div style="font-size:12px;color:#5a6e78">（未做出选择）</div>';
  }
  if (day.consequencesTriggered && day.consequencesTriggered.length > 0) {
    var typeIcons = { weather: "🌤", routeBlock: "🛤", guideFatigue: "🥾", caravanChance: "🐫" }
    html += '<div style="margin-top:8px;font-size:12px"><b>触发持续效果：</b></div>'
    day.consequencesTriggered.forEach(function(c) {
      html += '<div class="replay-consequence-item" style="border-left-color:#3f7a54">' + (typeIcons[c.type] || "") + ' ' + c.description + '（持续' + c.totalDays + '天）</div>'
    })
  }
  html += '</div>';
  return html;
}
let isReplayBriefingMode = false;
function showReplayBriefing() {
  const day = currentReplayData.replayHistory[currentReplayDayIndex];
  if (!day || !day.briefing) {
    alert("该日没有简报数据（可能是旧版本存档）");
    return;
  }
  isReplayBriefingMode = true;
  renderBriefing(day.briefing);
  els.briefingCloseBtn.textContent = "返回复盘";
  els.briefingOverlay.classList.remove("hidden");
}
function closeReplayBriefing() {
  isReplayBriefingMode = false;
  els.briefingOverlay.classList.add("hidden");
  els.briefingCloseBtn.textContent = "开始今日调度";
}
function renderReplayLogs(day) {
  if (!day.logs || day.logs.length === 0) return '<div style="font-size:12px;color:#5a6e78">今日无日志</div>';
  return '<div class="replay-log-list">' + day.logs.map(log => '<div class="replay-log-entry">' + log + '</div>').reverse().join("") + '</div>';
}
function renderReplayConsequences(day) {
  var html = '<div class="replay-section"><h3>⚡ 持续效果（完整生命周期）</h3>'
  var typeIcons = { weather: "🌤", routeBlock: "🛤", guideFatigue: "🥾", caravanChance: "🐫", routeStatus: "🚀", resource: "📦" }
  var typeLabels = { weather: "天气", routeBlock: "路线封路", guideFatigue: "向导疲劳", caravanChance: "商队出现", routeStatus: "路线状态", resource: "每日资源" }
  var hasAny = false
  function buildConsequenceDetail(c, expired) {
    var item = '<div class="replay-consequence-item" style="border-left-color:' + (expired ? '#a33d31' : (expired === false ? '#3f7a54' : '#b08a28')) + '">'
    item += '<div style="display:flex;align-items:center;gap:4px;margin-bottom:3px">'
    item += '<span title="' + (typeLabels[c.type] || c.type) + '">' + (typeIcons[c.type] || "✨") + '</span>'
    item += '<b>' + c.sourceEventName + '</b>'
    item += '<span style="font-size:10px;color:#5a6e78;margin-left:auto">第' + c.triggerDay + '天触发</span>'
    item += '</div>'
    item += '<div style="font-size:12px;color:#2d3a40;line-height:1.4">' + c.description + '</div>'
    if (c.effectSummary) {
      item += '<div style="font-size:11px;color:#315c72;margin-top:3px;background:#e8f0f2;padding:2px 5px;border-radius:3px">📊 ' + c.effectSummary + '</div>'
    }
    if (c.routeName) {
      item += '<div style="font-size:11px;color:#5a7fa8;margin-top:2px">🎯 目标路线：' + c.routeName + '</div>'
    }
    if (c.sourceChoice) {
      item += '<div style="font-size:11px;color:#8a5a9e;margin-top:2px">💡 选择：' + c.sourceChoice + '</div>'
    }
    var daysInfo = ''
    if (expired === true) {
      var lasted = (c.expiredDay || day.day) - c.triggerDay
      daysInfo = '已到期（持续' + lasted + '天）'
    } else if (expired === false) {
      daysInfo = '本日新触发（持续' + c.totalDays + '天，至第' + (c.triggerDay + c.totalDays - 1) + '天）'
    } else {
      daysInfo = '剩余' + c.remainingDays + '天 / 共' + c.totalDays + '天'
    }
    item += '<div style="font-size:11px;color:#5a6e78;margin-top:3px;display:flex;justify-content:space-between;align-items:center">'
    item += '<span>⏱ ' + daysInfo + '</span>'
    if (!expired) {
      var pct = Math.round((c.remainingDays / c.totalDays) * 100)
      item += '<span style="font-weight:700;color:#315c72">' + pct + '%</span>'
    }
    item += '</div>'
    if (!expired) {
      var pct2 = Math.round((c.remainingDays / c.totalDays) * 100)
      item += '<div style="height:3px;background:#dde5e6;border-radius:2px;margin-top:3px;overflow:hidden"><div style="height:100%;width:' + pct2 + '%;background:#b08a28;border-radius:2px"></div></div>'
    }
    item += '</div>'
    return item
  }
  if (day.consequencesSnapshot && day.consequencesSnapshot.length > 0) {
    hasAny = true
    html += '<div style="font-size:12px;color:#5a6e78;margin-bottom:6px;display:flex;align-items:center;gap:4px"><span style="display:inline-block;width:3px;height:12px;background:#b08a28;border-radius:2px"></span>当日生效中的持续效果（' + day.consequencesSnapshot.length + '项）</div>'
    day.consequencesSnapshot.forEach(function(c) {
      html += buildConsequenceDetail(c, null)
    })
  }
  if (day.consequencesTriggered && day.consequencesTriggered.length > 0) {
    hasAny = true
    html += '<div style="font-size:12px;color:#5a6e78;margin-top:10px;margin-bottom:6px;display:flex;align-items:center;gap:4px"><span style="display:inline-block;width:3px;height:12px;background:#3f7a54;border-radius:2px"></span>本日新触发（' + day.consequencesTriggered.length + '项）</div>'
    day.consequencesTriggered.forEach(function(c) {
      html += buildConsequenceDetail(c, false)
    })
  }
  if (day.consequencesExpired && day.consequencesExpired.length > 0) {
    hasAny = true
    html += '<div style="font-size:12px;color:#5a6e78;margin-top:10px;margin-bottom:6px;display:flex;align-items:center;gap:4px"><span style="display:inline-block;width:3px;height:12px;background:#a33d31;border-radius:2px"></span>本日到期失效（' + day.consequencesExpired.length + '项）</div>'
    day.consequencesExpired.forEach(function(c) {
      html += buildConsequenceDetail(c, true)
    })
  }
  if (!hasAny) {
    html += '<div style="font-size:12px;color:#5a6e78">当日无持续效果</div>'
  }
  html += '</div>'
  return html
}
function renderReplayDay() {
  const day = currentReplayData.replayHistory[currentReplayDayIndex];
  if (!day) return;
  renderReplayTurningBanner();
  els.replayDayInfo.textContent = "第 " + day.day + " 天 / 共 " + currentReplayData.targetDays + " 天 · 天气：" + day.weather;
  els.replayPrevBtn.disabled = currentReplayDayIndex === 0;
  els.replayPrevBtn.classList.toggle("secondary", currentReplayDayIndex === 0);
  const isLast = currentReplayDayIndex >= currentReplayData.replayHistory.length - 1;
  els.replayNextBtn.disabled = isLast;
  els.replayNextBtn.classList.toggle("secondary", isLast);
  const hasBriefing = day.briefing !== undefined;
  var consequenceSection = renderReplayConsequences(day)
  els.replayGrid.innerHTML =
    '<div class="replay-section"><h3 style="display:flex;justify-content:space-between;align-items:center;">天气 · 资源变化' + (hasBriefing ? '<button class="replay-briefing-btn" id="replayBriefingBtn">查看简报</button>' : '') + '</h3>' +
    '<div class="replay-row"><span>天气</span><span><b>' + day.weather + '</b></span></div>' +
    '<div class="replay-row"><span>接应商队（累计）</span><span>' + day.savedCaravans + ' 队</span></div>' +
    renderReplayResources(day) +
    renderReplayEstimateCompare(day) +
    '</div>' +
    '<div class="replay-section"><h3>今日路线</h3>' +
    renderReplayRoutes(day) +
    '</div>' +
    '<div class="replay-section"><h3>向导状态</h3>' +
    renderReplayGuides(day) +
    '</div>' +
    consequenceSection +
    '<div class="replay-section"><h3>事件选择</h3>' +
    renderReplayEvent(day) +
    '</div>' +
    '<div class="replay-section" style="grid-column:1/-1"><h3>今日日志</h3>' +
    renderReplayLogs(day) +
    '</div>';
  if (hasBriefing) {
    const btn = document.querySelector("#replayBriefingBtn");
    if (btn) btn.onclick = showReplayBriefing;
  }
}
els.replayCloseBtn.onclick = closeReplay;
els.replayPrevBtn.onclick = () => {
  if (currentReplayDayIndex > 0) {
    currentReplayDayIndex--;
    renderReplayTimeline();
    renderReplayDay();
  }
};
els.replayNextBtn.onclick = () => {
  if (currentReplayDayIndex < currentReplayData.replayHistory.length - 1) {
    currentReplayDayIndex++;
    renderReplayTimeline();
    renderReplayDay();
  }
};


function syncSettingsUI() {
  els.settingCompactLog.checked = !!settingsState.settings.compactLog;
  els.settingAutoReplay.checked = !!settingsState.settings.autoReplay;
  els.settingHideAchvHint.checked = !!settingsState.settings.hideAchvHint;
  els.settingLowAnim.checked = !!settingsState.settings.lowAnim;
  els.settingDisableCareer.checked = !!settingsState.settings.disableCareerBonus;
}
function openSettings() {
  syncSettingsUI();
  els.settingsOverlay.classList.remove("hidden");
}
function closeSettings() {
  els.settingsOverlay.classList.add("hidden");
}

const TUTORIAL_STEPS = [
  {
    icon: "📖",
    title: "第一步：选择赛季剧本",
    content: `
每局游戏开始前，先选择一个<b>赛季剧本</b>和<b>难度</b>。
<ul>
<li><b>标准雪线</b>：熟悉机制的入门剧本，坚守15天即可</li>
<li><b>药品短缺</b>：疫病蔓延，优先走草药小径补充药材</li>
<li><b>商队旺季</b>：12天内接应12队以上商队，集市古道效率最高</li>
<li><b>封山救援</b>：暴雪封山，冰原直道在暴雪中仍可通行</li>
</ul>
<div class="tutorial-tip">💡 新手推荐先玩「标准雪线」稳妥难度，熟悉基本机制。</div>
`
  },
  {
    icon: "🗺️",
    title: "第二步：派遣向导路线",
    content: `
游戏核心操作是给两名<b>向导分配路线</b>。
<ul>
<li>左侧「向导」区域的下拉菜单可选择每名向导今日派遣的路线</li>
<li>每条路线只能派遣一名向导，重复派遣的会留守</li>
<li>中间「今日路线」面板显示每条路线的风险、奖励和消耗</li>
<li>选择「留守休整」可让向导疲劳-2，不执行任务</li>
</ul>
<div class="tutorial-tip">💡 点击「执行调度并进入明天」前，注意查看下方的「次日风险预估」面板！</div>
`
  },
  {
    icon: "📦",
    title: "第三步：管理资源消耗",
    content: `
驿站有四种核心资源，显示在左上角面板：
<ul>
<li><b>柴火</b>：路线消耗 + 驿站取暖（暴雪天额外消耗）</li>
<li><b>干粮</b>：路线消耗 + 驿站日常（每天-2）</li>
<li><b>药品</b>：部分路线消耗，救援失败时额外消耗</li>
<li><b>声望</b>：接应商队成功获得，某些事件也会影响</li>
</ul>
任一资源变为负数即游戏失败！同时注意向导的疲劳值，超过12也会失败。
<div class="tutorial-tip">💡 暴雪天所有消耗都会增加，尽量选择风险低的路线或留守。</div>
`
  },
  {
    icon: "⚡",
    title: "第四步：处理随机事件",
    content: `
每天开始时有概率触发<b>随机事件</b>，需要做出选择：
<ul>
<li>事件分为：天气异象、物资事件、向导事件、声望事件、随机事件</li>
<li>每个选项会显示资源变化的预览标签</li>
<li>选择后结果会立即生效并记录到日志中</li>
</ul>
部分事件有好有坏，需要根据当前资源状况权衡决策。
<div class="tutorial-tip">💡 点击「路线图鉴」按钮可以查看所有事件和路线的详细数据。</div>
`
  },
  {
    icon: "📊",
    title: "第五步：结算与复盘",
    content: `
游戏结束（胜利或失败）后：
<ul>
<li>可以查看本局的<b>最终结算</b>和解锁的成就</li>
<li>点击「调度复盘」可以查看每一天的详细数据对比</li>
<li>复盘包括：资源变化、向导状态、事件选择、预估vs实际对比</li>
<li>所有对局会自动保存到「结算档案馆」，最多保留100条</li>
</ul>
复盘是提升水平的最好方式，看看哪些决策导致了资源波动！
<div class="tutorial-tip">💡 在「玩法设置」中可以开启「自动打开复盘」，每局结束后自动弹出复盘面板。</div>
`
  }
];
let currentTutorialStep = 0;
function renderTutorialStep() {
  const step = TUTORIAL_STEPS[currentTutorialStep];
  if (!step) return;
  els.tutorialIcon.textContent = step.icon;
  els.tutorialTitle.textContent = step.title;
  els.tutorialContent.innerHTML = step.content;
  els.tutorialStepIndicator.innerHTML = TUTORIAL_STEPS.map((_, i) =>
    '<div class="tutorial-dot ' + (i === currentTutorialStep ? 'active' : '') + '"></div>'
  ).join("");
  els.tutorialPrevBtn.classList.toggle("hidden", currentTutorialStep === 0);
  if (currentTutorialStep === TUTORIAL_STEPS.length - 1) {
    els.tutorialNextBtn.textContent = "开始游戏";
  } else {
    els.tutorialNextBtn.textContent = "下一步";
  }
}
function openTutorial(startStep = 0) {
  currentTutorialStep = startStep;
  renderTutorialStep();
  els.tutorialOverlay.classList.remove("hidden");
}
function closeTutorial() {
  els.tutorialOverlay.classList.add("hidden");
}
function completeTutorial() {
  saveTutorialCompleted();
  closeTutorial();
}
export function init() {
  settingsState.settings = loadSettings();
  careerState.settings = settingsState.settings;
  applySettings();
  initCareerSystem();
  bindSettingToggle(els.settingCompactLog, "compactLog");
  bindSettingToggle(els.settingAutoReplay, "autoReplay");
  bindSettingToggle(els.settingHideAchvHint, "hideAchvHint");
  bindSettingToggle(els.settingLowAnim, "lowAnim");
  bindSettingToggle(els.settingDisableCareer, "disableCareerBonus");
  els.settingsBtn.onclick = openSettings;
  els.settingsCloseBtn.onclick = closeSettings;
  els.settingsResetBtn.onclick = () => {
    showConfirm("恢复默认设置", "确定要将所有玩法设置恢复为默认值吗？", () => {
      resetSettings();
      syncSettingsUI();
    });
  };
  els.tutorialBtn.onclick = () => openTutorial(0);
  els.tutorialCloseBtn.onclick = closeTutorial;
  els.tutorialSkipBtn.onclick = completeTutorial;
  els.tutorialPrevBtn.onclick = () => {
    if (currentTutorialStep > 0) {
      currentTutorialStep--;
      renderTutorialStep();
    }
  };
  els.tutorialNextBtn.onclick = () => {
    if (currentTutorialStep < TUTORIAL_STEPS.length - 1) {
      currentTutorialStep++;
      renderTutorialStep();
    } else {
      completeTutorial();
    }
  };
  if (!loadTutorialCompleted()) {
    setTimeout(() => openTutorial(0), 300);
  }
  setupEditorEventListeners();
  showDiffPicker();
}
