import { expect, test } from 'vite-plus/test';
import {
  createLiveDeckBoardState,
  liveBoardState,
} from '../../../src/runtime/cards/deckBoardState.ts';
import {
  createLiveDeckActionQueueState,
  flushLiveDeckActions,
} from '../../../src/runtime/cards/deckActionQueue.ts';
import {
  addLiveHandCardCount,
  notifyLiveHandCardCountAdd,
} from '../../../src/runtime/cards/handCardCountAdd.ts';
import {
  createLiveDeckHandsState,
  createLiveHandState,
} from '../../../src/runtime/cards/liveHand.ts';
import { createLiveTokenCardDeckState } from '../../../src/runtime/cards/tokenCardDeck.ts';
import { createLiveDeckDrawContextState } from '../../../src/runtime/cards/cardDraw.ts';

function runtime(handCount = 5, target = 5, deckSize = 10) {
  const cards = Array.from({ length: deckSize }, (_, index) => index + 1);
  const hand = cards.slice(0, handCount);
  const tokenCardDeck = createLiveTokenCardDeckState(5);
  return {
    tokenCardDeck: {
      ...tokenCardDeck,
      handTargetCounts: { ...tokenCardDeck.handTargetCounts, current: target },
    },
    deckActions: createLiveDeckActionQueueState(),
    deckBoard: createLiveDeckBoardState(cards, hand),
    liveHands: createLiveDeckHandsState(hand),
    deckDrawContext: createLiveDeckDrawContextState(2),
    requests: [] as readonly number[],
  };
}

function apply(state: ReturnType<typeof runtime>, amount: number) {
  return addLiveHandCardCount(state, amount, (current, count) => {
    expect(current.deckActions.currentAction?.type).toBe(0);
    expect(current.deckDrawContext).toEqual(createLiveDeckDrawContextState(3));
    const hand = current.deckBoard.cards.slice(0, count).map((card) => card.cardInstanceId);
    return {
      ...current,
      requests: [...current.requests, count],
      liveHands: {
        ...current.liveHands,
        [current.tokenCardDeck.currentDeck]: createLiveHandState(hand),
      },
      deckBoard: {
        ...current.deckBoard,
        cards: current.deckBoard.cards.map((card) => ({
          ...card,
          boardState: hand.includes(card.cardInstanceId)
            ? liveBoardState.hand
            : liveBoardState.deck,
        })),
      },
    };
  });
}

function complete(state: ReturnType<typeof runtime>) {
  return flushLiveDeckActions(
    state,
    () => {
      throw new Error('Unexpected reset');
    },
    { addHandCardCount: apply },
  );
}

test('通知はtype0を予約し、実行前は現在目標と手札を変更しない', () => {
  const state = runtime();
  const pending = notifyLiveHandCardCountAdd(state, 1);
  expect(pending.tokenCardDeck).toBe(state.tokenCardDeck);
  expect(pending.liveHands).toBe(state.liveHands);
  expect(pending.deckActions.queue).toEqual([{ type: 0, param1: 1 }]);
  expect(flushLiveDeckActions(pending, (current) => current)).toBe(pending);
  const applied = complete(pending);
  expect(applied.tokenCardDeck.handTargetCounts.current).toBe(6);
  expect(applied.liveHands.main.handCount).toBe(6);
  expect(applied.requests).toEqual([6]);
});

test('最大化中は保存目標だけを通知時に更新し、実行時は変更量によらず8枚にする', () => {
  const base = runtime(6, 6);
  const pending = notifyLiveHandCardCountAdd(
    {
      ...base,
      tokenCardDeck: {
        ...base.tokenCardDeck,
        maxHandSkillActiveCount: 1,
        handMaxCardSkillInfo: { targetHandCount: 4 },
      },
    },
    -2,
  );
  expect(pending.tokenCardDeck.handTargetCounts.current).toBe(6);
  expect(pending.tokenCardDeck.handMaxCardSkillInfo?.targetHandCount).toBe(2);
  const applied = complete(pending);
  expect(applied.tokenCardDeck.handTargetCounts.current).toBe(8);
  expect(applied.tokenCardDeck.handMaxCardSkillInfo?.targetHandCount).toBe(2);
  expect(applied.requests).toEqual([8]);
});

test('全手札使用中はtype0でraw目標だけを加算し、補充とDrawContext変更は行わない', () => {
  const base = runtime();
  const pending = notifyLiveHandCardCountAdd(
    {
      ...base,
      tokenCardDeck: {
        ...base.tokenCardDeck,
        isAllHandSkill: true,
        maxHandSkillActiveCount: 1,
        handMaxCardSkillInfo: { targetHandCount: 4 },
      },
    },
    -1,
  );
  const applied = flushLiveDeckActions(pending, (current) => current);
  expect(applied.tokenCardDeck.handTargetCounts.current).toBe(4);
  expect(applied.tokenCardDeck.handMaxCardSkillInfo?.targetHandCount).toBe(3);
  expect(applied.liveHands).toBe(base.liveHands);
  expect(applied.deckDrawContext).toBe(base.deckDrawContext);
});

test.each([
  { hand: 7, previous: 5, amount: 1, target: 6, requested: 8 },
  { hand: 7, previous: 5, amount: -2, target: 3, requested: 5 },
  { hand: 5, previous: 2, amount: -1, target: 1, requested: 3 },
  { hand: 3, previous: -3, amount: 2, target: -1, requested: 3 },
  { hand: 5, previous: 2_147_483_647, amount: 1, target: -2_147_483_648, requested: 3 },
])(
  '過剰分を残し、raw目標と実際の要求枚数を分ける: %j',
  ({ hand, previous, amount, target, requested }) => {
    const applied = complete(notifyLiveHandCardCountAdd(runtime(hand, previous), amount));
    expect(applied.tokenCardDeck.handTargetCounts.current).toBe(target);
    expect(applied.requests).toEqual([requested]);
  },
);

test('要求枚数は現在デッキの総数を超えない', () => {
  const applied = complete(notifyLiveHandCardCountAdd(runtime(2, 5, 2), 1));
  expect(applied.tokenCardDeck.handTargetCounts.current).toBe(6);
  expect(applied.requests).toEqual([2]);
});

test('実行中の通知は末尾へ予約し、再入したflushでは処理しない', () => {
  const result = flushLiveDeckActions(notifyLiveHandCardCountAdd(runtime(), 1), (state) => state, {
    addHandCardCount: (state, amount) => {
      const applied = apply(state, amount);
      if (applied.requests.length !== 1) return applied;
      const pending = notifyLiveHandCardCountAdd(applied, -2);
      expect(complete(pending)).toBe(pending);
      return pending;
    },
  });
  expect(result.requests).toEqual([6, 4]);
  expect(result.deckActions).toEqual(createLiveDeckActionQueueState());
});
