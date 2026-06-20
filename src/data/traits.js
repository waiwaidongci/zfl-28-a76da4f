'use strict';
export const DEFAULT_CAREER = {
  version: 1,
  guides: {
    "阿措": {
      totalGames: 0,
      totalDays: 0,
      totalRoutes: 0,
      totalSuccesses: 0,
      totalFailures: 0,
      routeStats: {},
      stormDays: 0,
      restDays: 0,
      consecutiveRest: 0,
      maxConsecutiveRest: 0,
      rescueFailStreak: 0,
      traits: []
    },
    "洛桑": {
      totalGames: 0,
      totalDays: 0,
      totalRoutes: 0,
      totalSuccesses: 0,
      totalFailures: 0,
      routeStats: {},
      stormDays: 0,
      restDays: 0,
      consecutiveRest: 0,
      maxConsecutiveRest: 0,
      rescueFailStreak: 0,
      traits: []
    }
  },
  unlockedTraits: {}
};
export const TRAITS = {
  herbal_expert: {
    id: "herbal_expert",
    name: "草药通",
    desc: "擅长草药小径，成功率提升且药品消耗减少",
    icon: "🌿",
    effects: {
      routeBonus: { herbal: { successMod: 0.1, medCostMod: -0.5 } }
    },
    unlockCondition: (stats) => stats.routeStats.herbal && stats.routeStats.herbal.attempts >= 12
  },
  storm_resilient: {
    id: "storm_resilient",
    name: "暴雪行者",
    desc: "暴雪天气下疲劳增长减少",
    icon: "❄️",
    effects: {
      stormFatigueMod: -0.25
    },
    unlockCondition: (stats) => stats.stormDays >= 8
  },
  rest_master: {
    id: "rest_master",
    name: "养精蓄锐",
    desc: "连续留守后恢复速度更快",
    icon: "💤",
    effects: {
      restBonus: { consecutiveThreshold: 2, extraRecovery: 1 }
    },
    unlockCondition: (stats) => stats.maxConsecutiveRest >= 3
  },
  rescue_frustration: {
    id: "rescue_frustration",
    name: "受挫消沉",
    desc: "救援失败后短期士气受损，成功率下降",
    icon: "😔",
    effects: {
      failurePenalty: { duration: 2, successMod: -0.15 }
    },
    unlockCondition: (stats) => stats.totalFailures >= 5,
    isNegative: true
  },
  route_veteran: {
    id: "route_veteran",
    name: "老马识途",
    desc: "走过 20 次以上的路线风险降低",
    icon: "🦌",
    effects: {
      veteranRoute: { threshold: 20, riskMod: -1 }
    },
    unlockCondition: (stats) => {
      let maxAttempts = 0;
      for (const rid in stats.routeStats) {
        if (stats.routeStats[rid].attempts > maxAttempts) {
          maxAttempts = stats.routeStats[rid].attempts;
        }
      }
      return maxAttempts >= 20;
    }
  },
  quick_recovery: {
    id: "quick_recovery",
    name: "回复神速",
    desc: "每次留守额外多恢复 1 点疲劳",
    icon: "⚡",
    effects: {
      flatRecoveryBonus: 1
    },
    unlockCondition: (stats) => stats.restDays >= 15
  },
  lucky_guide: {
    id: "lucky_guide",
    name: "福星高照",
    desc: "商队路线基础成功率小幅提升",
    icon: "🍀",
    effects: {
      caravanSuccessBonus: 0.05
    },
    unlockCondition: (stats) => stats.totalSuccesses >= 25
  }
};
