import type { LiveAdditionalBuffCard } from './additionalBuffTarget.ts';
import {
  advanceLiveAdditionalSkillBuffs,
  applyLiveAdditionalSkillBuffs,
  createLiveAdditionalSkillBuff,
  type LiveAdditionalSkillBuff,
} from './additionalSkillBuff.ts';
import type { LiveSkillEffect } from './skillTypes.ts';
import type { LiveSkillEffectPower } from './skillEffectPower.ts';

export type LiveDirectGaugeAdditionalBuffState = Readonly<{
  mental: readonly LiveAdditionalSkillBuff[];
  voltage: readonly LiveAdditionalSkillBuff[];
}>;

export type LiveDirectGauge = keyof LiveDirectGaugeAdditionalBuffState;

export function createLiveDirectGaugeAdditionalBuffState(): LiveDirectGaugeAdditionalBuffState {
  return { mental: [], voltage: [] };
}

export function activateLiveDirectGaugeAdditionalBuff(
  state: LiveDirectGaugeAdditionalBuffState,
  effect: LiveSkillEffect,
  input: Readonly<{
    currentTimeSeconds: number;
    currentMoodValue: number;
    power: LiveSkillEffectPower;
    applySkillBoost: (value: number) => number;
  }>,
): LiveDirectGaugeAdditionalBuffState {
  const contract = resolveContract(effect.actionType);
  const buff = createLiveAdditionalSkillBuff(effect, input, contract);
  return { ...state, [contract.gauge]: [...state[contract.gauge], buff] };
}

export function advanceLiveDirectGaugeAdditionalBuffState(
  state: LiveDirectGaugeAdditionalBuffState,
  input: Readonly<{
    currentTimeSeconds: number;
    sectionChangeCount: number;
    musicEnded: boolean;
  }>,
): LiveDirectGaugeAdditionalBuffState {
  return {
    mental: advanceLiveAdditionalSkillBuffs(state.mental, input),
    voltage: advanceLiveAdditionalSkillBuffs(state.voltage, input),
  };
}

export function applyLiveDirectGaugeAdditionalBuffs(
  state: LiveDirectGaugeAdditionalBuffState,
  gauge: LiveDirectGauge,
  card: LiveAdditionalBuffCard,
  value: number,
): Readonly<{
  state: LiveDirectGaugeAdditionalBuffState;
  value: number;
}> {
  const applied = applyLiveAdditionalSkillBuffs(state[gauge], card, value);
  return {
    state: { ...state, [gauge]: applied.buffs },
    value: applied.value,
  };
}

function resolveContract(actionType: number) {
  if (actionType === 31) {
    return {
      gauge: 'voltage',
      label: 'Voltage additional buff',
      actionType,
      calculationType: 'ADD_VOLTAGE_ADDITIONAL_BUFF_CALC_TYPE',
      value: 'ADD_VOLTAGE_ADDITIONAL_BUFF_NUM',
      bonusMood: 'ADD_VOLTAGE_ADDITIONAL_BUFF_BONUS_MOOD',
      displayTimeType: 'ADD_VOLTAGE_ADDITIONAL_BUFF_DISPLAY_TIME_TYPE',
      displayTime: 'ADD_VOLTAGE_ADDITIONAL_BUFF_DISPLAY_TIME',
      disabledType: 'ADD_VOLTAGE_ADDITIONAL_BUFF_DISABLED_TYPE',
      disabled: 'ADD_VOLTAGE_ADDITIONAL_BUFF_DISABLED',
      targetType: 'ADD_VOLTAGE_ADDITIONAL_BUFF_TARGET_TYPE',
      targetId: 'ADD_VOLTAGE_ADDITIONAL_BUFF_TARGET_ID',
    } as const;
  }
  if (actionType === 32) {
    return {
      gauge: 'mental',
      label: 'Mental recovery additional buff',
      actionType,
      calculationType: 'RECOVER_MENTAL_ADDITIONAL_BUFF_CALC_TYPE',
      value: 'RECOVER_MENTAL_ADDITIONAL_BUFF_NUM',
      bonusMood: 'RECOVER_MENTAL_ADDITIONAL_BUFF_BONUS_MOOD',
      displayTimeType: 'RECOVER_MENTAL_ADDITIONAL_BUFF_DISPLAY_TIME_TYPE',
      displayTime: 'RECOVER_MENTAL_ADDITIONAL_BUFF_DISPLAY_TIME',
      disabledType: 'RECOVER_MENTAL_ADDITIONAL_BUFF_DISABLED_TYPE',
      disabled: 'RECOVER_MENTAL_ADDITIONAL_BUFF_DISABLED',
      targetType: 'RECOVER_MENTAL_ADDITIONAL_BUFF_TARGET_TYPE',
      targetId: 'RECOVER_MENTAL_ADDITIONAL_BUFF_TARGET_ID',
    } as const;
  }
  throw new Error('Live direct gauge additional buff action type differs');
}
