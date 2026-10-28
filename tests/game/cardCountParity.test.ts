import { expect, it } from 'vite-plus/test';
import { evaluateCondition } from '../../src/game/conditions/evaluate.ts';
import type { ConditionContext } from '../../src/game/conditions/model.ts';

const context: ConditionContext = {
  heatLevel: 0,
  mentalFraction: 1,
  moodValue: 0,
  staminaPercent: 100,
  weather: 0,
  partIndex: 0,
  partNumber: 1,
  cardCounts: { all: 6, draw: 3, discard: 0, excluded: 1 },
  tokenSeries: [],
  supportLevels: {},
  naturalStars: 0,
  genesisActive: false,
};

for (const zone of ['all', 'draw', 'discard', 'excluded'] as const) {
  it(`${zone}の0枚から上限100枚まで偶数と奇数を区別する`, () => {
    for (let count = 0; count <= 100; count++) {
      const state = { ...context, cardCounts: { ...context.cardCounts, [zone]: count } };
      expect(evaluateCondition({ kind: 'card-count-parity', zone, parity: 'even' }, state)).toBe(
        count % 2 === 0,
      );
      expect(evaluateCondition({ kind: 'card-count-parity', zone, parity: 'odd' }, state)).toBe(
        count % 2 === 1,
      );
    }
  });
}

it('開花中も指定した領域の枚数で判定する', () => {
  const state = { ...context, genesisActive: true };
  expect(evaluateCondition({ kind: 'card-count-parity', zone: 'all', parity: 'even' }, state)).toBe(
    true,
  );
  expect(
    evaluateCondition({ kind: 'card-count-parity', zone: 'draw', parity: 'even' }, state),
  ).toBe(false);
});
