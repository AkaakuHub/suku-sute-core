export type LiveBeatHeartCard = Readonly<{
  beatPoint: number;
  goodMood: 1 | 2 | 3;
}>;

export type LiveBeatHeartBuffPorts = Readonly<{
  applyBeatPointBuff: (value: number) => number;
  applyBeatHeartBuff: ((value: number) => number) | null;
}>;

export type LiveBeatHeartCalculation = Readonly<{
  value: number;
  createCount: number;
}>;

export type LiveBeatHeartBuff = Readonly<{
  effectId: string;
  target: 'beat-point' | 'beat-heart';
  type: 0 | 1 | 3;
  value: number;
  duration:
    | Readonly<{ kind: 'milliseconds'; expiresAtSeconds: number }>
    | Readonly<{ kind: 'sections'; remainingChanges: number }>
    | Readonly<{ kind: 'full-end' }>;
}>;

export type LiveBeatHeartSkillEffect = Readonly<{
  id: string;
  actionType: number;
  details: readonly Readonly<{
    detailType: string;
    targetMood: number;
    effectValue: number;
    params: readonly Readonly<{
      paramType: string;
      paramValue: string;
    }>[];
  }>[];
}>;

export function calculateLiveBeatHeart(
  input: Readonly<{
    cards: readonly LiveBeatHeartCard[];
    musicBeatPoint: number;
    moodValue: number;
    heartAppearRatio: number;
  }>,
  ports: LiveBeatHeartBuffPorts,
): LiveBeatHeartCalculation {
  validateInput(input);
  let cardValueSum = 0;
  for (const card of input.cards) {
    const moodFactor = calculateLiveMoodFactor(input.moodValue, card.goodMood);
    const moodBeatPoint = Math.fround(
      Math.fround(Math.fround(moodFactor) * Math.fround(card.beatPoint)) *
        Math.fround(input.musicBeatPoint),
    );
    const cardValue = Math.trunc(Math.fround(moodBeatPoint * 0.01));
    cardValueSum = Math.fround(cardValueSum + cardValue);
  }

  const averageCardValue = Math.fround(cardValueSum / input.cards.length);
  const beatPointBuffedValue = checkedPortValue(
    ports.applyBeatPointBuff(averageCardValue),
    'beat point buff',
  );
  const ratioValue = Math.trunc(
    Math.fround(Math.fround(beatPointBuffedValue) * Math.fround(input.heartAppearRatio)),
  );
  const value =
    ports.applyBeatHeartBuff === null
      ? ratioValue
      : checkedPortValue(ports.applyBeatHeartBuff(ratioValue), 'Beat Heart buff');
  return { value, createCount: Math.trunc(Math.fround(value)) };
}

function validateInput(
  input: Readonly<{
    cards: readonly LiveBeatHeartCard[];
    musicBeatPoint: number;
    moodValue: number;
    heartAppearRatio: number;
  }>,
): void {
  if (input.cards.length === 0) {
    throw new Error('Live Beat Heart cards are absent');
  }
  if (
    !Number.isFinite(input.musicBeatPoint) ||
    !Number.isSafeInteger(input.moodValue) ||
    !Number.isFinite(input.heartAppearRatio)
  ) {
    throw new Error('Live Beat Heart music value is invalid');
  }
  for (const card of input.cards) {
    if (
      !Number.isFinite(card.beatPoint) ||
      (card.goodMood !== 1 && card.goodMood !== 2 && card.goodMood !== 3)
    ) {
      throw new Error('Live Beat Heart card value is invalid');
    }
  }
}

export function calculateLiveMoodFactor(moodValue: number, goodMood: 1 | 2 | 3): number {
  if (!Number.isSafeInteger(moodValue)) {
    throw new Error('Live mood value is invalid');
  }
  if (moodValue === 0) return 1;
  if (moodValue > 0) {
    if (goodMood === 3) return 1;
    const value = Math.fround(moodValue / 100);
    return Math.fround(1 + (goodMood === 2 ? value / 2 : value));
  }
  if (goodMood === 1) return 1;
  const value = Math.fround(moodValue / -100);
  return Math.fround(1 + (goodMood === 2 ? value / 2 : value));
}

