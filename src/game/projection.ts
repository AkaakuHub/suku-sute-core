import { isLiveSkillCostOver } from '../runtime/live/skillCost.ts';
import { calculateLiveBaseSkillCooldownSeconds } from '../runtime/live/skillActivation.ts';
import { cardCost } from './cards/cost.ts';
import { moodAtTime } from './live/moodTimeline.ts';
import { type Card, type GameState, type Section, rules } from './model.ts';
import { resolveModeSkill } from './live/modes.ts';
import { skillCooldownSeconds } from './effects/skillCooldown.ts';
import { applyOrderedBuffs } from './parameters/buffs.ts';

export function sectionAt(state: GameState): Section {
  const beat = ((state.tick / rules.ticksPerSecond) * state.track.bpm) / 60;
  const section = state.track.sections.findLast((item) => item.startBeat <= beat);
  if (!section) throw new Error('現在の区間がありません。');
  return section;
}

export function sectionNumber(state: GameState): number {
  const current = sectionAt(state);
  const index = state.track.sections.indexOf(current);
  const climax = state.track.sections.findIndex((part) => part.climax);
  return current.climax ? 99 : index - (climax >= 0 && climax < index ? 1 : 0) + 1;
}

export function durationSeconds(state: GameState): number {
  return (state.track.beats * 60) / state.track.bpm;
}

export function cardAt(state: GameState, index: number): Card {
  const id = state.hand[index];
  const card = state.deck.find((item) => item.cardInstanceId === id);
  if (!card) throw new Error('手札にカードがありません。');
  return resolveModeSkill(card, state.modes);
}

export function moodValue(state: GameState): number {
  return Math.max(-100, Math.min(100, moodValueWithoutLimit(state)));
}

export function moodValueWithoutLimit(state: GameState): number {
  const base =
    moodAtTime(state.track.moodKeys, state.tick / rules.ticksPerSecond) + state.moodOffset;
  return Math.trunc(
    applyOrderedBuffs(
      base,
      state.moodSkillBuffs.map((buff) => ({
        kind: buff.calculation,
        value: buff.value,
        group: 'skill' as const,
      })),
    ),
  );
}

export function canUseCard(state: GameState, index: number): boolean {
  return (
    state.phase === 'playing' &&
    Number.isInteger(index) &&
    index >= 0 &&
    index < state.hand.length &&
    !state.mental.mentalDown &&
    state.tick - state.lastActionTick >= cardCooldownTicks(state) &&
    !isLiveSkillCostOver({
      ap: state.ap,
      genesis: state.genesis,
      apInfinity: state.gaugeInfinities.some(
        (effect) => effect.gauge === 'ap' && !effect.suspended,
      ),
      consumeAp: cardCost(state, cardAt(state, index)),
    })
  );
}

export function cardCooldownTicks(state: GameState): number {
  const seconds = state.skillCooldownEffects.length
    ? Math.min(...state.skillCooldownEffects.map((effect) => skillCooldownSeconds(state, effect)))
    : calculateLiveBaseSkillCooldownSeconds(Math.round(durationSeconds(state) * 1000));
  return Math.ceil(seconds * rules.ticksPerSecond);
}
