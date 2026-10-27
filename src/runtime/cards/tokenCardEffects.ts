import { resolveLiveAdditionalBuffTarget } from '../skills/additionalBuffTarget.ts';

import type { LiveSkillEffect } from '../skills/skillTypes.ts';
import { createLiveSkillEffectDuration } from '../skills/skillEffectDuration.ts';

import type { LiveTokenCardEffect } from './deckActionTypes.ts';
import type { LiveBoostTokenCardEffect } from './deckActionTypes.ts';
import type { LiveSwitchTokenCardDeckEffect } from './deckActionTypes.ts';
import { requireDetails } from './deckActionDetails.ts';
import { resolveTokenCardSeriesIds } from './deckActionDetails.ts';
import { requireEnum } from './deckActionDetails.ts';
import { requireSafeInteger } from './deckActionDetails.ts';
import { requirePositiveDetail } from './deckActionDetails.ts';
import { requireNonnegativeDetail } from './deckActionDetails.ts';
import { requirePositiveParam } from './deckActionDetails.ts';

export function createLiveTokenCardEffect(effect: LiveSkillEffect): LiveTokenCardEffect {
  const details = requireDetails(
    effect,
    28,
    [
      'TOKEN_CARD_RESOURCE_ID',
      'TOKEN_CARD_STYLE_TYPE',
      'TOKEN_CARD_MOOD_TYPE',
      'TOKEN_CARD_SKILL_CARD_SKILL_SERIES_ID',
      'TOKEN_CARD_ABILITY_CARD_SKILL_SERIES_ID',
      'TOKEN_CARD_CARD_COUNT',
      'TOKEN_CARD_SERIES_ID',
    ],
    'TokenCard',
    ['TOKEN_CARD_ABILITY_LEVEL_REFERENCE'],
    [],
    ['TOKEN_CARD_RESOURCE_ID'],
  );
  const resourceDetail = details.get('TOKEN_CARD_RESOURCE_ID');
  const tokenCardSeriesIds = resolveTokenCardSeriesIds(
    details.get('TOKEN_CARD_SERIES_ID'),
    resourceDetail,
  );
  return {
    effectId: effect.id,
    resourceId: requirePositiveDetail(details, 'TOKEN_CARD_RESOURCE_ID', 'TokenCard resource ID'),
    styleType: requirePositiveDetail(details, 'TOKEN_CARD_STYLE_TYPE', 'TokenCard style type'),
    moodType: requirePositiveDetail(details, 'TOKEN_CARD_MOOD_TYPE', 'TokenCard mood type'),
    skillCardSkillSeriesId: requirePositiveDetail(
      details,
      'TOKEN_CARD_SKILL_CARD_SKILL_SERIES_ID',
      'TokenCard skill series ID',
    ),
    abilityCardSkillSeriesId: requirePositiveDetail(
      details,
      'TOKEN_CARD_ABILITY_CARD_SKILL_SERIES_ID',
      'TokenCard ability series ID',
    ),
    cardCount: requireNonnegativeDetail(details, 'TOKEN_CARD_CARD_COUNT', 'TokenCard card count'),
    abilityLevelReference: requireEnum(
      details,
      'TOKEN_CARD_ABILITY_LEVEL_REFERENCE',
      [0, 1, 2],
      'TokenCard ability level reference',
      (value) => (value === 0 ? 'none' : value === 1 ? 'special-appeal' : 'skill'),
      true,
    ),
    tokenCardSeriesIds,
  };
}

