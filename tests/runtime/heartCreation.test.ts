import { expect, test } from 'vite-plus/test';
import {
  calculateLiveHeartCreateCount,
  createLiveHearts,
} from '../../src/runtime/live/heartCreation.ts';
import {
  createLiveHeartRuntimeState,
  spawnLiveHearts,
} from '../../src/runtime/live/heartRuntime.ts';
import { createLiveProxyAbsorbInfo } from '../../src/runtime/skills/proxyAbsorption.ts';

function proxy(targetAmount: bigint, induceTiming: 1 | 2) {
  return {
    ...createLiveProxyAbsorbInfo(1, 0n, [{ actionType: 1n, targetAmount }]),
    periodType: 1 as const,
    remainingPeriod: 1,
    induceTiming,
    induceCondition: 1 as const,
  };
}

test('上限で生成できない場合も要求個数を吸収し生成処理と乱数を呼ばない', () => {
  const hearts = { ...createLiveHeartRuntimeState(120), heartLimit: 0 };
  let randomCalls = 0;
  let spawnCalls = 0;
  const created = createLiveHearts(
    { hearts, proxySkills: [proxy(10n, 2)] },
    5,
    2,
    () => {
      randomCalls++;
      return 0;
    },
    (...args) => {
      spawnCalls++;
      return spawnLiveHearts(...args);
    },
  );
  expect(created.proxySkills[0]?.effects[0]?.totalAmount).toBe(5n);
  expect(created.proxyAbsorption.absorbed).toBe(true);
  expect(created.hearts).toBe(hearts);
  expect(created.createdCount).toBe(0);
  expect(created.overflowCount).toBe(0);
  expect(randomCalls).toBe(0);
  expect(spawnCalls).toBe(0);
});

test('要求0個でも0判定より先に吸収と即時発動を判定する', () => {
  const hearts = createLiveHeartRuntimeState(120);
  const created = createLiveHearts(
    { hearts, proxySkills: [proxy(0n, 1)] },
    0,
    2,
    () => 0,
    spawnLiveHearts,
  );
  expect(created.proxyAbsorption.absorbed).toBe(true);
  expect(created.proxyAbsorption.result).toBe('induce');
  expect(created.hearts).toBe(hearts);
});

test('非吸収の場合だけ実際のHeart生成へ進み上限超過を返す', () => {
  const hearts = { ...createLiveHeartRuntimeState(120), heartLimit: 2 };
  const created = createLiveHearts(
    { hearts, proxySkills: [] },
    3,
    2,
    (minimum, maximum) => (minimum + maximum) / 2,
    spawnLiveHearts,
  );
  expect(created.proxyAbsorption.absorbed).toBe(false);
  expect(created.createdCount).toBe(2);
  expect(created.overflowCount).toBe(1);
  expect(created.hearts.stageHearts).toHaveLength(1);
  expect(created.hearts.hiddenHeartBatches[0]?.count).toBe(1);
});

test('生成個数はDoubleでEffectPowerを適用してから切り上げる', () => {
  expect(calculateLiveHeartCreateCount(10000001, Math.fround(1.0000001))).toBe(10000003);
  expect(calculateLiveHeartCreateCount(Number.POSITIVE_INFINITY, 1)).toBe(1);
});
