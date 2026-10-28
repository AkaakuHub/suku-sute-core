import {
  forceLiveProxySkillActivation,
  selectLiveProxySkillsForForcedActivation,
} from '../../runtime/skills/proxyForcedActivation.ts';
import {
  absorbLiveProxySkillEffect,
  createLiveProxyAbsorbInfo,
  liveProxyInducePower,
} from '../../runtime/skills/proxyAbsorption.ts';
import {
  updateLiveCardSkillUseAtBoardState,
  liveDeckBoardCardInstanceIds,
  liveBoardState,
} from '../../runtime/cards/deckBoardState.ts';
import { setCardSkillUseAtBoardState } from '../cards/skillUseAtBoardState.ts';
import type { Card, GameState } from '../model.ts';
import type { ProxySkillEffect } from '../modelTypes.ts';
import type { EffectApplier } from './induceSkillEffect.ts';
import { induceCardMoves } from './cardMoveInduce.ts';
import { completeDeckOutChecks } from './deckOutCheck.ts';
import {
  advanceLiveProxySkillPeriod,
  checkLiveProxySkillEnd,
  createLiveProxySkillPeriod,
  type LiveProxySkillPeriodEvent,
} from '../../runtime/skills/proxyLifecycle.ts';

type ApplyProxyEffect = EffectApplier;

export function registerProxySkill(
  state: GameState,
  effect: ProxySkillEffect,
  card: Card | undefined,
): GameState {
  if (!card) return state;
  const period = createLiveProxySkillPeriod(
    effect.periodType,
    effect.periodParam,
    effect.induceTiming,
  );
  if (period === null) return state;
  const common = {
    id: state.nextProxySkillId,
    ...createLiveProxyAbsorbInfo(
      card.cardInstanceId,
      BigInt(effect.absorbLimit),
      effect.targets.map((target) => ({
        actionType: BigInt(Math.trunc(target.actionType)),
        targetAmount: BigInt(Math.trunc(target.targetAmount)),
      })),
    ),
    induceTiming: effect.induceTiming,
    induceCondition: effect.induceCondition,
    inducePowerType: effect.inducePowerType,
    inducePowerParam: effect.inducePowerParam,
    induceEffects: effect.effects,
  };
  const absorption: GameState['proxySkills'][number] = { ...common, ...period };
  return {
    ...state,
    proxySkills: [...state.proxySkills, absorption],
    nextProxySkillId: state.nextProxySkillId + 1,
    deckBoard: setCardSkillUseAtBoardState(state, card.cardInstanceId, liveBoardState.proxy)
      .deckBoard,
  };
}

export function advanceProxySkillPeriods(
  state: GameState,
  deltaTimeSeconds: number,
  apply: ApplyProxyEffect,
): GameState {
  return advanceProxySkillPeriodEvent(state, { kind: 'clock', deltaTimeSeconds }, apply);
}

export function advanceProxySkillSections(state: GameState, apply: ApplyProxyEffect): GameState {
  return advanceProxySkillPeriodEvent(state, { kind: 'section-change' }, apply);
}

export function advanceProxySkillUses(
  state: GameState,
  cardInstanceId: string,
  consumeAp: number,
  apply: ApplyProxyEffect,
): GameState {
  return advanceProxySkillPeriodEvent(
    state,
    { kind: 'skill-activation', cardInstanceId, consumeAp },
    apply,
  );
}

function advanceProxySkillPeriodEvent(
  state: GameState,
  event: LiveProxySkillPeriodEvent,
  apply: ApplyProxyEffect,
): GameState {
  let next = state;
  for (const initial of state.proxySkills) {
    const current = next.proxySkills.find((item) => item.id === initial.id);
    if (!current) continue;
    const advanced = advanceLiveProxySkillPeriod(current, event);
    if (advanced.state !== current) next = updateProxySkillState(next, current, advanced.state);
    if (advanced.periodEnded) next = finishProxySkillState(next, advanced.state, apply);
  }
  return next;
}

