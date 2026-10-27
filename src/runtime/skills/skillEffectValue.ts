import { calculateLiveSkillMoodCorrection } from '../live/skillMood.ts';
export type LiveSkillEffectDetail = Readonly<{
  detailType: string;
  targetMood: number;
  effectValue: number;
  params: readonly Readonly<{
    paramType: string;
    paramValue: string;
  }>[];
}>;

export function requireLiveSkillEffectDetails<Detail extends LiveSkillEffectDetail>(
  details: readonly Detail[],
  names: readonly string[],
  label: string,
): ReadonlyMap<string, Detail> {
  const result = new Map(details.map((detail) => [detail.detailType, detail]));
  if (
    details.length !== names.length ||
    result.size !== names.length ||
    names.some((name) => !result.has(name)) ||
    details.some(
      (detail) =>
        !Number.isSafeInteger(detail.targetMood) ||
        !Number.isSafeInteger(detail.effectValue) ||
        detail.params.length !== 0,
    )
  ) {
    throw new Error(`Live ${label} skill effect details differ`);
  }
  return result;
}

export function requireLiveSkillEffectDetailValue(
  details: ReadonlyMap<string, LiveSkillEffectDetail>,
  name: string,
  label: string,
): number {
  const detail = details.get(name);
  if (detail === undefined) {
    throw new Error(`Live ${label} detail is absent:${name}`);
  }
  return detail.effectValue;
}

export function calculateLiveSkillEffectValue(
  baseValue: number,
  bonusMood: LiveSkillEffectDetail,
  currentMoodValue: number,
): number {
  if (!Number.isSafeInteger(baseValue) || !Number.isSafeInteger(currentMoodValue)) {
    throw new Error('Live skill effect value input is invalid');
  }
  const moodValue = calculateLiveSkillMoodCorrection(
    bonusMood.targetMood,
    currentMoodValue,
    bonusMood.effectValue / 10_000,
  );
  const value = Math.fround(baseValue / 10_000 + moodValue);
  return value > 0 ? Math.ceil(value) : value;
}
