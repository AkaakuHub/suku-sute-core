import { createLiveDeckBoardState } from '../../src/runtime/cards/deckBoardState.ts';
import { createLiveDeckActionQueueState } from '../../src/runtime/cards/deckActionQueue.ts';
import { flushLiveDeckActions } from '../../src/runtime/cards/deckActionQueue.ts';
import { notifyLiveHandCardCountReset } from '../../src/runtime/cards/handCardCountReset.ts';
import type { LiveTokenCardDeckState } from '../../src/runtime/cards/tokenCardDeck.ts';
import { createLiveTokenCardDeckState } from '../../src/runtime/cards/tokenCardDeck.ts';
import { addLiveHandCardCount } from '../../src/runtime/cards/handCardCountAdd.ts';
import { createLiveDeckHandsState } from '../../src/runtime/cards/liveHand.ts';
import { createLiveDeckDrawContextState } from '../../src/runtime/cards/cardDraw.ts';
import type { LiveHandCardCountState } from '../../src/runtime/skills/handCardCount.ts';
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

function activateAndFlushCount(
  state: LiveHandCardCountState,
  tokenCardDeck: LiveTokenCardDeckState,
  cardInstanceId: number,
  effect: LiveHandCardCountEffect,
  amount: number,
) {
  const pending = activateLiveHandCardCountEffect(
    state,
    tokenCardDeck,
    createLiveDeckActionQueueState(),
    cardInstanceId,
    effect,
    amount,
    null,
  );
  const runtime = flushLiveDeckActions(
    {
      tokenCardDeck: pending.tokenCardDeck,
      deckActions: pending.deckActions,
      deckBoard: createLiveDeckBoardState(
        Array.from({ length: 10 }, (_, index) => index + 1),
        [1, 2, 3, 4, 5],
      ),
      liveHands: createLiveDeckHandsState([1, 2, 3, 4, 5]),
      deckDrawContext: createLiveDeckDrawContextState(),
    },
    (current) => current,
    {
      addHandCardCount: (current, delta) => addLiveHandCardCount(current, delta, (ready) => ready),
    },
  );
  return { ...pending, tokenCardDeck: runtime.tokenCardDeck, deckActions: runtime.deckActions };
}

