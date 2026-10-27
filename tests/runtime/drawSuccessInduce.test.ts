import { describe, expect, test } from 'vite-plus/test';
import {
  createLiveDrawSuccessInduce,
  resolveLiveDrawSuccessInduceEffect,
} from '../../src/runtime/skills/drawSuccessInduce.ts';
import type { LiveSkillEffect } from '../../src/runtime/skills/skillTypes.ts';

describe('DrawSuccessInduce', () => {
  test('Mental割合以下でtrue effectを選び、Genesis中は常にtrueを選ぶ', () => {
    const effects = [root(2, 500_000), embedded('11'), embedded('12')];
    const induce = createLiveDrawSuccessInduce(effects[0]!, effects);
    expect(resolveLiveDrawSuccessInduceEffect(induce, input({ mentalRatio: 0.5 }))?.id).toBe('11');
    expect(resolveLiveDrawSuccessInduceEffect(induce, input({ mentalRatio: 0.6 }))?.id).toBe('12');
    expect(
      resolveLiveDrawSuccessInduceEffect(induce, input({ genesisActive: true, mentalRatio: 0.9 }))
        ?.id,
    ).toBe('11');
  });

  test('Voltage、section範囲、Feverを除くsection番号をruntime条件で判定する', () => {
    const voltage = createLiveDrawSuccessInduce(root(5, 70_000), [
      root(5, 70_000),
      embedded('11'),
      embedded('12'),
    ]);
    expect(resolveLiveDrawSuccessInduceEffect(voltage, input({ voltageLevel: 7 }))?.id).toBe('11');
    const rangeEffects = [root(6, 3), embedded('11'), embedded('12')];
    expect(
      resolveLiveDrawSuccessInduceEffect(
        createLiveDrawSuccessInduce(rangeEffects[0]!, rangeEffects),
        input({ currentSection: 3 }),
      )?.id,
    ).toBe('12');
    const sectionEffects = [root(7, 2), embedded('11'), embedded('12')];
    expect(
      resolveLiveDrawSuccessInduceEffect(
        createLiveDrawSuccessInduce(sectionEffects[0]!, sectionEffects),
        input({ currentSection: 2, feverSection: 1 }),
      )?.id,
    ).toBe('11');
  });

  test('解除種別未指定はcontinuous branchだけ継続になる', () => {
    const alwaysEffects = [root(1, 0), embedded('11'), embedded('12')];
    const continuousEffects = [root(3, 0), embedded('11'), embedded('12')];
    expect(createLiveDrawSuccessInduce(alwaysEffects[0]!, alwaysEffects).disabledType).toBe(0);
    expect(createLiveDrawSuccessInduce(continuousEffects[0]!, continuousEffects).disabledType).toBe(
      1,
    );
  });
});

function input(
  overrides: Partial<Parameters<typeof resolveLiveDrawSuccessInduceEffect>[1]>,
): Parameters<typeof resolveLiveDrawSuccessInduceEffect>[1] {
  return {
    genesisActive: false,
    mentalRatio: 1,
    moodValue: 0,
    voltageLevel: 1,
    currentSection: 0,
    feverSection: 4,
    ...overrides,
  };
}

function root(branchType: number, branchValue: number): LiveSkillEffect {
  return {
    id: '901',
    actionType: 901,
    orderId: 1,
    details: [
      detail('9010', 'DRAW_SUCCESS_INDUCE_BRANCH_TYPE', branchType),
      detail('9011', 'DRAW_SUCCESS_INDUCE_BRANCH_VALUE', branchValue),
      detail('9012', 'DRAW_SUCCESS_INDUCE_EFFECT_ID1', 11),
      detail('9013', 'DRAW_SUCCESS_INDUCE_EFFECT_ID2', 12),
    ],
  };
}

function embedded(id: string): LiveSkillEffect {
  return {
    id,
    actionType: 14,
    orderId: 2,
    details: [detail(`${id}0`, 'RECOVER_AP_NUM', 10_000)],
  };
}

function detail(id: string, detailType: string, effectValue: number) {
  return { id, detailType, targetMood: 0, effectValue, params: [] };
}
