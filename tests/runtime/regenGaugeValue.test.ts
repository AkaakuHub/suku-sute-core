import { expect, test } from 'vite-plus/test';
import {
  calculateLiveRegenGaugeSkillValue,
  resolveLiveRegenGaugeObservation,
} from '../../src/runtime/skills/regenGaugeValue.ts';

test('継続回復の値はEffectPowerまでFloat32で保持し整数化しない', () => {
  expect(
    calculateLiveRegenGaugeSkillValue(10.5, { addValue: 1, multiplyFactor: 2, effectPower: 0.5 }),
  ).toBe(11.5);
});

test('Mentalは100で割合へ変換して現在の最大Mentalへ掛けた後に切り上げる', () => {
  const application = {
    actionType: 6 as const,
    gauge: 'mental' as const,
    calculationType: 1,
    value: 5,
  };
  expect(resolveLiveRegenGaugeObservation(application, 100)?.amount).toBe(5);
  expect(resolveLiveRegenGaugeObservation(application, 101)).toEqual({
    actionType: 5,
    gauge: 'mental',
    amount: 6,
  });
  expect(resolveLiveRegenGaugeObservation({ ...application, value: 0.5 }, 100)?.amount).toBe(1);
});

test('Voltageは正負の小数をobserverで切り上げAction10へ渡す', () => {
  const application = {
    actionType: 11 as const,
    gauge: 'voltage' as const,
    calculationType: 1,
    value: 10.5,
  };
  expect(resolveLiveRegenGaugeObservation(application, 100)).toEqual({
    actionType: 10,
    gauge: 'voltage',
    amount: 11,
  });
  expect(resolveLiveRegenGaugeObservation({ ...application, value: -10.5 }, 100)?.amount).toBe(-10);
});

test('計算種別1以外はobserverへ通知しない', () => {
  expect(
    resolveLiveRegenGaugeObservation(
      { actionType: 6, gauge: 'mental', calculationType: 2, value: 10 },
      100,
    ),
  ).toBeNull();
});
