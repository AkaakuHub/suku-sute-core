import { resolveLiveGaugeSkillEffectAmount } from './gaugeSkillEffectValue.ts';
import type { LiveSkillEffect } from './skillTypes.ts';
import type { LiveSkillEffectPower } from './skillEffectPower.ts';

export type LiveDirectGaugeSkillEffect = Readonly<{
  gauge: 'mental' | 'voltage';
  amount: number;
}>;

export function resolveLiveDirectGaugeSkillEffect(
  effect: LiveSkillEffect,
  input: Readonly<{
    currentMoodValue: number;
    power: LiveSkillEffectPower;
  }>,
): LiveDirectGaugeSkillEffect {
  const contract = resolveContract(effect.actionType);
  return {
    gauge: contract.gauge,
    amount: resolveLiveGaugeSkillEffectAmount(effect, input, contract),
  };
}

function resolveContract(actionType: number): Readonly<{
  gauge: LiveDirectGaugeSkillEffect['gauge'];
  label: string;
  calculationType: string;
  baseValue: string;
  bonusMood: string;
}> {
  if (actionType === 5) {
    return {
      gauge: 'mental',
      label: 'Mental recovery',
      calculationType: 'RECOVER_MENTAL_NUM_TYPE',
      baseValue: 'RECOVER_MENTAL_NUM',
      bonusMood: 'RECOVER_MENTAL_BONUS_MOOD',
    };
  }
  if (actionType === 10) {
    return {
      gauge: 'voltage',
      label: 'Voltage addition',
      calculationType: 'ADD_VOLTAGE_NUM_TYPE',
      baseValue: 'ADD_VOLTAGE_NUM',
      bonusMood: 'ADD_VOLTAGE_BONUS_MOOD',
    };
  }
  throw new Error('Live direct gauge skill action type differs');
}
