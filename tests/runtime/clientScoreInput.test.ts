import { expect, test } from 'vite-plus/test';
import {
  calculateLiveAddScoreMax,
  calculateLiveCardAppealValue,
  calculateLiveMasteryLoveBonusEffect,
  liveValueToFactor,
} from '../../src/runtime/live/clientScoreInput.ts';

const ordinaryLimit = {
  additionalEnabled: false,
  bonusScoreValue: 0,
  voltageMultiplier: 0n,
  genesisActive: false,
  currentGenesisGauge: 0,
};

test('Card appealはmusic type一致attributeだけ1.5倍にしtimeline秒数で正規化する', () => {
  expect(
    calculateLiveCardAppealValue({ smile: 12_000, pure: 10_000, cool: 8_000 }, 1, 120),
  ).toBeCloseTo(0.3, 7);
  expect(calculateLiveCardAppealValue({ smile: 12_000, pure: 10_000, cool: 8_000 }, 0, 120)).toBe(
    0.375,
  );
});

test('保存user cardのLOVE correctionをMasteryBonusEffectModelのfactorへ変換する', () => {
  expect(calculateLiveMasteryLoveBonusEffect(0)).toBe(1);
  expect(calculateLiveMasteryLoveBonusEffect(130)).toBe(1.013);
  expect(liveValueToFactor(250)).toBe(2.5);
});

test('Heart数区間のbaseと1個ごとのadditional倍率から通常回収score上限を算出する', () => {
  const multipliers = [
    {
      minimumHeartCount: 1,
      maximumHeartCount: 10,
      baseMultiplier: 10_000n,
      additionalMultiplier: 500n,
    },
  ];
  expect(calculateLiveAddScoreMax(1, multipliers, ordinaryLimit)).toBe(2_147_483_647n);
  expect(calculateLiveAddScoreMax(3, multipliers, ordinaryLimit)).toBe(2_362_232_012n);
  expect(calculateLiveAddScoreMax(11, multipliers, ordinaryLimit)).toBe(2_147_483_647n);
});