export function activateLiveBeatHeartBuffs(
  effects: readonly LiveBeatHeartSkillEffect[],
  input: Readonly<{
    currentTimeSeconds: number;
    currentMoodValue: number;
  }>,
): readonly LiveBeatHeartBuff[] {
  if (
    !Number.isFinite(input.currentTimeSeconds) ||
    input.currentTimeSeconds < 0 ||
    !Number.isSafeInteger(input.currentMoodValue)
  ) {
    throw new Error('Live Beat Heart buff activation input is invalid');
  }
  return effects.flatMap((effect) => {
    switch (effect.actionType) {
      case 3:
        return [activateBeatPointBuff(effect, input)];
      case 47:
        return [activateBeatHeartValueBuff(effect, input)];
      default:
        return [];
    }
  });
}

export function advanceLiveBeatHeartBuffs(
  buffs: readonly LiveBeatHeartBuff[],
  input: Readonly<{
    currentTimeSeconds: number;
    sectionChangeCount: number;
  }>,
): readonly LiveBeatHeartBuff[] {
  if (
    !Number.isFinite(input.currentTimeSeconds) ||
    input.currentTimeSeconds < 0 ||
    !Number.isSafeInteger(input.sectionChangeCount) ||
    input.sectionChangeCount < 0
  ) {
    throw new Error('Live Beat Heart buff clock is invalid');
  }
  return buffs.flatMap((buff) => {
    switch (buff.duration.kind) {
      case 'milliseconds':
        return input.currentTimeSeconds < buff.duration.expiresAtSeconds ? [buff] : [];
      case 'sections': {
        const remainingChanges = buff.duration.remainingChanges - input.sectionChangeCount;
        return remainingChanges > 0
          ? [{ ...buff, duration: { kind: 'sections', remainingChanges } }]
          : [];
      }
      case 'full-end':
        return [buff];
      default:
        throw new Error('Live Beat Heart buff duration is invalid');
    }
  });
}

export function applyLiveBeatPointBuffs(
  value: number,
  buffs: readonly LiveBeatHeartBuff[],
): number {
  return applyBuffs(
    value,
    buffs.filter((buff) => buff.target === 'beat-point'),
  );
}

export function applyLiveBeatHeartValueBuffs(
  value: number,
  buffs: readonly LiveBeatHeartBuff[],
): number {
  return applyBuffs(
    value,
    buffs.filter((buff) => buff.target === 'beat-heart'),
  );
}

function activateBeatPointBuff(
  effect: LiveBeatHeartSkillEffect,
  input: Readonly<{ currentTimeSeconds: number; currentMoodValue: number }>,
): LiveBeatHeartBuff {
  const details = requireEffectDetails(effect, [
    'BP_UP_NUM_BASE',
    'BP_UP_NUM_BONUS_MOOD',
    'BP_UP_DISPLAY_TIME_TYPE',
    'BP_UP_DISPLAY_TIME',
  ]);
  const bonusMood = details.get('BP_UP_NUM_BONUS_MOOD');
  if (bonusMood === undefined) {
    throw new Error('Live Beat Point bonus mood detail is absent');
  }
  const value = calculateLiveSkillEffectValue(
    requiredDetailValue(details, 'BP_UP_NUM_BASE'),
    bonusMood,
    input.currentMoodValue,
  );
  return {
    effectId: effect.id,
    target: 'beat-point',
    type: 0,
    value,
    duration: resolveBuffDuration(
      requiredDetailValue(details, 'BP_UP_DISPLAY_TIME_TYPE'),
      requiredDetailValue(details, 'BP_UP_DISPLAY_TIME'),
      input.currentTimeSeconds,
    ),
  };
}

