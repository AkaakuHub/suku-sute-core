import { expect, it } from 'vite-plus/test';
import { createVoltageLevelEffect } from '../../src/game/actionTypeEffects/voltageLevel.ts';

it('ActionType37はlong値をfloat32化して直接設定するEffectを生成する', () => {
  const effect = createVoltageLevelEffect({
    skillEffectId: 37n,
    details: [
      {
        id: 1n,
        detailType: 'CHANGE_VOLTAGE_NUM',
        value: (1n << 53n) + 1n,
      },
    ],
  });

  expect(effect).toEqual({ kind: 'voltage-set', amount: Math.fround(2 ** 53) });
});
