import type { LiveDeckBoardState } from './deckBoardState.ts';
import { liveBoardState, setLiveCardSkillUseAtBoardState } from './deckBoardState.ts';
import type { LiveSkillEffect } from '../skills/skillTypes.ts';
import { createLiveSkillEffectDuration } from '../skills/skillEffectDuration.ts';

import type { LiveReshuffleEffect } from './deckActionTypes.ts';
import type { LiveCardSearchEffect } from './deckActionTypes.ts';
import type { LiveChangeApEffect } from './deckActionTypes.ts';
import type { LiveCardMoveEffect } from './deckActionTypes.ts';
import type { LiveHandCardCountEffect } from './deckActionTypes.ts';
import type { LiveUseAllHandEffect } from './deckActionTypes.ts';
import { requireDetails } from './deckActionDetails.ts';
import { requireEnum } from './deckActionDetails.ts';
import { requireSafeInteger } from './deckActionDetails.ts';
import { requireChangeApValue } from './deckActionDetails.ts';
import { requirePositiveInteger } from './deckActionDetails.ts';
import { resolveCardSearchType } from './deckActionDetails.ts';
import { resolveChangeApConditionType } from './deckActionDetails.ts';

export function createLiveReshuffleEffect(effect: LiveSkillEffect): LiveReshuffleEffect {
  const details = requireDetails(
    effect,
    13,
    ['RESHUFFLE_RECOVERY_TYPE', 'RESHUFFLE_STASH_TYPE'],
    'Reshuffle',
  );
  return {
    effectId: effect.id,
    recoveryType: requireEnum(
      details,
      'RESHUFFLE_RECOVERY_TYPE',
      [0, 1],
      'Reshuffle recovery type',
      (value) => (value === 0 ? 'no-recovery' : 'recovery'),
    ),
    stashType: requireEnum(
      details,
      'RESHUFFLE_STASH_TYPE',
      [0, 1],
      'Reshuffle stash type',
      (value) => (value === 0 ? 'graveyard' : 'deck'),
    ),
  };
}

export function createLiveCardSearchEffect(effect: LiveSkillEffect): LiveCardSearchEffect {
  const details = requireDetails(effect, 15, ['CARD_SEARCH_TYPE', 'CARD_SEARCH_ID'], 'CardSearch');
  const searchId = requirePositiveInteger(
    details.get('CARD_SEARCH_ID')?.effectValue,
    'CardSearch ID',
  );
  return {
    effectId: effect.id,
    searchType: requireEnum(
      details,
      'CARD_SEARCH_TYPE',
      [1, 2, 3, 4],
      'CardSearch type',
      resolveCardSearchType,
    ),
    searchId,
  };
}

export function createLiveChangeApEffect(effect: LiveSkillEffect): LiveChangeApEffect {
  const details = requireDetails(
    effect,
    17,
    [
      'CHANGE_AP_NUM',
      'CHANGE_AP_MAX',
      'CHANGE_AP_MIN',
      'CHANGE_AP_CONDITION_TYPE',
      'CHANGE_AP_CONDITION_ID',
      'CHANGE_AP_DISPLAY_TIME_TYPE',
      'CHANGE_AP_DISPLAY_TIME',
    ],
    'ChangeAP',
  );
  return {
    effectId: effect.id,
    amount: requireChangeApValue(details.get('CHANGE_AP_NUM')?.effectValue, 'ChangeAP amount'),
    maximum: requireChangeApValue(details.get('CHANGE_AP_MAX')?.effectValue, 'ChangeAP maximum'),
    minimum: requireChangeApValue(details.get('CHANGE_AP_MIN')?.effectValue, 'ChangeAP minimum'),
    conditionType: requireEnum(
      details,
      'CHANGE_AP_CONDITION_TYPE',
      Array.from({ length: 15 }, (_, index) => index + 1),
      'ChangeAP condition type',
      resolveChangeApConditionType,
    ),
    conditionId: requireSafeInteger(
      details.get('CHANGE_AP_CONDITION_ID')?.effectValue,
      'ChangeAP condition ID',
    ),
    duration: createLiveSkillEffectDuration(
      requireSafeInteger(
        details.get('CHANGE_AP_DISPLAY_TIME_TYPE')?.effectValue,
        'ChangeAP display time type',
      ),
      requireSafeInteger(
        details.get('CHANGE_AP_DISPLAY_TIME')?.effectValue,
        'ChangeAP display time',
      ),
      'ChangeAP',
    ),
  };
}

