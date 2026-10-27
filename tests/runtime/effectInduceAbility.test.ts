import { describe, expect, test } from 'vite-plus/test';
import {
  advanceLiveEffectInduceState,
  createLiveEffectInduceAbility,
  isLiveEffectInduceConditionActive,
} from '../../src/runtime/skills/effectInduceAbility.ts';
import type { LiveSkillEffect } from '../../src/runtime/skills/skillTypes.ts';

describe('EffectInduceAbility', () => {
  test('Love Upの現在値が閾値以上の間だけ内包effectを有効にする', () => {
    const induced = skillEffect('12', 17, []);
    const ability = createLiveEffectInduceAbility(root(2, 1, 2_000_000), [
      root(2, 1, 2_000_000),
      induced,
    ]);

    expect(isLiveEffectInduceConditionActive(ability, condition({ loveUpActive: false }))).toBe(
      false,
    );
    expect(
      isLiveEffectInduceConditionActive(
        ability,
        condition({ loveUpActive: true, loveUpBonusScoreValue: 199 }),
      ),
    ).toBe(false);
    expect(
      isLiveEffectInduceConditionActive(
        ability,
        condition({ loveUpActive: true, loveUpBonusScoreValue: 200 }),
      ),
    ).toBe(true);
  });

  test('無限Mental Barrierは閾値以下の場合だけ有効にする', () => {
    const induced = skillEffect('12', 17, []);
    const atMost = createLiveEffectInduceAbility(root(1, 2, 0), [root(1, 2, 0), induced]);
    const noThreshold = createLiveEffectInduceAbility(root(1, 0, 0), [root(1, 0, 0), induced]);
    const infinite = condition({
      mentalBarrierActive: true,
      mentalBarrierRemainingEndurance: -1,
    });

    expect(isLiveEffectInduceConditionActive(atMost, infinite)).toBe(true);
    expect(isLiveEffectInduceConditionActive(noThreshold, infinite)).toBe(false);
  });

  test('閾値の成立と不成立で内包effectを一度だけactivate・deactivateする', () => {
    const effects = [root(2, 1, 2_000_000), skillEffect('12', 17, [])];
    const inactive = advanceLiveEffectInduceState(
      [],
      [{ cardInstanceId: 10, effects }],
      condition({ loveUpActive: true, loveUpBonusScoreValue: 199 }),
    );
    expect(inactive.activated).toEqual([]);

    const activated = advanceLiveEffectInduceState(
      inactive.state,
      [{ cardInstanceId: 10, effects }],
      condition({ loveUpActive: true, loveUpBonusScoreValue: 200 }),
    );
    expect(activated.activated.map((entry) => entry.inducedEffect.id)).toEqual(['12']);

    const deactivated = advanceLiveEffectInduceState(
      activated.state,
      [{ cardInstanceId: 10, effects }],
      condition({ loveUpActive: false }),
    );
    expect(deactivated.deactivated.map((entry) => entry.inducedEffect.id)).toEqual(['12']);
  });
});

function condition(
  overrides: Partial<Parameters<typeof isLiveEffectInduceConditionActive>[1]>,
): Parameters<typeof isLiveEffectInduceConditionActive>[1] {
  return {
    mentalBarrierActive: false,
    mentalBarrierRemainingEndurance: 0,
    loveUpActive: false,
    loveUpBonusScoreValue: 0,
    ...overrides,
  };
}

function root(target: number, thresholdType: number, threshold: number): LiveSkillEffect {
  return skillEffect('907', 907, [
    detail('9070', 'EFFECT_INDUCE_TARGET_EFFECT', target),
    detail('9071', 'EFFECT_INDUCE_THRESHOLD_TYPE', thresholdType),
    detail('9072', 'EFFECT_INDUCE_THRESHOLD_NUM', threshold),
    detail('9073', 'EFFECT_INDUCE_EFFECT_ID1', 12),
  ]);
}

function skillEffect(
  id: string,
  actionType: number,
  details: LiveSkillEffect['details'],
): LiveSkillEffect {
  return { id, actionType, orderId: 1, details };
}

function detail(id: string, detailType: string, effectValue: number) {
  return { id, detailType, targetMood: 0, effectValue, params: [] };
}
