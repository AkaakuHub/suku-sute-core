import { advanceLiveApGauge, type LiveApGaugeFrame } from '../live/apGauge.ts';

export type LiveMusicRuntimeInputs = Readonly<{
  maxAp: number;
  apIncrement: number;
  musicBeatPoint: number;
}>;

export type LiveMusicRuntimeProjection = Readonly<{
  ap:
    | Readonly<{ kind: 'verified'; frame: LiveApGaugeFrame }>
    | Readonly<{
        kind: 'unresolved';
        reason: 'mental-state-unverified' | 'increase-interval-unverified';
      }>;
  musicBeatPoint: number;
}>;

export function projectLiveMusicRuntime(
  inputs: LiveMusicRuntimeInputs,
  currentTimeSeconds: number,
  runtimeState: Readonly<{
    mentalDown: Readonly<{ kind: 'verified'; value: boolean }> | Readonly<{ kind: 'unresolved' }>;
    increaseIntervalSeconds:
      | Readonly<{ kind: 'verified'; value: number }>
      | Readonly<{ kind: 'unresolved' }>;
  }>,
): LiveMusicRuntimeProjection {
  validateInputs(inputs, currentTimeSeconds);
  const ap = projectAp(inputs, currentTimeSeconds, runtimeState);
  return {
    ap,
    musicBeatPoint: inputs.musicBeatPoint,
  };
}

function projectAp(
  inputs: LiveMusicRuntimeInputs,
  currentTimeSeconds: number,
  runtimeState: Readonly<{
    mentalDown: Readonly<{ kind: 'verified'; value: boolean }> | Readonly<{ kind: 'unresolved' }>;
    increaseIntervalSeconds:
      | Readonly<{ kind: 'verified'; value: number }>
      | Readonly<{ kind: 'unresolved' }>;
  }>,
): LiveMusicRuntimeProjection['ap'] {
  if (currentTimeSeconds === 0) {
    return {
      kind: 'verified',
      frame: {
        state: { currentAp: 0, maxAp: inputs.maxAp, timerSeconds: 0 },
        gaugeDisplayValue: 0,
      },
    };
  }
  if (runtimeState.mentalDown.kind === 'unresolved') {
    return { kind: 'unresolved', reason: 'mental-state-unverified' };
  }
  if (runtimeState.increaseIntervalSeconds.kind === 'unresolved') {
    return { kind: 'unresolved', reason: 'increase-interval-unverified' };
  }
  return {
    kind: 'verified',
    frame: advanceLiveApGauge(
      { currentAp: 0, maxAp: inputs.maxAp, timerSeconds: 0 },
      {
        deltaTimeSeconds: currentTimeSeconds,
        mentalDown: runtimeState.mentalDown.value,
        increaseIntervalSeconds: runtimeState.increaseIntervalSeconds.value,
      },
      {
        setAp: (requestedAp) => Math.min(requestedAp, inputs.maxAp),
        addAp: (currentAp, amount) => Math.min(currentAp + amount, inputs.maxAp),
      },
    ),
  };
}

function validateInputs(inputs: LiveMusicRuntimeInputs, currentTimeSeconds: number): void {
  if (!Number.isSafeInteger(inputs.maxAp) || inputs.maxAp < 0) {
    throw new Error('Live music MaxAp is invalid');
  }
  if (!Number.isFinite(inputs.apIncrement) || inputs.apIncrement < 0) {
    throw new Error('Live music ApIncrement is invalid');
  }
  if (!Number.isFinite(inputs.musicBeatPoint)) {
    throw new Error('Live music BeatPointCoefficient is invalid');
  }
  if (!Number.isFinite(currentTimeSeconds) || currentTimeSeconds < 0) {
    throw new Error('Live runtime current time is invalid');
  }
}
