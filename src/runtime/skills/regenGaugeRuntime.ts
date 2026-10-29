import { int64ToInt32 } from '../numeric.ts';
import type { LiveSkillEffectClock } from './skillEffectDuration.ts';
import type { LiveRegenGaugeEffect } from './regenGaugeSkill.ts';
import { advanceLiveRegenGaugeDuration } from './regenGaugeTiming.ts';

type LiveRegenGaugeRuntimeState = Readonly<{ regenGaugeEffects: readonly LiveRegenGaugeEffect[] }>;
type ApplyRegenGauge<State extends LiveRegenGaugeRuntimeState> = (
  state: State,
  effect: State['regenGaugeEffects'][number],
) => State;

export function advanceLiveRegenGaugeClock<State extends LiveRegenGaugeRuntimeState>(
  state: State,
  input: LiveSkillEffectClock,
  apply: ApplyRegenGauge<State>,
): State {
  if (
    !Number.isFinite(input.deltaTimeSeconds) ||
    input.deltaTimeSeconds < 0 ||
    !Number.isSafeInteger(input.sectionChangeCount) ||
    input.sectionChangeCount < 0
  )
    throw new Error('Live regen gauge clock is invalid');
  let next = state;
  for (const captured of state.regenGaugeEffects) {
    const registered = next.regenGaugeEffects.find(
      (effect) => effect.registrationId === captured.registrationId,
    );
    const delivered = registered === undefined ? captured : registered;
    let pulse = false;
    if (delivered.interval.kind === 'milliseconds') {
      const interval = {
        ...delivered.interval,
        elapsedSeconds: Math.fround(
          delivered.interval.elapsedSeconds + Math.fround(input.deltaTimeSeconds),
        ),
      };
      next = {
        ...next,
        regenGaugeEffects: next.regenGaugeEffects.map((effect) =>
          effect.registrationId === delivered.registrationId ? { ...effect, interval } : effect,
        ),
      };
      pulse = interval.elapsedSeconds >= interval.seconds;
      if (pulse) next = apply(next, { ...delivered, interval });
    }
    next = {
      ...next,
      regenGaugeEffects: next.regenGaugeEffects.flatMap((effect) => {
        if (effect.registrationId !== delivered.registrationId) return [effect];
        const interval =
          pulse && effect.interval.kind === 'milliseconds'
            ? {
                ...effect.interval,
                elapsedSeconds: Math.fround(
                  effect.interval.elapsedSeconds - effect.interval.seconds,
                ),
              }
            : effect.interval;
        const duration = advanceLiveRegenGaugeDuration(effect.duration, input);
        return duration === null ? [] : [{ ...effect, interval, duration }];
      }),
    };
  }
  return next;
}

export function notifyLiveRegenGaugeBeatHeartCreated<State extends LiveRegenGaugeRuntimeState>(
  state: State,
  apply: ApplyRegenGauge<State>,
): State {
  let next = state;
  for (const captured of state.regenGaugeEffects) {
    const registered = next.regenGaugeEffects.find(
      (effect) => effect.registrationId === captured.registrationId,
    );
    const delivered = registered === undefined ? captured : registered;
    if (delivered.interval.kind !== 'beat-heart') continue;
    const progress = int64ToInt32(BigInt(delivered.interval.progress) + 1n);
    const pulse = progress >= delivered.interval.count;
    const interval = { ...delivered.interval, progress: pulse ? 0 : progress };
    next = {
      ...next,
      regenGaugeEffects: next.regenGaugeEffects.map((effect) =>
        effect.registrationId === delivered.registrationId ? { ...effect, interval } : effect,
      ),
    };
    if (pulse) next = apply(next, { ...delivered, interval });
  }
  return next;
}
