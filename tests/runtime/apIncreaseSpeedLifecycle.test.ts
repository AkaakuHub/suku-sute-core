import { expect, test } from 'vite-plus/test';
import {
  activateLiveApIncreaseSpeed,
  deactivateLiveApIncreaseSpeedEffects,
  advanceLiveApIncreaseSpeedState,
} from '../../src/runtime/skills/apIncreaseSpeed.ts';
import type { LiveApIncreaseSpeedChange } from '../../src/runtime/skills/apIncreaseSpeedEffect.ts';

const effect: LiveApIncreaseSpeedChange = {
  calculationType: 2,
  num: 7000n,
  bonusMoodTarget: 0,
  bonusMoodValue: 0n,
  displayTimeType: 1n,
  displayTime: 500n,
  deactivationKey: 'hand',
};

function input(events: string[], absorbed: boolean) {
  return {
    effectId: '21',
    currentMoodValue: 0,
    currentIncreaseIntervalMilliseconds: 1000,
    power: { addValue: 0, multiplyFactor: 1, effectPower: 1 },
    applySkillBoost: (value: number) => {
      events.push('boost');
      return value;
    },
    absorbSkillEffect: (amount: number) => {
      events.push(`absorb:${amount}`);
      return { absorbed };
    },
  };
}

test('ゼロ通知も吸収を判定し非吸収なら期限を登録せずBuffを保持する', () => {
  const events: string[] = [];
  const activated = activateLiveApIncreaseSpeed(
    [],
    { ...effect, num: 10000n, displayTimeType: 99n },
    input(events, false),
  );
  expect(events).toEqual(['absorb:0']);
  expect(activated.effectAmount).toBe(0);
  expect(activated.state).toEqual([
    {
      effectId: '21',
      deactivationKey: null,
      calculation: { kind: 'multiply', factor: 1 },
      duration: null,
    },
  ]);
  expect(
    advanceLiveApIncreaseSpeedState(activated.state, {
      deltaTimeSeconds: 5,
      sectionChangeCount: 3,
      musicEnded: false,
    }),
  ).toEqual(activated.state);
});

test('吸収された速度変更では期限種別を評価せず状態を登録しない', () => {
  const events: string[] = [];
  const activated = activateLiveApIncreaseSpeed(
    [],
    { ...effect, displayTimeType: 99n },
    input(events, true),
  );
  expect(events).toEqual(['boost', 'absorb:31']);
  expect(activated.state).toEqual([]);
  expect(activated.effectAmount).toBe(0);
});

test('区間0の指定は補正と吸収より前に拒否する', () => {
  const events: string[] = [];
  expect(() =>
    activateLiveApIncreaseSpeed(
      [],
      { ...effect, displayTimeType: 2n, displayTime: 0n },
      input(events, true),
    ),
  ).toThrow('display time is invalid');
  expect(events).toEqual([]);
});

test('負の通知は吸収せず通常の期限を登録する', () => {
  const events: string[] = [];
  const activated = activateLiveApIncreaseSpeed(
    [],
    { ...effect, num: 11000n },
    input(events, true),
  );
  expect(events).toEqual([]);
  expect(activated.effectAmount).toBeLessThan(0);
  expect(activated.state[0]?.duration).toEqual({ kind: 'milliseconds', remainingSeconds: 0.5 });
});

test('解除は期限登録のある状態だけを対象とし同じ効果IDのゼロBuffを残す', () => {
  const regular = activateLiveApIncreaseSpeed([], effect, input([], false));
  const zero = activateLiveApIncreaseSpeed(
    regular.state,
    { ...effect, num: 10000n },
    input([], false),
  );
  expect(deactivateLiveApIncreaseSpeedEffects(zero.state, { effectId: '21' })).toEqual(
    zero.state.slice(1),
  );
  expect(deactivateLiveApIncreaseSpeedEffects(zero.state, { deactivationKey: 'hand' })).toEqual(
    zero.state.slice(1),
  );
});

test('非ゼロBuffでも通知がFloat32のゼロになる場合は期限を登録しない', () => {
  const events: string[] = [];
  const options = input(events, false);
  const activated = activateLiveApIncreaseSpeed(
    [],
    { ...effect, calculationType: 1, num: 1n },
    {
      ...options,
      power: { ...options.power, multiplyFactor: 2 ** -149 },
    },
  );
  expect(events).toEqual(['boost', 'absorb:0']);
  expect(activated.calculation).toEqual({ kind: 'add', milliseconds: 2 ** -149 });
  expect(activated.state[0]?.duration).toBeNull();
});
