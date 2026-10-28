import { expect, test } from 'vite-plus/test';
import {
  addLiveHandCard,
  createLiveDeckHandsState,
  createLiveHandState,
  liveCurrentHandCardInstanceIds,
  removeLiveHandCard,
  setLiveCurrentHandCards,
} from '../../src/runtime/cards/liveHand.ts';

test('位置を保持して抜いたカードの枠へ補充する', () => {
  const initial = createLiveHandState([30, 10, 20]);
  const removed = removeLiveHandCard(initial, 1, false);
  expect(removed.handCards).toEqual([30, null, 20, null, null, null, null, null]);
  expect(removed.handCount).toBe(2);
  const refilled = addLiveHandCard(removed, 1, 40);
  expect(refilled.handCards).toEqual([30, 40, 20, null, null, null, null, null]);
  expect(refilled.handCount).toBe(3);
  expect(initial.handCards).toEqual([30, 10, 20, null, null, null, null, null]);
});

test('詰めて抜く操作は後続カードの相対順を維持し最後の枠を空にする', () => {
  const removed = removeLiveHandCard(createLiveHandState([30, 10, 20, 40]), 1, true);
  expect(removed.handCards).toEqual([30, 20, 40, null, null, null, null, null]);
  expect(removed.handCount).toBe(3);
});

test('メインとサブの順序を個別に保持し、切替後の変更は選択中の手札だけに反映する', () => {
  const initial = {
    liveHands: createLiveDeckHandsState<string>(['third', 'first', 'second']),
    tokenCardDeck: { currentDeck: 'main' as const },
  };
  const sub = setLiveCurrentHandCards(
    { ...initial, tokenCardDeck: { currentDeck: 'sub' as const } },
    ['sixth', 'fourth'],
  );
  expect(liveCurrentHandCardInstanceIds(sub)).toEqual(['sixth', 'fourth']);
  expect(sub.liveHands.main).toBe(initial.liveHands.main);
  const main = { ...sub, tokenCardDeck: { currentDeck: 'main' as const } };
  expect(liveCurrentHandCardInstanceIds(main)).toEqual(['third', 'first', 'second']);
  expect(
    liveCurrentHandCardInstanceIds({ ...main, tokenCardDeck: { currentDeck: 'sub' } }),
  ).toEqual(['sixth', 'fourth']);
});

test('満杯の手札は末尾を抜いて同じ枠へ追加できる', () => {
  const initial = createLiveHandState([8, 7, 6, 5, 4, 3, 2, 1]);
  const result = addLiveHandCard(removeLiveHandCard(initial, 7, true), 7, 9);
  expect(result.handCards).toEqual([8, 7, 6, 5, 4, 3, 2, 9]);
  expect(result.handCount).toBe(8);
});

test('範囲外、空の削除、占有枠への追加、同一個体の二重登録を拒否する', () => {
  const initial = createLiveHandState([1]);
  expect(() => removeLiveHandCard(initial, 8, true)).toThrow();
  expect(() => removeLiveHandCard(initial, -1, false)).toThrow();
  expect(() => removeLiveHandCard(initial, 0.5, false)).toThrow();
  expect(() => removeLiveHandCard(initial, 1, false)).toThrow();
  expect(() => addLiveHandCard(initial, 0, 2)).toThrow();
  expect(() => addLiveHandCard(initial, 1, 1)).toThrow();
  expect(() => createLiveHandState([1, 1])).toThrow();
  expect(() => createLiveHandState([1, 2, 3, 4, 5, 6, 7, 8, 9])).toThrow();
});

test('未確定の手札を空配列として読み書きしない', () => {
  const state = { liveHands: null, tokenCardDeck: { currentDeck: 'main' as const } };
  expect(() => liveCurrentHandCardInstanceIds(state)).toThrow('unresolved');
  expect(() => setLiveCurrentHandCards(state, [])).toThrow('unresolved');
});
