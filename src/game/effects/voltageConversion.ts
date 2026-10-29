import {
  calculateLiveConvertVoltageUpNum,
  convertLiveVoltageUp,
  advanceLiveConvertVoltageUpState,
} from '../../runtime/skills/convertVoltageUp.ts';
import { createLiveSkillEffectDuration } from '../../runtime/skills/skillEffectDuration.ts';
import type { Card, GameState } from '../model.ts';
import type { VoltageConvertEffect } from '../voltageConversionTypes.ts';
import { addMentalBarrier } from '../live/mentalBarriers.ts';
import { applyAdditionalBuff } from './additionalBuff.ts';
import { applyAction52SkillBoost } from './action52SkillBoost.ts';
import { createSkillHearts } from './heartCreation.ts';
import { changeResource } from '../resources.ts';
import type { EffectApplier } from './induceSkillEffect.ts';
import { applyMentalBarrierAdditionalBuff } from './mentalBarrierAdditionalBuff.ts';
import { applyLoveUpAdditionalBuffs } from './loveUpAdditionalBuff.ts';
import { induceSkillEffects } from './induceSkillEffect.ts';

export function activateVoltageConversion(
  state: GameState,
  effect: VoltageConvertEffect,
  card: Card | undefined,
  multiplier: number,
  addValue: number,
): GameState {
  if (!card) return state;
  if (effect.displayDuration.kind === 'sections' && effect.displayDuration.value === 0)
    throw new Error('Display section count is 0. (displayTimeType: SECTION, displayTime: 0)');
  let boostedState = state;
  const num = calculateLiveConvertVoltageUpNum(effect.num, addValue, multiplier, (value) => {
    const boosted = applyAction52SkillBoost(boostedState, card, value);
    boostedState = boosted.state;
    return boosted.value;
  });
  const suppressDuration = effect.invocationType === 0x388 || effect.invocationType === 0x38b;
  const conversion = {
    effectId: String(state.nextConvertVoltageUpEffectId),
    destination:
      effect.destination === 'hearts'
        ? ('heart' as const)
        : effect.destination === 'love'
          ? ('love-up' as const)
          : effect.destination === 'mental'
            ? ('mental-recovery' as const)
            : ('mental-barrier' as const),
    num,
    resultDuration: createLiveSkillEffectDuration(
      effect.outputDuration.kind === 'milliseconds'
        ? 1
        : effect.outputDuration.kind === 'sections'
          ? 2
          : 3,
      effect.outputDuration.value,
      'Convert Voltage Up result',
    ),
    resultDisabledType: effect.convertDisabledType,
    disabledOnConvertCount: effect.disabledType === 1 ? effect.disabledValue : null,
    conversions: 0,
    card,
    duration: createLiveSkillEffectDuration(
      effect.displayDuration.kind === 'milliseconds'
        ? 1
        : effect.displayDuration.kind === 'sections'
          ? 2
          : 3,
      effect.displayDuration.value,
      'Convert Voltage Up',
    ),
    parentControlsLifetime: suppressDuration,
    deactivationKey: effect.deactivationKey ?? null,
  };
  return {
    ...boostedState,
    convertVoltageUpEffects: [...boostedState.convertVoltageUpEffects, conversion],
    nextConvertVoltageUpEffectId: boostedState.nextConvertVoltageUpEffectId + 1,
  };
}

