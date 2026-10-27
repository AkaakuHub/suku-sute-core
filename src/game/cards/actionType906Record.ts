import type { Effect } from '../modelTypes.ts';

export type ActionType906Record = Readonly<{
  actionType: 906;
  skillEffectId: bigint;
  details: readonly Readonly<{
    id: bigint;
    detailType: string;
    value: bigint;
  }>[];
  childEffects: readonly Effect[];
  destination: 'effects' | 'handPermanentEffects';
}>;
