import { expect, it } from 'vite-plus/test';
import { createSpecialAppealTokenEffect } from '../../src/game/actionTypeEffects/specialAppealToken.ts';

it('ActionType53はlong詳細値をint32化し、曲とカードの系列情報を保持する', () => {
  expect(
    createSpecialAppealTokenEffect({
      skillEffectId: 53n,
      musicGenerationsId: 3,
      sourceSkillLevel: 7,
      sourceSpecialAppealSkillLevel: 5,
      memberOrder: [1021, 1022],
      tokenCardSets: [],
      details: [
        { id: 1n, detailType: 'SPECIAL_APPEAL_TOKEN_SET_ID', value: 2_147_483_649n },
        { id: 2n, detailType: 'SPECIAL_APPEAL_TOKEN_COOLTIME', value: 2_147_483_648n },
        { id: 3n, detailType: 'SPECIAL_APPEAL_TOKEN_TARGET_TYPE', value: 1n },
        { id: 4n, detailType: 'SPECIAL_APPEAL_TOKEN_LEVEL_TYPE', value: 2n },
      ],
    }),
  ).toEqual({
    kind: 'special-appeal-token',
    tokenSetId: -2_147_483_647,
    coolTime: -2_147_483_648,
    targetType: 1,
    levelType: 2,
    musicGenerationsId: 3,
    sourceSkillLevel: 7,
    sourceSpecialAppealSkillLevel: 5,
    memberOrder: [1021, 1022],
    tokenCardSets: [],
  });
});
