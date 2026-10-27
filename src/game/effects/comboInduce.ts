import type { Card, Effect, GameState } from '../model.ts';
import type { ComboInduceEffect } from '../modelTypes.ts';
import type { ComboInduceEvent, ComboInducer } from '../comboInduceTypes.ts';
import { int64ToFloat32 } from '../numeric.ts';
import { completeDeckOutChecks } from './deckOutCheck.ts';

type ApplyComboEffect = (
  state: GameState,
  effect: Effect,
  card?: Card,
  multiplier?: number,
  addValue?: number,
  effectPower?: number,
) => GameState;

export function activateComboInduce(
  state: GameState,
  effect: ComboInduceEffect,
  card: Card | undefined,
  multiplier: number,
  addValue: number,
): GameState {
  if (state.comboInducer) return state;
  if (effect.duration.kind === 'sections' && effect.duration.value === 0)
    throw new Error('Display section count is 0. (displayTimeType: SECTION, displayTime: 0)');
  if (effect.members.length > 11) throw new Error('ComboInduceUI member count exceeds 11.');
  if (!card) return state;
  const inducer: ComboInducer = {
    sourceCardId: card.id,
    members: effect.members.map((member) => ({ member, ap: null })),
    apPower: effect.apPower,
    repeatAction: effect.repeatAction,
    effects: effect.effects,
    addValue,
    multiplier,
    remainingSeconds:
      effect.duration.kind === 'milliseconds' ? Math.fround(effect.duration.value / 1000) : null,
    remainingSections: effect.duration.kind === 'sections' ? effect.duration.value : null,
    deactivationKey: effect.deactivationKey ?? null,
    active: true,
    phase: 'collecting',
    phaseRemainingSeconds: 0,
    events: [],
  };
  return { ...state, comboInducer: inducer };
}

export function notifyComboSkillPoint(state: GameState, card: Card, ap: number): GameState {
  const inducer = state.comboInducer;
  if (!inducer?.active) return state;
  return acceptComboEvent(state, inducer, { member: card.member, ap });
}

export function advanceComboInducer(
  state: GameState,
  elapsedSeconds: number,
  applyEffect: ApplyComboEffect,
): GameState {
  let inducer = state.comboInducer;
  if (!inducer) return state;
  if (inducer.active && inducer.remainingSeconds !== null) {
    const remainingSeconds = Math.fround(inducer.remainingSeconds - Math.fround(elapsedSeconds));
    inducer =
      remainingSeconds > 0 ? { ...inducer, remainingSeconds } : { ...inducer, active: false };
  }
  if (!inducer.active && inducer.phase === 'collecting') return { ...state, comboInducer: null };
  if (inducer.phase === 'collecting') return { ...state, comboInducer: inducer };
  const phaseRemainingSeconds = Math.fround(
    inducer.phaseRemainingSeconds - Math.fround(elapsedSeconds),
  );
  if (phaseRemainingSeconds > 0)
    return { ...state, comboInducer: { ...inducer, phaseRemainingSeconds } };
  if (inducer.phase === 'activating') {
    let next: GameState = { ...state, comboInducer: inducer };
    if (state.phase === 'playing') {
      const totalAp = inducer.members.reduce((total, item) => total + (item.ap ?? 0), 0);
      const product = BigInt.asIntN(64, inducer.apPower * BigInt(Math.trunc(totalAp)));
      const effectPower = Math.fround(
        Math.fround(int64ToFloat32(product) / Math.fround(10_000)) + 1,
      );
      const card = state.cardPool.find((item) => item.id === inducer.sourceCardId);
      for (const effect of inducer.effects) {
        next = completeDeckOutChecks(
          applyEffect(next, effect, card, inducer.multiplier, inducer.addValue, effectPower),
          applyEffect,
        );
      }
    }
    return {
      ...next,
      comboInducer: { ...inducer, phase: 'resetting', phaseRemainingSeconds: 1 },
    };
  }
  if (!inducer.active) return { ...state, comboInducer: null };
  let nextInducer: ComboInducer = {
    ...inducer,
    members: inducer.members.map((item) => ({ ...item, ap: null })),
    phase: 'collecting',
    phaseRemainingSeconds: 0,
    events: inducer.events,
  };
  let next: GameState = { ...state, comboInducer: nextInducer };
  while (
    nextInducer.events.length > 0 &&
    nextInducer.active &&
    nextInducer.phase === 'collecting'
  ) {
    const [event, ...events] = nextInducer.events;
    if (!event) break;
    nextInducer = { ...nextInducer, events };
    next = { ...next, comboInducer: nextInducer };
    next = acceptComboEvent(next, nextInducer, event);
    nextInducer = next.comboInducer ?? nextInducer;
  }
  return next;
}

export function expireComboInducerSections(state: GameState): GameState {
  const inducer = state.comboInducer;
  if (!inducer?.active || inducer.remainingSections === null) return state;
  const remainingSections = inducer.remainingSections - 1;
  if (remainingSections > 0) return { ...state, comboInducer: { ...inducer, remainingSections } };
  if (inducer.phase === 'collecting') return { ...state, comboInducer: null };
  return { ...state, comboInducer: { ...inducer, active: false } };
}

export function deactivateComboInducer(state: GameState, deactivationKey: string): GameState {
  const inducer = state.comboInducer;
  if (!inducer || inducer.deactivationKey !== deactivationKey) return state;
  if (inducer.phase === 'collecting') return { ...state, comboInducer: null };
  return { ...state, comboInducer: { ...inducer, active: false } };
}

function acceptComboEvent(
  state: GameState,
  inducer: ComboInducer,
  event: ComboInduceEvent,
): GameState {
  if (!inducer.active) return state;
  const index = inducer.members.findIndex((item) => item.member === event.member);
  if (index < 0) return state;
  if (inducer.phase !== 'collecting')
    return {
      ...state,
      comboInducer: { ...inducer, events: [...inducer.events, event] },
    };
  if (inducer.members[index]?.ap !== null) {
    if (inducer.repeatAction === 2) return state;
    if (inducer.repeatAction === 0)
      inducer = { ...inducer, members: inducer.members.map((item) => ({ ...item, ap: null })) };
  }
  const members = inducer.members.map((item, itemIndex) =>
    itemIndex === index ? { ...item, ap: event.ap } : item,
  );
  const complete = members.every((item) => item.ap !== null);
  return {
    ...state,
    comboInducer: {
      ...inducer,
      members,
      phase: complete ? 'activating' : 'collecting',
      phaseRemainingSeconds: complete ? 1 : 0,
    },
  };
}
