import type { MemberId, UnitId } from './model.ts';
import { isInt64 } from '../runtime/numeric.ts';

export type MentalRecoverAdditionalBuffTarget =
  | Readonly<{ kind: 'all' }>
  | Readonly<{ kind: 'member'; member: MemberId }>
  | Readonly<{ kind: 'unit'; unit: UnitId }>
  | Readonly<{ kind: 'token-series'; seriesId: number }>;

export type MentalRecoverAdditionalBuff = Readonly<{
  id: number;
  percent: number;
  target: MentalRecoverAdditionalBuffTarget;
  remainingSeconds: number | null;
  remainingSections: bigint | null;
  remainingUses: bigint | null;
  deactivationKey: string | null;
}>;

export type MentalRecoverAdditionalBuffEffect = Readonly<{
  kind: 'recover-mental-additional-buff';
  calculation: bigint;
  num: bigint;
  target: MentalRecoverAdditionalBuffTarget;
  moodBonus?: Readonly<{ target: 1 | 2 | 3; perPoint: number }>;
  duration: Readonly<{ kind: 'milliseconds' | 'sections' | 'stage'; value: bigint }>;
  disabledType: number;
  disabledCount: bigint;
  invocationType?: number;
  deactivationKey?: string;
}>;

export function validateMentalRecoverAdditionalBuffEffect(
  effect: MentalRecoverAdditionalBuffEffect,
): void {
  if (
    !isInt64(effect.calculation) ||
    !isInt64(effect.num) ||
    !isInt64(effect.duration.value) ||
    (effect.duration.kind === 'sections' && effect.duration.value === 0n) ||
    !validTarget(effect.target) ||
    (effect.moodBonus !== undefined && !Number.isFinite(effect.moodBonus.perPoint)) ||
    !Number.isSafeInteger(effect.disabledType) ||
    !isInt64(effect.disabledCount) ||
    (effect.invocationType !== undefined && !Number.isSafeInteger(effect.invocationType)) ||
    (effect.deactivationKey !== undefined && typeof effect.deactivationKey !== 'string')
  )
    throw new Error('元気回復追加バフの設定が正しくありません。');
}

function validTarget(target: MentalRecoverAdditionalBuffTarget): boolean {
  switch (target.kind) {
    case 'all':
      return true;
    case 'member':
      return Number.isSafeInteger(target.member);
    case 'unit':
      return Number.isSafeInteger(target.unit) && [1, 2, 3].includes(target.unit);
    case 'token-series':
      return Number.isSafeInteger(target.seriesId);
  }
}
