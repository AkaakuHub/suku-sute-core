import { calculateLiveSkillMoodCorrection } from '../../runtime/live/skillMood.ts';
import { moodValue } from '../projection.ts';
import type { MentalShield, MentalShieldEffect } from '../mentalShieldTypes.ts';
import { rules, type Card, type GameState } from '../model.ts';
import { applyAction52SkillBoostForCard } from './action52SkillBoost.ts';

export function activateMentalShield(
  state: GameState,
  effect: MentalShieldEffect,
  card: Card | undefined,
  multiplier: number,
  addValue: number,
  effectPower: number,
): GameState {
  const durabilityType = int32(effect.durabilityType);
  const durability = int32(effect.durability);
  const applyCount = int32(effect.applyCount);
  const durationValue = effect.duration.kind === 'stage' ? 0 : int32(effect.duration.value);
  const moodCorrection = effect.moodBonus
    ? calculateLiveSkillMoodCorrection(
        effect.moodBonus.target,
        moodValue(state),
        Math.fround(
          Number(
            BigInt.asIntN(
              32,
              effect.moodBonus.perPointLong ?? BigInt(Math.trunc(effect.moodBonus.perPoint)),
            ),
          ),
        ),
      )
    : 0;
  const rawDurability = Math.fround(Math.fround(durability) / 10_000);
  const rawAddValue = Math.fround(Math.fround(addValue) / 10_000);
  let value: number;
  if (durabilityType === 1) {
    const ratio = Math.fround(
      Math.fround(Math.fround(moodCorrection / 100) + Math.fround(rawDurability / 100)) +
        Math.fround(rawAddValue / 100),
    );
    value = Math.fround(
      Math.fround(Math.fround(ratio * Math.fround(multiplier)) * state.maximumMental) *
        Math.fround(effectPower),
    );
  } else if (durabilityType === 2) {
    value = Math.fround(
      Math.fround(Math.fround(moodCorrection + rawDurability) + rawAddValue) *
        Math.fround(multiplier),
    );
  } else {
    value = Math.fround(Math.fround(durability) * Math.fround(effectPower));
  }
  const boosted = applyAction52SkillBoostForCard(state, card, value);
  const shield: MentalShield = {
    durabilityType,
    durability: Math.trunc(boosted.value),
    applyCount,
    remainingSeconds:
      effect.duration.kind === 'milliseconds'
        ? Math.fround(durationValue / Math.fround(1000))
        : null,
    remainingSections: effect.duration.kind === 'sections' && hasFollowingSection(state) ? 1 : null,
  };
  return { ...boosted.state, mentalShields: [...boosted.state.mentalShields, shield] };
}

function int32(value: bigint): number {
  return Number(BigInt.asIntN(32, value));
}

export function advanceMentalShields(state: GameState, elapsedSeconds: number): GameState {
  return {
    ...state,
    mentalShields: state.mentalShields.flatMap((shield) => {
      if (shield.remainingSeconds === null) return [shield];
      const remainingSeconds = Math.fround(shield.remainingSeconds - Math.fround(elapsedSeconds));
      return remainingSeconds > 0 ? [{ ...shield, remainingSeconds }] : [];
    }),
  };
}

export function expireMentalShieldSections(state: GameState): GameState {
  return {
    ...state,
    mentalShields: state.mentalShields.flatMap((shield) => {
      if (shield.remainingSections === null) return [shield];
      const remainingSections = shield.remainingSections - 1;
      return remainingSections > 0 ? [{ ...shield, remainingSections }] : [];
    }),
  };
}

export function breakMentalShields(
  state: GameState,
  damage: number,
): Readonly<{ state: GameState; remainingDamage: number }> {
  const shields = [...state.mentalShields];
  let remainingDamage = damage;
  while (remainingDamage >= 1 && shields.length > 0) {
    const shield = shields[0];
    if (!shield) break;
    if (shield.durability > 0 && shield.applyCount >= 0) {
      if (shield.durabilityType === 3) return { state, remainingDamage: 0 };
      if (remainingDamage < shield.durability) {
        const durability = shield.durability - remainingDamage;
        if (shield.applyCount < 1) {
          shields[0] = { ...shield, durability };
          return { state: { ...state, mentalShields: shields }, remainingDamage: 0 };
        }
        const applyCount = shield.applyCount - 1;
        if (applyCount !== 0) {
          shields[0] = { ...shield, durability, applyCount };
          return { state: { ...state, mentalShields: shields }, remainingDamage: 0 };
        }
        shields.shift();
        return { state: { ...state, mentalShields: shields }, remainingDamage: 0 };
      }
      remainingDamage -= shield.durability;
    }
    shields.shift();
  }
  return { state: { ...state, mentalShields: shields }, remainingDamage };
}

function hasFollowingSection(state: GameState): boolean {
  const beat = (state.tick * state.track.bpm) / (60 * rules.ticksPerSecond);
  return state.track.sections.some((section) => section.startBeat > beat);
}
