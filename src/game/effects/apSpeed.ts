import {
  activateLiveApIncreaseSpeed,
  deactivateLiveApIncreaseSpeedEffects,
  resolveLiveApIncreaseIntervalSeconds,
  resolveLiveApIncreaseIntervalMilliseconds,
  advanceLiveApIncreaseSpeedState,
} from '../../runtime/skills/apIncreaseSpeed.ts';
import { rescaleLiveGaugeTimer } from '../../runtime/live/gaugeTiming.ts';
import type { Card, Effect, GameState } from '../model.ts';
import { moodValue } from '../projection.ts';
import { skillValue } from './skillValue.ts';
import { applyAction52SkillBoostForCard } from './action52SkillBoost.ts';
import { absorbSkillEffect } from './proxySkill.ts';

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
  let currentState = state;
  const activated = activateLiveApIncreaseSpeed(state.apIncreaseSpeedEffects, effect, {
    effectId: effect.skillEffectId === undefined ? null : String(effect.skillEffectId),
    currentMoodValue: moodValue(state),
    currentIncreaseIntervalMilliseconds: apIncreaseIntervalMilliseconds(state),
    power: { addValue, multiplyFactor: multiplier, effectPower: 1 },
    applySkillBoost: (value) => {
      if (!card) return value;
      const amount =
        effect.calculationType === 2
          ? skillValue(currentState, value, { kind: 'ap', amount: value }, card)
          : value;
      const boosted = applyAction52SkillBoostForCard(currentState, card, amount);
      currentState = boosted.state;
      return boosted.value;
    },
    absorbSkillEffect: (amount) => {
      const absorbed = absorbSkillEffect(currentState, 21, BigInt(amount));
      currentState = absorbed.state;
      return absorbed;
    },
  });
  if (activated.absorption?.absorbed) return currentState;
  return updateApIncreaseSpeedEffects(currentState, activated.state);
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

export function deactivateApSpeedEffects(state: GameState, deactivationKey: string): GameState {
  return updateApIncreaseSpeedEffects(
    state,
    deactivateLiveApIncreaseSpeedEffects(state.apIncreaseSpeedEffects, { deactivationKey }),
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
