import { expect, test } from 'vite-plus/test';
import {
  activateLiveGenesisEffect,
  addLiveGenesisGauge,
  advanceLiveGenesisState,
  calculateLiveGenesisGaugeDelta,
  calculateLiveInitialGenesisGauge,
  createLiveGenesisEffect,
  createLiveGenesisEffectFromParameters,
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

test.each([20_000, 4_294_987_296])(
  'Genesis skillの効果値%sをint32化してmaster detailから作る',
  (baseValue) => {
    expect(
      createLiveGenesisEffect(
        {
          id: '51000000001',
          actionType: 51,
          orderId: 1,
          details: [
            detail('510000000011', 'GENESIS_EFFECT_BASE_NUM', baseValue),
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
  },
);

test.each([0n, 2_147_483_648n, 4_294_967_296n])(
  '期限%sをint32化して無効なら強化処理の前に終了する',
  (displayTime) => {
    expect(
      createLiveGenesisEffectFromParameters(
        {
          effectId: '1',
          effectBaseNum: 20_000n,
          displayTimeType: 2n,
          displayTime,
          currentTimeSeconds: 0,
        },
        () => {
          throw new Error('無効な期限では強化を消費しません。');
        },
      ),
    ).toBeNull();
  },
);

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

test('最大効果を適用し曲末で開始前gaugeを返す', () => {
  const rollback = {
    currentAp: 7,
    currentMental: 81,
    currentVoltage: 120n,
    currentVoltageLevel: 3,
  };
  const weaker = genesisEffect('1', 2);
  const stronger = genesisEffect('2', 3);
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
  expect(firstSection.state.effects.map(({ effectId }) => effectId)).toEqual(['2', '1']);
  expect(firstSection.finishedRollback).toBeNull();
  const secondSection = advanceLiveGenesisState(firstSection.state, {
    currentTimeSeconds: 2,
    sectionChangeCount: 1,
    musicEnded: true,
  });
  expect(secondSection.state).toEqual(createLiveGenesisState());
  expect(secondSection.finishedRollback).toEqual(rollback);
});

test('同じGenesis effectの再発動を独立した効果として曲末まで保持する', () => {
  const rollback = {
    currentAp: 7,
    currentMental: 81,
    currentVoltage: 120n,
    currentVoltageLevel: 3,
  };
  const first = activateLiveGenesisEffect(
    createLiveGenesisState(),
    genesisEffect('same-effect', 2),
    rollback,
  );
  const repeated = activateLiveGenesisEffect(first, genesisEffect('same-effect', 2), rollback);

  const advanced = advanceLiveGenesisState(repeated, {
    currentTimeSeconds: 1,
    sectionChangeCount: 1,
    musicEnded: false,
  });

  expect(advanced.state.effects).toEqual([
    genesisEffect('same-effect', 2),
    genesisEffect('same-effect', 2),
  ]);
  expect(advanced.finishedRollback).toBeNull();
});

test('Genesis gaugeはAPKのint32加算と同じく上限超過で負数へ折り返す', () => {
  const active = activateLiveGenesisEffect(createLiveGenesisState(), genesisEffect('1', 1), {
    currentAp: 0,
    currentMental: 100,
    currentVoltage: 0n,
    currentVoltageLevel: 0,
  });
  const overflow = addLiveGenesisGauge(
    { ...active, currentGauge: 2_147_483_647 },
    { actionType: 10, gaugeType: 1, effectValue: 1 },
  );
  expect(overflow.currentGauge).toBe(-2_147_483_648);
  expect(
    addLiveGenesisGauge(overflow, { actionType: 10, gaugeType: 1, effectValue: 1 }).currentGauge,
  ).toBe(-2_147_483_647);
  expect(
    addLiveGenesisGauge(
      { ...active, currentGauge: 0 },
      { actionType: 10, gaugeType: 1, effectValue: -1 },
    ).currentGauge,
  ).toBe(-1);
});

test.each([
  [3_000_000_000, 2_147_483_647],
  [Number.MAX_VALUE, -2_147_483_648],
])('Genesis効果値%sの切り上げと範囲外変換をAPKへ合わせる', (strength, expected) => {
  expect(
    calculateLiveGenesisGaugeDelta({
      actionType: 10,
      gaugeType: 1,
      effectValue: 1,
      currentGenesisEffectValue: strength,
    }),
  ).toBe(expected);
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

test.each([
  { kind: 'milliseconds', expiresAtSeconds: 1 },
  { kind: 'sections', remainingChanges: 1 },
] as const)('期限付きGenesis%sはAPKの開始条件に従って発動しない', (duration) => {
  const state = createLiveGenesisState();
  expect(
    activateLiveGenesisEffect(
      state,
      { effectId: '1', effectValue: 2, duration },
      { currentAp: 7, currentMental: 81, currentVoltage: 120n, currentVoltageLevel: 3 },
    ),
  ).toBe(state);
});

function genesisEffect(effectId: string, effectValue: number) {
  return {
    effectId,
    effectValue,
    duration: { kind: 'full-end' as const },
  };
}
