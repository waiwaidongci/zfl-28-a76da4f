// Node.js 测试运行器 - 运行与 tests.html 相同的所有测试
const logic = require('./game-logic.js');

// Mock localStorage
let store = {};
global.localStorage = {
  getItem: function(key) { return store[key] || null; },
  setItem: function(key, value) { store[key] = String(value); },
  removeItem: function(key) { delete store[key]; },
  clear: function() { store = {}; }
};

// 将 game-logic 的导出挂到全局，模拟浏览器环境
Object.assign(global, logic);

// ===== 轻量测试框架（与 tests.html 相同） =====
let testSuites = [];
let currentSuite = null;

function describe(name, fn) {
  currentSuite = { name: name, tests: [] };
  testSuites.push(currentSuite);
  fn();
  currentSuite = null;
}

function it(name, fn) {
  if (!currentSuite) return;
  currentSuite.tests.push({ name, fn });
}

function beforeEach(fn) {
  if (!currentSuite) return;
  const origTests = currentSuite.tests;
  currentSuite.tests = [];
  for (const test of origTests) {
    currentSuite.tests.push({
      name: test.name,
      fn: function() { fn(); test.fn(); }
    });
  }
}

function expect(actual) {
  return {
    toBe: function(expected) {
      if (actual !== expected) {
        throw new Error(`期望 ${JSON.stringify(expected)}，实际 ${JSON.stringify(actual)}`);
      }
    },
    toEqual: function(expected) {
      const a = JSON.stringify(actual);
      const b = JSON.stringify(expected);
      if (a !== b) {
        throw new Error(`期望 ${b}，实际 ${a}`);
      }
    },
    toBeTruthy: function() {
      if (!actual) {
        throw new Error(`期望真值，实际 ${JSON.stringify(actual)}`);
      }
    },
    toBeFalsy: function() {
      if (actual) {
        throw new Error(`期望假值，实际 ${JSON.stringify(actual)}`);
      }
    },
    toBeNull: function() {
      if (actual !== null) {
        throw new Error(`期望 null，实际 ${JSON.stringify(actual)}`);
      }
    },
    toBeGreaterThan: function(expected) {
      if (actual <= expected) {
        throw new Error(`期望大于 ${expected}，实际 ${actual}`);
      }
    },
    toBeLessThan: function(expected) {
      if (actual >= expected) {
        throw new Error(`期望小于 ${expected}，实际 ${actual}`);
      }
    },
    toContain: function(item) {
      if (!actual || !actual.includes(item)) {
        throw new Error(`期望包含 ${JSON.stringify(item)}，实际 ${JSON.stringify(actual)}`);
      }
    },
    toHaveLength: function(len) {
      if (!actual || actual.length !== len) {
        throw new Error(`期望长度 ${len}，实际 ${actual ? actual.length : 'undefined'}`);
      }
    },
    toMatch: function(regex) {
      if (!regex.test(actual)) {
        throw new Error(`期望匹配 ${regex}，实际 ${JSON.stringify(actual)}`);
      }
    },
    toBeUndefined: function() {
      if (actual !== undefined) {
        throw new Error(`期望 undefined，实际 ${JSON.stringify(actual)}`);
      }
    }
  };
}

// ===== 测试用例（与 tests.html 完全相同） =====

// --- 挑战码格式化测试 ---
describe("挑战码格式化 formatChallengeCodeInput", function() {
  it("空字符串返回空", function() {
    expect(formatChallengeCodeInput("")).toBe("");
    expect(formatChallengeCodeInput(null)).toBe("");
    expect(formatChallengeCodeInput(undefined)).toBe("");
  });

  it("小写字母自动转大写", function() {
    expect(formatChallengeCodeInput("abc")).toBe("ABC");
  });

  it("过滤非字母数字字符，但保留 I/O/0/1", function() {
    expect(formatChallengeCodeInput("A@B#C$")).toBe("ABC");
    expect(formatChallengeCodeInput("A B C")).toBe("ABC");
    expect(formatChallengeCodeInput("AIO01B")).toBe("AIO-B");
  });

  it("正确按 3-2-2 分段", function() {
    expect(formatChallengeCodeInput("ABCDEFG")).toBe("ABC-DE-FG");
  });

  it("不足 7 字符时正确分段", function() {
    expect(formatChallengeCodeInput("AB")).toBe("AB");
    expect(formatChallengeCodeInput("ABCD")).toBe("ABC-D");
    expect(formatChallengeCodeInput("ABCDE")).toBe("ABC-DE");
    expect(formatChallengeCodeInput("ABCDEF")).toBe("ABC-DE-F");
  });

  it("超过 7 字符时截断", function() {
    expect(formatChallengeCodeInput("ABCDEFGH")).toBe("ABC-DE-FG");
  });

  it("带连字符的输入也能正确清理和重格式化", function() {
    expect(formatChallengeCodeInput("abc-de-fg")).toBe("ABC-DE-FG");
    expect(formatChallengeCodeInput("AB-CDE-FG")).toBe("ABC-DE-FG");
  });
});

