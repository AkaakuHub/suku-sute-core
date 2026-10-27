import { expect, test } from 'vite-plus/test';
import {
  activateLiveDirectGaugeAdditionalBuff,
  applyLiveDirectGaugeAdditionalBuffs,
  createLiveDirectGaugeAdditionalBuffState,
} from '../../src/runtime/skills/directGaugeAdditionalBuff.ts';
import type { LiveSkillEffect } from '../../src/runtime/skills/skillTypes.ts';

const card = {
  charactersId: 1031,
  unitIds: [101],
  tokenCardSeriesIds: [],
  skillTokenCardSeriesIds: [],
} as const;

test('Mental回復追加buffは対象cardの次回回復へ適用して使用回数を消費する', () => {
  const activated = activateLiveDirectGaugeAdditionalBuff(
    createLiveDirectGaugeAdditionalBuffState(),
    additionalBuffEffect(32, 'RECOVER_MENTAL', 1031),
    input,
  );
  const applied = applyLiveDirectGaugeAdditionalBuffs(activated, 'mental', card, 20);

  expect(applied.value).toBe(30);
  expect(applied.state.mental).toEqual([]);
});

test('Voltage追加buffはMentalへ影響せずVoltageだけへ適用する', () => {
  const activated = activateLiveDirectGaugeAdditionalBuff(
    createLiveDirectGaugeAdditionalBuffState(),
    additionalBuffEffect(31, 'ADD_VOLTAGE', 1031),
    input,
  );
  const mental = applyLiveDirectGaugeAdditionalBuffs(activated, 'mental', card, 20);
  const voltage = applyLiveDirectGaugeAdditionalBuffs(mental.state, 'voltage', card, 20);

  expect(mental.value).toBe(20);
  expect(voltage.value).toBe(30);
  expect(voltage.state.voltage).toEqual([]);
});

const input = {
  currentTimeSeconds: 0,
  currentMoodValue: 0,
  power: { addValue: 0, multiplyFactor: 1, effectPower: 1 },
  applySkillBoost: (value: number) => value,
} as const;

function additionalBuffEffect(
  actionType: 31 | 32,
  prefix: 'ADD_VOLTAGE' | 'RECOVER_MENTAL',
  targetId: number,
): LiveSkillEffect {
  return {
    id: `${String(actionType)}001`,
    actionType,
    orderId: 1,
    details: [
      detail(actionType, prefix, 'CALC_TYPE', 1, 1),
      detail(actionType, prefix, 'NUM', 500_000, 2),
      detail(actionType, prefix, 'BONUS_MOOD', 0, 3),
      detail(actionType, prefix, 'DISPLAY_TIME_TYPE', 3, 4),
      detail(actionType, prefix, 'DISPLAY_TIME', 0, 5),
      detail(actionType, prefix, 'DISABLED_TYPE', 1, 6),
      detail(actionType, prefix, 'DISABLED', 1, 7),
      detail(actionType, prefix, 'TARGET_TYPE', 1, 8),
      detail(actionType, prefix, 'TARGET_ID', targetId, 9),
    ],
  };
}

function detail(
  actionType: 31 | 32,
  prefix: 'ADD_VOLTAGE' | 'RECOVER_MENTAL',
  suffix: string,
  effectValue: number,
  index: number,
) {
  return {
    id: `${String(actionType)}001${String(index)}`,
    detailType: `${prefix}_ADDITIONAL_BUFF_${suffix}`,
    targetMood: 0,
    effectValue,
    params: [],
  };
}
