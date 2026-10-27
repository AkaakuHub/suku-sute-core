import type { MemberId, UnitId } from './model.ts';
import { isInt64 } from './numeric.ts';

export type VoltageUpAdditionalBuffTarget =
  | Readonly<{ kind: 'all' }>
  | Readonly<{ kind: 'member'; member: MemberId }>
  | Readonly<{ kind: 'unit'; unit: UnitId }>
  | Readonly<{ kind: 'token-series'; seriesId: number }>;

export type VoltageUpAdditionalBuff = Readonly<{
  id: number;
  percent: number;
  target: VoltageUpAdditionalBuffTarget;
  remainingSeconds: number | null;
  remainingSections: bigint | null;
}>;

export type VoltageUpAdditionalBuffEffect = Readonly<{
  kind: 'voltage-up-additional-buff';
  calculation: bigint;
  num: bigint;
  target: VoltageUpAdditionalBuffTarget;
  moodBonus?: Readonly<{ target: 1 | 2 | 3; perPoint: number }>;
  duration: Readonly<{ kind: 'milliseconds' | 'sections' | 'stage'; value: bigint }>;
  disabledType: number;
  disabledCount: bigint;
  invocationType?: number;
}>;

export function validateVoltageUpAdditionalBuffEffect(effect: VoltageUpAdditionalBuffEffect): void {
  if (
    !isInt64(effect.calculation) ||
    !isInt64(effect.num) ||
    !isInt64(effect.duration.value) ||
    (effect.duration.kind === 'sections' && effect.duration.value === 0n) ||
    !validTarget(effect.target) ||
    (effect.moodBonus !== undefined && !Number.isFinite(effect.moodBonus.perPoint)) ||
    !Number.isSafeInteger(effect.disabledType) ||
    !isInt64(effect.disabledCount) ||
    (effect.invocationType !== undefined && !Number.isSafeInteger(effect.invocationType))
  )
    throw new Error('熱気追加バフの設定が正しくありません。');
}

function validTarget(target: VoltageUpAdditionalBuffTarget): boolean {
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
