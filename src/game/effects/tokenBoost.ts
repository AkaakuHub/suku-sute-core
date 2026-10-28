import { applyAction52SkillBoost } from './action52SkillBoost.ts';
import { int64ToFloat32 } from '../../runtime/numeric.ts';
import type { Card, Effect, GameState } from '../model.ts';

export function activateTokenBoost(
  state: GameState,
  effect: Extract<Effect, { kind: 'token-boost' }>,
  card: Card | undefined,
  multiplier: number,
  addValue: number,
): GameState {
  if (effect.duration?.kind === 'sections' && effect.duration.value === 0n)
    throw new Error('Display section count is 0. (displayTimeType: SECTION, displayTime: 0)');
  const num = BigInt.asIntN(32, effect.num);
  const numValue = Math.fround(int64ToFloat32(num) / Math.fround(10_000));
  const base = Math.fround(
    Math.fround(Math.fround(numValue + Math.fround(addValue)) * Math.fround(multiplier)),
  );
  if (base <= 0) return state;
  const boosted = card ? applyAction52SkillBoost(state, card, base) : { state, value: base };
  const value = Number.isFinite(boosted.value)
    ? Math.fround(boosted.value)
    : Math.fround(-3.4028234663852886e38);
  const suppressDuration = effect.invocationType === 0x388 || effect.invocationType === 0x38b;
  return {
    ...boosted.state,
    tokenBoosts: [
      ...boosted.state.tokenBoosts,
      {
        calculation: effect.calculation,
        value,
        target: effect.target,
        ...(effect.seriesIds ? { seriesIds: effect.seriesIds } : {}),
        remainingUses: effect.uses ?? null,
        remainingSeconds:
          suppressDuration || effect.duration?.kind !== 'milliseconds'
            ? null
            : Math.fround(int64ToFloat32(effect.duration.value) / 1000),
        remainingSections:
          suppressDuration || effect.duration?.kind !== 'sections' ? null : effect.duration.value,
        deactivationKey: effect.deactivationKey ?? null,
      },
    ],
  };
}
