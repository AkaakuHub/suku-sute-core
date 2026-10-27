import type { Effect } from '../modelTypes.ts';

export type ActionType907Record = Readonly<{
  actionType: 907;
  skillEffectId: bigint;
  details: readonly Readonly<{
    id: bigint;
    detailType: string;
    value: bigint;
  }>[];
  childEffects: readonly Effect[];
  destination: 'effects' | 'handPermanentEffects';
}>;
