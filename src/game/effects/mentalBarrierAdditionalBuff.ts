import { calculateLiveSkillMoodCorrection } from '../../runtime/live/skillMood.ts';
import { moodValue } from '../projection.ts';
import { applyAction52SkillBoost } from './action52SkillBoost.ts';
import { int64ToFloat32 } from '../../runtime/numeric.ts';
import type { Card, GameState } from '../model.ts';
import type {
  MentalBarrierAdditionalBuffEffect,
  MentalBarrierAdditionalBuffTarget,
} from '../mentalBarrierAdditionalBuffTypes.ts';

export function activateMentalBarrierAdditionalBuff(
  state: GameState,
  effect: MentalBarrierAdditionalBuffEffect,
  source: Card | undefined,
  multiplier: number,
  addValue: number,
): GameState {
  if (effect.duration.kind === 'sections' && effect.duration.value === 0n)
    throw new Error('Display section count is 0. (displayTimeType: SECTION, displayTime: 0)');
  if (effect.calculation !== 1) return state;
  const correction = effect.moodBonus
    ? calculateLiveSkillMoodCorrection(
        effect.moodBonus.target,
        moodValue(state),
        effect.moodBonus.perPointLong === undefined
          ? effect.moodBonus.perPoint
          : int64ToFloat32(effect.moodBonus.perPointLong),
      )
    : 0;
  const numValue = Math.fround(int64ToFloat32(effect.num) / Math.fround(10_000));
  const value = toInt32(
    Math.fround(
      Math.fround(Math.fround(correction + numValue) + Math.fround(addValue)) *
        Math.fround(multiplier),
    ),
  );
  if (value > 0 && !source) throw new Error('元気バリア追加バフの発動元カードがありません。');
  const boosted =
    value > 0 && source ? applyAction52SkillBoost(state, source, value) : { state, value };
  const percent = value > 0 && source ? toInt32(boosted.value) : value;
  const next = boosted.state;
  const suppressDuration = effect.invocationType === 0x388 || effect.invocationType === 0x38b;
  const buff: GameState['mentalBarrierAdditionalBuffs'][number] = {
    id: next.nextSkillAdditionalBuffId,
    percent,
    target: effect.target,
    remainingSeconds:
      suppressDuration || effect.duration.kind !== 'milliseconds'
        ? null
        : Math.fround(int64ToFloat32(effect.duration.value) / Math.fround(1000)),
    remainingSections:
      suppressDuration || effect.duration.kind !== 'sections' ? null : effect.duration.value,
    remainingUses: effect.disabledType === 1 ? BigInt.asIntN(64, effect.disabledCount) : null,
    deactivationKey: effect.deactivationKey ?? null,
  };
  return {
    ...next,
    mentalBarrierAdditionalBuffs: [...next.mentalBarrierAdditionalBuffs, buff],
    nextSkillAdditionalBuffId: next.nextSkillAdditionalBuffId + 1,
  };
}

function matchingMentalBarrierAdditionalBuffs(
  state: GameState,
  card: Card | undefined,
): readonly GameState['mentalBarrierAdditionalBuffs'][number][] {
  return card
    ? state.mentalBarrierAdditionalBuffs.filter((buff) => matches(buff.target, card))
    : [];
}

export function advanceMentalBarrierAdditionalBuffs(
  state: GameState,
  elapsedSeconds: number,
): GameState {
  return {
    ...state,
    mentalBarrierAdditionalBuffs: state.mentalBarrierAdditionalBuffs.flatMap((buff) => {
      if (buff.remainingSeconds === null) return [buff];
      const remainingSeconds = Math.fround(buff.remainingSeconds - Math.fround(elapsedSeconds));
      return remainingSeconds > 0 ? [{ ...buff, remainingSeconds }] : [];
    }),
  };
}

export function expireMentalBarrierAdditionalBuffSections(state: GameState): GameState {
  return {
    ...state,
    mentalBarrierAdditionalBuffs: state.mentalBarrierAdditionalBuffs.flatMap((buff) => {
      if (buff.remainingSections === null) return [buff];
      const remainingSections = buff.remainingSections - 1n;
      return remainingSections > 0n ? [{ ...buff, remainingSections }] : [];
    }),
  };
}

export function deactivateMentalBarrierAdditionalBuffs(
  state: GameState,
  deactivationKey: string,
): GameState {
  return {
    ...state,
    mentalBarrierAdditionalBuffs: state.mentalBarrierAdditionalBuffs.filter(
      (buff) => buff.deactivationKey !== deactivationKey,
    ),
  };
}

export function applyMentalBarrierAdditionalBuff(
  state: GameState,
  card: Card | undefined,
  value: number,
): Readonly<{ state: GameState; value: number }> {
  if (!(value > 0)) return { state, value };
  const matching = matchingMentalBarrierAdditionalBuffs(state, card);
  const percent = Math.max(
    -100,
    matching.reduce((sum, buff) => Math.fround(sum + Math.fround(buff.percent)), 0),
  );
  return {
    value: Math.fround((percent * value) / 100 + value),
    state: {
      ...state,
      mentalBarrierAdditionalBuffs: state.mentalBarrierAdditionalBuffs.flatMap((buff) => {
        if (!matching.some((item) => item.id === buff.id) || buff.remainingUses === null)
          return [buff];
        const remainingUses = buff.remainingUses - 1n;
        return remainingUses > 0n ? [{ ...buff, remainingUses }] : [];
      }),
    },
  };
}

function matches(target: MentalBarrierAdditionalBuffTarget, card: Card): boolean {
  switch (target.kind) {
    case 'all':
      return true;
    case 'member':
      return card.member === target.member;
    case 'unit':
      return card.unit === target.unit;
    case 'token-series':
      return card.tokenSeriesIds?.includes(target.seriesId) === true;
  }
}

function toInt32(value: number): number {
  return !Number.isFinite(value) || value < -2_147_483_648 || value > 2_147_483_647
    ? -2_147_483_648
    : Math.trunc(value) || 0;
}
