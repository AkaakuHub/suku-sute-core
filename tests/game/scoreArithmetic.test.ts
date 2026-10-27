import { expect, it } from 'vite-plus/test';
import { calculateLiveClientScore } from '../../src/runtime/live/clientScore.ts';
import { liveValueToFactor } from '../../src/runtime/live/clientScoreInput.ts';

const input = {
  cards: [{ appealValue: 0.01 }],
  collectNum: 1,
  heartRankMagnification: 1,
  isDisappearCollect: false,
  masteryLoveBonusEffect: 1,
  skillLoveBonusEffect: 1,
  currentGenesisGauge: 0,
  bonusScoreValue: 0,
  challengeBonusFactor: 1,
};
const ports = {
  valueToFactor: liveValueToFactor,
  getAddScoreMax: () => 9223372036854775807n,
};

it('STAR増加100%を2倍にし、開花値4の追加8%も同じ単位で加算する', () => {
  expect(calculateLiveClientScore({ ...input, bonusScoreValue: 100 }, ports)).toBe(2400n);
  expect(calculateLiveClientScore({ ...input, currentGenesisGauge: 4 }, ports)).toBe(1296n);
  expect(
    calculateLiveClientScore({ ...input, bonusScoreValue: 100, currentGenesisGauge: 4 }, ports),
  ).toBe(2496n);
});
it('基礎アピールと最終得点をそれぞれ切り上げる', () => {
  expect(
    calculateLiveClientScore(
      { ...input, cards: [{ appealValue: 1.2 / 120000 }], heartRankMagnification: 1.25 },
      ports,
    ),
  ).toBe(3n);
});
it('開花値の1.5乗はsigned32bit変換後にfloatへ戻し、無制限に増やさない', () => {
  expect(calculateLiveClientScore({ ...input, currentGenesisGauge: 2147483647 }, ports)).toBe(
    25769804976n,
  );
  expect(calculateLiveClientScore({ ...input, currentGenesisGauge: 2000000000 }, ports)).toBe(
    25769804976n,
  );
});
it('通常回収と消滅回収の上限を得点計算の最後に適用する', () => {
  const huge = { ...input, currentGenesisGauge: 2147483647 };
  expect(calculateLiveClientScore(huge, { ...ports, getAddScoreMax: () => 1000n })).toBe(1000n);
  expect(calculateLiveClientScore({ ...huge, isDisappearCollect: true }, ports)).toBe(2147483647n);
});
