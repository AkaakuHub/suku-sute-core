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

export type TemporaryScoreBoost = Readonly<{
  percent: number;
  remainingSeconds: number | null;
  remainingSections: number | null;
  expireOnHeartCollect: boolean;
}>;

export type VoltageConvertEffect = Readonly<{
  kind: 'voltage-convert';
  destination: 'hearts' | 'love' | 'mental' | 'mental-barrier';
  num: number;
  outputDuration: VoltageConversionDuration;
  convertDisabledType: 0 | 1 | 2;
  displayDuration: VoltageConversionDuration;
  disabledType: 0 | 1;
  disabledValue: bigint;
  invocationType?: number;
  deactivationKey?: string;
}>;
