import { expect, test } from 'vite-plus/test';
import {
  advanceLiveRegenGaugeClock,
  notifyLiveRegenGaugeBeatHeartCreated,
} from '../../src/runtime/skills/regenGaugeRuntime.ts';
import { createLiveRegenGaugeTiming } from '../../src/runtime/skills/regenGaugeTiming.ts';
import type { LiveRegenGaugeEffect } from '../../src/runtime/skills/regenGaugeSkill.ts';

function timed(registrationId: number, effectId = 'same-source'): LiveRegenGaugeEffect {
  return {
    registrationId,
    effectId,
    actionType: 11,
    gauge: 'voltage',
    calculationType: 1,
    value: 3,
    ...createLiveRegenGaugeTiming(1, 100, 1, 100),
  };
}
const clock = { deltaTimeSeconds: 0.1, sectionChangeCount: 0, musicEnded: false };

test('期限のフレームでも子処理には登録中の状態と減算前のタイマーを渡す', () => {
  const seen: number[] = [];
  const result = advanceLiveRegenGaugeClock(
    { regenGaugeEffects: [timed(1), timed(2)] },
    clock,
    (state, effect) => {
      seen.push(effect.registrationId);
      const current = state.regenGaugeEffects.find(
        (entry) => entry.registrationId === effect.registrationId,
      );
      expect(current?.interval).toEqual({
        kind: 'milliseconds',
        seconds: Math.fround(0.1),
        elapsedSeconds: Math.fround(0.1),
      });
      expect(current?.duration).toEqual({
        kind: 'milliseconds',
        seconds: Math.fround(0.1),
        elapsedSeconds: 0,
      });
      if (effect.registrationId === 1)
        expect(state.regenGaugeEffects[1]?.interval).toEqual({
          kind: 'milliseconds',
          seconds: Math.fround(0.1),
          elapsedSeconds: 0,
        });
      return state;
    },
  );
  expect(seen).toEqual([1, 2]);
  expect(result.regenGaugeEffects).toEqual([]);
});

test('子処理で元の登録を解除して同じスキルを再登録しても新しい登録を更新しない', () => {
  const result = advanceLiveRegenGaugeClock({ regenGaugeEffects: [timed(1)] }, clock, (state) => ({
    ...state,
    regenGaugeEffects: [timed(2)],
  }));
  expect(result.regenGaugeEffects).toEqual([timed(2)]);
});

test('Subjectが捕捉した後続callbackは解除後も一度だけ届き、解除した登録を復元しない', () => {
  const seen: number[] = [];
  const result = advanceLiveRegenGaugeClock(
    { regenGaugeEffects: [timed(1), timed(2)] },
    clock,
    (state, effect) => {
      seen.push(effect.registrationId);
      return effect.registrationId === 1 ? { ...state, regenGaugeEffects: [timed(3)] } : state;
    },
  );
  expect(seen).toEqual([1, 2]);
  expect(result.regenGaugeEffects).toEqual([timed(3)]);
});

test('Beat通知も登録ごとに回数を更新してから子処理を実行する', () => {
  const effect = { ...timed(1), ...createLiveRegenGaugeTiming(2, 1, 2, 2) };
  const result = notifyLiveRegenGaugeBeatHeartCreated(
    { regenGaugeEffects: [effect, { ...effect, registrationId: 2 }] },
    (state, delivered) => {
      expect(delivered.interval).toEqual({ kind: 'beat-heart', count: 1, progress: 0 });
      return delivered.registrationId === 1 ? { ...state, regenGaugeEffects: [timed(3)] } : state;
    },
  );
  expect(result.regenGaugeEffects).toEqual([timed(3)]);
});

test('Float32加算で6フレーム目に回復してから期限切れになる', () => {
  let state = { regenGaugeEffects: [timed(1)] };
  let pulses = 0;
  for (let index = 0; index < 6; index++) {
    state = advanceLiveRegenGaugeClock(state, { ...clock, deltaTimeSeconds: 1 / 60 }, (next) => {
      pulses++;
      return next;
    });
    expect(pulses).toBe(index === 5 ? 1 : 0);
  }
  expect(state.regenGaugeEffects).toEqual([]);
});

test('Beat回数はsigned32で周回しlongの間隔へ到達しない', () => {
  let pulses = 0;
  const result = notifyLiveRegenGaugeBeatHeartCreated(
    {
      regenGaugeEffects: [
        {
          ...timed(1),
          interval: { kind: 'beat-heart' as const, count: 2147483648, progress: 2147483647 },
        },
      ],
    },
    (state) => {
      pulses++;
      return state;
    },
  );
  expect(pulses).toBe(0);
  expect(result.regenGaugeEffects[0]?.interval).toEqual({
    kind: 'beat-heart',
    count: 2147483648,
    progress: -2147483648,
  });
});

test('実際の発動元metadataと子処理が追加した状態を型ごと維持する', () => {
  const initial = {
    regenGaugeEffects: [{ ...timed(1), sourceCardId: 'card' }],
    seen: [] as string[],
  };
  const result = advanceLiveRegenGaugeClock(initial, clock, (state, effect) => ({
    ...state,
    seen: [...state.seen, effect.sourceCardId],
  }));
  expect(result.seen).toEqual(['card']);
});
