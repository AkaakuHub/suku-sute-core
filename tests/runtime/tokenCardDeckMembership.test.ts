import { expect, test } from 'vite-plus/test';
import {
  createLiveDeckBoardState,
  liveBoardState,
  setLiveCardBoardState,
} from '../../src/runtime/cards/deckBoardState.ts';
import {
  addLiveTokenCardDeckCard,
  createLiveTokenCardDeckState,
  liveCurrentDeckCardCount,
  mergeLiveTokenCardDeck,
  splitLiveTokenCardDeck,
} from '../../src/runtime/cards/tokenCardDeck.ts';

const cards = [
  { cardInstanceId: 1, tokenCardSeriesIds: [] },
  { cardInstanceId: 2, tokenCardSeriesIds: [2] },
  { cardInstanceId: 3, tokenCardSeriesIds: [3] },
  { cardInstanceId: 4, tokenCardSeriesIds: [2] },
];

test('複数の分割系列を保持し、そのいずれかに属する生成カードをsubへ追加する', () => {
  const split = splitLiveTokenCardDeck(
    createLiveTokenCardDeckState(5),
    createLiveDeckBoardState([1, 2, 3, 4], []),
    cards,
    [2, 3],
    4,
  );
  expect(split.state.subDeckCardInstanceIds).toEqual([2, 3, 4]);
  expect(split.state.tokenCardSeriesIds).toEqual([2, 3]);
  expect(
    addLiveTokenCardDeckCard(split.state, { cardInstanceId: 5, tokenCardSeriesIds: [3] })
      .subDeckCardInstanceIds,
  ).toEqual([2, 3, 4, 5]);
});

test('nullの系列指定でも空のsubを分割でき、生成カードはmainへ残す', () => {
  const split = splitLiveTokenCardDeck(
    createLiveTokenCardDeckState(5),
    createLiveDeckBoardState([1], []),
    cards.slice(0, 1),
    null,
    1,
  );
  expect(split.state.subDeckCardInstanceIds).toEqual([]);
  expect(
    addLiveTokenCardDeckCard(split.state, { cardInstanceId: 2, tokenCardSeriesIds: [2] }),
  ).toEqual(split.state);
});

test('除外したカードは分割対象と現在デッキ枚数に含めず統合でも戻さない', () => {
  const initial = setLiveCardBoardState(
    createLiveDeckBoardState([1, 2, 3, 4], []),
    4,
    liveBoardState.exclusion,
  );
  const split = splitLiveTokenCardDeck(
    createLiveTokenCardDeckState(5),
    initial,
    cards.slice(0, 3),
    [2],
    3,
  );
  expect(split.state.subDeckCardInstanceIds).toEqual([2]);
  expect(liveCurrentDeckCardCount(split.state, split.deckBoard)).toBe(2);
  const excludedSub = setLiveCardBoardState(split.deckBoard, 2, liveBoardState.exclusion);
  const merged = mergeLiveTokenCardDeck(split.state, excludedSub);
  expect(liveCurrentDeckCardCount(merged.state, merged.deckBoard)).toBe(2);
  expect(
    merged.deckBoard.cards
      .filter((card) => card.boardState === liveBoardState.exclusion)
      .map((card) => card.cardInstanceId),
  ).toEqual([2, 4]);
});
