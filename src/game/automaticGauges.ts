import { calculateLiveMentalDownRecovery } from '../runtime/live/gaugeTiming.ts';
import type { GameState } from './model.ts';
import { advanceLiveMentalGauge } from '../runtime/live/mentalGauge.ts';
import { advanceLiveApGauge } from '../runtime/live/apGauge.ts';
import { changeResource, decreaseMentalNaturally } from './resources.ts';
import { mentalDecreaseInterval } from './live/mentalBarriers.ts';
import { durationSeconds } from './projection.ts';
import { apIncreaseIntervalSeconds } from './effects/apSpeed.ts';
import { induceMentalHearts } from './effects/mentalHeartInduce.ts';
import { registerMentalDownMission } from './ingameMissions.ts';
import type { EffectApplier } from './effects/induceSkillEffect.ts';

export function advanceAutomaticGauges(
  state: GameState,
  dt: number,
  applyEffect?: EffectApplier,
): GameState {
  const stage = state.track.stage;
  const ap = advanceLiveApGauge(
    {
      currentAp: Math.floor(state.currentAp),
      maxAp: state.maxAp,
      timerSeconds: state.apTimerSeconds,
    },
    {
      deltaTimeSeconds: dt,
      mentalDown: state.mentalDown,
      increaseIntervalSeconds: apIncreaseIntervalSeconds(state),
    },
  ).state;
  let next = changeResource(state, 'ap', BigInt(ap.currentAp - Math.floor(state.currentAp)));
  next = {
    ...next,
    apTimerSeconds: ap.timerSeconds,
    voltageTimerSeconds:
      state.voltageStops.length > 0
        ? state.voltageTimerSeconds
        : Math.fround(Math.fround(state.voltageTimerSeconds) + Math.fround(dt)),
  };
  while (
    next.voltageStops.length === 0 &&
    stage.voltageIncreaseIntervalSeconds < next.voltageTimerSeconds
  ) {
    next = changeResource(
      {
        ...next,
        voltageTimerSeconds: Math.fround(
          next.voltageTimerSeconds - stage.voltageIncreaseIntervalSeconds,
        ),
      },
      'voltage',
      1n,
      'natural',
      undefined,
      applyEffect,
    );
  }
  const recovery = calculateLiveMentalDownRecovery(next.maximumMental, durationSeconds(next));
  const mental = advanceLiveMentalGauge(
    {
      currentMental: next.currentMental,
      timerSeconds: next.mentalTimerSeconds,
      mentalDown: next.mentalDown,
    },
    {
      deltaTimeSeconds: dt,
      decreaseIntervalSeconds: mentalDecreaseInterval(next, stage.mentalDecreaseIntervalSeconds),
      recoveryMentalDownTimeSeconds: recovery.recoveryTimeSeconds,
      recoveryValueFromMentalDown: recovery.recoveryMental,
      mentalInfinity: next.gaugeInfinities.some(
        (infinity) => infinity.gauge === 'mental' && !infinity.suspended,
      ),
      disableMentalDown:
        next.mentalProtected ||
        next.sectionMentalProtected ||
        next.disableMentalDownEffects.length > 0,
      genesisSkillActive: next.genesis.effects.length > 0,
    },
    {
      setMental: (requestedMental) => {
        const currentMental = Math.min(next.maximumMental, Math.max(0, requestedMental));
        if (currentMental !== next.currentMental)
          next = induceMentalHearts({ ...next, currentMental }, Math.trunc(currentMental));
        return currentMental;
      },
      subMentalOne: (currentMental) => {
        next = decreaseMentalNaturally({ ...next, currentMental });
        return next.currentMental;
      },
    },
  );
  const result: GameState = {
    ...next,
    currentMental: mental.state.currentMental,
    mentalTimerSeconds: mental.state.timerSeconds,
    mentalDown: mental.state.mentalDown,
  };
  return !state.mentalDown && result.mentalDown ? registerMentalDownMission(result) : result;
}
