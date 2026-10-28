import type {
  AdditionalHeartInducer,
  AdditionalHeartInduceEffect,
} from '../additionalHeartTypes.ts';
import type { Card, Effect, GameState } from '../model.ts';
import { matchesAdditionalHeartCondition } from '../additionalHeartTypes.ts';
import { int64ToFloat32 } from '../../runtime/numeric.ts';
import { completeDeckOutChecks } from './deckOutCheck.ts';

type ApplyEffect = (
  state: GameState,
  effect: Effect,
  card?: Card,
  multiplier?: number,
  addValue?: number,
  effectPower?: number,
) => GameState;

export function activateAdditionalHeartInduce(
  state: GameState,
  effect: AdditionalHeartInduceEffect,
  card: Card | undefined,
  multiplier: number,
  addValue: number,
): GameState {
  if (!card) return state;
  if (effect.duration.kind !== 'stage' && effect.duration.value === 0n) return state;
  const indefinite = effect.invocationType === 0x388 || effect.invocationType === 0x38b;
  const inducer: AdditionalHeartInducer = {
    id: state.nextAdditionalHeartInducerId,
    sourceCardId: card.id,
    condition: effect.condition,
    apPower: effect.apPower,
    heartEffect: effect.heartEffect,
    addValue,
    multiplier,
    remainingSeconds:
      indefinite || effect.duration.kind !== 'milliseconds'
        ? null
        : Math.fround(int64ToFloat32(effect.duration.value) / 1000),
    remainingSections:
      indefinite || effect.duration.kind !== 'sections'
        ? null
        : BigInt.asIntN(32, effect.duration.value),
    deactivationKey: effect.deactivationKey ?? null,
  };
  return {
    ...state,
    additionalHeartInducers: [...state.additionalHeartInducers, inducer],
    nextAdditionalHeartInducerId: state.nextAdditionalHeartInducerId + 1,
  };
}

export function induceAdditionalHearts(
  state: GameState,
  usedCard: Card,
  skillCost: number,
  apply: ApplyEffect,
): GameState {
  let next = state;
  for (const original of state.additionalHeartInducers) {
    const inducer = next.additionalHeartInducers.find((item) => item.id === original.id);
    if (!inducer || !matchesAdditionalHeartCondition(inducer.condition, usedCard)) continue;
    const product = BigInt.asIntN(64, inducer.apPower * BigInt(Math.trunc(skillCost)));
    const effectPower = Math.fround(Math.fround(int64ToFloat32(product) / Math.fround(10_000)) + 1);
    const sourceCard = next.cardPool.find((item) => item.id === inducer.sourceCardId);
    if (!sourceCard) continue;
    next = completeDeckOutChecks(
      apply(
        next,
        inducer.heartEffect,
        sourceCard,
        inducer.multiplier,
        inducer.addValue,
        effectPower,
      ),
      apply,
    );
  }
  return next;
}

export function advanceAdditionalHeartInducers(
  state: GameState,
  elapsedSeconds: number,
): GameState {
  return {
    ...state,
    additionalHeartInducers: state.additionalHeartInducers.flatMap((inducer) => {
      if (inducer.remainingSeconds === null) return [inducer];
      const remainingSeconds = Math.fround(inducer.remainingSeconds - Math.fround(elapsedSeconds));
      return remainingSeconds > 0 ? [{ ...inducer, remainingSeconds }] : [];
    }),
  };
}

export function expireAdditionalHeartInducerSections(state: GameState): GameState {
  return {
    ...state,
    additionalHeartInducers: state.additionalHeartInducers.flatMap((inducer) => {
      if (inducer.remainingSections === null) return [inducer];
      const remainingSections = BigInt.asIntN(32, inducer.remainingSections - 1n);
      return remainingSections > 0n ? [{ ...inducer, remainingSections }] : [];
    }),
  };
}

export function deactivateAdditionalHeartInducers(
  state: GameState,
  deactivationKey: string,
): GameState {
  return {
    ...state,
    additionalHeartInducers: state.additionalHeartInducers.filter(
      (inducer) => inducer.deactivationKey !== deactivationKey,
    ),
  };
}
