import type { StarGatherHeartRuntimeState } from './heartTypes.ts';
import type {
  LiveHeartRandomRange,
  LiveHeartAdvanceResult,
  LiveHeartCollectResult,
} from '../../runtime/live/heartTypes.ts';
import {
  advanceLiveHeartRuntime,
  collectLiveHeartRuntime,
} from '../../runtime/live/heartRuntime.ts';
import { randomValue } from '../../runtime/live/heartState.ts';
import { validatePresentationState } from './heartState.ts';

export function advanceStarGatherHeartRuntime(
  state: StarGatherHeartRuntimeState,
  deltaTimeSeconds: number,
  autoPlay: boolean,
): LiveHeartAdvanceResult<StarGatherHeartRuntimeState> {
  validatePresentationState(state);
  const advanced = advanceLiveHeartRuntime(state, deltaTimeSeconds, autoPlay);
  const collectionSoundDelays = state.collectionSoundDelays
    .map((delay) => delay - deltaTimeSeconds)
    .filter((delay) => delay > Number.EPSILON);
  return {
    ...advanced,
    state: {
      ...advanced.state,
      collectionSoundDelays,
      collectionSoundCount:
        state.collectionSoundCount +
        state.collectionSoundDelays.length -
        collectionSoundDelays.length,
    },
  };
}

export function collectStarGatherHeartRuntime(
  state: StarGatherHeartRuntimeState,
  randomRange: LiveHeartRandomRange,
): LiveHeartCollectResult<StarGatherHeartRuntimeState> {
  validatePresentationState(state);
  const collected = collectLiveHeartRuntime(state, randomRange);
  return {
    ...collected,
    state: {
      ...collected.state,
      collectionSoundDelays: [
        ...state.collectionSoundDelays,
        ...collected.state.stageHearts.map(
          (heart) => heart.collectMoveDurationSeconds * randomValue(randomRange, 0.7, 1),
        ),
      ],
    },
  };
}
