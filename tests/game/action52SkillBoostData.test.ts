import { expect, it } from 'vite-plus/test';
import { createSkillBoostEffect } from '../../src/game/actionTypeEffects/skillBoost.ts';

it('ActionType52はint32・Mood・対象・long期限・series指定を変換する', () => {
  expect(
    createSkillBoostEffect({
      skillEffectId: 52n,
      invocationType: 0x38b,
      deactivationKey: 'boost',
      details: [
        { id: 1n, detailType: 'SKILL_BOOST_TYPE', targetMood: 0, value: 1n },
        { id: 2n, detailType: 'SKILL_BOOST_NUM', targetMood: 0, value: 2_147_483_648n },
        { id: 3n, detailType: 'SKILL_BOOST_BONUS_MOOD', targetMood: 2, value: 12n },
        { id: 4n, detailType: 'SKILL_BOOST_DISPLAY_TIME_TYPE', targetMood: 0, value: 2n },
        {
          id: 5n,
          detailType: 'SKILL_BOOST_DISPLAY_TIME_VALUE',
          targetMood: 0,
          value: (1n << 53n) + 1n,
        },
        { id: 6n, detailType: 'SKILL_BOOST_EXPIRE_TYPE', targetMood: 0, value: 1n },
        { id: 7n, detailType: 'SKILL_BOOST_EXPIRE_VALUE', targetMood: 0, value: (1n << 53n) + 3n },
        { id: 8n, detailType: 'SKILL_BOOST_TARGET_TYPE', targetMood: 0, value: 1n },
        { id: 9n, detailType: 'SKILL_BOOST_TARGET_ID', targetMood: 0, value: 1030n },
        {
          id: 10n,
          detailType: 'SKILL_BOOST_TOKEN_CARD_SERIES_ID',
          targetMood: 0,
          value: 0n,
          paramValues: [(1n << 53n) + 4n],
        },
      ],
    }),
  ).toEqual({
    kind: 'skill-boost',
    num: -2_147_483_648,
    target: { kind: 'member', member: 1030 },
    moodBonus: { target: 2, perPoint: Math.fround(12 / 10_000) },
    duration: { kind: 'sections', value: (1n << 53n) + 1n },
    uses: (1n << 53n) + 3n,
    skillTokenSeriesIds: [(1n << 53n) + 4n],
    invocationType: 0x38b,
    deactivationKey: 'boost',
  });
});

it('ActionType52は参照実装既定値を使う', () => {
  expect(createSkillBoostEffect({ skillEffectId: 52n, details: [] })).toEqual({
    kind: 'skill-boost',
    num: 0,
    target: { kind: 'all' },
    duration: { kind: 'milliseconds', value: 0n },
    uses: null,
  });
});
