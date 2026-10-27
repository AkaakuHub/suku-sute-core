import { expect, test } from 'vite-plus/test';
import {
  activateLiveMentalShield,
  advanceLiveMentalShieldState,
  applyLiveMentalShieldDamage,
  createLiveMentalShieldState,
} from '../../src/runtime/skills/mentalShield.ts';
import type { LiveSkillEffect } from '../../src/runtime/skills/skillTypes.ts';

test('割合耐久値を最大Mentalから算出し、登録順にdamageと適用回数を消費する', () => {
  const activated = activateLiveMentalShield(
    createLiveMentalShieldState(),
    mentalShieldEffect(1, 20_000, 2, 3, 0),
    activationInput,
  );
  expect(activated.effectAmount).toBe(10);

  const first = applyLiveMentalShieldDamage(activated.state, 6);
  expect(first.remainingDamage).toBe(0);
  expect(first.state[0]?.remainingApplications).toBe(1);
  const second = applyLiveMentalShieldDamage(first.state, 6);
  expect(second.remainingDamage).toBe(2);
  expect(second.state).toEqual([]);
});

test('有限Shieldは耐久値が残っても指定適用回数で終了する', () => {
  const activated = activateLiveMentalShield(
    createLiveMentalShieldState(),
    mentalShieldEffect(2, 100_000, 1, 3, 0),
    activationInput,
  );
  const applied = applyLiveMentalShieldDamage(activated.state, 2);

  expect(applied.remainingDamage).toBe(0);
  expect(applied.state).toEqual([]);
});

test('無限Shieldは適用回数を消費せず、duration終了時に取り除く', () => {
  const activated = activateLiveMentalShield(
    createLiveMentalShieldState(),
    mentalShieldEffect(3, 0, 1, 1, 1_000),
    activationInput,
  );
  const applied = applyLiveMentalShieldDamage(activated.state, 100);

  expect(applied.remainingDamage).toBe(0);
  expect(applied.state).toEqual(activated.state);
  expect(
    advanceLiveMentalShieldState(applied.state, {
      currentTimeSeconds: 1,
      sectionChangeCount: 0,
      musicEnded: false,
    }),
  ).toEqual([]);
});

const activationInput = {
  currentTimeSeconds: 0,
  currentMoodValue: 0,
  maximumMental: 500,
  power: { addValue: 0, multiplyFactor: 1, effectPower: 1 },
  applySkillBoost: (value: number) => value,
} as const;

function mentalShieldEffect(
  durabilityType: 1 | 2 | 3,
  durability: number,
  applyCount: number,
  displayTimeType: 1 | 2 | 3,
  displayTime: number,
): LiveSkillEffect {
  return {
    id: '56001',
    actionType: 56,
    orderId: 1,
    details: [
      detail('1', 'MENTAL_SHIELD_DURABILITY_TYPE', durabilityType),
      detail('2', 'MENTAL_SHIELD_DURABILITY', durability),
      detail('3', 'MENTAL_SHIELD_DURABILITY_MOOD_MODIFYER', 0),
      detail('4', 'MENTAL_SHIELD_DISPLAY_TIME_TYPE', displayTimeType),
      detail('5', 'MENTAL_SHIELD_DISPLAY_TIME', displayTime),
      detail('6', 'MENTAL_SHIELD_APPLY_COUNT', applyCount),
    ],
  };
}

function detail(id: string, detailType: string, effectValue: number) {
  return { id, detailType, targetMood: 0, effectValue, params: [] };
}
