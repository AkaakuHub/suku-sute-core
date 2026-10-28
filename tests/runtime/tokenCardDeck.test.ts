import { expect, test } from 'vite-plus/test';
import {
  createLiveDeckBoardState,
  moveLiveDeckCardToHand,
  moveLiveHandCardToGraveyard,
  liveBoardState,
} from '../../src/runtime/cards/deckBoardState.ts';
import {
  addLiveTokenCardDeckCard,
  addLiveHandCardTargetCount,
  createLiveTokenCardDeckState,
  mergeLiveTokenCardDeck,
  prepareLiveCurrentDeckDraw,
  reloadLiveCurrentDeckCards,
  liveSwitchDeckHandCardCount,
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
  const split = splitLiveTokenCardDeck(createLiveTokenCardDeckState(5), board, cards, [2]);
  const switched = switchLiveTokenCardDeck(split.state, split.deckBoard);

  expect(split.deckBoard.cards[1]?.boardState).toBe(liveBoardState.deck);
  expect(
    liveCurrentDeckBoardCardInstanceIds(switched, split.deckBoard, liveBoardState.deck),
  ).toEqual([1002, 1003]);
});

test('MergeDeckはsub deckのGraveyardだけを保持してmainへ戻す', () => {
  const initial = createLiveDeckBoardState([1001, 1002, 1003], []);
  const split = splitLiveTokenCardDeck(createLiveTokenCardDeckState(5), initial, cards, [2]);
  const used = moveLiveHandCardToGraveyard(moveLiveDeckCardToHand(split.deckBoard, 1002), 1002);
  const hand = moveLiveDeckCardToHand(used, 1003);
  const switched = switchLiveTokenCardDeck(split.state, hand);
  const merged = mergeLiveTokenCardDeck(switched, hand);

  expect(merged.state.subDeckCardInstanceIds).toBeNull();
  expect(merged.state.tokenCardSeriesIds).toBeNull();
  expect(merged.state.handTargetCounts).toEqual({ current: 5, main: 5, sub: 5 });
  expect(merged.deckBoard.cards[1]?.boardState).toBe(liveBoardState.graveyard);
  expect(merged.deckBoard.cards[2]?.boardState).toBe(liveBoardState.deck);
});

test('指定系列の生成カードをsub deckへ追加する', () => {
  const split = splitLiveTokenCardDeck(
    createLiveTokenCardDeckState(5),
    createLiveDeckBoardState([1001, 1002, 1003], []),
    cards,
    [2],
  );
  const state = switchLiveTokenCardDeck(split.state, split.deckBoard);

  expect(
    addLiveTokenCardDeckCard(state, { cardInstanceId: 1004, tokenCardSeriesIds: [2] })
      .subDeckCardInstanceIds,
  ).toEqual([1002, 1003, 1004]);
});

test('切替後の手札調整はruntimeと同じ差分補正とdeck枚数上限を適用する', () => {
  const initial = createLiveDeckBoardState([1001, 1002, 1003], [1001]);
  const split = splitLiveTokenCardDeck(createLiveTokenCardDeckState(5), initial, cards, [2]);
  const switched = switchLiveTokenCardDeck(split.state, split.deckBoard);

  expect(switched.currentDeck).toBe('sub');
  expect(switched.handTargetCounts).toEqual({ current: 5, main: 5, sub: 5 });
  expect(liveSwitchDeckHandCardCount(switched, split.deckBoard)).toBe(2);
  expect(switched.handTargetCounts.current).toBe(5);
});

