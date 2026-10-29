import {
  createLiveSkillEffectDuration,
  type LiveSkillEffectClock,
  type LiveSkillEffectDuration,
} from './skillEffectDuration.ts';

export type LiveRegenGaugeInterval =
  | Readonly<{ kind: 'milliseconds'; seconds: number; elapsedSeconds: number }>
  | Readonly<{ kind: 'beat-heart'; count: number; progress: number }>;

export type LiveRegenGaugeDuration =
  | Exclude<LiveSkillEffectDuration, { kind: 'milliseconds' }>
  | Readonly<{ kind: 'milliseconds'; seconds: number; elapsedSeconds: number }>;

export function createLiveRegenGaugeTiming(
  intervalType: number,
  intervalValue: number,
  displayTimeType: number,
  displayTime: number,
): Readonly<{ interval: LiveRegenGaugeInterval; duration: LiveRegenGaugeDuration }> {
  if (!Number.isSafeInteger(intervalValue)) throw new Error('Live regen gauge interval is invalid');
  const interval: LiveRegenGaugeInterval =
    intervalType === 1
      ? {
          kind: 'milliseconds',
          seconds: Math.fround(Math.fround(intervalValue) / 1_000),
          elapsedSeconds: 0,
        }
      : intervalType === 2
        ? { kind: 'beat-heart', count: intervalValue, progress: 0 }
        : invalidIntervalType();
  const duration = createLiveSkillEffectDuration(displayTimeType, displayTime, 'Regen gauge');
  return {
    interval,
    duration:
      duration.kind === 'milliseconds'
        ? { kind: 'milliseconds', seconds: duration.remainingSeconds, elapsedSeconds: 0 }
        : duration,
  };
}

export function advanceLiveRegenGaugeDuration(
  duration: LiveRegenGaugeDuration,
  input: LiveSkillEffectClock,
): LiveRegenGaugeDuration | null {
  if (
    !Number.isFinite(input.deltaTimeSeconds) ||
    input.deltaTimeSeconds < 0 ||
    !Number.isSafeInteger(input.sectionChangeCount) ||
    input.sectionChangeCount < 0
  )
    throw new Error('Live regen gauge clock is invalid');
  switch (duration.kind) {
    case 'milliseconds': {
      const elapsedSeconds = Math.fround(
        duration.elapsedSeconds + Math.fround(input.deltaTimeSeconds),
      );
      return elapsedSeconds >= duration.seconds ? null : { ...duration, elapsedSeconds };
    }
    case 'sections': {
      const remainingChanges = BigInt.asIntN(
        64,
        duration.remainingChanges - BigInt(input.sectionChangeCount),
      );
      return remainingChanges <= 0n ? null : { ...duration, remainingChanges };
    }
    case 'full-end':
      return input.musicEnded ? null : duration;
  }
}

function invalidIntervalType(): never {
  throw new Error('Live regen gauge interval type is invalid');
}
