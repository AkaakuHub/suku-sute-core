import type { LiveMentalBarrierEffect, LiveMentalBarrierState } from './mentalBarrier.ts';
import { liveMentalBarrierDecreaseIntervalFactor } from './mentalBarrier.ts';

export function applyLiveMentalBarrierDamage(
  state: LiveMentalBarrierState,
  damage: number,
): Readonly<{ state: LiveMentalBarrierState; remainingDamage: number }> {
  if (!Number.isSafeInteger(damage) || damage < 0) {
    throw new Error('Live Mental Barrier damage is invalid');
  }
  const attenuationFactor = liveMentalBarrierDecreaseIntervalFactor(state);
  const attenuatedDamage = Math.trunc(damage / attenuationFactor);
  if (attenuatedDamage < 1) {
    return { state, remainingDamage: 0 };
  }
  const selected = selectEnduranceBarrier(state.effects);
  if (selected === null) {
    return { state, remainingDamage: attenuatedDamage };
  }
  const barrier = selected.effect;
  if (barrier.endurance.kind === 'infinite') {
    return { state, remainingDamage: 0 };
  }
  const endurance = barrier.endurance;
  const remainingEndurance = Math.max(endurance.maximum - endurance.consumed, 0);
  const consumedDamage = Math.min(attenuatedDamage, remainingEndurance);
  const effects = state.effects.map((effect, index) =>
    index === selected.index
      ? {
          ...effect,
          endurance: {
            kind: 'finite' as const,
            maximum: endurance.maximum,
            consumed: Math.fround(endurance.consumed + consumedDamage),
          },
        }
      : effect,
  );
  return {
    state: { ...state, effects },
    remainingDamage:
      attenuatedDamage <= remainingEndurance
        ? 0
        : attenuatedDamage - Math.trunc(remainingEndurance),
  };
}

export function consumeLiveMentalBarrierNaturally(
  state: LiveMentalBarrierState,
): Readonly<{ state: LiveMentalBarrierState; absorbed: boolean }> {
  const selected = selectEnduranceBarrier(state.effects);
  if (!selected) return { state, absorbed: false };
  const endurance = selected.effect.endurance;
  if (endurance.kind === 'infinite') return { state, absorbed: true };
  return {
    absorbed: true,
    state: {
      ...state,
      effects: state.effects.map((effect, index) =>
        index === selected.index
          ? {
              ...effect,
              endurance: { ...endurance, consumed: Math.fround(endurance.consumed + 1) },
            }
          : effect,
      ),
    },
  };
}

function selectEnduranceBarrier(
  effects: readonly LiveMentalBarrierEffect[],
): Readonly<{ index: number; effect: LiveMentalBarrierEffect }> | null {
  const candidates = effects.flatMap((effect, index) =>
    effect.barrierType === 'endurance' &&
    (effect.endurance.kind === 'infinite' || effect.endurance.consumed < effect.endurance.maximum)
      ? [{ index, effect }]
      : [],
  );
  const infinite = candidates.find((candidate) => candidate.effect.endurance.kind === 'infinite');
  if (infinite !== undefined) return infinite;
  return (
    candidates.reduce<Readonly<{ index: number; effect: LiveMentalBarrierEffect }> | undefined>(
      (selected, candidate) => {
        if (candidate.effect.endurance.kind !== 'finite') return selected;
        if (selected === undefined || selected.effect.endurance.kind !== 'finite') {
          return candidate;
        }
        const candidateRemaining =
          candidate.effect.endurance.maximum - candidate.effect.endurance.consumed;
        const selectedRemaining =
          selected.effect.endurance.maximum - selected.effect.endurance.consumed;
        return candidateRemaining > selectedRemaining ? candidate : selected;
      },
      undefined,
    ) ?? null
  );
}
