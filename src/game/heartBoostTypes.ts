import type { Effect } from './modelTypes.ts';
import { isInt64 } from '../runtime/numeric.ts';

export function validateHeartBoostEffect(effect: Extract<Effect, { kind: 'heart-boost' }>): void {
  const target = effect.target;
  if (
    !Number.isFinite(effect.percent) ||
    (effect.uses !== null &&
      (typeof effect.uses === 'bigint'
        ? !isInt64(effect.uses)
        : !Number.isSafeInteger(effect.uses) || effect.uses < 1)) ||
    (target?.kind === 'member' && !Number.isSafeInteger(target.member)) ||
    (target?.kind === 'unit' && ![1, 2, 3].includes(target.unit)) ||
    (target?.kind === 'card-series' && !Number.isSafeInteger(target.seriesId)) ||
    (effect.duration !== undefined &&
      effect.duration.kind !== 'stage' &&
      (!Number.isSafeInteger(effect.duration.value) ||
        effect.duration.value < (effect.duration.kind === 'sections' ? 1 : 0))) ||
    (effect.invocationType !== undefined && !Number.isSafeInteger(effect.invocationType)) ||
    (effect.deactivationKey !== undefined && typeof effect.deactivationKey !== 'string')
  )
    throw new Error('きらめき増幅の設定が正しくありません。');
}
