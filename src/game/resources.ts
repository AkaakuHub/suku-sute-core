import type { GameState } from './model.ts';
import { voltageLevel, voltageThreshold } from './live/voltageLevel.ts';
import { changeBloomGauge, changeBloomResource } from './bloom.ts';
import { breakMentalShields } from './effects/mentalShield.ts';
import { absorbNaturalMentalDecrease, absorbSkillMentalDamage } from './live/mentalBarriers.ts';
import type { Card } from './model.ts';
import { convertVoltageIncrease } from './effects/voltageConversion.ts';
import { induceMentalHearts } from './effects/mentalHeartInduce.ts';
import { induceSkillEffects, type EffectApplier } from './effects/induceSkillEffect.ts';
import { absorbSkillEffect } from './effects/proxySkill.ts';
import { registerVoltageZeroMission } from './ingameMissions.ts';
import { notifyHandVoltageIncrease } from './cards/handInduce.ts';
import { refreshBranchInducers } from './effects/branch.ts';

export function changeResource(
  state: GameState,
  resource: 'energy' | 'stamina' | 'excitement',
  amount: bigint,
  source: 'skill' | 'natural' = 'skill',
  card?: Card,
  applyEffect?: EffectApplier,
  induceVoltageUp = false,
  onSkillEffectAmount?: (state: GameState, amount: number) => GameState,
): GameState {
  if (resource === 'excitement') amount = BigInt.asIntN(32, amount);
  const voltageInput = amount;
  let masteryVoltageUp = 0n;
  if (resource === 'energy' && amount >= 0n) {
    const absorption = absorbSkillEffect(state, 14, BigInt.asIntN(32, amount));
    if (absorption.absorbed) return absorption.state;
  }
  if (resource === 'stamina' && amount >= 0n && source === 'skill') {
    const absorption = absorbSkillEffect(state, 5, BigInt.asUintN(32, amount));
    if (absorption.absorbed) return absorption.state;
  }
  if (resource === 'excitement' && source === 'skill') {
    const conversion = convertVoltageIncrease(state, amount, card, applyEffect);
    if (conversion.converted) return notifySkillEffectAmount(conversion.state, 0);
    state = conversion.state;
  }
  if (resource === 'excitement' && amount >= 0n) {
    const absorption = absorbSkillEffect(state, 10, BigInt.asIntN(32, amount));
    if (absorption.absorbed) return notifySkillEffectAmount(absorption.state, 0);
  }
  if (resource === 'excitement' && amount > 0n) {
    const mastery = addMasteryVoltage(state, Math.fround(Number(amount)));
    state = mastery.state;
    if (mastery.gain > 0) {
      const gained = BigInt(mastery.gain);
      const conversion = convertVoltageIncrease(state, gained, undefined, applyEffect);
      state = conversion.state;
      if (!conversion.converted) {
        amount += gained;
        masteryVoltageUp = gained;
      }
    }
  }
  if (
    state.gaugeInfinities.some(
      (infinity) => infinity.gauge === resourceToGauge(resource) && !infinity.suspended,
    ) &&
    !(resource === 'stamina' && (state.resting || amount < 0n))
  ) {
    if (!applyEffect || amount < 0n) return notifySkillEffectAmount(state, Number(voltageInput));
    if (resource === 'stamina' && source === 'skill')
      return induceSkillEffects(state, 'mental-recover', Number(amount), applyEffect);
    if (resource === 'excitement') {
      let next = state;
      if (induceVoltageUp)
        next = induceSkillEffects(next, 'voltage', Number(voltageInput), applyEffect);
      if (masteryVoltageUp > 0n)
        next = induceSkillEffects(next, 'voltage', Number(masteryVoltageUp), applyEffect);
      return notifySkillEffectAmount(next, Number(voltageInput));
    }
    return state;
  }
  if (resource === 'stamina' && amount < 0n && source === 'skill' && !state.bloom) {
    const absorbed = absorbSkillMentalDamage(state, amount);
    state = absorbed.state;
    amount = absorbed.amount;
    if (amount === 0n) return state;
  }
  if (resource === 'stamina' && amount < 0n) {
    const shielded = breakMentalShields(state, Number(-amount));
    state = shielded.state;
    amount = -BigInt(Math.trunc(shielded.remainingDamage));
    if (amount === 0n) return state;
    if (
      state.gaugeInfinities.some(
        (infinity) => infinity.gauge === 'mental' && !infinity.suspended,
      ) &&
      !state.resting
    )
      return state.bloom ? changeBloomResource(state, 'stamina', amount) : state;
  }
  if (state.bloom) {
    const changed = changeBloomResource(state, resource, amount);
    let withHandInduce =
      resource === 'excitement'
        ? notifyVoltageBaseLevelChange(state, changed, applyEffect)
        : changed;
    if (resource === 'excitement' && applyEffect) {
      if (induceVoltageUp)
        withHandInduce = induceSkillEffects(
          withHandInduce,
          'voltage',
          Number(voltageInput),
          applyEffect,
        );
      if (masteryVoltageUp > 0n)
        withHandInduce = induceSkillEffects(
          withHandInduce,
          'voltage',
          Number(masteryVoltageUp),
          applyEffect,
        );
    }
    const withMissionEvent =
      resource === 'excitement' && state.excitement > 0 && withHandInduce.excitement === 0
        ? registerVoltageZeroMission(withHandInduce)
        : withHandInduce;
    return notifySkillEffectAmount(withMissionEvent, Number(voltageInput));
  }
  const maximum =
    resource === 'energy'
      ? state.maxEnergy
      : resource === 'excitement'
        ? voltageThreshold(state.maximumVoltageLevel)
        : state.maximumMental;
  const nextValue = Math.max(0, Math.min(maximum, state[resource] + Number(amount)));
  let next: GameState = { ...state, [resource]: nextValue };
  if (resource === 'excitement') next = notifyVoltageBaseLevelChange(state, next, applyEffect);
  if (resource === 'excitement' && state.excitement > 0 && nextValue === 0)
    next = registerVoltageZeroMission(next);
  if (resource === 'stamina' && nextValue !== state.stamina)
    next = induceMentalHearts(next, Math.trunc(nextValue));
  if (!applyEffect) return notifySkillEffectAmount(next, Number(voltageInput));
  if (resource === 'stamina' && source === 'skill' && amount >= 0n)
    return induceSkillEffects(next, 'mental-recover', Number(amount), applyEffect);
  if (resource === 'excitement') {
    if (induceVoltageUp)
      next = induceSkillEffects(next, 'voltage', Number(voltageInput), applyEffect);
    if (masteryVoltageUp > 0n)
      next = induceSkillEffects(next, 'voltage', Number(masteryVoltageUp), applyEffect);
  }
  return notifySkillEffectAmount(next, Number(voltageInput));

  function notifySkillEffectAmount(nextState: GameState, effectAmount: number): GameState {
    return resource === 'excitement' && source === 'skill' && onSkillEffectAmount
      ? onSkillEffectAmount(nextState, effectAmount)
      : nextState;
  }
}

