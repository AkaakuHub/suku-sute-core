import { expect, test } from 'vite-plus/test';
import {
  createLiveVoltageThresholds,
  getLiveVoltageThreshold,
  projectLiveVoltageLevel,
} from '../../src/runtime/live/voltageThresholds.ts';

const base = [
  { voltageLevel: 1, requiredVoltagePoint: 1n },
  { voltageLevel: 2, requiredVoltagePoint: 31n },
];

test('Voltage閾値は設定件数まで8000000ずつ延長し、元の配列を保持する', () => {
  const rows = createLiveVoltageThresholds([...base].reverse(), 4);
  expect(rows).toEqual([
    ...base,
    { voltageLevel: 3, requiredVoltagePoint: 8_000_031n },
    { voltageLevel: 4, requiredVoltagePoint: 16_000_031n },
  ]);
  expect(base).toHaveLength(2);
});

test('Voltage閾値は要求レベル以下から選び、設定上限を超えて延長しない', () => {
  const rows = createLiveVoltageThresholds(base, 4);
  expect(getLiveVoltageThreshold(rows, 0)).toBe(0n);
  expect(getLiveVoltageThreshold(rows, 1)).toBe(1n);
  expect(getLiveVoltageThreshold(rows, 5)).toBe(16_000_031n);
});

test('Voltageの初期レベルは1であり、設定件数と現在の上限は独立する', () => {
  const rows = createLiveVoltageThresholds(base, 4);
  expect(projectLiveVoltageLevel(rows, 0n, 2).currentLevel).toBe(1);
  expect(projectLiveVoltageLevel(rows, 16_000_031n, 2)).toEqual({
    currentLevel: 2,
    currentLevelVoltage: 31n,
    nextLevelVoltage: 31n,
    maximumBaseLevel: 2,
  });
  expect(projectLiveVoltageLevel(rows, 16_000_031n, 4).currentLevel).toBe(4);
});

test('Voltage閾値の延長と比較はNumberの精度限界を超えても整数を保持する', () => {
  const rows = createLiveVoltageThresholds(
    [{ voltageLevel: 1, requiredVoltagePoint: 9_007_199_254_740_993n }],
    2,
  );
  expect(getLiveVoltageThreshold(rows, 2)).toBe(9_007_199_262_740_993n);
  expect(projectLiveVoltageLevel(rows, 9_007_199_262_740_992n, 2).currentLevel).toBe(1);
});

test('Voltage閾値の設定時に空・重複・減少する値を拒否する', () => {
  expect(() => createLiveVoltageThresholds([], 2)).toThrow();
  expect(() => createLiveVoltageThresholds([base[0]!, base[0]!], 2)).toThrow();
  expect(() => createLiveVoltageThresholds(base, 1)).toThrow();
});
