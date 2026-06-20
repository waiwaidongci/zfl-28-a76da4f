'use strict';
export const SCENARIOS = {
  standard: {
    id: "standard",
    name: "标准雪线",
    subtitle: "常规补给任务",
    desc: "正常年份的雪线补给调度。物资适中、天气如常、商队平稳。适合熟悉机制与稳步经营。",
    color: "#315c72",
    targetDays: 15,
    routePool: ["north", "ridge", "valley"],
    startResources: { wood: 0, med: 0, food: 0, rep: 0 },
    weatherTable: {
      clear: 0.50,
      wind: 0.30,
      storm: 0.20,
      overrideStormProb: null
    },
    routeMod: {
      caravanChance: 0.74,
      stormBlockChance: 0.33,
      fatigueBonus: 0
    },
    eventWeightMul: { weather: 1.0, supply: 1.0, guide: 1.0, reputation: 1.0, random: 1.0 },
    eventWeightOverrides: {},
    eventTriggerChance: 0.75,
    win: { type: "days", label: "坚守到最后" },
    lose: { resources: true, fatigue: true },
    resultWin: (game) => "坚守到第" + game.targetDays + "天，接应商队 " + game.saved + " 队，累计声望 " + game.rep + "。雪线如旧，驿站灯火长明。",
    resultLose: (game) => "未能撑过雪线之冬。主要原因：" + (game.failureReason || "未知") + "。坚持了 " + game.day + " 天，接应 " + game.saved + " 队商队。",
    intro: "标准雪线季，按部就班地接应过路商队，维持驿站运转即可。"
  },
  medshortage: {
    id: "medshortage",
    name: "药品短缺",
    subtitle: "高原疫病蔓延",
    desc: "今年山脚村落爆发疫病，药品极度稀缺且需求翻倍。向导与村民接连病倒，需谨慎分配每一份药材，优先开辟草药小径自救。",
    color: "#a33d31",
    targetDays: 18,
    routePool: ["north", "valley", "herbal", "ridge"],
    startResources: { wood: 4, med: -4, food: 4, rep: 0 },
    weatherTable: {
      clear: 0.55,
      wind: 0.28,
      storm: 0.17,
      overrideStormProb: null
    },
    routeMod: {
      caravanChance: 0.55,
      stormBlockChance: 0.28,
      fatigueBonus: 1
    },
    eventWeightMul: { weather: 0.8, supply: 1.6, guide: 1.4, reputation: 1.2, random: 1.0 },
    eventWeightOverrides: { guide_injury: 2.0, village_request: 2.2, guide_motivation: 1.5 },
    eventTriggerChance: 0.82,
    win: { type: "days_and_rep", rep: 25, label: "熬到疫情缓解" },
    lose: { resources: true, fatigue: true, medCritical: { value: 2, days: 2 } },
    resultWin: (game) => "坚持到疫情缓解！坚守 " + game.day + " 天，接应 " + game.saved + " 队，声望 " + game.rep + "。村民们送来锦旗，驿站声名远扬。",
    resultLose: (game) => "药尽人散。原因：" + (game.failureReason || "药品严重不足") + "。坚守 " + game.day + " 天，接应 " + game.saved + " 队。",
    intro: "药品告急！请优先走草药小径补充药材，注意向导健康不要过劳。"
  },
  caravan: {
    id: "caravan",
    name: "商队旺季",
    subtitle: "山口贸易高峰",
    desc: "一年一度的山货集市即将开市，各路商队云集山口。路线繁忙、接应机会极多，但驿站名声直接关系到商队是否愿意绕行而来。",
    color: "#b08a28",
    targetDays: 12,
    routePool: ["north", "ridge", "market", "valley"],
    startResources: { wood: 4, med: 2, food: -4, rep: 3 },
    weatherTable: {
      clear: 0.58,
      wind: 0.27,
      storm: 0.15,
      overrideStormProb: null
    },
    routeMod: {
      caravanChance: 0.92,
      stormBlockChance: 0.22,
      fatigueBonus: 0,
      rewardBonus: 1
    },
    eventWeightMul: { weather: 0.7, supply: 1.2, guide: 1.0, reputation: 1.8, random: 1.1 },
    eventWeightOverrides: { caravan_distress: 2.5, supply_route: 2.2, traveler_merchant: 1.8, supply_cache: 1.3 },
    eventTriggerChance: 0.80,
    win: { type: "caravans", count: 12, label: "接应足够商队" },
    lose: { resources: true, fatigue: true },
    resultWin: (game) => "旺季完美收官！接应商队 " + game.saved + " 队（目标12队），声望 " + game.rep + "。驿站赚得盆满钵满，明年的商路预订已排满。",
    resultLose: (game) => "旺季业绩惨淡。仅接应 " + game.saved + " 队，未能达成 12 队目标。商人们改走他处，明年恐怕门可罗雀。",
    intro: "旺季来了！目标是 12 天内接应 12 队以上商队，集市古道效率极高。"
  },
  rescue: {
    id: "rescue",
    name: "封山救援",
    subtitle: "暴雪封山紧急营救",
    desc: "突发特大暴雪提前封山，数支商队被困山中。暴雪频繁、路线艰难，必须顶风冒雪打通救援通道，每一支被困商队都亟待救援。",
    color: "#5a7fa8",
    targetDays: 10,
    routePool: ["ridge", "glacier", "cliff", "north"],
    startResources: { wood: -3, med: 3, food: -2, rep: 5 },
    weatherTable: {
      clear: 0.18,
      wind: 0.30,
      storm: 0.52,
      overrideStormProb: 0.55
    },
    routeMod: {
      caravanChance: 0.95,
      stormBlockChance: 0.55,
      fatigueBonus: 2,
      rewardBonus: 2,
      stormRouteImmune: ["glacier", "cliff"]
    },
    eventWeightMul: { weather: 2.2, supply: 0.9, guide: 1.3, reputation: 1.5, random: 1.0 },
    eventWeightOverrides: { storm_warning: 2.5, route_blockage: 2.2, caravan_distress: 2.8, weather_anomaly: 1.8, guide_injury: 1.6 },
    eventTriggerChance: 0.88,
    win: { type: "caravans_and_rep", count: 8, rep: 30, label: "救出足够商队" },
    lose: { resources: true, fatigue: true },
    resultWin: (game) => "封山大捷！救援 " + game.saved + " 队（目标8队），声望 " + game.rep + "。所有被困商队平安脱险，驿站被授予雪山之光勋章。",
    resultLose: (game) => "救援失败。仅救出 " + game.saved + " 队，未能达成目标。暴风雪吞没了最后的希望，来年山口只剩残碑。",
    intro: "暴雪封山！目标 10 天内救出 8 队以上商队，冰原直道与悬崖索道在暴雪中仍可通行。"
  }
};
export const CUSTOM_SCENARIO_PREFIX = "custom_";
