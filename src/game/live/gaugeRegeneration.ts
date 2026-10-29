import { resolveLiveRegenGaugeObservation } from '../../runtime/skills/regenGaugeValue.ts';
import {
  advanceLiveRegenGaugeClock,
  advanceLiveRegenGaugeSections,
  notifyLiveRegenGaugeBeatHeartCreated,
} from '../../runtime/skills/regenGaugeSkill.ts';
import { createLiveRegenGaugeTiming } from '../../runtime/skills/regenGaugeTiming.ts';
import { changeResource } from '../resources.ts';
import { durationSeconds } from '../projection.ts';
import type { GameRegenGaugeApplication } from '../gaugeRegenerationTypes.ts';
import type { GameState } from '../model.ts';
import type { EffectApplier } from '../effects/induceSkillEffect.ts';

export function startGaugeRegeneration(
  state: GameState,
  gauge: GameRegenGaugeApplication['gauge'],
  value: number,
  intervalType: 1 | 2,
  intervalValue: number,
  duration: Readonly<{ kind: 'milliseconds' | 'sections'; value: number }>,
  sourceCardId: string | null,
  applyEffect?: EffectApplier,
  calculationType = 1,
  invocationType?: number,
  deactivationKey?: string,
): GameState {
  if (duration.kind === 'sections' && duration.value === 0)
    throw new Error('Display section count is 0. (displayTimeType: SECTION, displayTime: 0)');
  const timing = createLiveRegenGaugeTiming(
    intervalType,
    intervalValue,
    invocationType === 0x388 || invocationType === 0x38b
      ? 3
      : duration.kind === 'milliseconds'
        ? 1
        : 2,
    duration.value,
  );
  const application: GameRegenGaugeApplication = {
    actionType: gauge === 'mental' ? 6 : 11,
    gauge,
    value: Math.fround(value),
    sourceCardId,
    calculationType,
    deactivationKey: deactivationKey ?? null,
  };
  const effectId = String(state.nextRegenGaugeEffectId);
  const next = pulseGauge(
    { ...state, nextRegenGaugeEffectId: state.nextRegenGaugeEffectId + 1 },
    application,
    applyEffect,
  );
  return {
    ...next,
    regenGaugeEffects: [...next.regenGaugeEffects, { ...application, effectId, ...timing }],
  };
}

export function advanceGaugeRegenerations(
  state: GameState,
  elapsedSeconds: number,
  applyEffect?: EffectApplier,
): GameState {
  const advanced = advanceLiveRegenGaugeClock(state.regenGaugeEffects, {
    currentTimeSeconds: durationSeconds(state) + elapsedSeconds,
    deltaTimeSeconds: elapsedSeconds,
    sectionChangeCount: 0,
    musicEnded: false,
  });
  return applyGaugeRegenerationPulses(
    { ...state, regenGaugeEffects: advanced.state },
    advanced.applications,
    applyEffect,
  );
}

export function notifyGaugeRegenerationsBeatHeart(
  state: GameState,
  applyEffect?: EffectApplier,
): GameState {
  const notified = notifyLiveRegenGaugeBeatHeartCreated(state.regenGaugeEffects);
  return applyGaugeRegenerationPulses(
    { ...state, regenGaugeEffects: notified.state },
    notified.applications,
    applyEffect,
  );
}

export function expireGaugeRegenerationSections(state: GameState): GameState {
  return { ...state, regenGaugeEffects: advanceLiveRegenGaugeSections(state.regenGaugeEffects, 1) };
}

export function deactivateGaugeRegenerations(state: GameState, deactivationKey: string): GameState {
  return {
    ...state,
    regenGaugeEffects: state.regenGaugeEffects.filter(
      (effect) => effect.deactivationKey !== deactivationKey,
    ),
  };
}

function applyGaugeRegenerationPulses(
  state: GameState,
  applications: readonly GameRegenGaugeApplication[],
  applyEffect?: EffectApplier,
): GameState {
  return applications.reduce(
    (next, application) => pulseGauge(next, application, applyEffect),
    state,
  );
}

function pulseGauge(
  state: GameState,
  application: GameRegenGaugeApplication,
  applyEffect?: EffectApplier,
): GameState {
  const observed = resolveLiveRegenGaugeObservation(application, state.maximumMental);
  if (observed === null) return state;
  return changeResource(
    state,
    observed.gauge,
    BigInt(observed.amount),
    'skill',
    state.cardPool.find((card) => card.cardInstanceId === application.sourceCardId),
    applyEffect,
    observed.gauge === 'voltage',
  );
}
