export type LiveApGaugeState = Readonly<{
  currentAp: number;
  maxAp: number;
  timerSeconds: number;
}>;

export type LiveApGaugeFrame = Readonly<{
  state: LiveApGaugeState;
  gaugeDisplayValue: number | null;
}>;

export type LiveApGaugePorts = Readonly<{
  setAp: (requestedAp: number) => number;
  addAp: (currentAp: number, amount: 1) => number;
}>;

export function advanceLiveApGauge(
  state: LiveApGaugeState,
  input: Readonly<{
    deltaTimeSeconds: number;
    mentalDown: boolean;
    increaseIntervalSeconds: number;
  }>,
  ports: LiveApGaugePorts,
): LiveApGaugeFrame {
  validateState(state);
  validateFiniteNonNegative(input.deltaTimeSeconds, 'delta time');
  if (!Number.isFinite(input.increaseIntervalSeconds)) {
    throw new Error('Live AP increase interval is invalid');
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
    currentAp = ports.setAp(state.maxAp);
  } else {
    while (increaseIntervalSeconds < timerSeconds) {
      timerSeconds = Math.fround(timerSeconds - increaseIntervalSeconds);
      currentAp = ports.addAp(currentAp, 1);
    }
  }

  const nextState = { currentAp, maxAp: state.maxAp, timerSeconds };
  return { state: nextState, gaugeDisplayValue: currentAp };
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
