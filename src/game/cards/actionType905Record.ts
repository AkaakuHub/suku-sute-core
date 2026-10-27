import type { Effect } from '../modelTypes.ts';

export type ActionType905Record = Readonly<{
  actionType: 905;
  skillEffectId: bigint;
  details: readonly Readonly<{
    id: bigint;
    detailType: string;
    value: bigint;
  }>[];
  childEffects: readonly Effect[];
  destination: 'effects' | 'handPermanentEffects';
}>;
