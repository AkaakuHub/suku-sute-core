import type { Card, Effect, GameState } from '../model.ts';
import type { InduceSkillCondition, InduceSkillEffectInput } from '../induceSkillEffectTypes.ts';
import { completeDeckOutChecks } from './deckOutCheck.ts';
import { int64ToFloat32 } from '../numeric.ts';

export type EffectApplier = (
  state: GameState,
  effect: Effect,
  card?: Card,
  multiplier?: number,
  addValue?: number,
  effectPower?: number,
) => GameState;

export function activateInducedSkillEffect(
  state: GameState,
  effect: InduceSkillEffectInput,
  card: Card | undefined,
  multiplier: number,
  addValue: number,
): GameState {
  if (effect.duration.kind === 'sections' && effect.duration.value === 0n)
    throw new Error('Display section count is 0. (displayTimeType: SECTION, displayTime: 0)');
  const permanent = effect.invocationType === 0x388 || effect.invocationType === 0x38b;
  return {
    ...state,
    inducedSkillEffects: [
      ...state.inducedSkillEffects,
      {
        id: state.nextInducedSkillEffectId,
        condition: effect.condition,
        num: effect.num,
        deckUnderAdd: effect.deckUnderAdd,
        deckOverAdd: effect.deckOverAdd,
        deckUnderLimit: effect.deckUnderLimit,
        deckOverLimit: effect.deckOverLimit,
        deckCardMax: effect.deckCardMax,
        addValue,
        multiplier,
        effects: effect.effects,
        remainingSeconds:
          permanent || effect.duration.kind !== 'milliseconds'
            ? null
            : Math.fround(int64ToFloat32(effect.duration.value) / Math.fround(1000)),
        remainingSections:
          permanent || effect.duration.kind !== 'sections' ? null : effect.duration.value,
        deactivationKey: effect.deactivationKey ?? null,
        sourceCardId: card?.id ?? null,
      },
    ],
    nextInducedSkillEffectId: state.nextInducedSkillEffectId + 1,
  };
}

export function induceSkillEffects(
  state: GameState,
  condition: InduceSkillCondition,
  value: number,
  applyEffect: EffectApplier,
): GameState {
  if (value < 0) return state;
  const matching = state.inducedSkillEffects.filter((effect) => effect.condition === condition);
  let next = state;
  for (const induced of matching) {
    const sourceCard = induced.sourceCardId
      ? [state.cardPool, state.deck, state.tokenCatalog]
          .map((cards) => cards.find((item) => item.id === induced.sourceCardId))
          .find((item) => item !== undefined)
      : undefined;
    const diff = next.deck.length - induced.deckCardMax;
    const under = diff < 0;
    const clampedDiff = Math.min(
      Math.abs(diff),
      int32(under ? induced.deckUnderLimit : induced.deckOverLimit),
    );
    const add = under ? induced.deckUnderAdd : induced.deckOverAdd;
    const targetValue = numToValue(Math.fround(int64ToFloat32(induced.num) * Math.fround(value)));
    const addFactor = numToValue(int64ToFloat32(add));
    const effectPower = Math.fround(
      targetValue * Math.fround(Math.fround(addFactor * clampedDiff) + 1),
    );
    for (const child of induced.effects) {
      const withParameters =
        child.actionType === 1 || child.actionType === 2 || child.actionType === 14;
      next = completeDeckOutChecks(
        applyEffect(
          next,
          child.effect,
          sourceCard,
          withParameters ? induced.multiplier : 1,
          withParameters ? induced.addValue : 0,
          withParameters ? effectPower : 1,
        ),
        applyEffect,
      );
    }
  }
  return next;
}

function numToValue(value: number): number {
  return Math.fround(Math.fround(value) / Math.fround(10_000));
}

function int32(value: bigint): number {
  return Number(BigInt.asIntN(32, value));
}

export function advanceInducedSkillEffects(state: GameState, elapsedSeconds: number): GameState {
  return {
    ...state,
    inducedSkillEffects: state.inducedSkillEffects.flatMap((effect) => {
      if (effect.remainingSeconds === null) return [effect];
      const remainingSeconds = Math.fround(effect.remainingSeconds - Math.fround(elapsedSeconds));
      return remainingSeconds > 0 ? [{ ...effect, remainingSeconds }] : [];
    }),
  };
}

export function expireInducedSkillEffectSections(state: GameState): GameState {
  return {
    ...state,
    inducedSkillEffects: state.inducedSkillEffects.flatMap((effect) => {
      if (effect.remainingSections === null) return [effect];
      const remainingSections = effect.remainingSections - 1n;
      return remainingSections > 0 ? [{ ...effect, remainingSections }] : [];
    }),
  };
}

export function deactivateInducedSkillEffects(
  state: GameState,
  deactivationKey: string,
): GameState {
  return {
    ...state,
    inducedSkillEffects: state.inducedSkillEffects.filter(
      (effect) => effect.deactivationKey !== deactivationKey,
    ),
  };
}
