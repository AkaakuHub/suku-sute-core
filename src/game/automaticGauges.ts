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
      currentAp: Math.floor(state.energy),
      maxAp: state.maxEnergy,
      timerSeconds: state.apTimerSeconds,
    },
    {
      deltaTimeSeconds: dt,
      mentalDown: state.resting,
      increaseIntervalSeconds: apIncreaseIntervalSeconds(state),
      boundaryToleranceSeconds: 0.000001,
    },
  ).state;
  let next = changeResource(state, 'energy', BigInt(ap.currentAp - Math.floor(state.energy)));
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
      'excitement',
      1n,
      'natural',
      undefined,
      applyEffect,
    );
  }
  if (next.bloom && (next.mentalProtected || next.sectionMentalProtected)) return next;
  let mentalTimerSeconds = Math.fround(Math.fround(next.mentalTimerSeconds) + Math.fround(dt));
  const resting =
    !(
      next.mentalProtected ||
      next.sectionMentalProtected ||
      next.disableMentalDownEffects.length > 0
    ) &&
    (next.resting || next.stamina <= 0);
  if (resting) {
    const recovery = calculateLiveMentalDownRecovery(next.maximumMental, durationSeconds(next));
    const stamina = Math.min(
      next.maximumMental,
      Math.fround(
        next.stamina +
          Math.fround(
            Math.fround(recovery.recoveryMental * Math.fround(dt)) / recovery.recoveryTimeSeconds,
          ),
      ),
    );
    const recovered = {
      ...next,
      mentalTimerSeconds,
      stamina,
      resting: stamina < recovery.recoveryMental,
    };
    const result =
      stamina !== next.stamina ? induceMentalHearts(recovered, Math.trunc(stamina)) : recovered;
    return !state.resting ? registerMentalDownMission(result) : result;
  }
  const mentalInterval = mentalDecreaseInterval(next, stage.mentalDecreaseIntervalSeconds);
  if (mentalInterval <= 0) {
    if (!next.bloom) {
      next = changeResource(next, 'stamina', -BigInt(Math.trunc(next.stamina)), 'natural');
      if (
        next.stamina <= 0 &&
        !(
          next.mentalProtected ||
          next.sectionMentalProtected ||
          next.disableMentalDownEffects.length > 0
        )
      ) {
        next = { ...next, resting: true };
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
    resting:
      !(
        next.mentalProtected ||
        next.sectionMentalProtected ||
        next.disableMentalDownEffects.length > 0
      ) && next.stamina <= 0,
  };
  return !state.resting && result.resting ? registerMentalDownMission(result) : result;
}
