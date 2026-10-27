import { expect, test } from 'vite-plus/test';
import { assignLiveDeckSlotNumbers } from '../../src/runtime/cards/deckSlots.ts';

test('公式deck orderへDeckCardMaxを超えるカードも連番slotで割り当てる', () => {
  const cardDatasIds = Array.from({ length: 18 }, (_, index) => 900_001 + index);
  const assignments = assignLiveDeckSlotNumbers(cardDatasIds);

  expect(assignments.map(({ slotNo }) => slotNo)).toEqual(
    Array.from({ length: 18 }, (_, index) => index + 1),
  );
  expect(assignments.map(({ card }) => card)).toEqual(cardDatasIds);
});
