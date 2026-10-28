import {
  absorbLiveProxySkillEffect,
  createLiveProxyAbsorbInfo,
  liveProxyTargetReached,
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
import { int64ToFloat32 } from '../../runtime/numeric.ts';

type ApplyProxyEffect = EffectApplier;

export function registerProxySkill(
  state: GameState,
  effect: ProxySkillEffect,
  card: Card | undefined,
): GameState {
  if (!card) return state;
  if (effect.periodType === 3 ? effect.induceTiming !== 1 : effect.periodParam < 1n) return state;
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
    inducedEffects: effect.effects,
  };
  const absorption: GameState['proxySkills'][number] =
    effect.periodType === 1
      ? {
          ...common,
          periodType: 1,
          remainingPeriod: Math.fround(int64ToFloat32(effect.periodParam) / Math.fround(1000)),
        }
      : {
          ...common,
          periodType: effect.periodType,
          remainingPeriod: effect.periodParam,
        };
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
  elapsedSeconds: number,
  apply: ApplyProxyEffect,
): GameState {
  let next = state;
  for (const initialAbsorption of state.proxySkills) {
    const absorption = next.proxySkills.find((item) => item.id === initialAbsorption.id);
    if (!absorption) continue;
    if (absorption.isAbsorbEnd) continue;
    if (absorption.periodType !== 1) continue;
    const remainingPeriod = Math.fround(absorption.remainingPeriod - Math.fround(elapsedSeconds));
    if (remainingPeriod <= 0 && absorption.induceTiming === 3)
      next = endProxySkillState(next, absorption, apply);
    else if (remainingPeriod <= 0) next = finishProxySkillState(next, absorption, apply);
    else next = updateProxySkillStatePeriod(next, absorption, remainingPeriod);
  }
  return next;
}

export function advanceProxySkillSections(state: GameState, apply: ApplyProxyEffect): GameState {
  let next = state;
  for (const initialAbsorption of state.proxySkills) {
    const absorption = next.proxySkills.find((item) => item.id === initialAbsorption.id);
    if (!absorption) continue;
    if (absorption.isAbsorbEnd) continue;
    if (absorption.periodType !== 2) continue;
    const remainingPeriod = absorption.remainingPeriod - 1n;
    if (remainingPeriod <= 0n && absorption.induceTiming === 1)
      next = endProxySkillState(next, absorption, apply);
    else if (remainingPeriod <= 0n && absorption.induceTiming === 3)
      next = endProxySkillState(next, absorption, apply);
    else if (remainingPeriod <= 0n) next = finishProxySkillState(next, absorption, apply);
    else next = updateProxySkillStatePeriod(next, absorption, remainingPeriod);
  }
  return next;
}

export function advanceProxySkillUses(
  state: GameState,
  usedSourceId: string,
  skillCost: number,
  apply: ApplyProxyEffect,
): GameState {
  let next = state;
  for (const initialAbsorption of state.proxySkills) {
    const absorption = next.proxySkills.find((item) => item.id === initialAbsorption.id);
    if (!absorption) continue;
    if (absorption.isAbsorbEnd) continue;
    if (absorption.cardInstanceId === usedSourceId) continue;
    if (absorption.periodType !== 4 && absorption.periodType !== 5) continue;
    const decrement = BigInt(absorption.periodType === 4 ? 1 : Math.trunc(skillCost));
    const remainingPeriod = absorption.remainingPeriod - decrement;
    if (remainingPeriod <= 0n && absorption.induceTiming === 3)
      next = endProxySkillState(next, absorption, apply);
    else if (remainingPeriod <= 0n) next = finishProxySkillState(next, absorption, apply);
    else next = updateProxySkillStatePeriod(next, absorption, remainingPeriod);
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
  targetType: 1 | 2 | 3 | 4 | 5,
): GameState {
  return {
    ...state,
    proxySkills: state.proxySkills.map((absorption) =>
      matchesForcedActivationTarget(absorption, targetType)
        ? { ...absorption, isAbsorbEnd: true }
        : absorption,
    ),
  };
}

function matchesForcedActivationTarget(
  absorption: GameState['proxySkills'][number],
  targetType: 1 | 2 | 3 | 4 | 5,
): boolean {
  switch (targetType) {
    case 1:
      return true;
    case 2:
      return absorption.hasAbsorbLimit;
    case 3:
      return !absorption.hasAbsorbLimit;
    case 4:
      return (
        absorption.effects.length > 0 &&
        absorption.effects.every((effect) =>
          liveProxyTargetReached(effect, absorption.isAbsoluteAdd),
        )
      );
    case 5:
      return !(
        absorption.effects.length > 0 &&
        absorption.effects.every((effect) =>
          liveProxyTargetReached(effect, absorption.isAbsoluteAdd),
        )
      );
  }
}

function finishProxySkillState(
  state: GameState,
  absorption: GameState['proxySkills'][number],
  apply: ApplyProxyEffect,
): GameState {
  const checkTargets = absorption.induceTiming === 1 || absorption.induceCondition === 2;
  const allTargetsReached = absorption.effects.every((effect) =>
    liveProxyTargetReached(effect, absorption.isAbsoluteAdd),
  );
  if (checkTargets && !allTargetsReached)
    return releaseFailedProxySkillState(state, absorption, apply);
  const card = state.cardPool.find((item) => item.cardInstanceId === absorption.cardInstanceId);
  if (!card) return removeProxySkillState(state, absorption);
  let next = updateProxySkillState(state, absorption, { ...absorption, isAbsorbEnd: true });
  next = absorption.inducedEffects.reduce((current, child) => {
    const power = liveProxyInducePower(
      absorption,
      absorption.inducePowerType,
      absorption.inducePowerParam,
      child.actionType,
    );
    return applyProxyChild(current, child, card, power.multiplyFactor, power.addValue, apply);
  }, next);
  return removeProxySkillState(next, absorption);
}

function applyProxyChild(
  state: GameState,
  child: GameState['proxySkills'][number]['inducedEffects'][number],
  card: Card,
  multiplier: number,
  addValue: number,
  apply: ApplyProxyEffect,
): GameState {
  return completeDeckOutChecks(apply(state, child.effect, card, multiplier, addValue), apply);
}

function endProxySkillState(
  state: GameState,
  absorption: GameState['proxySkills'][number],
  apply: ApplyProxyEffect,
): GameState {
  const checkTargets = absorption.induceTiming === 1 || absorption.induceCondition === 2;
  const allTargetsReached = absorption.effects.every((effect) =>
    liveProxyTargetReached(effect, absorption.isAbsoluteAdd),
  );
  if (checkTargets && !allTargetsReached)
    return releaseFailedProxySkillState(state, absorption, apply);
  return updateProxySkillState(state, absorption, { ...absorption, isAbsorbEnd: true });
}

function updateProxySkillStatePeriod(
  state: GameState,
  current: GameState['proxySkills'][number],
  remainingPeriod: number | bigint,
): GameState {
  if (current.periodType === 1) {
    if (typeof remainingPeriod !== 'number') throw new Error('Proxyの期限値が正しくありません。');
    return updateProxySkillState(state, current, { ...current, remainingPeriod });
  }
  if (typeof remainingPeriod !== 'bigint') throw new Error('Proxyの期限値が正しくありません。');
  return updateProxySkillState(state, current, { ...current, remainingPeriod });
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

function releaseFailedProxySkillState(
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
