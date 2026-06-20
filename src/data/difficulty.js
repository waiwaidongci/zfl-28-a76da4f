'use strict';
export const DIFF = {
  safe:   { label: "稳妥", cls: "safe",   wood: 28, med: 12, food: 32, stormProb: 0.15, fatigueBase: 1, fatigueStorm: 1, fatigueMul: 0.8 },
  normal: { label: "标准", cls: "normal", wood: 20, med: 8,  food: 24, stormProb: 0.24, fatigueBase: 1, fatigueStorm: 2, fatigueMul: 1.0 },
  hard:   { label: "险境", cls: "hard",   wood: 14, med: 5,  food: 16, stormProb: 0.36, fatigueBase: 2, fatigueStorm: 3, fatigueMul: 1.3 }
};
