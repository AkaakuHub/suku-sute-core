import { expect, it } from 'vite-plus/test';
import { createInfinityGaugeEffect } from '../../src/game/actionTypeEffects/infinityGauge.ts';

it('ActionType39はlong詳細値をゲージ・期限へ変換する', () => {
  expect(
    createInfinityGaugeEffect({
      skillEffectId: 39n,
      invocationType: 0x388,
      deactivationKey: 'infinity',
      details: [
        { id: 1n, detailType: 'INFINITY_GAUGE_TYPE', value: 3n },
        { id: 2n, detailType: 'INFINITY_GAUGE_DISPLAY_TIME_TYPE', value: 2n },
        { id: 3n, detailType: 'INFINITY_GAUGE_DISPLAY_TIME', value: (1n << 53n) + 7n },
      ],
    }),
  ).toEqual({
    kind: 'infinity-gauge',
    gauge: 'mental',
    duration: { kind: 'sections', value: (1n << 53n) + 7n },
    invocationType: 0x388,
    deactivationKey: 'infinity',
  });
});

it('ActionType39の既定値とFullEnd期限を反映する', () => {
  expect(createInfinityGaugeEffect({ skillEffectId: 39n, details: [] })).toEqual({
    kind: 'infinity-gauge',
    gauge: 'ap',
    duration: { kind: 'milliseconds', value: 0 },
  });
  const fullEnd = createInfinityGaugeEffect({
    skillEffectId: 39n,
    details: [{ id: 1n, detailType: 'INFINITY_GAUGE_DISPLAY_TIME_TYPE', value: 3n }],
  });
  expect(fullEnd).toMatchObject({ duration: { kind: 'stage', value: 0 } });
});

it('ActionType39のミリ秒longをfloat32へ直接変換する', () => {
  const longValue = (1n << 54n) + (1n << 30n) + 1n;
  expect(
    createInfinityGaugeEffect({
      skillEffectId: 39n,
      details: [{ id: 1n, detailType: 'INFINITY_GAUGE_DISPLAY_TIME', value: longValue }],
    }),
  ).toMatchObject({ duration: { kind: 'milliseconds', value: 2 ** 54 + 2 ** 31 } });
});
