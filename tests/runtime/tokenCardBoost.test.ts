import { expect, test } from 'vite-plus/test';
import type {
  LiveBoostTokenCardEffect,
  LiveTokenCardEffect,
} from '../../src/runtime/cards/deckActionTypes.ts';
import {
  activateLiveTokenCardBoost,
  advanceLiveTokenCardBoostState,
  applyLiveTokenCardBoosts,
  createLiveTokenCardBoostState,
} from '../../src/runtime/cards/tokenCardBoost.ts';

const source = {
  charactersId: 1031,
  unitIds: [103],
  tokenCardSeriesIds: [],
} as const;

test('ActionType38の加算と乗算を登録順に適用して使用回数を消費する', () => {
  const state = activateLiveTokenCardBoost(
    activateLiveTokenCardBoost(
      createLiveTokenCardBoostState(),
      boost({ effectId: 'multiply', calculation: 'multiply', amount: 20_000 }),
    ),
    boost({ effectId: 'add', calculation: 'add', amount: 10_000 }),
  );
  const applied = applyLiveTokenCardBoosts(state, source, token(2));

  expect(applied.cardCount).toBe(5);
  expect(applied.state).toEqual(createLiveTokenCardBoostState());
});

test('ActionType28のcountが0なら追加buffを使用しない', () => {
  const state = activateLiveTokenCardBoost(createLiveTokenCardBoostState(), boost({}));

  expect(applyLiveTokenCardBoosts(state, source, token(0))).toEqual({
    state,
    cardCount: 0,
  });
});

test('skill token series不一致のbuffを保持し、曲終了で解除する', () => {
  const state = activateLiveTokenCardBoost(
    createLiveTokenCardBoostState(),
    boost({ tokenCardSeriesId: 3 }),
  );
  const applied = applyLiveTokenCardBoosts(state, source, token(1));

  expect(applied).toEqual({ state, cardCount: 1 });
  expect(
    advanceLiveTokenCardBoostState(state, {
      deltaTimeSeconds: 10,
      sectionChangeCount: 0,
      musicEnded: true,
    }),
  ).toEqual(createLiveTokenCardBoostState());
});

function token(cardCount: number): LiveTokenCardEffect {
  return {
    effectId: 'token',
    resourceId: 80315231,
    styleType: 2,
    moodType: 3,
    skillCardSkillSeriesId: 80115010,
    abilityCardSkillSeriesId: 90115010,
    cardCount,
    abilityLevelReference: 'none',
    tokenCardSeriesIds: [2],
  };
}

function boost(override: Partial<LiveBoostTokenCardEffect>): LiveBoostTokenCardEffect {
  return {
    effectId: 'boost',
    calculation: 'add',
    amount: 20_000,
    duration: { kind: 'full-end' },
    disabled: { kind: 'use-count', count: 1 },
    target: { kind: 'all' },
    tokenCardSeriesId: 2,
    ...override,
  };
}
