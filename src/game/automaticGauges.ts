import { calculateLiveMentalDownRecovery } from '../runtime/live/gaugeTiming.ts';
import type { GameState } from './model.ts';
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
  if (next.genesis.effects.length > 0 && (next.mentalProtected || next.sectionMentalProtected))
    return next;
  let mentalTimerSeconds = Math.fround(Math.fround(next.mentalTimerSeconds) + Math.fround(dt));
  const mentalDown =
    !(
      next.mentalProtected ||
      next.sectionMentalProtected ||
      next.disableMentalDownEffects.length > 0
    ) &&
    (next.mentalDown || next.currentMental <= 0);
  if (mentalDown) {
    const recovery = calculateLiveMentalDownRecovery(next.maximumMental, durationSeconds(next));
    const currentMental = Math.min(
      next.maximumMental,
      Math.fround(
        next.currentMental +
          Math.fround(
            Math.fround(recovery.recoveryMental * Math.fround(dt)) / recovery.recoveryTimeSeconds,
          ),
      ),
    );
    const recovered = {
      ...next,
      mentalTimerSeconds,
      currentMental,
      mentalDown: currentMental < recovery.recoveryMental,
    };
    const result =
      currentMental !== next.currentMental
        ? induceMentalHearts(recovered, Math.trunc(currentMental))
        : recovered;
    return !state.mentalDown ? registerMentalDownMission(result) : result;
  }
  const mentalInterval = mentalDecreaseInterval(next, stage.mentalDecreaseIntervalSeconds);
  if (mentalInterval <= 0) {
    if (next.genesis.effects.length === 0) {
      next = changeResource(next, 'mental', -BigInt(Math.trunc(next.currentMental)), 'natural');
      if (
        next.currentMental <= 0 &&
        !(
          next.mentalProtected ||
          next.sectionMentalProtected ||
          next.disableMentalDownEffects.length > 0
        )
      ) {
        next = { ...next, mentalDown: true };
        mentalTimerSeconds = 0;
      }
    }
  }
  while (0 < mentalInterval && mentalInterval < mentalTimerSeconds) {
    mentalTimerSeconds = Math.fround(mentalTimerSeconds - mentalInterval);
    next = decreaseMentalNaturally(next);
  }
  const result: GameState = {
    ...next,
    mentalTimerSeconds,
    mentalDown:
      !(
        next.mentalProtected ||
        next.sectionMentalProtected ||
        next.disableMentalDownEffects.length > 0
      ) && next.currentMental <= 0,
  };
  return !state.mentalDown && result.mentalDown ? registerMentalDownMission(result) : result;
}
