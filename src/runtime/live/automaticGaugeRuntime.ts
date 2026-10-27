import { advanceLiveApGauge, type LiveApGaugeFrame, type LiveApGaugeState } from './apGauge.ts';
import {
  advanceLiveMentalGauge,
  type LiveMentalGaugeFrame,
  type LiveMentalGaugeState,
} from './mentalGauge.ts';
import {
  advanceLiveVoltageGauge,
  type LiveVoltageGaugeFrame,
  type LiveVoltageGaugeState,
} from './voltageGauge.ts';

export type LiveVoltageThreshold = Readonly<{
  voltageLevel: number;
  requiredVoltagePoint: bigint;
}>;

export type LiveAutomaticGaugeRuntimeInput = Readonly<{
  maximumAp: number;
  apIncreaseIntervalSeconds: number;
  maximumMental: number;
  mentalDecreaseIntervalSeconds: number;
  mentalRecoveryTimeSeconds: number;
  mentalRecoveryValue: number;
  voltageIncreaseIntervalSeconds: number;
  voltageThresholds: readonly LiveVoltageThreshold[];
}>;

export type LiveAutomaticGaugeRuntimeState = Readonly<{
  ap: LiveApGaugeState;
  apInfinity: boolean;
  mental: LiveMentalGaugeState;
  voltage: LiveVoltageGaugeState;
}>;

export type LiveAutomaticGaugeRuntimeFrame = Readonly<{
  state: LiveAutomaticGaugeRuntimeState;
  ap: LiveApGaugeFrame;
  mental: LiveMentalGaugeFrame;
  voltage: LiveVoltageGaugeFrame;
}>;

export function createLiveAutomaticGaugeRuntimeState(
  input: LiveAutomaticGaugeRuntimeInput,
): LiveAutomaticGaugeRuntimeState {
  validateInput(input);
  return {
    ap: { currentAp: 0, maxAp: input.maximumAp, timerSeconds: 0 },
    apInfinity: false,
    mental: {
      currentMental: input.maximumMental,
      timerSeconds: 0,
      mentalDown: false,
    },
    voltage: { currentVoltage: 0n, timerSeconds: 0 },
  };
}

export function advanceLiveAutomaticGaugeRuntime(
  state: LiveAutomaticGaugeRuntimeState,
  deltaTimeSeconds: number,
  input: LiveAutomaticGaugeRuntimeInput,
  control: Readonly<{
    genesisSkillActive: boolean;
    stopVoltageIncreaseRequestCount: number;
    disableMentalDown: boolean;
    mentalDecreaseIntervalFactor: number;
    subMentalOne: (currentMental: number) => number;
    addVoltage: (currentVoltage: bigint) => bigint;
  }>,
): LiveAutomaticGaugeRuntimeFrame {
  validateInput(input);
  if (
    !Number.isFinite(control.mentalDecreaseIntervalFactor) ||
    control.mentalDecreaseIntervalFactor <= 0
  ) {
    throw new Error('Live Mental decrease interval factor is invalid');
  }
  const ap = state.apInfinity
    ? { state: state.ap, gaugeDisplayValue: null }
    : advanceLiveApGauge(state.ap, {
        deltaTimeSeconds,
        mentalDown: state.mental.mentalDown,
        increaseIntervalSeconds: input.apIncreaseIntervalSeconds,
        boundaryToleranceSeconds: null,
      });
  const maximumVoltageThreshold = input.voltageThresholds[input.voltageThresholds.length - 1];
  if (maximumVoltageThreshold === undefined) {
    throw new Error('Live Voltage thresholds are absent');
  }
  const voltage = advanceLiveVoltageGauge(
    state.voltage,
    {
      deltaTimeSeconds,
      stopIncreaseRequestCount: control.stopVoltageIncreaseRequestCount,
      increaseIntervalSeconds: input.voltageIncreaseIntervalSeconds,
      maxBaseVoltageLevel: maximumVoltageThreshold.voltageLevel,
      voltageInfinity: false,
    },
    {
      getVoltageThreshold: (voltageLevel) =>
        requireVoltageThreshold(input.voltageThresholds, voltageLevel),
      addVoltage: control.addVoltage,
    },
  );
  const mental = control.genesisSkillActive
    ? {
        state: state.mental,
        gaugeDisplayValue: state.mental.currentMental,
      }
    : advanceLiveMentalGauge(
        state.mental,
        {
          deltaTimeSeconds,
          decreaseIntervalSeconds: Math.fround(
            input.mentalDecreaseIntervalSeconds * control.mentalDecreaseIntervalFactor,
          ),
          recoveryMentalDownTimeSeconds: input.mentalRecoveryTimeSeconds,
          recoveryValueFromMentalDown: input.mentalRecoveryValue,
          mentalInfinity: false,
          disableMentalDown: control.disableMentalDown,
        },
        {
          setMental: (requestedMental) =>
            Math.min(Math.max(requestedMental, 0), input.maximumMental),
          subMentalOne: control.subMentalOne,
        },
      );
  return {
    state: {
      ap: ap.state,
      apInfinity: state.apInfinity,
      mental: mental.state,
      voltage: voltage.state,
    },
    ap,
    mental,
    voltage,
  };
}

