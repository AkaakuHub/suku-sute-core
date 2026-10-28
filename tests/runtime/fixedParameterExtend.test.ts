import { expect, test } from 'vite-plus/test';
import {
  activateLiveFixedParameterExtend,
  advanceLiveFixedParameterExtendState,
  createLiveFixedParameterExtendState,
  deactivateLiveFixedParameterExtend,
  resolveLiveFixedMaximumAp,
  resolveLiveFixedMaximumMental,
  resolveLiveFixedMaximumVoltageLevel,
  resolveLiveFixedParameterValue,
} from '../../src/runtime/skills/fixedParameterExtend.ts';

test('登録順に加算、倍率、固定を適用しruntimeと同じfloat32切り上げを行う', () => {
  const state = [
    active('1', 1, 1, 3),
    active('2', 1, 2, 3_333),
    active('3', 1, 3, 7),
    active('4', 1, 1, 2),
  ] as const;

  expect(resolveLiveFixedParameterValue(state, 1, 10)).toBe(9);
});

test('AP、Voltage、Mentalをruntimeの範囲へ制限する', () => {
  const state = [
    active('1', 1, 1, 999),
    active('2', 2, 1, -999),
    active('3', 3, 2, 30_000),
  ] as const;

  expect(resolveLiveFixedMaximumAp(state, 10)).toBe(100);
  expect(resolveLiveFixedMaximumVoltageLevel(state, 100, 1_000)).toBe(1);
  expect(resolveLiveFixedMaximumMental(state, 100)).toBe(400);
  expect(resolveLiveFixedMaximumMental(state, 100, 4)).toBe(250);
});

test('固定型以外だけSkillBoostを適用して期間終了と個別解除を処理する', () => {
  const boosted: number[] = [];
  let state = activateLiveFixedParameterExtend(
    createLiveFixedParameterExtendState(),
    effect('10', 1, 1, 5, 1, 1_000),
    {
      currentTimeSeconds: 2,
      applySkillBoost: (value) => {
        boosted.push(value);
        return Math.fround(value * 1.5);
      },
    },
  );
  state = activateLiveFixedParameterExtend(state, effect('20', 2, 3, 8, 2, 2), {
    currentTimeSeconds: 2,
    applySkillBoost: (value) => {
      boosted.push(value);
      return value;
    },
  });

  expect(boosted).toEqual([5]);
  expect(state.map(({ value }) => value)).toEqual([8, 8]);
  state = advanceLiveFixedParameterExtendState(state, {
    deltaTimeSeconds: 3,
    sectionChangeCount: 1,
    musicEnded: false,
  });
  expect(state.map(({ effectId }) => effectId)).toEqual(['20']);
  expect(
    advanceLiveFixedParameterExtendState(state, {
      deltaTimeSeconds: 3,
      sectionChangeCount: 0,
      musicEnded: false,
    }),
  ).toHaveLength(1);
  expect(deactivateLiveFixedParameterExtend(state, '20')).toEqual([]);
});

function active(effectId: string, target: 1 | 2 | 3, calculation: 1 | 2 | 3, value: number) {
  return {
    effectId,
    target,
    calculation,
    value,
    duration: { kind: 'full-end' } as const,
  };
}

function effect(
  id: string,
  target: number,
  calculation: number,
  value: number,
  durationType: number,
  durationValue: number,
) {
  return {
    id,
    actionType: 58,
    orderId: 1,
    details: [
      detail(`${id}0`, 'FIXED_PARAM_TARGET', target),
      detail(`${id}1`, 'FIXED_PARAM_CALC_TYPE', calculation),
      detail(`${id}2`, 'FIXED_PARAM_VALUE', value),
      detail(`${id}3`, 'FIXED_PARAM_DURATION_TYPE', durationType),
      detail(`${id}4`, 'FIXED_PARAM_DURATION_VALUE', durationValue),
    ],
  };
}

function detail(id: string, detailType: string, effectValue: number) {
  return { id, detailType, targetMood: 0, effectValue, params: [] };
}
