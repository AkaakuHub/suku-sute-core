import { expect, test } from 'vite-plus/test';
import {
  activateLiveSkillBoostEffect,
  advanceLiveSkillBoostState,
  applyLiveSkillBoosts,
  createLiveSkillBoostEffect,
  createLiveSkillBoostState,
} from '../../src/runtime/skills/skillBoost.ts';

test('対象とskill tokenが一致するMultiply2を適用し使用回数で解除する', () => {
  const effect = createLiveSkillBoostEffect(
    skillBoostEffect({
      effectId: '52001',
      targetType: 2,
      targetId: 101,
      tokenCardSeriesIds: [1953401],
    }),
    1,
    20,
  );
  if (effect === null) throw new Error('SkillBoost fixture is inactive');
  const state = activateLiveSkillBoostEffect(createLiveSkillBoostState(), effect);
  const unmatched = applyLiveSkillBoosts(
    state,
    {
      charactersId: 1031,
      unitIds: [101],
      tokenCardSeriesIds: [],
      skillTokenCardSeriesIds: [],
    },
    2,
  );
  expect(unmatched.value).toBe(2);
  expect(unmatched.state).toEqual(state);

  const matched = applyLiveSkillBoosts(
    state,
    {
      charactersId: 1031,
      unitIds: [101],
      tokenCardSeriesIds: [],
      skillTokenCardSeriesIds: [1953401],
    },
    2,
  );
  expect(matched.value).toBeCloseTo(2.6);
  expect(matched.state).toEqual(createLiveSkillBoostState());
});

test('Multiply2合計を-100で下限固定しsection期限を進める', () => {
  const base = createLiveSkillBoostEffect(
    skillBoostEffect({
      effectId: '52002',
      baseValue: -1_500_000,
      expireType: 0,
      expireValue: 0,
    }),
    0,
    0,
  );
  if (base === null) throw new Error('SkillBoost fixture is inactive');
  const active = activateLiveSkillBoostEffect(createLiveSkillBoostState(), base);
  expect(
    applyLiveSkillBoosts(
      active,
      {
        charactersId: 1031,
        unitIds: [101],
        tokenCardSeriesIds: [],
        skillTokenCardSeriesIds: [],
      },
      8,
    ).value,
  ).toBe(0);
  const firstSection = advanceLiveSkillBoostState(active, {
    currentTimeSeconds: 1,
    sectionChangeCount: 1,
    musicEnded: false,
  });
  expect(firstSection.effects[0]?.duration).toEqual({
    kind: 'sections',
    remainingChanges: 1,
  });
  expect(
    advanceLiveSkillBoostState(firstSection, {
      currentTimeSeconds: 2,
      sectionChangeCount: 1,
      musicEnded: false,
    }),
  ).toEqual(createLiveSkillBoostState());
});

test('同じSkillBoostの再発動を重ねて使用回数を個別に消費する', () => {
  const effect = createLiveSkillBoostEffect(skillBoostEffect({ effectId: '52004' }), 0, 0);
  if (effect === null) throw new Error('SkillBoost fixture is inactive');
  const state = activateLiveSkillBoostEffect(
    activateLiveSkillBoostEffect(createLiveSkillBoostState(), effect),
    effect,
  );

  const applied = applyLiveSkillBoosts(
    state,
    {
      charactersId: 1031,
      unitIds: [101],
      tokenCardSeriesIds: [],
      skillTokenCardSeriesIds: [],
    },
    10,
  );

  expect(applied.value).toBe(14);
  expect(applied.state).toEqual(createLiveSkillBoostState());
});

test('SKILL_BOOST_TYPE=1以外は公式どおりbuffを登録しない', () => {
  expect(
    createLiveSkillBoostEffect(skillBoostEffect({ effectId: '52003', boostType: 2 }), 0, 0),
  ).toBeNull();
});

function skillBoostEffect(
  input: Readonly<{
    effectId: string;
    boostType?: number;
    baseValue?: number;
    targetType?: number;
    targetId?: number;
    expireType?: number;
    expireValue?: number;
    tokenCardSeriesIds?: readonly number[];
  }>,
) {
  const values = [
    ['SKILL_BOOST_TYPE', input.boostType ?? 1, 0],
    ['SKILL_BOOST_NUM', input.baseValue ?? 200_000, 0],
    ['SKILL_BOOST_BONUS_MOOD', 5_000, 1],
    ['SKILL_BOOST_DISPLAY_TIME_TYPE', 2, 0],
    ['SKILL_BOOST_DISPLAY_TIME_VALUE', 2, 0],
    ['SKILL_BOOST_EXPIRE_TYPE', input.expireType ?? 1, 0],
    ['SKILL_BOOST_EXPIRE_VALUE', input.expireValue ?? 1, 0],
    ['SKILL_BOOST_TARGET_TYPE', input.targetType ?? 0, 0],
    ['SKILL_BOOST_TARGET_ID', input.targetId ?? 0, 0],
    ['SKILL_BOOST_TOKEN_CARD_SERIES_ID', 0, 0],
  ] as const;
  return {
    id: input.effectId,
    actionType: 52,
    orderId: 1,
    details: values.map(([detailType, effectValue, targetMood], index) => ({
      id: `${input.effectId}${String(index + 1)}`,
      detailType,
      targetMood,
      effectValue,
      params:
        detailType === 'SKILL_BOOST_TOKEN_CARD_SERIES_ID'
          ? (input.tokenCardSeriesIds ?? []).map((cardSeriesId) => ({
              paramType: detailType,
              paramValue: String(cardSeriesId),
            }))
          : [],
    })),
  } as const;
}
