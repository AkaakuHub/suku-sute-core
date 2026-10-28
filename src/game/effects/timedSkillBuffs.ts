import {
  advanceDisableMentalDownEffects,
  expireDisableMentalDownEffectSections,
} from './disableMentalDown.ts';
import {
  advanceMentalBarrierAdditionalBuffs,
  expireMentalBarrierAdditionalBuffSections,
} from './mentalBarrierAdditionalBuff.ts';
import {
  advanceMentalRecoverAdditionalBuffs,
  expireMentalRecoverAdditionalBuffSections,
} from './mentalRecoverAdditionalBuff.ts';
import type { GameState } from '../model.ts';
import {
  advanceAction52SkillBoosts,
  expireAction52SkillBoostSections,
} from './action52SkillBoost.ts';
import {
  advanceLoveUpAdditionalBuffs,
  expireLoveUpAdditionalBuffSections,
} from './loveUpAdditionalBuff.ts';
import {
  advanceVoltageUpAdditionalBuffs,
  expireVoltageUpAdditionalBuffSections,
} from './voltageUpAdditionalBuff.ts';
import {
  advanceBeatHeartValueBuffs,
  expireBeatHeartValueBuffSections,
} from './beatHeartValueBuff.ts';
import { advanceMoodChangeSkills, expireMoodChangeSkillSections } from './moodChangeSkill.ts';
import {
  advanceHeartLimitAdditionalBuffs,
  expireHeartLimitAdditionalBuffSections,
} from './heartLimitBoost.ts';
import {
  advanceMoodValueAdditionalBuffs,
  expireMoodValueAdditionalBuffSections,
} from './moodValueBoost.ts';
import { advanceSpecialAppealTokenCooldowns } from './specialAppealToken.ts';
import { advanceMentalShields, expireMentalShieldSections } from './mentalShield.ts';
import {
  advanceFixedParameterExtends,
  expireFixedParameterExtendSections,
} from './fixedParameterExtend.ts';

export function advanceTimedSkillBuffs(state: GameState, elapsedSeconds: number): GameState {
  return advanceFixedParameterExtends(
    advanceMentalShields(
      advanceSpecialAppealTokenCooldowns(
        advanceMoodValueAdditionalBuffs(
          advanceHeartLimitAdditionalBuffs(
            advanceMoodChangeSkills(
              advanceBeatHeartValueBuffs(
                advanceDisableMentalDownEffects(
                  advanceMentalBarrierAdditionalBuffs(
                    advanceMentalRecoverAdditionalBuffs(
                      advanceVoltageUpAdditionalBuffs(
                        advanceLoveUpAdditionalBuffs(
                          advanceAction52SkillBoosts(state, elapsedSeconds),
                          elapsedSeconds,
                        ),
                        elapsedSeconds,
                      ),
                      elapsedSeconds,
                    ),
                    elapsedSeconds,
                  ),
                  elapsedSeconds,
                ),
                elapsedSeconds,
              ),
              elapsedSeconds,
            ),
            elapsedSeconds,
          ),
          elapsedSeconds,
        ),
        elapsedSeconds,
      ),
      elapsedSeconds,
    ),
    elapsedSeconds,
  );
}

export function expireTimedSkillBuffSections(state: GameState): GameState {
  return expireFixedParameterExtendSections(
    expireMentalShieldSections(
      expireMoodValueAdditionalBuffSections(
        expireHeartLimitAdditionalBuffSections(
          expireMoodChangeSkillSections(
            expireBeatHeartValueBuffSections(
              expireDisableMentalDownEffectSections(
                expireMentalBarrierAdditionalBuffSections(
                  expireMentalRecoverAdditionalBuffSections(
                    expireVoltageUpAdditionalBuffSections(
                      expireLoveUpAdditionalBuffSections(expireAction52SkillBoostSections(state)),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    ),
  );
}
