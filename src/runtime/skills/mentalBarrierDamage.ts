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
  const attenuatedDamage = attenuationFactor <= 0 ? 0 : Math.trunc(damage / attenuationFactor);
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
  return (
    candidates.sort((left, right) => {
      const fullEndDifference =
        Number(left.effect.duration.kind === 'full-end') -
        Number(right.effect.duration.kind === 'full-end');
      if (fullEndDifference !== 0) return fullEndDifference;
      return left.effect.limitTimeSeconds - right.effect.limitTimeSeconds;
    })[0] ?? null
  );
}