// --- 挑战码生成测试 ---
describe("挑战码生成 encodeChallengeCode", function() {
  it("生成的挑战码符合 ABC-DE-FG 格式", function() {
    const code = encodeChallengeCode("standard", "normal", 12345);
    expect(code).toMatch(/^[A-Z2-9]{3}-[A-Z2-9]{2}-[A-Z2-9]{2}$/);
  });

  it("只使用字母表中的字符", function() {
    const code = encodeChallengeCode("standard", "normal", 42);
    const clean = code.replace(/-/g, "");
    for (const ch of clean) {
      expect(CHALLENGE_ALPHABET.includes(ch)).toBeTruthy();
    }
  });

  it("相同参数生成相同结果（确定性）", function() {
    const code1 = encodeChallengeCode("standard", "normal", 100);
    const code2 = encodeChallengeCode("standard", "normal", 100);
    expect(code1).toBe(code2);
  });

  it("不同剧本生成不同编码", function() {
    const code1 = encodeChallengeCode("standard", "normal", 100);
    const code2 = encodeChallengeCode("caravan", "normal", 100);
    expect(code1 !== code2).toBeTruthy();
  });

  it("不同难度生成不同编码", function() {
    const code1 = encodeChallengeCode("standard", "safe", 100);
    const code2 = encodeChallengeCode("standard", "hard", 100);
    expect(code1 !== code2).toBeTruthy();
  });

  it("不同种子生成不同编码", function() {
    const code1 = encodeChallengeCode("standard", "normal", 100);
    const code2 = encodeChallengeCode("standard", "normal", 200);
    expect(code1 !== code2).toBeTruthy();
  });

  it("无效剧本ID回退到第 0 个剧本", function() {
    const code1 = encodeChallengeCode("nonexistent", "normal", 50);
    const code2 = encodeChallengeCode("standard", "normal", 50);
    expect(code1).toBe(code2);
  });

  it("无效难度回退到 normal", function() {
    const code1 = encodeChallengeCode("standard", "invalid", 50);
    const code2 = encodeChallengeCode("standard", "normal", 50);
    expect(code1).toBe(code2);
  });

  it("种子为 0 时也能生成有效编码", function() {
    const code = encodeChallengeCode("standard", "normal", 0);
    expect(code).toMatch(/^[A-Z2-9]{3}-[A-Z2-9]{2}-[A-Z2-9]{2}$/);
  });

  it("大种子值（接近 2^32）也能正确编码", function() {
    const code = encodeChallengeCode("standard", "normal", 0xFFFFFFFF);
    expect(code).toMatch(/^[A-Z2-9]{3}-[A-Z2-9]{2}-[A-Z2-9]{2}$/);
  });
});

// --- 挑战码解码测试 ---
describe("挑战码解码 decodeChallengeCode", function() {
  it("有效挑战码返回解码对象", function() {
    const code = encodeChallengeCode("standard", "normal", 42);
    const decoded = decodeChallengeCode(code);
    expect(decoded).toBeTruthy();
    expect(decoded.valid).toBe(true);
  });

  it("编码后解码能还原剧本和难度", function() {
    const testCases = [
      { sc: "standard", diff: "safe" },
      { sc: "standard", diff: "normal" },
      { sc: "standard", diff: "hard" },
      { sc: "medshortage", diff: "normal" },
      { sc: "caravan", diff: "hard" },
      { sc: "rescue", diff: "safe" },
    ];
    for (const tc of testCases) {
      const code = encodeChallengeCode(tc.sc, tc.diff, 999);
      const decoded = decodeChallengeCode(code);
      expect(decoded.scenarioId).toBe(tc.sc);
      expect(decoded.difficulty).toBe(tc.diff);
    }
  });

  it("空输入返回 null", function() {
    expect(decodeChallengeCode("")).toBeNull();
    expect(decodeChallengeCode(null)).toBeNull();
    expect(decodeChallengeCode(undefined)).toBeNull();
  });

  it("长度不足返回 null", function() {
    expect(decodeChallengeCode("ABC")).toBeNull();
    expect(decodeChallengeCode("ABC-DE")).toBeNull();
  });

  it("长度超过返回 null", function() {
    expect(decodeChallengeCode("ABC-DE-FGH")).toBeNull();
  });

  it("包含非法字符返回 null", function() {
    expect(decodeChallengeCode("ABI-DE-FG")).toBeNull();
    expect(decodeChallengeCode("AB0-DE-FG")).toBeNull();
  });

  it("小写字母也能正确解码", function() {
    const code = encodeChallengeCode("standard", "normal", 777);
    const decoded = decodeChallengeCode(code.toLowerCase());
    expect(decoded).toBeTruthy();
    expect(decoded.valid).toBe(true);
  });

  it("带多余格式符也能正确解析", function() {
    const code = encodeChallengeCode("standard", "normal", 123);
    const decoded = decodeChallengeCode("  " + code + "  ");
    expect(decoded).toBeTruthy();
  });

  it("formatted 字段格式正确", function() {
    const code = encodeChallengeCode("standard", "normal", 456);
    const decoded = decodeChallengeCode(code);
    expect(decoded.formatted).toMatch(/^[A-Z2-9]{3}-[A-Z2-9]{2}-[A-Z2-9]{2}$/);
  });

  it("解码出的 seed 是 32 位无符号整数", function() {
    const testSeeds = [0, 1, 1000, 0x7FFFFFFF, 0xFFFFFFFF];
    for (const seed of testSeeds) {
      const code = encodeChallengeCode("standard", "normal", seed);
      const decoded = decodeChallengeCode(code);
      expect(decoded.seed >>> 0).toBe(decoded.seed);
    }
  });
});

