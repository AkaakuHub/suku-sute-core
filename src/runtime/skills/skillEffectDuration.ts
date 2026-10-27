export type LiveSkillEffectDuration =
  | Readonly<{ kind: 'milliseconds'; expiresAtSeconds: number }>
  | Readonly<{ kind: 'sections'; remainingChanges: number }>
  | Readonly<{ kind: 'full-end' }>;

export function createLiveSkillEffectDuration(
  displayTimeType: number,
  displayTime: number,
  currentTimeSeconds: number,
  label: string,
): LiveSkillEffectDuration {
  if (
    !Number.isSafeInteger(displayTime) ||
    displayTime < 0 ||
    !Number.isFinite(currentTimeSeconds) ||
    currentTimeSeconds < 0
  ) {
    throw new Error(`Live ${label} display time is invalid`);
  }
  switch (displayTimeType) {
    case 1:
      if (displayTime < 1) {
        throw new Error(`Live ${label} display time is invalid`);
      }
      return {
        kind: 'milliseconds',
        expiresAtSeconds: currentTimeSeconds + displayTime / 1_000,
      };
    case 2:
      if (displayTime < 1) {
        throw new Error(`Live ${label} display time is invalid`);
      }
      return { kind: 'sections', remainingChanges: displayTime };
    case 3:
      return { kind: 'full-end' };
    default:
      throw new Error(`Live ${label} display time type is invalid`);
  }
}

export function advanceLiveSkillEffectDuration(
  duration: LiveSkillEffectDuration,
  input: Readonly<{
    currentTimeSeconds: number;
    sectionChangeCount: number;
    musicEnded: boolean;
  }>,
): LiveSkillEffectDuration | null {
  if (
    !Number.isFinite(input.currentTimeSeconds) ||
    input.currentTimeSeconds < 0 ||
    !Number.isSafeInteger(input.sectionChangeCount) ||
    input.sectionChangeCount < 0
  ) {
    throw new Error('Live skill effect clock input is invalid');
  }
  switch (duration.kind) {
    case 'milliseconds':
      return input.currentTimeSeconds >= duration.expiresAtSeconds ? null : duration;
    case 'sections': {
      const remainingChanges = duration.remainingChanges - input.sectionChangeCount;
      return remainingChanges <= 0 ? null : { kind: 'sections', remainingChanges };
    }
    case 'full-end':
      return input.musicEnded ? null : duration;
  }
}
