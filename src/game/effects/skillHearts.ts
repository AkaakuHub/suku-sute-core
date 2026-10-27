import { beatHeartCount } from '../beat.ts';
import { addHeartsWithLifeTime } from '../hearts.ts';
import { moodValue } from '../projection.ts';
import { calculateLiveSkillMoodCorrection } from '../../runtime/live/skillMood.ts';
import type { Card, GameState } from '../model.ts';
import type { Effect } from '../modelTypes.ts';
import { applyAction52SkillBoostForCard } from './action52SkillBoost.ts';
import { applyAdditionalBuff } from './additionalBuff.ts';

type SkillHeartsEffect = Extract<Effect, { kind: 'skill-hearts' }>;

export function createSkillHeartsFromEffect(
  state: GameState,
  effect: SkillHeartsEffect,
  card: Card | undefined,
  multiplier: number,
  addValue: number,
  effectPower: number,
): GameState {
  const amount = int32(effect.amount);
  const moodCorrection = effect.moodBonus
    ? calculateLiveSkillMoodCorrection(
        effect.moodBonus.target,
        moodValue(state),
        effect.moodBonus.perPoint,
      )
    : 0;
  const amountValue = Math.fround(Math.fround(amount) / Math.fround(10_000));
  const combined = Math.fround(
    Math.fround(Math.fround(moodCorrection + amountValue) + Math.fround(addValue)) *
      Math.fround(multiplier),
  );
  const calculationValue = effect.calculation === 'fixed' ? int32(combined) : combined;
  const additional = applyAdditionalBuff(state, 'attract', calculationValue, card);
  let value = int32(additional.value);
  let next = additional.state;
  if (value > 0) {
    const action52 = applyAction52SkillBoostForCard(next, card, value);
    next = action52.state;
    value = int32(action52.value);
  }

  const baseCount =
    effect.calculation === 'fixed'
      ? Math.fround(value)
      : Math.fround(Math.fround(value) * Math.fround(beatHeartCount(next)));
  const count = Math.max(1, int32(baseCount * Math.fround(effectPower)));
  const lifetimeSeconds =
    effect.displayTime.kind === 'milliseconds'
      ? Math.fround(int32(effect.displayTime.value) / 1000)
      : 9999;
  return addHeartsWithLifeTime(next, count, lifetimeSeconds);
}

function int32(value: number): number {
  return Number(BigInt.asIntN(32, BigInt(Math.trunc(value))));
}
