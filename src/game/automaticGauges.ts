import { advanceLiveVoltageGauge } from '../runtime/live/voltageGauge.ts';
import { voltageThreshold } from './live/voltageLevel.ts';
import { setLiveApGaugeValue } from '../runtime/live/apGaugeChange.ts';
import { calculateLiveMentalDownRecovery } from '../runtime/live/gaugeTiming.ts';
import type { GameState } from './model.ts';
import { advanceLiveMentalGauge } from '../runtime/live/mentalGauge.ts';
import { advanceLiveApGauge } from '../runtime/live/apGauge.ts';
import { changeResource, decreaseMentalNaturally, setVoltageValue } from './resources.ts';
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
  let next = state;
  const ap = advanceLiveApGauge(
    state.ap,
    {
      deltaTimeSeconds: dt,
      mentalDown: state.mental.mentalDown,
      increaseIntervalSeconds: apIncreaseIntervalSeconds(state),
    },
    {
      setAp: (requestedAp) => {
        next = setLiveApGaugeValue(
          next,
          BigInt(requestedAp),
          next.gaugeInfinities.some((infinity) => infinity.gauge === 'ap' && !infinity.suspended),
        );
        return next.ap.currentAp;
      },
      addAp: (currentAp, amount) => {
        next = changeResource(
          { ...next, ap: { ...next.ap, currentAp } },
          'ap',
          BigInt(amount),
          'natural',
        );
        return next.ap.currentAp;
      },
    },
  ).state;
  next = { ...next, ap };
  const voltage = advanceLiveVoltageGauge(
    next.voltage,
    {
      deltaTimeSeconds: dt,
      stopIncreaseRequestCount: next.voltageStops.length,
      increaseIntervalSeconds: stage.voltageIncreaseIntervalSeconds,
      maxBaseVoltageLevel: next.maximumVoltageLevel,
      voltageInfinity: next.gaugeInfinities.some(
        (effect) => effect.gauge === 'voltage' && !effect.suspended,
      ),
    },
    {
      getVoltageThreshold: voltageThreshold,
      setVoltage: (value) => {
        next = setVoltageValue(next, value, applyEffect);
        return next.voltage.currentVoltage;
      },
      addVoltage: (currentVoltage, request) => {
        next = changeResource(
          { ...next, voltage: { ...next.voltage, currentVoltage } },
          'voltage',
          BigInt(request.addValue),
          'natural',
          undefined,
          applyEffect,
        );
        return next.voltage.currentVoltage;
      },
    },
  );
  next = { ...next, voltage: voltage.state };
  const recovery = calculateLiveMentalDownRecovery(next.maximumMental, durationSeconds(next));
  const mental = advanceLiveMentalGauge(
    next.mental,
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
        if (currentMental !== next.mental.currentMental)
          next = induceMentalHearts(
            { ...next, mental: { ...next.mental, currentMental } },
            Math.trunc(currentMental),
          );
        return currentMental;
      },
      subMentalOne: (currentMental) => {
        next = decreaseMentalNaturally({
          ...next,
          mental: { ...next.mental, currentMental },
        });
        return next.mental.currentMental;
      },
    },
  );
  const result: GameState = {
    ...next,
    mental: mental.state,
  };
  return !state.mental.mentalDown && result.mental.mentalDown
    ? registerMentalDownMission(result)
    : result;
}