// --- 挑战码编解码往返测试 ---
describe("挑战码编解码往返一致性", function() {
  it("encode 后 decode 能正确还原剧本ID", function() {
    const scenarioIds = Object.keys(SCENARIOS);
    for (const scId of scenarioIds) {
      const code = encodeChallengeCode(scId, "normal", 100);
      const decoded = decodeChallengeCode(code);
      expect(decoded.scenarioId).toBe(scId);
    }
  });

  it("encode 后 decode 能正确还原难度", function() {
    for (const diff of ["safe", "normal", "hard"]) {
      const code = encodeChallengeCode("standard", diff, 42);
      const decoded = decodeChallengeCode(code);
      expect(decoded.difficulty).toBe(diff);
    }
  });

  it("解码结果稳定（相同码总是解出相同种子）", function() {
    const code = encodeChallengeCode("standard", "normal", 42);
    const d1 = decodeChallengeCode(code);
    const d2 = decodeChallengeCode(code);
    expect(d1.seed).toBe(d2.seed);
    expect(d1.scenarioId).toBe(d2.scenarioId);
    expect(d1.difficulty).toBe(d2.difficulty);
  });

  it("解码出的 seed 是有效的 32 位无符号整数", function() {
    const testSeeds = [
      0, 1, 42, 100, 12345, 67890,
      0x7FFFFFFF, 0x80000000, 0xFFFFFFFF,
      0x5A5A5A5A, 0xA5A5A5A5
    ];
    for (const seed of testSeeds) {
      const code = encodeChallengeCode("standard", "normal", seed);
      const decoded = decodeChallengeCode(code);
      expect(decoded.seed >>> 0).toBe(decoded.seed);
      expect(decoded.seed >= 0).toBeTruthy();
      expect(decoded.seed <= 0xFFFFFFFF).toBeTruthy();
    }
  });

  it("不同种子生成不同挑战码", function() {
    const codes = new Set();
    for (let i = 0; i < 50; i++) {
      const code = encodeChallengeCode("standard", "normal", i * 12345);
      codes.add(code);
    }
    expect(codes.size).toBe(50);
  });

  it("formatted 字段与原始码格式一致", function() {
    const code = encodeChallengeCode("rescue", "hard", 9999);
    const decoded = decodeChallengeCode(code);
    expect(decoded.formatted).toBe(code);
  });
});

// --- 挑战码信息格式化 ---
describe("挑战码信息 formatChallengeInfo", function() {
  it("null 输入返回 null", function() {
    expect(formatChallengeInfo(null)).toBeNull();
  });

  it("正确返回剧本名称和难度标签", function() {
    const code = encodeChallengeCode("standard", "normal", 42);
    const decoded = decodeChallengeCode(code);
    const info = formatChallengeInfo(decoded);
    expect(info.scenarioName).toBe("标准雪线");
    expect(info.difficultyLabel).toBe("标准");
    expect(info.seed).toBe(decoded.seed);
  });

  it("rescue 剧本正确显示", function() {
    const code = encodeChallengeCode("rescue", "hard", 42);
    const decoded = decodeChallengeCode(code);
    const info = formatChallengeInfo(decoded);
    expect(info.scenarioName).toBe("封山救援");
    expect(info.difficultyLabel).toBe("险境");
  });
});

