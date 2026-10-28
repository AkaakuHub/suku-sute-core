import {
  getLiveVoltageThreshold,
  validateLiveVoltageThresholds,
  type LiveVoltageThreshold,
} from './voltageThresholds.ts';
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

export type LiveAutomaticGaugeRuntimeInput = Readonly<{
  maximumAp: number;
  apIncreaseIntervalSeconds: number;
  maximumMental: number;
  mentalDecreaseIntervalSeconds: number;
  mentalRecoveryTimeSeconds: number;
  mentalRecoveryValue: number;
  voltageIncreaseIntervalSeconds: number;
  voltageThresholds: readonly LiveVoltageThreshold[];
  maximumVoltageLevel: number;
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
    setAp: (requestedAp: number) => number;
    addAp: (currentAp: number, amount: 1) => number;
    subMentalOne: (currentMental: number) => number;
    setVoltage: (requestedVoltage: bigint) => bigint;
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
  const ap =
    state.apInfinity && !control.genesisSkillActive
      ? { state: state.ap, gaugeDisplayValue: null }
      : advanceLiveApGauge(
          state.ap,
          {
            deltaTimeSeconds,
            mentalDown: state.mental.mentalDown,
            increaseIntervalSeconds: input.apIncreaseIntervalSeconds,
          },
          { setAp: control.setAp, addAp: control.addAp },
        );
  const voltage = advanceLiveVoltageGauge(
    state.voltage,
    {
      deltaTimeSeconds,
      stopIncreaseRequestCount: control.stopVoltageIncreaseRequestCount,
      increaseIntervalSeconds: input.voltageIncreaseIntervalSeconds,
      maxBaseVoltageLevel: input.maximumVoltageLevel,
      voltageInfinity: false,
    },
    {
      getVoltageThreshold: (voltageLevel) =>
        getLiveVoltageThreshold(input.voltageThresholds, voltageLevel),
      setVoltage: control.setVoltage,
      addVoltage: control.addVoltage,
    },
  );
  const mental = advanceLiveMentalGauge(
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
      genesisSkillActive: control.genesisSkillActive,
    },
    {
      setMental: (requestedMental) => Math.min(Math.max(requestedMental, 0), input.maximumMental),
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
  validateLiveVoltageThresholds(input.voltageThresholds);
  if (
    !Number.isSafeInteger(input.maximumVoltageLevel) ||
    input.maximumVoltageLevel < 1 ||
    input.maximumVoltageLevel > input.voltageThresholds.length
  )
    throw new Error('Live maximum Voltage level is invalid');
}
