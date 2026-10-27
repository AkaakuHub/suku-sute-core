import { expect, test } from 'vite-plus/test';
import {
  activateLiveMoodValueAdditionalBuff,
  advanceLiveMoodValueAdditionalBuffState,
  applyLiveMoodValueAdditionalBuffs,
  createLiveMoodValueAdditionalBuffState,
} from '../../src/runtime/skills/moodValueAdditionalBuff.ts';

const card = {
  charactersId: 1043,
  unitIds: [103],
  tokenCardSeriesIds: [],
  skillTokenCardSeriesIds: [],
};

test('ChangeMoodValueBoostの割合buffを負のMood変化の絶対値へ適用して使用回数を消費する', () => {
  const state = activateLiveMoodValueAdditionalBuff(
    createLiveMoodValueAdditionalBuffState(),
    effect(1, 130_000, 0, 1),
    {
      currentTimeSeconds: 10,
      currentMoodValue: 0,
      power: { addValue: 0, multiplyFactor: 1, effectPower: 9 },
      applySkillBoost: (value) => value,
    },
  );
  const applied = applyLiveMoodValueAdditionalBuffs(state, card, -40);

  expect(applied.value).toBeCloseTo(-45.2);
  expect(applied.state.effects).toEqual([]);
});

test('ChangeMoodValueBoostの加算buffはMood補正と発動powerとSkillBoostをruntime順で適用する', () => {
  const state = activateLiveMoodValueAdditionalBuff(
    createLiveMoodValueAdditionalBuffState(),
    effect(2, 100_000, 1_000, 0),
    {
      currentTimeSeconds: 10,
      currentMoodValue: 20,
      power: { addValue: 0.5, multiplyFactor: 2, effectPower: 9 },
      applySkillBoost: (value) => value * 1.5,
    },
  );
  const applied = applyLiveMoodValueAdditionalBuffs(state, card, 10);

  expect(state.effects[0]?.calculation).toEqual({ kind: 'add', value: 38 });
  expect(applied.value).toBe(48);
});

test('ChangeMoodValueBoostはsection期限で共通additional buffから除去する', () => {
  const state = activateLiveMoodValueAdditionalBuff(
    createLiveMoodValueAdditionalBuffState(),
    effect(1, 100_000, 0, 0, 2, 2),
    {
      currentTimeSeconds: 0,
      currentMoodValue: 0,
      power: { addValue: 0, multiplyFactor: 1, effectPower: 1 },
      applySkillBoost: (value) => value,
    },
  );

  expect(
    advanceLiveMoodValueAdditionalBuffState(state, {
      currentTimeSeconds: 1,
      sectionChangeCount: 2,
      musicEnded: false,
    }).effects,
  ).toEqual([]);
});

function effect(
  calculationType: 1 | 2,
  value: number,
  bonusMood: number,
  disabledType: 0 | 1,
  displayTimeType = 3,
  displayTime = 0,
) {
  return {
    id: '5001',
    actionType: 50,
    orderId: 1,
    details: [
      detail('1', 'CHANGE_MOOD_VALUE_BOOST_CALC_TYPE', calculationType),
      detail('2', 'CHANGE_MOOD_VALUE_BOOST_PARAM', value),
      {
        ...detail('3', 'CHANGE_MOOD_VALUE_BOOST_NUM_BONUS_MOOD', bonusMood),
        targetMood: bonusMood === 0 ? 0 : 1,
      },
      detail('4', 'CHANGE_MOOD_VALUE_BOOST_DISPLAY_TIME_TYPE', displayTimeType),
      detail('5', 'CHANGE_MOOD_VALUE_BOOST_DISPLAY_TIME_PARAM', displayTime),
      detail('6', 'CHANGE_MOOD_VALUE_BOOST_DISABLED_TYPE', disabledType),
      detail('7', 'CHANGE_MOOD_VALUE_BOOST_DISABLED_PARAM', 1),
      detail('8', 'CHANGE_MOOD_VALUE_BOOST_TARGET_TYPE', 0),
      detail('9', 'CHANGE_MOOD_VALUE_BOOST_TARGET_TYPE_ID', 0),
      detail('10', 'CHANGE_MOOD_VALUE_BOOST_TOKEN_CARD_SERIES_ID', 0),
    ],
  };
}

function detail(id: string, detailType: string, effectValue: number) {
  return { id, detailType, targetMood: 0, effectValue, params: [] };
}
