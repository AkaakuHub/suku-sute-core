export function resolveLiveUseAllHandCardInstanceIds(
  handCardInstanceIds: readonly number[],
  sourceCardInstanceId: number,
): readonly number[] {
  validateCardInstanceIds(handCardInstanceIds, sourceCardInstanceId);
  return handCardInstanceIds.filter((cardInstanceId) => cardInstanceId !== sourceCardInstanceId);
}

function validateCardInstanceIds(
  handCardInstanceIds: readonly number[],
  sourceCardInstanceId: number,
): void {
  if (
    !Number.isSafeInteger(sourceCardInstanceId) ||
    sourceCardInstanceId < 1 ||
    new Set(handCardInstanceIds).size !== handCardInstanceIds.length ||
    handCardInstanceIds.some(
      (cardInstanceId) => !Number.isSafeInteger(cardInstanceId) || cardInstanceId < 1,
    )
  ) {
    throw new Error('Live all-hand card instance IDs are invalid');
  }
}
