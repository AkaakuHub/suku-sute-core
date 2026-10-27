import type { Card, GameState } from '../model.ts';

export function advanceHandCollectionAbilities(
  state: GameState,
  count: number,
): Readonly<{ state: GameState; activated: readonly Card[] }> {
  const counts = { ...state.handHeartCollectCounts };
  const activationCounts = { ...state.handCollectionActivationCounts };
  const activated: Card[] = [];
  for (const id of state.hand) {
    const card = state.deck.find((item) => item.id === id);
    if (!card) throw new Error('手札のカードがありません。');
    const collectionEffects = card.collectionEffects;
    if (state.relayUsed.includes(id) && !collectionEffects) continue;
    if (collectionEffects?.effects.length === 0) continue;
    const activationCount = activationCounts[id] ?? 0;
    if (
      collectionEffects?.limit !== undefined &&
      collectionEffects.limit !== 0 &&
      activationCount >= collectionEffects.limit
    )
      continue;
    const threshold =
      card.relay?.threshold ??
      collectionEffects?.threshold ??
      (card.token === 'story' || card.token === 'bookmark' || card.collectionAbility
        ? 500_000
        : null);
    if (threshold === null) continue;
    const total = (counts[id] ?? 0) + count;
    counts[id] = total < threshold ? total : 0;
    if (total >= threshold) {
      activated.push(card);
      if (collectionEffects) activationCounts[id] = activationCount + 1;
    }
  }
  return {
    state: {
      ...state,
      handHeartCollectCounts: counts,
      handCollectionActivationCounts: activationCounts,
      relayUsed: [
        ...state.relayUsed,
        ...activated.filter((card) => !card.collectionEffects).map((card) => card.id),
      ],
    },
    activated,
  };
}
