import type { LiveCardIdentity } from '../cards/cardIdentity.ts';
import type { LiveSkillEffect } from './skillTypes.ts';
import { floatToInt32 } from '../numeric.ts';
import {
  requireLiveSkillEffectDetails,
  requireLiveSkillEffectDetailValue,
} from './skillEffectValue.ts';

const skillCostDetailTypes = [
  'CHANGE_DECK_AP_NUM',
  'CHANGE_DECK_AP_TARGET_RANGE',
  'CHANGE_DECK_AP_TARGET_TYPE',
  'CHANGE_DECK_AP_TARGET_TYPE_ID',
] as const;

type LiveSkillCostBuffTarget =
  | Readonly<{ kind: 'all' }>
  | Readonly<{ kind: 'member'; charactersId: number }>
  | Readonly<{ kind: 'main-effect'; mainEffect: number }>
  | Readonly<{ kind: 'unit'; unitId: number }>
  | Readonly<{ kind: 'token-card-series'; cardSeriesId: number }>;

type LiveSkillCostBuffRange = 'all' | 'hand' | 'deck';
export type LiveSkillCostBuffKind = 'continuous' | 'once';

export type LiveSkillCostBuff = Readonly<{
  effectId: string;
  deltaAp: number;
  range: LiveSkillCostBuffRange;
  target: LiveSkillCostBuffTarget;
}>;

export type LiveSkillCostBuffCard = Readonly<
  LiveCardIdentity & {
    mainEffect: number;
    tokenCardSeriesIds: readonly number[];
  }
>;

export type LiveSkillCostBuffState = Readonly<{
  continuous: readonly LiveSkillCostBuff[];
  once: readonly LiveSkillCostBuff[];
}>;

export function createLiveSkillCostBuffState(): LiveSkillCostBuffState {
  return { continuous: [], once: [] };
}

export function createLiveSkillCostBuff(effect: LiveSkillEffect): LiveSkillCostBuff {
  if (effect.actionType !== 29) {
    throw new Error('Live skill cost buff action type is invalid');
  }
  const details = requireLiveSkillEffectDetails(
    effect.details,
    skillCostDetailTypes,
    'SkillCostBuff',
  );
  const deltaRaw = requireLiveSkillEffectDetailValue(
    details,
    'CHANGE_DECK_AP_NUM',
    'SkillCostBuff',
  );
  if (!Number.isSafeInteger(deltaRaw) || deltaRaw % 10_000 !== 0) {
    throw new Error('Live SkillCostBuff AP value is unsupported');
  }
  const range = resolveRange(
    requireLiveSkillEffectDetailValue(details, 'CHANGE_DECK_AP_TARGET_RANGE', 'SkillCostBuff'),
  );
  const targetType = requireLiveSkillEffectDetailValue(
    details,
    'CHANGE_DECK_AP_TARGET_TYPE',
    'SkillCostBuff',
  );
  const targetId = requireLiveSkillEffectDetailValue(
    details,
    'CHANGE_DECK_AP_TARGET_TYPE_ID',
    'SkillCostBuff',
  );
  if (!Number.isSafeInteger(targetId) || targetId < 0) {
    throw new Error('Live SkillCostBuff target ID is invalid');
  }
  return {
    effectId: effect.id,
    deltaAp: deltaRaw / 10_000,
    range,
    target: resolveTarget(targetType, targetId),
  };
}

export function addLiveSkillCostBuff(
  state: LiveSkillCostBuffState,
  buff: LiveSkillCostBuff,
  kind: LiveSkillCostBuffKind,
): LiveSkillCostBuffState {
  return kind === 'continuous'
    ? { ...state, continuous: [...state.continuous, buff] }
    : { ...state, once: [...state.once, buff] };
}

export function resolveLiveSkillCost(
  baseCost: number,
  state: LiveSkillCostBuffState,
  card: LiveSkillCostBuffCard,
  location: 'hand' | 'deck',
): number {
  return finalizeLiveSkillCost(baseCost, resolveLiveSkillCostBuffDelta(state, card, location));
}

export function resolveLiveSkillCostBuffDelta(
  state: LiveSkillCostBuffState,
  card: LiveSkillCostBuffCard,
  location: 'hand' | 'deck',
): number {
  return [...state.continuous, ...state.once]
    .filter((buff) => buffAppliesToLocation(buff.range, location))
    .filter((buff) => matchesTarget(buff.target, card))
    .reduce((sum, buff) => sum + buff.deltaAp, 0);
}

export function finalizeLiveSkillCost(baseCost: number, deltaAp: number): number {
  if (!Number.isSafeInteger(baseCost) || baseCost < 0) {
    throw new Error('Live skill base cost is invalid');
  }
  if (!Number.isFinite(deltaAp)) {
    throw new Error('Live skill cost delta is invalid');
  }
  const baseValue = Math.fround(baseCost);
  const value = Math.max(baseValue < 1 ? 0 : 1, Math.min(Number.MAX_VALUE, baseValue + deltaAp));
  return floatToInt32(value);
}

export function consumeLiveSkillCostBuffs(
  state: LiveSkillCostBuffState,
  card: LiveSkillCostBuffCard,
  location: 'hand' | 'deck',
): LiveSkillCostBuffState {
  return {
    ...state,
    once: state.once.filter(
      (buff) => !buffAppliesToLocation(buff.range, location) || !matchesTarget(buff.target, card),
    ),
  };
}

function resolveRange(value: number): LiveSkillCostBuffRange {
  switch (value) {
    case 1:
      return 'all';
    case 2:
      return 'hand';
    case 3:
      return 'deck';
    default:
      throw new Error('Live SkillCostBuff target range is invalid');
  }
}

function resolveTarget(targetType: number, targetId: number): LiveSkillCostBuffTarget {
  switch (targetType) {
    case 1:
      return { kind: 'all' };
    case 2:
      return { kind: 'member', charactersId: targetId };
    case 3:
      return { kind: 'main-effect', mainEffect: targetId };
    case 4:
      return { kind: 'unit', unitId: targetId };
    case 5:
      return { kind: 'token-card-series', cardSeriesId: targetId };
    default:
      throw new Error('Live SkillCostBuff target type is invalid');
  }
}

function buffAppliesToLocation(range: LiveSkillCostBuffRange, location: 'hand' | 'deck'): boolean {
  return range === 'all' || range === location;
}

function matchesTarget(target: LiveSkillCostBuffTarget, card: LiveSkillCostBuffCard): boolean {
  switch (target.kind) {
    case 'all':
      return true;
    case 'member':
      return card.charactersId === target.charactersId;
    case 'main-effect':
      return card.mainEffect === target.mainEffect;
    case 'unit':
      return card.unitIds.includes(target.unitId);
    case 'token-card-series':
      return card.tokenCardSeriesIds.includes(target.cardSeriesId);
  }
}