function activateBeatHeartValueBuff(
  effect: LiveBeatHeartSkillEffect,
  input: Readonly<{ currentTimeSeconds: number; currentMoodValue: number }>,
): LiveBeatHeartBuff {
  const details = requireEffectDetails(effect, [
    'CHANGE_BEAT_HEART_VALUE_CALC_TYPE',
    'CHANGE_BEAT_HEART_VALUE_NUM',
    'CHANGE_BEAT_HEART_VALUE_BONUS_MOOD',
    'CHANGE_BEAT_HEART_VALUE_DISPLAY_TIME_TYPE',
    'CHANGE_BEAT_HEART_VALUE_DISPLAY_TIME',
  ]);
  const bonusMood = details.get('CHANGE_BEAT_HEART_VALUE_BONUS_MOOD');
  if (bonusMood === undefined) {
    throw new Error('Live Beat Heart bonus mood detail is absent');
  }
  const calcType = requiredDetailValue(details, 'CHANGE_BEAT_HEART_VALUE_CALC_TYPE');
  if (calcType !== 1 && calcType !== 2 && calcType !== 3) {
    throw new Error('Live Beat Heart buff calculation type is invalid');
  }
  return {
    effectId: effect.id,
    target: 'beat-heart',
    type: calcType === 1 ? 0 : calcType === 2 ? 1 : 3,
    value: calculateLiveSkillEffectValue(
      requiredDetailValue(details, 'CHANGE_BEAT_HEART_VALUE_NUM'),
      bonusMood,
      input.currentMoodValue,
    ),
    duration: resolveBuffDuration(
      requiredDetailValue(details, 'CHANGE_BEAT_HEART_VALUE_DISPLAY_TIME_TYPE'),
      requiredDetailValue(details, 'CHANGE_BEAT_HEART_VALUE_DISPLAY_TIME'),
      input.currentTimeSeconds,
    ),
  };
}

function requireEffectDetails(
  effect: LiveBeatHeartSkillEffect,
  names: readonly string[],
): ReadonlyMap<string, LiveBeatHeartSkillEffect['details'][number]> {
  if (!/^[1-9]\d*$/.test(effect.id)) {
    throw new Error('Live Beat Heart skill effect contract differs');
  }
  return requireLiveSkillEffectDetails(effect.details, names, 'Beat Heart');
}

function requiredDetailValue(
  details: ReadonlyMap<string, LiveBeatHeartSkillEffect['details'][number]>,
  name: string,
): number {
  return requireLiveSkillEffectDetailValue(details, name, 'Beat Heart');
}

function resolveBuffDuration(
  displayTimeType: number,
  displayTime: number,
  currentTimeSeconds: number,
): LiveBeatHeartBuff['duration'] {
  if (!Number.isSafeInteger(displayTime) || displayTime < 0) {
    throw new Error('Live Beat Heart display time is invalid');
  }
  switch (displayTimeType) {
    case 1:
      return {
        kind: 'milliseconds',
        expiresAtSeconds: currentTimeSeconds + displayTime / 1000,
      };
    case 2:
      if (displayTime === 0) {
        throw new Error('Live Beat Heart section display time is invalid');
      }
      return { kind: 'sections', remainingChanges: displayTime };
    case 3:
      return { kind: 'full-end' };
    default:
      throw new Error('Live Beat Heart display time type is invalid');
  }
}

function applyBuffs(value: number, buffs: readonly LiveBeatHeartBuff[]): number {
  if (!Number.isFinite(value)) {
    throw new Error('Live Beat Heart buff input is invalid');
  }
  return buffs.reduce((currentValue, buff) => {
    switch (buff.type) {
      case 0:
        return currentValue + buff.value;
      case 1:
        return currentValue * buff.value;
      case 3:
        return buff.value;
      default:
        throw new Error('Live Beat Heart buff type is invalid');
    }
  }, value);
}

function checkedPortValue(value: number, label: string): number {
  if (!Number.isFinite(value)) {
    throw new Error(`Live ${label} result is invalid`);
  }
  return value;
}

import {
  calculateLiveSkillEffectValue,
  requireLiveSkillEffectDetails,
  requireLiveSkillEffectDetailValue,
} from '../skills/skillEffectValue.ts';
