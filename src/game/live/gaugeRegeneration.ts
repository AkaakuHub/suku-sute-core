import { resolveLiveRegenGaugeObservation } from '../../runtime/skills/regenGaugeValue.ts';
import { advanceLiveRegenGaugeSections } from '../../runtime/skills/regenGaugeSkill.ts';
import {
  advanceLiveRegenGaugeClock,
  notifyLiveRegenGaugeBeatHeartCreated,
} from '../../runtime/skills/regenGaugeRuntime.ts';
import { createLiveRegenGaugeTiming } from '../../runtime/skills/regenGaugeTiming.ts';
import { changeResource } from '../resources.ts';
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
    regenGaugeEffects: [
      ...next.regenGaugeEffects,
      { ...application, registrationId: state.nextRegenGaugeEffectId, effectId, ...timing },
    ],
  };
}

export function advanceGaugeRegenerations(
  state: GameState,
  elapsedSeconds: number,
  applyEffect?: EffectApplier,
): GameState {
  return advanceLiveRegenGaugeClock(
    state,
    {
      deltaTimeSeconds: elapsedSeconds,
      sectionChangeCount: 0,
      musicEnded: false,
    },
    (next, effect) => pulseGauge(next, effect, applyEffect),
  );
}

export function notifyGaugeRegenerationsBeatHeart(
  state: GameState,
  applyEffect?: EffectApplier,
): GameState {
  return notifyLiveRegenGaugeBeatHeartCreated(state, (next, effect) =>
    pulseGauge(next, effect, applyEffect),
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
