export type TokenDeckHand = Readonly<{
  hand: readonly string[];
}>;

export type TokenDeckSplit = Readonly<{
  seriesIds: readonly number[] | null;
  subDeckCardInstanceIds: readonly string[];
  main: TokenDeckHand;
  sub: TokenDeckHand;
  active: 'main' | 'sub';
  remainingSeconds: number | null;
  remainingSections: bigint | null;
  deactivationKey: string | null;
}>;
