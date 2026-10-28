import type { Card, GameState } from '../model.ts';
import type { MentalHeartInduceEffect, MentalHeartInducer } from '../mentalHeartInduceTypes.ts';
import { createSkillHearts } from './heartCreation.ts';
import { applyAdditionalBuff } from './additionalBuff.ts';
import { applyAction52SkillBoostForCard } from './action52SkillBoost.ts';
import { int64ToFloat32 } from '../../runtime/numeric.ts';

export function activateMentalHeartInduce(
  state: GameState,
  effect: MentalHeartInduceEffect,
  card: Card | undefined,
  multiplier: number,
  addValue: number,
): GameState {
  if (effect.duration.kind === 'sections' && effect.duration.value === 0n)
    throw new Error('Display section count is 0. (displayTimeType: SECTION, displayTime: 0)');
  const raw = Math.fround(
    Math.fround(Math.fround(int32(effect.num)) + Math.fround(addValue)) * Math.fround(multiplier),
  );
  const precomputedNum = floatToInt32(raw);
  const suppressDuration = effect.invocationType === 0x388 || effect.invocationType === 0x38b;
  const inducer: MentalHeartInducer = {
    id: state.nextMentalHeartInducerId,
    sourceCardId: card?.cardInstanceId ?? null,
    precomputedNum,
    heartLifetimeSeconds:
      effect.heartDuration.kind === 'milliseconds'
        ? Math.fround(effect.heartDuration.value / 1000)
        : 9_999,
    remainingSeconds:
      suppressDuration || effect.duration.kind !== 'milliseconds'
        ? null
        : Math.fround(int64ToFloat32(effect.duration.value) / 1000),
    remainingSections:
      suppressDuration || effect.duration.kind !== 'sections' ? null : effect.duration.value,
    disabledOnInduceCount: effect.disabledType === 1 ? effect.disabledValue : null,
    induces: 0,
    deactivationKey: effect.deactivationKey ?? null,
  };
  return {
    ...state,
    mentalHeartInducers: [...state.mentalHeartInducers, inducer],
    nextMentalHeartInducerId: state.nextMentalHeartInducerId + 1,
  };
}

export function induceMentalHearts(state: GameState, currentMental: number): GameState {
  let next = state;
  for (const original of state.mentalHeartInducers) {
    const inducer = next.mentalHeartInducers.find((item) => item.id === original.id);
    if (!inducer) continue;
    const product = int32(BigInt(inducer.precomputedNum) * BigInt(currentMental));
    const scaled = Math.fround(Math.fround(product) / Math.fround(10_000));
    const rounded = Math.fround(Math.ceil(Math.fround(scaled * 10)) / 10);
    const initialCount = floatToInt32(rounded);
    const card = inducer.sourceCardId
      ? (next.deck.find((item) => item.cardInstanceId === inducer.sourceCardId) ??
        next.cardPool.find((item) => item.cardInstanceId === inducer.sourceCardId))
      : undefined;
    const additional = applyAdditionalBuff(next, 'attract', initialCount, card);
    const action1 = floatToInt32(additional.value);
    const action52 = applyAction52SkillBoostForCard(additional.state, card, action1);
    next = createSkillHearts(
      action52.state,
      floatToInt32(action52.value),
      inducer.heartLifetimeSeconds,
    );
    const updated = {
      ...inducer,
      induces: Number(BigInt.asIntN(32, BigInt(inducer.induces + 1))),
    };
    next = {
      ...next,
      mentalHeartInducers:
        updated.disabledOnInduceCount !== null &&
        BigInt(updated.induces) === updated.disabledOnInduceCount
          ? next.mentalHeartInducers.filter((item) => item.id !== updated.id)
          : next.mentalHeartInducers.map((item) => (item.id === updated.id ? updated : item)),
    };
  }
  return next;
}

export function advanceMentalHeartInducers(state: GameState, elapsedSeconds: number): GameState {
  return {
    ...state,
    mentalHeartInducers: state.mentalHeartInducers.flatMap((inducer) => {
      if (inducer.remainingSeconds === null) return [inducer];
      const remainingSeconds = Math.fround(inducer.remainingSeconds - Math.fround(elapsedSeconds));
      return remainingSeconds > 0 ? [{ ...inducer, remainingSeconds }] : [];
    }),
  };
}

export function expireMentalHeartInducerSections(state: GameState): GameState {
  return {
    ...state,
    mentalHeartInducers: state.mentalHeartInducers.flatMap((inducer) => {
      if (inducer.remainingSections === null) return [inducer];
      const remainingSections = inducer.remainingSections - 1n;
      return remainingSections > 0n ? [{ ...inducer, remainingSections }] : [];
    }),
  };
}

export function deactivateMentalHeartInducers(
  state: GameState,
  deactivationKey: string,
): GameState {
  return {
    ...state,
    mentalHeartInducers: state.mentalHeartInducers.filter(
      (inducer) => inducer.deactivationKey !== deactivationKey,
    ),
  };
}

function int32(value: number | bigint): number {
  return Number(BigInt.asIntN(32, typeof value === 'bigint' ? value : BigInt(Math.trunc(value))));
}

function floatToInt32(value: number): number {
  return !Number.isFinite(value) || value < -2_147_483_648 || value > 2_147_483_647
    ? -2_147_483_648
    : Math.trunc(value);
}
