import { createHandCardCountEffect } from '../actionTypeEffects/handCardCount.ts';
import { createApSpeedChangeEffect } from '../actionTypeEffects/apSpeedChange.ts';
import { createVoltageConvertEffect } from '../actionTypeEffects/voltageConvert.ts';
import { createMentalHeartInduceEffect } from '../actionTypeEffects/mentalHeartInduce.ts';
import { createComboInduceEffect } from '../actionTypeEffects/comboInduce.ts';
import { createHeartLimitChangeEffect } from '../actionTypeEffects/heartLimitChange.ts';
import { createStopVoltageIncreaseEffect } from '../actionTypeEffects/stopVoltageIncrease.ts';
import { createDeckSkillCostChangeEffect } from '../actionTypeEffects/deckSkillCostChange.ts';
import { createLoveUpAdditionalBuffEffect } from '../actionTypeEffects/loveUpAdditionalBuff.ts';
import { createVoltageUpAdditionalBuffEffect } from '../actionTypeEffects/voltageUpAdditionalBuff.ts';
import { createMentalRecoverAdditionalBuffEffect } from '../actionTypeEffects/mentalRecoverAdditionalBuff.ts';
import { createMentalBarrierAdditionalBuffEffect } from '../actionTypeEffects/mentalBarrierAdditionalBuff.ts';
import { createDisableMentalDownEffect } from '../actionTypeEffects/disableMentalDown.ts';
import { createChangeModeEffect } from '../actionTypeEffects/changeMode.ts';
import { createVoltageLevelEffect } from '../actionTypeEffects/voltageLevel.ts';
import { createTokenBoostEffect } from '../actionTypeEffects/tokenBoost.ts';
import { createInfinityGaugeEffect } from '../actionTypeEffects/infinityGauge.ts';
import { createUseAllHandEffect } from '../actionTypeEffects/useAllHand.ts';
import { createSwitchTokenDeckEffect } from '../actionTypeEffects/switchTokenDeck.ts';
import { createIngameMissionEffect } from '../actionTypeEffects/ingameMission.ts';
import { createBeatHeartValueEffect } from '../actionTypeEffects/beatHeartValue.ts';
import { createMoodChangeEffect } from '../actionTypeEffects/moodChange.ts';
import { createHeartLimitBoostEffect } from '../actionTypeEffects/heartLimitBoost.ts';
import { createMoodValueBoostEffect } from '../actionTypeEffects/moodValueBoost.ts';
import { createMentalShieldEffect } from '../actionTypeEffects/mentalShield.ts';
import { createGenesisSkillEffect } from '../actionTypeEffects/genesisSkill.ts';
import { createSkillBoostEffect } from '../actionTypeEffects/skillBoost.ts';
import { createHandMaxCardEffect } from '../actionTypeEffects/handMaxCard.ts';
import { createProxyForcedActivationEffect } from '../actionTypeEffects/proxyForcedActivation.ts';
import { createFixedParameterExtendEffect } from '../actionTypeEffects/fixedParameterExtend.ts';
import { createResetSpecialEffect } from '../actionTypeEffects/resetSpecial.ts';
import { createSpecialAppealTokenEffect } from '../actionTypeEffects/specialAppealToken.ts';
import { createAdditionalHeartInduceEffect } from '../actionTypeEffects/additionalHeart.ts';
import { createModeChangeInduceEffect } from '../actionTypeEffects/modeChangeInduce.ts';
import { createProxySkillEffect } from '../actionTypeEffects/proxySkill.ts';
import { createTokenCardEffect } from '../actionTypeEffects/tokenCard.ts';
import { createSkillCooldownEffect } from '../actionTypeEffects/skillCooldown.ts';
import { createInduceSkillEffect } from '../actionTypeEffects/induceSkillEffect.ts';
import { createUseInduceEffect } from '../actionTypeEffects/useInduce.ts';
import { createThresholdInduceEffect } from '../actionTypeEffects/thresholdInduce.ts';
import { assertNeverActionEffect } from './assertNeverActionEffect.ts';

import type { Card } from './cardTypes.ts';
import type { Effect } from '../modelTypes.ts';

