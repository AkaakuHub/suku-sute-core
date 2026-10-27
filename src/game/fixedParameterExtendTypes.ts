import { isInt64 } from './numeric.ts';

export type FixedParameterExtendEffect = Readonly<{
  kind: 'fixed-parameter-extend';
  target: 'ap' | 'voltage' | 'mental';
  calculation: 'add' | 'multiply' | 'fixed';
  value: bigint;
  deactivationKey?: string;
  duration:
    | Readonly<{ kind: 'milliseconds' | 'sections'; value: bigint }>
    | Readonly<{ kind: 'stage' }>;
}>;

export type FixedParameterExtend = Readonly<{
  id: number;
  target: FixedParameterExtendEffect['target'];
  calculation: FixedParameterExtendEffect['calculation'];
  value: number;
  remainingSeconds: number | null;
  remainingSections: number | null;
  deactivationKey: string | null;
}>;

export function validateFixedParameterExtendEffect(effect: FixedParameterExtendEffect): void {
  if (
    !isInt64(effect.value) ||
    (effect.deactivationKey !== undefined && typeof effect.deactivationKey !== 'string') ||
    !['ap', 'voltage', 'mental'].includes(effect.target) ||
    !['add', 'multiply', 'fixed'].includes(effect.calculation) ||
    (effect.duration.kind !== 'stage' && !isInt64(effect.duration.value))
  )
    throw new Error('固定パラメーター上限変更の設定が正しくありません。');
}
