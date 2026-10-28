import type { LiveDrawSuccessCondition } from '../runtime/skills/drawSuccessCondition.ts';
import type { Effect } from './modelTypes.ts';

export type DrawSuccessInduceEffect = Readonly<
  LiveDrawSuccessCondition & {
    kind: 'draw-success-induce';
    sourceEffectId: string;
    disabledType?: bigint;
    whenTrue: readonly Effect[];
    whenFalse: readonly Effect[];
  }
>;
