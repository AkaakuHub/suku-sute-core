import { additionalScoreLimit, type ScoreLimitParameters } from '../../game/live/scoreLimit.ts';
import { appealParameter } from '../../game/parameters/cardParameters.ts';

export type LiveCardAppealParameters = Readonly<{
  smile: number;
  pure: number;
  cool: number;
}>;

export type LiveStageScoreMultiplier = Readonly<{
  minimumHeartCount: number;
  maximumHeartCount: number;
  baseMultiplier: bigint;
  additionalMultiplier: bigint;
}>;

const addScoreMaxBase = 2_147_483_647;
const longMax = 9_223_372_036_854_775_807n;

export function calculateLiveCardAppealValue(
  parameters: LiveCardAppealParameters,
  musicType: 0 | 1 | 2 | 3,
  timelineDurationSeconds: number,
): number {
  if (
    !Number.isFinite(timelineDurationSeconds) ||
    timelineDurationSeconds <= 0 ||
    Object.values(parameters).some((value) => !Number.isFinite(value) || value < 0)
  ) {
    throw new Error('Live card appeal input is invalid');
  }
  return Math.fround(
    Math.fround(
      appealParameter(
        parameters.smile,
        0,
        musicType === 0 || musicType === 1 ? 1.5 : 1,
        timelineDurationSeconds,
      ).value +
        appealParameter(
          parameters.pure,
          0,
          musicType === 0 || musicType === 2 ? 1.5 : 1,
          timelineDurationSeconds,
        ).value,
    ) +
      appealParameter(
        parameters.cool,
        0,
        musicType === 0 || musicType === 3 ? 1.5 : 1,
        timelineDurationSeconds,
      ).value,
  );
}

export function calculateLiveMasteryLoveBonusEffect(loveCorrectionValue: number): number {
  if (!Number.isSafeInteger(loveCorrectionValue) || loveCorrectionValue < 0) {
    throw new Error('Live STAR correction value is invalid');
  }
  return loveCorrectionValue > 0 ? loveCorrectionValue / 10_000 + 1 : 1;
}

export function liveValueToFactor(value: number): number {
  if (!Number.isFinite(value)) {
    throw new Error('Live skill effect value is invalid');
  }
  return value / 100;
}

export function calculateLiveAddScoreMax(
  collectCount: number,
  multipliers: readonly LiveStageScoreMultiplier[],
  parameters: ScoreLimitParameters,
): bigint {
  if (!Number.isSafeInteger(collectCount) || collectCount < 0) {
    throw new Error('Live add score max collect count is invalid');
  }
  const matches = multipliers.filter(
    (row) => collectCount >= row.minimumHeartCount && collectCount <= row.maximumHeartCount,
  );
  const row = matches[0];
  if (matches.length > 1) {
    throw new Error('Live add score max multiplier overlaps');
  }
  const multiplier =
    row === undefined
      ? 1
      : Number(
          row.baseMultiplier +
            row.additionalMultiplier * BigInt(collectCount - row.minimumHeartCount),
        ) / 10_000;
  const result = Math.ceil((multiplier + additionalScoreLimit(parameters)) * addScoreMaxBase);
  return result >= Number(longMax) ? longMax : BigInt(result);
}
