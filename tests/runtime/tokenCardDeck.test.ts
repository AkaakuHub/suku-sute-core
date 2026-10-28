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
  reconcileLiveTokenCardDeckHandTarget,
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
  const split = splitLiveTokenCardDeck(createLiveTokenCardDeckState(5), board, cards, [2], 5);
  const switched = switchLiveTokenCardDeck(split.state, split.deckBoard);

  expect(split.deckBoard.cards[1]?.boardState).toBe(liveBoardState.deck);
  expect(
    liveCurrentDeckBoardCardInstanceIds(switched, split.deckBoard, liveBoardState.deck),
  ).toEqual([1002, 1003]);
});

test('MergeDeckはsub deckのGraveyardだけを保持してmainへ戻す', () => {
  const initial = createLiveDeckBoardState([1001, 1002, 1003], []);
  const split = splitLiveTokenCardDeck(createLiveTokenCardDeckState(5), initial, cards, [2], 5);
  const used = moveLiveHandCardToGraveyard(moveLiveDeckCardToHand(split.deckBoard, 1002), 1002);
  const hand = moveLiveDeckCardToHand(used, 1003);
  const switched = switchLiveTokenCardDeck(split.state, hand);
  const merged = mergeLiveTokenCardDeck(reconcileLiveTokenCardDeckHandTarget(switched, hand), hand);

  expect(merged.state.subDeckCardInstanceIds).toBeNull();
  expect(merged.state.tokenCardSeriesIds).toBeNull();
  expect(merged.state.handTargetCounts).toEqual({ current: 2, main: 5, sub: 5 });
  expect(merged.deckBoard.cards[1]?.boardState).toBe(liveBoardState.graveyard);
  expect(merged.deckBoard.cards[2]?.boardState).toBe(liveBoardState.deck);
});

test('指定系列の生成カードをsub deckへ追加する', () => {
  const split = splitLiveTokenCardDeck(
    createLiveTokenCardDeckState(5),
    createLiveDeckBoardState([1001, 1002, 1003], []),
    cards,
    [2],
    5,
  );
  const state = switchLiveTokenCardDeck(split.state, split.deckBoard);

  expect(
    addLiveTokenCardDeckCard(state, { cardInstanceId: 1004, tokenCardSeriesIds: [2] })
      .subDeckCardInstanceIds,
  ).toEqual([1002, 1003, 1004]);
});

test('切替後の手札調整はruntimeと同じ差分補正とdeck枚数上限を適用する', () => {
  const initial = createLiveDeckBoardState([1001, 1002, 1003], [1001]);
  const split = splitLiveTokenCardDeck(createLiveTokenCardDeckState(5), initial, cards, [2], 5);
  const switched = switchLiveTokenCardDeck(split.state, split.deckBoard);

  expect(switched.currentDeck).toBe('sub');
  expect(switched.handTargetCounts).toEqual({ current: 5, main: 5, sub: 5 });
  expect(reconcileLiveTokenCardDeckHandTarget(switched, split.deckBoard).handTargetCounts).toEqual({
    current: 2,
    main: 5,
    sub: 5,
  });
});

test('current sub deckのDeckが空ならsub deckのGraveyardだけをreloadする', () => {
  const initial = createLiveDeckBoardState([1001, 1002, 1003], [1001, 1002, 1003]);
  const split = splitLiveTokenCardDeck(createLiveTokenCardDeckState(5), initial, cards, [2], 5);
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
  const split = splitLiveTokenCardDeck(createLiveTokenCardDeckState(5), initial, cards, [2], 5);
  const switched = switchLiveTokenCardDeck(split.state, split.deckBoard);
  const used = moveLiveHandCardToGraveyard(moveLiveDeckCardToHand(split.deckBoard, 1002), 1002);
  const reloaded = reloadLiveCurrentDeckCards(switched, { ...used, deckOutCount: 2 });
  expect(reloaded.deckOutCount).toBe(2);
  expect(reloaded.cards[1]?.boardState).toBe(liveBoardState.deck);
});