// --- 剧本与难度匹配校验 ---
describe("内置剧本配置校验", function() {
  it("所有内置剧本都通过 validateScenarioConfig 校验", function() {
    const scenarioIds = Object.keys(SCENARIOS);
    for (const scId of scenarioIds) {
      const sc = SCENARIOS[scId];
      const result = validateScenarioConfig(sc);
      if (!result.isValid) {
        throw new Error(`${sc.name} (${scId}) 校验失败: ${result.errors.join("; ")}`);
      }
    }
  });

  it("标准雪线剧本有 3 条路线", function() {
    const result = validateScenarioConfig(SCENARIOS.standard);
    expect(result.isValid).toBe(true);
  });

  it("所有内置剧本的天气概率之和大于 0", function() {
    const scenarioIds = Object.keys(SCENARIOS);
    for (const scId of scenarioIds) {
      const sc = SCENARIOS[scId];
      const total = (sc.weatherTable.clear || 0) + (sc.weatherTable.wind || 0) + (sc.weatherTable.storm || 0);
      expect(total > 0).toBeTruthy();
    }
  });

  it("封山救援剧本有暴雪免疫路线", function() {
    const sc = SCENARIOS.rescue;
    expect(sc.routeMod.stormRouteImmune).toBeTruthy();
    expect(sc.routeMod.stormRouteImmune.length).toBeGreaterThan(0);
  });

  it("药品短缺剧本有药品危急失败条件", function() {
    const sc = SCENARIOS.medshortage;
    expect(sc.lose.medCritical).toBeTruthy();
  });

  it("商队旺季剧本的胜利类型是接应商队", function() {
    const sc = SCENARIOS.caravan;
    expect(sc.win.type).toBe("caravans");
    expect(sc.win.count).toBe(12);
  });
});

// --- 自定义剧本校验：路线池 ---
describe("自定义剧本校验 - 路线池", function() {
  function makeScenario(overrides) {
    return {
      name: "测试剧本",
      targetDays: 15,
      routePool: ["north", "ridge", "valley"],
      startResources: { wood: 0, med: 0, food: 0, rep: 0 },
      weatherTable: { clear: 0.5, wind: 0.3, storm: 0.2 },
      routeMod: { caravanChance: 0.7, stormBlockChance: 0.3 },
      eventWeightMul: { weather: 1, supply: 1, guide: 1, reputation: 1, random: 1 },
      eventTriggerChance: 0.75,
      win: { type: "days", label: "测试" },
      lose: { resources: true, fatigue: true },
      ...overrides
    };
  }

  it("路线池为空 → 错误", function() {
    const sc = makeScenario({ routePool: [] });
    const result = validateScenarioConfig(sc);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes("至少需要选择 2 条可用路线"))).toBeTruthy();
  });

  it("只有 1 条路线 → 错误", function() {
    const sc = makeScenario({ routePool: ["north"] });
    const result = validateScenarioConfig(sc);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes("至少需要选择 2 条可用路线"))).toBeTruthy();
  });

  it("包含无效路线ID → 错误", function() {
    const sc = makeScenario({ routePool: ["north", "invalid_route"] });
    const result = validateScenarioConfig(sc);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes("无效的路线ID"))).toBeTruthy();
  });

  it("全部是高风险路线（风险≥3） → 警告", function() {
    const sc = makeScenario({ routePool: ["ridge", "glacier", "cliff"] });
    const result = validateScenarioConfig(sc);
    expect(result.isValid).toBe(true);
    expect(result.warnings.some(w => w.includes("所有路线风险都很高"))).toBeTruthy();
  });

  it("至少有一条低风险路线 → 无高风险警告", function() {
    const sc = makeScenario({ routePool: ["north", "valley"] });
    const result = validateScenarioConfig(sc);
    const hasHighRiskWarning = result.warnings.some(w => w.includes("所有路线风险都很高"));
    expect(hasHighRiskWarning).toBe(false);
  });

  it("2 条路线（最低要求） → 有效", function() {
    const sc = makeScenario({ routePool: ["north", "valley"] });
    const result = validateScenarioConfig(sc);
    expect(result.isValid).toBe(true);
  });
});

