export type TokenDeckZones = Readonly<{
  hand: readonly string[];
  drawPile: readonly string[];
  discard: readonly string[];
}>;

export type TokenDeckSplit = Readonly<{
  seriesIds: readonly number[] | null;
  main: TokenDeckZones;
  sub: TokenDeckZones;
  active: 'main' | 'sub';
  remainingSeconds: number | null;
  remainingSections: bigint | null;
  deactivationKey: string | null;
}>;
