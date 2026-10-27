import { beatHeartCount } from '../beat.ts';
import { addHearts, addHeartsWithLifeTime } from '../hearts.ts';
import { applyAction52SkillBoostForCard } from './action52SkillBoost.ts';
import { skillValue } from './skillValue.ts';
import { applyAdditionalBuff } from './additionalBuff.ts';
import type { Card, GameState } from '../model.ts';

export function createSkillHearts(
  state: GameState,
  count: number,
  lifetimeSeconds: number,
): GameState {
  const base = Math.max(0, count);
  return addHeartsWithLifeTime(state, Math.max(1, Math.trunc(base)), lifetimeSeconds);
}

export function createHeartsFromEffect(
  state: GameState,
  amount: number,
  card: Card | undefined,
  byBeat: boolean,
  effectPower = 1,
  lifetimeSeconds?: number,
): GameState {
  const percent = state.deck.reduce(
    (sum, item) =>
      sum +
      (state.handEffectCardIds.includes(item.id) && item.passive
        ? skillValue(state, item.passive.heartsPercent ?? 0, {
            kind: 'amplify',
            percent: item.passive.heartsPercent ?? 0,
            ...(item.passive.moodBonus ? { moodBonus: item.passive.moodBonus } : {}),
          })
        : 0),
    100,
  );
  const beats = byBeat ? beatHeartCount(state) : 1;
  const base = Math.ceil((amount * percent * beats) / 100);
  const additional = applyAdditionalBuff(state, 'attract', base, card);
  const action52 = applyAction52SkillBoostForCard(additional.state, card, additional.value);
  const scaled = Math.ceil(action52.value) * Math.fround(effectPower);
  const count = Math.max(1, ceilHeartCount(scaled));
  return lifetimeSeconds === undefined
    ? addHearts(action52.state, count)
    : addHeartsWithLifeTime(action52.state, count, lifetimeSeconds);
}

export function ceilHeartCount(value: number): number {
  if (value === Number.POSITIVE_INFINITY) return -2_147_483_648;
  if (Number.isNaN(value)) return 0;
  return Math.min(2_147_483_647, Math.max(-2_147_483_648, Math.ceil(value)));
}
