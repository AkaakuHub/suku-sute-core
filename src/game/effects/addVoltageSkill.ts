import type { AddVoltageSkillEffect } from '../addVoltageTypes.ts';
import type { Card, GameState } from '../model.ts';
import type { EffectApplier } from './induceSkillEffect.ts';
import { changeResource } from '../resources.ts';
import { moodValue } from '../projection.ts';
import { calculateLiveSkillMoodCorrection } from '../../runtime/live/skillMood.ts';
import { applyAdditionalBuff } from './additionalBuff.ts';
import { applyAction52SkillBoostForCard } from './action52SkillBoost.ts';
import { registerMissionAction } from '../ingameMissions.ts';

export function activateAddVoltageSkill(
  state: GameState,
  effect: AddVoltageSkillEffect,
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
  const initial = Math.fround(
    Math.fround(int32(effect.amount)) / Math.fround(10_000) + Math.fround(correction),
  );
  const combined = Math.fround(
    Math.fround(Math.fround(initial + Math.fround(addValue)) * Math.fround(multiplier)) *
      Math.fround(effectPower),
  );
  const base = Math.fround(int32(combined));
  const additional = applyAdditionalBuff(state, 'excitement', base, card);
  const boosted = applyAction52SkillBoostForCard(additional.state, card, int32(additional.value));
  if (effect.numberType !== 1) return registerMissionAction(boosted.state, 10, 0);
  return changeResource(
    boosted.state,
    'excitement',
    BigInt(int32(boosted.value)),
    'skill',
    card,
    apply,
    true,
    (next, amount) => registerMissionAction(next, 10, amount),
  );
}

function int32(value: number): number {
  return Number(BigInt.asIntN(32, BigInt(Math.trunc(value))));
}
