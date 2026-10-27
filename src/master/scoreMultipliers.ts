export const scoreMultipliers = [
  {
    minimumHeartCount: 1,
    maximumHeartCount: 100,
    baseMultiplier: 10000n,
    additionalMultiplier: 0n,
  },
  {
    minimumHeartCount: 101,
    maximumHeartCount: 10000,
    baseMultiplier: 10100n,
    additionalMultiplier: 100n,
  },
  {
    minimumHeartCount: 10001,
    maximumHeartCount: 100000,
    baseMultiplier: 1000010n,
    additionalMultiplier: 10n,
  },
  {
    minimumHeartCount: 100001,
    maximumHeartCount: 200000,
    baseMultiplier: 1900010n,
    additionalMultiplier: 10n,
  },
  {
    minimumHeartCount: 200001,
    maximumHeartCount: 1999999,
    baseMultiplier: 2900001n,
    additionalMultiplier: 1n,
  },
  {
    minimumHeartCount: 2000000,
    maximumHeartCount: 3999999,
    baseMultiplier: 20000000n,
    additionalMultiplier: 5n,
  },
  {
    minimumHeartCount: 4000000,
    maximumHeartCount: 5999999,
    baseMultiplier: 40000000n,
    additionalMultiplier: 5n,
  },
  {
    minimumHeartCount: 6000000,
    maximumHeartCount: 7999999,
    baseMultiplier: 60000000n,
    additionalMultiplier: 5n,
  },
  {
    minimumHeartCount: 8000000,
    maximumHeartCount: 9999999,
    baseMultiplier: 80000000n,
    additionalMultiplier: 5n,
  },
  {
    minimumHeartCount: 10000000,
    maximumHeartCount: 10000000,
    baseMultiplier: 150000000n,
    additionalMultiplier: 0n,
  },
] as const;
