import { expect, test } from 'vite-plus/test';
import {
  createLiveDeckBoardState,
  liveBoardState,
  moveLiveHandCardToGraveyard,
} from '../../src/runtime/cards/deckBoardState.ts';
import { prepareLiveDeckDraw } from '../../src/runtime/cards/deckDraw.ts';

for (const hasGraveyard of [false, true]) {
  test(`山札の全確率が0なら墓地の有無によらず候補がある再読み込みを数える:${hasGraveyard}`, () => {
    const board = createLiveDeckBoardState([1001, 1002], [1002]);
    const initial = hasGraveyard ? moveLiveHandCardToGraveyard(board, 1002) : board;
    const result = prepareLiveDeckDraw(initial, [1001, 1002], () => 0);
    expect(result.deckOutCount).toBe(1);
    expect(result.cards[0]?.boardState).toBe(liveBoardState.deck);
    expect(result.cards[1]?.boardState).toBe(
      hasGraveyard ? liveBoardState.deck : liveBoardState.hand,
    );
  });
}

test('優先抽選の負の確率も候補があれば再読み込みしない', () => {
  const initial = createLiveDeckBoardState([1001], []);
  expect(prepareLiveDeckDraw(initial, [1001], () => -1)).toBe(initial);
});

test('対象外の山札と墓地を再読み込み判定に混ぜない', () => {
  const board = createLiveDeckBoardState([1001, 1002], [1002]);
  const initial = moveLiveHandCardToGraveyard(board, 1002);
  const result = prepareLiveDeckDraw(initial, [1002], () => 10_000);
  expect(result.cards.map((card) => card.boardState)).toEqual([1, 1]);
  expect(result.deckOutCount).toBe(1);
});

test('文字列IDでも全確率0の再読み込みとint32カウンターを使う', () => {
  const board = {
    cards: [
      {
        cardInstanceId: 'a',
        cardDatasId: 'a',
        boardState: liveBoardState.deck,
        skillUseAtBoardState: liveBoardState.graveyard,
      },
    ],
    nextCardInstanceId: 1,
    deckOutCount: 2_147_483_647,
    skillCardSearchParams: [],
  };
  expect(prepareLiveDeckDraw(board, ['a'], () => 0).deckOutCount).toBe(-2_147_483_648);
});
