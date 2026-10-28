import type { MemberId, UnitId } from './model.ts';
import { isInt64 } from '../runtime/numeric.ts';

export type HeartLimitBoostTarget =
  | Readonly<{ kind: 'all' }>
  | Readonly<{ kind: 'member'; member: MemberId }>
  | Readonly<{ kind: 'unit'; unit: UnitId }>
  | Readonly<{ kind: 'card-series'; seriesId: number }>;

export type HeartLimitBoostEffect = Readonly<{
  kind: 'heart-limit-boost';
  calculationType: 1 | 2;
  num: bigint;
  bonusMoodTarget: 0 | 1 | 2 | 3;
  bonusMoodValue: bigint;
  duration: Readonly<{ kind: 'none' | 'milliseconds' | 'sections' | 'stage'; value: bigint }>;
  disabledType: number;
  disabledCount: bigint;
  target: HeartLimitBoostTarget;
  tokenCardSeriesIds?: readonly bigint[];
  deactivationKey?: string;
}>;

export type HeartLimitAdditionalBuff = Readonly<{
  id: number;
  calculation: 'add' | 'multiply2';
  value: number;
  target: HeartLimitBoostTarget;
  remainingUses: bigint | null;
  remainingSeconds: number | null;
  remainingSections: bigint | null;
  deactivationKey: string | null;
}>;

export function validateHeartLimitBoost(effect: HeartLimitBoostEffect): void {
  if (
    ![1, 2].includes(effect.calculationType) ||
    !isInt64(effect.num) ||
    !isInt64(effect.bonusMoodValue) ||
    !['none', 'milliseconds', 'sections', 'stage'].includes(effect.duration.kind) ||
    !isInt64(effect.duration.value) ||
    !Number.isSafeInteger(effect.disabledType) ||
    !isInt64(effect.disabledCount) ||
    (effect.target.kind === 'member' && !Number.isSafeInteger(effect.target.member)) ||
    (effect.target.kind === 'unit' && ![1, 2, 3].includes(effect.target.unit)) ||
    (effect.target.kind === 'card-series' && !Number.isSafeInteger(effect.target.seriesId)) ||
    (effect.tokenCardSeriesIds?.some((id) => !isInt64(id)) ?? false) ||
    (effect.deactivationKey !== undefined && typeof effect.deactivationKey !== 'string')
  )
    throw new Error('きらめき上限追加バフの設定が正しくありません。');
}
