import { expect, test } from 'vite-plus/test';
import { finalizeLiveSkillCost } from '../../src/runtime/skills/skillCostBuff.ts';

test.each([
  { baseCost: 0, deltaAp: -3, expected: 0 },
  { baseCost: 0, deltaAp: 2.9, expected: 2 },
  { baseCost: 5, deltaAp: -50, expected: 1 },
  { baseCost: 5, deltaAp: -1.25, expected: 3 },
  { baseCost: 16_777_217, deltaAp: -16_777_216, expected: 1 },
  { baseCost: 16_777_217, deltaAp: 0, expected: 16_777_216 },
  { baseCost: 0, deltaAp: 3_000_000_000, expected: 2_147_483_647 },
  { baseCost: 0, deltaAp: Number.MAX_VALUE, expected: 2_147_483_647 },
  { baseCost: 20, deltaAp: 0.999_999_9, expected: 20 },
])(
  '通常コストはAPKの基本値変換・下限・整数変換に従う:$baseCost+$deltaAp',
  ({ baseCost, deltaAp, expected }) => {
    expect(finalizeLiveSkillCost(baseCost, deltaAp)).toBe(expected);
  },
);
