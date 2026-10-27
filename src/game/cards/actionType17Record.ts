export type ActionType17Record = Readonly<{
  actionType: 17;
  details: readonly Readonly<{
    id: bigint;
    detailType: string;
    value: bigint;
  }>[];
  destination: 'effects' | 'handPermanentEffects';
  invocationType?: number;
  deactivationKey?: string;
}>;
