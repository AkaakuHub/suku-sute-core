import { expect, test } from 'vite-plus/test';
import {
  clearLiveCardSkillActivatedFlags,
  liveCardSkillActivatedFlags,
  liveCardSkipsHandCardDraw,
  markLiveCardHandCountActivated,
  markLiveCardReshuffleActivated,
} from '../../../src/runtime/cards/cardSkillActivatedFlags.ts';
import {
  createLiveDeckBoardState,
  moveLiveHandCardToExtra,
} from '../../../src/runtime/cards/deckBoardState.ts';
import { createLiveDeckHandsState } from '../../../src/runtime/cards/liveHand.ts';
import { createLiveTokenCardDeckState } from '../../../src/runtime/cards/tokenCardDeck.ts';
import {
  createLiveDeckActionQueueState,
  enqueueLiveReshuffle,
} from '../../../src/runtime/cards/deckActionQueue.ts';

function runtime(count = 5, target = 5) {
  const cards = Array.from({ length: count }, (_, index) => index + 1);
  return {
    deckBoard: createLiveDeckBoardState(cards, cards),
    liveHands: createLiveDeckHandsState(cards),
    tokenCardDeck: createLiveTokenCardDeckState(target),
    deckActions: createLiveDeckActionQueueState(),
  };
}

test('引き直しの予約を消しても発動元カードのフラグは保持する', () => {
  const queued = enqueueLiveReshuffle(runtime(), {
    cardInstanceId: 1,
    usedSkill: null,
    countDeckOut: true,
    effect: { recoveryType: 'no-recovery', stashType: 'graveyard' },
  });
  const state = { ...queued, deckActions: createLiveDeckActionQueueState() };
  expect(liveCardSkipsHandCardDraw(state, 1)).toBe(true);
  expect(liveCardSkipsHandCardDraw(state, 2)).toBe(false);
  const cleared = { ...state, deckBoard: clearLiveCardSkillActivatedFlags(state.deckBoard, 1) };
  expect(liveCardSkipsHandCardDraw(cleared, 1)).toBe(false);
});

test('最後の非ゼロ変更量の符号をカード単位で保持し、ゼロでは上書きしない', () => {
  const state = runtime();
  const positive = markLiveCardHandCountActivated(state.deckBoard, 1, 2);
  const negative = markLiveCardHandCountActivated(positive, 1, -1);
  expect(markLiveCardHandCountActivated(negative, 1, 0)).toBe(negative);
  expect(liveCardSkipsHandCardDraw({ ...state, deckBoard: negative }, 1)).toBe(true);
  expect(liveCardSkipsHandCardDraw({ ...state, deckBoard: negative }, 2)).toBe(false);
  const restored = markLiveCardHandCountActivated(negative, 1, 1);
  expect(liveCardSkipsHandCardDraw({ ...state, deckBoard: restored }, 1)).toBe(false);
});

test('使用中のカードを含むraw手札枚数で補充を判定する', () => {
  const state = runtime(5, 4);
  expect(
    liveCardSkipsHandCardDraw(
      { ...state, deckBoard: moveLiveHandCardToExtra(state.deckBoard, 1) },
      1,
    ),
  ).toBe(true);
  expect(liveCardSkipsHandCardDraw(runtime(3, 1), 1)).toBe(false);
});

test('次の使用開始では3つのフラグをすべて解除する', () => {
  const state = runtime();
  const marked = markLiveCardHandCountActivated(
    markLiveCardReshuffleActivated(state.deckBoard, 1),
    1,
    1,
  );
  expect(liveCardSkillActivatedFlags(clearLiveCardSkillActivatedFlags(marked, 1), 1)).toMatchObject(
    {
      skillReshuffleActivated: false,
      skillChangeHandCardCountActivated: false,
      skillChangeHandCardCountIsPositive: false,
    },
  );
  expect(() => clearLiveCardSkillActivatedFlags(state.deckBoard, 99)).toThrow();
  expect(() => liveCardSkipsHandCardDraw({ ...state, liveHands: null }, 1)).toThrow();
});
