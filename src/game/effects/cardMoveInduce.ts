import type { Card, GameState } from '../model.ts';
import type { CardMoveInduceEffect } from '../induceSkillEffectTypes.ts';
import type { EffectApplier } from './induceSkillEffect.ts';

export function activateCardMoveInduce(
  state: GameState,
  effect: CardMoveInduceEffect,
  card: Card | undefined,
): GameState {
  if (!card) throw new Error('カード移動誘発の発動元カードがありません。');
  const sourceEffectId = `${card.id}:${effect.sourceEffectId}`;
  if (state.cardMoveInducers.some((inducer) => inducer.sourceEffectId === sourceEffectId))
    return state;
  return {
    ...state,
    cardMoveInducers: [
      ...state.cardMoveInducers,
      {
        sourceCardId: card.id,
        sourceEffectId,
        targetEffectId: effect.targetEffectId,
        timing: effect.timing,
        limit: effect.limit,
        requireCount: effect.requireCount,
        effects: effect.effects,
        useCount: 0,
      },
    ],
  };
}

export function induceCardMoves(
  state: GameState,
  movedCardIds: ReadonlySet<string>,
  apply: EffectApplier,
): GameState {
  let next = state;
  for (const sourceEffectId of state.cardMoveInducers.map((inducer) => inducer.sourceEffectId)) {
    const inducer = next.cardMoveInducers.find((item) => item.sourceEffectId === sourceEffectId);
    if (
      !inducer ||
      inducer.timing !== 'stage-to-graveyard' ||
      !movedCardIds.has(inducer.sourceCardId) ||
      !next.proxyCards.includes(inducer.sourceCardId) ||
      next.skillUseDestinations[inducer.sourceCardId] !== undefined
    )
      continue;
    const useCount = int32(inducer.useCount + 1);
    next = updateInducer(next, sourceEffectId, { ...inducer, useCount });
    const limit = int32(inducer.limit);
    const activatedCount =
      inducer.targetEffectId === null
        ? 0
        : int32(
            next.skillEffectActivationCounts[`${inducer.sourceCardId}:${inducer.targetEffectId}`] ??
              0,
          );
    const requireCount = int32(inducer.requireCount);
    if (limit !== 0 && limit <= activatedCount) continue;
    if (requireCount !== 0 && useCount % requireCount !== 0) continue;
    if (inducer.targetEffectId === null || inducer.effects.length === 0) continue;
    const card = next.cardPool.find((item) => item.id === inducer.sourceCardId);
    if (!card) throw new Error('カード移動誘発の発動元カードがありません。');
    next = updateInducer(next, sourceEffectId, {
      ...inducer,
      useCount,
    });
    for (const effect of inducer.effects) next = apply(next, effect, card);
  }
  return next;
}

function int32(value: number | bigint): number {
  return Number(BigInt.asIntN(32, typeof value === 'bigint' ? value : BigInt(Math.trunc(value))));
}

function updateInducer(
  state: GameState,
  sourceEffectId: string,
  updated: GameState['cardMoveInducers'][number],
): GameState {
  let replaced = false;
  const cardMoveInducers = state.cardMoveInducers.map((inducer) => {
    if (replaced || inducer.sourceEffectId !== sourceEffectId) return inducer;
    replaced = true;
    return updated;
  });
  return replaced ? { ...state, cardMoveInducers } : state;
}
