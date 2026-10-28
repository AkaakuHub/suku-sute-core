import { expect, test } from 'vite-plus/test';
import { createLiveDeckBoardState } from '../../src/runtime/cards/deckBoardState.ts';
import {
  createLiveDeckActionQueueState,
  enqueueLiveReshuffle,
  enqueueLiveCardSearchReset,
  flushLiveDeckActions,
} from '../../src/runtime/cards/deckActionQueue.ts';
import { createLiveTokenCardDeckState } from '../../src/runtime/cards/tokenCardDeck.ts';
import { beginLiveAllHandSkill } from '../../src/runtime/cards/allHandDeckActions.ts';
import { notifyLiveHandCardCountReset } from '../../src/runtime/cards/handCardCountReset.ts';

function setup() {
  return {
    deckBoard: {
      ...createLiveDeckBoardState([1, 2, 3], [1, 2]),
      deckOutCount: 1,
      skillCardSearchParams: [{ searchType: 'character-id' as const, searchId: 1031 }],
    },
    deckActions: createLiveDeckActionQueueState(),
    tokenCardDeck: createLiveTokenCardDeckState(5),
    events: [] as readonly string[],
  };
}
const action = {
  cardInstanceId: 1,
  skillMainEffect: 13,
  effect: { recoveryType: 'recovery', stashType: 'deck' },
} as const;

function unexpectedReset(): never {
  throw new Error('Unexpected reset');
}

test('解除通知・引き直し・検索reset・DeckOut・枚数resetを登録順で処理する', () => {
  const queued = enqueueLiveCardSearchReset(
    enqueueLiveReshuffle(notifyLiveHandCardCountReset(setup(), 1), action),
  );
  const state = {
    ...queued,
    deckActions: {
      ...queued.deckActions,
      queue: [...queued.deckActions.queue, { type: 6 } as const, { type: 2 } as const],
    },
  };
  const result = flushLiveDeckActions(
    state,
    (current) => {
      expect(current.deckActions.currentAction?.type).toBe(2);
      expect(current.deckBoard.skillCardSearchParams).toEqual([]);
      return { ...current, events: [...current.events, 'reset'] };
    },
    {
      reshuffle: {
        activeHandCardInstanceIds: () => [1, 2],
        draw: (current, received) => {
          expect(received.effect).toBe(action.effect);
          expect(current.tokenCardDeck.resetCount).toBe(1);
          expect(current.deckActions.currentAction?.type).toBe(3);
          expect(current.deckBoard.skillCardSearchParams).toHaveLength(1);
          expect(flushLiveDeckActions(current, unexpectedReset)).toBe(current);
          return { ...current, events: [...current.events, 'reshuffle'] };
        },
      },
      afterDeckReload: (current) => {
        expect(current.deckBoard.skillCardSearchParams).toEqual([]);
        return { ...current, events: [...current.events, 'reload'] };
      },
    },
  );
  expect(result.events).toEqual(['reshuffle', 'reload', 'reset']);
  expect(result.tokenCardDeck.handTargetCounts.current).toBe(6);
  expect(result.deckActions).toEqual({ queue: [], currentAction: null });
});

test('登録後に全手札使用へ入った引き直しは補充せず使用後の移動先と回収flagを変更する', () => {
  const state = beginLiveAllHandSkill(enqueueLiveReshuffle(setup(), action));
  const result = flushLiveDeckActions(state, unexpectedReset, {
    reshuffle: {
      activeHandCardInstanceIds: () => [1, 2],
      draw: () => {
        throw new Error('All-hand reshuffle drew immediately');
      },
    },
  });
  expect(result.tokenCardDeck.allHandSkillDeckReload).toBe(true);
  expect(result.deckBoard.cards.map((card) => card.skillUseAtBoardState)).toEqual([3, 1, 3]);
  expect(result.deckActions.queue).toEqual([]);
});

test('handler未設定と切替中は後続の検索resetへ進まず引き直しを待機する', () => {
  const state = enqueueLiveCardSearchReset(enqueueLiveReshuffle(setup(), action));
  expect(flushLiveDeckActions(state, unexpectedReset)).toBe(state);
  const switching = { ...state, tokenCardDeck: { ...state.tokenCardDeck, isSwitchDeck: true } };
  expect(flushLiveDeckActions(switching, unexpectedReset)).toBe(switching);
});

test('引き直し中に予約した次の引き直しを再帰せず順に処理する', () => {
  const state = enqueueLiveReshuffle(setup(), action);
  const result = flushLiveDeckActions(state, unexpectedReset, {
    reshuffle: {
      activeHandCardInstanceIds: () => [1, 2],
      draw: (current) => {
        const next = { ...current, events: [...current.events, 'reshuffle'] };
        return current.events.length === 0 ? enqueueLiveReshuffle(next, action) : next;
      },
    },
  });
  expect(result.events).toEqual(['reshuffle', 'reshuffle']);
  expect(result.deckActions.queue).toEqual([]);
});
