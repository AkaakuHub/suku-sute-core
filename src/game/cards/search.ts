import { drawCandidate, drawWeight } from './drawLottery.ts';
import type { Card, GameState, SearchRequest, SearchTarget } from '../model.ts';

function matches(card: Card, target: SearchTarget): boolean {
  switch (target.kind) {
    case 'skill-icon':
      return card.skillIcon === target.icon;
    case 'main-effect':
      return card.mainEffect === target.actionType;
    case 'member':
      return card.charactersId === target.member;
    case 'unit':
      return card.unitIds.includes(target.unit);
    case 'token-series':
      return card.tokenSeriesIds?.includes(target.seriesId) ?? false;
    case 'token':
      return card.token === target.token;
  }
}

function candidates(state: GameState, ids: readonly string[], target: SearchTarget): string[] {
  return state.deck
    .filter((card) => ids.includes(card.id) && matches(card, target))
    .map((card) => card.id);
}

export function consumeSearch(
  state: GameState,
  randomIndex: (maximumExclusive: number) => number,
): Readonly<{ state: GameState; selected: string | null }> {
  let next = state;
  for (const scope of ['grade', 'section', 'skill'] as const) {
    const index = next.deckActions.searches.findLastIndex((search) => search.scope === scope);
    if (index < 0) continue;
    const search: SearchRequest | undefined = next.deckActions.searches[index];
    if (!search) throw new Error('検索指定がありません。');
    next = {
      ...next,
      deckActions: {
        ...next.deckActions,
        searches: next.deckActions.searches.filter((_, position) => position !== index),
      },
    };
    const inDeck = candidates(next, next.drawPile, search.target);
    const matched =
      inDeck.length > 0
        ? inDeck
        : scope === 'skill'
          ? []
          : candidates(next, next.discard, search.target);
    if (matched.length === 0) continue;
    return {
      state: next,
      selected: drawCandidate(
        matched.map((id) => {
          const card = next.deck.find((item) => item.id === id);
          if (!card) throw new Error('検索対象のカードがありません。');
          return { id, weight: drawWeight(card, next) };
        }),
        randomIndex,
      ),
    };
  }
  return { state: next, selected: null };
}

export function deactivateSearchRequests(state: GameState, deactivationKey: string): GameState {
  return {
    ...state,
    deckActions: {
      ...state.deckActions,
      searches: state.deckActions.searches.filter(
        (search) => search.deactivationKey !== deactivationKey,
      ),
    },
  };
}
