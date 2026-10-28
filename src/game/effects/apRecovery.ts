import type { Card, GameState } from '../model.ts';
import type { MoodBonus } from '../modelTypes.ts';
import type { LiveSkillEffectPower } from '../../runtime/skills/skillEffectPower.ts';
import { calculateLiveApRecoveryValue } from '../../runtime/live/apRecovery.ts';
import { calculateLiveSkillMoodCorrection } from '../../runtime/live/skillMood.ts';
import { moodValue } from '../projection.ts';
import { changeResource } from '../resources.ts';
import { applyAction52SkillBoostForCard } from './action52SkillBoost.ts';
import { skillValue } from './skillValue.ts';

export function applyApRecovery(
  state: GameState,
  effect: Readonly<{ amount: number; moodBonus?: MoodBonus }>,
  card: Card | undefined,
  power: LiveSkillEffectPower,
): GameState {
  const mood = effect.moodBonus
    ? calculateLiveSkillMoodCorrection(
        effect.moodBonus.target,
        moodValue(state),
        effect.moodBonus.perPoint,
      )
    : 0;
  let next = state;
  const amount = calculateLiveApRecoveryValue(
    Math.fround(Math.fround(effect.amount) + mood),
    power,
    (base) => {
      const boosted = applyAction52SkillBoostForCard(
        next,
        card,
        skillValue(next, base, { kind: 'ap', amount: 0 }, card),
      );
      next = boosted.state;
      return boosted.value;
    },
  );
  return changeResource(next, 'ap', BigInt(amount));
}
