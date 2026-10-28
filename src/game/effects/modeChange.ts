import type { Card, Effect, GameState } from '../model.ts';
import { enqueueModeChange, takeModeChange } from '../live/modes.ts';
import {
  activateModeParameterChanges,
  deactivateParameterValueChanges,
} from '../parameters/parameterValueChange.ts';
import { int64ToFloat32 } from '../../runtime/numeric.ts';
import { completeDeckOutChecks } from './deckOutCheck.ts';
import { activateModeAbilityEffects, deactivateModeAbilityEffects } from '../cards/modeAbility.ts';

type ApplyEffect = (
  state: GameState,
  effect: Effect,
  card?: Card,
  multiplier?: number,
  addValue?: number,
  effectPower?: number,
) => GameState;

export function drainModeChanges(state: GameState, apply: ApplyEffect): GameState {
  if (state.modes.held || state.modes.changing) return state;
  let next: GameState = { ...state, modes: { ...state.modes, changing: true } };
  while (next.modes.queue.length) {
    const transition = takeModeChange(next.modes);
    const changed = transition.changed;
    if (!changed) {
      next = { ...next, modes: transition.state };
      continue;
    }
    const modeId = changed.id;
    const modeCards = next.deck.filter(
      (card) =>
        card.modeParameterChanges?.modeId === modeId && next.handEffectCardIds.includes(card.id),
    );
    const modeAbilityCards = next.deck.filter(
      (card) =>
        card.modeAbilityChanges?.modeId === modeId && next.handEffectCardIds.includes(card.id),
    );
    for (const card of modeAbilityCards) next = deactivateModeAbilityEffects(next, card);
    for (const card of modeCards) {
      const active = next.activeModeParameterChanges.find(
        (item) => item.cardId === card.id && item.modeId === modeId,
      );
      if (!active || !card.modeParameterChanges) continue;
      const effects = active.isOn ? card.modeParameterChanges.on : card.modeParameterChanges.off;
      next = deactivateParameterValueChanges(next, card, effects);
      next = {
        ...next,
        activeModeParameterChanges: next.activeModeParameterChanges.filter(
          (item) => item.cardId !== card.id || item.modeId !== modeId,
        ),
      };
    }
    next = { ...next, modes: transition.state };
    for (const card of modeCards) {
      next = activateModeParameterChanges(next, card, changed.on);
      next = {
        ...next,
        activeModeParameterChanges: [
          ...next.activeModeParameterChanges,
          { cardId: card.id, modeId, isOn: changed.on },
        ],
      };
    }
    for (const card of modeAbilityCards) next = activateModeAbilityEffects(next, card, apply);
    if (!changed.on) continue;
    const listeners = next.modeReactions
      .map((reaction, index) => ({ reaction, index }))
      .filter(({ reaction }) => reaction.modeId === modeId);
    for (const { reaction, index } of listeners) {
      const count = Number(BigInt.asIntN(32, BigInt(reaction.count + 1)));
      next = {
        ...next,
        modes: {
          ...next.modes,
          entries: next.modes.entries.map((entry) =>
            entry.id === modeId ? { ...entry, induceValue: count } : entry,
          ),
        },
        modeReactions: next.modeReactions.map((item, slot) =>
          slot === index ? { ...item, count } : item,
        ),
      };
      const source =
        reaction.sourceId === null
          ? undefined
          : next.cardPool.find((card) => card.id === reaction.sourceId);
      for (let slot = 0; slot < reaction.thresholds.length; slot++) {
        const threshold = reaction.thresholds[slot];
        if (threshold === undefined || BigInt(count) % threshold !== 0n) continue;
        const effect = reaction.effects[slot];
        if (!effect) break;
        const scales =
          effect.kind === 'hearts' ||
          effect.kind === 'skill-hearts' ||
          effect.kind === 'skill-score-up' ||
          effect.kind === 'boost' ||
          effect.kind === 'mental' ||
          effect.kind === 'voltage';
        const product = BigInt.asIntN(64, reaction.buffNum * BigInt(count));
        const effectPower = scales
          ? toInt32(Math.fround(int64ToFloat32(product) / Math.fround(10_000)))
          : 1;
        next = completeDeckOutChecks(apply(next, effect, source, 1, 0, effectPower), apply);
      }
    }
  }
  return { ...next, modes: { ...next.modes, changing: false } };
}

function toInt32(value: number): number {
  if (!Number.isFinite(value)) return -2_147_483_648;
  return Number(BigInt.asIntN(32, BigInt(Math.trunc(value))));
}

export function changeMode(
  state: GameState,
  effect: Extract<Effect, { kind: 'mode' }>,
  apply: ApplyEffect,
): GameState {
  return drainModeChanges(
    {
      ...state,
      modes: enqueueModeChange(state.modes, {
        modeId: Number(BigInt.asIntN(32, effect.modeId)),
        change: effect.change,
      }),
    },
    apply,
  );
}

export function addModeReaction(
  state: GameState,
  effect: Extract<Effect, { kind: 'mode-reaction' }>,
  card?: Card,
): GameState {
  if (
    !state.modes.entries.some((entry) => entry.id === effect.modeId) ||
    effect.effects.length === 0
  )
    return state;
  return {
    ...state,
    modes: {
      ...state.modes,
      entries: state.modes.entries.map((entry) =>
        entry.id === effect.modeId ? { ...entry, displayInduce: true } : entry,
      ),
    },
    modeReactions: [
      ...state.modeReactions,
      {
        sourceId: card?.id ?? null,
        modeId: effect.modeId,
        thresholds: effect.thresholds,
        effects: effect.effects,
        buffNum: effect.buffNum,
        count: 0,
      },
    ],
  };
}
