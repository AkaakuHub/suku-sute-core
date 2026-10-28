import type { Card, Effect, GameState } from '../model.ts';
import { moodValue } from '../projection.ts';
import { calculateLiveSkillMoodCorrection } from '../../runtime/live/skillMood.ts';
import { applyStarGatherSkillBoost } from '../live/skillBoost.ts';

export function skillValue(state: GameState, value: number, effect: Effect, card?: Card): number {
  const bonus =
    'moodBonus' in effect && effect.moodBonus
      ? calculateLiveSkillMoodCorrection(
          effect.moodBonus.target,
          moodValue(state),
          effect.moodBonus.perPoint,
        )
      : 0;
  const raw = Math.fround(value + bonus);
  const base =
    effect.kind === 'boost' ||
    effect.kind === 'mental' ||
    effect.kind === 'voltage' ||
    effect.kind === 'heart-boost'
      ? Math.trunc(raw)
      : effect.kind === 'bloom' || effect.kind === 'amplify' || effect.kind === 'ap'
        ? raw
        : Math.ceil(raw);
  return applyStarGatherSkillBoost(base, skillBoostPercent(state, card));
}

function skillBoostPercent(state: GameState, card?: Card): number {
  const handBoost = state.deck.reduce(
    (sum, item) =>
      sum +
      (state.handEffectCardIds.includes(item.id) &&
      (item.token === 'bookmark' || item.token === 'story') &&
      state.deck.length >= 80
        ? Math.fround(1001 + Math.max(0, moodValue(state)) * 5.005)
        : 0),
    0,
  );
  const story = card?.token === 'story' ? state.storyAmplification + handBoost : 0;
  const targeted = card
    ? state.targetBoosts.reduce(
        (sum, boost) => sum + (boost.members.includes(card.member) ? boost.percent : 0),
        0,
      )
    : 0;
  const passive = card
    ? state.deck.reduce((sum, item) => {
        const boost = item.passive?.skillBoost;
        if (!state.handEffectCardIds.includes(item.id) || !boost?.members.includes(card.member))
          return sum;
        const mood = boost.moodBonus
          ? calculateLiveSkillMoodCorrection(
              boost.moodBonus.target,
              moodValue(state),
              boost.moodBonus.perPoint,
            )
          : 0;
        return sum + boost.percent + mood;
      }, 0)
    : 0;
  return state.amplification - 100 + story + targeted + passive;
}