export function projectLiveVoltageLevel(
  thresholds: readonly LiveVoltageThreshold[],
  currentVoltage: bigint,
): Readonly<{
  currentLevel: number;
  currentLevelVoltage: bigint;
  nextLevelVoltage: bigint;
  maximumBaseLevel: number;
}> {
  validateThresholds(thresholds);
  if (currentVoltage < 0n) {
    throw new Error('Live current Voltage is invalid');
  }
  const resolvedIndex = thresholds.findLastIndex(
    (threshold) => threshold.requiredVoltagePoint <= currentVoltage,
  );
  const currentIndex = Math.max(0, resolvedIndex);
  const current = thresholds[currentIndex];
  const maximum = thresholds[thresholds.length - 1];
  if (current === undefined || maximum === undefined) {
    throw new Error('Live current Voltage level is absent');
  }
  const next = thresholds[currentIndex + 1] ?? current;
  return {
    currentLevel: current.voltageLevel,
    currentLevelVoltage: current.requiredVoltagePoint,
    nextLevelVoltage: next.requiredVoltagePoint,
    maximumBaseLevel: maximum.voltageLevel,
  };
}

function requireVoltageThreshold(
  thresholds: readonly LiveVoltageThreshold[],
  voltageLevel: number,
): bigint {
  const threshold = thresholds.find((candidate) => candidate.voltageLevel === voltageLevel);
  if (threshold === undefined) {
    throw new Error(`Live Voltage threshold is absent: ${String(voltageLevel)}`);
  }
  return threshold.requiredVoltagePoint;
}

function validateInput(input: LiveAutomaticGaugeRuntimeInput): void {
  if (!Number.isSafeInteger(input.maximumAp) || input.maximumAp < 0) {
    throw new Error('Live maximum AP is invalid');
  }
  if (!Number.isSafeInteger(input.maximumMental) || input.maximumMental < 0) {
    throw new Error('Live maximum Mental is invalid');
  }
  if (!Number.isSafeInteger(input.mentalRecoveryValue) || input.mentalRecoveryValue < 0) {
    throw new Error('Live Mental recovery value is invalid');
  }
  for (const [label, value] of [
    ['AP interval', input.apIncreaseIntervalSeconds],
    ['Mental interval', input.mentalDecreaseIntervalSeconds],
    ['Mental recovery time', input.mentalRecoveryTimeSeconds],
    ['Voltage interval', input.voltageIncreaseIntervalSeconds],
  ] as const) {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`Live ${label} is invalid`);
    }
  }
  if (input.mentalRecoveryTimeSeconds === 0) {
    throw new Error('Live Mental recovery time is zero');
  }
  validateThresholds(input.voltageThresholds);
}

function validateThresholds(thresholds: readonly LiveVoltageThreshold[]): void {
  if (thresholds.length === 0) {
    throw new Error('Live Voltage thresholds are absent');
  }
  for (let index = 0; index < thresholds.length; index += 1) {
    const threshold = thresholds[index];
    const previous = thresholds[index - 1];
    if (
      threshold === undefined ||
      !Number.isSafeInteger(threshold.voltageLevel) ||
      threshold.requiredVoltagePoint < 0n ||
      (previous !== undefined &&
        (threshold.voltageLevel <= previous.voltageLevel ||
          threshold.requiredVoltagePoint <= previous.requiredVoltagePoint))
    ) {
      throw new Error('Live Voltage thresholds are invalid');
    }
  }
}
