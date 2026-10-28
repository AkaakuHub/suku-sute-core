import { expect, test } from 'vite-plus/test';
import {
  createLiveDeckBoardState,
  moveLiveHandCardToExtra,
  moveLiveHandCardToExtra2,
  liveBoardState,
} from '../../src/runtime/cards/deckBoardState.ts';
import {
  calculateLiveAllHandSkillCost,
  resolveLiveUseAllHandCardInstanceIds,
} from '../../src/runtime/cards/useAllHandSkill.ts';

test('一斉発動は親の基本コストと追加AP、子の補正後コストを合計して親の補正を最後に適用する', () => {
  expect(
    calculateLiveAllHandSkillCost(
      [
        { kind: 'source', baseCost: 2.9 },
        { kind: 'other', skillCost: 4 },
      ],
      3,
      (total) => total - 1.5,
    ),
  ).toBe(7);
});

test('一斉発動の親補正ではFloat32へ丸めずdoubleの計算結果を整数化する', () => {
  expect(
    calculateLiveAllHandSkillCost(
      [
        { kind: 'source', baseCost: 16_777_216 },
        { kind: 'other', skillCost: 1 },
      ],
      0,
      (total) => total + 0.25,
    ),
  ).toBe(16_777_217);
});

test('一斉発動のコスト合計はint32で折り返し、最後に最低1へ制限する', () => {
  expect(
    calculateLiveAllHandSkillCost(
      [
        { kind: 'source', baseCost: 2_147_483_647 },
        { kind: 'other', skillCost: 1 },
      ],
      0,
      (total) => total,
    ),
  ).toBe(1);
  expect(calculateLiveAllHandSkillCost([], 0, () => -5)).toBe(1);
});

test('一斉発動の最終整数変換は有限の範囲外を飽和させ、正のInfinityをint.MinValueへ変換する', () => {
  expect(calculateLiveAllHandSkillCost([], 0, () => 3_000_000_000)).toBe(2_147_483_647);
  expect(calculateLiveAllHandSkillCost([], 0, () => Number.POSITIVE_INFINITY)).toBe(1);
});

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
