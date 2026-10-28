import { expect, test } from 'vite-plus/test';
import {
  createLiveDeckBoardState,
  moveLiveHandCardToExtra,
  liveBoardState,
} from '../../src/runtime/cards/deckBoardState.ts';
import {
  applyLiveCardMoveEffect,
  createLiveCardMoveEffect,
  createLiveCardSearchEffect,
  createLiveChangeApEffect,
  createLiveHandCardCountEffect,
  createLiveReshuffleEffect,
  createLiveUseAllHandEffect,
  resolveLiveHandCardCountActivation,
} from '../../src/runtime/cards/deckSkillActions.ts';
import {
  createLiveBoostTokenCardEffect,
  createLiveSwitchTokenCardDeckEffect,
  createLiveTokenCardEffect,
} from '../../src/runtime/cards/tokenCardEffects.ts';
import { createLiveHandCardMaxEffect } from '../../src/runtime/skills/handCardMax.ts';

test('runtime enumのdeck action 13/15を保存masterのdetailから共通descriptorへ変換する', () => {
  expect(
    createLiveReshuffleEffect(
      effect(13, [detail('RESHUFFLE_RECOVERY_TYPE', 1), detail('RESHUFFLE_STASH_TYPE', 1)]),
    ),
  ).toEqual({
    effectId: '13-effect',
    recoveryType: 'recovery',
    stashType: 'deck',
  });
  expect(
    createLiveCardSearchEffect(
      effect(15, [detail('CARD_SEARCH_TYPE', 2), detail('CARD_SEARCH_ID', 1021)]),
    ),
  ).toEqual({
    effectId: '15-effect',
    searchType: 'character-id',
    searchId: 1021,
  });
  expect(
    createLiveCardSearchEffect(
      effect(15, [detail('CARD_SEARCH_TYPE', 1), detail('CARD_SEARCH_ID', 3)]),
    ),
  ).toEqual({
    effectId: '15-effect',
    searchType: 'skill-main-effect',
    searchId: 3,
  });
});

test('ActionType17/20は保存detailの加算条件と表示期間を保持する', () => {
  const changeAp = createLiveChangeApEffect(
    effect(17, [
      detail('CHANGE_AP_NUM', -10_000),
      detail('CHANGE_AP_MAX', -10_000),
      detail('CHANGE_AP_MIN', -10_000),
      detail('CHANGE_AP_CONDITION_TYPE', 1),
      detail('CHANGE_AP_CONDITION_ID', 0),
      detail('CHANGE_AP_DISPLAY_TIME_TYPE', 3),
      detail('CHANGE_AP_DISPLAY_TIME', 0),
    ]),
    0,
  );
  expect(changeAp).toMatchObject({
    amount: -1,
    maximum: -1,
    minimum: -1,
    conditionType: 1,
    duration: { kind: 'full-end' },
  });
  expect(() =>
    createLiveChangeApEffect(
      effect(17, [
        detail('CHANGE_AP_NUM', 1),
        detail('CHANGE_AP_MAX', 0),
        detail('CHANGE_AP_MIN', 0),
        detail('CHANGE_AP_CONDITION_TYPE', 1),
        detail('CHANGE_AP_CONDITION_ID', 0),
        detail('CHANGE_AP_DISPLAY_TIME_TYPE', 3),
        detail('CHANGE_AP_DISPLAY_TIME', 0),
      ]),
      0,
    ),
  ).toThrow('Live ChangeAP amount has unsupported precision');
  const handCount = createLiveHandCardCountEffect(
    effect(20, [
      detail('CHANGE_HAND_CARD_COUNT_CALC_TYPE', 1),
      detail('CHANGE_HAND_CARD_COUNT_NUM', -1),
      detail('CHANGE_HAND_CARD_COUNT_DISPLAY_TIME_TYPE', 3),
      detail('CHANGE_HAND_CARD_COUNT_DISPLAY_TIME', 0),
    ]),
    0,
  );
  expect(resolveLiveHandCardCountActivation(5, handCount)).toEqual({
    targetHandCount: 4,
    changeCount: -1,
  });
});

test('ActionType19は使用後の行き先だけを保存して現在の盤面を変えない', () => {
  const board = moveLiveHandCardToExtra(createLiveDeckBoardState([101, 102], [101]), 101);
  const moved = applyLiveCardMoveEffect(
    board,
    101,
    createLiveCardMoveEffect(effect(19, [detail('CARD_MOVE_TYPE', 2)])),
  );
  expect(moved.cards.find((card) => card.cardInstanceId === 101)).toMatchObject({
    cardInstanceId: 101,
    cardDatasId: 101,
    boardState: liveBoardState.extra,
    skillUseAtBoardState: liveBoardState.exclusion,
  });
});

