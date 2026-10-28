import { expect, test } from 'vite-plus/test';
import { createLiveDeckBoardState } from '../../src/runtime/cards/deckBoardState.ts';
import {
  createLiveDeckActionQueueState,
  checkLiveDeckOut,
} from '../../src/runtime/cards/deckActionQueue.ts';
import { createLiveTokenCardDeckState } from '../../src/runtime/cards/tokenCardDeck.ts';
import {
  notifyLiveHandCardCountReset,
  flushLiveHandCardCountActions,
  resetLivePendingHandCardCount,
  liveResetHandCardCount,
} from '../../src/runtime/cards/handCardCountReset.ts';

function setup(target = 4) {
  return {
    tokenCardDeck: {
      ...createLiveTokenCardDeckState(5),
      handTargetCounts: { current: target, main: 5, sub: 5 },
    },
    deckActions: createLiveDeckActionQueueState(),
    deckBoard: createLiveDeckBoardState([1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 2, 3]),
    events: [] as readonly string[],
    requestedHandCount: 3,
  };
}

function resetHand(state: ReturnType<typeof setup>, adjustment: number) {
  return {
    ...state,
    events: [...state.events, 'reset'],
    requestedHandCount:
      adjustment > 0 ? liveResetHandCardCount(state, 3, adjustment) : state.requestedHandCount,
  };
}

test('通常の解除通知はaction1を登録し、処理するまでraw目標と待機量を変えない', () => {
  const pending = notifyLiveHandCardCountReset(setup(), 1);
  expect(pending.tokenCardDeck.handTargetCounts.current).toBe(4);
  expect(pending.tokenCardDeck.resetCount).toBe(0);
  expect(pending.deckActions.queue).toEqual([{ type: 1, param1: 1 }]);
  const completed = flushLiveHandCardCountActions(pending, resetHand);
  expect(completed.tokenCardDeck.handTargetCounts.current).toBe(5);
  expect(completed.tokenCardDeck.resetCount).toBe(0);
  expect(completed.requestedHandCount).toBe(4);
  expect(completed.events).toEqual(['reset']);
});

test('切替中は直接待機量を蓄積し、切替内の明示的resetでだけ消費する', () => {
  const initial = setup();
  const switching = { ...initial, tokenCardDeck: { ...initial.tokenCardDeck, isSwitchDeck: true } };
  const pending = notifyLiveHandCardCountReset(switching, 2);
  expect(pending.deckActions.queue).toEqual([]);
  expect(pending.tokenCardDeck.resetCount).toBe(2);
  expect(flushLiveHandCardCountActions(pending, resetHand)).toBe(pending);
  const reset = resetLivePendingHandCardCount(pending, resetHand);
  expect(reset.tokenCardDeck.isSwitchDeck).toBe(true);
  expect(reset.tokenCardDeck.resetCount).toBe(0);
  expect(reset.tokenCardDeck.handTargetCounts.current).toBe(6);
});

test('相殺した解除通知はraw目標も抽選条件も変更しない', () => {
  const pending = notifyLiveHandCardCountReset(notifyLiveHandCardCountReset(setup(), 2), -2);
  const result = flushLiveHandCardCountActions(pending, resetHand);
  expect(result.events).toEqual([]);
  expect(result.tokenCardDeck.handTargetCounts.current).toBe(4);
});

test('CheckResetCountは全手札スキル中なら目標だけを変えて抽選条件と保存目標を変えない', () => {
  const initial = setup(6);
  const result = flushLiveHandCardCountActions(
    {
      ...initial,
      tokenCardDeck: {
        ...initial.tokenCardDeck,
        isAllHandSkill: true,
        resetCount: -2,
        maxHandSkillActiveCount: 1,
        handMaxCardSkillInfo: { targetHandCount: 4 },
      },
      deckActions: { ...initial.deckActions, queue: [{ type: 2 as const }] },
    },
    resetHand,
  );
  expect(result.tokenCardDeck.handTargetCounts.current).toBe(4);
  expect(result.tokenCardDeck.handMaxCardSkillInfo?.targetHandCount).toBe(4);
  expect(result.tokenCardDeck.resetCount).toBe(0);
  expect(result.events).toEqual([]);
});

test('全手札スキル終了後に最低枚数の不足分を差し引いて補充する', () => {
  const initial = setup(2);
  const pending = notifyLiveHandCardCountReset(
    { ...initial, tokenCardDeck: { ...initial.tokenCardDeck, isAllHandSkill: true } },
    2,
  );
  const held = flushLiveHandCardCountActions(pending, resetHand);
  expect(held.tokenCardDeck.handTargetCounts.current).toBe(2);
  const result = flushLiveHandCardCountActions(
    { ...held, deckActions: { ...held.deckActions, queue: [{ type: 8 as const }] } },
    resetHand,
  );
  expect(result.tokenCardDeck.isAllHandSkill).toBe(false);
  expect(result.tokenCardDeck.handTargetCounts.current).toBe(4);
  expect(result.requestedHandCount).toBe(4);
});

test('再読み込み確認を飛び越して解除量を適用しない', () => {
  const initial = notifyLiveHandCardCountReset(setup(), 1);
  const pending = { ...initial, deckBoard: { ...initial.deckBoard, deckOutCount: 1 } };
  const result = checkLiveDeckOut(
    pending,
    (state) => ({ ...state, events: [...state.events, 'reload'] }),
    resetHand,
  );
  expect(result.events).toEqual(['reload', 'reset']);
  expect(result.deckActions.queue).toEqual([]);
  expect(result.deckBoard.deckOutCount).toBe(0);
});