export function absorbSkillEffect(
  state: GameState,
  actionType: number,
  amount: bigint,
): Readonly<{ state: GameState; absorbed: boolean }> {
  const result = absorbLiveProxySkillEffect(state.proxySkills, actionType, amount);
  return {
    state: result.states === state.proxySkills ? state : { ...state, proxySkills: result.states },
    absorbed: result.absorbed,
  };
}

export function forceProxySkillActivation(
  state: GameState,
  targetType: bigint,
  apply: ApplyProxyEffect,
): GameState {
  const targets = selectLiveProxySkillsForForcedActivation(state.proxySkills, targetType);
  let next = state;
  for (const target of targets) {
    const current = next.proxySkills.find((entry) => entry.id === target.id);
    if (!current) continue;
    const ended = forceLiveProxySkillActivation(current);
    next = updateProxySkillState(next, target, ended);
    next = induceProxySkillState(next, ended, apply);
  }
  return next;
}

function finishProxySkillState(
  state: GameState,
  absorption: GameState['proxySkills'][number],
  apply: ApplyProxyEffect,
): GameState {
  const checked = checkLiveProxySkillEnd(absorption, true);
  let next =
    checked.state === absorption ? state : updateProxySkillState(state, absorption, checked.state);
  if (checked.result === 'release') return releaseProxySkillState(next, checked.state, apply);
  if (checked.result !== 'induce') return next;
  return induceProxySkillState(next, checked.state, apply);
}

function induceProxySkillState(
  state: GameState,
  absorption: GameState['proxySkills'][number],
  apply: ApplyProxyEffect,
): GameState {
  let next = state;
  const card = state.cardPool.find((item) => item.cardInstanceId === absorption.cardInstanceId);
  if (!card) return removeProxySkillState(next, absorption);
  next = absorption.induceEffects.reduce((current, child) => {
    const power = liveProxyInducePower(
      absorption,
      absorption.inducePowerType,
      absorption.inducePowerParam,
      child.actionType,
    );
    return applyProxyChild(current, child, card, power.multiplyFactor, power.addValue, apply);
  }, next);
  return releaseProxySkillState(next, absorption, apply);
}

function applyProxyChild(
  state: GameState,
  child: GameState['proxySkills'][number]['induceEffects'][number],
  card: Card,
  multiplier: number,
  addValue: number,
  apply: ApplyProxyEffect,
): GameState {
  return completeDeckOutChecks(apply(state, child.effect, card, multiplier, addValue), apply);
}

function updateProxySkillState(
  state: GameState,
  current: GameState['proxySkills'][number],
  updated: GameState['proxySkills'][number],
): GameState {
  let replaced = false;
  const proxySkills = state.proxySkills.map((item) => {
    if (replaced || item.id !== current.id) return item;
    replaced = true;
    return updated;
  });
  return replaced ? { ...state, proxySkills } : state;
}

function removeProxySkillState(
  state: GameState,
  absorption: GameState['proxySkills'][number],
): GameState {
  let removed = false;
  const proxySkills = state.proxySkills.filter((item) => {
    if (removed || item.id !== absorption.id) return true;
    removed = true;
    return false;
  });
  return removed ? { ...state, proxySkills } : state;
}

function releaseProxySkillState(
  state: GameState,
  absorption: GameState['proxySkills'][number],
  apply: ApplyProxyEffect,
): GameState {
  let next = removeProxySkillState(state, absorption);
  if (
    !liveDeckBoardCardInstanceIds(state.deckBoard, liveBoardState.proxy).includes(
      absorption.cardInstanceId,
    )
  )
    return next;
  if (
    liveDeckBoardCardInstanceIds(next.deckBoard, liveBoardState.proxy).includes(
      absorption.cardInstanceId,
    )
  )
    next = induceCardMoves(next, new Set([absorption.cardInstanceId]), apply);
  return {
    ...next,
    deckBoard: updateLiveCardSkillUseAtBoardState(next.deckBoard, absorption.cardInstanceId),
  };
}
