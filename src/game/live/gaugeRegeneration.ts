import { addLiveGenesisGauge } from '../../runtime/skills/genesisSkill.ts';
import { changeResource } from '../resources.ts';
import type { GaugeRegeneration } from '../modelTypes.ts';
import type { GameState } from '../model.ts';
import type { EffectApplier } from '../effects/induceSkillEffect.ts';

export function startGaugeRegeneration(
  state: GameState,
  gauge: GaugeRegeneration['gauge'],
  amount: number,
  amountBasis: GaugeRegeneration['amountBasis'],
  intervalType: 1 | 2,
  intervalMilliseconds: number,
  duration: Readonly<{ kind: 'milliseconds' | 'sections'; value: number }>,
  sourceCardId: string | null,
  applyEffect?: EffectApplier,
  calculationType = 1,
  invocationType?: number,
  deactivationKey?: string,
): GameState {
  if (duration.kind === 'sections' && duration.value === 0)
    throw new Error('Display section count is 0. (displayTimeType: SECTION, displayTime: 0)');
  const intervalSeconds = Math.fround(intervalMilliseconds / 1000);
  const suppressExpiry = invocationType === 0x388 || invocationType === 0x38b;
  const regeneration: GaugeRegeneration = {
    gauge,
    calculationType,
    sourceCardId,
    amount,
    amountBasis,
    intervalType,
    intervalSeconds,
    elapsedSeconds: 0,
    durationSeconds:
      duration.kind === 'milliseconds' && !suppressExpiry
        ? Math.fround(duration.value / 1000)
        : null,
    durationElapsedSeconds: 0,
    remainingSections: duration.kind === 'sections' && !suppressExpiry ? duration.value : null,
    remainingHeartEvents: duration.kind === 'sections' ? duration.value : null,
    deactivationKey: deactivationKey ?? null,
  };
  return {
    ...pulseGauge(state, gauge, amount, amountBasis, sourceCardId, applyEffect, calculationType),
    gaugeRegenerations: [...state.gaugeRegenerations, regeneration],
  };
}

export function advanceGaugeRegenerations(
  state: GameState,
  elapsedSeconds: number,
  applyEffect?: EffectApplier,
): GameState {
  const elapsed = Math.fround(elapsedSeconds);
  const active: GaugeRegeneration[] = [];
  let next = state;
  for (const regeneration of state.gaugeRegenerations) {
    let accumulated = Math.fround(regeneration.elapsedSeconds + elapsed);
    if (regeneration.intervalType === 1 && regeneration.intervalSeconds <= accumulated) {
      next = pulseGauge(
        next,
        regeneration.gauge,
        regeneration.amount,
        regeneration.amountBasis,
        regeneration.sourceCardId,
        applyEffect,
        regeneration.calculationType,
      );
      accumulated = Math.fround(accumulated - regeneration.intervalSeconds);
    }
    const durationElapsedSeconds = Math.fround(regeneration.durationElapsedSeconds + elapsed);
    if (
      regeneration.durationSeconds !== null &&
      durationElapsedSeconds >= regeneration.durationSeconds
    )
      continue;
    active.push({ ...regeneration, elapsedSeconds: accumulated, durationElapsedSeconds });
  }
  return { ...next, gaugeRegenerations: active };
}

export function expireGaugeRegenerations(
  state: GameState,
  duration: 'sections' | 'heart-event',
): GameState {
  return {
    ...state,
    gaugeRegenerations: state.gaugeRegenerations.flatMap((regeneration) => {
      if (duration === 'sections' && regeneration.remainingSections !== null) {
        const remainingSections = regeneration.remainingSections - 1;
        return remainingSections > 0 ? [{ ...regeneration, remainingSections }] : [];
      }
      if (duration === 'heart-event' && regeneration.remainingHeartEvents !== null) {
        const remainingHeartEvents = regeneration.remainingHeartEvents - 1;
        return remainingHeartEvents > 0 ? [{ ...regeneration, remainingHeartEvents }] : [];
      }
      return [regeneration];
    }),
  };
}

export function deactivateGaugeRegenerations(state: GameState, deactivationKey: string): GameState {
  return {
    ...state,
    gaugeRegenerations: state.gaugeRegenerations.filter(
      (regeneration) => regeneration.deactivationKey !== deactivationKey,
    ),
  };
}

function pulseGauge(
  state: GameState,
  gauge: GaugeRegeneration['gauge'],
  amount: number,
  amountBasis: GaugeRegeneration['amountBasis'],
  sourceCardId: string | null,
  applyEffect?: EffectApplier,
  calculationType = 1,
): GameState {
  if (calculationType !== 1) return state;
  const value = Math.trunc(
    amountBasis === 'maximum-gauge'
      ? Math.fround(Math.fround(amount) * Math.fround(state.maximumMental))
      : amount,
  );
  if (gauge === 'mental') {
    return state.genesis.effects.length > 0
      ? state
      : changeResource(state, 'mental', BigInt(value), 'skill', undefined, applyEffect);
  }
  if (state.genesis.effects.length === 0)
    return changeResource(
      state,
      'voltage',
      BigInt(value),
      'skill',
      state.cardPool.find((card) => card.id === sourceCardId),
      applyEffect,
      true,
    );
  return {
    ...state,
    genesis: addLiveGenesisGauge(state.genesis, {
      actionType: 0,
      gaugeType: 1,
      effectValue: value,
    }),
  };
}
