import { expect, test } from 'vite-plus/test';
import {
  activateLiveHeartLimit,
  activateLiveHeartLimitAdditionalBuff,
  advanceLiveHeartLimitState,
  createLiveHeartLimitState,
  liveHeartLimitValue,
} from '../../src/runtime/live/heartLimit.ts';

const card = {
  charactersId: 1031,
  unitIds: [101],
  tokenCardSeriesIds: [],
  skillTokenCardSeriesIds: [1_953_401],
} as const;

test('Heart上限additional buffをruntime順でActionType25へ適用して使用回数を消費する', () => {
  const withAdditionalBuff = activateLiveHeartLimitAdditionalBuff(
    createLiveHeartLimitState(),
    heartLimitAdditionalBuffEffect,
    {
      currentTimeSeconds: 1,
      currentMoodValue: 2,
      power: { addValue: 0.5, multiplyFactor: 1.5, effectPower: 9 },
    },
  );
  const activated = activateLiveHeartLimit(withAdditionalBuff, heartLimitEffect, {
    currentTimeSeconds: 1,
    currentMoodValue: 2,
    card,
    power: { addValue: 1, multiplyFactor: 2, effectPower: 0.5 },
    applySkillBoost: (value) => Math.fround(value * 1.5),
  });

  expect(activated.effectAmount).toBe(27);
  expect(activated.valueWithoutLimit).toBe(127);
  expect(activated.value).toBe(127);
  expect(activated.state.additionalBuffs).toEqual([]);
});

test('Heart上限効果を時間満了時に破棄して基礎値へ戻す', () => {
  const activated = activateLiveHeartLimit(
    createLiveHeartLimitState(),
    {
      ...heartLimitEffect,
      details: heartLimitEffect.details.map((detail) =>
        detail.detailType === 'CHANGE_HEART_LIMIT_DISPLAY_TIME_TYPE'
          ? { ...detail, effectValue: 1 }
          : detail.detailType === 'CHANGE_HEART_LIMIT_DISPLAY_TIME'
            ? { ...detail, effectValue: 1_000 }
            : detail,
      ),
    },
    {
      currentTimeSeconds: 1,
      currentMoodValue: 0,
      card,
      power: { addValue: 0, multiplyFactor: 1, effectPower: 1 },
      applySkillBoost: (value) => value,
    },
  );
  expect(liveHeartLimitValue(activated.state)).toBe(110);

  const expired = advanceLiveHeartLimitState(activated.state, {
    deltaTimeSeconds: 2,
    sectionChangeCount: 0,
    musicEnded: false,
  });
  expect(liveHeartLimitValue(expired)).toBe(100);
});

const heartLimitEffect = effect(25, '2501', [
  ['CHANGE_HEART_LIMIT_CALC_TYPE', 1, 0],
  ['CHANGE_HEART_LIMIT_NUM', 100_000, 0],
  ['CHANGE_HEART_LIMIT_NUM_BONUS_MOOD', 10_000, 1],
  ['CHANGE_HEART_LIMIT_DISPLAY_TIME_TYPE', 2, 0],
  ['CHANGE_HEART_LIMIT_DISPLAY_TIME', 2, 0],
]);

const heartLimitAdditionalBuffBaseEffect = effect(49, '4901', [
  ['CHANGE_HEART_LIMIT_BOOST_CALC_TYPE', 1, 0],
  ['CHANGE_HEART_LIMIT_BOOST_PARAM', 200_000, 0],
  ['CHANGE_HEART_LIMIT_BOOST_NUM_BONUS_MOOD', 10_000, 1],
  ['CHANGE_HEART_LIMIT_BOOST_DISPLAY_TIME_TYPE', 2, 0],
  ['CHANGE_HEART_LIMIT_BOOST_DISPLAY_TIME_PARAM', 4, 0],
  ['CHANGE_HEART_LIMIT_BOOST_DISABLED_TYPE', 1, 0],
  ['CHANGE_HEART_LIMIT_BOOST_DISABLED_PARAM', 1, 0],
  ['CHANGE_HEART_LIMIT_BOOST_TARGET_TYPE', 1, 0],
  ['CHANGE_HEART_LIMIT_BOOST_TARGET_TYPE_ID', 0, 0],
  ['CHANGE_HEART_LIMIT_BOOST_TOKEN_CARD_SERIES_ID', 0, 0],
]);

const heartLimitAdditionalBuffEffect = {
  ...heartLimitAdditionalBuffBaseEffect,
  details: heartLimitAdditionalBuffBaseEffect.details.map((detail) =>
    detail.detailType === 'CHANGE_HEART_LIMIT_BOOST_TOKEN_CARD_SERIES_ID'
      ? {
          ...detail,
          params: [
            {
              paramType: 'CHANGE_HEART_LIMIT_BOOST_TOKEN_CARD_SERIES_ID',
              paramValue: '1953401',
            },
          ],
        }
      : detail,
  ),
};

function effect(
  actionType: number,
  id: string,
  values: readonly (readonly [string, number, number])[],
) {
  return {
    id,
    actionType,
    orderId: 1,
    details: values.map(([detailType, effectValue, targetMood], index) => ({
      id: `${id}${String(index + 1)}`,
      detailType,
      effectValue,
      targetMood,
      params: [] as readonly Readonly<{
        paramType: string;
        paramValue: string;
      }>[],
    })),
  };
}
