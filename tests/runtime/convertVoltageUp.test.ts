import { describe, expect, test } from 'vite-plus/test';
import {
  activateLiveConvertVoltageUp,
  advanceLiveConvertVoltageUpState,
  convertLiveVoltageUp,
  createLiveConvertVoltageUpState,
} from '../../src/runtime/skills/convertVoltageUp.ts';
import type { LiveSkillEffect } from '../../src/runtime/skills/skillTypes.ts';

describe('Live Convert Voltage Up', () => {
  test('最後に登録した変換だけで正のVoltage増加を置換する', () => {
    const first = activateLiveConvertVoltageUp(
      createLiveConvertVoltageUpState(),
      effect('22001', 1, 4_800, 1, 2),
      input,
    );
    const state = activateLiveConvertVoltageUp(first, effect('22002', 3, 10_000, 0, 0), input);

    expect(convertLiveVoltageUp(state, 20, 0).conversion).toEqual({
      effectId: '22002',
      destination: 'mental-recovery',
      amount: 40,
      resultDuration: { kind: 'sections', remainingChanges: 1n },
      resultDisabledType: 0,
      card: input.card,
    });
    expect(convertLiveVoltageUp(state, 0, 0)).toEqual({
      state,
      conversion: null,
    });
  });

  test('指定回数の変換後に登録を解除する', () => {
    const state = activateLiveConvertVoltageUp(
      createLiveConvertVoltageUpState(),
      effect('22001', 4, 10_000, 1, 2),
      input,
    );
    const once = convertLiveVoltageUp(state, 3, 0);
    const twice = convertLiveVoltageUp(once.state, 3, 0);

    expect(once.state[0]?.conversions).toBe(1);
    expect(twice.state).toEqual([]);
  });

  test('ミリ秒・セクション・ライブ終了の寿命で登録を解除する', () => {
    const milliseconds = activateLiveConvertVoltageUp(
      [],
      effect('22001', 1, 10_000, 0, 0, 1, 1_000),
      input,
    );
    expect(
      advanceLiveConvertVoltageUpState(milliseconds, {
        deltaTimeSeconds: 1,
        sectionChangeCount: 0,
        musicEnded: false,
      }),
    ).toEqual([]);

    const section = activateLiveConvertVoltageUp([], effect('22002', 1, 10_000, 0, 0, 2, 1), input);
    expect(
      advanceLiveConvertVoltageUpState(section, {
        deltaTimeSeconds: 0,
        sectionChangeCount: 1,
        musicEnded: false,
      }),
    ).toEqual([]);

    const fullEnd = activateLiveConvertVoltageUp([], effect('22003', 1, 10_000, 0, 0, 3, 0), input);
    expect(
      advanceLiveConvertVoltageUpState(fullEnd, {
        deltaTimeSeconds: 0,
        sectionChangeCount: 0,
        musicEnded: true,
      }),
    ).toEqual([]);
  });
});

const input = {
  currentTimeSeconds: 0,
  power: { addValue: 0, multiplyFactor: 1, effectPower: 1 },
  card: {
    cardDatasId: 1001,
    charactersId: 1,
    unitIds: [101],
    tokenCardSeriesIds: [],
    skillTokenCardSeriesIds: [],
  },
  parentControlsLifetime: false,
  applySkillBoost: (value: number) => value * 2,
};

function effect(
  id: string,
  destination: number,
  num: number,
  disabledType: number,
  disabled: number,
  displayTimeType = 3,
  displayTime = 0,
): LiveSkillEffect {
  return {
    id,
    actionType: 22,
    orderId: 1,
    details: [
      detail('1', 'CONVERT_VOLTAGE_UP_CONVERT_TYPE', destination),
      detail('2', 'CONVERT_VOLTAGE_UP_NUM', num),
      detail('3', 'CONVERT_VOLTAGE_UP_CONVERT_DISPLAY_TIME_TYPE', 2),
      detail('4', 'CONVERT_VOLTAGE_UP_CONVERT_DISPLAY_TIME', 1),
      detail('5', 'CONVERT_VOLTAGE_UP_CONVERT_DISABLED_TYPE', 0),
      detail('6', 'CONVERT_VOLTAGE_UP_DISPLAY_TIME_TYPE', displayTimeType),
      detail('7', 'CONVERT_VOLTAGE_UP_DISPLAY_TIME', displayTime),
      detail('8', 'CONVERT_VOLTAGE_UP_DISABLED_TYPE', disabledType),
      detail('9', 'CONVERT_VOLTAGE_UP_DISABLED', disabled),
    ],
  };
}

function detail(id: string, detailType: string, effectValue: number) {
  return { id, detailType, targetMood: 0, effectValue, params: [] };
}
