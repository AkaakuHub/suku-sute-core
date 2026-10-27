export type LiveDeckSlotAssignment<Card> = Readonly<{
  slotNo: number;
  card: Card;
}>;

export function assignLiveDeckSlotNumbers<Card>(
  orderedCards: readonly Card[],
): readonly LiveDeckSlotAssignment<Card>[] {
  return orderedCards.map((card, index) => ({
    slotNo: index + 1,
    card,
  }));
}
