import type { LiveCardIdentity } from './cardIdentity.ts';
import type { LiveSkillEffect } from '../skills/skillTypes.ts';
import {
  requireLiveSkillEffectDetails,
  requireLiveSkillEffectDetailValue,
} from '../skills/skillEffectValue.ts';
import type { LiveSpecialAppealTokenState } from './specialAppealTokenTypes.ts';

const resetSpecialAppealDetailTypes = [
  'RESET_SPECIAL_APPEAL_COUNT_EFFECT_TYPE',
  'RESET_SPECIAL_APPEAL_COUNT_TARGET_TYPE',
  'RESET_SPECIAL_APPEAL_COUNT_TARGET_ID',
] as const;

export type LiveSpecialAppealResetCard = Readonly<
  LiveCardIdentity & {
    cardDatasId: number;
  }
>;

export type LiveSpecialAppealResetSource = Readonly<{
  kind: 'card-skill' | 'special-appeal' | 'ex-special-appeal';
  card: LiveSpecialAppealResetCard;
}>;

type LiveSpecialAppealResetTarget =
  | Readonly<{ kind: 'all' }>
  | Readonly<{ kind: 'member'; charactersId: number }>
  | Readonly<{ kind: 'unit'; unitId: number }>
  | Readonly<{ kind: 'self' }>
  | Readonly<{ kind: 'others' }>;

export type LiveSpecialAppealResetEffect = Readonly<{
  effectId: string;
  includesSpecialAppeal: boolean;
  includesExSpecialAppeal: boolean;
  target: LiveSpecialAppealResetTarget;
}>;

export type LiveSpecialAppealResetState = Readonly<{
  specialAppeal: Readonly<{
    card: LiveSpecialAppealResetCard;
    used: boolean;
  }> | null;
  exSpecialAppeals: readonly Readonly<{
    card: LiveSpecialAppealResetCard;
    token: LiveSpecialAppealTokenState;
  }>[];
}>;

export function createLiveSpecialAppealResetEffect(
  effect: LiveSkillEffect,
): LiveSpecialAppealResetEffect {
  if (effect.actionType !== 55) {
    throw new Error('Live Special Appeal reset action type differs');
  }
  const details = requireLiveSkillEffectDetails(
    effect.details,
    resetSpecialAppealDetailTypes,
    'Special Appeal reset',
  );
  const effectType = requireLiveSkillEffectDetailValue(
    details,
    'RESET_SPECIAL_APPEAL_COUNT_EFFECT_TYPE',
    'Special Appeal reset',
  );
  if (!Number.isSafeInteger(effectType) || effectType < 1 || effectType > 3) {
    throw new Error('Live Special Appeal reset effect type differs');
  }
  const targetType = requireLiveSkillEffectDetailValue(
    details,
    'RESET_SPECIAL_APPEAL_COUNT_TARGET_TYPE',
    'Special Appeal reset',
  );
  const targetId = requireLiveSkillEffectDetailValue(
    details,
    'RESET_SPECIAL_APPEAL_COUNT_TARGET_ID',
    'Special Appeal reset',
  );
  return {
    effectId: effect.id,
    includesSpecialAppeal: effectType === 1 || effectType === 3,
    includesExSpecialAppeal: effectType === 2 || effectType === 3,
    target: resolveResetTarget(targetType, targetId),
  };
}

export function applyLiveSpecialAppealReset(
  state: LiveSpecialAppealResetState,
  effect: LiveSpecialAppealResetEffect,
  source: LiveSpecialAppealResetSource,
): LiveSpecialAppealResetState {
  const specialAppeal =
    state.specialAppeal !== null &&
    effect.includesSpecialAppeal &&
    matchesResetTarget(effect.target, state.specialAppeal.card, source.card)
      ? {
          ...state.specialAppeal,
          used:
            source.kind === 'special-appeal' &&
            source.card.cardDatasId === state.specialAppeal.card.cardDatasId,
        }
      : state.specialAppeal;
  return {
    specialAppeal,
    exSpecialAppeals: state.exSpecialAppeals.map((candidate) =>
      effect.includesExSpecialAppeal &&
      matchesResetTarget(effect.target, candidate.card, source.card)
        ? {
            ...candidate,
            token: { ...candidate.token, remainCoolTimeSeconds: 0 },
          }
        : candidate,
    ),
  };
}

function resolveResetTarget(targetType: number, targetId: number): LiveSpecialAppealResetTarget {
  if (!Number.isSafeInteger(targetId) || targetId < 0) {
    throw new Error('Live Special Appeal reset target ID differs');
  }
  switch (targetType) {
    case 1:
      return { kind: 'all' };
    case 2:
      if (targetId < 1) {
        throw new Error('Live Special Appeal reset member ID differs');
      }
      return { kind: 'member', charactersId: targetId };
    case 3:
      if (targetId < 1) {
        throw new Error('Live Special Appeal reset unit ID differs');
      }
      return { kind: 'unit', unitId: targetId };
    case 4:
      return { kind: 'self' };
    case 5:
      return { kind: 'others' };
    default:
      throw new Error('Live Special Appeal reset target type differs');
  }
}

function matchesResetTarget(
  target: LiveSpecialAppealResetTarget,
  candidate: LiveSpecialAppealResetCard,
  source: LiveSpecialAppealResetCard,
): boolean {
  switch (target.kind) {
    case 'all':
      return true;
    case 'member':
      return candidate.charactersId === target.charactersId;
    case 'unit':
      return candidate.unitIds.includes(target.unitId);
    case 'self':
      return candidate.cardDatasId === source.cardDatasId;
    case 'others':
      return candidate.cardDatasId !== source.cardDatasId;
  }
}
