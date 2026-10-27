import { expect, test } from 'vite-plus/test';
import {
  activateLiveGenesisEffect,
  addLiveGenesisGauge,
  advanceLiveGenesisState,
  calculateLiveGenesisGaugeDelta,
  calculateLiveInitialGenesisGauge,
  createLiveGenesisEffect,
  createLiveGenesisState,
} from '../../src/runtime/skills/genesisSkill.ts';

test('開始時のAP・Mental・Voltage levelから公式Genesis gaugeを作る', () => {
  expect(
    calculateLiveInitialGenesisGauge({
      currentAp: 7,
      currentMental: 81,
      currentVoltageLevel: 3,
    }),
  ).toBe(71);
});

test('Genesis skillの効果値とsection期限をmaster detailから作る', () => {
  expect(
    createLiveGenesisEffect(
      {
        id: '51000000001',
        actionType: 51,
        orderId: 1,
        details: [
          detail('510000000011', 'GENESIS_EFFECT_BASE_NUM', 20_000),
          detail('510000000012', 'GENESIS_DISPLAY_TIME_TYPE', 2),
          detail('510000000013', 'GENESIS_DISPLAY_TIME', 3),
        ],
      },
      12,
      (value) => value * 1.5,
    ),
  ).toEqual({
    effectId: '51000000001',
    effectValue: 3,
    duration: { kind: 'sections', remainingChanges: 3 },
  });
});

test('Genesis中の各gauge変化を公式平方根式でGenesis gaugeへ変換する', () => {
  expect(
    calculateLiveGenesisGaugeDelta({
      actionType: 10,
      gaugeType: 1,
      effectValue: 25,
      currentGenesisEffectValue: 2,
    }),
  ).toBe(10);
  expect(
    calculateLiveGenesisGaugeDelta({
      actionType: 5,
      gaugeType: 2,
      effectValue: -16,
      currentGenesisEffectValue: 2,
    }),
  ).toBe(-16);
  expect(
    calculateLiveGenesisGaugeDelta({
      actionType: 14,
      gaugeType: 3,
      effectValue: 2,
      currentGenesisEffectValue: 2,
    }),
  ).toBe(20);
});

test('Float32の平方根と乗除算を丸めてから切り上げ、減少量の符号を最後に戻す', () => {
  expect(
    calculateLiveGenesisGaugeDelta({
      actionType: 10,
      gaugeType: 1,
      effectValue: 2,
      currentGenesisEffectValue: 2,
    }),
  ).toBe(3);
  expect(
    calculateLiveGenesisGaugeDelta({
      actionType: 5,
      gaugeType: 2,
      effectValue: -7,
      currentGenesisEffectValue: 2,
    }),
  ).toBe(-11);
  expect(
    calculateLiveGenesisGaugeDelta({
      actionType: 14,
      gaugeType: 3,
      effectValue: 1,
      currentGenesisEffectValue: 1,
    }),
  ).toBe(8);
  expect(
    calculateLiveGenesisGaugeDelta({
      actionType: 39,
      gaugeType: 3,
      effectValue: 2.9,
      currentGenesisEffectValue: 1,
    }),
  ).toBe(2);
});

test('最大効果を適用し期限終了時に開始前gaugeを返す', () => {
  const rollback = {
    skillPoint: 7,
    mental: 81,
    voltagePoint: 120n,
    voltageLevel: 3,
  };
  const weaker = genesisEffect('1', 2, 2);
  const stronger = genesisEffect('2', 3, 1);
  const active = activateLiveGenesisEffect(
    activateLiveGenesisEffect(createLiveGenesisState(), weaker, rollback),
    stronger,
    rollback,
  );
  expect(active.effects.map(({ effectId }) => effectId)).toEqual(['2', '1']);
  expect(
    addLiveGenesisGauge(active, {
      actionType: 10,
      gaugeType: 1,
      effectValue: 25,
    }).currentGauge,
  ).toBe(86);
  const firstSection = advanceLiveGenesisState(active, {
    currentTimeSeconds: 1,
    sectionChangeCount: 1,
    musicEnded: false,
  });
  expect(firstSection.state.effects.map(({ effectId }) => effectId)).toEqual(['1']);
  expect(firstSection.finishedRollback).toBeNull();
  const secondSection = advanceLiveGenesisState(firstSection.state, {
    currentTimeSeconds: 2,
    sectionChangeCount: 1,
    musicEnded: false,
  });
  expect(secondSection.state).toEqual(createLiveGenesisState());
  expect(secondSection.finishedRollback).toEqual(rollback);
});

test('同じGenesis effectの再発動を独立した期限として保持する', () => {
  const rollback = {
    skillPoint: 7,
    mental: 81,
    voltagePoint: 120n,
    voltageLevel: 3,
  };
  const first = activateLiveGenesisEffect(
    createLiveGenesisState(),
    genesisEffect('same-effect', 2, 1),
    rollback,
  );
  const repeated = activateLiveGenesisEffect(first, genesisEffect('same-effect', 2, 2), rollback);

  const advanced = advanceLiveGenesisState(repeated, {
    currentTimeSeconds: 1,
    sectionChangeCount: 1,
    musicEnded: false,
  });

  expect(advanced.state.effects).toEqual([genesisEffect('same-effect', 2, 1)]);
  expect(advanced.finishedRollback).toBeNull();
});

function detail(id: string, detailType: string, effectValue: number) {
  return {
    id,
    detailType,
    targetMood: 0,
    effectValue,
    params: [],
  };
}

function genesisEffect(effectId: string, effectValue: number, remainingChanges: number) {
  return {
    effectId,
    effectValue,
    duration: { kind: 'sections' as const, remainingChanges },
  };
}
