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
        lastUsedMember: source?.member ?? null,
        lastUsedUnit: source?.unit ?? null,
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
  return {
    ...state,
    activation: {
      ...activation,
      skipSourceRefill: activation.skipSourceRefill || skipSourceRefill,
      recoverDiscard: activation.recoverDiscard || options.recoverDiscard,
      returnToDraw:
        options.destination === 'draw'
          ? [
              ...new Set([
                ...activation.returnToDraw,
                ...[...activation.usedCards, ...state.hand].filter(
                  (id) => id !== sourceId && state.skillUseDestinations[id] !== 'proxy',
                ),
              ]),
            ]
          : activation.returnToDraw,
    },
  };
}
