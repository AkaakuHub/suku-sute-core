import { setCardSkillUseAtBoardState } from './skillUseAtBoardState.ts';
import { liveBoardState } from '../../runtime/cards/deckBoardState.ts';
import type { Card, GameState } from '../model.ts';
import { applyEffect } from '../effects.ts';
import { beginTokenGeneration, finishTokenGeneration } from './tokens.ts';
import type { EffectApplier } from '../effects/induceSkillEffect.ts';
export { notifyHandCardBeforeUse, notifyHandSkillUse } from './handInduce.ts';

export function applyAbilityEffects(
  state: GameState,
  card: Card,
  effects: readonly import('../model').Effect[],
  apply: EffectApplier,
): GameState {
  let next = beginTokenGeneration(state, card.cardInstanceId);
  for (const effect of effects) next = apply(next, effect, card);
  return finishTokenGeneration(next, card.cardInstanceId).state;
}

export function applyUseAbility(state: GameState, card: Card): GameState {
  let next = state;
  const count = state.cardUseCounts[card.cardInstanceId] ?? 0;
  if (card.useAbility === 'class' && count === 3)
    next = applyEffect(
      next,
      { kind: 'reset-special', scope: 'normal', target: { kind: 'all' } },
      card,
    );
  if (card.useAbility === 'shadow' && count === 14) {
    next = applyEffect(next, { kind: 'protect-mental' }, card);
    next = applyEffect(
      next,
      { kind: 'mental', amount: -1000, moodBonus: { target: 3, perPoint: -5 } },
      card,
    );
    next = applyEffect(next, { kind: 'voltage-set', amount: 655000001 }, card);
  }
  if (
    card.exhausts ||
    (card.useAbility === 'class' && count >= 3) ||
    (card.useAbility === 'shadow' && count >= 14)
  ) {
    if (!next.activation) throw new Error('カードの使用処理がありません。');
    next = setCardSkillUseAtBoardState(next, card.cardInstanceId, liveBoardState.exclusion);
  }
  return next;
}