export function setVoltageValue(
  state: GameState,
  amount: number,
  _applyEffect?: EffectApplier,
): GameState {
  const target = Math.max(0, Math.trunc(Math.fround(amount)));
  if (state.bloom) {
    return changeBloomGauge(state, Math.fround(target - state.excitement));
  }
  if (state.gaugeInfinities.some((infinity) => infinity.gauge === 'voltage' && !infinity.suspended))
    return state;
  const next = notifyVoltageBaseLevelChange(state, { ...state, excitement: target }, _applyEffect);
  return state.excitement > 0 && target === 0 ? registerVoltageZeroMission(next) : next;
}

export function addMasteryVoltage(
  state: GameState,
  voltageUp: number,
): Readonly<{ state: GameState; gain: number }> {
  const bonus = state.track.masteryVoltageBonus;
  if (voltageUp <= 0 || bonus.demand <= 0) return { state, gain: 0 };
  const progress = Math.fround(state.masteryVoltageProgress + Math.fround(voltageUp));
  if (progress >= bonus.demand)
    return { state: { ...state, masteryVoltageProgress: 0 }, gain: Math.trunc(bonus.gain) };
  return { state: { ...state, masteryVoltageProgress: progress }, gain: 0 };
}

export function notifyVoltageBaseLevelChange(
  previous: GameState,
  current: GameState,
  applyEffect?: EffectApplier,
): GameState {
  if (!applyEffect || previous.excitement === current.excitement) return current;
  const branched = refreshBranchInducers(current, applyEffect);
  return notifyHandVoltageIncrease(
    branched,
    voltageLevel(previous.excitement, previous.maximumVoltageLevel),
    voltageLevel(branched.excitement, branched.maximumVoltageLevel),
    applyEffect,
  );
}

