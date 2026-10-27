export type VoltageConversionDuration = Readonly<{
  kind: 'milliseconds' | 'sections' | 'stage';
  value: number;
}>;

export type StopVoltageIncreaseEffect = Readonly<{
  kind: 'stop-voltage-increase';
  duration:
    | Readonly<{ kind: 'milliseconds'; value: number }>
    | Readonly<{ kind: 'sections'; value: bigint }>;
  invocationType?: number;
  deactivationKey?: string;
}>;

export type VoltageConversion = Readonly<{
  id: number;
  destination: 'hearts' | 'love' | 'stamina' | 'mental-barrier';
  num: number;
  outputDuration: VoltageConversionDuration;
  disabledOnConvertCount: bigint | null;
  conversions: number;
  expireOnHeartCollect: boolean;
  remainingSeconds: number | null;
  remainingSections: number | null;
  deactivationKey: string | null;
}>;

export type TemporaryScoreBoost = Readonly<{
  percent: number;
  remainingSeconds: number | null;
  remainingSections: number | null;
  expireOnHeartCollect: boolean;
}>;

export type VoltageConvertEffect = Readonly<{
  kind: 'voltage-convert';
  destination: VoltageConversion['destination'];
  num: number;
  outputDuration: VoltageConversionDuration;
  convertDisabledType: 0 | 1 | 2;
  displayDuration: VoltageConversionDuration;
  disabledType: 0 | 1;
  disabledValue: bigint;
  invocationType?: number;
  deactivationKey?: string;
}>;
