import { isLiveSkillCostOver } from '../runtime/live/skillCost.ts';
import { beginTokenGeneration, finishTokenGeneration } from './cards/tokens.ts';
import type { Card, GameState } from './model.ts';
import { applyEffect } from './effects.ts';
import { spendAp } from './resources.ts';
import { flushDeckActions } from './cards/boardActions.ts';
import { fillHand } from './cards/drawing.ts';
import { resolveModeSkill } from './live/modes.ts';
import { startSpecialAppealTokenCooldown } from './effects/specialAppealToken.ts';
import { notifyHandSkillUse } from './cards/handInduce.ts';

export function specialCards(state: GameState): readonly Card[] {
  const regularCards = state.deck
    .map((card) => resolveModeSkill(card, state.modes))
    .filter((card, index) => card.special && (index === 0 || card.special.extra));
  const tokenCards = state.specialAppealTokens.map(({ card }) =>
    resolveModeSkill(card, state.modes),
  );
  return [...regularCards, ...tokenCards];
}

export function specialCost(card: Card): number {
  if (!card.special) throw new Error('共鳴の効果がありません。');
  return card.special.cost;
}

export function isGenesisSpecial(card: Card): boolean {
  return card.special?.effects.some((effect) => effect.kind === 'genesis') ?? false;
}

export function canUseSpecial(state: GameState, cardId: string): boolean {
  const card = specialCards(state).find((item) => item.id === cardId);
  const token = state.specialAppealTokens.find((item) => item.card.id === cardId);
  return Boolean(
    card?.special &&
    (state.phase === 'playing' || state.phase === 'paused') &&
    !state.mental.mentalDown &&
    (token ? token.remainingCoolTime <= 0 : !state.specialUsed.includes(cardId)) &&
    !isLiveSkillCostOver({
      ap: state.ap,
      genesis: state.genesis,
      apInfinity: state.gaugeInfinities.some(
        (effect) => effect.gauge === 'ap' && !effect.suspended,
      ),
      consumeAp: specialCost(card),
    }),
  );
}

export function hasAvailableSpecial(state: GameState): boolean {
  return specialCards(state).some((card) => canUseSpecial(state, card.id));
}

export function specialButtonCard(state: GameState): Card | undefined {
  const cards = specialCards(state);
  return (
    cards.find((card) => canUseSpecial(state, card.id)) ??
    cards.find(
      (card) =>
        state.specialAppealTokens.some((token) => token.card.id === card.id) ||
        !state.specialUsed.includes(card.id),
    ) ??
    cards[0]
  );
}

export function useSpecial(state: GameState, cardId: string): GameState {
  if (state.phase !== 'playing' || !canUseSpecial(state, cardId)) return state;
  const card = specialCards(state).find((item) => item.id === cardId);
  const token = state.specialAppealTokens.find((item) => item.card.id === cardId);
  if (!card?.special) throw new Error('共鳴のカードがありません。');
  const previousSkillType = state.currentSkillType;
  let next = beginTokenGeneration(
    { ...spendAp(state, specialCost(card)), currentSkillType: 1 },
    card.id,
  );
  next = {
    ...next,
    skillActivationCounts: {
      ...next.skillActivationCounts,
      [card.id]: Number(BigInt.asIntN(32, BigInt((next.skillActivationCounts[card.id] ?? 0) + 1))),
    },
  };
  for (const effect of card.special.effects) next = applyEffect(next, effect, card);
  next = finishTokenGeneration(next, card.id).state;
  next = notifyHandSkillUse(next, card, applyEffect);
  if (token) next = startSpecialAppealTokenCooldown(next, token);
  const completed = flushDeckActions({
    ...next,
    currentSkillType: previousSkillType,
    specialUsed: token
      ? next.specialUsed
      : [...next.specialUsed.filter((id) => id !== cardId), cardId],
    stats: { ...next.stats, specialsUsed: next.stats.specialsUsed + 1 },
  });
  return fillHand(completed);
}
