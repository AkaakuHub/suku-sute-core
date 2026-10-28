import { expect, it } from 'vite-plus/test';
import { evaluateCondition } from '../../src/game/conditions/evaluate.ts';
import type { LiveConditionContext } from '../../src/runtime/live/conditionContext.ts';

const context: LiveConditionContext = {
  voltage: { currentVoltage: 0n, timerSeconds: 0 },
  voltageThresholds: [{ voltageLevel: 1, requiredVoltagePoint: 0n }],
  maximumVoltageLevel: 1,
  mental: { currentMental: 100, timerSeconds: 0, mentalDown: false },
  maximumMental: 100,
  moodValue: 0,
  currentSection: 0,
  feverSection: null,
  cardTotal: 6,
  deckCount: 3,
  graveyardCount: 0,
  exclusionCount: 1,
  tokenCardSeriesCount: () => 0,
  memberFanLevelTotal: () => 0,
  beatHeartValue: 0,
};

for (const zone of ['all', 'draw', 'discard', 'excluded'] as const) {
  it(`${zone}の0枚から上限100枚まで偶数と奇数を区別する`, () => {
    for (let count = 0; count <= 100; count++) {
      const field = {
        all: 'cardTotal',
        draw: 'deckCount',
        discard: 'graveyardCount',
        excluded: 'exclusionCount',
      } as const;
      const state = { ...context, [field[zone]]: count };
      expect(evaluateCondition({ kind: 'card-count-parity', zone, parity: 'even' }, state)).toBe(
        count % 2 === 0,
      );
      expect(evaluateCondition({ kind: 'card-count-parity', zone, parity: 'odd' }, state)).toBe(
        count % 2 === 1,
      );
    }
  });
}
