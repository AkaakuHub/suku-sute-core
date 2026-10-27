export type LiveMentalGaugeState = Readonly<{
  currentMental: number;
  timerSeconds: number;
  mentalDown: boolean;
}>;

export type LiveMentalGaugePorts = Readonly<{
  setMental: (requestedMental: number) => number;
  subMentalOne: (currentMental: number) => number;
}>;

export type LiveMentalGaugeFrame = Readonly<{
  state: LiveMentalGaugeState;
  gaugeDisplayValue: number | null;
}>;

export function calculateLiveInitialMental(cards: readonly Readonly<{ mental: number }>[]): number {
  if (cards.length === 0) {
    throw new Error('Live Mental cards are absent');
  }
  let totalMental = 0;
  for (const card of cards) {
    if (!Number.isSafeInteger(card.mental) || card.mental < 0) {
      throw new Error('Live card Mental is invalid');
    }
    totalMental += card.mental;
  }
  if (!Number.isSafeInteger(totalMental)) {
    throw new Error('Live total Mental is invalid');
  }
  return Math.trunc(totalMental / cards.length);
}

export function advanceLiveMentalGauge(
  state: LiveMentalGaugeState,
  input: Readonly<{
    deltaTimeSeconds: number;
    decreaseIntervalSeconds: number;
    recoveryMentalDownTimeSeconds: number;
    recoveryValueFromMentalDown: number;
    mentalInfinity: boolean;
    disableMentalDown: boolean;
  }>,
  ports: LiveMentalGaugePorts,
): LiveMentalGaugeFrame {
  validateState(state);
  validateInput(input);

  let currentMental = Math.fround(state.currentMental);
  let mentalDown = state.mentalDown;
  let timerSeconds = Math.fround(
    Math.fround(state.timerSeconds) + Math.fround(input.deltaTimeSeconds),
  );

  if (!mentalDown) {
    const decreaseIntervalSeconds = Math.fround(input.decreaseIntervalSeconds);
    if (decreaseIntervalSeconds <= 0) {
      currentMental = applyMentalResult(ports.setMental(0));
    } else {
      while (decreaseIntervalSeconds < timerSeconds) {
        timerSeconds = Math.fround(timerSeconds - decreaseIntervalSeconds);
        currentMental = applyMentalResult(ports.subMentalOne(currentMental));
      }
    }
    if (currentMental <= 0 && !input.disableMentalDown) {
      mentalDown = true;
    }
  } else {
    const recoveredMental = Math.fround(
      currentMental +
        Math.fround(
          (Math.fround(input.recoveryValueFromMentalDown) * Math.fround(input.deltaTimeSeconds)) /
            Math.fround(input.recoveryMentalDownTimeSeconds),
        ),
    );
    currentMental = applyMentalResult(ports.setMental(recoveredMental));
    if (Math.fround(input.recoveryValueFromMentalDown) <= currentMental) {
      mentalDown = false;
    }
  }

  const nextState = { currentMental, timerSeconds, mentalDown };
  return {
    state: nextState,
    gaugeDisplayValue: input.mentalInfinity ? null : currentMental,
  };
}

function applyMentalResult(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error('Live Mental operation result is invalid');
  }
  return Math.fround(value);
}

function validateState(state: LiveMentalGaugeState): void {
  if (!Number.isFinite(state.currentMental) || state.currentMental < 0) {
    throw new Error('Live Mental value is invalid');
  }
  if (!Number.isFinite(state.timerSeconds) || state.timerSeconds < 0) {
    throw new Error('Live Mental timer is invalid');
  }
}

function validateInput(
  input: Readonly<{
    deltaTimeSeconds: number;
    decreaseIntervalSeconds: number;
    recoveryMentalDownTimeSeconds: number;
    recoveryValueFromMentalDown: number;
  }>,
): void {
  if (!Number.isFinite(input.deltaTimeSeconds) || input.deltaTimeSeconds < 0) {
    throw new Error('Live Mental delta time is invalid');
  }
  if (!Number.isFinite(input.decreaseIntervalSeconds)) {
    throw new Error('Live Mental decrease interval is invalid');
  }
  if (
    !Number.isFinite(input.recoveryMentalDownTimeSeconds) ||
    input.recoveryMentalDownTimeSeconds <= 0
  ) {
    throw new Error('Live Mental recovery time is invalid');
  }
  if (
    !Number.isFinite(input.recoveryValueFromMentalDown) ||
    input.recoveryValueFromMentalDown < 0
  ) {
    throw new Error('Live Mental recovery value is invalid');
  }
}
