import {
  type LiveAdditionalBuffCard,
  type LiveAdditionalBuffTarget,
  liveAdditionalBuffTargetMatches,
  resolveLiveAdditionalBuffTarget,
  validateLiveAdditionalBuffCard,
} from './additionalBuffTarget.ts';
import type { LiveSkillEffect } from './skillTypes.ts';
import {
  advanceLiveSkillEffectDuration,
  createLiveSkillEffectDuration,
  type LiveSkillEffectDuration,
} from './skillEffectDuration.ts';
import { calculateLiveSkillMoodCorrection } from '../live/skillMood.ts';

export type LiveSkillBoostEffect = Readonly<{
  effectId: string;
  boostPercent: number;
  target: LiveAdditionalBuffTarget;
  skillTokenCardSeriesIds: readonly number[];
  remainingUses: number | null;
  duration: LiveSkillEffectDuration;
}>;

export type LiveSkillBoostState = Readonly<{
  effects: readonly LiveSkillBoostEffect[];
}>;

export type LiveSkillBoostCard = LiveAdditionalBuffCard;

export function createLiveSkillBoostState(): LiveSkillBoostState {
  return { effects: [] };
}

export function createLiveSkillBoostEffect(
  effect: LiveSkillEffect,
  currentTimeSeconds: number,
  currentMoodValue: number,
): LiveSkillBoostEffect | null {
  if (
    effect.actionType !== 52 ||
    !Number.isFinite(currentTimeSeconds) ||
    !Number.isSafeInteger(currentMoodValue)
  ) {
    throw new Error('Live SkillBoost input is invalid');
  }
  const details = requireSkillBoostDetails(effect);
  const boostType = requireInteger(details, 'SKILL_BOOST_TYPE');
  if (boostType !== 1) return null;
  const basePercent = Math.fround(requireInteger(details, 'SKILL_BOOST_NUM') / 10_000);
  const bonusMood = requireDetail(details, 'SKILL_BOOST_BONUS_MOOD');
  const boostPercent = Math.fround(
    basePercent +
      calculateLiveSkillMoodCorrection(
        bonusMood.targetMood,
        currentMoodValue,
        bonusMood.effectValue / 10_000,
      ),
  );
  const expireType = requireInteger(details, 'SKILL_BOOST_EXPIRE_TYPE');
  if (expireType !== 0 && expireType !== 1) {
    throw new Error('Live SkillBoost expire type is invalid');
  }
  const expireValue = requireInteger(details, 'SKILL_BOOST_EXPIRE_VALUE');
  if (expireType === 1 && expireValue < 1) {
    throw new Error('Live SkillBoost expire value is invalid');
  }
  return {
    effectId: effect.id,
    boostPercent,
    target: resolveLiveAdditionalBuffTarget(
      requireInteger(details, 'SKILL_BOOST_TARGET_TYPE'),
      requireInteger(details, 'SKILL_BOOST_TARGET_ID'),
      'SkillBoost',
    ),
    skillTokenCardSeriesIds: requireTokenCardSeriesIds(details),
    remainingUses: expireType === 1 ? expireValue : null,
    duration: createLiveSkillEffectDuration(
      requireInteger(details, 'SKILL_BOOST_DISPLAY_TIME_TYPE'),
      requireInteger(details, 'SKILL_BOOST_DISPLAY_TIME_VALUE'),
      currentTimeSeconds,
      'SkillBoost',
    ),
  };
}

export function activateLiveSkillBoostEffect(
  state: LiveSkillBoostState,
  effect: LiveSkillBoostEffect,
): LiveSkillBoostState {
  validateState(state);
  return { effects: [...state.effects, effect] };
}

export function advanceLiveSkillBoostState(
  state: LiveSkillBoostState,
  input: Readonly<{
    currentTimeSeconds: number;
    sectionChangeCount: number;
    musicEnded: boolean;
  }>,
): LiveSkillBoostState {
  validateState(state);
  return {
    effects: state.effects.flatMap((effect) => {
      const duration = advanceLiveSkillEffectDuration(effect.duration, input);
      return duration === null ? [] : [{ ...effect, duration }];
    }),
  };
}

