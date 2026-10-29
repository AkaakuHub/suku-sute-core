import type { Card, Effect, GameState } from '../model.ts';
import type { EffectInduceEffect } from '../induceSkillEffectTypes.ts';
import type { EffectApplier } from './induceSkillEffect.ts';
import { deactivateMentalBarriers } from '../live/mentalBarriers.ts';
import { deactivateBranchInducers, refreshBranchInducers } from './branch.ts';
import { act } from '../actions.ts';
import { completeDeckOutChecks } from './deckOutCheck.ts';
const deactivationActions: readonly ((deactivationKey: string) => import('../model').Action)[] = [
  (deactivationKey) => ({ type: 'deactivate-token-deck', deactivationKey }),
  (deactivationKey) => ({ type: 'deactivate-hand-limit', deactivationKey }),
  (deactivationKey) => ({ type: 'deactivate-hand-max-card', deactivationKey }),
  (deactivationKey) => ({ type: 'deactivate-ap-speed', deactivationKey }),
  (deactivationKey) => ({ type: 'deactivate-voltage-convert', deactivationKey }),
  (deactivationKey) => ({ type: 'deactivate-skill-boost', deactivationKey }),
  (deactivationKey) => ({ type: 'deactivate-mental-heart-induce', deactivationKey }),
  (deactivationKey) => ({ type: 'deactivate-combo-induce', deactivationKey }),
  (deactivationKey) => ({ type: 'deactivate-heart-limit', deactivationKey }),
  (deactivationKey) => ({ type: 'deactivate-voltage-increase', deactivationKey }),
  (deactivationKey) => ({ type: 'deactivate-additional-heart', deactivationKey }),
  (deactivationKey) => ({ type: 'deactivate-love-up-additional-buff', deactivationKey }),
  (deactivationKey) => ({ type: 'deactivate-mental-recover-additional-buff', deactivationKey }),
  (deactivationKey) => ({ type: 'deactivate-mental-barrier-additional-buff', deactivationKey }),
  (deactivationKey) => ({ type: 'deactivate-mental-down', deactivationKey }),
  (deactivationKey) => ({ type: 'deactivate-token-boost', deactivationKey }),
  (deactivationKey) => ({ type: 'deactivate-infinity-gauge', deactivationKey }),
  (deactivationKey) => ({ type: 'deactivate-skill-cooldown', deactivationKey }),
  (deactivationKey) => ({ type: 'deactivate-induced-skill-effect', deactivationKey }),
  (deactivationKey) => ({ type: 'deactivate-beat-heart-value-buff', deactivationKey }),
  (deactivationKey) => ({ type: 'deactivate-mood-change-skill', deactivationKey }),
  (deactivationKey) => ({ type: 'deactivate-heart-limit-boost', deactivationKey }),
  (deactivationKey) => ({ type: 'deactivate-mood-value-boost', deactivationKey }),
  (deactivationKey) => ({ type: 'deactivate-beat-point-buff', deactivationKey }),
  (deactivationKey) => ({ type: 'deactivate-gauge-regeneration', deactivationKey }),
  (deactivationKey) => ({ type: 'deactivate-search', deactivationKey }),
  (deactivationKey) => ({ type: 'deactivate-heart-boost', deactivationKey }),
  (deactivationKey) => ({ type: 'deactivate-skill-score-up', deactivationKey }),
  (deactivationKey) => ({ type: 'deactivate-fixed-parameter-extend', deactivationKey }),
  (deactivationKey) => ({ type: 'deactivate-skill-cost-change', deactivationKey }),
];

export function activateEffectInduce(
  state: GameState,
  effect: EffectInduceEffect,
  card: Card | undefined,
): GameState {
  if (!card) throw new Error('効果誘発の発動元カードがありません。');
  const sourceEffectId = `${card.cardInstanceId}:${effect.sourceEffectId}`;
  if (state.effectInducers.some((inducer) => inducer.sourceEffectId === sourceEffectId))
    return state;
  return {
    ...state,
    effectInducers: [
      ...state.effectInducers,
      {
        sourceCardId: card.cardInstanceId,
        sourceEffectId,
        target: effect.target,
        threshold: {
          ...effect.threshold,
          value: Math.fround(Number(BigInt.asIntN(32, effect.threshold.value)) / 10_000),
        },
        effects: effect.effects,
        active: false,
        deactivationKey: effect.deactivationKey ?? null,
      },
    ],
  };
}

export function refreshEffectInducers(state: GameState, apply: EffectApplier): GameState {
  let next = state;
  for (const sourceEffectId of state.effectInducers.map((inducer) => inducer.sourceEffectId)) {
    const inducer = next.effectInducers.find((item) => item.sourceEffectId === sourceEffectId);
    if (!inducer) continue;
    const active = isEffectInducerActive(next, inducer);
    if (active === inducer.active) continue;
    const deactivationKey = `effect-induce:${inducer.sourceEffectId}`;
    next = {
      ...next,
      effectInducers: next.effectInducers.map((item) =>
        item.sourceEffectId === sourceEffectId ? { ...item, active } : item,
      ),
    };
    if (!active) {
      for (const createAction of deactivationActions)
        next = act(next, createAction(deactivationKey));
      next = {
        ...next,
        boosts: next.boosts.filter((boost) => boost.deactivationKey !== deactivationKey),
      };
      next = deactivateMentalBarriers(next, deactivationKey);
      continue;
    }
    const card = next.cardPool.find((item) => item.cardInstanceId === inducer.sourceCardId);
    if (!card) throw new Error('効果誘発の発動元カードがありません。');
    for (const effect of inducer.effects) {
      next = completeDeckOutChecks(
        apply(next, withDeactivationKey(effect, deactivationKey), card),
        apply,
      );
    }
  }
  return refreshBranchInducers(next, apply);
}

