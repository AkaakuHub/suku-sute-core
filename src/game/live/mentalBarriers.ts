import type { MentalBarrier, MentalBarrierEffect } from '../modelTypes.ts';
import type { GameState } from '../model.ts';
import { absorbSkillEffect } from '../effects/proxySkill.ts';

export function addMentalBarrier(
  state: GameState,
  effect: MentalBarrierEffect,
  endurance: number,
  attenuation: number,
): GameState {
  if (effect.duration.kind === 'sections' && effect.duration.value === 0)
    throw new Error('Display section count is 0. (displayTimeType: SECTION, displayTime: 0)');
  const suppressExpiry = effect.invocationType === 0x388 || effect.invocationType === 0x38b;
  const remainingSections =
    effect.duration.kind === 'sections' && !suppressExpiry ? effect.duration.value : null;
  const barrier: MentalBarrier = {
    kind: effect.barrier,
    endurance: effect.enduranceType === 'infinite' ? 0 : endurance,
    currentEndurance: 0,
    attenuation,
    remainingSeconds:
      effect.duration.kind === 'milliseconds' && !suppressExpiry
        ? Math.fround(effect.duration.value / 1000)
        : effect.duration.kind === 'sections' && !suppressExpiry
          ? secondsToSectionChange(state, effect.duration.value)
          : null,
    remainingSections,
    deactivationKey: effect.deactivationKey ?? null,
  };
  const absorption = absorbSkillEffect(
    state,
    7,
    BigInt.asIntN(32, BigInt(Math.trunc(barrier.endurance))),
  );
  if (absorption.absorbed) return absorption.state;
  const previousInterval = mentalDecreaseInterval(
    state,
    state.track.stage.mentalDecreaseIntervalSeconds,
  );
  const next = { ...state, mentalBarriers: [...state.mentalBarriers, barrier] };
  const nextInterval = mentalDecreaseInterval(
    next,
    state.track.stage.mentalDecreaseIntervalSeconds,
  );
  return previousInterval > 0 && nextInterval > 0
    ? {
        ...next,
        mental: {
          ...next.mental,
          timerSeconds: Math.fround((nextInterval / previousInterval) * next.mental.timerSeconds),
        },
      }
    : next;
}

export function absorbSkillMentalDamage(
  state: GameState,
  amount: bigint,
): Readonly<{ state: GameState; amount: bigint }> {
  if (amount >= 0n || state.genesis.effects.length > 0) return { state, amount };
  let damage = Math.trunc(-Number(amount));
  const attenuation = state.mentalBarriers
    .filter((barrier) => barrier.kind === 'attenuation')
    .reduce<MentalBarrier | null>(
      (best, barrier) => (!best || barrier.attenuation > best.attenuation ? barrier : best),
      null,
    );
  if (attenuation) {
    if (attenuation.attenuation <= 0) return { state, amount: 0n };
    damage = Math.trunc(damage / attenuation.attenuation);
    if (damage < 1) return { state, amount: 0n };
  }
  const endurance = activeEnduranceBarrier(state);
  if (!endurance) return { state, amount: -BigInt(damage) };
  if (endurance.endurance <= 0) return { state, amount: 0n };
  const remaining = endurance.endurance - endurance.currentEndurance;
  if (damage <= remaining) {
    return {
      state: updateBarrier(state, endurance, {
        currentEndurance: endurance.currentEndurance + damage,
      }),
      amount: 0n,
    };
  }
  const remainingDamage = damage - Math.trunc(remaining);
  return {
    state: updateBarrier(state, endurance, { currentEndurance: endurance.endurance }),
    amount: -BigInt(remainingDamage),
  };
}

export function absorbNaturalMentalDecrease(
  state: GameState,
): Readonly<{ state: GameState; absorbed: boolean }> {
  const barrier = activeEnduranceBarrier(state);
  if (!barrier) return { state, absorbed: false };
  if (barrier.endurance <= 0) return { state, absorbed: true };
  return {
    state: updateBarrier(state, barrier, {
      currentEndurance: barrier.currentEndurance + 1,
    }),
    absorbed: true,
  };
}

