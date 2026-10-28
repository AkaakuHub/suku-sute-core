export type LiveVoltageThreshold = Readonly<{
  voltageLevel: number;
  requiredVoltagePoint: bigint;
}>;

export function createLiveVoltageThresholds(
  thresholds: readonly LiveVoltageThreshold[],
  settingCount: number,
): readonly LiveVoltageThreshold[] {
  const rows = [...thresholds].sort((left, right) => left.voltageLevel - right.voltageLevel);
  validateLiveVoltageThresholds(rows);
  if (!Number.isSafeInteger(settingCount) || settingCount < rows.length)
    throw new Error('Live Voltage setting count is invalid');
  const originalCount = rows.length;
  const maximum = rows.at(-1);
  if (maximum === undefined) throw new Error('Live Voltage thresholds are absent');
  for (let level = originalCount + 1; level <= settingCount; level++)
    rows.push({
      voltageLevel: level,
      requiredVoltagePoint:
        maximum.requiredVoltagePoint + BigInt(level - originalCount) * 8_000_000n,
    });
  return Object.freeze(rows.map((row) => Object.freeze({ ...row })));
}

export function getLiveVoltageThreshold(
  thresholds: readonly LiveVoltageThreshold[],
  voltageLevel: number,
): bigint {
  const index = floorIndex(thresholds, (row) => row.voltageLevel <= voltageLevel);
  return thresholds[index]?.requiredVoltagePoint ?? 0n;
}

export function projectLiveVoltageLevel(
  thresholds: readonly LiveVoltageThreshold[],
  currentVoltage: bigint,
  maximumVoltageLevel: number,
): Readonly<{
  currentLevel: number;
  currentLevelVoltage: bigint;
  nextLevelVoltage: bigint;
  maximumBaseLevel: number;
}> {
  if (currentVoltage < 0n) throw new Error('Live current Voltage is invalid');
  const maximumIndex = floorIndex(thresholds, (row) => row.voltageLevel <= maximumVoltageLevel);
  const currentIndex = Math.min(
    maximumIndex,
    Math.max(
      0,
      floorIndex(thresholds, (row) => row.requiredVoltagePoint <= currentVoltage),
    ),
  );
  const current = thresholds[currentIndex];
  const maximum = thresholds[maximumIndex];
  if (current === undefined || maximum === undefined)
    throw new Error('Live current Voltage level is absent');
  const next = thresholds[Math.min(currentIndex + 1, maximumIndex)];
  if (next === undefined) throw new Error('Live next Voltage level is absent');
  return {
    currentLevel: Math.max(1, current.voltageLevel),
    currentLevelVoltage: current.requiredVoltagePoint,
    nextLevelVoltage: next.requiredVoltagePoint,
    maximumBaseLevel: maximum.voltageLevel,
  };
}

function floorIndex(
  thresholds: readonly LiveVoltageThreshold[],
  accepts: (row: LiveVoltageThreshold) => boolean,
): number {
  let low = 0;
  let high = thresholds.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    const row = thresholds[middle];
    if (row === undefined) throw new Error('Live Voltage threshold is absent');
    if (accepts(row)) low = middle + 1;
    else high = middle;
  }
  return low - 1;
}

export function validateLiveVoltageThresholds(thresholds: readonly LiveVoltageThreshold[]): void {
  if (thresholds.length === 0) throw new Error('Live Voltage thresholds are absent');
  for (let index = 0; index < thresholds.length; index++) {
    const row = thresholds[index];
    const previous = thresholds[index - 1];
    if (
      row === undefined ||
      row.voltageLevel !== index + 1 ||
      row.requiredVoltagePoint < 0n ||
      (previous !== undefined && row.requiredVoltagePoint <= previous.requiredVoltagePoint)
    )
      throw new Error('Live Voltage thresholds are invalid');
  }
}
