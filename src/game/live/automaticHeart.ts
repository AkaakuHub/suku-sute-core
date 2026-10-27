import { advanceLiveAutomaticHeart } from '../../runtime/live/automaticPlay.ts';

export type AutomaticHeartState = Readonly<{ enabled: boolean; timerSeconds: number }>;

export function advanceAutomaticHeart(
  state: AutomaticHeartState,
  heartCount: number,
  deltaTimeSeconds: number,
): Readonly<{ state: AutomaticHeartState; shouldCollect: boolean }> {
  const advanced = advanceLiveAutomaticHeart(state, {
    enabled: state.enabled,
    heartCount,
    heartAutoCount: 100,
    deltaTimeSeconds,
  });
  return { ...advanced, state: { ...state, ...advanced.state } };
}
