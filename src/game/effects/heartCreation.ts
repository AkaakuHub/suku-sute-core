import { beatHeartCount } from '../beat.ts';
import { addHearts, addHeartsWithLifeTime } from '../hearts.ts';
import { applyAction52SkillBoostForCard } from './action52SkillBoost.ts';
import { skillValue } from './skillValue.ts';
import { applyAdditionalBuff } from './additionalBuff.ts';
import type { Card, GameState } from '../model.ts';
import { calculateLiveHeartCreateCount } from '../../runtime/live/heartCreation.ts';

export function createSkillHearts(
  state: GameState,
  count: number,
  lifetimeSeconds: number,
): GameState {
  return addHeartsWithLifeTime(state, calculateLiveHeartCreateCount(count, 1), lifetimeSeconds);
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
      (state.handEffectCardIds.includes(item.cardInstanceId) && item.passive
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
  const count = calculateLiveHeartCreateCount(action52.value, effectPower);
  return lifetimeSeconds === undefined
    ? addHearts(action52.state, count)
    : addHeartsWithLifeTime(action52.state, count, lifetimeSeconds);
}
