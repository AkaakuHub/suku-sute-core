import { expect, test } from 'vite-plus/test';
import {
  createLiveDeckBoardState,
  moveLiveDeckCardToHand,
  moveLiveHandCardToGraveyard,
  liveBoardState,
} from '../../src/runtime/cards/deckBoardState.ts';
import {
  addLiveCurrentDeckCard,
  createLiveTokenCardDeckState,
  mergeLiveTokenCardDeck,
  prepareLiveCurrentDeckDraw,
  reloadLiveCurrentDeckCards,
  liveCurrentDeckBoardCardInstanceIds,
  splitLiveTokenCardDeck,
  switchLiveTokenCardDeck,
} from '../../src/runtime/cards/tokenCardDeck.ts';

const cards = [
  { cardInstanceId: 1001, tokenCardSeriesIds: [] },
  { cardInstanceId: 1002, tokenCardSeriesIds: [2] },
  { cardInstanceId: 1003, tokenCardSeriesIds: [2, 3] },
] as const;

test('ActionType43は対象tokenを手札からsub deckのDeck状態へ移して切り替える', () => {
  const board = moveLiveDeckCardToHand(createLiveDeckBoardState([1001, 1002, 1003], []), 1002);
  const split = splitLiveTokenCardDeck(createLiveTokenCardDeckState(), board, cards, 2, 5);
  const switched = switchLiveTokenCardDeck(split.state, split.deckBoard);

  expect(split.deckBoard.cards[1]?.boardState).toBe(liveBoardState.deck);
  expect(
    liveCurrentDeckBoardCardInstanceIds(switched, split.deckBoard, liveBoardState.deck),
  ).toEqual([1002, 1003]);
});

test('MergeDeckはsub deckのGraveyardだけを保持してmainへ戻す', () => {
  const initial = createLiveDeckBoardState([1001, 1002, 1003], []);
  const split = splitLiveTokenCardDeck(createLiveTokenCardDeckState(), initial, cards, 2, 5);
  const used = moveLiveHandCardToGraveyard(moveLiveDeckCardToHand(split.deckBoard, 1002), 1002);
  const hand = moveLiveDeckCardToHand(used, 1003);
  const merged = mergeLiveTokenCardDeck(switchLiveTokenCardDeck(split.state, hand), hand);

  expect(merged.state).toEqual(createLiveTokenCardDeckState());
  expect(merged.deckBoard.cards[1]?.boardState).toBe(liveBoardState.graveyard);
  expect(merged.deckBoard.cards[2]?.boardState).toBe(liveBoardState.deck);
});

test('current sub deck中に生成したtoken cardをsub deckへ追加する', () => {
  const split = splitLiveTokenCardDeck(
    createLiveTokenCardDeckState(),
    createLiveDeckBoardState([1001, 1002, 1003], []),
    cards,
    2,
    5,
  );
  const state = switchLiveTokenCardDeck(split.state, split.deckBoard);

  expect(addLiveCurrentDeckCard(state, 1004).subDeckCardInstanceIds).toEqual([1002, 1003, 1004]);
});

test('deck切替はruntimeと同じ手札差分補正と切替先deck枚数上限を適用する', () => {
  const initial = createLiveDeckBoardState([1001, 1002, 1003], [1001]);
  const split = splitLiveTokenCardDeck(createLiveTokenCardDeckState(), initial, cards, 2, 5);
  const switched = switchLiveTokenCardDeck(split.state, split.deckBoard);

  expect(switched.currentDeck).toBe('sub');
  expect(switched.handTargetCounts).toEqual({ current: 2, main: 5, sub: 2 });
});

test('current sub deckのDeckが空ならsub deckのGraveyardだけをreloadする', () => {
  const initial = createLiveDeckBoardState([1001, 1002, 1003], [1001, 1002, 1003]);
  const split = splitLiveTokenCardDeck(createLiveTokenCardDeckState(), initial, cards, 2, 5);
  const switched = switchLiveTokenCardDeck(split.state, split.deckBoard);
  const firstUsed = moveLiveHandCardToGraveyard(
    moveLiveDeckCardToHand(split.deckBoard, 1002),
    1002,
  );
  const used = moveLiveHandCardToGraveyard(moveLiveDeckCardToHand(firstUsed, 1003), 1003);
  const reloaded = prepareLiveCurrentDeckDraw(switched, used);

  expect(reloaded.deckOutCount).toBe(1);
  expect(reloaded.cards[0]?.boardState).toBe(liveBoardState.hand);
  expect(reloaded.cards[1]?.boardState).toBe(liveBoardState.deck);
  expect(reloaded.cards[2]?.boardState).toBe(liveBoardState.deck);
});

test('current deckの明示的な墓地回収はDeckOutCountを増やさない', () => {
  const initial = createLiveDeckBoardState([1001, 1002, 1003], []);
  const split = splitLiveTokenCardDeck(createLiveTokenCardDeckState(), initial, cards, 2, 5);
  const switched = switchLiveTokenCardDeck(split.state, split.deckBoard);
  const used = moveLiveHandCardToGraveyard(moveLiveDeckCardToHand(split.deckBoard, 1002), 1002);
  const reloaded = reloadLiveCurrentDeckCards(switched, { ...used, deckOutCount: 2 });
  expect(reloaded.deckOutCount).toBe(2);
  expect(reloaded.cards[1]?.boardState).toBe(liveBoardState.deck);
});
