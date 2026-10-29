import { applyAction52SkillBoost } from './action52SkillBoost.ts';
import { addMentalBarrier } from '../live/mentalBarriers.ts';
import { applyMentalBarrierAdditionalBuff } from './mentalBarrierAdditionalBuff.ts';
import { calculateLiveSkillMoodCorrection } from '../../runtime/live/skillMood.ts';
import { moodValue } from '../projection.ts';
import type { MentalBarrierEffect } from '../modelTypes.ts';
import type { Card, GameState } from '../model.ts';
import { induceSkillEffects, type EffectApplier } from './induceSkillEffect.ts';
import { registerMissionAction } from '../ingameMissions.ts';

export function applyMentalBarrier(
  state: GameState,
  effect: MentalBarrierEffect,
  card: Card | undefined,
  multiplier: number,
  addValue = 0,
  effectPower = 1,
  applyEffect?: EffectApplier,
): GameState {
  const enduranceCorrection =
    effect.enduranceType === 'ratio' && effect.enduranceMoodBonus
      ? calculateLiveSkillMoodCorrection(
          effect.enduranceMoodBonus.target,
          moodValue(state),
          effect.enduranceMoodBonus.perPoint,
        )
      : 0;
  const enduranceValue = Math.fround(effect.endurance + enduranceCorrection);
  const baseEndurance = Math.fround(
    Math.fround(Math.fround(enduranceValue + addValue) * multiplier) * effectPower,
  );
  const additional = applyMentalBarrierAdditionalBuff(state, card, baseEndurance);
  const boosted = card
    ? applyAction52SkillBoost(additional.state, card, additional.value)
    : { state: additional.state, value: additional.value };
  const endurance =
    effect.enduranceType === 'infinite'
      ? 0
      : effect.enduranceType === 'ratio'
        ? Math.trunc(Math.fround(Math.fround(boosted.value / 100) * state.maximumMental))
        : Math.trunc(boosted.value);
  const attenuationCorrection =
    effect.barrier === 'attenuation' && effect.attenuationMoodBonus
      ? calculateLiveSkillMoodCorrection(
          effect.attenuationMoodBonus.target,
          moodValue(state),
          effect.attenuationMoodBonus.perPoint,
        )
      : 0;
  const attenuation = Math.fround(
    Math.fround(effect.attenuation + attenuationCorrection) / Math.fround(100),
  );
  if (effect.enduranceType !== 'infinite' && endurance === 0)
    return registerMissionAction(boosted.state, 7, endurance);
  const next = addMentalBarrier(boosted.state, effect, endurance, attenuation);
  if (
    !applyEffect ||
    next.mentalBarriers.effects.length === boosted.state.mentalBarriers.effects.length
  )
    return registerMissionAction(next, 7, endurance);
  const induced = induceSkillEffects(
    next,
    'mental-barrier',
    endurance === 0 ? state.maximumMental : Math.trunc(endurance),
    applyEffect,
  );
  return registerMissionAction(induced, 7, endurance);
}
