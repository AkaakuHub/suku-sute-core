import type { LiveSkillEffectClock } from './skillEffectDuration.ts';
import type {
  LiveComboInduceMemberState,
  LiveComboInduceUiTimedEvent,
} from '../live/comboInduceUi.ts';
import { resolveLiveComboInduceMemberMode } from '../live/comboInduceUi.ts';
import type { LiveSkillEffect } from './skillTypes.ts';
import {
  advanceLiveSkillEffectDuration,
  createLiveSkillEffectDuration,
} from './skillEffectDuration.ts';
import type { LiveSkillEffectPower } from './skillEffectPower.ts';
import { validateLiveSkillEffectPower } from './skillEffectPower.ts';

import { requireComboInduceDetails } from './comboInduceDetails.ts';
import { requireIntegerValue } from './comboInduceDetails.ts';
import { requireCsvIds } from './comboInduceDetails.ts';
import { requireCsvIntegers } from './comboInduceDetails.ts';

import type { LiveComboInduceRepeatAction } from './comboInduceTypes.ts';
import type { LiveComboInduceEffect } from './comboInduceTypes.ts';
import type { LiveComboInduceState } from './comboInduceTypes.ts';
import type { LiveComboInduceApplication } from './comboInduceTypes.ts';
import type { LiveComboInduceTransition } from './comboInduceTypes.ts';

export function createLiveComboInduceState(): LiveComboInduceState {
  return { active: null, uiEvents: [] };
}

export function liveComboInduceEmbeddedSkillEffectIds(
  effects: readonly LiveSkillEffect[],
): ReadonlySet<string> {
  const embedded = new Set<string>();
  for (const effect of effects.filter((candidate) => candidate.actionType === 24)) {
    const details = requireComboInduceDetails(effect);
    for (const effectId of requireCsvIds(
      details.get('COMBO_INDUCE_EFFECT_PARAMS'),
      'COMBO_INDUCE_EFFECT_PARAMS',
    )) {
      embedded.add(effectId);
    }
  }
  return embedded;
}

export function activateLiveComboInduce(
  state: LiveComboInduceState,
  effect: LiveSkillEffect,
  allEffects: readonly LiveSkillEffect[],
  input: Readonly<{
    currentTimeSeconds: number;
    power: LiveSkillEffectPower;
  }>,
): LiveComboInduceState {
  if (effect.actionType !== 24) {
    throw new Error('Live Combo Induce action type differs');
  }
  validateLiveSkillEffectPower(input.power, 'Combo Induce');
  const details = requireComboInduceDetails(effect);
  const characterIds = requireCsvIntegers(
    details.get('COMBO_INDUCE_MEMBER_PARAMS'),
    'COMBO_INDUCE_MEMBER_PARAMS',
  );
  const embeddedEffectIds = requireCsvIds(
    details.get('COMBO_INDUCE_EFFECT_PARAMS'),
    'COMBO_INDUCE_EFFECT_PARAMS',
  );
  const memberType = resolveLiveComboInduceMemberMode(characterIds.length);
  if (new Set(characterIds).size !== characterIds.length) {
    throw new Error('Live Combo Induce members are duplicated');
  }
  const embeddedEffects = embeddedEffectIds.map((effectId) => {
    const matches = allEffects.filter((candidate) => candidate.id === effectId);
    const match = matches[0];
    if (matches.length !== 1 || match === undefined) {
      throw new Error(`Live Combo Induce embedded effect must resolve once:${effectId}`);
    }
    return match;
  });
  const apPower = requireIntegerValue(details, 'COMBO_INDUCE_AP_POWER');
  if (apPower < 0) throw new Error('Live Combo Induce AP power differs');
  const repeatActionValue = requireIntegerValue(details, 'COMBO_INDUCE_REPEAT_ACTION');
  const repeatAction = repeatActions[repeatActionValue];
  if (repeatAction === undefined) {
    throw new Error('Live Combo Induce repeat action differs');
  }
  const duration = createLiveSkillEffectDuration(
    requireIntegerValue(details, 'COMBO_INDUCE_DISPLAY_TIME_TYPE'),
    requireIntegerValue(details, 'COMBO_INDUCE_DISPLAY_TIME'),
    'Combo Induce',
  );
  if (state.active !== null) return state;
  return {
    active: {
      effectId: effect.id,
      apPower,
      repeatAction,
      embeddedEffects,
      power: input.power,
      duration,
      members: characterIds.map((characterId) => ({
        characterId,
        ap: null,
        linked: false,
      })),
      queuedAp: [],
      isPlaying: false,
      holdSetAp: false,
      showEffect: true,
      cycle: null,
    },
    uiEvents: [
      ...state.uiEvents,
      {
        atSeconds: input.currentTimeSeconds,
        event: { kind: 'show', memberType, characterIds },
      },
    ],
  };
}

