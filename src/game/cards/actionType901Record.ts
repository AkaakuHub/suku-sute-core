import type { Effect } from '../modelTypes.ts';

export type ActionType901Record = Readonly<{
  actionType: 901;
  skillEffectId: bigint;
  details: readonly Readonly<{
    id: bigint;
    detailType: string;
    value: bigint;
  }>[];
  whenTrue: readonly Effect[];
  whenFalse: readonly Effect[];
}>;