function isEffectInducerActive(
  state: GameState,
  inducer: GameState['effectInducers'][number],
): boolean {
  let value: number;
  if (inducer.target === 'mental-barrier') {
    const barriers = state.mentalBarriers.effects.filter(
      (item) => item.barrierType === 'endurance',
    );
    if (!barriers.length) return false;
    const unlimited = barriers.some(
      (barrier) =>
        barrier.endurance.kind === 'infinite' ||
        barrier.endurance.consumed >= barrier.endurance.maximum,
    );
    value = unlimited
      ? -1
      : barriers.reduce(
          (sum, barrier) =>
            Math.fround(
              sum +
                (barrier.endurance.kind === 'finite'
                  ? Math.fround(barrier.endurance.maximum - barrier.endurance.consumed)
                  : 0),
            ),
          0,
        );
    if (value < 0) return inducer.threshold.kind !== 'at-most';
  } else {
    const boosts = state.boosts.filter((boost) => boost.untilTick > state.tick);
    const temporaryBoosts = state.temporaryScoreBoosts;
    if (!boosts.length && !state.skillScoreUps.length && !temporaryBoosts.length) return false;
    value = [...boosts, ...state.skillScoreUps, ...temporaryBoosts].reduce(
      (sum, boost) => sum + boost.percent,
      0,
    );
  }
  switch (inducer.threshold.kind) {
    case 'none':
      return true;
    case 'at-least':
      return inducer.threshold.value <= value;
    case 'at-most':
      return value <= inducer.threshold.value;
  }
}

export function withDeactivationKey(
  effect: Effect,
  deactivationKey: string,
  persistentBranch = false,
): Effect {
  if (effect.kind !== 'branch' && 'deactivationKey' in effect)
    return { ...effect, deactivationKey };
  switch (effect.kind) {
    case 'infinity-gauge':
    case 'mental-barrier':
    case 'token-deck-split':
    case 'token-boost':
    case 'hand-limit':
    case 'heart-limit-change':
    case 'search':
    case 'ap-speed-change':
    case 'voltage-convert':
    case 'mental-heart-induce':
    case 'additional-heart-induce':
    case 'combo-induce':
    case 'skill-boost':
    case 'skill-cooldown':
    case 'induce-skill-effect':
    case 'disable-mental-down':
    case 'beat-heart-value-buff':
    case 'beat-point-buff':
    case 'heart-boost':
    case 'heart-limit-boost':
    case 'mood-value-boost':
    case 'hand-max-card':
    case 'love-up-additional-buff':
    case 'recover-mental-additional-buff':
    case 'mental-barrier-additional-buff':
    case 'skill-cost-change':
    case 'stop-voltage-increase':
    case 'boost':
    case 'skill-score-up':
    case 'amplify':
    case 'mood-change-skill':
    case 'fixed-parameter-extend':
      return { ...effect, deactivationKey };
    case 'effect-induce':
      return { ...effect, deactivationKey };
    case 'branch':
      return {
        ...effect,
        ...(persistentBranch ? { persistent: true } : {}),
        deactivationKey,
        whenTrue: effect.whenTrue.map((child) =>
          withDeactivationKey(child, deactivationKey, persistentBranch),
        ),
        whenFalse: effect.whenFalse.map((child) =>
          withDeactivationKey(child, deactivationKey, persistentBranch),
        ),
      };
    case 'conditional':
      return {
        ...effect,
        effects: effect.effects.map((child) => withDeactivationKey(child, deactivationKey)),
      };
    case 'draw-success-induce':
      return {
        ...effect,
        whenTrue: effect.whenTrue.map((child) => withDeactivationKey(child, deactivationKey)),
        whenFalse: effect.whenFalse.map((child) => withDeactivationKey(child, deactivationKey)),
      };
    default:
      return effect;
  }
}

export function deactivateInducedEffects(state: GameState, deactivationKey: string): GameState {
  let next = deactivateBranchInducers(state, deactivationKey);
  const removedInducers = next.effectInducers.filter(
    (inducer) => inducer.deactivationKey === deactivationKey,
  );
  next = {
    ...next,
    effectInducers: next.effectInducers.filter(
      (inducer) => inducer.deactivationKey !== deactivationKey,
    ),
  };
  for (const inducer of removedInducers)
    next = deactivateInducerEffects(next, `effect-induce:${inducer.sourceEffectId}`);
  return deactivateInducerEffects(next, deactivationKey);
}

function deactivateInducerEffects(state: GameState, deactivationKey: string): GameState {
  let next = state;
  for (const createAction of deactivationActions) next = act(next, createAction(deactivationKey));
  next = {
    ...next,
    boosts: next.boosts.filter((boost) => boost.deactivationKey !== deactivationKey),
    skillScoreUps: next.skillScoreUps.filter((boost) => boost.deactivationKey !== deactivationKey),
  };
  return deactivateMentalBarriers(next, deactivationKey);
}
