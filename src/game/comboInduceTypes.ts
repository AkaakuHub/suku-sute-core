import type { Effect, MemberId } from './model.ts';
import { isInt64 } from './numeric.ts';

export type ComboInduceEvent = Readonly<{ member: MemberId; ap: number }>;
export type ComboInduceMemberAp = Readonly<{ member: MemberId; ap: number | null }>;

export type ComboInducer = Readonly<{
  sourceCardId: string;
  members: readonly ComboInduceMemberAp[];
  apPower: bigint;
  repeatAction: 0 | 1 | 2;
  effects: readonly Effect[];
  addValue: number;
  multiplier: number;
  remainingSeconds: number | null;
  remainingSections: number | null;
  deactivationKey: string | null;
  active: boolean;
  phase: 'collecting' | 'activating' | 'resetting';
  phaseRemainingSeconds: number;
  events: readonly ComboInduceEvent[];
}>;

export function validateComboInduceEffect(
  effect: Extract<Effect, { kind: 'combo-induce' }>,
  validateChild: (effect: Effect) => void,
): void {
  const duration = effect.duration;
  if (
    effect.members.some((member) => !Number.isSafeInteger(member)) ||
    !isInt64(effect.apPower) ||
    ![0, 1, 2].includes(effect.repeatAction) ||
    !['milliseconds', 'sections', 'stage'].includes(duration.kind) ||
    !Number.isSafeInteger(duration.value) ||
    (duration.kind === 'sections' && duration.value === 0) ||
    (effect.deactivationKey !== undefined && typeof effect.deactivationKey !== 'string')
  )
    throw new Error('コンボ誘発の設定が正しくありません。');
  for (const child of effect.effects) validateChild(child);
}
