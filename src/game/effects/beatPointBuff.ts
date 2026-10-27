import type { Card, GameState } from '../model.ts';
import type { BeatPointBuffEffect } from '../beatPointBuffTypes.ts';
import { moodValue } from '../projection.ts';
import { calculateLiveSkillMoodCorrection } from '../../runtime/live/skillMood.ts';
import { applyAction52SkillBoostForCard } from './action52SkillBoost.ts';

export function activateBeatPointBuff(
  state: GameState,
  effect: BeatPointBuffEffect,
  card: Card | undefined,
  multiplier: number,
  addValue: number,
): GameState {
  const correction = effect.moodBonus
    ? calculateLiveSkillMoodCorrection(
        effect.moodBonus.target,
        moodValue(state),
        effect.moodBonus.perPoint,
      )
    : 0;
  const numToValue = Math.fround(Math.fround(effect.amount) / Math.fround(10_000));
  const combined = Math.fround(
    Math.fround(Math.fround(correction + numToValue) + Math.fround(addValue)) *
      Math.fround(multiplier),
  );
  const value = int32(combined);
  const action52 =
    value > 0 ? applyAction52SkillBoostForCard(state, card, value) : { state, value };
  const suppressed = effect.invocationType === 0x388 || effect.invocationType === 0x38b;
  return {
    ...action52.state,
    beatPointBuffs: [
      ...action52.state.beatPointBuffs,
      {
        value: int32(action52.value),
        remainingSections:
          effect.duration.kind === 'sections' && !suppressed ? effect.duration.value : null,
        deactivationKey: effect.deactivationKey ?? null,
      },
    ],
  };
}

function int32(value: number): number {
  return Number(BigInt.asIntN(32, BigInt(Math.trunc(value))));
}

export function expireBeatPointBuffSections(state: GameState): GameState {
  return {
    ...state,
    beatPointBuffs: state.beatPointBuffs.flatMap((buff) => {
      if (buff.remainingSections === null) return [buff];
      const remainingSections = buff.remainingSections - 1;
      return remainingSections > 0 ? [{ ...buff, remainingSections }] : [];
    }),
  };
}

export function deactivateBeatPointBuffs(state: GameState, deactivationKey: string): GameState {
  return {
    ...state,
    beatPointBuffs: state.beatPointBuffs.filter((buff) => buff.deactivationKey !== deactivationKey),
  };
}
