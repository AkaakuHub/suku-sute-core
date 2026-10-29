import { liveCurrentHandCardInstanceIds } from '../../runtime/cards/liveHand.ts';
import type { Card, GameState } from '../model.ts';

type HandCollectionCard = Card &
  Readonly<{ collectionEffects: NonNullable<Card['collectionEffects']> }>;

export function advanceHandCollectionAbilities(
  state: GameState,
  count: number,
): Readonly<{ state: GameState; activated: readonly HandCollectionCard[] }> {
  const counts = { ...state.handHeartCollectCounts };
  const activationCounts = { ...state.handCollectionActivationCounts };
  const activated: HandCollectionCard[] = [];
  for (const id of liveCurrentHandCardInstanceIds(state)) {
    const card = state.deck.find((item) => item.cardInstanceId === id);
    if (!card) throw new Error('手札のカードがありません。');
    if (!canActivateHandCollectionAbility(state, card)) continue;
    const threshold = card.collectionEffects.threshold;
    const total = (counts[id] ?? 0) + count;
    counts[id] = total < threshold ? total : 0;
    if (total >= threshold) {
      activated.push(card);
      activationCounts[id] = (activationCounts[id] ?? 0) + 1;
    }
  }
  return {
    state: {
      ...state,
      handHeartCollectCounts: counts,
      handCollectionActivationCounts: activationCounts,
    },
    activated,
  };
}

export function canActivateHandCollectionAbility(
  state: Pick<GameState, 'handCollectionActivationCounts'>,
  card: Card,
): card is HandCollectionCard {
  const effects = card.collectionEffects;
  return (
    effects !== undefined &&
    effects.effects.length > 0 &&
    (effects.limit === undefined ||
      effects.limit === 0 ||
      (state.handCollectionActivationCounts[card.cardInstanceId] ?? 0) < effects.limit)
  );
}
