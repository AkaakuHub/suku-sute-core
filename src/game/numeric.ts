export function isInt64(value: bigint): boolean {
  return value >= -(1n << 63n) && value <= (1n << 63n) - 1n;
}

export function int64ToFloat32(value: bigint): number {
  const magnitude = value < 0n ? -value : value;
  if (magnitude === 0n) return 0;
  const sign = value < 0n ? -1 : 1;
  const shift = Math.max(0, magnitude.toString(2).length - 24);
  let significand = magnitude >> BigInt(shift);
  if (shift > 0) {
    const remainder = magnitude - (significand << BigInt(shift));
    const halfway = 1n << BigInt(shift - 1);
    if (remainder > halfway || (remainder === halfway && (significand & 1n) === 1n))
      significand += 1n;
  }
  return Math.fround(sign * Number(significand) * 2 ** shift);
}
