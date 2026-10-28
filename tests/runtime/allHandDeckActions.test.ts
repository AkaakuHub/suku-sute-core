import { addLiveHandCardTargetCount } from '../../src/runtime/cards/handCardTarget.ts';
import { expect, test } from 'vite-plus/test';
import {
  beginLiveAllHandSkill,
  enqueueLiveAllHandDraw,
  executeLiveAllHandDraw,
} from '../../src/runtime/cards/allHandDeckActions.ts';
import { createLiveDeckActionQueueState } from '../../src/runtime/cards/deckActionQueue.ts';
import { createLiveDeckBoardState } from '../../src/runtime/cards/deckBoardState.ts';
import { createLiveTokenCardDeckState } from '../../src/runtime/cards/tokenCardDeck.ts';
import { flushLiveDeckActions } from '../../src/runtime/cards/deckActionQueue.ts';
import { notifyLiveHandCardCountReset } from '../../src/runtime/cards/handCardCountReset.ts';

const source = { cardInstanceId: 1, charactersId: 1001, unitIds: [101] };

function setup() {
  return {
    tokenCardDeck: { ...createLiveTokenCardDeckState(5), allHandSkillDeckReload: true },
    deckActions: createLiveDeckActionQueueState(),
    deckBoard: createLiveDeckBoardState([1, 2, 3, 4, 5, 6], [1, 2]),
    events: [] as readonly string[],
  };
}

test('開始時にnative実行フラグを立て、前回の回収指定を解除する', () => {
  const started = beginLiveAllHandSkill(setup());
  expect(started.tokenCardDeck.isAllHandSkill).toBe(true);
  expect(started.tokenCardDeck.allHandSkillDeckReload).toBe(false);
});

test('補充actionは実際の使用元カードを保持し、終了actionより先に実行する', () => {
  const queued = enqueueLiveAllHandDraw(beginLiveAllHandSkill(setup()), source);
  expect(queued.deckActions.queue.map((action) => action.type)).toEqual([7, 8]);
  const drawn = executeLiveAllHandDraw(queued, (state, card) => {
    expect(card).toBe(source);
    expect(state.deckActions.currentAction?.type).toBe(7);
    expect(state.tokenCardDeck.isAllHandSkill).toBe(true);
    const pending = notifyLiveHandCardCountReset(state, -1);
    expect(
      flushLiveDeckActions(pending, () => {
        throw new Error('補充中に解除を処理しました');
      }),
    ).toBe(pending);
    return { ...pending, events: ['draw'] };
  });
  expect(drawn.tokenCardDeck.isAllHandSkill).toBe(true);
  const completed = flushLiveDeckActions(drawn, (state) => ({
    ...state,
    events: [...state.events, 'reset'],
  }));
  expect(completed.events).toEqual(['draw', 'reset']);
  expect(completed.tokenCardDeck.isAllHandSkill).toBe(false);
  expect(completed.tokenCardDeck.handTargetCounts.current).toBe(4);
});

test('補充前に蓄積した解除待機量は補充後の終了までraw目標へ反映しない', () => {
  const notified = notifyLiveHandCardCountReset(beginLiveAllHandSkill(setup()), 1);
  const queued = enqueueLiveAllHandDraw(notified, source);
  const ready = flushLiveDeckActions(queued, () => {
    throw new Error('補充前に解除を処理しました');
  });
  expect(ready.tokenCardDeck.resetCount).toBe(1);
  expect(ready.tokenCardDeck.handTargetCounts.current).toBe(5);
  const drawn = executeLiveAllHandDraw(ready, (state) => {
    expect(state.tokenCardDeck.handTargetCounts.current).toBe(5);
    return state;
  });
  const completed = flushLiveDeckActions(drawn, (state) => state);
  expect(completed.tokenCardDeck.handTargetCounts.current).toBe(6);
  expect(completed.tokenCardDeck.resetCount).toBe(0);
});

test('全手札使用中の枚数加算は最大化中でも現在目標を8へ戻さず、保存目標も更新する', () => {
  const base = setup();
  const started = beginLiveAllHandSkill(base);
  const changed = addLiveHandCardTargetCount(
    {
      ...started.tokenCardDeck,
      maxHandSkillActiveCount: 1,
      handMaxCardSkillInfo: { targetHandCount: 4 },
    },
    -1,
  );
  expect(changed.handTargetCounts.current).toBe(4);
  expect(changed.handMaxCardSkillInfo?.targetHandCount).toBe(3);
});
