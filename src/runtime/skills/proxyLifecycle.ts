import type { LiveCardIdentifier } from '../cards/deckBoardState.ts';
import { int64ToFloat32, int64ToInt32, isInt64 } from '../numeric.ts';
import {
  absorbLiveProxySkillEffect,
  type LiveProxyAbsorbInfo,
  liveProxyTargetReached,
} from './proxyAbsorption.ts';

export type LiveProxySkillPeriodType = 1 | 2 | 3 | 4 | 5;
export type LiveProxySkillPeriod =
  | Readonly<{ periodType: 1; remainingPeriod: number }>
  | Readonly<{ periodType: 2 | 4 | 5; remainingPeriod: bigint }>
  | Readonly<{ periodType: 3 }>;

export type LiveProxySkillPeriodEvent =
  | Readonly<{ kind: 'clock'; deltaTimeSeconds: number }>
  | Readonly<{ kind: 'section-change' }>
  | Readonly<{ kind: 'skill-activation'; cardInstanceId: LiveCardIdentifier; consumeAp: number }>;

export type LiveProxySkillLifecycle<Id extends LiveCardIdentifier = LiveCardIdentifier> =
  LiveProxyAbsorbInfo<Id> &
    LiveProxySkillPeriod &
    Readonly<{ induceTiming: 1 | 2 | 3; induceCondition: 1 | 2 }>;
export type LiveProxySkillState<
  Id extends LiveCardIdentifier,
  Effect,
> = LiveProxySkillLifecycle<Id> &
  Readonly<{
    inducePowerType: 1 | 2 | 3;
    inducePowerParam: bigint;
    induceEffects: readonly Effect[];
  }>;
export type LiveProxySkillEndResult = 'none' | 'release' | 'induce' | 'defer';

export function createLiveProxySkillPeriod(
  periodType: LiveProxySkillPeriodType,
  periodParam: bigint,
  induceTiming: 1 | 2 | 3,
): LiveProxySkillPeriod | null {
  if (!isInt64(periodParam)) throw new Error('Live Proxy period parameter is invalid');
  if (periodType === 3) return induceTiming === 1 ? { periodType } : null;
  if (periodParam < 1n) return null;
  return periodType === 1
    ? { periodType, remainingPeriod: Math.fround(int64ToFloat32(periodParam) / 1000) }
    : { periodType, remainingPeriod: periodParam };
}

export function advanceLiveProxySkillPeriod<
  State extends LiveProxySkillPeriod & Readonly<{ cardInstanceId: LiveCardIdentifier }>,
>(
  state: State,
  event: LiveProxySkillPeriodEvent,
): Readonly<{ state: State; periodEnded: boolean }> {
  if (
    event.kind === 'clock' &&
    (!Number.isFinite(event.deltaTimeSeconds) || event.deltaTimeSeconds < 0)
  )
    throw new Error('Live Proxy delta time is invalid');
  if (state.periodType === 1 && event.kind === 'clock') {
    const remainingPeriod = Math.fround(
      state.remainingPeriod - Math.fround(event.deltaTimeSeconds),
    );
    return { state: { ...state, remainingPeriod }, periodEnded: remainingPeriod <= 0 };
  }
  if (state.periodType === 2 && event.kind === 'section-change') {
    const remainingPeriod = BigInt.asIntN(64, state.remainingPeriod - 1n);
    return { state: { ...state, remainingPeriod }, periodEnded: remainingPeriod <= 0n };
  }
  if (
    (state.periodType === 4 || state.periodType === 5) &&
    event.kind === 'skill-activation' &&
    event.cardInstanceId !== state.cardInstanceId
  ) {
    if (!Number.isSafeInteger(event.consumeAp)) throw new Error('Live Proxy consume AP is invalid');
    const decrement = state.periodType === 4 ? 1n : BigInt(int64ToInt32(BigInt(event.consumeAp)));
    const remainingPeriod = BigInt.asIntN(64, state.remainingPeriod - decrement);
    return { state: { ...state, remainingPeriod }, periodEnded: remainingPeriod <= 0n };
  }
  return { state, periodEnded: false };
}

export function advanceLiveProxySkill<State extends LiveProxySkillLifecycle>(
  state: State,
  event: LiveProxySkillPeriodEvent,
): Readonly<{ state: State; result: LiveProxySkillEndResult }> {
  const advanced = advanceLiveProxySkillPeriod(state, event);
  return advanced.periodEnded
    ? checkLiveProxySkillEnd(advanced.state, true)
    : { state: advanced.state, result: 'none' };
}

export function checkLiveProxySkillEnd<State extends LiveProxySkillLifecycle>(
  state: State,
  periodEnd: boolean,
): Readonly<{ state: State; result: LiveProxySkillEndResult }> {
  if (state.isAbsorbEnd) return { state, result: 'none' };
  const unmet =
    (state.induceTiming === 1 || state.induceCondition === 2) &&
    !state.effects.every((effect) => liveProxyTargetReached(effect, state.isAbsoluteAdd));
  if (unmet && !periodEnd) return { state, result: 'none' };
  const ended = { ...state, isAbsorbEnd: true };
  if (unmet) return { state: ended, result: 'release' };
  return {
    state: ended,
    result:
      state.induceTiming === 3 || (state.induceTiming === 1 && state.periodType === 2)
        ? 'defer'
        : 'induce',
  };
}

export function absorbLiveProxySkill<State extends LiveProxySkillLifecycle>(
  states: readonly State[],
  actionType: number,
  amount: bigint,
): Readonly<{
  states: readonly State[];
  absorbed: boolean;
  changedIndex: number | null;
  result: LiveProxySkillEndResult;
}> {
  const absorbed = absorbLiveProxySkillEffect(states, actionType, amount);
  if (absorbed.changedIndex === null) return { ...absorbed, result: 'none' };
  const current = absorbed.states[absorbed.changedIndex];
  if (!current) throw new Error('Live Proxy absorption index is invalid');
  if (current.induceTiming !== 1) return { ...absorbed, result: 'none' };
  const checked = checkLiveProxySkillEnd(current, false);
  return {
    ...absorbed,
    result: checked.result,
    states:
      checked.state === current
        ? absorbed.states
        : absorbed.states.map((entry, index) =>
            index === absorbed.changedIndex ? checked.state : entry,
          ),
  };
}
