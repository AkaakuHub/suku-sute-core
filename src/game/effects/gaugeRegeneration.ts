import { skillValue } from './skillValue.ts';
import { applyAction52SkillBoost } from './action52SkillBoost.ts';
import { calculateLiveSkillMoodCorrection } from '../../runtime/live/skillMood.ts';
import { moodValue } from '../projection.ts';
import { startGaugeRegeneration } from '../live/gaugeRegeneration.ts';
import type { GaugeRegenerationEffect } from '../modelTypes.ts';
import type { Card, GameState } from '../model.ts';
import type { EffectApplier } from './induceSkillEffect.ts';

export function applyGaugeRegeneration(
  state: GameState,
  effect: GaugeRegenerationEffect,
  card: Card | undefined,
  multiplier: number,
  addValue = 0,
  effectPower = 1,
  applyEffect?: EffectApplier,
): GameState {
  const raw =
    effect.amountBasis !== 'fixed'
      ? Math.fround(
          effect.amount +
            (effect.moodBonus
              ? calculateLiveSkillMoodCorrection(
                  effect.moodBonus.target,
                  moodValue(state),
                  effect.moodBonus.perPoint,
                )
              : 0),
        )
      : skillValue(state, effect.amount, effect, card);
  const base =
    effect.amountBasis !== 'fixed'
      ? Math.fround(
          Math.fround(Math.fround(raw + Math.fround(addValue)) * Math.fround(multiplier)) *
            Math.fround(effectPower),
        )
      : Math.fround(Math.fround(Math.fround(raw + addValue) * multiplier) * effectPower);
  const boosted = card ? applyAction52SkillBoost(state, card, base) : { state, value: base };
  return startGaugeRegeneration(
    boosted.state,
    effect.gauge,
    boosted.value,
    effect.amountBasis,
    effect.intervalType,
    effect.intervalMilliseconds,
    effect.duration,
    card?.id ?? null,
    applyEffect,
    effect.calculationType,
    effect.invocationType,
    effect.deactivationKey,
  );
}
