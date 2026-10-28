import type { LiveMentalGaugeState } from './mentalGauge.ts';
import type { LiveVoltageGaugeState } from './voltageGauge.ts';
import { projectLiveVoltageLevel, type LiveVoltageThreshold } from './voltageThresholds.ts';

export type LiveConditionContext = Readonly<{
  voltage: LiveVoltageGaugeState;
  voltageThresholds: readonly LiveVoltageThreshold[];
  maximumVoltageLevel: number;
  mental: LiveMentalGaugeState;
  maximumMental: number;
  moodValue: number | null;
  currentSection: number;
  feverSection: number | null;
  cardTotal: number;
  deckCount: number;
  graveyardCount: number;
  tokenCardSeriesCount: (seriesIds: readonly number[]) => number;
  memberFanLevelTotal: (characterIds: readonly number[]) => number;
  beatHeartValue: number;
  exclusionCount: number;
}>;

export function liveConditionVoltageLevel(input: LiveConditionContext): number {
  return projectLiveVoltageLevel(
    input.voltageThresholds,
    input.voltage.currentVoltage,
    input.maximumVoltageLevel,
  ).currentLevel;
}

export function liveConditionSectionNumber(
  input: Pick<LiveConditionContext, 'currentSection' | 'feverSection'>,
): number {
  if (input.feverSection === null) return input.currentSection + 1;
  if (input.currentSection === input.feverSection) return 99;
  return input.currentSection - (input.currentSection > input.feverSection ? 1 : 0) + 1;
}

export function liveConditionMoodValue(input: Pick<LiveConditionContext, 'moodValue'>): number {
  if (input.moodValue === null) throw new Error('Live condition mood is unresolved');
  return input.moodValue;
}

export function liveConditionRatioThreshold(num: number): number {
  return Math.fround(Math.fround(Math.fround(num) / 10_000) / 100);
}

export function liveConditionMoodType(input: Pick<LiveConditionContext, 'moodValue'>): 1 | 2 | 3 {
  const value = liveConditionMoodValue(input);
  return value > 0 ? 1 : value < 0 ? 3 : 2;
}
