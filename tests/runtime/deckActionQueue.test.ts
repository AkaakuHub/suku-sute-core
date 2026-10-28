import { expect, test } from 'vite-plus/test';
import { createLiveDeckBoardState } from '../../src/runtime/cards/deckBoardState.ts';
import {
  checkLiveDeckOut,
  createLiveDeckActionQueueState,
} from '../../src/runtime/cards/deckActionQueue.ts';

function setup(count: number) {
  return {
    deckBoard: { ...createLiveDeckBoardState([1001], []), deckOutCount: count },
    deckActions: { ...createLiveDeckActionQueueState(), searches: ['retained'] },
    notifications: 0,
  };
}

test('蓄積した再読み込み回数だけ通知した後にカウンターを0にする', () => {
  const seen: number[] = [];
  const result = checkLiveDeckOut(setup(3), (state) => {
    seen.push(state.deckBoard.deckOutCount);
    return { ...state, notifications: state.notifications + 1 };
  });
  expect(seen).toEqual([3, 3, 3]);
  expect(result.notifications).toBe(3);
  expect(result.deckBoard.deckOutCount).toBe(0);
  expect(result.deckActions).toEqual({ queue: [], currentAction: null, searches: ['retained'] });
});

test('通知中に追加された再読み込みも同じ確認で通知する', () => {
  const result = checkLiveDeckOut(setup(1), (state) => ({
    ...state,
    notifications: state.notifications + 1,
    deckBoard: {
      ...state.deckBoard,
      deckOutCount: state.deckBoard.deckOutCount + (state.notifications === 0 ? 1 : 0),
    },
  }));
  expect(result.notifications).toBe(2);
  expect(result.deckBoard.deckOutCount).toBe(0);
});

test('通知中のCheckDeckOut要求は再帰実行せず現在の処理後に実行する', () => {
  const queuedCounts: number[] = [];
  const result = checkLiveDeckOut(setup(2), (state) => {
    const queued = checkLiveDeckOut(state, () => {
      throw new Error('現在の処理中に再帰実行されました');
    });
    queuedCounts.push(queued.deckActions.queue.length);
    return { ...queued, notifications: queued.notifications + 1 };
  });
  expect(queuedCounts).toEqual([1, 2]);
  expect(result.notifications).toBe(2);
  expect(result.deckActions.queue).toEqual([]);
  expect(result.deckActions.currentAction).toBeNull();
  expect(result.deckBoard.deckOutCount).toBe(0);
});

test('再読み込みがない場合は通知しない', () => {
  const initial = setup(0);
  const result = checkLiveDeckOut(initial, () => {
    throw new Error('再読み込みがないのに通知されました');
  });
  expect(result).toEqual(initial);
});
