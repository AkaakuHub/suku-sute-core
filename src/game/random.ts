export function createRangeRandom(seed: number) {
  let current = seed >>> 0;
  if (current === 0) throw new Error('乱数seedは0以外にしてください。');
  return {
    get seed() {
      return current;
    },
    range(this: void, minimum: number, maximum: number): number {
      current ^= current << 13;
      current ^= current >>> 17;
      current ^= current << 5;
      current >>>= 0;
      return minimum + (maximum - minimum) * (current / 0x1_0000_0000);
    },
  };
}