for (const currentDeck of ['main', 'sub'] as const) {
  test(`生成カードは現在の${currentDeck}表示ではなく分割系列で所属を決める`, () => {
    const split = splitLiveTokenCardDeck(
      createLiveTokenCardDeckState(5),
      createLiveDeckBoardState([1001, 1002, 1003], []),
      cards,
      [2],
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
    initialCardCount: 3,
    currentDeck: 'main' as const,
    subDeckCardInstanceIds: ['sub'],
    tokenCardSeriesIds: [2],
    handTargetCounts: { current: 3, main: 3, sub: 3 },
  };
  expect(
    addLiveTokenCardDeckCard(state, { cardInstanceId: 'new', tokenCardSeriesIds: [2] })
      .subDeckCardInstanceIds,
  ).toEqual(['sub', 'new']);
});

test('初期化は両手札の前回目標と現在目標を初期枚数へそろえる', () => {
  expect(createLiveTokenCardDeckState(3)).toMatchObject({
    initialCardCount: 3,
    handTargetCounts: { current: 3, main: 3, sub: 3 },
  });
});

test('分割前の上限変更でデッキ別の前回目標を上書きしない', () => {
  const initial = createLiveDeckBoardState([1001, 1002, 1003], []);
  const split = splitLiveTokenCardDeck(createLiveTokenCardDeckState(3), initial, cards, [2], 7);
  expect(split.state.handTargetCounts).toEqual({ current: 7, main: 3, sub: 3 });
});

test('切替は退出側の前回目標を保存し、入側の超過手札だけ現在目標へ加える', () => {
  const ids = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
  const identities = ids.map((cardInstanceId) => ({
    cardInstanceId,
    tokenCardSeriesIds: cardInstanceId > 8 ? [2] : [],
  }));
  const board = createLiveDeckBoardState(ids, [1, 2, 3]);
  const split = splitLiveTokenCardDeck(createLiveTokenCardDeckState(3), board, identities, [2], 6);
  let prepared = split.deckBoard;
  for (const id of [9, 10, 11, 12, 13]) prepared = moveLiveDeckCardToHand(prepared, id);
  const switched = switchLiveTokenCardDeck(split.state, prepared);
  expect(switched.handTargetCounts).toEqual({ current: 6, main: 6, sub: 3 });
  const sub = reconcileLiveTokenCardDeckHandTarget(switched, prepared);
  expect(sub.handTargetCounts).toEqual({ current: 8, main: 6, sub: 3 });
  const main = reconcileLiveTokenCardDeckHandTarget(
    switchLiveTokenCardDeck(sub, prepared),
    prepared,
  );
  expect(main.handTargetCounts).toEqual({ current: 8, main: 6, sub: 8 });
  const merged = mergeLiveTokenCardDeck(main, prepared);
  expect(merged.state.initialCardCount).toBe(3);
  expect(merged.state.handTargetCounts).toEqual(main.handTargetCounts);
  const again = splitLiveTokenCardDeck(merged.state, merged.deckBoard, identities, [2], 4);
  expect(again.state.handTargetCounts).toEqual({ current: 4, main: 6, sub: 8 });
});

test('切替先の能力が変更した現在目標へ、入側の超過枚数を加える', () => {
  const ids = Array.from({ length: 16 }, (_, index) => index + 1);
  const identities = ids.map((cardInstanceId) => ({
    cardInstanceId,
    tokenCardSeriesIds: cardInstanceId > 8 ? [2] : [],
  }));
  const split = splitLiveTokenCardDeck(
    createLiveTokenCardDeckState(3),
    createLiveDeckBoardState(ids, [1, 2, 3]),
    identities,
    [2],
    6,
  );
  let board = split.deckBoard;
  for (const id of [9, 10, 11, 12, 13]) board = moveLiveDeckCardToHand(board, id);
  const switched = switchLiveTokenCardDeck(split.state, board);
  const activated = {
    ...switched,
    handTargetCounts: { ...switched.handTargetCounts, current: 4 },
  };
  expect(reconcileLiveTokenCardDeckHandTarget(activated, board).handTargetCounts).toEqual({
    current: 6,
    main: 6,
    sub: 3,
  });
});
