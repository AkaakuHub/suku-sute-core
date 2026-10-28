import { createLiveSkillEffectDuration } from '../../runtime/skills/skillEffectDuration.ts';
import {
  resolveLiveApIncreaseIntervalSeconds,
  resolveLiveApIncreaseIntervalMilliseconds,
  advanceLiveApIncreaseSpeedState,
} from '../../runtime/skills/apIncreaseSpeed.ts';
import { rescaleLiveGaugeTimer } from '../../runtime/live/gaugeTiming.ts';
import { observeLiveApIncreaseSpeedEffect } from '../../runtime/skills/apIncreaseSpeedObservation.ts';
import type { Card, Effect, GameState } from '../model.ts';
import { calculateLiveSkillMoodCorrection } from '../../runtime/live/skillMood.ts';
import { moodValue } from '../projection.ts';
import { skillValue } from './skillValue.ts';
import { applyAction52SkillBoostForCard } from './action52SkillBoost.ts';
import { absorbSkillEffect } from './proxySkill.ts';
import { int64ToFloat32 } from '../../runtime/numeric.ts';

type ApSpeedChange = Extract<Effect, { kind: 'ap-speed-change' }>;

export function apIncreaseIntervalSeconds(state: GameState): number {
  return resolveLiveApIncreaseIntervalSeconds(
    state.track.stage.apIncreaseIntervalSeconds,
    state.apIncreaseSpeedEffects,
  );
}

export function apIncreaseIntervalMilliseconds(state: GameState): number {
  return resolveLiveApIncreaseIntervalMilliseconds(
    state.track.stage.apIncreaseIntervalSeconds,
    state.apIncreaseSpeedEffects,
  );
}

export function applyApSpeedChange(
  state: GameState,
  effect: ApSpeedChange,
  card: Card | undefined,
  multiplier: number,
  addValue: number,
): GameState {
  if (effect.displayTimeType === 2n && effect.displayTime === 0n)
    throw new Error('Display section count is 0. (displayTimeType: SECTION, displayTime: 0)');
  const displayTimeType = int32(effect.displayTimeType);
  const correction =
    effect.bonusMoodTarget === 0
      ? 0
      : calculateLiveSkillMoodCorrection(
          effect.bonusMoodTarget,
          moodValue(state),
          Math.fround(int64ToFloat32(effect.bonusMoodValue) / 10_000),
        );
  let calculation: 'add' | 'multiply';
  let value: number;
  let currentState = state;
  let rate = Math.fround(
    Math.fround(multiplier) *
      Math.fround(
        Math.fround(Math.fround(addValue * 100) + int32(10_000 - int32(effect.num))) -
          Math.fround(correction * 10_000),
      ),
  );
  if (rate > 0 && card) {
    if (effect.calculationType === 2) {
      const legacyBoosted = skillValue(currentState, rate, { kind: 'ap', amount: rate }, card);
      const boosted = applyAction52SkillBoostForCard(currentState, card, legacyBoosted);
      currentState = boosted.state;
      if (boosted.value !== Number.POSITIVE_INFINITY) rate = int32(boosted.value);
    } else {
      currentState = applyAction52SkillBoostForCard(currentState, card, rate).state;
    }
  }
  if (effect.calculationType === 2) {
    value = Math.fround(Math.fround(10_000 - rate) / 10_000);
    calculation = 'multiply';
  } else {
    value = Math.fround(
      Math.fround(Math.fround(correction + int64ToFloat32(effect.num)) + Math.fround(addValue)) *
        Math.fround(multiplier),
    );
    calculation = 'add';
  }
  if ((calculation === 'multiply' && value === 1) || (calculation === 'add' && value === 0))
    return currentState;
  const observation = observeLiveApIncreaseSpeedEffect(
    calculation === 'multiply'
      ? { kind: 'multiply', factor: value }
      : { kind: 'add', milliseconds: value },
    apIncreaseIntervalMilliseconds(state),
  );
  const absorption =
    observation.absorptionAmount === null
      ? null
      : absorbSkillEffect(currentState, 21, BigInt(observation.absorptionAmount));
  if (absorption?.absorbed) return absorption.state;
  const suppressDuration = effect.invocationType === 0x388 || effect.invocationType === 0x38b;
  const entry: GameState['apIncreaseSpeedEffects'][number] = {
    effectId: effect.skillEffectId === undefined ? null : String(effect.skillEffectId),
    calculation:
      calculation === 'multiply'
        ? { kind: 'multiply', factor: value }
        : { kind: 'add', milliseconds: value },
    duration: suppressDuration
      ? { kind: 'full-end' }
      : createLiveSkillEffectDuration(displayTimeType, effect.displayTime, 'AP increase speed'),
    deactivationKey: effect.deactivationKey ?? null,
  };
  return updateApIncreaseSpeedEffects(currentState, [
    ...currentState.apIncreaseSpeedEffects,
    entry,
  ]);
}

export function applyApSpeedPercent(
  state: GameState,
  percent: number,
  duration: 'stage' | 'section',
): GameState {
  const entry: GameState['apIncreaseSpeedEffects'][number] = {
    effectId: null,
    calculation: { kind: 'multiply', factor: Math.fround(1 - Math.fround(percent / 100)) },
    duration:
      duration === 'section' ? { kind: 'sections', remainingChanges: 1n } : { kind: 'full-end' },
    deactivationKey: null,
  };
  return updateApIncreaseSpeedEffects(state, [...state.apIncreaseSpeedEffects, entry]);
}

export function advanceApSpeedEffects(state: GameState, elapsedSeconds: number): GameState {
  return updateApIncreaseSpeedEffects(
    state,
    advanceLiveApIncreaseSpeedState(state.apIncreaseSpeedEffects, {
      deltaTimeSeconds: elapsedSeconds,
      sectionChangeCount: 0,
      musicEnded: false,
    }),
  );
}

export function expireApSpeedSections(state: GameState): GameState {
  return updateApIncreaseSpeedEffects(
    state,
    advanceLiveApIncreaseSpeedState(state.apIncreaseSpeedEffects, {
      deltaTimeSeconds: 0,
      sectionChangeCount: 1,
      musicEnded: false,
    }),
  );
}

function int32(value: bigint | number): number {
  if (typeof value === 'number' && !Number.isFinite(value)) return -2_147_483_648;
  const integer = typeof value === 'bigint' ? value : BigInt(Math.trunc(value));
  return Number(BigInt.asIntN(32, integer));
}

export function deactivateApSpeedEffects(state: GameState, deactivationKey: string): GameState {
  return updateApIncreaseSpeedEffects(
    state,
    state.apIncreaseSpeedEffects.filter((effect) => effect.deactivationKey !== deactivationKey),
  );
}

function updateApIncreaseSpeedEffects(
  state: GameState,
  apIncreaseSpeedEffects: GameState['apIncreaseSpeedEffects'],
): GameState {
  if (apIncreaseSpeedEffects === state.apIncreaseSpeedEffects) return state;
  const before = apIncreaseIntervalSeconds(state);
  const candidate = { ...state, apIncreaseSpeedEffects };
  const after = apIncreaseIntervalSeconds(candidate);
  return {
    ...candidate,
    ap: {
      ...candidate.ap,
      timerSeconds: rescaleLiveGaugeTimer(state.ap.timerSeconds, before, after),
    },
  };
}