function secondsToSectionChange(state: GameState, sectionCount: number): number | null {
  const beat = ((state.tick / 60) * state.track.bpm) / 60;
  const currentIndex = state.track.sections.findLastIndex((section) => section.startBeat <= beat);
  const target = state.track.sections[currentIndex + sectionCount];
  return target ? Math.fround(((target.startBeat - beat) * 60) / state.track.bpm) : null;
}

export function mentalDecreaseInterval(state: GameState, baseInterval: number): number {
  const attenuation = state.mentalBarriers
    .filter((barrier) => barrier.kind === 'attenuation')
    .reduce<MentalBarrier | null>(
      (best, barrier) => (!best || barrier.attenuation > best.attenuation ? barrier : best),
      null,
    );
  if (!attenuation) return baseInterval;
  const baseMilliseconds = Math.fround(baseInterval * 1000);
  const increaseMilliseconds = Math.fround(attenuation.attenuation * baseMilliseconds);
  const roundedMilliseconds = Math.fround(Math.ceil(Math.fround(increaseMilliseconds * 10)) / 10);
  return Math.fround(roundedMilliseconds / 1000);
}

export function expireMentalBarriers(
  state: GameState,
  duration: 'milliseconds' | 'sections',
  elapsed: number,
): GameState {
  return {
    ...state,
    mentalBarriers: state.mentalBarriers.flatMap((barrier) => {
      if (duration === 'milliseconds' && barrier.remainingSeconds !== null) {
        const remainingSeconds = Math.fround(barrier.remainingSeconds - Math.fround(elapsed));
        return remainingSeconds > 0 ? [{ ...barrier, remainingSeconds }] : [];
      }
      if (duration === 'sections' && barrier.remainingSections !== null) {
        const remainingSections = barrier.remainingSections - 1;
        return remainingSections > 0 ? [{ ...barrier, remainingSections }] : [];
      }
      return [barrier];
    }),
  };
}

export function removeExhaustedMentalBarriers(state: GameState): GameState {
  return {
    ...state,
    mentalBarriers: state.mentalBarriers.filter(
      (barrier) => barrier.endurance <= 0 || barrier.currentEndurance < barrier.endurance,
    ),
  };
}

export function deactivateMentalBarriers(state: GameState, deactivationKey: string): GameState {
  const mentalBarriers = state.mentalBarriers.filter(
    (barrier) => barrier.deactivationKey !== deactivationKey,
  );
  if (mentalBarriers.length === state.mentalBarriers.length) return state;
  const previousInterval = mentalDecreaseInterval(
    state,
    state.track.stage.mentalDecreaseIntervalSeconds,
  );
  const next = { ...state, mentalBarriers };
  const nextInterval = mentalDecreaseInterval(
    next,
    state.track.stage.mentalDecreaseIntervalSeconds,
  );
  return previousInterval > 0 && nextInterval > 0
    ? {
        ...next,
        mental: {
          ...next.mental,
          timerSeconds: Math.fround((nextInterval / previousInterval) * next.mental.timerSeconds),
        },
      }
    : next;
}

function activeEnduranceBarrier(state: GameState): MentalBarrier | null {
  return (
    state.mentalBarriers
      .filter(
        (barrier) =>
          barrier.kind === 'endurance' &&
          (barrier.endurance <= 0 || barrier.currentEndurance < barrier.endurance),
      )
      .sort((left, right) => {
        if (left.remainingSeconds === null) return right.remainingSeconds === null ? 0 : 1;
        if (right.remainingSeconds === null) return -1;
        return left.remainingSeconds - right.remainingSeconds;
      })[0] ?? null
  );
}

function updateBarrier(
  state: GameState,
  barrier: MentalBarrier,
  update: Pick<MentalBarrier, 'currentEndurance'>,
): GameState {
  return {
    ...state,
    mentalBarriers: state.mentalBarriers.map((item) =>
      item === barrier ? { ...item, ...update } : item,
    ),
  };
}
