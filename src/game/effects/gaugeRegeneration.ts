import { calculateLiveRegenGaugeSkillValue } from '../../runtime/skills/regenGaugeValue.ts';
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
  const raw = Math.fround(
    effect.value +
      (effect.moodBonus
        ? calculateLiveSkillMoodCorrection(
            effect.moodBonus.target,
            moodValue(state),
            effect.moodBonus.perPoint,
          )
        : 0),
  );
  const base = calculateLiveRegenGaugeSkillValue(raw, {
    addValue,
    multiplyFactor: multiplier,
    effectPower,
  });
  const boosted = card ? applyAction52SkillBoost(state, card, base) : { state, value: base };
  return startGaugeRegeneration(
    boosted.state,
    effect.gauge,
    boosted.value,
    effect.intervalType,
    effect.intervalValue,
    effect.duration,
    card?.cardInstanceId ?? null,
    applyEffect,
    effect.calculationType,
    effect.invocationType,
    effect.deactivationKey,
  );
}
