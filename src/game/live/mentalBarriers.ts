import type { MentalBarrierEffect } from '../modelTypes.ts';
import type { GameState } from '../model.ts';
import { absorbSkillEffect } from '../effects/proxySkill.ts';
import {
  advanceLiveMentalBarrierState,
  createLiveMentalBarrierEffect,
  liveMentalBarrierDecreaseIntervalFactor,
} from '../../runtime/skills/mentalBarrier.ts';
import { createLiveSkillEffectDuration } from '../../runtime/skills/skillEffectDuration.ts';
import {
  applyLiveMentalBarrierDamage,
  consumeLiveMentalBarrierNaturally,
} from '../../runtime/skills/mentalBarrierDamage.ts';

export function addMentalBarrier(
  state: GameState,
  effect: MentalBarrierEffect,
  endurance: number,
  attenuation: number,
): GameState {
  const duration = createLiveSkillEffectDuration(
    effect.duration.kind === 'milliseconds' ? 1 : effect.duration.kind === 'sections' ? 2 : 3,
    effect.duration.kind === 'stage' ? 0 : effect.duration.value,
    'Mental Barrier',
  );
  const absorption = absorbSkillEffect(state, 7, BigInt.asIntN(32, BigInt(Math.trunc(endurance))));
  if (absorption.absorbed) return absorption.state;
  const barrier = createLiveMentalBarrierEffect(
    {
      effectId: String(state.nextMentalBarrierEffectId),
      barrierType: effect.barrier,
      endurance:
        effect.enduranceType === 'infinite' || endurance <= 0
          ? { kind: 'infinite' }
          : { kind: 'finite', maximum: endurance, consumed: 0 },
      attenuationFactor: attenuation,
      duration,
      parentControlsLifetime: effect.invocationType === 0x388 || effect.invocationType === 0x38b,
      deactivationKey: effect.deactivationKey ?? null,
    },
    state.tick / 60,
    state.track.sections.map((section) => (section.startBeat * 60) / state.track.bpm),
  );
  return rescaleMentalTimer(state, {
    ...state,
    mentalBarriers: {
      ...state.mentalBarriers,
      effects: [...state.mentalBarriers.effects, barrier],
    },
    nextMentalBarrierEffectId: state.nextMentalBarrierEffectId + 1,
  });
}

export function absorbSkillMentalDamage(
  state: GameState,
  amount: bigint,
): Readonly<{ state: GameState; amount: bigint }> {
  if (amount >= 0n || state.genesis.effects.length > 0) return { state, amount };
  const applied = applyLiveMentalBarrierDamage(state.mentalBarriers, Math.trunc(-Number(amount)));
  return {
    state: { ...state, mentalBarriers: applied.state },
    amount: -BigInt(applied.remainingDamage),
  };
}

export function absorbNaturalMentalDecrease(
  state: GameState,
): Readonly<{ state: GameState; absorbed: boolean }> {
  const applied = consumeLiveMentalBarrierNaturally(state.mentalBarriers);
  return { state: { ...state, mentalBarriers: applied.state }, absorbed: applied.absorbed };
}

export function mentalDecreaseInterval(state: GameState, baseInterval: number): number {
  const attenuation = liveMentalBarrierDecreaseIntervalFactor(state.mentalBarriers);
  const baseMilliseconds = Math.fround(baseInterval * 1000);
  const increaseMilliseconds = Math.fround(attenuation * baseMilliseconds);
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
    mentalBarriers: advanceLiveMentalBarrierState(state.mentalBarriers, {
      deltaTimeSeconds: duration === 'milliseconds' ? elapsed : 0,
      sectionChangeCount: duration === 'sections' ? 1 : 0,
      musicEnded: false,
    }),
  };
}

export function removeExhaustedMentalBarriers(state: GameState): GameState {
  return {
    ...state,
    mentalBarriers: advanceLiveMentalBarrierState(state.mentalBarriers, {
      deltaTimeSeconds: 0,
      sectionChangeCount: 0,
      musicEnded: false,
    }),
  };
}

export function deactivateMentalBarriers(state: GameState, deactivationKey: string): GameState {
  const effects = state.mentalBarriers.effects.filter(
    (barrier) => barrier.deactivationKey !== deactivationKey,
  );
  if (effects.length === state.mentalBarriers.effects.length) return state;
  return rescaleMentalTimer(state, {
    ...state,
    mentalBarriers: { ...state.mentalBarriers, effects },
  });
}

function rescaleMentalTimer(state: GameState, next: GameState): GameState {
  const base = state.track.stage.mentalDecreaseIntervalSeconds;
  const previousInterval = mentalDecreaseInterval(state, base);
  const nextInterval = mentalDecreaseInterval(next, base);
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
