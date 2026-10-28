import {
  activateLiveApIncreaseSpeed,
  resolveLiveApIncreaseIntervalSeconds,
  resolveLiveApIncreaseIntervalMilliseconds,
} from '../../runtime/skills/apIncreaseSpeed.ts';
import {
  changeLiveApIncreaseSpeedEffects,
  deactivateLiveApIncreaseSpeedEffects,
  advanceLiveApIncreaseSpeedState,
} from '../../runtime/skills/apIncreaseSpeedRuntime.ts';
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
  return {
    ...state,
    ...advanceLiveApIncreaseSpeedState(
      state,
      {
        deltaTimeSeconds: elapsedSeconds,
        sectionChangeCount: 0,
        musicEnded: false,
      },
      state.track.stage.apIncreaseIntervalSeconds,
    ),
  };
}

export function expireApSpeedSections(state: GameState): GameState {
  return {
    ...state,
    ...advanceLiveApIncreaseSpeedState(
      state,
      {
        deltaTimeSeconds: 0,
        sectionChangeCount: 1,
        musicEnded: false,
      },
      state.track.stage.apIncreaseIntervalSeconds,
    ),
  };
}

export function deactivateApSpeedEffects(state: GameState, deactivationKey: string): GameState {
  return {
    ...state,
    ...deactivateLiveApIncreaseSpeedEffects(
      state,
      { deactivationKey },
      state.track.stage.apIncreaseIntervalSeconds,
    ),
  };
}

function updateApIncreaseSpeedEffects(
  state: GameState,
  effects: GameState['apIncreaseSpeedEffects'],
): GameState {
  return {
    ...state,
    ...changeLiveApIncreaseSpeedEffects(
      state,
      effects,
      state.track.stage.apIncreaseIntervalSeconds,
    ),
  };
}
