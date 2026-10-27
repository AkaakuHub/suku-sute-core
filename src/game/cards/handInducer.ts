import type { Effect } from '../modelTypes.ts';
import type { HandUseTrigger } from './handUseTrigger.ts';
export type { HandUseTrigger } from './handUseTrigger.ts';

export type HandInducer = Readonly<{
  sourceEffectId: string;
  trigger: HandUseTrigger;
  effects: readonly Effect[];
  limit?: bigint;
  limitMemory?: 'reset' | 'retain';
}>;

export function handInducerStateKey(cardId: string, sourceEffectId: string): string {
  return `${cardId}:${sourceEffectId}`;
}