test('ActionType28は能力level参照の有無を含む保存masterのtoken descriptorへ変換する', () => {
  const token = createLiveTokenCardEffect(
    effect(28, [
      detail('TOKEN_CARD_RESOURCE_ID', 80315231),
      detail('TOKEN_CARD_STYLE_TYPE', 2),
      detail('TOKEN_CARD_MOOD_TYPE', 3),
      detail('TOKEN_CARD_SKILL_CARD_SKILL_SERIES_ID', 80115010),
      detail('TOKEN_CARD_ABILITY_CARD_SKILL_SERIES_ID', 90115010),
      detail('TOKEN_CARD_CARD_COUNT', 2),
      detail('TOKEN_CARD_SERIES_ID', 802142000120),
    ]),
  );
  expect(token.abilityLevelReference).toBe('none');
  expect(token.tokenCardSeriesIds).toEqual([802142000120]);
  expect(
    createLiveTokenCardEffect(
      effect(28, [
        detail('TOKEN_CARD_RESOURCE_ID', 80315231),
        detail('TOKEN_CARD_STYLE_TYPE', 2),
        detail('TOKEN_CARD_MOOD_TYPE', 3),
        detail('TOKEN_CARD_SKILL_CARD_SKILL_SERIES_ID', 80115010),
        detail('TOKEN_CARD_ABILITY_CARD_SKILL_SERIES_ID', 90115010),
        detail('TOKEN_CARD_CARD_COUNT', 0),
        detail('TOKEN_CARD_SERIES_ID', 802142000120),
      ]),
    ).cardCount,
  ).toBe(0);
  expect(
    createLiveTokenCardEffect(
      effect(28, [
        detail('TOKEN_CARD_RESOURCE_ID', 80315231, 'TOKEN_CARD_SERIES_ID', '27', '123'),
        detail('TOKEN_CARD_STYLE_TYPE', 2),
        detail('TOKEN_CARD_MOOD_TYPE', 3),
        detail('TOKEN_CARD_SKILL_CARD_SKILL_SERIES_ID', 80115010),
        detail('TOKEN_CARD_ABILITY_CARD_SKILL_SERIES_ID', 90115010),
        detail('TOKEN_CARD_CARD_COUNT', 1),
        detail('TOKEN_CARD_ABILITY_LEVEL_REFERENCE', 1),
        detail('TOKEN_CARD_SERIES_ID', 123),
      ]),
    ).abilityLevelReference,
  ).toBe('special-appeal');
});

test('ActionType38/42/43は保存masterのtarget・paramを失わず変換する', () => {
  const boost = createLiveBoostTokenCardEffect(
    effect(38, [
      detail('BOOST_TOKEN_CARD_CALC_TYPE', 2),
      detail('BOOST_TOKEN_CARD_NUM', 20_000),
      detail('BOOST_TOKEN_CARD_DISPLAY_TIME_TYPE', 3),
      detail('BOOST_TOKEN_CARD_DISPLAY_TIME', 0),
      detail('BOOST_TOKEN_CARD_DISABLED_TYPE', 1),
      detail('BOOST_TOKEN_CARD_DISABLED', 1),
      detail('BOOST_TOKEN_CARD_TARGET_TYPE', 0),
      detail('BOOST_TOKEN_CARD_TARGET_ID', 0),
      detail(
        'BOOST_TOKEN_CARD_TOKEN_CARD_SERIES_ID',
        2,
        'BOOST_TOKEN_CARD_TOKEN_CARD_SERIES_ID',
        '2',
      ),
    ]),
    0,
  );
  expect(boost).toMatchObject({
    calculation: 'add',
    amount: 20_000,
    tokenCardSeriesId: 2,
    disabled: { kind: 'use-count', count: 1 },
    target: { kind: 'all' },
  });
  expect(
    createLiveUseAllHandEffect(effect(42, [detail('USE_ALL_HAND_SKILL_ADD_AP', 0)])).addAp,
  ).toBe(0);
  expect(
    createLiveSwitchTokenCardDeckEffect(
      effect(43, [
        detail(
          'SWITCH_TOKEN_CARD_DECK_SERIES_ID',
          104151300100,
          'SWITCH_TOKEN_CARD_DECK_SERIES_ID',
          '2',
        ),
        detail('SWITCH_TOKEN_CARD_DECK_DISPLAY_TIME_TYPE', 3),
        detail('SWITCH_TOKEN_CARD_DECK_DISPLAY_TIME', 0),
      ]),
      0,
    ),
  ).toMatchObject({ tokenCardSeriesId: 2, duration: { kind: 'full-end' } });
});

test('ActionType54は既存handCardMax descriptorを共通domainのcoverageとして保持する', () => {
  expect(
    createLiveHandCardMaxEffect(
      effect(54, [
        detail('CHANGE_HAND_CARD_TO_MAX_SKILL_DISPLAY_TIME_TYPE', 3),
        detail('CHANGE_HAND_CARD_TO_MAX_SKILL_DISPLAY_TIME', 0),
      ]),
    ),
  ).toEqual({
    effectId: '54-effect',
    displayTimeType: 'full-end',
    displayTime: 0,
  });
});

function effect(actionType: number, details: readonly ReturnType<typeof detail>[]) {
  return { id: `${actionType}-effect`, actionType, orderId: 1, details };
}

function detail(
  detailType: string,
  effectValue: number,
  paramType?: string,
  paramValue?: string,
  id = `${detailType}-detail`,
) {
  return {
    id,
    detailType,
    targetMood: 0,
    effectValue,
    params: paramType === undefined || paramValue === undefined ? [] : [{ paramType, paramValue }],
  };
}
