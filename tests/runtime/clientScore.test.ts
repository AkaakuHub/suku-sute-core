import { expect, test } from 'vite-plus/test';
import { calculateLiveClientScore } from '../../src/runtime/live/clientScore.ts';

test('Live client scoreはappeal平均と全factorを乗算して通常回収上限を適用する', () => {
  const factorInputs: number[] = [];
  const maxInputs: number[] = [];
  const score = calculateLiveClientScore(
    {
      cards: [{ appealValue: 100 }, { appealValue: 200 }],
      collectNum: 3,
      heartRankMagnification: 2,
      isDisappearCollect: false,
      masteryLoveBonusEffect: 1.1,
      skillLoveBonusEffect: 1.2,
      currentGenesisGauge: 4,
      bonusScoreValue: 2,
      challengeBonusFactor: 1.25,
    },
    {
      valueToFactor: (value) => {
        factorInputs.push(value);
        return 0.5;
      },
      getAddScoreMax: (collectNum) => {
        maxInputs.push(collectNum);
        return 250_000_000n;
      },
    },
  );

  expect(factorInputs).toEqual([10]);
  expect(maxInputs).toEqual([3]);
  expect(score).toBe(250_000_000n);
});

test('Live client scoreは消滅回収へfloatの0.2を乗算しint maxを上限にする', () => {
  const score = calculateLiveClientScore(
    {
      cards: [{ appealValue: 10 }],
      collectNum: 2,
      heartRankMagnification: 1,
      isDisappearCollect: true,
      masteryLoveBonusEffect: 1,
      skillLoveBonusEffect: 1,
      currentGenesisGauge: 0,
      bonusScoreValue: 0,
      challengeBonusFactor: 1,
    },
    {
      valueToFactor: () => 0,
      getAddScoreMax: () => {
        throw new Error('GetAddScoreMax must not run');
      },
    },
  );
  expect(score).toBe(480_001n);
});

test('Live client scoreは計算結果が0以下なら0にする', () => {
  expect(
    calculateLiveClientScore(
      {
        cards: [{ appealValue: 10 }],
        collectNum: 1,
        heartRankMagnification: 1,
        isDisappearCollect: false,
        masteryLoveBonusEffect: 1,
        skillLoveBonusEffect: 1,
        currentGenesisGauge: 0,
        bonusScoreValue: 0,
        challengeBonusFactor: -1,
      },
      {
        valueToFactor: () => 0,
        getAddScoreMax: () => {
          throw new Error('GetAddScoreMax must not run');
        },
      },
    ),
  ).toBe(0n);
});
