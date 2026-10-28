import { beginTokenGeneration, finishTokenGeneration } from './tokens.ts';
import type { Card, Effect, GameState } from '../model.ts';
import { applyEffect, skillValue } from '../effects.ts';
import { moodValue } from '../projection.ts';
import { applyApSpeedPercent } from '../effects/apSpeed.ts';
import { handCardCountEffect } from '../actionTypeEffects/handCardCount.ts';

export function applyDrawAbility(state: GameState, card: Card): GameState {
  const drawn = (card.drawEffects ?? []).reduce(
    (next, effect) => applyEffect(next, effect, card),
    beginTokenGeneration(state, card.id),
  );
  return finishTokenGeneration(applyNamedDrawAbility(drawn, card), card.id).state;
}

function applyNamedDrawAbility(state: GameState, card: Card): GameState {
  if (!card.drawAbility) return state;
  const count = state.deck.length;
  const next = state;
  if (card.drawAbility === 'camera' || card.drawAbility === 'perennial') {
    const camera = card.drawAbility === 'camera';
    return {
      ...state,
      costReductions: Object.fromEntries(
        state.deck.map((item) => [
          item.id,
          (state.costReductions[item.id] ?? 0) +
            (camera
              ? 2 + (item.member === 1031 ? 4 : 0)
              : item.member === 1031 || item.member === 1032
                ? 5
                : 0),
        ]),
      ),
    };
  }
  if (card.drawAbility === 'shadow') {
    const effects: readonly Effect[] = [
      { kind: 'mental', amount: -14, moodBonus: { target: 3, perPoint: -0.07 } },
      { kind: 'ap-speed', percent: -14, duration: 'section' },
      handCardCountEffect(-1, 2, 1n),
    ];
    return effects.reduce<GameState>(
      (current, effect) => applyEffect(current, effect, card),
      state,
    );
  }
  if (card.drawAbility === 'genesis') {
    const effects: readonly Effect[] = [
      { kind: 'ap-speed', percent: -10, duration: 'section' },
      { kind: 'voltage', amount: -100, moodBonus: { target: 2, perPoint: -0.5 } },
      { kind: 'mental', amount: -10, moodBonus: { target: 2, perPoint: -0.05 } },
    ];
    return effects.reduce<GameState>(
      (current, effect) => applyEffect(current, effect, card),
      state,
    );
  }
  if (card.drawAbility === 'library') {
    const amount =
      count >= 100
        ? 20
        : count >= 80
          ? 16
          : count >= 60
            ? 12
            : count >= 40
              ? 8
              : count >= 20
                ? 4
                : 2;
    return {
      ...state,
      costReductions: state.deck.reduce(
        (costs, item) => {
          if (item.unit === 1 || (item.token && item.token !== 'shadow'))
            costs[item.id] = (costs[item.id] ?? 0) + amount * (item.token === 'bookmark' ? 2 : 1);
          return costs;
        },
        { ...state.costReductions },
      ),
    };
  }
  if (card.drawAbility === 'story') {
    const amount =
      count >= 100
        ? 200
        : count >= 80
          ? 160
          : count >= 60
            ? 120
            : count >= 40
              ? 80
              : count >= 20
                ? 40
                : 20;
    return applyEffect(
      state,
      { kind: 'beat-hearts', amount, moodBonus: { target: 1, perPoint: amount * 0.005 } },
      card,
    );
  }
  if (card.drawAbility === 'bookmark') {
    const amount =
      count >= 100 ? 8 : count >= 80 ? 6 : count >= 60 ? 4 : count >= 40 ? 3 : count >= 20 ? 2 : 1;
    return applyEffect(next, { kind: 'ap', amount }, card);
  }
  const factorRate =
    count >= 100
      ? 2000
      : count >= 80
        ? 5000
        : count >= 60
          ? 7000
          : count >= 40
            ? 8000
            : count >= 20
              ? 9000
              : 9500;
  const reduction = Math.ceil(
    skillValue(state, 10000 - factorRate, { kind: 'ap', amount: 10000 - factorRate }, card),
  );
  const factor = Math.fround(Math.fround(10000 - reduction) / 10000);
  return {
    ...applyApSpeedPercent(next, Math.fround((1 - factor) * 100), 'stage'),
    storyAmplification:
      count >= 80
        ? Math.fround(state.storyAmplification + 1001 + Math.max(0, moodValue(state)) * 5.005)
        : state.storyAmplification,
  };
}
