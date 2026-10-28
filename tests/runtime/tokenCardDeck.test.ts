import { expect, test } from 'vite-plus/test';
import {
  createLiveDeckBoardState,
  moveLiveDeckCardToHand,
  moveLiveHandCardToGraveyard,
  liveBoardState,
} from '../../src/runtime/cards/deckBoardState.ts';
import {
  addLiveTokenCardDeckCard,
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

test('指定系列の生成カードをsub deckへ追加する', () => {
  const split = splitLiveTokenCardDeck(
    createLiveTokenCardDeckState(),
    createLiveDeckBoardState([1001, 1002, 1003], []),
    cards,
    2,
    5,
  );
  const state = switchLiveTokenCardDeck(split.state, split.deckBoard);

  expect(
    addLiveTokenCardDeckCard(state, { cardInstanceId: 1004, tokenCardSeriesIds: [2] })
      .subDeckCardInstanceIds,
  ).toEqual([1002, 1003, 1004]);
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
  const reloaded = prepareLiveCurrentDeckDraw(switched, used, () => 10_000);

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

for (const currentDeck of ['main', 'sub'] as const) {
  test(`生成カードは現在の${currentDeck}表示ではなく分割系列で所属を決める`, () => {
    const split = splitLiveTokenCardDeck(
      createLiveTokenCardDeckState(),
      createLiveDeckBoardState([1001, 1002, 1003], []),
      cards,
      2,
      5,
    );
    const state = { ...split.state, currentDeck };
    const matching = addLiveTokenCardDeckCard(state, {
      cardInstanceId: 1004,
      tokenCardSeriesIds: [2, 9],
    });
    const other = addLiveTokenCardDeckCard(state, {
      cardInstanceId: 1005,
      tokenCardSeriesIds: [9],
    });
    expect(matching.subDeckCardInstanceIds).toEqual([1002, 1003, 1004]);
    expect(other.subDeckCardInstanceIds).toEqual([1002, 1003]);
    expect(matching.tokenCardSeriesIds).toEqual([2]);
  });
}

test('文字列IDも同じ分割状態と生成時の系列判定を使う', () => {
  const state = {
    currentDeck: 'main' as const,
    subDeckCardInstanceIds: ['sub'],
    tokenCardSeriesIds: [2],
    handTargetCounts: { current: 3, main: 3, sub: 0 },
  };
  expect(
    addLiveTokenCardDeckCard(state, { cardInstanceId: 'new', tokenCardSeriesIds: [2] })
      .subDeckCardInstanceIds,
  ).toEqual(['sub', 'new']);
});
