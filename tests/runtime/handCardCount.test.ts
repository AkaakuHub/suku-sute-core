import { createLiveTokenCardDeckState } from '../../src/runtime/cards/tokenCardDeck.ts';
import { expect, test } from 'vite-plus/test';
import type { LiveHandCardCountEffect } from '../../src/runtime/cards/deckActionTypes.ts';
import {
  activateLiveHandCardCountEffect,
  activateLiveHandCardMaxEffect,
  deactivateLiveHandCardCountEffect,
  advanceLiveHandCardCountState,
  createLiveHandCardCountState,
  liveHandCardCount,
} from '../../src/runtime/skills/handCardCount.ts';

test('複数効果を加算してruntimeの手札範囲3〜8へ制限する', () => {
  const increased = activateLiveHandCardCountEffect(
    createLiveHandCardCountState(),
    createLiveTokenCardDeckState(5),
    1,
    effect('increase', { kind: 'full-end' }),
    5,
  );
  const decreased = activateLiveHandCardCountEffect(
    increased.state,
    increased.tokenCardDeck,
    1,
    effect('decrease', { kind: 'full-end' }),
    -12,
  );

  expect(liveHandCardCount(increased.tokenCardDeck)).toBe(8);
  expect(liveHandCardCount(decreased.tokenCardDeck)).toBe(3);
});

test('期間終了時に対象効果だけを除いて手札枚数を復元する', () => {
  const state = activateLiveHandCardCountEffect(
    createLiveHandCardCountState(),
    createLiveTokenCardDeckState(5),
    1,
    effect('timed', { kind: 'milliseconds', expiresAtSeconds: 2 }),
    2,
  );
  const active = advanceLiveHandCardCountState(state.state, state.tokenCardDeck, {
    currentTimeSeconds: 1,
    sectionChangeCount: 0,
    musicEnded: false,
  });
  const ended = advanceLiveHandCardCountState(active.state, active.tokenCardDeck, {
    currentTimeSeconds: 2,
    sectionChangeCount: 0,
    musicEnded: false,
  });

  expect(liveHandCardCount(active.tokenCardDeck)).toBe(7);
  expect(liveHandCardCount(ended.tokenCardDeck)).toBe(5);
});

function effect(
  effectId: string,
  duration: LiveHandCardCountEffect['duration'],
): LiveHandCardCountEffect {
  return { effectId, amount: 0, duration };
}

test('初期枚数から再計算せず、現在の目標へ効果を加える', () => {
  const deck = {
    ...createLiveTokenCardDeckState(5),
    handTargetCounts: { current: 2, main: 5, sub: 5 },
  };
  const active = activateLiveHandCardCountEffect(
    createLiveHandCardCountState(),
    deck,
    1,
    effect('count', { kind: 'full-end' }),
    2,
  );
  expect(active.tokenCardDeck.handTargetCounts).toEqual({ current: 4, main: 5, sub: 5 });
});

test('同じ効果IDを持つ別カードを解除しない', () => {
  const first = activateLiveHandCardCountEffect(
    createLiveHandCardCountState(),
    createLiveTokenCardDeckState(5),
    1,
    effect('count', { kind: 'full-end' }),
    -1,
  );
  const second = activateLiveHandCardCountEffect(
    first.state,
    first.tokenCardDeck,
    2,
    effect('count', { kind: 'full-end' }),
    -2,
  );
  const removed = deactivateLiveHandCardCountEffect(second.state, second.tokenCardDeck, 1, 'count');
  expect(removed.state.effects.map((entry) => entry.cardInstanceId)).toEqual([2]);
  expect(removed.tokenCardDeck.handTargetCounts.current).toBe(3);
});

test('手札最大化中の枚数変更は保存した目標も更新し、解除後にその目標へ戻す', () => {
  const initial = activateLiveHandCardCountEffect(
    createLiveHandCardCountState(),
    createLiveTokenCardDeckState(5),
    1,
    effect('increase', { kind: 'full-end' }),
    4,
  );
  const maximum = activateLiveHandCardMaxEffect(initial.state, initial.tokenCardDeck, 2, 'max', {
    kind: 'full-end',
  });
  expect(maximum.tokenCardDeck.handTargetCounts.current).toBe(8);
  const decreased = activateLiveHandCardCountEffect(
    maximum.state,
    maximum.tokenCardDeck,
    3,
    effect('decrease', { kind: 'full-end' }),
    -2,
  );
  expect(decreased.tokenCardDeck.handTargetCounts.current).toBe(6);
  expect(decreased.tokenCardDeck.handMaxCardSkillInfo?.targetHandCount).toBe(7);
  const reset = deactivateLiveHandCardCountEffect(
    decreased.state,
    decreased.tokenCardDeck,
    3,
    'decrease',
  );
  expect(reset.tokenCardDeck.handTargetCounts.current).toBe(8);
  expect(reset.tokenCardDeck.handMaxCardSkillInfo?.targetHandCount).toBe(9);
  const restored = deactivateLiveHandCardCountEffect(reset.state, reset.tokenCardDeck, 2, 'max');
  expect(restored.tokenCardDeck.handTargetCounts.current).toBe(9);
  expect(restored.tokenCardDeck.handMaxCardSkillInfo).toBeNull();
  expect(restored.tokenCardDeck.maxHandSkillActiveCount).toBe(0);
});

test('重複した最大化は各発動時の現在目標を保存し、最後の解除で保存値へ戻す', () => {
  const first = activateLiveHandCardMaxEffect(
    createLiveHandCardCountState(),
    createLiveTokenCardDeckState(5),
    1,
    'first',
    { kind: 'full-end' },
  );
  const second = activateLiveHandCardMaxEffect(first.state, first.tokenCardDeck, 2, 'second', {
    kind: 'full-end',
  });
  const remaining = deactivateLiveHandCardCountEffect(
    second.state,
    second.tokenCardDeck,
    1,
    'first',
  );
  expect(remaining.tokenCardDeck.maxHandSkillActiveCount).toBe(1);
  const last = deactivateLiveHandCardCountEffect(
    remaining.state,
    remaining.tokenCardDeck,
    2,
    'second',
  );
  expect(last.tokenCardDeck.handTargetCounts.current).toBe(8);
});