// --- 自定义剧本校验：天气权重 ---
describe("自定义剧本校验 - 天气权重", function() {
  function makeScenario(overrides) {
    return {
      name: "测试剧本",
      targetDays: 15,
      routePool: ["north", "ridge", "valley"],
      startResources: { wood: 0, med: 0, food: 0, rep: 0 },
      weatherTable: { clear: 0.5, wind: 0.3, storm: 0.2 },
      routeMod: { caravanChance: 0.7, stormBlockChance: 0.3 },
      eventWeightMul: { weather: 1, supply: 1, guide: 1, reputation: 1, random: 1 },
      eventTriggerChance: 0.75,
      win: { type: "days", label: "测试" },
      lose: { resources: true, fatigue: true },
      ...overrides
    };
  }

  it("天气概率全为 0 → 错误", function() {
    const sc = makeScenario({ weatherTable: { clear: 0, wind: 0, storm: 0 } });
    const result = validateScenarioConfig(sc);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes("天气概率之和必须大于 0"))).toBeTruthy();
  });

  it("暴雪概率 ≥ 80% 且无免疫路线 → 警告", function() {
    const sc = makeScenario({ weatherTable: { clear: 0, wind: 0.1, storm: 0.9 } });
    const result = validateScenarioConfig(sc);
    expect(result.warnings.some(w => w.includes("暴雪概率超过 80%"))).toBeTruthy();
  });

  it("暴雪概率 ≥ 80% 但有免疫路线 → 无暴雪警告", function() {
    const sc = makeScenario({
      weatherTable: { clear: 0, wind: 0.1, storm: 0.9 },
      routeMod: { caravanChance: 0.7, stormBlockChance: 0.3, stormRouteImmune: ["north"] }
    });
    const result = validateScenarioConfig(sc);
    const hasBlizzardWarning = result.warnings.some(w => w.includes("暴雪概率超过 80%"));
    expect(hasBlizzardWarning).toBe(false);
  });

  it("暴雪概率刚好 80% → 触发警告", function() {
    const sc = makeScenario({ weatherTable: { clear: 0, wind: 0.2, storm: 0.8 } });
    const result = validateScenarioConfig(sc);
    expect(result.warnings.some(w => w.includes("暴雪概率超过 80%"))).toBeTruthy();
  });

  it("暴雪概率 79% → 不触发警告", function() {
    const sc = makeScenario({ weatherTable: { clear: 0.01, wind: 0.2, storm: 0.79 } });
    const result = validateScenarioConfig(sc);
    const hasWarning = result.warnings.some(w => w.includes("暴雪概率超过 80%"));
    expect(hasWarning).toBe(false);
  });
});

// --- 自定义剧本校验：初始资源 ---
describe("自定义剧本校验 - 初始资源", function() {
  function makeScenario(overrides) {
    return {
      name: "测试剧本",
      targetDays: 15,
      routePool: ["north", "ridge", "valley"],
      startResources: { wood: 0, med: 0, food: 0, rep: 0 },
      weatherTable: { clear: 0.5, wind: 0.3, storm: 0.2 },
      routeMod: { caravanChance: 0.7, stormBlockChance: 0.3 },
      eventWeightMul: { weather: 1, supply: 1, guide: 1, reputation: 1, random: 1 },
      eventTriggerChance: 0.75,
      win: { type: "days", label: "测试" },
      lose: { resources: true, fatigue: true },
      ...overrides
    };
  }

  it("标准难度下初始资源为 0（默认） → 有效", function() {
    const sc = makeScenario({ startResources: { wood: 0, med: 0, food: 0, rep: 0 } });
    const result = validateScenarioConfig(sc);
    expect(result.isValid).toBe(true);
  });

  it("初始资源加成足够高 → 有效", function() {
    const sc = makeScenario({ startResources: { wood: 10, med: 5, food: 10, rep: 0 } });
    const result = validateScenarioConfig(sc);
    expect(result.isValid).toBe(true);
  });

  it("标准难度下柴火为负 → 错误", function() {
    const sc = makeScenario({ startResources: { wood: -30, med: 0, food: 0, rep: 0 } });
    const result = validateScenarioConfig(sc);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes("初始资源"))).toBeTruthy();
  });

  it("标准难度中药品为负 → 错误", function() {
    const sc = makeScenario({ startResources: { wood: 0, med: -10, food: 0, rep: 0 } });
    const result = validateScenarioConfig(sc);
    expect(result.isValid).toBe(false);
  });

  it("标准难度干粮为负 → 错误", function() {
    const sc = makeScenario({ startResources: { wood: 0, med: 0, food: -30, rep: 0 } });
    const result = validateScenarioConfig(sc);
    expect(result.isValid).toBe(false);
  });

  it("稳妥难度下资源也为负 → 必败配置错误", function() {
    const sc = makeScenario({
      startResources: { wood: -30, med: -15, food: -35, rep: 0 }
    });
    const result = validateScenarioConfig(sc);
    const hasLethalError = result.errors.some(e => e.includes("必败配置"));
    expect(hasLethalError).toBeTruthy();
  });

  it("初始干粮不足以支撑 → 警告", function() {
    const sc = makeScenario({
      targetDays: 20,
      startResources: { wood: 0, med: 0, food: -15, rep: 0 }
    });
    const result = validateScenarioConfig(sc);
    const hasFoodWarning = result.warnings.some(w => w.includes("初始干粮可能不足以支撑"));
    expect(hasFoodWarning).toBeTruthy();
  });

  it("暴雪概率高且柴火不足 → 警告", function() {
    const sc = makeScenario({
      targetDays: 20,
      weatherTable: { clear: 0.3, wind: 0.3, storm: 0.4 },
      startResources: { wood: -10, med: 0, food: 0, rep: 0 }
    });
    const result = validateScenarioConfig(sc);
    const hasWoodWarning = result.warnings.some(w => w.includes("初始柴火偏低"));
    expect(hasWoodWarning).toBeTruthy();
  });
});

