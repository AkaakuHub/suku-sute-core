export type MentalHeartInduceEffect = Readonly<{
  kind: 'mental-heart-induce';
  num: bigint;
  heartDuration: Readonly<{ kind: 'milliseconds' | 'stage'; value: number }>;
  duration: Readonly<{ kind: 'milliseconds' | 'sections' | 'stage'; value: bigint }>;
  disabledType: 0 | 1;
  disabledValue: bigint;
  invocationType?: number;
  deactivationKey?: string;
}>;

export type MentalHeartInducer = Readonly<{
  id: number;
  sourceCardId: string | null;
  precomputedNum: number;
  heartLifetimeSeconds: number;
  remainingSeconds: number | null;
  remainingSections: bigint | null;
  disabledOnInduceCount: bigint | null;
  induces: number;
  deactivationKey: string | null;
}>;
