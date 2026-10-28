import type { LiveCardIdentity } from '../cards/cardIdentity.ts';
export type LiveAdditionalBuffTarget =
  | Readonly<{ kind: 'all' }>
  | Readonly<{ kind: 'member'; charactersId: number }>
  | Readonly<{ kind: 'unit'; unitId: number }>
  | Readonly<{ kind: 'card-token-series'; cardSeriesId: number }>;

export type LiveAdditionalBuffCard = Readonly<
  LiveCardIdentity & {
    tokenCardSeriesIds: readonly number[];
    skillTokenCardSeriesIds: readonly number[];
  }
>;

export function resolveLiveAdditionalBuffTarget(
  targetType: number,
  targetId: number,
  label: string,
): LiveAdditionalBuffTarget {
  if (!Number.isSafeInteger(targetId) || targetId < 0) {
    throw new Error(`Live ${label} target ID is invalid`);
  }
  switch (targetType) {
    case 0:
      return { kind: 'all' };
    case 1:
      return { kind: 'member', charactersId: targetId };
    case 2:
      return { kind: 'unit', unitId: targetId };
    case 3:
      return { kind: 'card-token-series', cardSeriesId: targetId };
    default:
      throw new Error(`Live ${label} target type is invalid`);
  }
}

export function liveAdditionalBuffTargetMatches(
  target: LiveAdditionalBuffTarget,
  card: LiveAdditionalBuffCard,
  skillTokenCardSeriesIds: readonly number[],
): boolean {
  validateLiveAdditionalBuffCard(card);
  const targetMatches = (() => {
    switch (target.kind) {
      case 'all':
        return true;
      case 'member':
        return card.charactersId === target.charactersId;
      case 'unit':
        return card.unitIds.includes(target.unitId);
      case 'card-token-series':
        return card.tokenCardSeriesIds.includes(target.cardSeriesId);
    }
  })();
  return (
    targetMatches &&
    (skillTokenCardSeriesIds.length === 0 ||
      skillTokenCardSeriesIds.some((cardSeriesId) =>
        card.skillTokenCardSeriesIds.includes(cardSeriesId),
      ))
  );
}

export function validateLiveAdditionalBuffCard(card: LiveAdditionalBuffCard): void {
  if (
    !Number.isSafeInteger(card.charactersId) ||
    card.charactersId < 1 ||
    [card.unitIds, card.tokenCardSeriesIds, card.skillTokenCardSeriesIds].some(
      (values) =>
        new Set(values).size !== values.length ||
        values.some((value) => !Number.isSafeInteger(value) || value < 1),
    )
  ) {
    throw new Error('Live additional buff CardData is invalid');
  }
}
