import { boardCardIds } from './deckBoard.ts';
import { liveBoardState } from '../../runtime/cards/deckBoardState.ts';
import { applyAction52SkillBoost } from '../effects/action52SkillBoost.ts';
import type { Card, GameState } from '../model.ts';
import type { DeckSkillCostChangeEffect } from '../skillCostChangeTypes.ts';

export function applyDeckSkillCostChange(
  state: GameState,
  effect: DeckSkillCostChangeEffect,
  source: Card | undefined,
  multiplier: number,
  addValue: number,
): GameState {
  const deckIds = new Set(boardCardIds(state, liveBoardState.deck));
  const candidates =
    effect.targetRange === 2
      ? state.hand.flatMap((id) => state.deck.filter((card) => card.cardInstanceId === id))
      : effect.targetRange === 3
        ? state.deck.filter((card) => deckIds.has(card.cardInstanceId))
        : state.deck;
  const targets = candidates.filter((card) => {
    switch (effect.target) {
      case 'all':
        return true;
      case 'member':
        return card.charactersId === effect.targetId;
      case 'main-effect':
        return card.skillMainEffect === effect.targetId;
      case 'unit':
        return card.unitIds.includes(effect.targetId);
      case 'token-series':
        return card.tokenSeriesIds?.includes(effect.targetId) === true;
    }
  });
  if (targets.length === 0) return state;
  const rawNum = Number(BigInt.asIntN(32, BigInt(Math.trunc(effect.num))));
  let next = state;
  let amount: number;
  if (rawNum < 0) {
    if (!source) throw new Error('デッキカードのスキルコスト変更元がありません。');
    const base = Math.fround(Math.abs(Math.fround(rawNum - addValue)) * Math.fround(multiplier));
    const boosted = applyAction52SkillBoost(next, source, base);
    next = boosted.state;
    const buffValue = toInt32(boosted.value);
    amount = -toInt32(Math.fround(buffValue / 10_000));
  } else {
    amount = toInt32(Math.fround(rawNum / 10_000));
  }
  return {
    ...next,
    onceSkillCostChanges: targets.reduce(
      (changes, card) => ({
        ...changes,
        [card.cardInstanceId]: (changes[card.cardInstanceId] ?? 0) + amount,
      }),
      next.onceSkillCostChanges,
    ),
  };
}

function toInt32(value: number): number {
  if (!Number.isFinite(value) || value < -2_147_483_648 || value > 2_147_483_647)
    return -2_147_483_648;
  return Math.trunc(value);
}
