import { expect, test } from 'vite-plus/test';
import {
  activateLiveMentalHeartInduce,
  advanceLiveMentalHeartInduceState,
  createLiveMentalHeartInduceState,
  induceLiveMentalRecoveryHearts,
} from '../../src/runtime/skills/mentalHeartInduce.ts';
import type { LiveSkillEffect } from '../../src/runtime/skills/skillTypes.ts';

test('Mental回復実量からHeart UpとSkill Boostの順で固定Heart数を算出する', () => {
  const state = activateLiveMentalHeartInduce(
    createLiveMentalHeartInduceState(),
    effect({ disabledType: 1, disabledCount: 1 }),
    {
      currentTimeSeconds: 0,
      power: { addValue: 1, multiplyFactor: 2, effectPower: 9 },
      card,
      parentControlsLifetime: false,
    },
  );
  const calls: string[] = [];
  const induced = induceLiveMentalRecoveryHearts(state, 3, {
    applyHeartUp: (_card, value) => {
      calls.push(`heart:${String(value)}`);
      return value + 0.2;
    },
    applySkillBoost: (_card, value) => {
      calls.push(`boost:${String(value)}`);
      return value * 1.5;
    },
  });

  expect(calls).toEqual(['heart:6', 'boost:6.2']);
  expect(induced.heartOptions).toEqual([
    {
      calculation: { kind: 'fixed', value: 10 },
      lifeTimeSeconds: 0.5,
      effectPower: 1,
    },
  ]);
  expect(induced.state).toEqual([]);
});

test('親が寿命を管理する効果だけはclockで解除せず、明示解除まで保持する', () => {
  const parentControlled = activateLiveMentalHeartInduce(
    createLiveMentalHeartInduceState(),
    effect({ displayTimeType: 1, displayTime: 1_000 }),
    {
      currentTimeSeconds: 2,
      power: { addValue: 0, multiplyFactor: 1, effectPower: 1 },
      card,
      parentControlsLifetime: true,
    },
  );

  expect(
    advanceLiveMentalHeartInduceState(parentControlled, {
      deltaTimeSeconds: 3,
      sectionChangeCount: 0,
      musicEnded: false,
    }),
  ).toHaveLength(1);
  expect(
    advanceLiveMentalHeartInduceState(
      parentControlled.map((entry) => ({
        ...entry,
        parentControlsLifetime: false,
      })),
      {
        deltaTimeSeconds: 3,
        sectionChangeCount: 0,
        musicEnded: false,
      },
    ),
  ).toEqual([]);
});

test('runtimeと異なるdetail schemaを拒否する', () => {
  const invalid = effect();
  expect(() =>
    activateLiveMentalHeartInduce(
      createLiveMentalHeartInduceState(),
      { ...invalid, details: invalid.details.slice(1) },
      {
        currentTimeSeconds: 0,
        power: { addValue: 0, multiplyFactor: 1, effectPower: 1 },
        card,
        parentControlsLifetime: false,
      },
    ),
  ).toThrow('skill effect details differ');
});

const card = {
  cardInstanceId: 1001,
  charactersId: 1,
  unitIds: [101],
  tokenCardSeriesIds: [],
  skillTokenCardSeriesIds: [],
};

function effect(
  overrides: Readonly<{
    displayTimeType?: number;
    displayTime?: number;
    disabledType?: number;
    disabledCount?: number;
  }> = {},
): LiveSkillEffect {
  return {
    id: '23001',
    actionType: 23,
    orderId: 1,
    details: [
      detail('1', 'MENTAL_HEART_INDUCE_NUM', 9_999),
      detail('2', 'MENTAL_HEART_INDUCE_HEART_DISPLAY_TIME_TYPE', 1),
      detail('3', 'MENTAL_HEART_INDUCE_HEART_DISPLAY_TIME', 500),
      detail('4', 'MENTAL_HEART_INDUCE_DISPLAY_TIME_TYPE', overrides.displayTimeType ?? 3),
      detail('5', 'MENTAL_HEART_INDUCE_DISPLAY_TIME', overrides.displayTime ?? 0),
      detail('6', 'MENTAL_HEART_INDUCE_DISABLED_TYPE', overrides.disabledType ?? 0),
      detail('7', 'MENTAL_HEART_INDUCE_DISABLED', overrides.disabledCount ?? 0),
    ],
  };
}

function detail(id: string, detailType: string, effectValue: number) {
  return { id, detailType, targetMood: 0, effectValue, params: [] };
}
