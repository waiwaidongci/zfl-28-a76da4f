'use strict';
export const EVENTS_POOL = [
  {
    id: "storm_warning", category: "weather", name: "暴雪预警",
    desc: "山间传来低沉的轰鸣，云层正在迅速聚集。老向导说这是暴风雪来临的前兆，但也有人说只是普通的阴风。",
    baseWeight: 5,
    conditions: { minDay: 2, maxDay: 14 },
    weightMod: { weather: { "晴": 1.2, "阴风": 1.8, "暴雪": 0.3 }, diff: { safe: 0.8, normal: 1.0, hard: 1.4 } },
    options: [
      { title: "加固驿站，囤积柴火", hint: "消耗柴火，但降低未来暴雪影响",
        effects: { wood: -3, consequence: { type: "weather", description: "暴雪概率降低8%", totalDays: 3, effect: { stormProb: -0.08 } }, log: "决定加固驿站，消耗柴火应对暴雪。" } },
      { title: "观察云层，静观其变", hint: "节省物资，但风险较高",
        effects: { consequence: { type: "weather", description: "暴雪概率上升15%", totalDays: 2, effect: { stormProb: 0.15 } }, log: "决定观察天气变化，节省物资。" } }
    ]
  },
  {
    id: "traveler_merchant", category: "supply", name: "过路商人",
    desc: "一位披着厚斗篷的商人途径驿站，愿意用高价收购多余的药品，或者用物资换取声望。",
    baseWeight: 4,
    conditions: { minDay: 1, maxDay: 13, minMed: 3 },
    weightMod: { med: { low: 0.5, medium: 1.0, high: 1.5 }, rep: { low: 1.3, medium: 1.0, high: 0.7 } },
    options: [
      { title: "出售药品换粮", hint: "+6干粮 -3药品，商队好感提升",
        effects: { med: -3, food: 6, consequence: { type: "caravanChance", description: "商人传播好评，商队出现概率+10%", totalDays: 2, effect: { caravanChanceMod: 0.10 } }, log: "向商人出售了药品，换取了干粮。" } },
      { title: "赠送药品博取名声", hint: "+5声望 -2药品，每日获得少量药品",
        effects: { med: -2, rep: 5, consequence: { type: "resource", description: "商人留下的草药每日产出+1药品", totalDays: 3, effect: { dailyMed: 1 } }, log: "向商人赠送了药品，博得了好名声。" } }
    ]
  },
  {
    id: "guide_injury", category: "guide", name: "向导受伤",
    desc: "一名向导在昨日的归途中不慎扭伤了脚踝，需要立即处理。是让他带伤坚持，还是让他休息恢复？",
    baseWeight: 4,
    conditions: { minDay: 3, maxDay: 14 },
    weightMod: { guideFatigue: { low: 0.5, medium: 1.2, high: 1.8 }, diff: { safe: 0.7, normal: 1.0, hard: 1.5 } },
    options: [
      { title: "用药品治疗", hint: "-2药品，向导恢复",
        effects: { med: -2, guideEffect: { type: "heal", target: "mostFatigued", amount: 4 }, log: "使用药品为向导治疗，恢复了状态。" } },
      { title: "让他休养一天", hint: "不消耗药品，但向导今日无法出勤",
        effects: { guideEffect: { type: "rest", target: "mostFatigued" }, consequence: { type: "guideFatigue", description: "向导休养后恢复加速（疲劳恢复+1/天）", totalDays: 2, effect: { fatigueRecoveryBonus: 1 } }, log: "让受伤的向导休养一天，不安排任务。" } }
    ]
  },
  {
    id: "caravan_distress", category: "reputation", name: "商队求援",
    desc: "远处传来信号弹的光芒，一支商队在风雪中迷失了方向。是否冒险派人接应？",
    baseWeight: 5,
    conditions: { minDay: 4, maxDay: 12 },
    weightMod: { rep: { low: 1.5, medium: 1.0, high: 0.6 }, weather: { "晴": 1.3, "阴风": 1.0, "暴雪": 0.7 } },
    options: [
      { title: "派出向导接应", hint: "高风险高回报，+8声望",
        effects: { rep: 8, routeEffect: { type: "addCaravan", route: "ridge" }, guideEffect: { type: "addFatigue", target: "random", amount: 2 }, consequence: { type: "caravanChance", description: "商队好感传播，出现概率上升", totalDays: 2, effect: { caravanChanceMod: 0.12 } }, log: "派出向导接应商队，获得了声望。" } },
      { title: "驿站资源有限，无法支援", hint: "-3声望，但保存实力",
        effects: { rep: -3, log: "拒绝了商队的求援，声望有所下降。" } }
    ]
  },
  {
    id: "supply_cache", category: "supply", name: "发现物资窖藏",
    desc: "驿站后院的老松树下，向导发现了一个被遗忘的旧地窖，里面似乎有东西。",
    baseWeight: 3,
    conditions: { minDay: 2, maxDay: 13 },
    weightMod: { food: { low: 1.6, medium: 1.0, high: 0.5 }, wood: { low: 1.4, medium: 1.0, high: 0.6 } },
    options: [
      { title: "仔细搜寻，全部搬运", hint: "+4柴火 +4干粮，但向导疲劳+2",
        effects: { wood: 4, food: 4, guideEffect: { type: "addFatigue", target: "random", amount: 2 }, log: "仔细搜寻了地窖，获得了大量物资。" } },
      { title: "只拿必需品，封好地窖", hint: "+2柴火 +2干粮，每日持续补给少量物资",
        effects: { wood: 2, food: 2, consequence: { type: "resource", description: "密封地窖每日产出+1柴火+1干粮", totalDays: 3, effect: { dailyWood: 1, dailyFood: 1 } }, log: "只拿了必需品，保留了地窖以备不时之需。" } }
    ]
  },
  {
    id: "route_blockage", category: "weather", name: "路段塌方",
    desc: "昨夜的风雨导致某条路段发生了小型塌方，需要决定是否立即清理。",
    baseWeight: 4,
    conditions: { minDay: 3, maxDay: 14 },
    weightMod: { weather: { "晴": 0.6, "阴风": 1.2, "暴雪": 1.8 } },
    options: [
      { title: "立即组织清理", hint: "-2柴火，确保路线畅通",
        effects: { wood: -2, routeEffect: { type: "ensureOpen", route: "random" }, consequence: { type: "routeBlock", description: "加固路段，封路概率降低", totalDays: 3, effect: { routeId: "random", blockChanceMod: -0.15 } }, log: "组织清理了塌方路段，确保了路线畅通。" } },
      { title: "暂时封锁，绕行", hint: "随机一条路线今日封锁",
        effects: { routeEffect: { type: "block", route: "random" }, log: "决定暂时封锁塌方路段，今日只能绕行。" } }
    ]
  },
  {
    id: "village_request", category: "reputation", name: "山下村民求助",
    desc: "山下村落派来人说，村里有老人病重，急需药品。但驿站的药品也不充裕。",
    baseWeight: 4,
    conditions: { minDay: 3, maxDay: 13, minMed: 4 },
    weightMod: { rep: { low: 1.5, medium: 1.0, high: 0.6 }, med: { low: 0.5, medium: 1.0, high: 1.5 } },
    options: [
      { title: "慷慨赠予药品", hint: "-4药品 +6声望，村民回馈补给",
        effects: { med: -4, rep: 6, consequence: { type: "resource", description: "村民感恩回赠，每日获得+2干粮", totalDays: 3, effect: { dailyFood: 2 } }, log: "向山下村民赠予了药品，声望大增。" } },
      { title: "只能分出少量", hint: "-1药品 +2声望，向导获得村民祝福",
        effects: { med: -1, rep: 2, consequence: { type: "guideFatigue", description: "村民祈福，向导疲劳恢复+1/天", totalDays: 2, effect: { fatigueRecoveryBonus: 1 } }, log: "只能分出少量药品帮助村民。" } }
    ]
  },
  {
    id: "guide_conflict", category: "guide", name: "向导争执",
    desc: "两名向导因为路线选择发生了激烈争执，情绪都很激动。需要你出面调解。",
    baseWeight: 3,
    conditions: { minDay: 4, maxDay: 14 },
    weightMod: { guideFatigue: { low: 0.6, medium: 1.1, high: 1.7 }, diff: { hard: 1.4, normal: 1.0, safe: 0.7 } },
    options: [
      { title: "严厉训斥，立即平息", hint: "平息争执，但两人疲劳+1，士气受损",
        effects: { guideEffect: { type: "addFatigue", target: "all", amount: 1 }, consequence: { type: "guideFatigue", description: "士气低落，任务疲劳增长+20%", totalDays: 2, effect: { fatigueGainMod: 0.20 } }, log: "严厉训斥了两名向导，平息了争执。" } },
      { title: "耐心调解，分别安抚", hint: "消耗时间但恢复士气，两人疲劳-1",
        effects: { guideEffect: { type: "heal", target: "all", amount: 1 }, food: -1, consequence: { type: "guideFatigue", description: "团结融洽，疲劳恢复+1/天，疲劳上限+2", totalDays: 3, effect: { fatigueRecoveryBonus: 1, maxFatigueMod: 2 } }, log: "耐心调解了争执，还消耗了一些干粮招待他们。" } }
    ]
  },
  {
    id: "abandoned_sled", category: "random", name: "废弃雪橇",
    desc: "在驿站附近发现了一架被遗弃的雪橇，上面还有一些物资，但周围有野兽出没的痕迹。",
    baseWeight: 3,
    conditions: { minDay: 2, maxDay: 14 },
    weightMod: { weather: { "晴": 1.4, "阴风": 1.0, "暴雪": 0.5 } },
    options: [
      { title: "冒险取回物资", hint: "+5声望 +3药品，但向导疲劳+3，修好了雪橇",
        effects: { rep: 5, med: 3, guideEffect: { type: "addFatigue", target: "random", amount: 3 }, consequence: { type: "routeStatus", description: "修好雪橇，随机一条路线奖励+2并强制畅通", totalDays: 2, effect: { routeId: "random", rewardBonus: 2, alwaysOpen: true } }, log: "冒险取回了雪橇上的物资，还修复了雪橇。" } },
      { title: "太危险了，放弃", hint: "无影响，但向导警觉",
        effects: { consequence: { type: "weather", description: "向导警觉，暴雪概率-10%", totalDays: 2, effect: { stormProb: -0.10 } }, log: "认为太危险，放弃了雪橇上的物资，但向导提高了警觉。" } }
    ]
  },
  {
    id: "weather_anomaly", category: "weather", name: "异常天气",
    desc: "天空出现了奇怪的霞光，老向导说这预示着天气即将剧变。",
    baseWeight: 3,
    conditions: { minDay: 5, maxDay: 12 },
    weightMod: { weather: { "晴": 1.5, "阴风": 1.0, "暴雪": 0.4 }, diff: { hard: 1.3, normal: 1.0, safe: 0.8 } },
    options: [
      { title: "提前准备御寒物资", hint: "-3柴火 -2干粮，未来3天天晴概率+20%",
        effects: { wood: -3, food: -2, consequence: { type: "weather", description: "天晴概率上升20%", totalDays: 3, effect: { clearProb: 0.2 } }, log: "提前准备了御寒物资，应对可能的天气变化。" } },
      { title: "这只是普通的霞光", hint: "未来2天暴雪概率+15%",
        effects: { consequence: { type: "weather", description: "暴雪概率上升15%", totalDays: 2, effect: { stormProb: 0.15 } }, log: "认为只是普通霞光，没有采取措施。" } }
    ]
  },
  {
    id: "mountain_spirits", category: "random", name: "山神传说",
    desc: "向导们说昨夜梦见了山神，有人认为是吉兆，有人认为是警示。你决定如何解读？",
    baseWeight: 2,
    conditions: { minDay: 3, maxDay: 13 },
    weightMod: { rep: { low: 0.8, medium: 1.0, high: 1.4 } },
    options: [
      { title: "举行简单的祭祀仪式", hint: "-1干粮 +4声望，山神庇佑",
        effects: { food: -1, rep: 4, consequence: { type: "weather", description: "山神庇佑，天晴概率+15%", totalDays: 3, effect: { clearProb: 0.15 } }, log: "举行了简单的祭祀仪式，安抚了众人的情绪。" } },
      { title: "相信科学，不信传言", hint: "无影响，但向导们略有不满",
        effects: { guideEffect: { type: "addFatigue", target: "all", amount: 1 }, consequence: { type: "guideFatigue", description: "向导心存芥蒂，疲劳恢复-1/天", totalDays: 2, effect: { fatigueRecoveryBonus: -1 } }, log: "对山神传说一笑置之，但向导们略有不满。" } }
    ]
  },
  {
    id: "supply_route", category: "supply", name: "补给商队",
    desc: "一支补给商队从远方而来，愿意以优惠价格出售物资，但只收声望作为交换。",
    baseWeight: 3,
    conditions: { minDay: 4, maxDay: 12, minRep: 5 },
    weightMod: { rep: { low: 0.5, medium: 1.0, high: 1.5 }, food: { low: 1.5, medium: 1.0, high: 0.5 } },
    options: [
      { title: "用声望换补给", hint: "-5声望 +4柴火 +4干粮 +2药品，商队留下额外补给",
        effects: { rep: -5, wood: 4, food: 4, med: 2, consequence: { type: "resource", description: "商队留下的补给站每日产出+1柴火+1干粮", totalDays: 2, effect: { dailyWood: 1, dailyFood: 1 } }, log: "用声望换取了大量补给物资。" } },
      { title: "声望宝贵，婉言谢绝", hint: "无影响，但商队散播好名声",
        effects: { consequence: { type: "caravanChance", description: "商队感激，后续商队出现概率+15%", totalDays: 3, effect: { caravanChanceMod: 0.15 } }, log: "认为声望更宝贵，婉言谢绝了商队的提议，但商队很感激。" } }
    ]
  },
  {
    id: "guide_motivation", category: "guide", name: "士气鼓舞",
    desc: "连日的风雪让向导们士气低落。你需要想办法提振士气。",
    baseWeight: 4,
    conditions: { minDay: 5, maxDay: 14 },
    weightMod: { guideFatigue: { low: 0.4, medium: 1.0, high: 1.8 }, food: { low: 0.6, medium: 1.0, high: 1.4 } },
    options: [
      { title: "加餐犒劳众人", hint: "-3干粮，所有向导疲劳-3",
        effects: { food: -3, guideEffect: { type: "heal", target: "all", amount: 3 }, consequence: { type: "guideFatigue", description: "士气高涨，疲劳恢复+1/天", totalDays: 2, effect: { fatigueRecoveryBonus: 1 } }, log: "加餐犒劳了向导们，士气大振。" } },
      { title: "发表激情演讲", hint: "所有向导疲劳-1",
        effects: { guideEffect: { type: "heal", target: "all", amount: 1 }, log: "发表了激情演讲，一定程度上提振了士气。" } }
    ]
  },
  {
    id: "old_map", category: "random", name: "古老地图",
    desc: "在驿站的旧箱子里发现了一张泛黄的地图，上面标注着一条少有人知的秘密路线。",
    baseWeight: 2,
    conditions: { minDay: 3, maxDay: 13 },
    weightMod: { rep: { low: 0.7, medium: 1.0, high: 1.5 } },
    options: [
      { title: "派人勘察新路线", hint: "+6声望，北坡盐道今日奖励+2",
        effects: { rep: 6, routeEffect: { type: "boostReward", route: "north", amount: 2 }, consequence: { type: "routeBlock", description: "探明新路线，北坡盐道封路概率降低", totalDays: 3, effect: { routeId: "north", blockChanceMod: -0.2 } }, log: "派人勘察了新路线，发现了捷径。" } },
      { title: "地图可能过时，还是走熟路", hint: "无影响",
        effects: { log: "认为地图可能过时，还是选择走熟悉的路线。" } }
    ]
  }
];
export const EVENT_CATEGORY_LABELS = {
  weather: "天气异象", supply: "物资事件", guide: "向导事件",
  reputation: "声望事件", random: "随机事件"
};
