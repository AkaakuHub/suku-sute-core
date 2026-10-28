import type { Card, Effect, GameState } from '../model.ts';
import { activateMoodChangeSkill } from './moodChangeSkill.ts';
import { activateGenesisSkill } from './genesisSkill.ts';
import { activateSpecialAppealToken } from './specialAppealToken.ts';
import { forceProxySkillActivation, registerProxySkill } from './proxySkill.ts';
import { activateUseCountInduce, activateUseInduce } from './useInduce.ts';
import { activateEffectInduce } from './effectInduce.ts';
import { activateCardMoveInduce } from './cardMoveInduce.ts';
import type { EffectApplier } from './induceSkillEffect.ts';
import { activateHeartLimitBoost } from './heartLimitBoost.ts';
import { activateMoodValueBoost } from './moodValueBoost.ts';
import { activateVoltageConversion } from './voltageConversion.ts';
import { activateBeatPointBuff } from './beatPointBuff.ts';
import { activateRecoverMentalSkill } from './recoverMentalSkill.ts';
import { activateAddVoltageSkill } from './addVoltageSkill.ts';
import { activateReshuffleSkill } from './reshuffleSkill.ts';
import { activateDrawSuccessInduce } from './drawSuccessInduce.ts';
import { activateSkillScoreUp } from './skillScoreUp.ts';
import { activateBranchInducer } from './branch.ts';

export function dispatchEarlyEffect(
  state: GameState,
  effect: Effect,
  card: Card | undefined,
  multiplier: number,
  addValue: number,
  effectPower: number,
  apply: EffectApplier,
): GameState | undefined {
  if (effect.kind === 'branch' && effect.persistent === true)
    return activateBranchInducer(state, effect, card);
  if (effect.kind === 'skill-score-up')
    return activateSkillScoreUp(state, effect, card, multiplier, addValue, effectPower);
  if (effect.kind === 'proxy-skill-forced-activation')
    return forceProxySkillActivation(state, effect.targetType, apply);
  if (effect.kind === 'proxy-skill') return registerProxySkill(state, effect, card);
  if (effect.kind === 'mood-change-skill')
    return activateMoodChangeSkill(state, effect, card, multiplier, addValue, effectPower);
  if (effect.kind === 'genesis-skill') return activateGenesisSkill(state, effect, card);
  if (effect.kind === 'special-appeal-token') return activateSpecialAppealToken(state, effect);
  if (effect.kind === 'use-induce') return activateUseInduce(state, effect, card, apply);
  if (effect.kind === 'use-count-induce') return activateUseCountInduce(state, effect, card, apply);
  if (effect.kind === 'effect-induce') return activateEffectInduce(state, effect, card);
  if (effect.kind === 'card-move-induce') return activateCardMoveInduce(state, effect, card);
  if (effect.kind === 'heart-limit-boost')
    return activateHeartLimitBoost(state, effect, multiplier, addValue);
  if (effect.kind === 'mood-value-boost')
    return activateMoodValueBoost(state, effect, card, multiplier, addValue);
  if (effect.kind === 'voltage-convert')
    return activateVoltageConversion(state, effect, card, multiplier, addValue);
  if (effect.kind === 'beat-point-buff')
    return activateBeatPointBuff(state, effect, card, multiplier, addValue);
  if (effect.kind === 'recover-mental-skill')
    return activateRecoverMentalSkill(
      state,
      effect,
      card,
      multiplier,
      addValue,
      effectPower,
      apply,
    );
  if (effect.kind === 'add-voltage-skill')
    return activateAddVoltageSkill(state, effect, card, multiplier, addValue, effectPower, apply);
  if (effect.kind === 'reshuffle-skill') return activateReshuffleSkill(state, effect, card);
  if (effect.kind === 'draw-success-induce')
    return activateDrawSuccessInduce(state, effect, card, apply);
  return undefined;
}
