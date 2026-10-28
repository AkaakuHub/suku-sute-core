import type { Card, GameState, TokenBoost } from '../model.ts';
import type { TokenRequest } from '../tokenRequestTypes.ts';

function matches(boost: TokenBoost, source: Card | undefined, request: TokenRequest): boolean {
  const target = boost.target;
  const targetMatches =
    target.kind === 'all' ||
    (source !== undefined &&
      (target.kind === 'member'
        ? source.charactersId === target.member
        : target.kind === 'unit'
          ? source.unitIds.includes(target.unit)
          : source.tokenCardSeriesIds.includes(target.seriesId)));
  return (
    targetMatches &&
    (boost.seriesIds === undefined ||
      (request.seriesIds !== undefined &&
        request.seriesIds.some((id) => boost.seriesIds?.includes(id))))
  );
}

export function boostTokenRequests(
  state: GameState,
  requests: readonly TokenRequest[],
  sourceId: string | null,
  grouped: boolean,
): Readonly<{ state: GameState; counts: readonly number[] }> {
  const source =
    sourceId === null
      ? undefined
      : (state.cardPool.find((card) => card.cardInstanceId === sourceId) ??
        state.specialAppealTokens.find((token) => token.card.cardInstanceId === sourceId)?.card);
  if (sourceId !== null && !source) throw new Error('追加カードを生成するカードがありません。');
  const used = new Set<number>();
  const counts = requests.map((request) => {
    const matching =
      request.count > 0
        ? state.tokenBoosts.flatMap((boost, index) =>
            matches(boost, source, request) ? [{ boost, index }] : [],
          )
        : [];
    for (const { index } of matching) used.add(index);
    let value = Math.fround(request.count);
    for (const { boost } of matching) {
      if (boost.calculation === 'add') value = Math.fround(value + Math.fround(boost.value));
    }
    const percent = matching.reduce(
      (sum, { boost }) =>
        boost.calculation === 'multiply-percent'
          ? Math.fround(sum + Math.fround(boost.value))
          : sum,
      0,
    );
    value = Math.fround((Math.max(-100, percent) * value) / 100 + value);
    if (!Number.isFinite(value)) return 0;
    const count =
      request.template.kind === 'action-token-card' ? toInt32(value) : Math.trunc(value);
    return Math.max(0, grouped ? Math.min(request.count, count) : count);
  });
  return {
    counts,
    state: {
      ...state,
      tokenBoosts: state.tokenBoosts.flatMap((boost, index) => {
        if (!used.has(index) || boost.remainingUses === null) return [boost];
        return boost.remainingUses > 1n
          ? [{ ...boost, remainingUses: boost.remainingUses - 1n }]
          : [];
      }),
    },
  };
}

function toInt32(value: number): number {
  if (!Number.isFinite(value) || value < -2_147_483_648 || value > 2_147_483_647)
    return -2_147_483_648;
  return Math.trunc(value);
}
