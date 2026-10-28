import { calculateLiveSkillMoodCorrection } from '../../runtime/live/skillMood.ts';
import { moodValue } from '../projection.ts';
import { applyAction52SkillBoost } from './action52SkillBoost.ts';
import { int64ToFloat32 } from '../../runtime/numeric.ts';
import type { Card, GameState } from '../model.ts';
import type {
  MentalRecoverAdditionalBuffEffect,
  MentalRecoverAdditionalBuffTarget,
} from '../mentalRecoverAdditionalBuffTypes.ts';

export function activateMentalRecoverAdditionalBuff(
  state: GameState,
  effect: MentalRecoverAdditionalBuffEffect,
  source: Card | undefined,
  multiplier: number,
  addValue: number,
): GameState {
  if (effect.duration.kind === 'sections' && effect.duration.value === 0n)
    throw new Error('Display section count is 0. (displayTimeType: SECTION, displayTime: 0)');
  if (effect.calculation !== 1n) return state;
  const correction = effect.moodBonus
    ? calculateLiveSkillMoodCorrection(
        effect.moodBonus.target,
        moodValue(state),
        effect.moodBonus.perPoint,
      )
    : 0;
  const numValue = Math.fround(int64ToFloat32(effect.num) / Math.fround(10_000));
  const value = toInt32(
    Math.fround(
      Math.fround(Math.fround(correction + numValue) + Math.fround(addValue)) *
        Math.fround(multiplier),
    ),
  );
  if (value <= 0) return state;
  if (!source) throw new Error('元気回復追加バフの発動元カードがありません。');
  const boosted = applyAction52SkillBoost(state, source, value);
  const percent = toInt32(boosted.value);
  const suppressDuration = effect.invocationType === 0x388 || effect.invocationType === 0x38b;
  const buff: GameState['mentalRecoverAdditionalBuffs'][number] = {
    id: boosted.state.nextSkillAdditionalBuffId,
    percent,
    target: effect.target,
    remainingSeconds:
      suppressDuration || effect.duration.kind !== 'milliseconds'
        ? null
        : Math.fround(int64ToFloat32(effect.duration.value) / 1000),
    remainingSections:
      suppressDuration || effect.duration.kind !== 'sections' ? null : effect.duration.value,
    remainingUses: effect.disabledType === 1 ? effect.disabledCount : null,
    deactivationKey: effect.deactivationKey ?? null,
  };
  return {
    ...boosted.state,
    mentalRecoverAdditionalBuffs: [...boosted.state.mentalRecoverAdditionalBuffs, buff],
    nextSkillAdditionalBuffId: boosted.state.nextSkillAdditionalBuffId + 1,
  };
}

export function matchingMentalRecoverAdditionalBuffs(
  state: GameState,
  card: Card | undefined,
): readonly GameState['mentalRecoverAdditionalBuffs'][number][] {
  return card
    ? state.mentalRecoverAdditionalBuffs.filter((buff) => matches(buff.target, card))
    : [];
}

export function advanceMentalRecoverAdditionalBuffs(
  state: GameState,
  elapsedSeconds: number,
): GameState {
  return {
    ...state,
    mentalRecoverAdditionalBuffs: state.mentalRecoverAdditionalBuffs.flatMap((buff) => {
      if (buff.remainingSeconds === null) return [buff];
      const remainingSeconds = Math.fround(buff.remainingSeconds - Math.fround(elapsedSeconds));
      return remainingSeconds > 0 ? [{ ...buff, remainingSeconds }] : [];
    }),
  };
}

export function expireMentalRecoverAdditionalBuffSections(state: GameState): GameState {
  return {
    ...state,
    mentalRecoverAdditionalBuffs: state.mentalRecoverAdditionalBuffs.flatMap((buff) => {
      if (buff.remainingSections === null) return [buff];
      const remainingSections = buff.remainingSections - 1n;
      return remainingSections > 0n ? [{ ...buff, remainingSections }] : [];
    }),
  };
}

export function deactivateMentalRecoverAdditionalBuffs(
  state: GameState,
  deactivationKey: string,
): GameState {
  return {
    ...state,
    mentalRecoverAdditionalBuffs: state.mentalRecoverAdditionalBuffs.filter(
      (buff) => buff.deactivationKey !== deactivationKey,
    ),
  };
}

function matches(target: MentalRecoverAdditionalBuffTarget, card: Card): boolean {
  switch (target.kind) {
    case 'all':
      return true;
    case 'member':
      return card.charactersId === target.member;
    case 'unit':
      return card.unitIds.includes(target.unit);
    case 'token-series':
      return card.tokenCardSeriesIds.includes(target.seriesId);
  }
}

function toInt32(value: number): number {
  return !Number.isFinite(value) || value < -2_147_483_648 || value > 2_147_483_647
    ? -2_147_483_648
    : Math.trunc(value);
}
