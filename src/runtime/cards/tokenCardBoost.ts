import type { LiveSkillEffectClock } from '../skills/skillEffectDuration.ts';
import {
  type LiveAdditionalBuffCard,
  liveAdditionalBuffTargetMatches,
  validateLiveAdditionalBuffCard,
} from '../skills/additionalBuffTarget.ts';
import type { LiveBoostTokenCardEffect, LiveTokenCardEffect } from './deckActionTypes.ts';
import { advanceLiveSkillEffectDuration } from '../skills/skillEffectDuration.ts';

export type LiveTokenCardBoostState = Readonly<{
  effects: readonly LiveBoostTokenCardEffect[];
}>;

type LiveTokenCardSource = Omit<LiveAdditionalBuffCard, 'skillTokenCardSeriesIds'>;

export function createLiveTokenCardBoostState(): LiveTokenCardBoostState {
  return { effects: [] };
}

export function activateLiveTokenCardBoost(
  state: LiveTokenCardBoostState,
  effect: LiveBoostTokenCardEffect,
): LiveTokenCardBoostState {
  validateState(state);
  return { effects: [...state.effects, effect] };
}

export function advanceLiveTokenCardBoostState(
  state: LiveTokenCardBoostState,
  input: LiveSkillEffectClock,
): LiveTokenCardBoostState {
  validateState(state);
  return {
    effects: state.effects.flatMap((effect) => {
      const duration = advanceLiveSkillEffectDuration(effect.duration, input);
      return duration === null ? [] : [{ ...effect, duration }];
    }),
  };
}

export function applyLiveTokenCardBoosts(
  state: LiveTokenCardBoostState,
  source: LiveTokenCardSource,
  tokenCard: Pick<LiveTokenCardEffect, 'cardCount' | 'tokenCardSeriesIds'>,
): Readonly<{ state: LiveTokenCardBoostState; cardCount: number }> {
  validateState(state);
  const sourceWithSkillToken: LiveAdditionalBuffCard = {
    ...source,
    skillTokenCardSeriesIds: tokenCard.tokenCardSeriesIds,
  };
  validateLiveAdditionalBuffCard(sourceWithSkillToken);
  if (!Number.isSafeInteger(tokenCard.cardCount) || tokenCard.cardCount < 0) {
    throw new Error('Live TokenCard count is invalid');
  }
  if (tokenCard.cardCount === 0) return { state, cardCount: 0 };
  const matchingEffects = new Set(
    state.effects.filter((effect) =>
      liveAdditionalBuffTargetMatches(effect.target, sourceWithSkillToken, [
        effect.tokenCardSeriesId,
      ]),
    ),
  );
  let cardCount = Math.fround(tokenCard.cardCount);
  for (const effect of state.effects) {
    if (!matchingEffects.has(effect)) continue;
    const value = Math.fround(effect.amount / 10_000);
    cardCount = Math.fround(effect.calculation === 'add' ? cardCount + value : cardCount * value);
  }
  return {
    cardCount: Math.trunc(cardCount),
    state: {
      effects: state.effects.flatMap((effect) => {
        if (!matchingEffects.has(effect) || effect.disabled.kind === 'none') {
          return [effect];
        }
        const remainingCount = effect.disabled.count - 1;
        return remainingCount < 1
          ? []
          : [
              {
                ...effect,
                disabled: { kind: 'use-count', count: remainingCount },
              },
            ];
      }),
    },
  };
}

function validateState(state: LiveTokenCardBoostState): void {
  if (
    state.effects.some(
      (effect) =>
        !Number.isSafeInteger(effect.amount) ||
        (effect.disabled.kind === 'use-count' &&
          (!Number.isSafeInteger(effect.disabled.count) || effect.disabled.count < 1)),
    )
  ) {
    throw new Error('Live BoostTokenCard state is invalid');
  }
}
