import { setLiveApGaugeValue } from '../runtime/live/apGaugeChange.ts';
import type { GameState } from './model.ts';
import { voltageLevel, voltageThreshold } from './live/voltageLevel.ts';
import { changeGenesisGauge, changeGenesisResource } from './genesis.ts';
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
  resource: 'ap' | 'mental' | 'voltage',
  amount: bigint,
  source: 'skill' | 'natural' = 'skill',
  card?: Card,
  applyEffect?: EffectApplier,
  induceVoltageUp = false,
  onSkillEffectAmount?: (state: GameState, amount: number) => GameState,
): GameState {
  if (resource === 'voltage') amount = BigInt.asIntN(32, amount);
  const voltageInput = amount;
  let masteryVoltageUp = 0n;
  if (resource === 'ap' && amount >= 0n) {
    const absorption = absorbSkillEffect(state, 14, BigInt.asIntN(32, amount));
    if (absorption.absorbed) return absorption.state;
  }
  if (resource === 'ap')
    return setLiveApGaugeValue(
      state,
      BigInt(state.ap.currentAp) + amount,
      state.gaugeInfinities.some((infinity) => infinity.gauge === 'ap' && !infinity.suspended),
    );
  if (resource === 'mental' && amount >= 0n && source === 'skill') {
    const absorption = absorbSkillEffect(state, 5, BigInt.asUintN(32, amount));
    if (absorption.absorbed) return absorption.state;
  }
  if (resource === 'voltage' && source === 'skill') {
    const conversion = convertVoltageIncrease(state, amount, card, applyEffect);
    if (conversion.converted) return notifySkillEffectAmount(conversion.state, 0);
    state = conversion.state;
  }
  if (resource === 'voltage' && amount >= 0n) {
    const absorption = absorbSkillEffect(state, 10, BigInt.asIntN(32, amount));
    if (absorption.absorbed) return notifySkillEffectAmount(absorption.state, 0);
  }
  if (resource === 'voltage' && amount > 0n) {
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
    state.gaugeInfinities.some((infinity) => infinity.gauge === resource && !infinity.suspended) &&
    !(resource === 'mental' && (state.mental.mentalDown || amount < 0n))
  ) {
    if (!applyEffect || amount < 0n) return notifySkillEffectAmount(state, Number(voltageInput));
    if (resource === 'mental' && source === 'skill')
      return induceSkillEffects(state, 'mental-recover', Number(amount), applyEffect);
    if (resource === 'voltage') {
      let next = state;
      if (induceVoltageUp)
        next = induceSkillEffects(next, 'voltage', Number(voltageInput), applyEffect);
      if (masteryVoltageUp > 0n)
        next = induceSkillEffects(next, 'voltage', Number(masteryVoltageUp), applyEffect);
      return notifySkillEffectAmount(next, Number(voltageInput));
    }
    return state;
  }
  if (
    resource === 'mental' &&
    amount < 0n &&
    source === 'skill' &&
    state.genesis.effects.length === 0
  ) {
    const absorbed = absorbSkillMentalDamage(state, amount);
    state = absorbed.state;
    amount = absorbed.amount;
    if (amount === 0n) return state;
  }
  if (resource === 'mental' && amount < 0n) {
    if (source === 'skill') {
      const shielded = breakMentalShields(state, Number(-amount));
      state = shielded.state;
      amount = -BigInt(Math.trunc(shielded.remainingDamage));
      if (amount === 0n) return state;
    }
    if (
      state.gaugeInfinities.some(
        (infinity) => infinity.gauge === 'mental' && !infinity.suspended,
      ) &&
      !state.mental.mentalDown
    )
      return state.genesis.effects.length > 0
        ? changeGenesisResource(state, 'mental', amount)
        : state;
  }
  if (state.genesis.effects.length > 0) {
    const changed = changeGenesisResource(state, resource, amount);
    let withHandInduce =
      resource === 'voltage' ? notifyVoltageBaseLevelChange(state, changed, applyEffect) : changed;
    if (resource === 'voltage' && applyEffect) {
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
      resource === 'voltage' && state.currentVoltage > 0 && withHandInduce.currentVoltage === 0
        ? registerVoltageZeroMission(withHandInduce)
        : withHandInduce;
    return notifySkillEffectAmount(withMissionEvent, Number(voltageInput));
  }
  const maximum =
    resource === 'voltage' ? voltageThreshold(state.maximumVoltageLevel) : state.maximumMental;
  const currentValue = resource === 'mental' ? state.mental.currentMental : state.currentVoltage;
  const nextValue = Math.max(0, Math.min(maximum, currentValue + Number(amount)));
  let next: GameState =
    resource === 'mental'
      ? { ...state, mental: { ...state.mental, currentMental: nextValue } }
      : { ...state, currentVoltage: nextValue };
  if (resource === 'voltage') next = notifyVoltageBaseLevelChange(state, next, applyEffect);
  if (resource === 'voltage' && state.currentVoltage > 0 && nextValue === 0)
    next = registerVoltageZeroMission(next);
  if (resource === 'mental' && nextValue !== state.mental.currentMental)
    next = induceMentalHearts(next, Math.trunc(nextValue));
  if (!applyEffect) return notifySkillEffectAmount(next, Number(voltageInput));
  if (resource === 'mental' && source === 'skill' && amount >= 0n)
    return induceSkillEffects(next, 'mental-recover', Number(amount), applyEffect);
  if (resource === 'voltage') {
    if (induceVoltageUp)
      next = induceSkillEffects(next, 'voltage', Number(voltageInput), applyEffect);
    if (masteryVoltageUp > 0n)
      next = induceSkillEffects(next, 'voltage', Number(masteryVoltageUp), applyEffect);
  }
  return notifySkillEffectAmount(next, Number(voltageInput));

  function notifySkillEffectAmount(nextState: GameState, effectAmount: number): GameState {
    return resource === 'voltage' && source === 'skill' && onSkillEffectAmount
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
  if (state.genesis.effects.length > 0) {
    return changeGenesisGauge(state, Math.fround(target - state.currentVoltage));
  }
  if (state.gaugeInfinities.some((infinity) => infinity.gauge === 'voltage' && !infinity.suspended))
    return state;
  const next = notifyVoltageBaseLevelChange(
    state,
    { ...state, currentVoltage: target },
    _applyEffect,
  );
  return state.currentVoltage > 0 && target === 0 ? registerVoltageZeroMission(next) : next;
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
  if (!applyEffect || previous.currentVoltage === current.currentVoltage) return current;
  const branched = refreshBranchInducers(current, applyEffect);
  return notifyHandVoltageIncrease(
    branched,
    voltageLevel(previous.currentVoltage, previous.maximumVoltageLevel),
    voltageLevel(branched.currentVoltage, branched.maximumVoltageLevel),
    applyEffect,
  );
}

export function decreaseMentalNaturally(state: GameState): GameState {
  const barrier = absorbNaturalMentalDecrease(state);
  if (barrier.absorbed) return barrier.state;
  return changeResource(state, 'mental', -1n, 'natural');
}

export function spendAp(state: GameState, amount: number): GameState {
  return changeResource(
    state.ap.currentAp >= state.ap.maxAp
      ? { ...state, ap: { ...state.ap, timerSeconds: 0 } }
      : state,
    'ap',
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
      next =
        next.genesis.effects.length > 0
          ? { ...next, mental: { ...next.mental, timerSeconds: 0 } }
          : induceMentalHearts(
              {
                ...next,
                mental: { ...next.mental, currentMental: next.maximumMental, timerSeconds: 0 },
              },
              next.maximumMental,
            );
    }
    if (gauge === 'voltage') {
      const target = voltageThreshold(Math.min(10, next.maximumVoltageLevel));
      next =
        next.genesis.effects.length > 0
          ? changeGenesisGauge(next, Math.fround(target - next.currentVoltage))
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
      next =
        next.genesis.effects.length > 0
          ? { ...next, mental: { ...next.mental, timerSeconds: 0 } }
          : induceMentalHearts(
              {
                ...next,
                mental: { ...next.mental, currentMental: next.maximumMental, timerSeconds: 0 },
              },
              next.maximumMental,
            );
    }
    if (gauge === 'voltage') {
      const target = voltageThreshold(Math.min(10, next.maximumVoltageLevel));
      next =
        next.genesis.effects.length > 0
          ? changeGenesisGauge(next, Math.fround(target - next.currentVoltage))
          : setVoltageValue(next, target, applyEffect);
    }
  }
  return next;
}
