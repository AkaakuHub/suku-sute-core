export type ActionType14Record = Readonly<{
  actionType: 14;
  details: readonly Readonly<{
    id: bigint;
    detailType: string;
    value: bigint;
    targetMood?: number;
  }>[];
  destination: 'effects' | 'handPermanentEffects';
}>;
