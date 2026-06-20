'use strict';
export const routesBase = [
  { id: "north", name: "北坡盐道", risk: 2, reward: 3, wood: 2, food: 3, med: 1, desc: "翻越北坡的古老盐道，沿途有零星盐晶可以换取物资。路途稍长但相对平缓，是稳妥的补给路线。" },
  { id: "ridge", name: "雪脊短线", risk: 3, reward: 4, wood: 3, food: 2, med: 1, desc: "沿雪线山脊穿行的险峻捷径，能最快抵达山外。途中常有落石与冰缝，但接应商队效率最高。" },
  { id: "valley", name: "松谷绕行", risk: 1, reward: 2, wood: 1, food: 4, med: 0, desc: "绕过松林谷地的安全路线，几乎没有雪崩风险。林间可以采集少量食物，但路程较远收益偏低。" },
  { id: "glacier", name: "冰原直道", risk: 5, reward: 5, wood: 4, food: 2, med: 2, desc: "横穿冰川的极限通道，暴雪天气中仍可强行通过。极度危险但距离最短，救援时必走此路。" },
  { id: "herbal", name: "草药小径", risk: 2, reward: 2, wood: 1, food: 2, med: -1, desc: "通往高山草药园的隐秘小路，沿途可采集中草药。消耗药品少，甚至能补充药材。" },
  { id: "market", name: "集市古道", risk: 1, reward: 3, wood: 2, food: 1, med: 1, desc: "通向山外集市的繁忙商道，旺季时商队络绎不绝。路好走、商队多，是旺季补给的黄金路线。" },
  { id: "cliff", name: "悬崖索道", risk: 4, reward: 3, wood: 3, food: 1, med: 2, desc: "架设在悬崖之间的古老索道，封山时期少数仍能通行的路径。高空寒风凛冽，需额外御寒。" }
];
export const ALL_ROUTES_MAP = {};
routesBase.forEach(r => ALL_ROUTES_MAP[r.id] = r);
