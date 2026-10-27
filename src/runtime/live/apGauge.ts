export type LiveApGaugeState = Readonly<{
  currentAp: number;
  maxAp: number;
  timerSeconds: number;
}>;

export type LiveApGaugeFrame = Readonly<{
  state: LiveApGaugeState;
  gaugeDisplayValue: number | null;
}>;

export function advanceLiveApGauge(
  state: LiveApGaugeState,
  input: Readonly<{
    deltaTimeSeconds: number;
    mentalDown: boolean;
    increaseIntervalSeconds: number;
    boundaryToleranceSeconds: number | null;
  }>,
): LiveApGaugeFrame {
  validateState(state);
  validateFiniteNonNegative(input.deltaTimeSeconds, 'delta time');
  if (!Number.isFinite(input.increaseIntervalSeconds)) {
    throw new Error('Live AP increase interval is invalid');
  }
  if (
    input.boundaryToleranceSeconds !== null &&
    (!Number.isFinite(input.boundaryToleranceSeconds) || input.boundaryToleranceSeconds < 0)
  ) {
    throw new Error('Live AP boundary tolerance is invalid');
  }
  if (state.currentAp >= state.maxAp || input.mentalDown) {
    return { state, gaugeDisplayValue: null };
  }

  let currentAp = state.currentAp;
  let timerSeconds = Math.fround(
    Math.fround(state.timerSeconds) + Math.fround(input.deltaTimeSeconds),
  );
  const increaseIntervalSeconds = Math.fround(input.increaseIntervalSeconds);
  if (increaseIntervalSeconds <= 0) {
    currentAp = state.maxAp;
  } else {
    while (
      input.boundaryToleranceSeconds === null
        ? increaseIntervalSeconds < timerSeconds
        : increaseIntervalSeconds <= timerSeconds + input.boundaryToleranceSeconds
    ) {
      timerSeconds = Math.max(0, Math.fround(timerSeconds - increaseIntervalSeconds));
      currentAp = Math.min(currentAp + 1, state.maxAp);
    }
  }

  const nextState = { currentAp, maxAp: state.maxAp, timerSeconds };
  return { state: nextState, gaugeDisplayValue: currentAp };
}

export function applyLiveRecoverApSkillEffect(
  state: LiveApGaugeState,
  effect: Readonly<{
    id: string;
    actionType: number;
    details: readonly LiveSkillEffectDetail[];
  }>,
  currentMoodValue: number,
): LiveApGaugeState {
  validateState(state);
  if (!/^[1-9]\d*$/.test(effect.id) || effect.actionType !== 14) {
    throw new Error('Live AP recovery skill effect contract differs');
  }
  const details = requireLiveSkillEffectDetails(
    effect.details,
    ['RECOVER_AP_NUM_BASE', 'RECOVER_AP_NUM_BONUS_MOOD'],
    'AP recovery',
  );
  const bonusMood = details.get('RECOVER_AP_NUM_BONUS_MOOD');
  if (bonusMood === undefined) {
    throw new Error('Live AP recovery bonus mood detail is absent');
  }
  const addValue = Math.trunc(
    calculateLiveSkillEffectValue(
      requireLiveSkillEffectDetailValue(details, 'RECOVER_AP_NUM_BASE', 'AP recovery'),
      bonusMood,
      currentMoodValue,
    ),
  );
  return {
    ...state,
    currentAp: Math.min(Math.max(state.currentAp + addValue, 0), state.maxAp),
  };
}

function validateState(state: LiveApGaugeState): void {
  if (
    !Number.isSafeInteger(state.currentAp) ||
    state.currentAp < 0 ||
    !Number.isSafeInteger(state.maxAp) ||
    state.maxAp < 0 ||
    state.currentAp > state.maxAp
  ) {
    throw new Error('Live AP gauge value is invalid');
  }
  validateFiniteNonNegative(state.timerSeconds, 'timer');
}

function validateFiniteNonNegative(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`Live AP ${label} is invalid`);
  }
}

import {
  calculateLiveSkillEffectValue,
  type LiveSkillEffectDetail,
  requireLiveSkillEffectDetails,
  requireLiveSkillEffectDetailValue,
} from '../skills/skillEffectValue.ts';
