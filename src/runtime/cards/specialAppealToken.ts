import type { LiveSkillEffect } from '../skills/skillTypes.ts';
import {
  requireLiveSkillEffectDetails,
  requireLiveSkillEffectDetailValue,
} from '../skills/skillEffectValue.ts';

import type { LiveSpecialAppealTokenTargetType } from './specialAppealTokenTypes.ts';
import type { LiveSpecialAppealTokenLevelType } from './specialAppealTokenTypes.ts';
import type { LiveSpecialAppealTokenEffect } from './specialAppealTokenTypes.ts';
import type { LiveSpecialAppealTokenCardSetRecord } from './specialAppealTokenTypes.ts';
import type { LiveSpecialAppealTokenState } from './specialAppealTokenTypes.ts';
import { isLiveSkillCostOver, type LiveSkillCostInput } from '../live/skillCost.ts';
import { validateTokenCardSetRecord } from './specialAppealTokenSelection.ts';

const specialAppealTokenDetailTypes = [
  'SPECIAL_APPEAL_TOKEN_SET_ID',
  'SPECIAL_APPEAL_TOKEN_COOLTIME',
  'SPECIAL_APPEAL_TOKEN_TARGET_TYPE',
  'SPECIAL_APPEAL_TOKEN_LEVEL_TYPE',
] as const;

export function createLiveSpecialAppealTokenEffect(
  effect: LiveSkillEffect,
): LiveSpecialAppealTokenEffect {
  if (effect.actionType !== 53) {
    throw new Error('Live Special Appeal token action type is invalid');
  }
  const details = requireLiveSkillEffectDetails(
    effect.details,
    specialAppealTokenDetailTypes,
    'SpecialAppealToken',
  );
  const tokenSetId = requireLiveSkillEffectDetailValue(
    details,
    'SPECIAL_APPEAL_TOKEN_SET_ID',
    'SpecialAppealToken',
  );
  if (!Number.isSafeInteger(tokenSetId) || tokenSetId < 1) {
    throw new Error('Live Special Appeal token set ID is invalid');
  }
  const coolTimeSeconds = requireLiveSkillEffectDetailValue(
    details,
    'SPECIAL_APPEAL_TOKEN_COOLTIME',
    'SpecialAppealToken',
  );
  if (!Number.isFinite(coolTimeSeconds) || coolTimeSeconds < 0) {
    throw new Error('Live Special Appeal token cool time is invalid');
  }
  const targetType = resolveTargetType(
    requireLiveSkillEffectDetailValue(
      details,
      'SPECIAL_APPEAL_TOKEN_TARGET_TYPE',
      'SpecialAppealToken',
    ),
  );
  const levelType = resolveLevelType(
    requireLiveSkillEffectDetailValue(
      details,
      'SPECIAL_APPEAL_TOKEN_LEVEL_TYPE',
      'SpecialAppealToken',
    ),
  );
  if (levelType === 'none') {
    throw new Error(
      'Live Special Appeal token NONE level is not supported by the verified runtime contract',
    );
  }
  return {
    effectId: effect.id,
    tokenSetId,
    coolTimeSeconds,
    targetType,
    levelType,
  };
}

export function createLiveSpecialAppealTokenState(
  input: Readonly<{
    coolTimeSeconds: number;
    generationsId: number;
    tokenCardSetRecord: LiveSpecialAppealTokenCardSetRecord;
  }>,
): LiveSpecialAppealTokenState {
  if (!Number.isFinite(input.coolTimeSeconds) || input.coolTimeSeconds < 0) {
    throw new Error('Live Special Appeal token cool time is invalid');
  }
  if (!Number.isSafeInteger(input.generationsId) || input.generationsId < 1) {
    throw new Error('Live Special Appeal token generations ID is invalid');
  }
  validateTokenCardSetRecord(input.tokenCardSetRecord);
  return {
    coolTimeSeconds: input.coolTimeSeconds,
    remainCoolTimeSeconds: input.coolTimeSeconds,
    generationsId: input.generationsId,
    tokenCardSetRecord: input.tokenCardSetRecord,
  };
}

export function advanceLiveSpecialAppealTokenState(
  state: LiveSpecialAppealTokenState,
  deltaTimeSeconds: number,
): LiveSpecialAppealTokenState {
  if (!Number.isFinite(deltaTimeSeconds) || deltaTimeSeconds < 0) {
    throw new Error('Live Special Appeal token delta time is invalid');
  }
  if (state.remainCoolTimeSeconds <= 0) return state;
  return {
    ...state,
    remainCoolTimeSeconds: Math.max(0, state.remainCoolTimeSeconds - deltaTimeSeconds),
  };
}

export function canUseLiveSpecialAppealToken(
  input: LiveSkillCostInput &
    Readonly<{
      token: LiveSpecialAppealTokenState;
      mentalDown: boolean;
    }>,
): boolean {
  return !input.mentalDown && !isLiveSkillCostOver(input) && input.token.remainCoolTimeSeconds <= 0;
}

export function activateLiveSpecialAppealToken(
  input: LiveSkillCostInput &
    Readonly<{
      token: LiveSpecialAppealTokenState;
      mentalDown: boolean;
    }>,
): LiveSpecialAppealTokenState | null {
  if (!canUseLiveSpecialAppealToken(input)) return null;
  return {
    ...input.token,
    remainCoolTimeSeconds: input.token.coolTimeSeconds,
  };
}

function resolveTargetType(value: number): LiveSpecialAppealTokenTargetType {
  if (value !== 1) {
    throw new Error('Live Special Appeal token target type is invalid');
  }
  return 'song-period';
}

function resolveLevelType(value: number): LiveSpecialAppealTokenLevelType {
  switch (value) {
    case 0:
      return 'none';
    case 1:
      return 'special-appeal-level';
    case 2:
      return 'skill-level';
    default:
      throw new Error('Live Special Appeal token level type is invalid');
  }
}
