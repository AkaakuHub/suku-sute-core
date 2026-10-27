import { applyCostReduction } from '../cards/cost.ts';
import { addSkillCostChange } from '../cards/skillCostChanges.ts';
import type { Card, Effect, GameState } from '../model.ts';
import { applyParameterValueChange } from './parameterValueChange.ts';
import { applyDeckSkillCostChange } from '../cards/deckSkillCostChange.ts';
import { activateLoveUpAdditionalBuff } from '../effects/loveUpAdditionalBuff.ts';
import { activateVoltageUpAdditionalBuff } from '../effects/voltageUpAdditionalBuff.ts';
import { activateMentalRecoverAdditionalBuff } from '../effects/mentalRecoverAdditionalBuff.ts';
import { activateMentalBarrierAdditionalBuff } from '../effects/mentalBarrierAdditionalBuff.ts';
import { activateDisableMentalDown } from '../effects/disableMentalDown.ts';

type ParameterEffect = Extract<
  Effect,
  {
    kind:
      | 'cost-reduction'
      | 'skill-cost-change'
      | 'parameter-value-change'
      | 'deck-skill-cost-change'
      | 'love-up-additional-buff'
      | 'voltage-up-additional-buff'
      | 'recover-mental-additional-buff'
      | 'mental-barrier-additional-buff'
      | 'disable-mental-down';
  }
>;

export function isParameterEffect(effect: Effect): effect is ParameterEffect {
  return [
    'cost-reduction',
    'skill-cost-change',
    'parameter-value-change',
    'deck-skill-cost-change',
    'love-up-additional-buff',
    'voltage-up-additional-buff',
    'recover-mental-additional-buff',
    'mental-barrier-additional-buff',
    'disable-mental-down',
  ].includes(effect.kind);
}

export function applyParameterEffect(
  state: GameState,
  effect: ParameterEffect,
  card: Card | undefined,
  multiplier: number,
  addValue: number,
): GameState {
  switch (effect.kind) {
    case 'cost-reduction':
      return applyCostReduction(state, effect);
    case 'skill-cost-change':
      return addSkillCostChange(state, effect, card, multiplier);
    case 'parameter-value-change':
      return applyParameterValueChange(state, card, effect);
    case 'deck-skill-cost-change':
      return applyDeckSkillCostChange(state, effect, card, multiplier, addValue);
    case 'love-up-additional-buff':
      return activateLoveUpAdditionalBuff(state, effect, card, multiplier, addValue);
    case 'voltage-up-additional-buff':
      return activateVoltageUpAdditionalBuff(state, effect, card, multiplier, addValue);
    case 'recover-mental-additional-buff':
      return activateMentalRecoverAdditionalBuff(state, effect, card, multiplier, addValue);
    case 'mental-barrier-additional-buff':
      return activateMentalBarrierAdditionalBuff(state, effect, card, multiplier, addValue);
    case 'disable-mental-down':
      return activateDisableMentalDown(state, effect);
  }
}
