import { createLiveDeckDrawContextState } from '../../runtime/cards/cardDraw.ts';
import { enqueueLiveReshuffle, flushLiveDeckActions } from '../../runtime/cards/deckActionQueue.ts';
import { applyEffect } from '../effects.ts';
import { notifyDeckReload } from '../effects/deckOutCheck.ts';
import type { GameState, HandShuffle } from '../model.ts';
import { fillHandToCount, resetHandCardCount, shuffleHand } from './drawing.ts';

export function flushDeckActions(state: GameState): GameState {
  return flushLiveDeckActions(state, resetHandCardCount, {
    afterDeckReload: (current) => notifyDeckReload(current, applyEffect),
    reshuffle: {
      activeHandCardInstanceIds: (current) => [
        ...(current.activation?.usedCards ?? []),
        ...current.hand,
      ],
      draw: (current, action) => {
        const source =
          action.cardInstanceId === null
            ? null
            : current.cardPool.find((card) => card.cardInstanceId === action.cardInstanceId);
        if (source === undefined) throw new Error('引き直しを発動したカードがありません。');
        const shuffled = shuffleHand(current, {
          recoverDiscard: action.effect.recoveryType === 'recovery',
          destination: action.effect.stashType === 'deck' ? 'draw' : 'discard',
        });
        return fillHandToCount(
          {
            ...shuffled,
            deckDrawContext: source
              ? {
                  currentDrawType: 1 as const,
                  usedCard: source,
                  usedSkill: action.usedSkill,
                }
              : createLiveDeckDrawContextState(3),
          },
          current.hand.length,
        );
      },
    },
  });
}

export function enqueueHandShuffle(
  state: GameState,
  options: HandShuffle,
  sourceId: string | null,
  skipSourceRefill = false,
): GameState {
  const source =
    sourceId === null ? null : state.cardPool.find((card) => card.cardInstanceId === sourceId);
  if (source === undefined) throw new Error('引き直しを発動したカードがありません。');
  const skillType = state.currentSkillType;
  if (skillType !== null && skillType !== 1 && skillType !== 2 && skillType !== 3)
    throw new Error('使用中のスキル種別が正しくありません。');
  const activation = state.activation;
  return enqueueLiveReshuffle(
    {
      ...state,
      ...(activation
        ? {
            activation: {
              ...activation,
              skipSourceRefill: activation.skipSourceRefill || skipSourceRefill,
            },
          }
        : {}),
    },
    {
      cardInstanceId: sourceId,
      usedSkill:
        source && skillType !== null
          ? { skillType, skillMainEffect: source.skillMainEffect }
          : null,
      countDeckOut: true,
      effect: {
        recoveryType: options.recoverDiscard ? 'recovery' : 'no-recovery',
        stashType: options.destination === 'draw' ? 'deck' : 'graveyard',
      },
    },
  );
}
