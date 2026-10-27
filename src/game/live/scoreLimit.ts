export type ScoreLimitSettings = Readonly<{
  additionalEnabled: boolean;
  voltageMultipliers: readonly Readonly<{
    minimumLevel: number;
    maximumLevel: number;
    multiplier: bigint;
  }>[];
}>;
export type ScoreLimitParameters = Readonly<{
  additionalEnabled: boolean;
  bonusScoreValue: number;
  voltageMultiplier: bigint;
  bloomActive: boolean;
  bloomGauge: number;
}>;

export function additionalScoreLimit(parameters: ScoreLimitParameters): number {
  const bonus = parameters.additionalEnabled ? scoreBuffLimit(parameters.bonusScoreValue) : 0;
  const ordinary = parameters.additionalEnabled ? Number(parameters.voltageMultiplier) / 10000 : 0;
  const bloom =
    parameters.bloomGauge < 1
      ? 0
      : Math.ceil(Math.fround(Math.sqrt(Math.fround(Math.fround(parameters.bloomGauge) * 2))));
  return bonus + (parameters.bloomActive ? bloom : ordinary);
}

function scoreBuffLimit(value: number): number {
  const curve =
    value >= 100000000001
      ? Math.min(Math.sqrt((value - 100000000000) / 90000000) * 8 + 800, 1600)
      : value >= 10000000001
        ? Math.min(Math.sqrt((value - 10000000000) / 9000000) * 4 + 400, 800)
        : value >= 1000000001
          ? Math.min(Math.sqrt((value - 1000000000) / 900000) + 300, 400)
          : value >= 100000001
            ? Math.min(Math.sqrt((value - 100000000) / 90000) + 200, 300)
            : value >= 10000001
              ? Math.min(Math.sqrt((value - 10000000) / 9000) + 100, 200)
              : Math.min(Math.sqrt(value / 1000), 100);
  return Math.ceil(curve * 10) / 10;
}
