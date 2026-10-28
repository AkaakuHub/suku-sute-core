import { expect, test } from 'vite-plus/test';
import { createLiveDeckActionQueueState } from '../../src/runtime/cards/deckActionQueue.ts';
import { createLiveTokenCardDeckState } from '../../src/runtime/cards/tokenCardDeck.ts';
import {
  activateLiveHandCardCountEffect,
  activateLiveHandCardMaxEffect,
  advanceLiveHandCardCountState,
  createLiveHandCardCountState,
  deactivateLiveHandCardCountEffectsByKey,
} from '../../src/runtime/skills/handCardCount.ts';

test('計算種別1以外は加算を予約せず、期限終了時に元の量の解除通知を行う', () => {
  const active = activateLiveHandCardCountEffect(
    createLiveHandCardCountState(),
    createLiveTokenCardDeckState(5),
    createLiveDeckActionQueueState(),
    1,
    {
      effectId: 'count',
      calculationType: 2,
      amount: 2,
      duration: { kind: 'sections', remainingChanges: 1n },
    },
    2,
    null,
  );
  expect(active.deckActions.queue).toEqual([]);
  expect(active.tokenCardDeck.handTargetCounts.current).toBe(5);
  const expired = advanceLiveHandCardCountState(active.state, active.tokenCardDeck, {
    deltaTimeSeconds: 0,
    sectionChangeCount: 1,
    musicEnded: false,
  });
  expect(expired.state.effects).toEqual([]);
  expect(expired.resetNotifications).toEqual([-2]);
});

test('直接生成した効果の未設定IDを捏造せず、解除キーと効果種別で対象を区別する', () => {
  const count = activateLiveHandCardCountEffect(
    createLiveHandCardCountState(),
    createLiveTokenCardDeckState(5),
    createLiveDeckActionQueueState(),
    null,
    { effectId: null, calculationType: 1, amount: 2, duration: { kind: 'full-end' } },
    2,
    'controlled',
  );
  const max = activateLiveHandCardMaxEffect(
    count.state,
    count.tokenCardDeck,
    null,
    null,
    { kind: 'full-end' },
    'controlled',
  );
  const removed = deactivateLiveHandCardCountEffectsByKey(
    max.state,
    max.tokenCardDeck,
    'controlled',
    'count',
  );
  expect(removed.resetNotifications).toEqual([-2]);
  expect(removed.state.effects).toEqual([
    {
      kind: 'max',
      effectId: null,
      cardInstanceId: null,
      deactivationKey: 'controlled',
      duration: { kind: 'full-end' },
    },
  ]);
  expect(removed.tokenCardDeck.maxHandSkillActiveCount).toBe(1);
  const complete = deactivateLiveHandCardCountEffectsByKey(
    removed.state,
    removed.tokenCardDeck,
    'controlled',
    'max',
  );
  expect(complete.state.effects).toEqual([]);
  expect(complete.tokenCardDeck.maxHandSkillActiveCount).toBe(0);
});

test('枚数変更と最大化は同じclockでそれぞれ一度だけ期限終了する', () => {
  const count = activateLiveHandCardCountEffect(
    createLiveHandCardCountState(),
    createLiveTokenCardDeckState(5),
    createLiveDeckActionQueueState(),
    1,
    {
      effectId: 'count',
      calculationType: 1,
      amount: 1,
      duration: { kind: 'milliseconds', remainingSeconds: 1 },
    },
    1,
    null,
  );
  const max = activateLiveHandCardMaxEffect(
    count.state,
    count.tokenCardDeck,
    2,
    'max',
    { kind: 'milliseconds', remainingSeconds: 2 },
    null,
  );
  const first = advanceLiveHandCardCountState(max.state, max.tokenCardDeck, {
    deltaTimeSeconds: 1,
    sectionChangeCount: 0,
    musicEnded: false,
  });
  expect(first.resetNotifications).toEqual([-1]);
  expect(first.state.effects.map((effect) => effect.kind)).toEqual(['max']);
  const second = advanceLiveHandCardCountState(first.state, first.tokenCardDeck, {
    deltaTimeSeconds: 1,
    sectionChangeCount: 0,
    musicEnded: false,
  });
  expect(second.resetNotifications).toEqual([]);
  expect(second.state.effects).toEqual([]);
  expect(second.tokenCardDeck.maxHandSkillActiveCount).toBe(0);
});