export function convertVoltageIncrease(
  state: GameState,
  amount: bigint,
  sourceCard: Card | undefined,
  applyEffect?: EffectApplier,
): Readonly<{ state: GameState; converted: boolean }> {
  const converted = convertLiveVoltageUp(state.convertVoltageUpEffects, amount, state.tick / 60);
  const conversion = converted.conversion;
  if (!conversion) return { state, converted: false };
  const card = sourceCard;
  let next = { ...state, convertVoltageUpEffects: converted.state };
  if (conversion.destination === 'heart') {
    const base = conversion.amount;
    const buffed = card
      ? applyAdditionalBuff(next, 'attract', base, card)
      : { state: next, value: base };
    next = createSkillHearts(
      buffed.state,
      Math.trunc(buffed.value),
      conversion.resultDuration.kind === 'milliseconds'
        ? conversion.resultDuration.remainingSeconds
        : 9_999,
    );
  } else if (conversion.destination === 'love-up') {
    const base = conversion.amount;
    const buffed = applyLoveUpAdditionalBuffs(next, card, base);
    const percent = Math.trunc(buffed.value);
    if (percent !== 0) {
      next = {
        ...buffed.state,
        temporaryScoreBoosts: [
          ...buffed.state.temporaryScoreBoosts,
          {
            percent,
            remainingSeconds:
              conversion.resultDuration.kind === 'milliseconds'
                ? conversion.resultDuration.remainingSeconds
                : null,
            remainingSections:
              conversion.resultDuration.kind === 'sections'
                ? Number(conversion.resultDuration.remainingChanges)
                : null,
            expireOnHeartCollect: conversion.resultDisabledType <= 2,
          },
        ],
      };
    }
  } else if (conversion.destination === 'mental-recovery') {
    const base = conversion.amount;
    const buffed = card
      ? applyAdditionalBuff(next, 'mental', base, card)
      : { state: next, value: base };
    next = changeResource(
      buffed.state,
      'mental',
      BigInt(Math.trunc(buffed.value)),
      'skill',
      card,
      applyEffect,
    );
  } else {
    const endurance = conversion.amount;
    const additional = applyMentalBarrierAdditionalBuff(next, card, endurance);
    const beforeCount = additional.state.mentalBarriers.effects.length;
    next = addMentalBarrier(
      additional.state,
      {
        kind: 'mental-barrier',
        barrier: 'endurance',
        enduranceType: 'fixed',
        endurance,
        attenuation: 0,
        duration: conversion.resultDuration,
      },
      Math.trunc(additional.value),
      0,
    );
    if (applyEffect && next.mentalBarriers.effects.length > beforeCount)
      next = induceSkillEffects(
        next,
        'mental-barrier',
        additional.value === 0 ? 100 : Math.trunc(additional.value),
        applyEffect,
      );
  }
  return { state: next, converted: true };
}

export function advanceVoltageConversions(state: GameState, elapsedSeconds: number): GameState {
  const convertVoltageUpEffects = advanceLiveConvertVoltageUpState(state.convertVoltageUpEffects, {
    deltaTimeSeconds: elapsedSeconds,
    sectionChangeCount: 0,
    musicEnded: false,
  });
  const temporaryScoreBoosts = state.temporaryScoreBoosts.flatMap((boost) => {
    if (boost.remainingSeconds === null) return [boost];
    const remainingSeconds = Math.fround(boost.remainingSeconds - Math.fround(elapsedSeconds));
    return remainingSeconds > 0 ? [{ ...boost, remainingSeconds }] : [];
  });
  return { ...state, convertVoltageUpEffects, temporaryScoreBoosts };
}

export function expireVoltageConversionSections(state: GameState): GameState {
  const convertVoltageUpEffects = advanceLiveConvertVoltageUpState(state.convertVoltageUpEffects, {
    deltaTimeSeconds: 0,
    sectionChangeCount: 1,
    musicEnded: false,
  });
  const temporaryScoreBoosts = state.temporaryScoreBoosts.flatMap((boost) => {
    if (boost.remainingSections === null) return [boost];
    const remainingSections = boost.remainingSections - 1;
    return remainingSections > 0 ? [{ ...boost, remainingSections }] : [];
  });
  return { ...state, convertVoltageUpEffects, temporaryScoreBoosts };
}

export function expireConvertedScoreBoostsOnHeartCollect(state: GameState): GameState {
  return {
    ...state,
    temporaryScoreBoosts: state.temporaryScoreBoosts.filter((boost) => !boost.expireOnHeartCollect),
  };
}

export function deactivateVoltageConversions(state: GameState, deactivationKey: string): GameState {
  return {
    ...state,
    convertVoltageUpEffects: state.convertVoltageUpEffects.filter(
      (conversion) => conversion.deactivationKey !== deactivationKey,
    ),
  };
}
