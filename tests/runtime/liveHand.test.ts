import {
  createLiveDeckBoardState,
  liveBoardState,
  moveLiveHandCardToExtra,
} from '../../src/runtime/cards/deckBoardState.ts';
import { expect, test } from 'vite-plus/test';
import {
  addLiveHandCard,
  completeLiveHandCardDraw,
  createLiveDeckHandsState,
  createLiveHandState,
  liveCurrentHandCardInstanceIds,
  liveHandCardButtonId,
  removeLiveCurrentHandCard,
  liveHandCardInstanceIds,
  removeLiveHandCard,
  setLiveCurrentHandCards,
} from '../../src/runtime/cards/liveHand.ts';

test('位置を保持して抜いたカードの枠へ補充する', () => {
  const initial = createLiveHandState([30, 10, 20]);
  const removed = removeLiveHandCard(initial, 1, false);
  expect(removed.handCards).toEqual([30, null, 20, null, null, null, null, null]);
  expect(removed.handCount).toBe(2);
  const refilled = addLiveHandCard(removed, 1, 40);
  expect(refilled.handCards).toEqual([30, 40, 20, null, null, null, null, null]);
  expect(refilled.handCount).toBe(3);
  expect(initial.handCards).toEqual([30, 10, 20, null, null, null, null, null]);
});

test('詰めて抜く操作は後続カードの相対順を維持し最後の枠を空にする', () => {
  const removed = removeLiveHandCard(createLiveHandState([30, 10, 20, 40]), 1, true);
  expect(removed.handCards).toEqual([30, 20, 40, null, null, null, null, null]);
  expect(removed.handCount).toBe(3);
});

test('メインとサブの順序を個別に保持し、切替後の変更は選択中の手札だけに反映する', () => {
  const initial = {
    liveHands: createLiveDeckHandsState<number>([3, 1, 2]),
    deckBoard: createLiveDeckBoardState([1, 2, 3, 4, 5, 6], [1, 2, 3, 4, 5, 6]),
    tokenCardDeck: { currentDeck: 'main' as const },
  };
  const sub = setLiveCurrentHandCards(
    { ...initial, tokenCardDeck: { currentDeck: 'sub' as const } },
    [6, 4],
  );
  expect(liveCurrentHandCardInstanceIds(sub)).toEqual([6, 4]);
  expect(sub.liveHands.main).toBe(initial.liveHands.main);
  const main = { ...sub, tokenCardDeck: { currentDeck: 'main' as const } };
  expect(liveCurrentHandCardInstanceIds(main)).toEqual([3, 1, 2]);
  expect(
    liveCurrentHandCardInstanceIds({ ...main, tokenCardDeck: { currentDeck: 'sub' } }),
  ).toEqual([6, 4]);
});

test('満杯の手札は末尾を抜いて同じ枠へ追加できる', () => {
  const initial = createLiveHandState([8, 7, 6, 5, 4, 3, 2, 1]);
  const result = addLiveHandCard(removeLiveHandCard(initial, 7, true), 7, 9);
  expect(result.handCards).toEqual([8, 7, 6, 5, 4, 3, 2, 9]);
  expect(result.handCount).toBe(8);
});

test('範囲外、空の削除、占有枠への追加、同一個体の二重登録を拒否する', () => {
  const initial = createLiveHandState([1]);
  expect(() => removeLiveHandCard(initial, 8, true)).toThrow();
  expect(() => removeLiveHandCard(initial, -1, false)).toThrow();
  expect(() => removeLiveHandCard(initial, 0.5, false)).toThrow();
  expect(() => removeLiveHandCard(initial, 1, false)).toThrow();
  expect(() => addLiveHandCard(initial, 0, 2)).toThrow();
  expect(() => addLiveHandCard(initial, 1, 1)).toThrow();
  expect(() => createLiveHandState([1, 1])).toThrow();
  expect(() => createLiveHandState([1, 2, 3, 4, 5, 6, 7, 8, 9])).toThrow();
});

test('未確定の手札を空配列として読み書きしない', () => {
  const state = {
    liveHands: null,
    deckBoard: createLiveDeckBoardState([1], [1]),
    tokenCardDeck: { currentDeck: 'main' as const },
  };
  expect(() => liveCurrentHandCardInstanceIds(state)).toThrow('unresolved');
  expect(() => setLiveCurrentHandCards(state, [])).toThrow('unresolved');
});

