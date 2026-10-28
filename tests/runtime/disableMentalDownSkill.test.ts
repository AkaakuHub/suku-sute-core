import { expect, test } from 'vite-plus/test';
import {
  activateLiveDisableMentalDownEffect,
  advanceLiveDisableMentalDownState,
  createLiveDisableMentalDownEffect,
  createLiveDisableMentalDownState,
} from '../../src/runtime/skills/disableMentalDownSkill.ts';

const effect = {
  id: '34',
  actionType: 34,
  orderId: 1,
  details: [
    {
      id: '1',
      detailType: 'DISABLE_MENTAL_DOWN_DISPLAY_TIME_TYPE',
      targetMood: 0,
      effectValue: 1,
      params: [],
    },
    {
      id: '2',
      detailType: 'DISABLE_MENTAL_DOWN_DISPLAY_TIME',
      targetMood: 0,
      effectValue: 5_000,
      params: [],
    },
  ],
} as const;

test('DisableMentalDownをmillisecond期限で開始して終了する', () => {
  const active = activateLiveDisableMentalDownEffect(
    createLiveDisableMentalDownState(),
    createLiveDisableMentalDownEffect(effect),
  );

  expect(
    advanceLiveDisableMentalDownState(active, {
      deltaTimeSeconds: 4.999,
      sectionChangeCount: 0,
      musicEnded: false,
    }).effects,
  ).toHaveLength(1);
  expect(
    advanceLiveDisableMentalDownState(active, {
      deltaTimeSeconds: 5,
      sectionChangeCount: 0,
      musicEnded: false,
    }).effects,
  ).toHaveLength(0);
});

test('DisableMentalDownのdetail構成をexactly onceで要求する', () => {
  expect(() =>
    createLiveDisableMentalDownEffect({
      ...effect,
      details: [effect.details[0], effect.details[0]],
    }),
  ).toThrow('Live DisableMentalDown skill effect details differ');
});

test('同じDisableMentalDownの再発動を独立した期限として保持する', () => {
  const first = activateLiveDisableMentalDownEffect(
    createLiveDisableMentalDownState(),
    createLiveDisableMentalDownEffect(effect),
  );
  const repeated = activateLiveDisableMentalDownEffect(
    advanceLiveDisableMentalDownState(first, {
      deltaTimeSeconds: 2,
      sectionChangeCount: 0,
      musicEnded: false,
    }),
    createLiveDisableMentalDownEffect(effect),
  );

  expect(
    advanceLiveDisableMentalDownState(repeated, {
      deltaTimeSeconds: 3,
      sectionChangeCount: 0,
      musicEnded: false,
    }).effects,
  ).toHaveLength(1);
});
