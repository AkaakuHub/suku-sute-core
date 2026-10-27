import type { Card, Effect, GameState } from '../model.ts';
import type { HeartBoostState } from '../modelTypes.ts';
import { applyAction52SkillBoost } from '../effects/action52SkillBoost.ts';
import { calculateLiveSkillMoodCorrection } from '../../runtime/live/skillMood.ts';
import { moodValue } from '../projection.ts';

export function addHeartBoost(
  state: GameState,
  effect: Extract<Effect, { kind: 'heart-boost' }>,
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
  const raw = Math.fround(
    Math.fround(correction + Math.fround(effect.percent)) + Math.fround(addValue),
  );
  const base = int32(Math.fround(raw * Math.fround(multiplier)));
  const boosted = card ? applyAction52SkillBoost(state, card, base) : { state, value: base };
  const suppressDuration = effect.invocationType === 0x388 || effect.invocationType === 0x38b;
  return {
    ...boosted.state,
    heartBoosts: [
      ...boosted.state.heartBoosts,
      {
        percent: int32(boosted.value),
        uses: effect.uses === null ? null : BigInt(effect.uses),
        target: effect.target ?? { kind: 'all' },
        remainingSeconds: suppressDuration
          ? null
          : effect.duration === undefined
            ? 0
            : effect.duration.kind === 'stage'
              ? null
              : effect.duration.kind === 'milliseconds'
                ? Math.fround(effect.duration.value / 1000)
                : null,
        remainingSections:
          !suppressDuration && effect.duration?.kind === 'sections' ? effect.duration.value : null,
        deactivationKey: effect.deactivationKey ?? null,
      },
    ],
  };
}

function int32(value: number): number {
  return Number(BigInt.asIntN(32, BigInt(Math.trunc(value))));
}

export function consumeHeartBoosts(
  state: GameState,
  card: Card | undefined,
  base: number,
): Readonly<{ state: GameState; percent: number }> {
  const matching = state.heartBoosts.filter((boost) => {
    if (base <= 0) return false;
    if (boost.target.kind === 'all') return true;
    if (!card) return false;
    if (boost.target.kind === 'member') return card.member === boost.target.member;
    if (boost.target.kind === 'unit') return card.unit === boost.target.unit;
    return card.tokenSeriesIds?.includes(boost.target.seriesId) ?? false;
  });
  const matchingSet = new Set(matching);
  return {
    state: {
      ...state,
      heartBoosts: state.heartBoosts.flatMap((boost) => {
        if (!matchingSet.has(boost)) return [boost];
        if (boost.uses === null) return [boost];
        return boost.uses > 1n ? [{ ...boost, uses: boost.uses - 1n }] : [];
      }),
    },
    percent: matching.reduce((total, boost) => Math.fround(total + boost.percent), 0),
  };
}

export function deactivateHeartBoosts(state: GameState, deactivationKey: string): GameState {
  return {
    ...state,
    heartBoosts: state.heartBoosts.filter((boost) => boost.deactivationKey !== deactivationKey),
  };
}

export function advanceHeartBoosts(state: GameState, elapsedSeconds: number): GameState {
  return {
    ...state,
    heartBoosts: state.heartBoosts.flatMap((boost) => {
      if (boost.remainingSeconds === null) return [boost];
      const remainingSeconds = Math.fround(boost.remainingSeconds - Math.fround(elapsedSeconds));
      return remainingSeconds > 0 ? [{ ...boost, remainingSeconds }] : [];
    }),
  };
}

export function expireSectionHeartBoosts(
  boosts: readonly HeartBoostState[],
): readonly HeartBoostState[] {
  return boosts.flatMap((boost) => {
    if (boost.remainingSections === null) return [boost];
    const remainingSections = boost.remainingSections - 1;
    return remainingSections > 0 ? [{ ...boost, remainingSections }] : [];
  });
}