test('使用中のカードは元の枠と枚数を保ち、使用可能な手札からは除く', () => {
  const state = {
    liveHands: createLiveDeckHandsState<number>([3, 1, 2]),
    tokenCardDeck: { currentDeck: 'main' as const },
    deckBoard: moveLiveHandCardToExtra(createLiveDeckBoardState([1, 2, 3, 4], [3, 1, 2]), 1),
  };
  expect(state.liveHands.main.handCards.slice(0, 3)).toEqual([3, 1, 2]);
  expect(state.liveHands.main.handCount).toBe(3);
  expect(liveCurrentHandCardInstanceIds(state)).toEqual([3, 2]);
  const completed = completeLiveHandCardDraw(
    state,
    1,
    (removed, index) => {
      expect(index).toBe(1);
      expect(removed.liveHands.main.handCards.slice(0, 3)).toEqual([3, null, 2]);
      expect(removed.liveHands.main.handCount).toBe(2);
      return {
        state: {
          ...removed,
          liveHands: {
            ...removed.liveHands,
            main: addLiveHandCard(removed.liveHands.main, index, 4),
          },
          deckBoard: {
            ...removed.deckBoard,
            cards: removed.deckBoard.cards.map((card) =>
              card.cardInstanceId === 4 ? { ...card, boardState: liveBoardState.hand } : card,
            ),
          },
        },
        drawSucceeded: true,
      };
    },
    (current) => current,
  );
  expect(completed.liveHands.main.handCards.slice(0, 3)).toEqual([3, 4, 2]);
  expect(completed.liveHands.main.handCount).toBe(3);
  expect(liveCurrentHandCardInstanceIds(completed)).toEqual([3, 4, 2]);
});

test('補充しない場合と抽選失敗時は後続を詰め、余分に枚数を減らさない', () => {
  const state = {
    liveHands: createLiveDeckHandsState<number>([3, 1, 2]),
    deckBoard: createLiveDeckBoardState([1, 2, 3], [1, 2, 3]),
    tokenCardDeck: { currentDeck: 'main' as const },
  };
  const skipped = completeLiveHandCardDraw(state, 1, null, (current) => current);
  const failed = completeLiveHandCardDraw(
    state,
    1,
    (removed) => ({
      state: removed,
      drawSucceeded: false,
    }),
    (current) => current,
  );
  for (const result of [skipped, failed]) {
    expect(result.liveHands.main.handCards).toEqual([3, 2, null, null, null, null, null, null]);
    expect(result.liveHands.main.handCount).toBe(2);
    expect(result.liveHands.sub).toBe(state.liveHands.sub);
  }
});

test('引き直しで枠のカードが変わっても使用開始時のボタンへ補充する', () => {
  const initial = {
    liveHands: createLiveDeckHandsState<number>([3, 1, 2]),
    tokenCardDeck: { currentDeck: 'main' as const },
    deckBoard: moveLiveHandCardToExtra(createLiveDeckBoardState([1, 2, 3, 4, 5], [1, 2, 3]), 1),
  };
  const buttonId = liveHandCardButtonId(initial, 1);
  const reshuffled = setLiveCurrentHandCards(
    {
      ...initial,
      deckBoard: {
        ...initial.deckBoard,
        cards: initial.deckBoard.cards.map((card) =>
          card.cardInstanceId === 4 ? { ...card, boardState: liveBoardState.hand } : card,
        ),
      },
    },
    [3, 4, 2],
  );
  const removedIds: number[] = [];
  const result = completeLiveHandCardDraw(
    reshuffled,
    buttonId,
    (removed, index) => ({
      state: {
        ...removed,
        liveHands: {
          ...removed.liveHands,
          main: addLiveHandCard(removed.liveHands.main, index, 5),
        },
      },
      drawSucceeded: true,
    }),
    (current, id) => {
      removedIds.push(id);
      return current;
    },
  );
  expect(liveHandCardInstanceIds(result.liveHands.main)).toEqual([3, 5, 2]);
  expect(removedIds).toEqual([4]);
  expect(result.deckBoard.cards.find((card) => card.cardInstanceId === 4)?.boardState).toBe(
    liveBoardState.graveyard,
  );
  expect(result.deckBoard.cards.find((card) => card.cardInstanceId === 1)?.boardState).toBe(
    liveBoardState.extra,
  );
});

test('ほかの枠を詰めた後もボタンの移動先を検索して補充する', () => {
  const initial = {
    liveHands: createLiveDeckHandsState<number>([3, 1, 2]),
    tokenCardDeck: { currentDeck: 'main' as const },
    deckBoard: moveLiveHandCardToExtra(createLiveDeckBoardState([1, 2, 3, 4], [1, 2, 3]), 1),
  };
  const buttonId = liveHandCardButtonId(initial, 1);
  const shifted = removeLiveCurrentHandCard(initial, 0, true);
  expect(shifted.liveHands.handCardButtonOrder).toEqual([1, 2, 3, 4, 5, 6, 7, 0]);
  const result = completeLiveHandCardDraw(
    shifted,
    buttonId,
    (removed, index) => {
      expect(index).toBe(0);
      return {
        state: {
          ...removed,
          liveHands: {
            ...removed.liveHands,
            main: addLiveHandCard(removed.liveHands.main, index, 4),
          },
        },
        drawSucceeded: true,
      };
    },
    (current) => current,
  );
  expect(liveHandCardInstanceIds(result.liveHands.main)).toEqual([4, 2]);
  expect(result.liveHands.main.handCount).toBe(2);
  expect(result.liveHands.handCardButtonOrder).toEqual(shifted.liveHands.handCardButtonOrder);
});