export function notifyLiveComboInduceSkillActivation(
  state: LiveComboInduceState,
  input: Readonly<{
    currentTimeSeconds: number;
    characterId: number;
    consumeAp: number;
  }>,
): LiveComboInduceState {
  if (
    !Number.isFinite(input.currentTimeSeconds) ||
    input.currentTimeSeconds < 0 ||
    !Number.isSafeInteger(input.characterId) ||
    input.characterId <= 0 ||
    !Number.isSafeInteger(input.consumeAp) ||
    input.consumeAp < 0
  ) {
    throw new Error('Live Combo Induce skill activation is invalid');
  }
  const active = state.active;
  if (
    active === null ||
    !active.members.some((member) => member.characterId === input.characterId)
  ) {
    return state;
  }
  if (active.isPlaying || active.holdSetAp || active.queuedAp.length > 0) {
    return {
      ...state,
      active: {
        ...active,
        queuedAp: [...active.queuedAp, { characterId: input.characterId, ap: input.consumeAp }],
      },
    };
  }
  return applyMemberAp(state, input.characterId, input.consumeAp, true, input.currentTimeSeconds);
}

export function advanceLiveComboInduceState(
  state: LiveComboInduceState,
  input: LiveSkillEffectClock & Readonly<{ currentTimeSeconds: number }>,
): LiveComboInduceTransition {
  let active = state.active;
  if (active === null) return { state, applications: [] };
  const duration = advanceLiveSkillEffectDuration(active.duration, input);
  if (duration === null) {
    return {
      state: appendUiEvent({ ...state, active: null }, input.currentTimeSeconds, { kind: 'hide' }),
      applications: [],
    };
  }
  active = { ...active, duration };
  let next: LiveComboInduceState = { ...state, active };
  const applications: LiveComboInduceApplication[] = [];
  if (
    active.cycle !== null &&
    !active.cycle.activated &&
    input.currentTimeSeconds >= active.cycle.activateAtSeconds
  ) {
    const combo = active;
    const cycle = active.cycle;
    applications.push(
      ...combo.embeddedEffects.map((effect) => ({
        effect,
        power: {
          addValue: combo.power.addValue,
          multiplyFactor: combo.power.multiplyFactor,
          effectPower: Math.fround(1 + Math.fround((combo.apPower * cycle.totalAp) / 10_000)),
        },
      })),
    );
    active = { ...active, cycle: { ...cycle, activated: true } };
    next = { ...next, active };
  }
  if (active.cycle !== null && input.currentTimeSeconds >= active.cycle.resetAtSeconds) {
    active = {
      ...active,
      members: resetMembers(active.members),
      isPlaying: false,
      showEffect: false,
      cycle: null,
    };
    next = appendUiEvent({ ...next, active }, input.currentTimeSeconds, {
      kind: 'reset-ap',
    });
    while (active.queuedAp.length > 0 && !active.isPlaying) {
      const queued = active.queuedAp[0];
      if (queued === undefined) break;
      next = {
        ...next,
        active: { ...active, queuedAp: active.queuedAp.slice(1) },
      };
      next = applyMemberAp(
        next,
        queued.characterId,
        queued.ap,
        active.showEffect,
        input.currentTimeSeconds,
      );
      active = next.active;
      if (active === null) break;
    }
    if (active !== null && active.queuedAp.length === 0 && !active.isPlaying) {
      next = { ...next, active: { ...active, showEffect: true } };
    }
  }
  return { state: next, applications };
}

