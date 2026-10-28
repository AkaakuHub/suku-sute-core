import type { Card, Effect, GameState } from '../model.ts';
import { changeResource } from '../resources.ts';
import { moodValue } from '../projection.ts';
import { calculateLiveSkillMoodCorrection } from '../../runtime/live/skillMood.ts';
import { applyAdditionalBuff } from './additionalBuff.ts';
import { applyAction52SkillBoostForCard } from './action52SkillBoost.ts';
import type { EffectApplier } from './induceSkillEffect.ts';

type RecoverMentalSkillEffect = Extract<Effect, { kind: 'recover-mental-skill' }>;

export function activateRecoverMentalSkill(
  state: GameState,
  effect: RecoverMentalSkillEffect,
  card: Card | undefined,
  multiplier: number,
  addValue: number,
  effectPower: number,
  apply: EffectApplier,
): GameState {
  const correction = effect.moodBonus
    ? calculateLiveSkillMoodCorrection(
        effect.moodBonus.target,
        moodValue(state),
        effect.moodBonus.perPoint,
      )
    : 0;
  const numToValue = Math.fround(Math.fround(effect.amount) / Math.fround(10_000));
  const value = Math.fround(numToValue + Math.fround(correction));
  const combined = Math.fround(
    Math.fround(value + Math.fround(addValue)) * Math.fround(multiplier),
  );
  const base = Math.fround(int32(combined) * Math.fround(effectPower));
  const additional = applyAdditionalBuff(state, 'mental', Math.fround(base), card);
  const boosted = applyAction52SkillBoostForCard(additional.state, card, int32(additional.value));
  if (effect.numberType !== 1) return boosted.state;
  const factor = Math.fround(boosted.value / Math.fround(100));
  const recovery = int32(Math.fround(factor * Math.fround(state.maximumMental)));
  return changeResource(boosted.state, 'mental', BigInt(recovery), 'skill', card, apply);
}

function int32(value: number): number {
  return Number(BigInt.asIntN(32, BigInt(Math.trunc(value))));
}
