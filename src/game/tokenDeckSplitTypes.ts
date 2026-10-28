export type TokenDeckHand = Readonly<{
  hand: readonly string[];
}>;

export type TokenDeckSplit = Readonly<{
  main: TokenDeckHand;
  sub: TokenDeckHand;
  remainingSeconds: number | null;
  remainingSections: bigint | null;
  deactivationKey: string | null;
}>;
