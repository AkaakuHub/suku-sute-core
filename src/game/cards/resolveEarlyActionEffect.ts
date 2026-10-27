import type { Card } from './cardTypes.ts';
import type { Effect } from '../modelTypes.ts';
import { createAddHeartEffect } from '../actionTypeEffects/addHeart.ts';
import { createLoveUpEffect } from '../actionTypeEffects/loveUp.ts';
import { createBeatPointEffect } from '../actionTypeEffects/beatPoint.ts';
import { createRecoverMentalEffect } from '../actionTypeEffects/recoverMental.ts';
import { createMentalRegenerationEffect } from '../actionTypeEffects/regenMental.ts';
import { createMentalBarrierEffect } from '../actionTypeEffects/mentalBarrier.ts';
import { createAddVoltageEffect } from '../actionTypeEffects/addVoltage.ts';
import { createVoltageRegenerationEffect } from '../actionTypeEffects/regenVoltage.ts';
import { createReshuffleEffect } from '../actionTypeEffects/reshuffle.ts';
import { createCardSearchEffect } from '../actionTypeEffects/cardSearch.ts';
import { createHeartUpEffect } from '../actionTypeEffects/heartUp.ts';
import { createRecoverSkillGaugeEffect } from '../actionTypeEffects/recoverSkillGauge.ts';
import { createSkillCostChangeEffect } from '../actionTypeEffects/skillCostChange.ts';
import { createParameterValueChangeEffect } from '../actionTypeEffects/parameterValueChange.ts';
import { assertNeverActionEffect } from './assertNeverActionEffect.ts';

type RuntimeActionEffect = Exclude<NonNullable<Card['actionEffects']>[number], { actionType: 36 }>;

export type EarlyActionEffect = Extract<
  RuntimeActionEffect,
  {
    actionType: 1 | 2 | 3 | 5 | 6 | 7 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19;
  }
>;

export function resolveEarlyActionEffect(actionEffect: EarlyActionEffect): Effect | null {
  switch (actionEffect.actionType) {
    case 1:
      return createAddHeartEffect(actionEffect);
    case 2:
      return createLoveUpEffect(actionEffect);
    case 3:
      return createBeatPointEffect(actionEffect);
    case 5:
      return createRecoverMentalEffect(actionEffect);
    case 6:
      return createMentalRegenerationEffect(actionEffect);
    case 7:
      return createMentalBarrierEffect({
        ...actionEffect,
        details: actionEffect.details.map((detail) => ({
          ...detail,
          targetMood: detail.targetMood ?? 0,
        })),
      });
    case 10:
      return createAddVoltageEffect(actionEffect);
    case 11:
      return createVoltageRegenerationEffect(actionEffect);
    case 12:
      return {
        kind: 'branch',
        condition: actionEffect.condition,
        whenTrue: actionEffect.whenTrue,
        whenFalse: actionEffect.whenFalse,
        ...(actionEffect.persistent !== undefined ? { persistent: actionEffect.persistent } : {}),
        ...(actionEffect.deactivationKey !== undefined
          ? { deactivationKey: actionEffect.deactivationKey }
          : {}),
      };
    case 13:
      return createReshuffleEffect(actionEffect);
    case 14:
      return createRecoverSkillGaugeEffect(actionEffect);
    case 15:
      return createCardSearchEffect(actionEffect);
    case 16:
      return createHeartUpEffect(actionEffect);
    case 17:
      return createSkillCostChangeEffect(actionEffect);
    case 18:
      return createParameterValueChangeEffect(actionEffect);
    case 19:
      return { kind: 'card-move', destination: actionEffect.moveDestination };
  }
  return assertNeverActionEffect(actionEffect);
}
