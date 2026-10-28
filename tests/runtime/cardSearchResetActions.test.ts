import { expect, test } from 'vite-plus/test';
import {
  beginLiveAllHandSkill,
  enqueueLiveAllHandDraw,
  executeLiveAllHandDraw,
} from '../../src/runtime/cards/allHandDeckActions.ts';
import { createLiveDeckBoardState } from '../../src/runtime/cards/deckBoardState.ts';
import {
  checkLiveDeckOut,
  createLiveDeckActionQueueState,
  enqueueLiveCardSearchReset,
} from '../../src/runtime/cards/deckActionQueue.ts';
import { registerLiveCardSearchParam } from '../../src/runtime/cards/cardSearchState.ts';
import { flushLiveDeckActions } from '../../src/runtime/cards/deckActionQueue.ts';

import { createLiveTokenCardDeckState } from '../../src/runtime/cards/tokenCardDeck.ts';

function setup() {
  let deckBoard = createLiveDeckBoardState([1, 2, 3], [1]);
  for (const scope of ['grade', 'section', 'skill'] as const) {
    deckBoard = registerLiveCardSearchParam(deckBoard, scope, {
      searchType: 'character-id',
      searchId: 1031,
    });
  }
  return {
    deckBoard,
    deckActions: createLiveDeckActionQueueState(),
    tokenCardDeck: createLiveTokenCardDeckState(5),
    drawContext: 'skill',
  };
}

function unexpectedReset(): never {
  throw new Error('Unexpected hand count reset');
}

function expectSearchesCleared(state: ReturnType<typeof setup>): void {
  expect(state.deckBoard.gradeCardSearchParams).toEqual([]);
  expect(state.deckBoard.sectionCardSearchParams).toEqual([]);
  expect(state.deckBoard.skillCardSearchParams).toEqual([]);
}

test('全手札の補充中は検索を保持し、7→8→5の順で終了後に全検索を消す', () => {
  const started = beginLiveAllHandSkill(setup());
  const queued = enqueueLiveCardSearchReset(
    enqueueLiveAllHandDraw(started, { cardInstanceId: 1, charactersId: 1031, unitIds: [] }),
  );
  expect(queued.deckActions.queue.map((action) => action.type)).toEqual([7, 8, 5]);
  const ready = flushLiveDeckActions(queued, unexpectedReset);
  expect(ready.deckBoard).toBe(started.deckBoard);
  const drawn = executeLiveAllHandDraw(ready, (state) => {
    expect(state.deckBoard).toBe(started.deckBoard);
    expect(state.tokenCardDeck.isAllHandSkill).toBe(true);
    expect(flushLiveDeckActions(state, unexpectedReset)).toBe(state);
    return state;
  });
  const completed = flushLiveDeckActions(drawn, unexpectedReset);
  expectSearchesCleared(completed);
  expect(completed.tokenCardDeck.isAllHandSkill).toBe(false);
  expect(completed.drawContext).toBe('skill');
  expect(completed.deckActions.queue).toEqual([]);
});

test('検索resetはDeckOut通知より先に1回実行し、通知が新しく登録した検索は残す', () => {
  const state = setup();
  const queued = enqueueLiveCardSearchReset({
    ...state,
    deckBoard: { ...state.deckBoard, deckOutCount: 1 },
  });
  const result = checkLiveDeckOut(
    queued,
    (current) => {
      expectSearchesCleared(current);
      return {
        ...current,
        deckBoard: registerLiveCardSearchParam(current.deckBoard, 'skill', {
          searchType: 'unit-id',
          searchId: 2,
        }),
      };
    },
    unexpectedReset,
  );
  expect(result.deckBoard.skillCardSearchParams).toEqual([{ searchType: 'unit-id', searchId: 2 }]);
  expect(result.deckBoard.deckOutCount).toBe(0);
});

test('切替中は検索resetも待機し、切替終了後に処理する', () => {
  const state = setup();
  const queued = enqueueLiveCardSearchReset({
    ...state,
    tokenCardDeck: { ...state.tokenCardDeck, isSwitchDeck: true },
  });
  expect(flushLiveDeckActions(queued, unexpectedReset)).toBe(queued);
  const result = flushLiveDeckActions(
    { ...queued, tokenCardDeck: { ...queued.tokenCardDeck, isSwitchDeck: false } },
    unexpectedReset,
  );
  expectSearchesCleared(result);
  expect(result.deckActions.queue).toEqual([]);
});
