export type ActionType18Record = Readonly<{
  actionType: 18;
  skillEffectId: bigint;
  details: readonly Readonly<{
    id: bigint;
    detailType: string;
    value: bigint;
  }>[];
  destination: 'effects' | 'handPermanentEffects';
}>;
