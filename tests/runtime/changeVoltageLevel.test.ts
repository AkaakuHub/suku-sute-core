import { expect, test } from 'vite-plus/test';
import { resolveLiveVoltagePointSet } from '../../src/runtime/skills/changeVoltageLevel.ts';

test('ChangeVoltageLevelはVoltage pointを指定値へ置き換える', () => {
  expect(resolveLiveVoltagePointSet(effect(601), 200n)).toEqual({
    currentVoltage: 601n,
    changeAmount: 401,
  });
});

test('ChangeVoltageLevelはruntimeと同じくGenesis向け差分を丸め前の指定値から算出する', () => {
  expect(resolveLiveVoltagePointSet(effect(-10), 200n)).toEqual({
    currentVoltage: 0n,
    changeAmount: -210,
  });
});

test('ChangeVoltageLevelはdetail差異を拒否する', () => {
  expect(() =>
    resolveLiveVoltagePointSet(
      {
        ...effect(601),
        details: [detail('CHANGE_VOLTAGE_LEVEL', 3)],
      },
      0n,
    ),
  ).toThrow('Live Change Voltage Level skill effect details differ');
});

function effect(effectValue: number) {
  return {
    id: '37001',
    actionType: 37,
    orderId: 1,
    details: [detail('CHANGE_VOLTAGE_NUM', effectValue)],
  };
}

function detail(detailType: string, effectValue: number) {
  return {
    id: '1',
    detailType,
    targetMood: 0,
    effectValue,
    params: [],
  };
}
