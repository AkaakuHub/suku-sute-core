export function calculateLiveApIncreaseIntervalSeconds(
  apIncrementMilliseconds: number,
  shortMemberCount: number,
): number {
  validateNonnegativeNumber(apIncrementMilliseconds, 'Musics.ApIncrement');
  if (!Number.isSafeInteger(shortMemberCount) || shortMemberCount < 0) {
    throw new Error('Live short member count is invalid');
  }
  const cardRatio = Math.min(
    Math.fround(Math.fround(shortMemberCount) * Math.fround(0.1)),
    Math.fround(0.95),
  );
  const multiplier =
    shortMemberCount === 0
      ? 1
      : Math.fround(Math.fround(1) / Math.fround(Math.fround(1) - cardRatio));
  return roundLiveGaugeIntervalSeconds(
    Math.fround(Math.fround(apIncrementMilliseconds) * multiplier),
  );
}

export function calculateLiveShortMemberCount(
  deckCardMax: number,
  filledCardCount: number,
): number {
  if (!Number.isSafeInteger(deckCardMax) || deckCardMax < 0) {
    throw new Error('Live deck card max is invalid');
  }
  if (
    !Number.isSafeInteger(filledCardCount) ||
    filledCardCount < 0 ||
    filledCardCount > deckCardMax
  ) {
    throw new Error('Live filled card count is invalid');
  }
  return deckCardMax - filledCardCount;
}

export function calculateLiveBaseGaugeIntervalSeconds(
  baseGaugeValue: number,
  musicSongTime: number,
): number {
  if (!Number.isSafeInteger(baseGaugeValue) || baseGaugeValue < 0) {
    throw new Error('Live base gauge value is invalid');
  }
  if (!Number.isSafeInteger(musicSongTime) || musicSongTime < 0) {
    throw new Error('Musics.SongTime is invalid');
  }
  const intervalMilliseconds = Math.fround(
    Math.fround(baseGaugeValue * musicSongTime) / Math.fround(10_000),
  );
  return roundLiveGaugeIntervalSeconds(intervalMilliseconds);
}

export function calculateLiveMentalDownRecovery(
  maximumMental: number,
  musicEndTimeSeconds: number,
): Readonly<{
  recoveryTimeSeconds: number;
  recoveryMental: number;
}> {
  if (!Number.isSafeInteger(maximumMental) || maximumMental < 0) {
    throw new Error('Live maximum Mental is invalid');
  }
  validateNonnegativeNumber(musicEndTimeSeconds, 'MusicScore MusicEndTime');
  const recoveryMilliseconds = Math.trunc(
    Math.fround(
      Math.fround(
        Math.fround(Math.fround(musicEndTimeSeconds) * Math.fround(1_000)) / Math.fround(120_000),
      ) * Math.fround(6_000),
    ),
  );
  return {
    recoveryTimeSeconds: liveMillisecondsToSeconds(Math.fround(recoveryMilliseconds)),
    recoveryMental: Math.trunc(Math.fround(Math.fround(maximumMental) * Math.fround(0.6))),
  };
}

export function liveCeilAtFirstDecimalPlace(value: number): number {
  validateNonnegativeNumber(value, 'gauge interval');
  const truncated = Math.trunc(Math.fround(value));
  const fraction = Math.fround(Math.fround(value) - Math.fround(truncated));
  return fraction < Math.fround(0.1)
    ? Math.fround(truncated)
    : Math.fround(Math.ceil(Math.fround(value)));
}

export function roundLiveGaugeIntervalSeconds(milliseconds: number): number {
  return liveMillisecondsToSeconds(liveCeilAtFirstDecimalPlace(milliseconds));
}

function liveMillisecondsToSeconds(milliseconds: number): number {
  return Math.fround(Math.fround(milliseconds) / Math.fround(1_000));
}

function validateNonnegativeNumber(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} is invalid`);
  }
}
