import type { LiveCardIdentifier } from '../cards/deckBoardState.ts';
import { int64ToInt32, isInt64 } from '../numeric.ts';
import { type LiveProxyAbsorbInfo, liveProxyTargetReached } from './proxyAbsorption.ts';

export function selectLiveProxySkillsForForcedActivation<
  State extends LiveProxyAbsorbInfo<LiveCardIdentifier>,
>(states: readonly State[], targetType: bigint): readonly State[] {
  if (!isInt64(targetType)) throw new Error('Live Proxy forced target is invalid');
  switch (int64ToInt32(targetType)) {
    case 1:
      return [...states];
    case 2:
      return states.filter((state) => state.hasAbsorbLimit);
    case 3:
      return states.filter((state) => !state.hasAbsorbLimit);
    case 4:
      return states.filter(targetsReached);
    case 5:
      return states.filter((state) => !targetsReached(state));
    default:
      return [];
  }
}

export function forceLiveProxySkillActivation<
  State extends LiveProxyAbsorbInfo<LiveCardIdentifier>,
>(state: State): State {
  return state.isAbsorbEnd ? state : { ...state, isAbsorbEnd: true };
}

function targetsReached(state: LiveProxyAbsorbInfo<LiveCardIdentifier>): boolean {
  return state.effects.every((effect) => liveProxyTargetReached(effect, state.isAbsoluteAdd));
}