export function decreaseMentalNaturally(state: GameState): GameState {
  const barrier = absorbNaturalMentalDecrease(state);
  if (barrier.absorbed) return barrier.state;
  return changeResource(state, 'stamina', -1n, 'natural');
}

function resourceToGauge(
  resource: 'energy' | 'stamina' | 'excitement',
): 'ap' | 'mental' | 'voltage' {
  switch (resource) {
    case 'energy':
      return 'ap';
    case 'stamina':
      return 'mental';
    case 'excitement':
      return 'voltage';
  }
}

export function spendEnergy(state: GameState, amount: number): GameState {
  return changeResource(
    state.energy >= state.maxEnergy ? { ...state, apTimerSeconds: 0 } : state,
    'energy',
    -BigInt(amount),
  );
}

export function expireGaugeInfinities(
  state: GameState,
  duration: 'milliseconds' | 'sections',
  elapsed: number,
  applyEffect?: EffectApplier,
): GameState {
  const before = state.gaugeInfinities;
  const ended = new Set<'ap' | 'voltage' | 'mental'>();
  const active: GameState['gaugeInfinities'][number][] = [];
  for (const infinity of before) {
    if (duration === 'milliseconds') {
      const remaining =
        infinity.remainingSeconds === null
          ? null
          : Math.fround(infinity.remainingSeconds - Math.fround(elapsed));
      if (remaining !== null && remaining <= 0) {
        ended.add(infinity.gauge);
        continue;
      }
      active.push(remaining === null ? infinity : { ...infinity, remainingSeconds: remaining });
      continue;
    }
    const remaining =
      infinity.remainingSections === null ? null : infinity.remainingSections - BigInt(elapsed);
    if (remaining !== null && remaining <= 0) {
      ended.add(infinity.gauge);
      continue;
    }
    active.push(remaining === null ? infinity : { ...infinity, remainingSections: remaining });
  }
  let next: GameState = { ...state, gaugeInfinities: active };
  for (const gauge of ended) {
    if (active.some((infinity) => infinity.gauge === gauge)) continue;
    if (gauge === 'mental') {
      next = next.bloom
        ? { ...next, mentalTimerSeconds: 0 }
        : induceMentalHearts(
            { ...next, stamina: next.maximumMental, mentalTimerSeconds: 0 },
            next.maximumMental,
          );
    }
    if (gauge === 'voltage') {
      const target = voltageThreshold(Math.min(10, next.maximumVoltageLevel));
      next = next.bloom
        ? changeBloomGauge(next, Math.fround(target - next.excitement))
        : setVoltageValue(next, target, applyEffect);
    }
  }
  return next;
}

export function deactivateGaugeInfinities(
  state: GameState,
  deactivationKey: string,
  applyEffect?: EffectApplier,
): GameState {
  const removed = state.gaugeInfinities.filter(
    (infinity) => infinity.deactivationKey === deactivationKey,
  );
  const active = state.gaugeInfinities.filter(
    (infinity) => infinity.deactivationKey !== deactivationKey,
  );
  let next: GameState = { ...state, gaugeInfinities: active };
  for (const gauge of new Set(removed.map((infinity) => infinity.gauge))) {
    if (active.some((infinity) => infinity.gauge === gauge)) continue;
    if (gauge === 'mental') {
      next = next.bloom
        ? { ...next, mentalTimerSeconds: 0 }
        : induceMentalHearts(
            { ...next, stamina: next.maximumMental, mentalTimerSeconds: 0 },
            next.maximumMental,
          );
    }
    if (gauge === 'voltage') {
      const target = voltageThreshold(Math.min(10, next.maximumVoltageLevel));
      next = next.bloom
        ? changeBloomGauge(next, Math.fround(target - next.excitement))
        : setVoltageValue(next, target, applyEffect);
    }
  }
  return next;
}
