/* 高山驿站 - 核心游戏逻辑与数据
 * 提取自 index.html，用于单元测试和代码复用
 * 注意：仅包含纯逻辑和静态数据，不包含 DOM 操作
 */

// ===== 路线数据 =====
const routesBase = [
  { id: "north", name: "北坡盐道", risk: 2, reward: 3, wood: 2, food: 3, med: 1, desc: "翻越北坡的古老盐道，沿途有零星盐晶可以换取物资。路途稍长但相对平缓，是稳妥的补给路线。" },
  { id: "ridge", name: "雪脊短线", risk: 3, reward: 4, wood: 3, food: 2, med: 1, desc: "沿雪线山脊穿行的险峻捷径，能最快抵达山外。途中常有落石与冰缝，但接应商队效率最高。" },
  { id: "valley", name: "松谷绕行", risk: 1, reward: 2, wood: 1, food: 4, med: 0, desc: "绕过松林谷地的安全路线，几乎没有雪崩风险。林间可以采集少量食物，但路程较远收益偏低。" },
  { id: "glacier", name: "冰原直道", risk: 5, reward: 5, wood: 4, food: 2, med: 2, desc: "横穿冰川的极限通道，暴雪天气中仍可强行通过。极度危险但距离最短，救援时必走此路。" },
  { id: "herbal", name: "草药小径", risk: 2, reward: 2, wood: 1, food: 2, med: -1, desc: "通往高山草药园的隐秘小路，沿途可采集中草药。消耗药品少，甚至能补充药材。" },
  { id: "market", name: "集市古道", risk: 1, reward: 3, wood: 2, food: 1, med: 1, desc: "通向山外集市的繁忙商道，旺季时商队络绎不绝。路好走、商队多，是旺季补给的黄金路线。" },
  { id: "cliff", name: "悬崖索道", risk: 4, reward: 3, wood: 3, food: 1, med: 2, desc: "架设在悬崖之间的古老索道，封山时期少数仍能通行的路径。高空寒风凛冽，需额外御寒。" }
];
const ALL_ROUTES_MAP = {};
routesBase.forEach(r => ALL_ROUTES_MAP[r.id] = r);

// ===== 难度配置 =====
const DIFF = {
  safe:   { label: "稳妥", cls: "safe",   wood: 28, med: 12, food: 32, stormProb: 0.15, fatigueBase: 1, fatigueStorm: 1, fatigueMul: 0.8 },
  normal: { label: "标准", cls: "normal", wood: 20, med: 8,  food: 24, stormProb: 0.24, fatigueBase: 1, fatigueStorm: 2, fatigueMul: 1.0 },
  hard:   { label: "险境", cls: "hard",   wood: 14, med: 5,  food: 16, stormProb: 0.36, fatigueBase: 2, fatigueStorm: 3, fatigueMul: 1.3 }
};

// ===== 事件池 =====
const EVENTS_POOL = [
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

const EVENT_CATEGORY_LABELS = {
  weather: "天气异象", supply: "物资事件", guide: "向导事件",
  reputation: "声望事件", random: "随机事件"
};

// ===== 剧本配置 =====
const SCENARIOS = {
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

// ===== 工具函数 =====
function mulberry32(a) {
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function hashStringToSeed(str) {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

// ===== 挑战码系统 =====
const CHALLENGE_VERSION = 1;
const CHALLENGE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function encodeChallengeCode(scenarioId, difficulty, seedNum) {
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

function decodeChallengeCode(code) {
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

function generateRandomSeed() {
  const buf = new Uint32Array(1);
  if (typeof window !== "undefined" && window.crypto && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(buf);
    return buf[0] >>> 0;
  }
  return (Date.now() ^ (Math.random() * 0xFFFFFFFF)) >>> 0;
}

function formatChallengeInfo(decoded) {
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

// ===== 自定义剧本存储 =====
const CUSTOM_SCENARIOS_KEY = "mountain_post_custom_scenarios";
const CUSTOM_SCENARIO_PREFIX = "custom_";

function loadCustomScenarios() {
  try {
    if (typeof localStorage === "undefined") return {};
    const stored = localStorage.getItem(CUSTOM_SCENARIOS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (e) {
    console.error("加载自定义剧本失败:", e);
    return {};
  }
}

function saveCustomScenarios(customScenarios) {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(CUSTOM_SCENARIOS_KEY, JSON.stringify(customScenarios));
  } catch (e) {
    console.error("保存自定义剧本失败:", e);
  }
}

function mergeCustomScenarios() {
  const custom = loadCustomScenarios();
  const merged = { ...SCENARIOS };
  Object.values(custom).forEach(sc => {
    merged[sc.id] = sc;
  });
  return merged;
}

function getAllScenarios() {
  return mergeCustomScenarios();
}

function getScenarioById(id) {
  const all = getAllScenarios();
  return all[id];
}

function formatSign(num) {
  return num >= 0 ? "+" + num : String(num);
}

// ===== 剧本配置校验 =====
function validateScenarioConfig(sc) {
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

// 导出到全局（浏览器环境）
if (typeof window !== "undefined") {
  window.routesBase = routesBase;
  window.ALL_ROUTES_MAP = ALL_ROUTES_MAP;
  window.DIFF = DIFF;
  window.EVENTS_POOL = EVENTS_POOL;
  window.EVENT_CATEGORY_LABELS = EVENT_CATEGORY_LABELS;
  window.SCENARIOS = SCENARIOS;
  window.mulberry32 = mulberry32;
  window.hashStringToSeed = hashStringToSeed;
  window.CHALLENGE_VERSION = CHALLENGE_VERSION;
  window.CHALLENGE_ALPHABET = CHALLENGE_ALPHABET;
  window.encodeChallengeCode = encodeChallengeCode;
  window.decodeChallengeCode = decodeChallengeCode;
  window.generateRandomSeed = generateRandomSeed;
  window.formatChallengeInfo = formatChallengeInfo;
  window.formatChallengeCodeInput = formatChallengeCodeInput;
  window.CUSTOM_SCENARIOS_KEY = CUSTOM_SCENARIOS_KEY;
  window.CUSTOM_SCENARIO_PREFIX = CUSTOM_SCENARIO_PREFIX;
  window.loadCustomScenarios = loadCustomScenarios;
  window.saveCustomScenarios = saveCustomScenarios;
  window.mergeCustomScenarios = mergeCustomScenarios;
  window.getAllScenarios = getAllScenarios;
  window.getScenarioById = getScenarioById;
  window.formatSign = formatSign;
  window.validateScenarioConfig = validateScenarioConfig;
}

// CommonJS 导出（Node.js 环境）
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    routesBase,
    ALL_ROUTES_MAP,
    DIFF,
    EVENTS_POOL,
    EVENT_CATEGORY_LABELS,
    SCENARIOS,
    mulberry32,
    hashStringToSeed,
    CHALLENGE_VERSION,
    CHALLENGE_ALPHABET,
    encodeChallengeCode,
    decodeChallengeCode,
    generateRandomSeed,
    formatChallengeInfo,
    formatChallengeCodeInput,
    CUSTOM_SCENARIOS_KEY,
    CUSTOM_SCENARIO_PREFIX,
    loadCustomScenarios,
    saveCustomScenarios,
    mergeCustomScenarios,
    getAllScenarios,
    getScenarioById,
    formatSign,
    validateScenarioConfig
  };
}
