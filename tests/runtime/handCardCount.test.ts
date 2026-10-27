import { expect, test } from 'vite-plus/test';
import type { LiveHandCardCountEffect } from '../../src/runtime/cards/deckActionTypes.ts';
import {
  activateLiveHandCardCountEffect,
  advanceLiveHandCardCountState,
  createLiveHandCardCountState,
  liveHandCardCount,
} from '../../src/runtime/skills/handCardCount.ts';

test('複数効果を加算してruntimeの手札範囲3〜8へ制限する', () => {
  const increased = activateLiveHandCardCountEffect(
    createLiveHandCardCountState(),
    effect('increase', { kind: 'full-end' }),
    5,
  );
  const decreased = activateLiveHandCardCountEffect(
    increased,
    effect('decrease', { kind: 'full-end' }),
    -12,
  );

  expect(liveHandCardCount(increased)).toBe(8);
  expect(liveHandCardCount(decreased)).toBe(3);
});

test('期間終了時に対象効果だけを除いて手札枚数を復元する', () => {
  const state = activateLiveHandCardCountEffect(
    createLiveHandCardCountState(),
    effect('timed', { kind: 'milliseconds', expiresAtSeconds: 2 }),
    2,
  );
  const active = advanceLiveHandCardCountState(state, {
    currentTimeSeconds: 1,
    sectionChangeCount: 0,
    musicEnded: false,
  });
  const ended = advanceLiveHandCardCountState(active, {
    currentTimeSeconds: 2,
    sectionChangeCount: 0,
    musicEnded: false,
  });

  expect(liveHandCardCount(active)).toBe(7);
  expect(liveHandCardCount(ended)).toBe(5);
});

function effect(
  effectId: string,
  duration: LiveHandCardCountEffect['duration'],
): LiveHandCardCountEffect {
  return { effectId, amount: 0, duration };
}