// --- 自定义剧本校验：胜败条件 ---
describe("自定义剧本校验 - 胜败条件", function() {
  function makeScenario(overrides) {
    return {
      name: "测试剧本",
      targetDays: 15,
      routePool: ["north", "ridge", "valley"],
      startResources: { wood: 0, med: 0, food: 0, rep: 0 },
      weatherTable: { clear: 0.5, wind: 0.3, storm: 0.2 },
      routeMod: { caravanChance: 0.7, stormBlockChance: 0.3 },
      eventWeightMul: { weather: 1, supply: 1, guide: 1, reputation: 1, random: 1 },
      eventTriggerChance: 0.75,
      win: { type: "days", label: "测试" },
      lose: { resources: true, fatigue: true },
      ...overrides
    };
  }

  it("商队目标过高（> 理论最大值 * 1.5） → 错误", function() {
    const sc = makeScenario({
      targetDays: 10,
      routePool: ["north", "valley"],
      win: { type: "caravans", count: 100 }
    });
    const result = validateScenarioConfig(sc);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes("接应商队目标"))).toBeTruthy();
  });

  it("商队目标偏高（> 理论最大值） → 警告", function() {
    const sc = makeScenario({
      targetDays: 10,
      routePool: ["north", "valley"],
      routeMod: { caravanChance: 0.5, stormBlockChance: 0.3 },
      win: { type: "caravans", count: 12 }
    });
    const result = validateScenarioConfig(sc);
    expect(result.isValid).toBe(true);
    expect(result.warnings.some(w => w.includes("接应商队目标") && w.includes("偏高"))).toBeTruthy();
  });

  it("商队目标合理 → 无商队警告", function() {
    const sc = makeScenario({
      win: { type: "caravans", count: 5 }
    });
    const result = validateScenarioConfig(sc);
    const hasCaravanWarning = result.warnings.some(w => w.includes("接应商队目标") && w.includes("偏高"));
    expect(hasCaravanWarning).toBe(false);
  });

  it("声望目标偏高 → 警告", function() {
    const sc = makeScenario({
      targetDays: 10,
      win: { type: "days_and_rep", rep: 100 }
    });
    const result = validateScenarioConfig(sc);
    expect(result.warnings.some(w => w.includes("声望目标") && w.includes("偏高"))).toBeTruthy();
  });

  it("声望目标合理 → 无声望警告", function() {
    const sc = makeScenario({
      targetDays: 15,
      win: { type: "days_and_rep", rep: 20 }
    });
    const result = validateScenarioConfig(sc);
    const hasRepWarning = result.warnings.some(w => w.includes("声望目标") && w.includes("偏高"));
    expect(hasRepWarning).toBe(false);
  });

  it("商队+声望复合目标都偏高 → 两个警告", function() {
    const sc = makeScenario({
      targetDays: 10,
      routePool: ["north", "valley"],
      routeMod: { caravanChance: 0.5, stormBlockChance: 0.3 },
      win: { type: "caravans_and_rep", count: 15, rep: 100 }
    });
    const result = validateScenarioConfig(sc);
    const caravanWarnings = result.warnings.filter(w => w.includes("接应商队目标"));
    const repWarnings = result.warnings.filter(w => w.includes("声望目标"));
    expect(caravanWarnings.length).toBeGreaterThan(0);
    expect(repWarnings.length).toBeGreaterThan(0);
  });

  it("没有任何失败规则 → 警告", function() {
    const sc = makeScenario({
      lose: { resources: false, fatigue: false }
    });
    const result = validateScenarioConfig(sc);
    expect(result.warnings.some(w => w.includes("没有启用任何失败规则"))).toBeTruthy();
  });

  it("有资源失败规则 → 无'无失败规则'警告", function() {
    const sc = makeScenario({
      lose: { resources: true, fatigue: false }
    });
    const result = validateScenarioConfig(sc);
    const hasNoLoseWarning = result.warnings.some(w => w.includes("没有启用任何失败规则"));
    expect(hasNoLoseWarning).toBe(false);
  });
});

