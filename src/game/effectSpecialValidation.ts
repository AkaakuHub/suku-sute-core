import { validateDisableMentalDownEffect } from './disableMentalDownTypes.ts';
import { validateMentalBarrierAdditionalBuffEffect } from './mentalBarrierAdditionalBuffTypes.ts';
import { validateMentalRecoverAdditionalBuffEffect } from './mentalRecoverAdditionalBuffTypes.ts';
import type { Effect } from './model.ts';
import { validateDeckSkillCostChange } from './skillCostChangeTypes.ts';
import { validateLoveUpAdditionalBuffEffect } from './loveUpAdditionalBuffTypes.ts';
import { validateVoltageUpAdditionalBuffEffect } from './voltageUpAdditionalBuffTypes.ts';
import { validateSpecialAppealTokenEffect } from './specialAppealTokenTypes.ts';
import { validateHandMaxCardEffect } from './handMaxCardTypes.ts';
import { validateMentalShieldEffect } from './mentalShieldTypes.ts';
import { validateFixedParameterExtendEffect } from './fixedParameterExtendTypes.ts';
import {
  validateEffectInduceEffect,
  validateCardMoveInduceEffect,
  validateUseCountInduceEffect,
  validateUseInduceEffect,
} from './useInduceTypes.ts';
import { validateReshuffleSkillEffect } from './reshuffleSkillTypes.ts';
import { validateProxyForcedActivationEffect } from './proxySkillTypes.ts';

type SpecialEffect = Extract<
  Effect,
  {
    kind:
      | 'deck-skill-cost-change'
      | 'love-up-additional-buff'
      | 'voltage-up-additional-buff'
      | 'recover-mental-additional-buff'
      | 'mental-barrier-additional-buff'
      | 'disable-mental-down'
      | 'special-appeal-token'
      | 'hand-max-card'
      | 'mental-shield'
      | 'fixed-parameter-extend'
      | 'use-induce'
      | 'use-count-induce'
      | 'effect-induce'
      | 'card-move-induce'
      | 'reshuffle-skill'
      | 'proxy-skill-forced-activation';
  }
>;

export function validateSpecialEffect(
  effect: Effect,
  validateChild: (effect: Effect) => void,
): boolean {
  if (!isSpecialEffect(effect)) return false;
  switch (effect.kind) {
    case 'deck-skill-cost-change':
      validateDeckSkillCostChange(effect);
      break;
    case 'love-up-additional-buff':
      validateLoveUpAdditionalBuffEffect(effect);
      break;
    case 'voltage-up-additional-buff':
      validateVoltageUpAdditionalBuffEffect(effect);
      break;
    case 'recover-mental-additional-buff':
      validateMentalRecoverAdditionalBuffEffect(effect);
      break;
    case 'mental-barrier-additional-buff':
      validateMentalBarrierAdditionalBuffEffect(effect);
      break;
    case 'disable-mental-down':
      validateDisableMentalDownEffect(effect);
      break;
    case 'special-appeal-token':
      validateSpecialAppealTokenEffect(effect);
      break;
    case 'hand-max-card':
      validateHandMaxCardEffect(effect);
      break;
    case 'mental-shield':
      validateMentalShieldEffect(effect);
      break;
    case 'fixed-parameter-extend':
      validateFixedParameterExtendEffect(effect);
      break;
    case 'use-induce':
      validateUseInduceEffect(effect, validateChild);
      break;
    case 'use-count-induce':
      validateUseCountInduceEffect(effect, validateChild);
      break;
    case 'effect-induce':
      validateEffectInduceEffect(effect, validateChild);
      break;
    case 'card-move-induce':
      validateCardMoveInduceEffect(effect, validateChild);
      break;
    case 'reshuffle-skill':
      validateReshuffleSkillEffect(effect);
      break;
    case 'proxy-skill-forced-activation':
      validateProxyForcedActivationEffect(effect);
      break;
  }
  return true;
}

function isSpecialEffect(effect: Effect): effect is SpecialEffect {
  return (
    effect.kind === 'deck-skill-cost-change' ||
    effect.kind === 'love-up-additional-buff' ||
    effect.kind === 'voltage-up-additional-buff' ||
    effect.kind === 'recover-mental-additional-buff' ||
    effect.kind === 'mental-barrier-additional-buff' ||
    effect.kind === 'disable-mental-down' ||
    effect.kind === 'special-appeal-token' ||
    effect.kind === 'hand-max-card' ||
    effect.kind === 'mental-shield' ||
    effect.kind === 'fixed-parameter-extend' ||
    effect.kind === 'use-induce' ||
    effect.kind === 'use-count-induce' ||
    effect.kind === 'effect-induce' ||
    effect.kind === 'card-move-induce' ||
    effect.kind === 'reshuffle-skill' ||
    effect.kind === 'proxy-skill-forced-activation'
  );
}
