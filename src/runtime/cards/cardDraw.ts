import type { LiveCardIdentifier } from './deckBoardState.ts';
import type { LiveCardIdentity } from './cardIdentity.ts';
import type { LiveSkillEffect } from '../skills/skillTypes.ts';

export type LiveDrawCandidate<Id extends LiveCardIdentifier = number> = Readonly<{
  cardInstanceId: Id;
  drawProbability: number;
}>;

export type LiveOnDrawInduceContext = Readonly<{
  currentDrawType: 0 | 1 | 2 | 3;
  currentSection: number;
  feverSection: number;
  usedCard: LiveCardIdentity | null;
  usedSkillMainEffect: number | null;
}>;

export function applyLiveOnDrawInduceAbility(
  drawProbability: number,
  effects: readonly LiveSkillEffect[],
  context: LiveOnDrawInduceContext,
): number {
  requireSafeInteger(drawProbability, 'draw probability');
  validateOnDrawContext(context);
  let result = drawProbability;
  for (const effect of effects) {
    if (effect.actionType !== 902) continue;
    const values = resolveOnDrawInduceValues(effect);
    const conditionMatches =
      onDrawConditionMatches(values.conditionType, values.conditionValue, context) ===
      (values.conditionNotFlag !== 2);
    const factor = conditionMatches
      ? drawProbabilityFactor(values.probabilityType, values.probabilityValue)
      : 10_000;
    result = multiplyDrawProbability(result, factor);
  }
  return result;
}

export function selectLiveDrawCandidate<Candidate extends LiveDrawCandidate<LiveCardIdentifier>>(
  candidates: readonly Candidate[],
  randomRange: (maximumExclusive: number) => number,
): Candidate | null {
  for (const candidate of candidates) {
    if (
      (typeof candidate.cardInstanceId === 'number'
        ? !Number.isSafeInteger(candidate.cardInstanceId) || candidate.cardInstanceId <= 0
        : candidate.cardInstanceId.length === 0) ||
      !Number.isSafeInteger(candidate.drawProbability)
    ) {
      throw new Error('Live draw candidate is invalid');
    }
  }
  const negative = candidates.filter((candidate) => candidate.drawProbability < 0);
  if (negative.length > 0) {
    return requireCandidate(negative[requireRandomIndex(negative.length, randomRange)]);
  }
  const positive = candidates.filter((candidate) => candidate.drawProbability > 0);
  const total = positive.reduce((sum, candidate) => sum + candidate.drawProbability, 0);
  if (!Number.isSafeInteger(total)) {
    throw new Error('Live draw probability total is invalid');
  }
  if (total === 0) return null;
  const roll = requireRandomIndex(total, randomRange);
  let cumulative = 0;
  for (const candidate of positive) {
    cumulative += candidate.drawProbability;
    if (roll < cumulative) return candidate;
  }
  throw new Error('Live draw probability did not resolve');
}

export function selectLiveDeckDrawCandidate<
  Candidate extends LiveDrawCandidate<LiveCardIdentifier>,
>(
  candidates: readonly Candidate[],
  searchedCandidates: readonly Candidate[],
  randomRange: (maximumExclusive: number) => number,
): Candidate | null {
  const selected =
    selectLiveDrawCandidate(searchedCandidates, randomRange) ??
    selectLiveDrawCandidate(candidates, randomRange);
  if (selected !== null) return selected;
  if (candidates.length === 0) return null;
  return requireCandidate(candidates[requireRandomIndex(candidates.length, randomRange)]);
}

type OnDrawInduceValues = Readonly<{
  probabilityType: number;
  probabilityValue: number;
  conditionType: number;
  conditionNotFlag: number;
  conditionValue: number;
}>;

function resolveOnDrawInduceValues(effect: LiveSkillEffect): OnDrawInduceValues {
  if (effect.details.length !== 5) {
    throw new Error('Live OnDrawInduce detail count differs');
  }
  const values = new Map<keyof OnDrawInduceValues, number>();
  for (const detail of effect.details) {
    const field = onDrawDetailField(detail.detailType);
    if (
      field === null ||
      values.has(field) ||
      detail.targetMood !== 0 ||
      detail.params.length !== 0
    ) {
      throw new Error('Live OnDrawInduce detail contract differs');
    }
    requireSafeInteger(detail.effectValue, detail.detailType);
    values.set(field, detail.effectValue);
  }
  return {
    probabilityType: requireEffectValue(values, 'probabilityType'),
    probabilityValue: requireEffectValue(values, 'probabilityValue'),
    conditionType: requireEffectValue(values, 'conditionType'),
    conditionNotFlag: requireEffectValue(values, 'conditionNotFlag'),
    conditionValue: requireEffectValue(values, 'conditionValue'),
  };
}

