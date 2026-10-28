import { expect, test } from 'vite-plus/test';
import { createLiveDeckBoardState } from '../../src/runtime/cards/deckBoardState.ts';
import {
  createLiveDeckActionQueueState,
  enqueueLiveReshuffle,
  enqueueLiveCardSearchReset,
  flushLiveDeckActions,
} from '../../src/runtime/cards/deckActionQueue.ts';
import { createLiveTokenCardDeckState } from '../../src/runtime/cards/tokenCardDeck.ts';
import {
  beginLiveAllHandSkill,
  enqueueLiveAllHandDraw,
  executeLiveAllHandDraw,
} from '../../src/runtime/cards/allHandDeckActions.ts';
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
  usedSkill: { skillType: 2 as const, skillMainEffect: 13 },
  countDeckOut: true,
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

test.each([
  { countDeckOut: true, expected: 5 },
  { countDeckOut: false, expected: 3 },
])('通常引き直しの回収回数を指定に従い加算または復元する:%j', ({ countDeckOut, expected }) => {
  const initial = setup();
  const queued = enqueueLiveReshuffle(
    { ...initial, deckBoard: { ...initial.deckBoard, deckOutCount: 3 } },
    { ...action, countDeckOut },
  );
  const result = flushLiveDeckActions(queued, unexpectedReset, {
    reshuffle: {
      activeHandCardInstanceIds: () => [1, 2],
      draw: (state) => ({
        ...state,
        deckBoard: { ...state.deckBoard, deckOutCount: state.deckBoard.deckOutCount + 2 },
      }),
    },
  });
  expect(result.deckBoard.deckOutCount).toBe(expected);
  expect(result.deckActions.queue).toEqual([]);
});

test('全手札使用の引き直し指定は後続7の補充回数を復元しない', () => {
  const initial = setup();
  const started = beginLiveAllHandSkill(
    enqueueLiveReshuffle(
      { ...initial, deckBoard: { ...initial.deckBoard, deckOutCount: 3 } },
      { ...action, countDeckOut: false },
    ),
  );
  const queued = enqueueLiveAllHandDraw(started, {
    cardInstanceId: 1,
    charactersId: 1031,
    unitIds: [],
    skillMainEffect: 42,
  });
  const ready = flushLiveDeckActions(queued, unexpectedReset, {
    reshuffle: {
      activeHandCardInstanceIds: () => [1, 2],
      draw: () => {
        throw new Error('All-hand reshuffle drew immediately');
      },
    },
  });
  expect(ready.tokenCardDeck.allHandSkillDeckReload).toBe(true);
  const drawn = executeLiveAllHandDraw(ready, (state) => ({
    ...state,
    deckBoard: { ...state.deckBoard, deckOutCount: state.deckBoard.deckOutCount + 2 },
  }));
  const completed = flushLiveDeckActions(drawn, unexpectedReset);
  expect(completed.deckBoard.deckOutCount).toBe(5);
  expect(completed.tokenCardDeck.isAllHandSkill).toBe(false);
});
