import type { LiveSkillEffect } from './skillTypes.ts';
import {
  requireLiveSkillEffectDetails,
  requireLiveSkillEffectDetailValue,
} from './skillEffectValue.ts';

export type LiveVoltagePointSet = Readonly<{
  currentVoltage: bigint;
  changeAmount: number;
}>;

export function resolveLiveVoltagePointSet(
  effect: LiveSkillEffect,
  currentVoltage: bigint,
): LiveVoltagePointSet {
  if (effect.actionType !== 37 || currentVoltage < 0n) {
    throw new Error('Live Change Voltage Level input is invalid');
  }
  const details = requireLiveSkillEffectDetails(
    effect.details,
    ['CHANGE_VOLTAGE_NUM'],
    'Change Voltage Level',
  );
  const targetVoltage = BigInt(
    Math.trunc(
      Math.fround(
        requireLiveSkillEffectDetailValue(details, 'CHANGE_VOLTAGE_NUM', 'Change Voltage Level'),
      ),
    ),
  );
  const changeAmount = Number(targetVoltage - currentVoltage);
  if (!Number.isSafeInteger(changeAmount)) {
    throw new Error('Live Change Voltage Level amount is out of range');
  }
  return {
    currentVoltage: targetVoltage < 0n ? 0n : targetVoltage,
    changeAmount,
  };
}
