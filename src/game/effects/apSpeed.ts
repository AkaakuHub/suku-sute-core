import type { Card, Effect, GameState } from '../model.ts';
import { calculateLiveSkillMoodCorrection } from '../../runtime/live/skillMood.ts';
import { moodValue } from '../projection.ts';
import { skillValue } from './skillValue.ts';
import { applyAction52SkillBoostForCard } from './action52SkillBoost.ts';
import { isProxyTargetReached } from './proxySkill.ts';
import { int64ToFloat32 } from '../../runtime/numeric.ts';

type ApSpeedChange = Extract<Effect, { kind: 'ap-speed-change' }>;

export function apIncreaseIntervalSeconds(state: GameState): number {
  const originalBase = Math.fround(state.track.stage.apIncreaseIntervalSeconds);
  const value = apIncreaseIntervalValue(state);
  const bounded = Math.fround(Math.max(originalBase * 0.1, value));
  return Math.fround(Math.ceil(Math.fround(bounded * 10)) / 10);
}

export function apIncreaseIntervalValue(state: GameState): number {
  let value = Math.fround(state.track.stage.apIncreaseIntervalSeconds);
  const additions = state.apTimeEffects.filter((effect) => effect.calculation === 'add');
  for (const effect of additions) value = Math.fround(value + Math.fround(effect.value));
  const multipliers = state.apTimeEffects.filter((effect) => effect.calculation === 'multiply');
  if (multipliers.length > 0) {
    const sum = multipliers.reduce(
      (total, effect) => Math.fround(total + Math.fround(effect.value - 1)),
      0,
    );
    value = Math.fround(value * Math.fround(Math.max(-1, sum) + 1));
  }
  const minimum = Math.fround(Math.fround(state.track.stage.apIncreaseIntervalSeconds) * 0.1);
  return Math.fround(Math.max(minimum, value));
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
  let absorbedAmount: number;
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
    absorbedAmount = Math.trunc((1 - value) * 100);
    calculation = 'multiply';
  } else {
    value = Math.fround(
      Math.fround(Math.fround(correction + int64ToFloat32(effect.num)) + Math.fround(addValue)) *
        Math.fround(multiplier),
    );
    const currentInterval = apIncreaseIntervalSeconds(state);
    absorbedAmount = Math.trunc((-value / currentInterval) * 100);
    calculation = 'add';
  }
  if ((calculation === 'multiply' && value === 1) || (calculation === 'add' && value === 0))
    return currentState;
  const absorption = absorbedAmount > 0 ? absorbApSpeed(currentState, absorbedAmount) : null;
  if (absorption?.absorbed) return { ...currentState, proxyAbsorptions: absorption.absorptions };
  const suppressDuration = effect.invocationType === 0x388 || effect.invocationType === 0x38b;
  const entry: GameState['apTimeEffects'][number] = {
    calculation,
    value,
    remainingSeconds:
      suppressDuration || displayTimeType !== 1
        ? null
        : Math.fround(int64ToFloat32(effect.displayTime) / 1000),
    remainingSections: suppressDuration || displayTimeType !== 2 ? null : effect.displayTime,
    deactivationKey: effect.deactivationKey ?? null,
  };
  return updateApTimeEffects(
    currentState,
    [...currentState.apTimeEffects, entry],
    absorption?.absorptions,
  );
}

export function applyApSpeedPercent(
  state: GameState,
  percent: number,
  duration: 'stage' | 'section',
): GameState {
  const entry: GameState['apTimeEffects'][number] = {
    calculation: 'multiply',
    value: Math.fround(1 - Math.fround(percent / 100)),
    remainingSeconds: null,
    remainingSections: duration === 'section' ? 1n : null,
    deactivationKey: null,
  };
  return updateApTimeEffects(state, [...state.apTimeEffects, entry]);
}

export function advanceApSpeedEffects(state: GameState, elapsedSeconds: number): GameState {
  const effects = state.apTimeEffects.flatMap((effect) => {
    if (effect.remainingSeconds === null) return [effect];
    const remainingSeconds = Math.fround(effect.remainingSeconds - Math.fround(elapsedSeconds));
    return remainingSeconds > 0 ? [{ ...effect, remainingSeconds }] : [];
  });
  return updateApTimeEffects(state, effects);
}

export function expireApSpeedSections(state: GameState): GameState {
  const effects = state.apTimeEffects.flatMap((effect) => {
    if (effect.remainingSections === null) return [effect];
    const remainingSections = effect.remainingSections - 1n;
    return remainingSections > 0n ? [{ ...effect, remainingSections }] : [];
  });
  return updateApTimeEffects(state, effects);
}

function int32(value: bigint | number): number {
  if (typeof value === 'number' && !Number.isFinite(value)) return -2_147_483_648;
  const integer = typeof value === 'bigint' ? value : BigInt(Math.trunc(value));
  return Number(BigInt.asIntN(32, integer));
}

export function deactivateApSpeedEffects(state: GameState, deactivationKey: string): GameState {
  return updateApTimeEffects(
    state,
    state.apTimeEffects.filter((effect) => effect.deactivationKey !== deactivationKey),
  );
}

function updateApTimeEffects(
  state: GameState,
  apTimeEffects: GameState['apTimeEffects'],
  proxyAbsorptions: GameState['proxyAbsorptions'] = state.proxyAbsorptions,
): GameState {
  if (apTimeEffects === state.apTimeEffects && proxyAbsorptions === state.proxyAbsorptions)
    return state;
  const before = apIncreaseIntervalSeconds(state);
  const candidate = { ...state, apTimeEffects, proxyAbsorptions };
  const after = apIncreaseIntervalSeconds(candidate);
  return {
    ...candidate,
    ap: {
      ...candidate.ap,
      timerSeconds:
        before > 0 && after > 0
          ? Math.fround(Math.fround(after / before) * state.ap.timerSeconds)
          : state.ap.timerSeconds,
    },
  };
}

function absorbApSpeed(
  state: GameState,
  amount: number,
): Readonly<{ absorptions: GameState['proxyAbsorptions']; absorbed: boolean }> | null {
  for (
    let absorptionIndex = 0;
    absorptionIndex < state.proxyAbsorptions.length;
    absorptionIndex++
  ) {
    const absorption = state.proxyAbsorptions[absorptionIndex];
    if (!absorption) continue;
    for (let effectIndex = 0; effectIndex < absorption.effects.length; effectIndex++) {
      const target = absorption.effects[effectIndex];
      if (!target || target.actionType !== 21) continue;
      if (absorption.hasAbsorbLimit && isProxyTargetReached(target))
        return { absorptions: state.proxyAbsorptions, absorbed: true };
      const effects = absorption.effects.map((item, index) =>
        index === effectIndex ? { ...item, totalAmount: item.totalAmount + BigInt(amount) } : item,
      );
      const absorptions = state.proxyAbsorptions.map((item, index) =>
        index === absorptionIndex ? { ...item, effects } : item,
      );
      return { absorptions, absorbed: true };
    }
  }
  return null;
}
