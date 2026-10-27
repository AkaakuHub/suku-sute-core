import { expect, test } from 'vite-plus/test';
import {
  activateLiveStopVoltageIncrease,
  advanceLiveStopVoltageIncreaseState,
  createLiveStopVoltageIncreaseState,
} from '../../src/runtime/skills/stopVoltageIncrease.ts';

test('StopVoltageIncreaseは再発動ごとの停止要求を保持して個別に期限切れする', () => {
  const first = activateLiveStopVoltageIncrease(
    createLiveStopVoltageIncreaseState(),
    effect('26001', 1, 1_000),
    0,
  );
  const repeated = activateLiveStopVoltageIncrease(first, effect('26002', 2, 2), 0);

  expect(repeated).toHaveLength(2);
  const oneExpired = advanceLiveStopVoltageIncreaseState(repeated, {
    currentTimeSeconds: 1,
    sectionChangeCount: 1,
    musicEnded: false,
  });
  expect(oneExpired).toEqual([
    {
      effectId: '26002',
      duration: { kind: 'sections', remainingChanges: 1 },
    },
  ]);
});

function effect(id: string, displayTimeType: number, displayTime: number) {
  return {
    id,
    actionType: 26,
    orderId: 1,
    details: [
      {
        id: `${id}0`,
        detailType: 'STOP_VOLTAGE_INCREASE_DISPLAY_TIME_TYPE',
        targetMood: 0,
        effectValue: displayTimeType,
        params: [],
      },
      {
        id: `${id}1`,
        detailType: 'STOP_VOLTAGE_INCREASE_DISPLAY_TIME',
        targetMood: 0,
        effectValue: displayTime,
        params: [],
      },
    ],
  };
}
