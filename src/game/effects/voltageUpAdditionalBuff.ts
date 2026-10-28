import { calculateLiveSkillMoodCorrection } from '../../runtime/live/skillMood.ts';
import { moodValue } from '../projection.ts';
import { applyAction52SkillBoost } from './action52SkillBoost.ts';
import { int64ToFloat32 } from '../../runtime/numeric.ts';
import type { Card, GameState } from '../model.ts';
import type {
  VoltageUpAdditionalBuffEffect,
  VoltageUpAdditionalBuffTarget,
} from '../voltageUpAdditionalBuffTypes.ts';

export function activateVoltageUpAdditionalBuff(
  state: GameState,
  effect: VoltageUpAdditionalBuffEffect,
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
  const base = Math.fround(
    Math.fround(Math.fround(correction + numValue) + Math.fround(addValue)) *
      Math.fround(multiplier),
  );
  const value = toInt32(base);
  if (value <= 0) return state;
  if (!source) throw new Error('熱気追加バフの発動元カードがありません。');
  const boosted = value > 0 ? applyAction52SkillBoost(state, source, value) : { state, value };
  const percent = value > 0 ? toInt32(boosted.value) : value;
  const suppressDuration = effect.invocationType === 0x388 || effect.invocationType === 0x38b;
  const buff: GameState['voltageUpAdditionalBuffs'][number] = {
    id: boosted.state.nextSkillAdditionalBuffId,
    percent,
    target: effect.target,
    remainingSeconds:
      suppressDuration || effect.duration.kind !== 'milliseconds'
        ? null
        : Math.fround(int64ToFloat32(effect.duration.value) / 1000),
    remainingSections:
      suppressDuration || effect.duration.kind !== 'sections' ? null : effect.duration.value,
  };
  return {
    ...boosted.state,
    voltageUpAdditionalBuffs: [...boosted.state.voltageUpAdditionalBuffs, buff],
    nextSkillAdditionalBuffId: boosted.state.nextSkillAdditionalBuffId + 1,
  };
}

export function matchingVoltageUpAdditionalBuffs(
  state: GameState,
  card: Card | undefined,
): readonly GameState['voltageUpAdditionalBuffs'][number][] {
  return card ? state.voltageUpAdditionalBuffs.filter((buff) => matches(buff.target, card)) : [];
}

export function advanceVoltageUpAdditionalBuffs(
  state: GameState,
  elapsedSeconds: number,
): GameState {
  return {
    ...state,
    voltageUpAdditionalBuffs: state.voltageUpAdditionalBuffs.flatMap((buff) => {
      if (buff.remainingSeconds === null) return [buff];
      const remainingSeconds = Math.fround(buff.remainingSeconds - Math.fround(elapsedSeconds));
      return remainingSeconds > 0 ? [{ ...buff, remainingSeconds }] : [];
    }),
  };
}

export function expireVoltageUpAdditionalBuffSections(state: GameState): GameState {
  return {
    ...state,
    voltageUpAdditionalBuffs: state.voltageUpAdditionalBuffs.flatMap((buff) => {
      if (buff.remainingSections === null) return [buff];
      const remainingSections = buff.remainingSections - 1n;
      return remainingSections > 0n ? [{ ...buff, remainingSections }] : [];
    }),
  };
}

function matches(target: VoltageUpAdditionalBuffTarget, card: Card): boolean {
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