export function createLiveBoostTokenCardEffect(
  effect: LiveSkillEffect,
  currentTimeSeconds: number,
): LiveBoostTokenCardEffect {
  const details = requireDetails(
    effect,
    38,
    [
      'BOOST_TOKEN_CARD_CALC_TYPE',
      'BOOST_TOKEN_CARD_NUM',
      'BOOST_TOKEN_CARD_DISPLAY_TIME_TYPE',
      'BOOST_TOKEN_CARD_DISPLAY_TIME',
      'BOOST_TOKEN_CARD_DISABLED_TYPE',
      'BOOST_TOKEN_CARD_DISABLED',
      'BOOST_TOKEN_CARD_TARGET_TYPE',
      'BOOST_TOKEN_CARD_TARGET_ID',
      'BOOST_TOKEN_CARD_TOKEN_CARD_SERIES_ID',
    ],
    'BoostTokenCard',
    [],
    ['BOOST_TOKEN_CARD_TOKEN_CARD_SERIES_ID'],
  );
  const disabledType = requireSafeInteger(
    details.get('BOOST_TOKEN_CARD_DISABLED_TYPE')?.effectValue,
    'BoostTokenCard disabled type',
  );
  const disabledValue = requireSafeInteger(
    details.get('BOOST_TOKEN_CARD_DISABLED')?.effectValue,
    'BoostTokenCard disabled value',
  );
  const disabled = (() => {
    switch (disabledType) {
      case 0:
        if (disabledValue !== 0) throw new Error('Live BoostTokenCard disabled value is invalid');
        return { kind: 'none' } as const;
      case 1:
        if (disabledValue < 1) throw new Error('Live BoostTokenCard disabled count is invalid');
        return { kind: 'use-count', count: disabledValue } as const;
      default:
        throw new Error('Live BoostTokenCard disabled type is invalid');
    }
  })();
  return {
    effectId: effect.id,
    calculation: requireEnum(
      details,
      'BOOST_TOKEN_CARD_CALC_TYPE',
      [1, 2],
      'BoostTokenCard calculation type',
      (value) => (value === 1 ? 'multiply' : 'add'),
    ),
    amount: requireSafeInteger(
      details.get('BOOST_TOKEN_CARD_NUM')?.effectValue,
      'BoostTokenCard amount',
    ),
    duration: createLiveSkillEffectDuration(
      requireSafeInteger(
        details.get('BOOST_TOKEN_CARD_DISPLAY_TIME_TYPE')?.effectValue,
        'BoostTokenCard display time type',
      ),
      requireSafeInteger(
        details.get('BOOST_TOKEN_CARD_DISPLAY_TIME')?.effectValue,
        'BoostTokenCard display time',
      ),
      currentTimeSeconds,
      'BoostTokenCard',
    ),
    disabled,
    target: resolveLiveAdditionalBuffTarget(
      requireSafeInteger(
        details.get('BOOST_TOKEN_CARD_TARGET_TYPE')?.effectValue,
        'BoostTokenCard target type',
      ),
      requireSafeInteger(
        details.get('BOOST_TOKEN_CARD_TARGET_ID')?.effectValue,
        'BoostTokenCard target ID',
      ),
      'BoostTokenCard',
    ),
    tokenCardSeriesId: requirePositiveParam(
      details.get('BOOST_TOKEN_CARD_TOKEN_CARD_SERIES_ID'),
      'BOOST_TOKEN_CARD_TOKEN_CARD_SERIES_ID',
      'BoostTokenCard token series ID',
    ),
  };
}

export function createLiveSwitchTokenCardDeckEffect(
  effect: LiveSkillEffect,
  currentTimeSeconds: number,
): LiveSwitchTokenCardDeckEffect {
  const details = requireDetails(
    effect,
    43,
    [
      'SWITCH_TOKEN_CARD_DECK_SERIES_ID',
      'SWITCH_TOKEN_CARD_DECK_DISPLAY_TIME_TYPE',
      'SWITCH_TOKEN_CARD_DECK_DISPLAY_TIME',
    ],
    'SwitchTokenCardDeck',
    [],
    ['SWITCH_TOKEN_CARD_DECK_SERIES_ID'],
  );
  return {
    effectId: effect.id,
    tokenCardSeriesId: requirePositiveParam(
      details.get('SWITCH_TOKEN_CARD_DECK_SERIES_ID'),
      'SWITCH_TOKEN_CARD_DECK_SERIES_ID',
      'SwitchTokenCardDeck series ID',
    ),
    duration: createLiveSkillEffectDuration(
      requireSafeInteger(
        details.get('SWITCH_TOKEN_CARD_DECK_DISPLAY_TIME_TYPE')?.effectValue,
        'SwitchTokenCardDeck display time type',
      ),
      requireSafeInteger(
        details.get('SWITCH_TOKEN_CARD_DECK_DISPLAY_TIME')?.effectValue,
        'SwitchTokenCardDeck display time',
      ),
      currentTimeSeconds,
      'SwitchTokenCardDeck',
    ),
  };
}
