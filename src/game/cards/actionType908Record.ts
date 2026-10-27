import type { Effect } from '../modelTypes.ts';

export type ActionType908Record = Readonly<{
  actionType: 908;
  skillEffectId: bigint;
  details: readonly Readonly<{
    id: bigint;
    detailType: string;
    value: bigint;
  }>[];
  childEffects: readonly Effect[];
  destination: 'effects' | 'handPermanentEffects';
}>;