test('current sub deckのDeckが空ならsub deckのGraveyardだけをreloadする', () => {
  const initial = createLiveDeckBoardState([1001, 1002, 1003], [1001, 1002, 1003]);
  const split = splitLiveTokenCardDeck(createLiveTokenCardDeckState(5), initial, cards, [2]);
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
  const split = splitLiveTokenCardDeck(createLiveTokenCardDeckState(5), initial, cards, [2]);
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

test('分割は現在目標と両デッキの前回目標を変更しない', () => {
  const initial = createLiveDeckBoardState([1001, 1002, 1003], []);
  const state = {
    ...createLiveTokenCardDeckState(3),
    handTargetCounts: { current: 9, main: 3, sub: 3 },
  };
  const split = splitLiveTokenCardDeck(state, initial, cards, [2]);
  expect(split.state.handTargetCounts).toEqual({ current: 9, main: 3, sub: 3 });
});

function preparedDeck(current = 6) {
  const ids = Array.from({ length: 16 }, (_, index) => index + 1);
  const identities = ids.map((cardInstanceId) => ({
    cardInstanceId,
    tokenCardSeriesIds: cardInstanceId > 8 ? [2] : [],
  }));
  const split = splitLiveTokenCardDeck(
    { ...createLiveTokenCardDeckState(3), handTargetCounts: { current, main: 3, sub: 3 } },
    createLiveDeckBoardState(ids, [1, 2, 3]),
    identities,
    [2],
  );
  let board = split.deckBoard;
  for (const id of [9, 10, 11, 12, 13]) board = moveLiveDeckCardToHand(board, id);
  return { state: switchLiveTokenCardDeck(split.state, board), board, identities };
}

test('切替の超過手札は補充要求だけに加え、現在目標や退出時の前回目標へ加えない', () => {
  const { state: sub, board, identities } = preparedDeck();
  expect(liveSwitchDeckHandCardCount(sub, board)).toBe(8);
  expect(sub.handTargetCounts).toEqual({ current: 6, main: 6, sub: 3 });
  const main = switchLiveTokenCardDeck(sub, board);
  expect(liveSwitchDeckHandCardCount(main, board)).toBe(6);
  expect(main.handTargetCounts).toEqual({ current: 6, main: 6, sub: 6 });
  const merged = mergeLiveTokenCardDeck(main, board);
  const again = splitLiveTokenCardDeck(merged.state, merged.deckBoard, identities, [2]);
  expect(again.state.handTargetCounts).toEqual(main.handTargetCounts);
});

test('切替先の能力が変更した現在目標から補充要求を計算し、元の目標を保存する', () => {
  const { state, board } = preparedDeck();
  const activated = {
    ...state,
    handTargetCounts: { ...state.handTargetCounts, current: 4 },
  };
  expect(liveSwitchDeckHandCardCount(activated, board)).toBe(6);
  expect(switchLiveTokenCardDeck(activated, board).handTargetCounts).toEqual({
    current: 4,
    main: 6,
    sub: 4,
  });
});

for (const [target, actual] of [
  [-4, 3],
  [9, 8],
  [2147483647, 3],
] as const) {
  test(`現在目標${target}を保持し、実際の調整枚数だけ${actual}へ制限する`, () => {
    const { state, board } = preparedDeck(target);
    expect(liveSwitchDeckHandCardCount(state, board)).toBe(actual);
    expect(switchLiveTokenCardDeck(state, board).handTargetCounts.sub).toBe(target);
  });
}

test('補正した要求が実手札数と等しければ最低枚数への補充を行わない', () => {
  const board = createLiveDeckBoardState([1, 2, 3, 4], [1, 2]);
  const state = {
    ...createLiveTokenCardDeckState(3),
    handTargetCounts: { current: 2, main: 3, sub: 3 },
  };
  expect(liveSwitchDeckHandCardCount(state, board)).toBe(2);
});

test('手札目標の加算は制限前のint32値を保持する', () => {
  const base = createLiveTokenCardDeckState(5);
  const expanded = addLiveHandCardTargetCount(base, 4);
  expect(expanded.handTargetCounts).toEqual({ current: 9, main: 5, sub: 5 });
  const compressed = addLiveHandCardTargetCount(expanded, -13);
  expect(compressed.handTargetCounts).toEqual({ current: -4, main: 5, sub: 5 });
  expect(addLiveHandCardTargetCount(compressed, -2147483648).handTargetCounts.current).toBe(
    2147483644,
  );
});
