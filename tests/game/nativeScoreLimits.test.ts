import { expect, it } from 'vite-plus/test';
import { scoreMultipliers } from '../../src/master/scoreMultipliers.ts';
import { calculateLiveAddScoreMax } from '../../src/runtime/live/clientScoreInput.ts';
import { finalizeLiveSkillCost } from '../../src/runtime/skills/skillCostBuff.ts';

const ordinaryLimit = {
  additionalEnabled: false,
  bonusScoreValue: 0,
  voltageMultiplier: 0n,
  genesisActive: false,
  currentGenesisGauge: 0,
};

it('基本消費量が1以上のカードは、減少効果を重ねても最低1を消費する', () => {
  expect(finalizeLiveSkillCost(5, -20)).toBe(1);
  expect(finalizeLiveSkillCost(5, -2)).toBe(3);
  expect(finalizeLiveSkillCost(0, 0)).toBe(0);
});

it('100個までは2³¹−1で、101個から本家のマスター値で上限を増やす', () => {
  expect(calculateLiveAddScoreMax(100, scoreMultipliers, ordinaryLimit)).toBe(2_147_483_647n);
  expect(calculateLiveAddScoreMax(101, scoreMultipliers, ordinaryLimit)).toBe(2_168_958_484n);
  expect(calculateLiveAddScoreMax(10_000_000, scoreMultipliers, ordinaryLimit)).toBe(
    32_212_254_705_000n,
  );
});
