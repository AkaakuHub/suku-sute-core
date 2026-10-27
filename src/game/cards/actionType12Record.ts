import type { Effect } from '../modelTypes.ts';
import type { GameCondition } from '../conditions/model.ts';

export type ActionType12Record = Readonly<{
  actionType: 12;
  condition: GameCondition;
  whenTrue: readonly Effect[];
  whenFalse: readonly Effect[];
  persistent?: boolean;
  deactivationKey?: string;
  destination: 'effects' | 'handPermanentEffects';
}>;