// --- 自定义剧本校验：事件权重 ---
describe("自定义剧本校验 - 事件权重", function() {
  function makeScenario(overrides) {
    return {
      name: "测试剧本",
      targetDays: 15,
      routePool: ["north", "ridge", "valley"],
      startResources: { wood: 0, med: 0, food: 0, rep: 0 },
      weatherTable: { clear: 0.5, wind: 0.3, storm: 0.2 },
      routeMod: { caravanChance: 0.7, stormBlockChance: 0.3 },
      eventWeightMul: { weather: 1, supply: 1, guide: 1, reputation: 1, random: 1 },
      eventTriggerChance: 0.75,
      win: { type: "days", label: "测试" },
      lose: { resources: true, fatigue: true },
      ...overrides
    };
  }

  it("所有事件类别权重都为 0 → 警告", function() {
    const sc = makeScenario({
      eventWeightMul: { weather: 0, supply: 0, guide: 0, reputation: 0, random: 0 }
    });
    const result = validateScenarioConfig(sc);
    expect(result.warnings.some(w => w.includes("所有事件类别权重都为 0"))).toBeTruthy();
  });

  it("有部分类别权重非零 → 无权重为0警告", function() {
    const sc = makeScenario({
      eventWeightMul: { weather: 0, supply: 0, guide: 0, reputation: 0, random: 1 }
    });
    const result = validateScenarioConfig(sc);
    const hasZeroWeightWarning = result.warnings.some(w => w.includes("所有事件类别权重都为 0"));
    expect(hasZeroWeightWarning).toBe(false);
  });

  it("目标天数为 0 → 无事件可触发警告", function() {
    const sc = makeScenario({ targetDays: 0 });
    const result = validateScenarioConfig(sc);
    expect(result.warnings.some(w => w.includes("没有任何事件能够在该剧本配置下触发"))).toBeTruthy();
  });

  it("正常天数 → 有事件可触发", function() {
    const sc = makeScenario({ targetDays: 15 });
    const result = validateScenarioConfig(sc);
    const hasNoEventWarning = result.warnings.some(w => w.includes("没有任何事件能够在该剧本配置下触发"));
    expect(hasNoEventWarning).toBe(false);
  });

  it("初始药品太低导致某些事件永远无法触发 → 警告", function() {
    const sc = makeScenario({
      targetDays: 1,
      startResources: { wood: 0, med: -20, food: 0, rep: 0 }
    });
    const result = validateScenarioConfig(sc);
    const hasNeverTriggerWarning = result.warnings.some(w => w.includes("永远无法触发"));
    expect(hasNeverTriggerWarning).toBeTruthy();
  });
});

// --- 自定义剧本校验：目标天数 ---
describe("自定义剧本校验 - 目标天数与暴雪免疫", function() {
  function makeScenario(overrides) {
    return {
      name: "测试剧本",
      targetDays: 15,
      routePool: ["north", "ridge", "valley"],
      startResources: { wood: 0, med: 0, food: 0, rep: 0 },
      weatherTable: { clear: 0.5, wind: 0.3, storm: 0.2 },
      routeMod: { caravanChance: 0.7, stormBlockChance: 0.3 },
      eventWeightMul: { weather: 1, supply: 1, guide: 1, reputation: 1, random: 1 },
      eventTriggerChance: 0.75,
      win: { type: "days", label: "测试" },
      lose: { resources: true, fatigue: true },
      ...overrides
    };
  }

  it("目标天数少于 5 天 → 警告", function() {
    const sc = makeScenario({ targetDays: 3 });
    const result = validateScenarioConfig(sc);
    expect(result.warnings.some(w => w.includes("目标天数少于 5 天"))).toBeTruthy();
  });

  it("目标天数超过 25 天 → 警告", function() {
    const sc = makeScenario({ targetDays: 30 });
    const result = validateScenarioConfig(sc);
    expect(result.warnings.some(w => w.includes("目标天数超过 25 天"))).toBeTruthy();
  });

  it("目标天数 15 天（正常范围） → 无数天警告", function() {
    const sc = makeScenario({ targetDays: 15 });
    const result = validateScenarioConfig(sc);
    const hasDaysWarning = result.warnings.some(w => w.includes("目标天数少于") || w.includes("目标天数超过"));
    expect(hasDaysWarning).toBe(false);
  });

  it("暴雪免疫路线不在路线池中 → 警告", function() {
    const sc = makeScenario({
      routePool: ["north", "valley"],
      routeMod: { caravanChance: 0.7, stormBlockChance: 0.3, stormRouteImmune: ["glacier"] }
    });
    const result = validateScenarioConfig(sc);
    expect(result.warnings.some(w => w.includes("暴雪免疫路线不在可用路线池中"))).toBeTruthy();
  });

  it("暴雪免疫路线在路线池中 → 无免疫警告", function() {
    const sc = makeScenario({
      routePool: ["north", "valley", "glacier"],
      routeMod: { caravanChance: 0.7, stormBlockChance: 0.3, stormRouteImmune: ["glacier"] }
    });
    const result = validateScenarioConfig(sc);
    const hasImmuneWarning = result.warnings.some(w => w.includes("暴雪免疫路线不在可用路线池中"));
    expect(hasImmuneWarning).toBe(false);
  });
});

