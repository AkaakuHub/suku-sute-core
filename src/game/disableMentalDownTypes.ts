import { isInt64 } from '../runtime/numeric.ts';

export type DisableMentalDown = Readonly<{
  id: number;
  remainingSeconds: number | null;
  remainingSections: bigint | null;
  deactivationKey: string | null;
}>;

export type DisableMentalDownEffect = Readonly<{
  kind: 'disable-mental-down';
  duration: Readonly<{ kind: 'milliseconds' | 'sections' | 'stage'; value: bigint }>;
  invocationType?: number;
  deactivationKey?: string;
}>;

export function validateDisableMentalDownEffect(effect: DisableMentalDownEffect): void {
  if (
    !isInt64(effect.duration.value) ||
    (effect.duration.kind === 'sections' && effect.duration.value === 0n) ||
    (effect.invocationType !== undefined && !Number.isSafeInteger(effect.invocationType)) ||
    (effect.deactivationKey !== undefined && typeof effect.deactivationKey !== 'string')
  )
    throw new Error('休憩回避効果の設定が正しくありません。');
}
