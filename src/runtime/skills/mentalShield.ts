import type { LiveSkillEffectClock } from './skillEffectDuration.ts';
import type { LiveSkillEffect } from './skillTypes.ts';
import {
  advanceLiveSkillEffectDuration,
  createLiveSkillEffectDuration,
  type LiveSkillEffectDuration,
} from './skillEffectDuration.ts';
import type { LiveSkillEffectPower } from './skillEffectPower.ts';
import { validateLiveSkillEffectPower } from './skillEffectPower.ts';
import { calculateLiveSkillMoodCorrection } from '../live/skillMood.ts';
import {
  requireLiveSkillEffectDetails,
  requireLiveSkillEffectDetailValue,
} from './skillEffectValue.ts';

type LiveMentalShieldDurability =
  | Readonly<{ kind: 'finite'; remaining: number }>
  | Readonly<{ kind: 'infinite' }>;

export type LiveMentalShield = Readonly<{
  effectId: string;
  durability: LiveMentalShieldDurability;
  remainingApplications: number;
  duration: LiveSkillEffectDuration;
}>;

export type LiveMentalShieldState = readonly LiveMentalShield[];

export function createLiveMentalShieldState(): LiveMentalShieldState {
  return [];
}

export function activateLiveMentalShield(
  state: LiveMentalShieldState,
  effect: LiveSkillEffect,
  input: Readonly<{
    currentTimeSeconds: number;
    currentMoodValue: number;
    maximumMental: number;
    power: LiveSkillEffectPower;
    applySkillBoost: (value: number) => number;
  }>,
): Readonly<{
  state: LiveMentalShieldState;
  effectAmount: number;
}> {
  if (effect.actionType !== 56) {
    throw new Error('Live Mental Shield action type differs');
  }
  if (!Number.isSafeInteger(input.maximumMental) || input.maximumMental < 0) {
    throw new Error('Live Mental Shield maximum Mental is invalid');
  }
  validateLiveSkillEffectPower(input.power, 'Mental Shield');
  const details = requireLiveSkillEffectDetails(
    effect.details,
    [
      'MENTAL_SHIELD_DURABILITY_TYPE',
      'MENTAL_SHIELD_DURABILITY',
      'MENTAL_SHIELD_DURABILITY_MOOD_MODIFYER',
      'MENTAL_SHIELD_DISPLAY_TIME_TYPE',
      'MENTAL_SHIELD_DISPLAY_TIME',
      'MENTAL_SHIELD_APPLY_COUNT',
    ],
    'Mental Shield',
  );
  const durabilityType = requireValue(details, 'MENTAL_SHIELD_DURABILITY_TYPE');
  if (durabilityType !== 1 && durabilityType !== 2 && durabilityType !== 3) {
    throw new Error('Live Mental Shield durability type differs');
  }
  const remainingApplications = requireValue(details, 'MENTAL_SHIELD_APPLY_COUNT');
  if (remainingApplications < 1) {
    throw new Error('Live Mental Shield application count is invalid');
  }
  const calculatedValue = calculateDurability(details, input);
  const durabilityValue =
    durabilityType === 1
      ? Math.fround(Math.fround(calculatedValue / 100) * input.maximumMental)
      : calculatedValue;
  const boostedValue = Math.ceil(input.applySkillBoost(durabilityValue));
  if (!Number.isFinite(boostedValue) || boostedValue < 0) {
    throw new Error('Live Mental Shield durability is invalid');
  }
  const durability: LiveMentalShieldDurability =
    durabilityType === 3 ? { kind: 'infinite' } : { kind: 'finite', remaining: boostedValue };
  return {
    effectAmount: durability.kind === 'finite' ? durability.remaining : 0,
    state: [
      ...state,
      {
        effectId: effect.id,
        durability,
        remainingApplications,
        duration: createLiveSkillEffectDuration(
          requireValue(details, 'MENTAL_SHIELD_DISPLAY_TIME_TYPE'),
          requireValue(details, 'MENTAL_SHIELD_DISPLAY_TIME'),
          'Mental Shield',
        ),
      },
    ],
  };
}

export function advanceLiveMentalShieldState(
  state: LiveMentalShieldState,
  input: LiveSkillEffectClock,
): LiveMentalShieldState {
  return state.flatMap((shield) => {
    const duration = advanceLiveSkillEffectDuration(shield.duration, input);
    return duration === null ? [] : [{ ...shield, duration }];
  });
}

export function applyLiveMentalShieldDamage(
  state: LiveMentalShieldState,
  damage: number,
): Readonly<{
  state: LiveMentalShieldState;
  remainingDamage: number;
}> {
  if (!Number.isSafeInteger(damage) || damage < 0) {
    throw new Error('Live Mental Shield damage is invalid');
  }
  let remainingDamage = damage;
  const remainingShields = [...state];
  while (remainingDamage > 0 && remainingShields.length > 0) {
    const shield = remainingShields[0];
    if (shield === undefined) break;
    if (shield.remainingApplications < 1) {
      remainingShields.shift();
      continue;
    }
    if (shield.durability.kind === 'infinite') {
      return { state: remainingShields, remainingDamage: 0 };
    }
    if (shield.durability.remaining <= remainingDamage) {
      remainingDamage -= shield.durability.remaining;
      remainingShields.shift();
      continue;
    }
    const remainingApplications = shield.remainingApplications - 1;
    remainingShields.shift();
    if (remainingApplications > 0) {
      remainingShields.unshift({
        ...shield,
        durability: {
          kind: 'finite',
          remaining: shield.durability.remaining - remainingDamage,
        },
        remainingApplications,
      });
    }
    remainingDamage = 0;
  }
  return { state: remainingShields, remainingDamage };
}

function calculateDurability(
  details: ReadonlyMap<string, LiveSkillEffect['details'][number]>,
  input: Readonly<{
    currentMoodValue: number;
    power: LiveSkillEffectPower;
  }>,
): number {
  const mood = details.get('MENTAL_SHIELD_DURABILITY_MOOD_MODIFYER');
  if (mood === undefined) {
    throw new Error('Live Mental Shield durability mood is absent');
  }
  const baseValue = Math.fround(requireValue(details, 'MENTAL_SHIELD_DURABILITY') / 10_000);
  const moodValue = calculateLiveSkillMoodCorrection(
    mood.targetMood,
    input.currentMoodValue,
    mood.effectValue / 10_000,
  );
  return Math.fround(
    Math.fround(
      Math.fround(Math.fround(baseValue + moodValue) + input.power.addValue) *
        input.power.multiplyFactor,
    ) * input.power.effectPower,
  );
}

function requireValue(
  details: ReadonlyMap<string, LiveSkillEffect['details'][number]>,
  name: string,
): number {
  return requireLiveSkillEffectDetailValue(details, name, 'Mental Shield');
}
