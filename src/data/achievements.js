'use strict';
export const ACHIEVEMENTS = {
  standard: [
    {
      id: "standard_survivor",
      name: "坚守大师",
      desc: "成功完成标准雪线剧本",
      icon: "🏔",
      check: (game, archive) => {
        if (archive) return archive.win;
        if (game) return game.ended && !game.failureReason;
        return false;
      }
    },
    {
      id: "standard_caravan_collector",
      name: "商队收集者",
      desc: "单局接应 10 队以上商队",
      icon: "🐪",
      check: (game, archive) => (game ? game.saved : archive.savedCaravans) >= 10
    },
    {
      id: "standard_perfect",
      name: "零失误",
      desc: "全程无向导疲劳超过 8 且无物资告急",
      icon: "✨",
      check: (game, archive) => {
        const history = game ? game.replayHistory : archive.replayHistory;
        if (!history || history.length === 0) return false;
        let allGood = true;
        for (const day of history) {
          if (day.endGuides) {
            for (const g of day.endGuides) {
              if (g.fatigue > 8) allGood = false;
            }
          }
          if (day.endResources) {
            if (day.endResources.wood <= 2 || day.endResources.food <= 4 || day.endResources.med <= 1) {
              allGood = false;
            }
          }
        }
        return allGood && (archive ? archive.win : game.ended && !game.failureReason);
      }
    }
  ],
  medshortage: [
    {
      id: "medshortage_no_outbreak",
      name: "疫情防控专家",
      desc: "全程不触发疫情恶化失败",
      icon: "💊",
      check: (game, archive) => {
        if (archive) {
          return archive.win && archive.failureReason !== "药品持续短缺，疫情恶化";
        }
        return game.ended && !game.failureReason && game.medCriticalStreak < 2;
      }
    },
    {
      id: "medshortage_herbalist",
      name: "草药专家",
      desc: "单局走草药小径 8 次以上",
      icon: "🌿",
      check: (game, archive) => {
        const pref = game ? game.routeDispatches : archive.routePreference;
        return pref && pref.herbal >= 8;
      }
    },
    {
      id: "medshortage_savior",
      name: "瘟疫克星",
      desc: "声望 40 以上胜利",
      icon: "🌟",
      check: (game, archive) => {
        const rep = game ? game.rep : archive.reputation;
        const win = game ? (game.ended && !game.failureReason) : archive.win;
        return rep >= 40 && win;
      }
    }
  ],
  caravan: [
    {
      id: "caravan_early_bird",
      name: "高效调度",
      desc: "第 8 天前达成 12 队接应目标",
      icon: "⚡",
      check: (game, archive) => {
        const history = game ? game.replayHistory : archive.replayHistory;
        if (!history || history.length === 0) return false;
        for (let i = 0; i < history.length; i++) {
          if (i < 8 && history[i].savedCaravans >= 12) {
            const win = game ? (game.ended && !game.failureReason) : archive.win;
            return win;
          }
        }
        return false;
      }
    },
    {
      id: "caravan_tycoon",
      name: "旺季之王",
      desc: "单局接应商队 15 队以上",
      icon: "👑",
      check: (game, archive) => {
        const saved = game ? game.saved : archive.savedCaravans;
        return saved >= 15;
      }
    },
    {
      id: "caravan_wealthy",
      name: "财源广进",
      desc: "结束时声望 50 以上",
      icon: "💰",
      check: (game, archive) => {
        const rep = game ? game.rep : archive.reputation;
        const win = game ? (game.ended && !game.failureReason) : archive.win;
        return rep >= 50 && win;
      }
    }
  ],
  rescue: [
    {
      id: "rescue_blizzard_hero",
      name: "暴雪英雄",
      desc: "在单个暴雪日成功接应 2 队以上",
      icon: "❄️",
      check: (game, archive) => {
        const history = game ? game.replayHistory : archive.replayHistory;
        if (!history || history.length === 0) return false;
        for (let i = 0; i < history.length; i++) {
          const day = history[i];
          if (day.weather === "暴雪") {
            const prevSaved = i > 0 ? history[i - 1].savedCaravans : 0;
            const todaySaved = day.savedCaravans - prevSaved;
            if (todaySaved >= 2) return true;
          }
        }
        return false;
      }
    },
    {
      id: "rescue_extreme",
      name: "极限救援",
      desc: "10 天内救出 10 队以上",
      icon: "🚁",
      check: (game, archive) => {
        const saved = game ? game.saved : archive.savedCaravans;
        const win = game ? (game.ended && !game.failureReason) : archive.win;
        return saved >= 10 && win;
      }
    },
    {
      id: "rescue_glacier_master",
      name: "冰原先锋",
      desc: "冰原直道成功接应 5 次以上",
      icon: "🧊",
      check: (game, archive) => {
        const history = game ? game.replayHistory : archive.replayHistory;
        if (!history || history.length === 0) return false;
        let glacierSuccesses = 0;
        for (let i = 0; i < history.length; i++) {
          const day = history[i];
          if (day.guideAssignments && day.guideAssignments.some(ga => ga.routeId === "glacier")) {
            const prevSaved = i > 0 ? history[i - 1].savedCaravans : 0;
            const todaySaved = day.savedCaravans - prevSaved;
            if (todaySaved > 0) {
              glacierSuccesses += todaySaved;
            }
          }
        }
        return glacierSuccesses >= 5;
      }
    }
  ]
};
