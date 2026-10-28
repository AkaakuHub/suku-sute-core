export type LiveVoltageGaugeState = Readonly<{
  currentVoltage: bigint;
  timerSeconds: number;
}>;

export type LiveNaturalVoltageRequest = Readonly<{
  addValue: 1;
  induceVoltageUp: false;
  absorbTarget: true;
  playEffect: false;
}>;

export type LiveVoltageGaugePorts = Readonly<{
  getVoltageThreshold: (voltageLevel: number) => bigint;
  setVoltage: (requestedVoltage: bigint) => bigint;
  addVoltage: (currentVoltage: bigint, request: LiveNaturalVoltageRequest) => bigint;
}>;

export type LiveVoltageGaugeFrame = Readonly<{
  state: LiveVoltageGaugeState;
  gaugeDisplayValue: bigint | null;
}>;

const naturalVoltageRequest: LiveNaturalVoltageRequest = {
  addValue: 1,
  induceVoltageUp: false,
  absorbTarget: true,
  playEffect: false,
};

export function advanceLiveVoltageGauge(
  state: LiveVoltageGaugeState,
  input: Readonly<{
    deltaTimeSeconds: number;
    stopIncreaseRequestCount: number;
    increaseIntervalSeconds: number;
    maxBaseVoltageLevel: number;
    voltageInfinity: boolean;
  }>,
  ports: LiveVoltageGaugePorts,
): LiveVoltageGaugeFrame {
  validateState(state);
  validateInput(input);
  if (input.stopIncreaseRequestCount >= 1) {
    return { state, gaugeDisplayValue: null };
  }

  let currentVoltage = state.currentVoltage;
  let timerSeconds = Math.fround(
    Math.fround(state.timerSeconds) + Math.fround(input.deltaTimeSeconds),
  );
  const increaseIntervalSeconds = Math.fround(input.increaseIntervalSeconds);
  if (increaseIntervalSeconds <= 0) {
    currentVoltage = ports.setVoltage(ports.getVoltageThreshold(input.maxBaseVoltageLevel));
  } else {
    while (increaseIntervalSeconds < timerSeconds) {
      timerSeconds = Math.fround(timerSeconds - increaseIntervalSeconds);
      currentVoltage = ports.addVoltage(currentVoltage, naturalVoltageRequest);
    }
  }

  const nextState = { currentVoltage, timerSeconds };
  return {
    state: nextState,
    gaugeDisplayValue: input.voltageInfinity ? null : currentVoltage,
  };
}

function validateState(state: LiveVoltageGaugeState): void {
  if (!Number.isFinite(state.timerSeconds) || state.timerSeconds < 0) {
    throw new Error('Live Voltage timer is invalid');
  }
}

function validateInput(
  input: Readonly<{
    deltaTimeSeconds: number;
    stopIncreaseRequestCount: number;
    increaseIntervalSeconds: number;
    maxBaseVoltageLevel: number;
  }>,
): void {
  if (!Number.isFinite(input.deltaTimeSeconds) || input.deltaTimeSeconds < 0) {
    throw new Error('Live Voltage delta time is invalid');
  }
  if (!Number.isFinite(input.increaseIntervalSeconds)) {
    throw new Error('Live Voltage increase interval is invalid');
  }
  if (!Number.isSafeInteger(input.stopIncreaseRequestCount)) {
    throw new Error('Live Voltage stop request count is invalid');
  }
  if (!Number.isSafeInteger(input.maxBaseVoltageLevel)) {
    throw new Error('Live Voltage max base level is invalid');
  }
}
