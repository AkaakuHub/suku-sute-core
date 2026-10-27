import {
  type LiveAdditionalBuffCard,
  type LiveAdditionalBuffTarget,
  liveAdditionalBuffTargetMatches,
  resolveLiveAdditionalBuffTarget,
} from './additionalBuffTarget.ts';
import type { LiveSkillEffect } from './skillTypes.ts';
import {
  advanceLiveSkillEffectDuration,
  createLiveSkillEffectDuration,
  type LiveSkillEffectDuration,
} from './skillEffectDuration.ts';
import type { LiveSkillEffectPower } from './skillEffectPower.ts';
import { validateLiveSkillEffectPower } from './skillEffectPower.ts';
import { calculateLiveSkillMoodCorrection } from '../live/skillMood.ts';
import {
  requireLiveSkillEffectDetails,
  requireLiveSkillEffectDetailValue,
} from './skillEffectValue.ts';

export type LiveAdditionalSkillBuff = Readonly<{
  effectId: string;
  calculation:
    | Readonly<{ kind: 'add'; value: number }>
    | Readonly<{ kind: 'percent'; value: number }>;
  target: LiveAdditionalBuffTarget;
  skillTokenCardSeriesIds: readonly number[];
  remainingUses: number | null;
  duration: LiveSkillEffectDuration;
}>;

export type LiveAdditionalSkillBuffContract = Readonly<{
  label: string;
  actionType: number;
  calculationType: string;
  value: string;
  bonusMood: string;
  displayTimeType: string;
  displayTime: string;
  disabledType: string;
  disabled: string;
  targetType: string;
  targetId: string;
}>;

export function createLiveAdditionalSkillBuff(
  effect: LiveSkillEffect,
  input: Readonly<{
    currentTimeSeconds: number;
    currentMoodValue: number;
    power: LiveSkillEffectPower;
    applySkillBoost: (value: number) => number;
  }>,
  contract: LiveAdditionalSkillBuffContract,
): LiveAdditionalSkillBuff {
  if (effect.actionType !== contract.actionType) {
    throw new Error(`Live ${contract.label} action type differs`);
  }
  validateLiveSkillEffectPower(input.power, contract.label);
  const details = requireLiveSkillEffectDetails(
    effect.details,
    [
      contract.calculationType,
      contract.value,
      contract.bonusMood,
      contract.displayTimeType,
      contract.displayTime,
      contract.disabledType,
      contract.disabled,
      contract.targetType,
      contract.targetId,
    ],
    contract.label,
  );
  if (requireValue(details, contract.calculationType, contract.label) !== 1) {
    throw new Error(`Live ${contract.label} calculation type differs`);
  }
  const disabledType = requireValue(details, contract.disabledType, contract.label);
  if (disabledType !== 0 && disabledType !== 1) {
    throw new Error(`Live ${contract.label} disabled type differs`);
  }
  const disabledCount = requireValue(details, contract.disabled, contract.label);
  if (disabledType === 1 && disabledCount < 1) {
    throw new Error(`Live ${contract.label} disabled count is invalid`);
  }
  const bonusMood = details.get(contract.bonusMood);
  if (bonusMood === undefined) {
    throw new Error(`Live ${contract.label} bonus mood is absent`);
  }
  const poweredPercent = Math.ceil(
    Math.fround(
      Math.fround(
        Math.fround(
          Math.fround(requireValue(details, contract.value, contract.label) / 10_000) +
            calculateLiveSkillMoodCorrection(
              bonusMood.targetMood,
              input.currentMoodValue,
              bonusMood.effectValue / 10_000,
            ),
        ) + input.power.addValue,
      ) * input.power.multiplyFactor,
    ),
  );
  const percent = Math.ceil(
    poweredPercent > 0 ? input.applySkillBoost(poweredPercent) : poweredPercent,
  );
  return {
    effectId: effect.id,
    calculation: { kind: 'percent', value: percent },
    target: resolveLiveAdditionalBuffTarget(
      requireValue(details, contract.targetType, contract.label),
      requireValue(details, contract.targetId, contract.label),
      contract.label,
    ),
    skillTokenCardSeriesIds: [],
    remainingUses: disabledType === 1 ? disabledCount : null,
    duration: createLiveSkillEffectDuration(
      requireValue(details, contract.displayTimeType, contract.label),
      requireValue(details, contract.displayTime, contract.label),
      input.currentTimeSeconds,
      contract.label,
    ),
  };
}

export function advanceLiveAdditionalSkillBuffs(
  buffs: readonly LiveAdditionalSkillBuff[],
  input: Readonly<{
    currentTimeSeconds: number;
    sectionChangeCount: number;
    musicEnded: boolean;
  }>,
): readonly LiveAdditionalSkillBuff[] {
  return buffs.flatMap((buff) => {
    const duration = advanceLiveSkillEffectDuration(buff.duration, input);
    return duration === null ? [] : [{ ...buff, duration }];
  });
}

export function applyLiveAdditionalSkillBuffs(
  buffs: readonly LiveAdditionalSkillBuff[],
  card: LiveAdditionalBuffCard,
  value: number,
): Readonly<{
  buffs: readonly LiveAdditionalSkillBuff[];
  value: number;
}> {
  if (!Number.isFinite(value)) {
    throw new Error('Live additional skill buff value is invalid');
  }
  const matchingIds = new Set(
    buffs
      .filter((buff) =>
        liveAdditionalBuffTargetMatches(buff.target, card, buff.skillTokenCardSeriesIds),
      )
      .map((buff) => buff.effectId),
  );
  const addedValue = buffs.reduce(
    (sum, buff) =>
      matchingIds.has(buff.effectId) && buff.calculation.kind === 'add'
        ? Math.fround(sum + buff.calculation.value)
        : sum,
    0,
  );
  const percent = Math.max(
    buffs.reduce(
      (sum, buff) =>
        matchingIds.has(buff.effectId) && buff.calculation.kind === 'percent'
          ? Math.fround(sum + buff.calculation.value)
          : sum,
      0,
    ),
    -100,
  );
  const valueAfterAdd = Math.fround(value + addedValue);
  return {
    value: Math.fround(valueAfterAdd + (valueAfterAdd * percent) / 100),
    buffs: buffs.flatMap((buff) => {
      if (!matchingIds.has(buff.effectId) || buff.remainingUses === null) {
        return [buff];
      }
      const remainingUses = buff.remainingUses - 1;
      return remainingUses < 1 ? [] : [{ ...buff, remainingUses }];
    }),
  };
}

function requireValue(
  details: ReadonlyMap<string, LiveSkillEffect['details'][number]>,
  name: string,
  label: string,
): number {
  return requireLiveSkillEffectDetailValue(details, name, label);
}