test('複数効果を加算してruntimeの手札範囲3〜8へ制限する', () => {
  const increased = activateAndFlushCount(
    createLiveHandCardCountState(),
    createLiveTokenCardDeckState(5),
    1,
    effect('increase', { kind: 'full-end' }),
    5,
  );
  const decreased = activateAndFlushCount(
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
  const state = activateAndFlushCount(
    createLiveHandCardCountState(),
    createLiveTokenCardDeckState(5),
    1,
    effect('timed', { kind: 'milliseconds', remainingSeconds: 2 }),
    2,
  );
  const active = advanceLiveHandCardCountState(state.state, state.tokenCardDeck, {
    deltaTimeSeconds: 1,
    sectionChangeCount: 0,
    musicEnded: false,
  });
  const ended = advanceLiveHandCardCountState(active.state, active.tokenCardDeck, {
    deltaTimeSeconds: 1,
    sectionChangeCount: 0,
    musicEnded: false,
  });

  expect(liveHandCardCount(active.tokenCardDeck)).toBe(7);
  expect(liveHandCardCount(ended.tokenCardDeck)).toBe(7);
  expect(ended.resetNotifications).toEqual([-2]);
  expect(liveHandCardCount(completeReset(ended))).toBe(5);
});

function effect(
  effectId: string,
  duration: LiveHandCardCountEffect['duration'],
): LiveHandCardCountEffect {
  return { effectId, calculationType: 1, amount: 0, duration };
}

test('変更量0の加算効果は期限解除の通知を登録しない', () => {
  const initial = createLiveHandCardCountState();
  const active = activateAndFlushCount(
    initial,
    createLiveTokenCardDeckState(5),
    1,
    effect('zero', { kind: 'milliseconds', remainingSeconds: 2 }),
    0,
  );
  expect(active.state).toBe(initial);
  const expired = advanceLiveHandCardCountState(active.state, active.tokenCardDeck, {
    deltaTimeSeconds: 2,
    sectionChangeCount: 0,
    musicEnded: false,
  });
  expect(expired.resetNotifications).toEqual([]);
});

test('初期枚数から再計算せず、現在の目標へ効果を加える', () => {
  const deck = {
    ...createLiveTokenCardDeckState(5),
    handTargetCounts: { current: 2, main: 5, sub: 5 },
  };
  const active = activateAndFlushCount(
    createLiveHandCardCountState(),
    deck,
    1,
    effect('count', { kind: 'full-end' }),
    2,
  );
  expect(active.tokenCardDeck.handTargetCounts).toEqual({ current: 4, main: 5, sub: 5 });
});

test('同じ効果IDを持つ別カードを解除しない', () => {
  const first = activateAndFlushCount(
    createLiveHandCardCountState(),
    createLiveTokenCardDeckState(5),
    1,
    effect('count', { kind: 'full-end' }),
    -1,
  );
  const second = activateAndFlushCount(
    first.state,
    first.tokenCardDeck,
    2,
    effect('count', { kind: 'full-end' }),
    -2,
  );
  const removed = deactivateLiveHandCardCountEffect(second.state, second.tokenCardDeck, 1, 'count');
  expect(removed.state.effects.map((entry) => entry.cardInstanceId)).toEqual([2]);
  expect(removed.tokenCardDeck.handTargetCounts.current).toBe(2);
  expect(completeReset(removed).handTargetCounts.current).toBe(3);
});

test('手札最大化中の枚数変更は保存した目標も更新し、解除後にその目標へ戻す', () => {
  const initial = activateAndFlushCount(
    createLiveHandCardCountState(),
    createLiveTokenCardDeckState(5),
    1,
    effect('increase', { kind: 'full-end' }),
    4,
  );
  const maximum = activateLiveHandCardMaxEffect(
    initial.state,
    initial.tokenCardDeck,
    2,
    'max',
    {
      kind: 'full-end',
    },
    null,
  );
  expect(maximum.tokenCardDeck.handTargetCounts.current).toBe(8);
  const decreased = activateAndFlushCount(
    maximum.state,
    maximum.tokenCardDeck,
    3,
    effect('decrease', { kind: 'full-end' }),
    -2,
  );
  expect(decreased.tokenCardDeck.handTargetCounts.current).toBe(8);
  expect(decreased.tokenCardDeck.handMaxCardSkillInfo?.targetHandCount).toBe(7);
  const reset = deactivateLiveHandCardCountEffect(
    decreased.state,
    decreased.tokenCardDeck,
    3,
    'decrease',
  );
  const completed = completeReset(reset);
  expect(completed.handTargetCounts.current).toBe(8);
  expect(completed.handMaxCardSkillInfo?.targetHandCount).toBe(9);
  const restored = deactivateLiveHandCardCountEffect(reset.state, completed, 2, 'max');
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
    null,
  );
  const second = activateLiveHandCardMaxEffect(
    first.state,
    first.tokenCardDeck,
    2,
    'second',
    {
      kind: 'full-end',
    },
    null,
  );
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

function completeReset(
  transition: Readonly<{
    tokenCardDeck: LiveTokenCardDeckState<number>;
    resetNotifications: readonly number[];
  }>,
): LiveTokenCardDeckState<number> {
  const initial = {
    tokenCardDeck: transition.tokenCardDeck,
    deckActions: createLiveDeckActionQueueState(),
    deckBoard: createLiveDeckBoardState(
      Array.from({ length: 16 }, (_, i) => i + 1),
      [],
    ),
  };
  const queued = transition.resetNotifications.reduce(
    (state, amount) => notifyLiveHandCardCountReset(state, amount),
    initial,
  );
  return flushLiveDeckActions(queued, (state) => state).tokenCardDeck;
}
