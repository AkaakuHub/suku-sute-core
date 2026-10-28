import { createLiveTokenCardDeckState } from '../../src/runtime/cards/tokenCardDeck.ts';
import { expect, test } from 'vite-plus/test';
import {
  createLiveDeckBoardState,
  liveBoardState,
  moveLiveHandCardToExtra,
  moveLiveHandCardToExtra2,
  setLiveCardSkillUseAtBoardState,
} from '../../src/runtime/cards/deckBoardState.ts';
import { applyLiveAllHandSkillReshuffle } from '../../src/runtime/cards/reshuffle.ts';

for (const stashType of ['deck', 'graveyard'] as const) {
  test(`全手札使用中の引き直しは実際の盤面を動かさず${stashType}への指定を扱う`, () => {
    const ids = [1001, 1002, 1003, 1004, 1005];
    let state = moveLiveHandCardToExtra(createLiveDeckBoardState(ids, ids), 1001);
    state = moveLiveHandCardToExtra2(state, 1002);
    state = setLiveCardSkillUseAtBoardState(state, 1003, liveBoardState.exclusion);
    state = setLiveCardSkillUseAtBoardState(state, 1004, liveBoardState.proxy);
    const next = applyLiveAllHandSkillReshuffle(state, createLiveTokenCardDeckState(5), ids, {
      cardInstanceId: 1002,
      skillMainEffect: 13,
      countDeckOut: true,
      effect: { recoveryType: 'recovery', stashType },
    });
    expect(next.deckBoard.cards.map((card) => card.boardState)).toEqual([5, 6, 2, 2, 2]);
    expect(next.deckBoard.cards.map((card) => card.skillUseAtBoardState)).toEqual(
      stashType === 'deck' ? [1, 3, 4, 7, 1] : [3, 3, 4, 7, 3],
    );
    expect(next.deckBoard.deckOutCount).toBe(0);
    expect(next.state.allHandSkillDeckReload).toBe(true);
  });
}