export function applyLiveSkillBoosts(
  state: LiveSkillBoostState,
  card: LiveSkillBoostCard,
  value: number,
): Readonly<{ state: LiveSkillBoostState; value: number }> {
  validateState(state);
  validateLiveAdditionalBuffCard(card);
  if (!Number.isFinite(value)) {
    throw new Error('Live SkillBoost value is invalid');
  }
  if (value <= 0) {
    return { state, value };
  }
  const matchingIds = new Set(
    state.effects
      .filter((effect) => skillBoostMatches(effect, card))
      .map((effect) => effect.effectId),
  );
  const boostPercent = state.effects.reduce(
    (sum, effect) =>
      matchingIds.has(effect.effectId) ? Math.fround(sum + effect.boostPercent) : sum,
    0,
  );
  const clampedPercent = Math.max(boostPercent, -100);
  return {
    value: Math.fround(value + (value * clampedPercent) / 100),
    state: {
      effects: state.effects.flatMap((effect) => {
        if (!matchingIds.has(effect.effectId) || effect.remainingUses === null) {
          return [effect];
        }
        const remainingUses = effect.remainingUses - 1;
        return remainingUses < 1 ? [] : [{ ...effect, remainingUses }];
      }),
    },
  };
}

function skillBoostMatches(effect: LiveSkillBoostEffect, card: LiveSkillBoostCard): boolean {
  return liveAdditionalBuffTargetMatches(effect.target, card, effect.skillTokenCardSeriesIds);
}

function requireSkillBoostDetails(
  effect: LiveSkillEffect,
): ReadonlyMap<string, LiveSkillEffect['details'][number]> {
  const names = [
    'SKILL_BOOST_TYPE',
    'SKILL_BOOST_NUM',
    'SKILL_BOOST_BONUS_MOOD',
    'SKILL_BOOST_DISPLAY_TIME_TYPE',
    'SKILL_BOOST_DISPLAY_TIME_VALUE',
    'SKILL_BOOST_EXPIRE_TYPE',
    'SKILL_BOOST_EXPIRE_VALUE',
    'SKILL_BOOST_TARGET_TYPE',
    'SKILL_BOOST_TARGET_ID',
    'SKILL_BOOST_TOKEN_CARD_SERIES_ID',
  ] as const;
  const details = new Map(effect.details.map((detail) => [detail.detailType, detail]));
  if (
    effect.details.length !== names.length ||
    details.size !== names.length ||
    names.some((name) => !details.has(name)) ||
    effect.details.some(
      (detail) =>
        !Number.isSafeInteger(detail.targetMood) ||
        !Number.isSafeInteger(detail.effectValue) ||
        (detail.detailType !== 'SKILL_BOOST_TOKEN_CARD_SERIES_ID' && detail.params.length !== 0),
    )
  ) {
    throw new Error('Live SkillBoost details differ');
  }
  return details;
}

function requireDetail(
  details: ReadonlyMap<string, LiveSkillEffect['details'][number]>,
  name: string,
): LiveSkillEffect['details'][number] {
  const detail = details.get(name);
  if (detail === undefined) {
    throw new Error(`Live SkillBoost detail is absent:${name}`);
  }
  return detail;
}

function requireInteger(
  details: ReadonlyMap<string, LiveSkillEffect['details'][number]>,
  name: string,
): number {
  const value = requireDetail(details, name).effectValue;
  if (!Number.isSafeInteger(value)) {
    throw new Error(`Live SkillBoost detail is invalid:${name}`);
  }
  return value;
}

function requireTokenCardSeriesIds(
  details: ReadonlyMap<string, LiveSkillEffect['details'][number]>,
): readonly number[] {
  const values = requireDetail(details, 'SKILL_BOOST_TOKEN_CARD_SERIES_ID').params.map((param) => {
    if (
      param.paramType !== 'SKILL_BOOST_TOKEN_CARD_SERIES_ID' ||
      !/^[1-9]\d*$/.test(param.paramValue)
    ) {
      throw new Error('Live SkillBoost token CardSeries.Id is invalid');
    }
    const value = Number(param.paramValue);
    if (!Number.isSafeInteger(value)) {
      throw new Error('Live SkillBoost token CardSeries.Id is invalid');
    }
    return value;
  });
  if (new Set(values).size !== values.length) {
    throw new Error('Live SkillBoost token CardSeries.Id is duplicated');
  }
  return values;
}

function validateState(state: LiveSkillBoostState): void {
  if (
    state.effects.some(
      (effect) =>
        !Number.isFinite(effect.boostPercent) ||
        (effect.remainingUses !== null &&
          (!Number.isSafeInteger(effect.remainingUses) || effect.remainingUses < 1)),
    )
  ) {
    throw new Error('Live SkillBoost state is invalid');
  }
}
