import { isInt64 } from '../runtime/numeric.ts';

export type HandMaxCardEffect = Readonly<{
  kind: 'hand-max-card';
  duration:
    | Readonly<{ kind: 'milliseconds' | 'sections'; value: bigint }>
    | Readonly<{ kind: 'stage' }>;
  invocationType?: 0x388 | 0x38b;
  deactivationKey?: string;
}>;

export function validateHandMaxCardEffect(effect: HandMaxCardEffect): void {
  if (
    (effect.duration.kind !== 'stage' && !isInt64(effect.duration.value)) ||
    (effect.duration.kind === 'sections' && effect.duration.value === 0n) ||
    (effect.invocationType !== undefined && ![0x388, 0x38b].includes(effect.invocationType)) ||
    (effect.deactivationKey !== undefined && typeof effect.deactivationKey !== 'string')
  )
    throw new Error('手札最大化の設定が正しくありません。');
}
