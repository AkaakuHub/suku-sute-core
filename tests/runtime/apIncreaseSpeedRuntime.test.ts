import { expect, test } from 'vite-plus/test';
import {
  advanceLiveApIncreaseSpeedState,
  changeLiveApIncreaseSpeedEffects,
  deactivateLiveApIncreaseSpeedEffects,
} from '../../src/runtime/skills/apIncreaseSpeedRuntime.ts';
import { apSpeedRuntime } from './support/apIncreaseSpeed.ts';

const effects = [0.15, 0.7].map((factor) => ({
  effectId: '21',
  deactivationKey: 'hand',
  calculation: { kind: 'multiply' as const, factor: Math.fround(factor) },
  duration: { kind: 'milliseconds' as const, remainingSeconds: 0.5 },
}));

test('同時に切れるAP速度も1件ずつ解除してFloat32でtimerを補正する', () => {
  const initial = apSpeedRuntime(effects);
  const next = advanceLiveApIncreaseSpeedState(
    initial,
    { deltaTimeSeconds: 0.5, sectionChangeCount: 0, musicEnded: false },
    1,
  );
  expect(next.apIncreaseSpeedEffects).toEqual([]);
  expect(next.ap).toEqual({ ...initial.ap, timerSeconds: 3.000000238418579 });
});

test('同じ解除キーを持つAP速度も各解除の前後でtimerを補正する', () => {
  const initial = apSpeedRuntime(effects);
  const next = deactivateLiveApIncreaseSpeedEffects(initial, { deactivationKey: 'hand' }, 1);
  expect(next.apIncreaseSpeedEffects).toEqual([]);
  expect(next.ap.timerSeconds).toBe(3.000000238418579);
});

test('期限を進めるだけならtimerの値を変更しない', () => {
  const initial = apSpeedRuntime(effects);
  const next = advanceLiveApIncreaseSpeedState(
    initial,
    { deltaTimeSeconds: 0.1, sectionChangeCount: 0, musicEnded: false },
    1,
  );
  expect(next.ap).toBe(initial.ap);
  expect(next.apIncreaseSpeedEffects[0]?.duration).toEqual({
    kind: 'milliseconds',
    remainingSeconds: Math.fround(0.4),
  });
});

test('追加時も同じAP状態の変更処理でtimerを補正する', () => {
  const initial = apSpeedRuntime([]);
  const next = changeLiveApIncreaseSpeedEffects(initial, effects.slice(1), 1);
  expect(next.ap.timerSeconds).toBe(0.21000000834465027);
  expect(next.ap.currentAp).toBe(initial.ap.currentAp);
  expect(next.ap.maxAp).toBe(initial.ap.maxAp);
});

test('EndEffectの未登録状態は曲終了の個別解除でも除去しない', () => {
  const effect = {
    effectId: 'zero',
    deactivationKey: null,
    calculation: { kind: 'add' as const, milliseconds: 0 },
    duration: null,
  };
  const initial = apSpeedRuntime([effect]);
  expect(
    advanceLiveApIncreaseSpeedState(
      initial,
      { deltaTimeSeconds: 1, sectionChangeCount: 1, musicEnded: true },
      1,
    ),
  ).toBe(initial);
});