export function deactivateLiveComboInduce(
  state: LiveComboInduceState,
  effectId: string,
  currentTimeSeconds: number,
): LiveComboInduceState {
  if (state.active?.effectId !== effectId) return state;
  return appendUiEvent({ ...state, active: null }, currentTimeSeconds, {
    kind: 'hide',
  });
}

function applyMemberAp(
  state: LiveComboInduceState,
  characterId: number,
  ap: number,
  showEffect: boolean,
  currentTimeSeconds: number,
): LiveComboInduceState {
  let active = state.active;
  if (active === null) return state;
  const memberIndex = active.members.findIndex((member) => member.characterId === characterId);
  if (memberIndex < 0) return state;
  const member = active.members[memberIndex];
  if (member === undefined) return state;
  let next = state;
  if (member.ap !== null) {
    if (active.repeatAction === 'ignore') return state;
    if (active.repeatAction === 'reset') {
      active = { ...active, members: resetMembers(active.members) };
      next = appendUiEvent({ ...next, active }, currentTimeSeconds, {
        kind: 'reset-ap',
      });
    }
  }
  const members = active.members.map((candidate, index) =>
    index === memberIndex ? { ...candidate, ap } : candidate,
  );
  active = { ...active, members };
  next = appendUiEvent({ ...next, active }, currentTimeSeconds, {
    kind: 'set-ap',
    characterId,
    ap,
    showEffect,
  });
  const previous = members[memberIndex - 1];
  if (previous !== undefined && previous.ap !== null) {
    active = linkMember(active, memberIndex);
    next = appendUiEvent({ ...next, active }, currentTimeSeconds, {
      kind: 'set-link',
      characterId,
    });
  }
  const following = members[memberIndex + 1];
  if (following !== undefined && following.ap !== null) {
    active = linkMember(active, memberIndex + 1);
    next = appendUiEvent({ ...next, active }, currentTimeSeconds, {
      kind: 'set-link',
      characterId: following.characterId,
    });
  }
  if (active.members.every((candidate) => candidate.ap !== null)) {
    const totalAp = active.members.reduce((total, candidate) => total + (candidate.ap ?? 0), 0);
    active = {
      ...active,
      isPlaying: true,
      showEffect: false,
      cycle: {
        activateAtSeconds: currentTimeSeconds + 1,
        resetAtSeconds: currentTimeSeconds + 2,
        totalAp,
        activated: false,
      },
    };
    next = { ...next, active };
  }
  return next;
}

function resetMembers(
  members: readonly LiveComboInduceMemberState[],
): readonly LiveComboInduceMemberState[] {
  return members.map((member) => ({ ...member, ap: null, linked: false }));
}

function linkMember(active: LiveComboInduceEffect, memberIndex: number): LiveComboInduceEffect {
  return {
    ...active,
    members: active.members.map((member, index) =>
      index === memberIndex ? { ...member, linked: true } : member,
    ),
  };
}

function appendUiEvent(
  state: LiveComboInduceState,
  atSeconds: number,
  event: LiveComboInduceUiTimedEvent['event'],
): LiveComboInduceState {
  return {
    ...state,
    uiEvents: [...state.uiEvents, { atSeconds, event }],
  };
}

const repeatActions: Readonly<Record<number, LiveComboInduceRepeatAction>> = {
  0: 'reset',
  1: 'overwrite',
  2: 'ignore',
};
