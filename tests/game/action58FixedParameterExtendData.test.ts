import { expect, it } from 'vite-plus/test';
import { createFixedParameterExtendEffect } from '../../src/game/actionTypeEffects/fixedParameterExtend.ts';

it('ActionType58は参照実装の対象・計算・期限enumをEffectへ変換する', () => {
  expect(
    createFixedParameterExtendEffect({
      skillEffectId: 58n,
      deactivationKey: 'fixed-param',
      details: [
        { id: 1n, detailType: 'FIXED_PARAM_TARGET', value: 3n },
        { id: 2n, detailType: 'FIXED_PARAM_CALC_TYPE', value: 2n },
        { id: 3n, detailType: 'FIXED_PARAM_VALUE', value: (1n << 53n) + 2n },
        { id: 4n, detailType: 'FIXED_PARAM_DURATION_TYPE', value: 2n },
        { id: 5n, detailType: 'FIXED_PARAM_DURATION_VALUE', value: (1n << 53n) + 4n },
      ],
    }),
  ).toEqual({
    kind: 'fixed-parameter-extend',
    target: 'mental',
    calculation: 'multiply',
    value: (1n << 53n) + 2n,
    duration: { kind: 'sections', value: (1n << 53n) + 4n },
    deactivationKey: 'fixed-param',
  });
});

it('ActionType58はFullEnd期限をstageへ、未指定時は参照実装既定値へ変換する', () => {
  expect(createFixedParameterExtendEffect({ skillEffectId: 58n, details: [] })).toEqual({
    kind: 'fixed-parameter-extend',
    target: 'ap',
    calculation: 'add',
    value: 0n,
    duration: { kind: 'milliseconds', value: 0n },
  });
  expect(
    createFixedParameterExtendEffect({
      skillEffectId: 58n,
      details: [{ id: 1n, detailType: 'FIXED_PARAM_DURATION_TYPE', value: 3n }],
    }).duration,
  ).toEqual({ kind: 'stage' });
});
