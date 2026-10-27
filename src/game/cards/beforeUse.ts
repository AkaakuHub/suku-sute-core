import type { Card, GameState } from '../model.ts';
import { applyEffect } from '../effects.ts';
import { moodValue } from '../projection.ts';

export function applyBeforeUseAbility(state: GameState, card: Card): GameState {
  let next = (card.beforeUseEffects ?? []).reduce(
    (current, effect) => applyEffect(current, effect, card),
    state,
  );
  const count = state.cardUseCounts[card.id] ?? 0;
  if (card.beforeUseAbility === 'story-boost') {
    const size = state.deck.length;
    const percent =
      size >= 100
        ? 1001
        : size >= 80
          ? 700
          : size >= 60
            ? 500
            : size >= 40
              ? 300
              : size >= 20
                ? 200
                : 100;
    next = {
      ...next,
      storyAmplification: Math.fround(
        next.storyAmplification + percent + Math.max(0, moodValue(next)) * percent * 0.005,
      ),
    };
  }
  if (card.beforeUseAbility === 'rain-echo' && count === 1)
    next = applyEffect(next, { kind: 'tokens', token: 'shadow', count: 1 }, card);
  return next;
}
