import { expect, test } from 'vite-plus/test';
import {
  createLiveDeckBoardState,
  moveLiveHandCardToExtra,
  moveLiveHandCardToExtra2,
  liveBoardState,
} from '../../src/runtime/cards/deckBoardState.ts';
import { resolveLiveUseAllHandCardInstanceIds } from '../../src/runtime/cards/useAllHandSkill.ts';

test('ActionType42は発動元を除く現在の手札を順番どおりExtra2へ移す', () => {
  const sourceUsed = moveLiveHandCardToExtra(
    createLiveDeckBoardState([1001, 1002, 1003, 1004], [1001, 1002, 1003]),
    1002,
  );

  const cardInstanceIds = resolveLiveUseAllHandCardInstanceIds([1001, 1002, 1003], 1002);
  const deckBoard = cardInstanceIds.reduce(
    (current, cardInstanceId) => moveLiveHandCardToExtra2(current, cardInstanceId),
    sourceUsed,
  );

  expect(cardInstanceIds).toEqual([1001, 1003]);
  expect(deckBoard.cards).toEqual([
    {
      cardInstanceId: 1001,
      cardDatasId: 1001,
      boardState: liveBoardState.extra2,
    },
    {
      cardInstanceId: 1002,
      cardDatasId: 1002,
      boardState: liveBoardState.extra,
    },
    {
      cardInstanceId: 1003,
      cardDatasId: 1003,
      boardState: liveBoardState.extra2,
    },
    {
      cardInstanceId: 1004,
      cardDatasId: 1004,
      boardState: liveBoardState.deck,
    },
  ]);
});
