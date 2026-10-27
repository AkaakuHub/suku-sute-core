import type { Effect } from '../modelTypes.ts';

export type ActionType903Record = Readonly<{
  actionType: 903;
  skillEffectId: bigint;
  details: readonly Readonly<{
    id: bigint;
    detailType: string;
    value: bigint;
  }>[];
  effects: readonly Effect[];
}>;
