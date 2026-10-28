import {
  type LiveConditionContext,
  liveConditionMoodValue,
  liveConditionRatioThreshold,
  liveConditionSectionNumber,
  liveConditionVoltageLevel,
} from '../live/conditionContext.ts';
import { liveMentalRatio } from '../live/mentalGauge.ts';
import { int64ToFloat32 } from '../numeric.ts';
import type { LiveGenesisState } from './genesisSkill.ts';

export type LiveDrawSuccessCondition = Readonly<{
  branchType: bigint;
  branchValue: bigint;
}>;

export function isLiveDrawSuccessConditionSatisfied(
  condition: LiveDrawSuccessCondition,
  input: LiveConditionContext,
  genesis: LiveGenesisState,
): boolean {
  const branchType = Number(BigInt.asIntN(32, condition.branchType));
  if (branchType === 1 || branchType === 3) return true;
  if (genesis.effects.length > 0 && (branchType === 2 || branchType === 5)) return true;
  switch (branchType) {
    case 2:
      return (
        liveMentalRatio(input.mental, input.maximumMental) <=
        liveConditionRatioThreshold(int64ToFloat32(condition.branchValue))
      );
    case 4:
      return Math.fround(liveConditionMoodValue(input)) <= numToValue(condition.branchValue);
    case 5:
      return Math.fround(liveConditionVoltageLevel(input)) <= numToValue(condition.branchValue);
    case 6:
      return BigInt(input.currentSection + 1) <= condition.branchValue;
    case 7:
      return BigInt(liveConditionSectionNumber(input)) === condition.branchValue;
    default:
      return false;
  }
}

function numToValue(value: bigint): number {
  return Math.fround(int64ToFloat32(value) / 10_000);
}
