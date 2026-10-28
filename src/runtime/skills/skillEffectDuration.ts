import { int64ToFloat32 } from '../numeric.ts';

export type LiveSkillEffectDuration =
  | Readonly<{ kind: 'milliseconds'; remainingSeconds: number }>
  | Readonly<{ kind: 'sections'; remainingChanges: bigint }>
  | Readonly<{ kind: 'full-end' }>;

export type LiveSkillEffectClock = Readonly<{
  deltaTimeSeconds: number;
  sectionChangeCount: number;
  musicEnded: boolean;
}>;

export function createLiveSkillEffectDuration(
  displayTimeType: number,
  displayTime: number | bigint,
  label: string,
): LiveSkillEffectDuration {
  if (typeof displayTime === 'number' && !Number.isSafeInteger(displayTime)) {
    throw new Error(`Live ${label} display time is invalid`);
  }
  const value = BigInt(displayTime);
  if (value < -(1n << 63n) || value > (1n << 63n) - 1n) {
    throw new Error(`Live ${label} display time is invalid`);
  }
  switch (displayTimeType) {
    case 1:
      return {
        kind: 'milliseconds',
        remainingSeconds: Math.fround(int64ToFloat32(value) / 1_000),
      };
    case 2:
      if (value === 0n) {
        throw new Error(`Live ${label} display time is invalid`);
      }
      return { kind: 'sections', remainingChanges: value };
    case 3:
      return { kind: 'full-end' };
    default:
      throw new Error(`Live ${label} display time type is invalid`);
  }
}

export function advanceLiveSkillEffectDuration(
  duration: LiveSkillEffectDuration,
  input: LiveSkillEffectClock,
): LiveSkillEffectDuration | null {
  if (
    !Number.isFinite(input.deltaTimeSeconds) ||
    input.deltaTimeSeconds < 0 ||
    !Number.isSafeInteger(input.sectionChangeCount) ||
    input.sectionChangeCount < 0
  ) {
    throw new Error('Live skill effect clock input is invalid');
  }
  switch (duration.kind) {
    case 'milliseconds': {
      const remainingSeconds = Math.fround(
        duration.remainingSeconds - Math.fround(input.deltaTimeSeconds),
      );
      return remainingSeconds <= 0 ? null : { kind: 'milliseconds', remainingSeconds };
    }
    case 'sections': {
      const remainingChanges = BigInt.asIntN(
        64,
        duration.remainingChanges - BigInt(input.sectionChangeCount),
      );
      return remainingChanges <= 0n ? null : { kind: 'sections', remainingChanges };
    }
    case 'full-end':
      return input.musicEnded ? null : duration;
  }
}
