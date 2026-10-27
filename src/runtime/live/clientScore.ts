export type LiveClientScoreCard = Readonly<{
  appealValue: number;
}>;

export type LiveClientScorePorts = Readonly<{
  valueToFactor: (value: number) => number;
  getAddScoreMax: (collectNum: number) => bigint;
}>;

const intMax = 2_147_483_647n;
const longMax = 9_223_372_036_854_775_807n;
const disappearCollectFactor = 0.20000000298023224;

export function calculateLiveClientScore(
  input: Readonly<{
    cards: readonly LiveClientScoreCard[];
    collectNum: number;
    heartRankMagnification: number;
    isDisappearCollect: boolean;
    masteryLoveBonusEffect: number;
    skillLoveBonusEffect: number;
    currentGenesisGauge: number;
    bonusScoreValue: number;
    challengeBonusFactor: number;
  }>,
  ports: LiveClientScorePorts,
): bigint {
  validateInput(input);
  const appealAverage =
    input.cards.reduce((sum, card) => sum + card.appealValue, 0) / input.cards.length;
  const appealBase = Math.ceil(appealAverage * 120_000);
  const genesisBonus =
    input.currentGenesisGauge < 1
      ? 0
      : Math.fround(
          Math.min(
            2_147_483_647,
            Math.ceil(Math.fround(Math.pow(Math.fround(input.currentGenesisGauge), 1.5))),
          ),
        );
  const bonusScoreFactor = checkedFactor(
    ports.valueToFactor(genesisBonus + input.bonusScoreValue),
    'bonus score',
  );
  const collectFactor = input.isDisappearCollect ? disappearCollectFactor : 1;
  const rawScore =
    appealBase *
    input.heartRankMagnification *
    input.collectNum *
    input.masteryLoveBonusEffect *
    input.skillLoveBonusEffect *
    (bonusScoreFactor + 1) *
    input.challengeBonusFactor *
    collectFactor;
  const score = truncateLong(Math.ceil(rawScore));
  if (score <= 0n) return 0n;
  const scoreMax = input.isDisappearCollect ? intMax : ports.getAddScoreMax(input.collectNum);
  return score < scoreMax ? score : scoreMax;
}

function truncateLong(value: number): bigint {
  if (value >= Number(longMax)) return longMax;
  if (value <= -Number(longMax) - 1) return -longMax - 1n;
  return BigInt(Math.trunc(value));
}

function checkedFactor(value: number, label: string): number {
  if (!Number.isFinite(value)) {
    throw new Error(`Live client score ${label} factor is invalid`);
  }
  return value;
}

function validateInput(
  input: Readonly<{
    cards: readonly LiveClientScoreCard[];
    collectNum: number;
    heartRankMagnification: number;
    masteryLoveBonusEffect: number;
    skillLoveBonusEffect: number;
    currentGenesisGauge: number;
    bonusScoreValue: number;
    challengeBonusFactor: number;
  }>,
): void {
  if (input.cards.length === 0) {
    throw new Error('Live client score cards are absent');
  }
  if (!Number.isSafeInteger(input.collectNum) || input.collectNum < 0) {
    throw new Error('Live client score collect count is invalid');
  }
  const values = [
    input.heartRankMagnification,
    input.masteryLoveBonusEffect,
    input.skillLoveBonusEffect,
    input.currentGenesisGauge,
    input.bonusScoreValue,
    input.challengeBonusFactor,
  ];
  if (
    values.some((value) => !Number.isFinite(value)) ||
    input.cards.some((card) => !Number.isFinite(card.appealValue))
  ) {
    throw new Error('Live client score value is invalid');
  }
}
