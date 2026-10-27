import { expect, test } from 'vite-plus/test';
import { projectLiveMusicRuntime } from '../../src/runtime/music/musicRuntimeInputs.ts';

test('MusicsのAP入力はMental状態とintervalがverifiedの場合だけ再生する', () => {
  const inputs = { maxAp: 20, apIncrement: 10, musicBeatPoint: 75 };

  expect(
    projectLiveMusicRuntime(inputs, 1, {
      mentalDown: { kind: 'unresolved' },
      increaseIntervalSeconds: { kind: 'unresolved' },
    }),
  ).toEqual({
    ap: { kind: 'unresolved', reason: 'mental-state-unverified' },
    musicBeatPoint: 75,
  });
  expect(
    projectLiveMusicRuntime(inputs, 0, {
      mentalDown: { kind: 'unresolved' },
      increaseIntervalSeconds: { kind: 'unresolved' },
    }),
  ).toEqual({
    ap: {
      kind: 'verified',
      frame: {
        state: { currentAp: 0, maxAp: 20, timerSeconds: 0 },
        gaugeDisplayValue: 0,
      },
    },
    musicBeatPoint: 75,
  });
  expect(
    projectLiveMusicRuntime(inputs, 1.001, {
      mentalDown: { kind: 'verified', value: false },
      increaseIntervalSeconds: { kind: 'verified', value: 1 },
    }).ap,
  ).toEqual({
    kind: 'verified',
    frame: {
      state: {
        currentAp: 1,
        maxAp: 20,
        timerSeconds: expect.closeTo(0.001, 5),
      },
      gaugeDisplayValue: 1,
    },
  });
});
