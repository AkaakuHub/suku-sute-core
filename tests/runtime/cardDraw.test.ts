import { expect, test } from 'vite-plus/test';
import { selectLiveDrawCandidate } from '../../src/runtime/cards/cardDraw.ts';

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
