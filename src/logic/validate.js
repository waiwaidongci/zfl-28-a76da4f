'use strict';
import { SCENARIOS, CUSTOM_SCENARIO_PREFIX } from '../data/scenarios.js';
import { EVENTS_POOL } from '../data/events.js';
import { routesBase, ALL_ROUTES_MAP } from '../data/routes.js';
import { DIFF } from '../data/difficulty.js';
export function formatSign(num) {
  return num >= 0 ? "+" + num : String(num);
}
export function validateScenarioConfig(sc) {
  const errors = [];
  const warnings = [];
  if (!sc.name || sc.name.trim().length === 0) {
    errors.push("剧本名称不能为空");
  }
  if (!sc.routePool || sc.routePool.length < 2) {
    errors.push("至少需要选择 2 条可用路线，否则玩家没有足够的调度空间");
  }
  if (sc.routePool && sc.routePool.length > 0) {
    const validRoutes = sc.routePool.filter(id => ALL_ROUTES_MAP[id]);
    if (validRoutes.length !== sc.routePool.length) {
      errors.push("存在无效的路线ID，请检查路线池配置");
    }
    const hasNormalRoute = sc.routePool.some(id => {
      const r = ALL_ROUTES_MAP[id];
      return r && r.risk <= 2;
    });
    if (!hasNormalRoute) {
      warnings.push("所有路线风险都很高（≥3），新手玩家可能难以上手");
    }
  }
  const weatherTotal = (sc.weatherTable.clear || 0) + (sc.weatherTable.wind || 0) + (sc.weatherTable.storm || 0);
  if (weatherTotal <= 0) {
    errors.push("天气概率之和必须大于 0");
  }
  if ((sc.weatherTable.storm || 0) >= 0.8 && !sc.routeMod.stormRouteImmune) {
    warnings.push("暴雪概率超过 80% 且没有暴雪免疫路线，游戏可能过于困难");
  }
  const startWood = DIFF.normal.wood + (sc.startResources.wood || 0);
  const startMed = DIFF.normal.med + (sc.startResources.med || 0);
  const startFood = DIFF.normal.food + (sc.startResources.food || 0);
  const startRep = sc.startResources.rep || 0;
  if (startWood <= 0 || startMed <= 0 || startFood <= 0) {
    errors.push("标准难度下初始资源（柴火、药品、干粮）必须大于 0，否则第一天就会失败");
  }
  if (sc.startResources.wood <= -DIFF.safe.wood ||
      sc.startResources.med <= -DIFF.safe.med ||
      sc.startResources.food <= -DIFF.safe.food) {
    errors.push("初始资源调整过低，即使在稳妥难度下也会出现负数，属于必败配置");
  }
  const dailyFoodConsume = 2;
  const dailyWoodStorm = 3;
  const minDays = sc.targetDays;
  const worstCaseFood = dailyFoodConsume * minDays;
  const worstCaseWood = dailyWoodStorm * minDays;
  if (startFood < worstCaseFood * 0.3) {
    warnings.push("初始干粮可能不足以支撑到最后，建议增加初始干粮或减少目标天数");
  }
  if (startWood < worstCaseWood * 0.2 && sc.weatherTable.storm > 0.3) {
    warnings.push("暴雪概率较高且初始柴火偏低，可能需要频繁外出采集柴火");
  }
  if (sc.win) {
    if (sc.win.type === "caravans" && sc.win.count) {
      const maxPossible = Math.floor(sc.targetDays * sc.routePool.length * (sc.routeMod.caravanChance || 0.5));
      if (sc.win.count > maxPossible * 1.5) {
        errors.push(`接应商队目标（${sc.win.count}队）过高，理论最大值约为 ${maxPossible} 队，几乎不可能完成`);
      }
      if (sc.win.count > maxPossible) {
        warnings.push(`接应商队目标（${sc.win.count}队）偏高，理论最大值约为 ${maxPossible} 队，需要非常好的运气才能完成`);
      }
    }
    if (sc.win.type === "days_and_rep" && sc.win.rep) {
      if (sc.win.rep > sc.targetDays * 5) {
        warnings.push(`声望目标（${sc.win.rep}）偏高，平均每天需要获得 ${Math.ceil(sc.win.rep / sc.targetDays)} 点声望`);
      }
    }
    if (sc.win.type === "caravans_and_rep") {
      const maxPossible = Math.floor(sc.targetDays * sc.routePool.length * (sc.routeMod.caravanChance || 0.5));
      if (sc.win.count > maxPossible) {
        warnings.push(`接应商队目标（${sc.win.count}队）偏高，理论最大值约为 ${maxPossible} 队`);
      }
      if (sc.win.rep > sc.targetDays * 5) {
        warnings.push(`声望目标（${sc.win.rep}）偏高`);
      }
    }
  }
  const triggeredEvents = EVENTS_POOL.filter(e => {
    const c = e.conditions || {};
    if (c.minDay && c.minDay > sc.targetDays) return false;
    if (c.maxDay && c.maxDay < 1) return false;
    return true;
  });
  if (triggeredEvents.length === 0) {
    warnings.push("没有任何事件能够在该剧本配置下触发，游戏会变得非常单调");
  }
  const neverTriggerEvents = EVENTS_POOL.filter(e => {
    const c = e.conditions || {};
    if (c.minDay && c.minDay > sc.targetDays) return true;
    if (c.minMed && startMed < c.minMed) {
      const maxMedGain = sc.targetDays * 3;
      if (startMed + maxMedGain < c.minMed) return true;
    }
    if (c.minRep && startRep < c.minRep) {
      const maxRepGain = sc.targetDays * 5;
      if (startRep + maxRepGain < c.minRep) return true;
    }
    return false;
  });
  if (neverTriggerEvents.length > 0) {
    const eventNames = neverTriggerEvents.slice(0, 5).map(e => e.name).join("、");
    const more = neverTriggerEvents.length > 5 ? ` 等 ${neverTriggerEvents.length} 个事件` : "";
    warnings.push(`「${eventNames}」${more}在当前配置下永远无法触发，请检查事件条件与剧本参数是否匹配`);
  }
  const totalWeight = Object.values(sc.eventWeightMul || {}).reduce((a, b) => a + b, 0);
  if (totalWeight <= 0) {
    warnings.push("所有事件类别权重都为 0，将不会触发任何随机事件");
  }
  if ((!sc.lose.resources && !sc.lose.fatigue && !sc.lose.medCritical) ||
      (sc.lose.resources === false && sc.lose.fatigue === false && !sc.lose.medCritical)) {
    warnings.push("没有启用任何失败规则，玩家几乎不可能失败，游戏会缺乏挑战性");
  }
  if (sc.targetDays < 5) {
    warnings.push("目标天数少于 5 天，游戏体验可能不完整");
  }
  if (sc.targetDays > 25) {
    warnings.push("目标天数超过 25 天，游戏可能过于冗长");
  }
  const stormImmuneInPool = (sc.routeMod.stormRouteImmune || []).filter(id => sc.routePool.includes(id));
  if (sc.routeMod.stormRouteImmune && sc.routeMod.stormRouteImmune.length > 0 && stormImmuneInPool.length === 0) {
    warnings.push("设置的暴雪免疫路线不在可用路线池中，该配置不会生效");
  }
  return { errors, warnings, isValid: errors.length === 0 };
}
