import type { LiveApGaugeState } from '../live/apGauge.ts';
import { rescaleLiveGaugeTimer } from '../live/gaugeTiming.ts';
import {
  advanceLiveSkillEffectDuration,
  type LiveSkillEffectClock,
} from './skillEffectDuration.ts';
import {
  resolveLiveApIncreaseIntervalSeconds,
  type LiveApIncreaseSpeedEffect,
  type LiveApIncreaseSpeedState,
} from './apIncreaseSpeed.ts';

export type LiveApIncreaseSpeedRuntimeState = Readonly<{
  ap: LiveApGaugeState;
  apIncreaseSpeedEffects: LiveApIncreaseSpeedState;
}>;

export function changeLiveApIncreaseSpeedEffects(
  state: LiveApIncreaseSpeedRuntimeState,
  apIncreaseSpeedEffects: LiveApIncreaseSpeedState,
  baseIntervalSeconds: number,
): LiveApIncreaseSpeedRuntimeState {
  if (state.apIncreaseSpeedEffects === apIncreaseSpeedEffects) return state;
  const before = resolveLiveApIncreaseIntervalSeconds(
    baseIntervalSeconds,
    state.apIncreaseSpeedEffects,
  );
  const after = resolveLiveApIncreaseIntervalSeconds(baseIntervalSeconds, apIncreaseSpeedEffects);
  return {
    apIncreaseSpeedEffects,
    ap: { ...state.ap, timerSeconds: rescaleLiveGaugeTimer(state.ap.timerSeconds, before, after) },
  };
}

export function deactivateLiveApIncreaseSpeedEffects(
  state: LiveApIncreaseSpeedRuntimeState,
  selector: Readonly<{ effectId: string }> | Readonly<{ deactivationKey: string }>,
  baseIntervalSeconds: number,
): LiveApIncreaseSpeedRuntimeState {
  return updateEffects(state, baseIntervalSeconds, (effect) =>
    effect.duration === null ||
    ('effectId' in selector
      ? effect.effectId !== selector.effectId
      : effect.deactivationKey !== selector.deactivationKey)
      ? effect
      : null,
  );
}

export function advanceLiveApIncreaseSpeedState(
  state: LiveApIncreaseSpeedRuntimeState,
  input: LiveSkillEffectClock,
  baseIntervalSeconds: number,
): LiveApIncreaseSpeedRuntimeState {
  return updateEffects(state, baseIntervalSeconds, (effect) => {
    if (effect.duration === null) return effect;
    const duration = advanceLiveSkillEffectDuration(effect.duration, input);
    return duration === null
      ? null
      : duration === effect.duration
        ? effect
        : { ...effect, duration };
  });
}

function updateEffects(
  state: LiveApIncreaseSpeedRuntimeState,
  baseIntervalSeconds: number,
  update: (effect: LiveApIncreaseSpeedEffect) => LiveApIncreaseSpeedEffect | null,
): LiveApIncreaseSpeedRuntimeState {
  const effects: LiveApIncreaseSpeedEffect[] = [];
  let current = state;
  let removed = 0;
  let changed = false;
  for (let index = 0; index < state.apIncreaseSpeedEffects.length; index++) {
    const effect = state.apIncreaseSpeedEffects[index];
    if (effect === undefined) throw new Error('Live AP increase speed index is invalid');
    const updated = update(effect);
    if (updated === null) {
      current = changeLiveApIncreaseSpeedEffects(
        current,
        current.apIncreaseSpeedEffects.filter((_, at) => at !== index - removed),
        baseIntervalSeconds,
      );
      removed++;
    } else {
      effects.push(updated);
    }
    changed ||= updated !== effect;
  }
  return changed ? { ap: current.ap, apIncreaseSpeedEffects: effects } : state;
}
