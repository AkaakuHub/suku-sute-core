import type { Card, Effect, GameState } from '../model.ts';
import type { VoltageConversion, VoltageConvertEffect } from '../voltageConversionTypes.ts';
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
  const base = Math.fround(
    Math.fround(Math.fround(int32(effect.num)) + Math.fround(addValue)) * Math.fround(multiplier),
  );
  const boosted = applyAction52SkillBoost(state, card, base);
  const num = int32(boosted.value);
  const suppressDuration = effect.invocationType === 0x388 || effect.invocationType === 0x38b;
  const conversion: VoltageConversion = {
    id: state.nextVoltageConversionId,
    destination: effect.destination,
    num,
    outputDuration: effect.outputDuration,
    disabledOnConvertCount: effect.disabledType === 1 ? effect.disabledValue : null,
    conversions: 0,
    expireOnHeartCollect: effect.destination === 'love' && effect.convertDisabledType <= 2,
    remainingSeconds:
      suppressDuration || effect.displayDuration.kind !== 'milliseconds'
        ? null
        : Math.fround(effect.displayDuration.value / 1000),
    remainingSections:
      suppressDuration || effect.displayDuration.kind !== 'sections'
        ? null
        : effect.displayDuration.value,
    deactivationKey: effect.deactivationKey ?? null,
  };
  return {
    ...boosted.state,
    voltageConversions: [...boosted.state.voltageConversions, conversion],
    nextVoltageConversionId: boosted.state.nextVoltageConversionId + 1,
  };
}

function int32(value: number): number {
  return !Number.isFinite(value) || value < -2_147_483_648 || value > 2_147_483_647
    ? -2_147_483_648
    : Math.trunc(value);
}

export function convertVoltageIncrease(
  state: GameState,
  amount: bigint,
  sourceCard: Card | undefined,
  applyEffect?: EffectApplier,
): Readonly<{ state: GameState; converted: boolean }> {
  if (amount < 1n) return { state, converted: false };
  const conversion = state.voltageConversions.at(-1);
  if (!conversion) return { state, converted: false };
  const voltage = BigInt.asIntN(32, amount);
  const card = sourceCard;
  let next = state;
  const product = BigInt.asIntN(32, BigInt(conversion.num) * voltage);
  const raw = Math.fround(Math.fround(Number(product)) / Math.fround(10_000));
  if (conversion.destination === 'hearts') {
    const base = Math.trunc(Math.ceil(Math.fround(raw * 10)) / 10);
    const buffed = card
      ? applyAdditionalBuff(next, 'attract', base, card)
      : { state: next, value: base };
    next = createSkillHearts(
      buffed.state,
      Math.trunc(buffed.value),
      conversion.outputDuration.kind === 'milliseconds'
        ? Math.fround(conversion.outputDuration.value / 1000)
        : 9_999,
    );
  } else if (conversion.destination === 'love') {
    const base = Math.trunc(raw);
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
              conversion.outputDuration.kind === 'milliseconds'
                ? Math.fround(conversion.outputDuration.value / 1000)
                : null,
            remainingSections:
              conversion.outputDuration.kind === 'sections'
                ? conversion.outputDuration.value
                : null,
            expireOnHeartCollect: conversion.expireOnHeartCollect,
          },
        ],
      };
    }
  } else if (conversion.destination === 'mental') {
    const base = Math.trunc(raw);
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
    const endurance = Math.fround(Math.ceil(Math.fround(raw * 10)) / 10);
    const output: Extract<Effect, { kind: 'mental-barrier' }> = {
      kind: 'mental-barrier',
      barrier: 'endurance',
      enduranceType: 'fixed',
      endurance,
      attenuation: 0,
      duration: conversion.outputDuration,
    };
    const additional = applyMentalBarrierAdditionalBuff(next, card, output.endurance);
    const beforeCount = additional.state.mentalBarriers.length;
    next = addMentalBarrier(
      additional.state,
      {
        ...output,
        duration: output.duration.kind === 'stage' ? { kind: 'stage' } : output.duration,
      },
      Math.trunc(additional.value),
      0,
    );
    if (applyEffect && next.mentalBarriers.length > beforeCount)
      next = induceSkillEffects(
        next,
        'mental-barrier',
        additional.value === 0 ? 100 : Math.trunc(additional.value),
        applyEffect,
      );
  }
  const conversions = Number(BigInt.asIntN(32, BigInt(conversion.conversions + 1)));
  next = {
    ...next,
    voltageConversions:
      conversion.disabledOnConvertCount === BigInt(conversions)
        ? next.voltageConversions.filter((item) => item.id !== conversion.id)
        : next.voltageConversions.map((item) =>
            item.id === conversion.id ? { ...item, conversions } : item,
          ),
  };
  return { state: next, converted: true };
}

export function advanceVoltageConversions(state: GameState, elapsedSeconds: number): GameState {
  const voltageConversions = state.voltageConversions.flatMap((conversion) => {
    if (conversion.remainingSeconds === null) return [conversion];
    const remainingSeconds = Math.fround(conversion.remainingSeconds - Math.fround(elapsedSeconds));
    return remainingSeconds > 0 ? [{ ...conversion, remainingSeconds }] : [];
  });
  const temporaryScoreBoosts = state.temporaryScoreBoosts.flatMap((boost) => {
    if (boost.remainingSeconds === null) return [boost];
    const remainingSeconds = Math.fround(boost.remainingSeconds - Math.fround(elapsedSeconds));
    return remainingSeconds > 0 ? [{ ...boost, remainingSeconds }] : [];
  });
  return { ...state, voltageConversions, temporaryScoreBoosts };
}

export function expireVoltageConversionSections(state: GameState): GameState {
  const voltageConversions = state.voltageConversions.flatMap((conversion) => {
    if (conversion.remainingSections === null) return [conversion];
    const remainingSections = conversion.remainingSections - 1;
    return remainingSections > 0 ? [{ ...conversion, remainingSections }] : [];
  });
  const temporaryScoreBoosts = state.temporaryScoreBoosts.flatMap((boost) => {
    if (boost.remainingSections === null) return [boost];
    const remainingSections = boost.remainingSections - 1;
    return remainingSections > 0 ? [{ ...boost, remainingSections }] : [];
  });
  return { ...state, voltageConversions, temporaryScoreBoosts };
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
    voltageConversions: state.voltageConversions.filter(
      (conversion) => conversion.deactivationKey !== deactivationKey,
    ),
  };
}