// --- 剧本名称校验 ---
describe("自定义剧本校验 - 名称与综合", function() {
  function makeScenario(overrides) {
    return {
      name: "测试剧本",
      targetDays: 15,
      routePool: ["north", "ridge", "valley"],
      startResources: { wood: 0, med: 0, food: 0, rep: 0 },
      weatherTable: { clear: 0.5, wind: 0.3, storm: 0.2 },
      routeMod: { caravanChance: 0.7, stormBlockChance: 0.3 },
      eventWeightMul: { weather: 1, supply: 1, guide: 1, reputation: 1, random: 1 },
      eventTriggerChance: 0.75,
      win: { type: "days", label: "测试" },
      lose: { resources: true, fatigue: true },
      ...overrides
    };
  }

  it("剧本名称为空 → 错误", function() {
    const sc = makeScenario({ name: "" });
    const result = validateScenarioConfig(sc);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes("剧本名称不能为空"))).toBeTruthy();
  });

  it("剧本名称全是空格 → 错误", function() {
    const sc = makeScenario({ name: "   " });
    const result = validateScenarioConfig(sc);
    expect(result.isValid).toBe(false);
  });

  it("配置正常时 isValid 为 true", function() {
    const sc = makeScenario({});
    const result = validateScenarioConfig(sc);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("返回结果包含 errors, warnings, isValid 三个字段", function() {
    const sc = makeScenario({});
    const result = validateScenarioConfig(sc);
    expect(result.errors !== undefined).toBeTruthy();
    expect(result.warnings !== undefined).toBeTruthy();
    expect(result.isValid !== undefined).toBeTruthy();
    expect(Array.isArray(result.errors)).toBe(true);
    expect(Array.isArray(result.warnings)).toBe(true);
  });

  it("极端不合理配置同时产生多个错误和警告", function() {
    const sc = makeScenario({
      name: "",
      targetDays: 2,
      routePool: [],
      startResources: { wood: -30, med: -15, food: -35, rep: 0 },
      weatherTable: { clear: 0, wind: 0, storm: 0.95 },
      eventWeightMul: { weather: 0, supply: 0, guide: 0, reputation: 0, random: 0 },
      lose: { resources: false, fatigue: false }
    });
    const result = validateScenarioConfig(sc);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
    expect(result.warnings.length).toBeGreaterThan(1);
  });
});

// --- 自定义剧本存储 ---
describe("自定义剧本存储 loadCustomScenarios / saveCustomScenarios", function() {
  beforeEach(function() {
    localStorage.clear();
  });

  it("初始状态下自定义剧本为空", function() {
    const customs = loadCustomScenarios();
    expect(Object.keys(customs).length).toBe(0);
  });

  it("保存后可以读取", function() {
    const testSc = { id: "custom_test", name: "测试自定义剧本" };
    saveCustomScenarios({ custom_test: testSc });
    const customs = loadCustomScenarios();
    expect(customs.custom_test).toBeTruthy();
    expect(customs.custom_test.name).toBe("测试自定义剧本");
  });

  it("getAllScenarios 合并内置和自定义", function() {
    const testSc = { id: "custom_test", name: "测试自定义剧本" };
    saveCustomScenarios({ custom_test: testSc });
    const all = getAllScenarios();
    expect(all.standard).toBeTruthy();
    expect(all.custom_test).toBeTruthy();
  });

  it("getScenarioById 能获取到剧本", function() {
    expect(getScenarioById("standard")).toBeTruthy();
    expect(getScenarioById("nonexistent")).toBeUndefined();
  });
});

// ===== 运行测试 =====
let total = 0, pass = 0, fail = 0;
const startTime = Date.now();

console.log("🧪 高山驿站 · 单元测试\n");

for (const suite of testSuites) {
  console.log(`📋 ${suite.name}`);
  for (const test of suite.tests) {
    total++;
    try {
      test.fn();
      pass++;
      console.log(`  ✓ ${test.name}`);
    } catch (e) {
      fail++;
      console.log(`  ✗ ${test.name}`);
      console.log(`    ${e.message}`);
    }
  }
  console.log("");
}

const duration = Date.now() - startTime;
console.log("═══════════════════════════════════");
console.log(`总计: ${total}  通过: ${pass}  失败: ${fail}`);
console.log(`耗时: ${duration}ms`);
console.log("═══════════════════════════════════");

if (fail > 0) {
  process.exit(1);
}
