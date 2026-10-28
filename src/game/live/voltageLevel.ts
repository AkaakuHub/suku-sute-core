import rawThresholds from '../../master/voltageThresholds.json';
import settingCount from '../../master/stageVoltageLevelSettingCount.json';
import {
  createLiveVoltageThresholds,
  getLiveVoltageThreshold,
  projectLiveVoltageLevel,
} from '../../runtime/live/voltageThresholds.ts';

const thresholds = createLiveVoltageThresholds(
  rawThresholds.map((requiredVoltagePoint, index) => ({
    voltageLevel: index + 1,
    requiredVoltagePoint: BigInt(requiredVoltagePoint),
  })),
  settingCount,
);

export function voltageThreshold(level: number): number {
  return Number(getLiveVoltageThreshold(thresholds, level));
}

export function voltageLevel(points: number, maximumLevel: number): number {
  return projectLiveVoltageLevel(thresholds, BigInt(points), maximumLevel).currentLevel;
}

export function voltageProgress(points: number, maximumLevel: number): number {
  const level = voltageLevel(points, maximumLevel);
  if (level >= maximumLevel) return 100;
  const lower = voltageThreshold(level);
  const upper = voltageThreshold(level + 1);
  return ((points - lower) / (upper - lower)) * 100;
}
