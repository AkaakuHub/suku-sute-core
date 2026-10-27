import type { Effect } from '../modelTypes.ts';

export type ActionType904Record = Readonly<{
  actionType: 904;
  details: readonly Readonly<{
    id: bigint;
    detailType: string;
    value: bigint;
  }>[];
  childEffects: readonly Effect[];
}>;
