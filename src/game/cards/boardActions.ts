import { liveBoardState } from '../../runtime/cards/deckBoardState.ts';
import { setCardSkillUseAtBoardState } from './skillUseAtBoardState.ts';
import type { GameState, HandShuffle } from '../model.ts';
import { fillHandToCount, shuffleHand } from './drawing.ts';

export function flushDeckActions(state: GameState): GameState {
  let next = state;
  while (next.deckActions.shuffles.length) {
    const count = next.hand.length;
    const action = next.deckActions.shuffles[0];
    if (!action) throw new Error('引き直し処理がありません。');
    const id = action.sourceId;
    const source = id === null ? null : next.cardPool.find((card) => card.id === id);
    if (source === undefined) throw new Error('引き直しを発動したカードがありません。');
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
  if (!activation?.allHand)
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
  let next = state;
  if (options.destination === 'draw') {
    for (const id of [...activation.usedCards, ...state.hand]) {
      if (id !== sourceId) next = setCardSkillUseAtBoardState(next, id, liveBoardState.deck);
    }
  }
  return {
    ...next,
    activation: {
      ...activation,
      skipSourceRefill: activation.skipSourceRefill || skipSourceRefill,
      recoverDiscard: activation.recoverDiscard || options.recoverDiscard,
    },
  };
}
