import { expect, test } from 'vite-plus/test';
import {
  selectLiveDeckDrawCandidate,
  selectLiveDrawCandidate,
} from '../../src/runtime/cards/cardDraw.ts';

test('負のdraw probabilityがあれば負の候補だけを一様抽選する', () => {
  const candidates = [
    { cardInstanceId: 1, drawProbability: 10_000 },
    { cardInstanceId: 2, drawProbability: -1 },
    { cardInstanceId: 3, drawProbability: -9_999 },
  ];
  expect(selectLiveDrawCandidate(candidates, () => 1)).toEqual({
    cardInstanceId: 3,
    drawProbability: -9_999,
  });
});

test('正のdraw probabilityを累積値で抽選する', () => {
  const candidates = [
    { cardInstanceId: 1, drawProbability: 2 },
    { cardInstanceId: 2, drawProbability: 3 },
    { cardInstanceId: 3, drawProbability: 0 },
  ];
  expect(selectLiveDrawCandidate(candidates, () => 1)).toEqual({
    cardInstanceId: 1,
    drawProbability: 2,
  });
  expect(selectLiveDrawCandidate(candidates, () => 2)).toEqual({
    cardInstanceId: 2,
    drawProbability: 3,
  });
  expect(selectLiveDrawCandidate(candidates, () => 4)).toEqual({
    cardInstanceId: 2,
    drawProbability: 3,
  });
});

test('抽選対象がなければnullを返す', () => {
  expect(selectLiveDrawCandidate([{ cardInstanceId: 1, drawProbability: 0 }], () => 0)).toBeNull();
});

test('検索候補の確率が0なら検索外の候補も抽選する', () => {
  const searched = { cardInstanceId: 1, drawProbability: 0 };
  const normal = { cardInstanceId: 2, drawProbability: 10_000 };
  expect(selectLiveDeckDrawCandidate([searched, normal], [searched], () => 0)).toEqual(normal);
});

test('全候補の確率が0なら山札全体から一様抽選する', () => {
  const candidates = [
    { cardInstanceId: 1, drawProbability: 0 },
    { cardInstanceId: 2, drawProbability: 0 },
  ];
  const ranges: number[] = [];
  expect(
    selectLiveDeckDrawCandidate(candidates, candidates.slice(0, 1), (maximum) => {
      ranges.push(maximum);
      return 1;
    }),
  ).toEqual(candidates[1]);
  expect(ranges).toEqual([2]);
});

test('文字列IDのドローも同じ検索優先順位と抽選を使う', () => {
  const candidates = [
    { cardInstanceId: 'a', drawProbability: -1 },
    { cardInstanceId: 'b', drawProbability: 1 },
  ];
  expect(selectLiveDeckDrawCandidate(candidates, candidates.slice(1), () => 0)).toEqual(
    candidates[1],
  );
});
