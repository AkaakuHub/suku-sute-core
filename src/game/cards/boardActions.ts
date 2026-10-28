import { applyLiveAllHandSkillReshuffle } from '../../runtime/cards/reshuffle.ts';
import type { GameState, HandShuffle } from '../model.ts';
import { fillHandToCount, shuffleHand } from './drawing.ts';

export function flushDeckActions(state: GameState): GameState {
  let next = state;
  while (next.deckActions.shuffles.length) {
    const count = next.hand.length;
    const action = next.deckActions.shuffles[0];
    if (!action) throw new Error('引き直し処理がありません。');
    const id = action.sourceId;
    const source = id === null ? null : next.cardPool.find((card) => card.cardInstanceId === id);
    if (source === undefined) throw new Error('引き直しを発動したカードがありません。');
    if (next.tokenCardDeck.isAllHandSkill) {
      const changed = applyLiveAllHandSkillReshuffle(
        next.deckBoard,
        next.tokenCardDeck,
        [...(next.activation?.usedCards ?? []), ...next.hand],
        {
          cardInstanceId: id,
          skillMainEffect: source?.skillMainEffect ?? null,
          effect: {
            effectId: 'shuffle',
            recoveryType: action.options.recoverDiscard ? 'recovery' : 'no-recovery',
            stashType: action.options.destination === 'draw' ? 'deck' : 'graveyard',
          },
        },
      );
      next = {
        ...next,
        deckBoard: changed.deckBoard,
        tokenCardDeck: changed.state,
        deckActions: { ...next.deckActions, shuffles: next.deckActions.shuffles.slice(1) },
      };
      continue;
    }
    const shuffled = shuffleHand(
      {
        ...next,
        deckActions: { ...next.deckActions, shuffles: next.deckActions.shuffles.slice(1) },
      },
      action.options,
    );
    next = fillHandToCount(
      {
        ...shuffled,
        drawContext: source ? 'skill' : 'shuffle',
        usedCard: source,
        lastUsedSkillIcon: source?.skillIcon ?? null,
      },
      count,
    );
  }
  return next;
}

export function enqueueHandShuffle(
  state: GameState,
  options: HandShuffle,
  sourceId: string | null,
  skipSourceRefill = false,
): GameState {
  const activation = state.activation;
  return {
    ...state,
    ...(activation
      ? {
          activation: {
            ...activation,
            skipSourceRefill: activation.skipSourceRefill || skipSourceRefill,
          },
        }
      : {}),
    deckActions: {
      ...state.deckActions,
      shuffles: [...state.deckActions.shuffles, { sourceId, options, skipSourceRefill }],
    },
  };
}