type RuntimeActionEffect = Exclude<
  NonNullable<Card['actionEffects']>[number],
  { actionType: 36 | 901 | 902 | 903 | 904 }
>;

import { resolveEarlyActionEffect, type EarlyActionEffect } from './resolveEarlyActionEffect.ts';

export function resolveActionEffect(actionEffect: RuntimeActionEffect): Effect | null {
  switch (actionEffect.actionType) {
    case 26:
      return createStopVoltageIncreaseEffect(actionEffect);
    case 1:
    case 2:
    case 3:
    case 5:
    case 6:
    case 7:
    case 10:
    case 11:
    case 12:
    case 13:
    case 14:
    case 15:
    case 16:
    case 17:
    case 18:
    case 19:
      return resolveEarlyActionEffect(actionEffect);
    default:
      return resolveLaterActionEffect(actionEffect);
  }
}

type LaterActionEffect = Exclude<RuntimeActionEffect, EarlyActionEffect | { actionType: 26 }>;

function resolveLaterActionEffect(actionEffect: LaterActionEffect): Effect {
  return actionEffect.actionType === 20
    ? createHandCardCountEffect(actionEffect)
    : actionEffect.actionType === 21
      ? createApSpeedChangeEffect({
          ...actionEffect,
          details: actionEffect.details.map((detail) => ({
            ...detail,
            targetMood: detail.targetMood ?? 0,
          })),
        })
      : actionEffect.actionType === 22
        ? createVoltageConvertEffect(actionEffect)
        : actionEffect.actionType === 23
          ? createMentalHeartInduceEffect(actionEffect)
          : actionEffect.actionType === 24
            ? createComboInduceEffect({
                ...actionEffect,
                effects: actionEffect.childEffects,
              })
            : actionEffect.actionType === 25
              ? createHeartLimitChangeEffect({
                  ...actionEffect,
                  details: actionEffect.details.map((detail) => ({
                    ...detail,
                    targetMood: detail.targetMood ?? 0,
                  })),
                })
              : actionEffect.actionType === 27
                ? createAdditionalHeartInduceEffect(actionEffect)
                : actionEffect.actionType === 28
                  ? createTokenCardEffect(actionEffect)
                  : actionEffect.actionType === 29
                    ? createDeckSkillCostChangeEffect(actionEffect)
                    : actionEffect.actionType === 30
                      ? createLoveUpAdditionalBuffEffect({
                          ...actionEffect,
                          details: actionEffect.details.map((detail) => ({
                            ...detail,
                            targetMood: detail.targetMood ?? 0,
                          })),
                        })
                      : actionEffect.actionType === 31
                        ? createVoltageUpAdditionalBuffEffect({
                            ...actionEffect,
                            details: actionEffect.details.map((detail) => ({
                              ...detail,
                              targetMood: detail.targetMood ?? 0,
                            })),
                          })
                        : actionEffect.actionType === 32
                          ? createMentalRecoverAdditionalBuffEffect({
                              ...actionEffect,
                              details: actionEffect.details.map((detail) => ({
                                ...detail,
                                targetMood: detail.targetMood ?? 0,
                              })),
                            })
                          : actionEffect.actionType === 33
                            ? createMentalBarrierAdditionalBuffEffect({
                                ...actionEffect,
                                details: actionEffect.details.map((detail) => ({
                                  ...detail,
                                  targetMood: detail.targetMood ?? 0,
                                })),
                              })
                            : actionEffect.actionType === 34
                              ? createDisableMentalDownEffect(actionEffect)
                              : actionEffect.actionType === 35
                                ? createChangeModeEffect(actionEffect)
                                : actionEffect.actionType === 37
                                  ? createVoltageLevelEffect(actionEffect)
                                  : actionEffect.actionType === 38
                                    ? createTokenBoostEffect(actionEffect)
                                    : actionEffect.actionType === 39
                                      ? createInfinityGaugeEffect(actionEffect)
                                      : actionEffect.actionType === 40
                                        ? createSkillCooldownEffect(actionEffect)
                                        : actionEffect.actionType === 41
                                          ? createInduceSkillEffect({
                                              ...actionEffect,
                                              effects: actionEffect.childEffects,
                                            })
                                          : actionEffect.actionType === 42
                                            ? createUseAllHandEffect(actionEffect)
                                            : actionEffect.actionType === 43
                                              ? createSwitchTokenDeckEffect(actionEffect)
                                              : actionEffect.actionType === 44
                                                ? createIngameMissionEffect(actionEffect)
                                                : actionEffect.actionType === 53
                                                  ? createSpecialAppealTokenEffect(actionEffect)
                                                  : actionEffect.actionType === 45
                                                    ? createModeChangeInduceEffect({
                                                        ...actionEffect,
                                                        effects: actionEffect.childEffects,
                                                      })
                                                    : actionEffect.actionType === 46
                                                      ? createProxySkillEffect({
                                                          ...actionEffect,
                                                          effects: actionEffect.childEffects,
                                                        })
                                                      : actionEffect.actionType === 47
                                                        ? createBeatHeartValueEffect({
                                                            ...actionEffect,
                                                            details: actionEffect.details.map(
                                                              (detail) => ({
                                                                ...detail,
                                                                targetMood: detail.targetMood ?? 0,
                                                              }),
                                                            ),
                                                          })
                                                        : actionEffect.actionType === 48
                                                          ? createMoodChangeEffect(actionEffect)
                                                          : actionEffect.actionType === 49
                                                            ? createHeartLimitBoostEffect({
                                                                ...actionEffect,
                                                                details: actionEffect.details.map(
                                                                  (detail) => ({
                                                                    ...detail,
                                                                    targetMood:
                                                                      detail.targetMood ?? 0,
                                                                  }),
                                                                ),
                                                              })
                                                            : actionEffect.actionType === 50
                                                              ? createMoodValueBoostEffect({
                                                                  ...actionEffect,
                                                                  details: actionEffect.details.map(
                                                                    (detail) => ({
                                                                      ...detail,
                                                                      targetMood:
                                                                        detail.targetMood ?? 0,
                                                                    }),
                                                                  ),
                                                                })
                                                              : actionEffect.actionType === 51
                                                                ? createGenesisSkillEffect(
                                                                    actionEffect,
                                                                  )
                                                                : actionEffect.actionType === 52
                                                                  ? createSkillBoostEffect({
                                                                      ...actionEffect,
                                                                      details:
                                                                        actionEffect.details.map(
                                                                          (detail) => ({
                                                                            ...detail,
                                                                            targetMood:
                                                                              detail.targetMood ??
                                                                              0,
                                                                          }),
                                                                        ),
                                                                    })
                                                                  : actionEffect.actionType === 54
                                                                    ? createHandMaxCardEffect({
                                                                        skillEffectId:
                                                                          actionEffect.skillEffectId,
                                                                        details:
                                                                          actionEffect.details,
                                                                      })
                                                                    : actionEffect.actionType === 55
                                                                      ? createResetSpecialEffect(
                                                                          actionEffect,
                                                                        )
                                                                      : actionEffect.actionType ===
                                                                          56
                                                                        ? createMentalShieldEffect({
                                                                            ...actionEffect,
                                                                            details:
                                                                              actionEffect.details.map(
                                                                                (detail) => ({
                                                                                  ...detail,
                                                                                  targetMood:
                                                                                    detail.targetMood ??
                                                                                    0,
                                                                                }),
                                                                              ),
                                                                          })
                                                                        : actionEffect.actionType ===
                                                                            57
                                                                          ? createProxyForcedActivationEffect(
                                                                              actionEffect,
                                                                            )
                                                                          : actionEffect.actionType ===
                                                                              58
                                                                            ? createFixedParameterExtendEffect(
                                                                                actionEffect,
                                                                              )
                                                                            : actionEffect.actionType ===
                                                                                  905 ||
                                                                                actionEffect.actionType ===
                                                                                  906
                                                                              ? createUseInduceEffect(
                                                                                  actionEffect,
                                                                                )
                                                                              : actionEffect.actionType ===
                                                                                    907 ||
                                                                                  actionEffect.actionType ===
                                                                                    908
                                                                                ? createThresholdInduceEffect(
                                                                                    actionEffect,
                                                                                  )
                                                                                : assertNeverActionEffect(
                                                                                    actionEffect,
                                                                                  );
}
