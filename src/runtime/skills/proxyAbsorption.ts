import type { LiveCardIdentifier } from '../cards/deckBoardState.ts';
import { int64ToFloat32, int64ToInt32 } from '../numeric.ts';

export type LiveProxyAbsorbEffectInfo = Readonly<{
  actionType: number;
  targetAmount: bigint;
  totalAmount: bigint;
}>;

export type LiveProxyAbsorbInfo<Id extends LiveCardIdentifier> = Readonly<{
  cardInstanceId: Id;
  hasAbsorbLimit: boolean;
  isAbsoluteAdd: boolean;
  isAbsorbEnd: boolean;
  effects: readonly LiveProxyAbsorbEffectInfo[];
}>;

export function createLiveProxyAbsorbInfo<Id extends LiveCardIdentifier>(
  cardInstanceId: Id,
  absorbLimit: bigint,
  targets: readonly Readonly<{ actionType: bigint; targetAmount: bigint }>[],
): LiveProxyAbsorbInfo<Id> {
  return {
    cardInstanceId,
    hasAbsorbLimit: (absorbLimit & 1n) === 1n,
    isAbsoluteAdd: (absorbLimit & 2n) === 2n,
    isAbsorbEnd: false,
    effects: targets.map((target) => ({
      actionType: int64ToInt32(target.actionType),
      targetAmount: BigInt(int64ToInt32(target.targetAmount)),
      totalAmount: 0n,
    })),
  };
}

export function liveProxyTargetReached(
  effect: LiveProxyAbsorbEffectInfo,
  isAbsoluteAdd: boolean,
): boolean {
  return effect.actionType === 48 && !isAbsoluteAdd && effect.targetAmount < 0n
    ? effect.totalAmount <= effect.targetAmount
    : effect.totalAmount >= effect.targetAmount;
}

export function absorbLiveProxySkillEffect<State extends LiveProxyAbsorbInfo<LiveCardIdentifier>>(
  states: readonly State[],
  actionType: number,
  effectAmount: bigint,
): Readonly<{ states: readonly State[]; absorbed: boolean; changedIndex: number | null }> {
  const amount = BigInt.asIntN(64, effectAmount);
  if (actionType !== 48 && amount < 0n) return { states, absorbed: false, changedIndex: null };
  for (const [index, state] of states.entries()) {
    if (state.isAbsorbEnd) continue;
    const targetIndex = state.effects.findIndex((effect) => effect.actionType === actionType);
    const target = state.effects[targetIndex];
    if (!target) continue;
    if (state.hasAbsorbLimit && liveProxyTargetReached(target, state.isAbsoluteAdd))
      return { states, absorbed: true, changedIndex: null };
    const absolute =
      actionType === 48 && state.isAbsoluteAdd ? Math.abs(int64ToFloat32(amount)) : null;
    const added =
      absolute === null ? amount : absolute >= 2 ** 63 ? (1n << 63n) - 1n : BigInt(absolute);
    const effects = state.effects.map((effect, effectIndex) =>
      effectIndex === targetIndex
        ? { ...effect, totalAmount: BigInt.asIntN(64, effect.totalAmount + added) }
        : effect,
    );
    return {
      states: states.map((item, itemIndex) => (itemIndex === index ? { ...item, effects } : item)),
      absorbed: true,
      changedIndex: index,
    };
  }
  return { states, absorbed: false, changedIndex: null };
}
