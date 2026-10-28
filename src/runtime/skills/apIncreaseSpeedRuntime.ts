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
    return duration === null ? null : { ...effect, duration };
  });
}

function updateEffects(
  state: LiveApIncreaseSpeedRuntimeState,
  baseIntervalSeconds: number,
  update: (effect: LiveApIncreaseSpeedEffect) => LiveApIncreaseSpeedEffect | null,
): LiveApIncreaseSpeedRuntimeState {
  let next = state;
  let index = 0;
  while (index < next.apIncreaseSpeedEffects.length) {
    const effect = next.apIncreaseSpeedEffects[index];
    if (effect === undefined) throw new Error('Live AP increase speed index is invalid');
    const changed = update(effect);
    if (changed === null) {
      next = changeLiveApIncreaseSpeedEffects(
        next,
        next.apIncreaseSpeedEffects.filter((_, current) => current !== index),
        baseIntervalSeconds,
      );
    } else {
      if (changed !== effect)
        next = {
          ...next,
          apIncreaseSpeedEffects: next.apIncreaseSpeedEffects.map((current, at) =>
            at === index ? changed : current,
          ),
        };
      index++;
    }
  }
  return next;
}