export function createLiveCardMoveEffect(effect: LiveSkillEffect): LiveCardMoveEffect {
  const details = requireDetails(effect, 19, ['CARD_MOVE_TYPE'], 'CardMove');
  return {
    effectId: effect.id,
    destination: requireEnum(details, 'CARD_MOVE_TYPE', [1, 2], 'CardMove type', (value) =>
      value === 1 ? 'deck' : 'exclusion',
    ),
  };
}

export function createLiveHandCardCountEffect(effect: LiveSkillEffect): LiveHandCardCountEffect {
  const details = requireDetails(
    effect,
    20,
    [
      'CHANGE_HAND_CARD_COUNT_CALC_TYPE',
      'CHANGE_HAND_CARD_COUNT_NUM',
      'CHANGE_HAND_CARD_COUNT_DISPLAY_TIME_TYPE',
      'CHANGE_HAND_CARD_COUNT_DISPLAY_TIME',
    ],
    'HandCardCount',
  );
  if (details.get('CHANGE_HAND_CARD_COUNT_CALC_TYPE')?.effectValue !== 1) {
    throw new Error('Live HandCardCount calculation type is invalid');
  }
  return {
    effectId: effect.id,
    amount: requireSafeInteger(
      details.get('CHANGE_HAND_CARD_COUNT_NUM')?.effectValue,
      'HandCardCount amount',
    ),
    duration: createLiveSkillEffectDuration(
      requireSafeInteger(
        details.get('CHANGE_HAND_CARD_COUNT_DISPLAY_TIME_TYPE')?.effectValue,
        'HandCardCount display time type',
      ),
      requireSafeInteger(
        details.get('CHANGE_HAND_CARD_COUNT_DISPLAY_TIME')?.effectValue,
        'HandCardCount display time',
      ),
      'HandCardCount',
    ),
  };
}

export function resolveLiveHandCardCountActivation(
  currentHandCount: number,
  effect: LiveHandCardCountEffect,
): Readonly<{ targetHandCount: number; changeCount: number }> {
  if (!Number.isSafeInteger(currentHandCount) || currentHandCount < 0 || currentHandCount > 8) {
    throw new Error('Live hand card count is invalid');
  }
  const targetHandCount = currentHandCount + effect.amount;
  if (targetHandCount < 0 || targetHandCount > 8) {
    throw new Error('Live HandCardCount target is outside the runtime hand range');
  }
  return { targetHandCount, changeCount: effect.amount };
}

export function createLiveUseAllHandEffect(effect: LiveSkillEffect): LiveUseAllHandEffect {
  const details = requireDetails(effect, 42, ['USE_ALL_HAND_SKILL_ADD_AP'], 'UseAllHand');
  const addAp = requireSafeInteger(
    details.get('USE_ALL_HAND_SKILL_ADD_AP')?.effectValue,
    'UseAllHand add AP',
  );
  if (addAp < 0) throw new Error('Live UseAllHand add AP is negative');
  return { effectId: effect.id, addAp };
}

export function applyLiveCardMoveEffect(
  state: LiveDeckBoardState,
  cardInstanceId: number,
  effect: LiveCardMoveEffect,
): LiveDeckBoardState {
  if (!Number.isSafeInteger(cardInstanceId) || cardInstanceId <= 0) {
    throw new Error('Live CardMove card instance ID is invalid');
  }
  return setLiveCardSkillUseAtBoardState(
    state,
    cardInstanceId,
    effect.destination === 'deck' ? liveBoardState.deck : liveBoardState.exclusion,
  );
}
