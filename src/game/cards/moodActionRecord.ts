export type MoodActionRecord<T extends number> = Readonly<{
  actionType: T;
  skillEffectId: bigint;
  details: readonly Readonly<{
    id: bigint;
    detailType: string;
    value: bigint;
    targetMood?: number;
  }>[];
  destination: 'effects' | 'handPermanentEffects';
  invocationType?: number;
  deactivationKey?: string;
}>;