function onDrawDetailField(detailType: string): keyof OnDrawInduceValues | null {
  switch (detailType) {
    case 'ON_DRAW_INDUCE_PROBABILITY_TYPE':
      return 'probabilityType';
    case 'ON_DRAW_INDUCE_PROBABILITY_NUM':
      return 'probabilityValue';
    case 'ON_DRAW_INDUCE_CONDITION_TYPE':
      return 'conditionType';
    case 'ON_DRAW_INDUCE_CONDITION_NOT_FLAG':
      return 'conditionNotFlag';
    case 'ON_DRAW_INDUCE_CONDITION_VALUE':
      return 'conditionValue';
    default:
      return null;
  }
}

function requireEffectValue(
  values: ReadonlyMap<keyof OnDrawInduceValues, number>,
  field: keyof OnDrawInduceValues,
): number {
  const value = values.get(field);
  if (value === undefined) {
    throw new Error(`Live OnDrawInduce ${field} is absent`);
  }
  return value;
}

function onDrawConditionMatches(
  conditionType: number,
  conditionValue: number,
  context: LiveOnDrawInduceContext,
): boolean {
  switch (conditionType) {
    case 1:
      return context.currentDrawType === 1 && context.usedCard?.charactersId === conditionValue;
    case 2:
      return context.currentDrawType === 1 && context.usedSkillMainEffect === conditionValue;
    case 3:
      if (conditionValue === 99) {
        return context.currentSection !== context.feverSection;
      }
      if (context.currentSection === context.feverSection) return false;
      return (
        conditionValue - 1 !==
        context.currentSection - (context.currentSection > context.feverSection ? 1 : 0)
      );
    case 4:
      return context.currentDrawType === 0;
    case 5:
      return (
        context.currentDrawType === 1 && context.usedCard?.unitIds.includes(conditionValue) === true
      );
    default:
      throw new Error('Live OnDrawInduce condition type differs');
  }
}

function drawProbabilityFactor(type: number, value: number): number {
  if (type === 1) return -1;
  if (type === 2) return 0;
  if (type === 3) return value;
  throw new Error('Live OnDrawInduce probability type differs');
}

function multiplyDrawProbability(current: number, factor: number): number {
  requireSafeInteger(current, 'draw probability');
  requireSafeInteger(factor, 'draw probability factor');
  if (current < 0) return factor === 0 ? 0 : current;
  if (factor < 0) return factor;
  const scaled = (BigInt.asUintN(32, BigInt(current)) * BigInt(factor)) / 10_000n;
  return Number(BigInt.asIntN(32, scaled));
}

function validateOnDrawContext(context: LiveOnDrawInduceContext): void {
  for (const [label, value] of [
    ['current section', context.currentSection],
    ['fever section', context.feverSection],
  ] as const) {
    requireSafeInteger(value, label);
    if (value < 0) throw new Error(`Live ${label} is negative`);
  }
  if (context.usedCard !== null) {
    requireSafeInteger(context.usedCard.charactersId, 'used character');
    if (
      context.usedCard.charactersId <= 0 ||
      context.usedCard.unitIds.length === 0 ||
      new Set(context.usedCard.unitIds).size !== context.usedCard.unitIds.length
    ) {
      throw new Error('Live used card identity is invalid');
    }
    for (const unitId of context.usedCard.unitIds) {
      requireSafeInteger(unitId, 'used unit');
      if (unitId <= 0) throw new Error('Live used unit is invalid');
    }
  }
  if (context.usedSkillMainEffect !== null) {
    requireSafeInteger(context.usedSkillMainEffect, 'used skill main effect');
    if (context.usedSkillMainEffect < 0) {
      throw new Error('Live used skill main effect is negative');
    }
  }
  if (
    context.currentDrawType === 1
      ? context.usedCard === null
      : context.usedCard !== null || context.usedSkillMainEffect !== null
  ) {
    throw new Error('Live draw context differs from draw type');
  }
}

function requireSafeInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value)) {
    throw new Error(`Live ${label} is not a safe integer`);
  }
}

function requireRandomIndex(
  maximumExclusive: number,
  randomRange: (maximumExclusive: number) => number,
): number {
  const result = randomRange(maximumExclusive);
  if (!Number.isSafeInteger(result) || result < 0 || result >= maximumExclusive) {
    throw new Error('Live random range result is invalid');
  }
  return result;
}

function requireCandidate<Candidate>(candidate: Candidate | undefined): Candidate {
  if (candidate === undefined) {
    throw new Error('Live draw candidate is absent');
  }
  return candidate;
}
