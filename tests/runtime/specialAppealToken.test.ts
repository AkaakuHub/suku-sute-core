import { expect, test } from 'vite-plus/test';
import { createLiveSpecialAppealTokenEffect } from '../../src/runtime/cards/specialAppealToken.ts';

test('runtimeと保存masterのActionType53をtoken descriptorへ変換する', () => {
  expect(
    createLiveSpecialAppealTokenEffect({
      id: '10335280010',
      actionType: 53,
      orderId: 1,
      details: [
        detail('SPECIAL_APPEAL_TOKEN_SET_ID', 1033528001),
        detail('SPECIAL_APPEAL_TOKEN_COOLTIME', 4),
        detail('SPECIAL_APPEAL_TOKEN_TARGET_TYPE', 1),
        detail('SPECIAL_APPEAL_TOKEN_LEVEL_TYPE', 1),
      ],
    }),
  ).toEqual({
    effectId: '10335280010',
    tokenSetId: 1033528001,
    coolTimeSeconds: 4,
    targetType: 'song-period',
    levelType: 'special-appeal-level',
  });
});

test('未記録のActionType53 target typeは受け入れない', () => {
  expect(() =>
    createLiveSpecialAppealTokenEffect({
      id: 'token',
      actionType: 53,
      orderId: 1,
      details: [
        detail('SPECIAL_APPEAL_TOKEN_SET_ID', 1033528001),
        detail('SPECIAL_APPEAL_TOKEN_COOLTIME', 4),
        detail('SPECIAL_APPEAL_TOKEN_TARGET_TYPE', 2),
        detail('SPECIAL_APPEAL_TOKEN_LEVEL_TYPE', 1),
      ],
    }),
  ).toThrow('target type is invalid');
});

function detail(detailType: string, effectValue: number) {
  return {
    id: `detail-${detailType}`,
    detailType,
    targetMood: 0,
    effectValue,
    params: [],
  };
}
