import type { StarGatherHeartRuntimeState } from './heartTypes.ts';
import type { LiveHeartRandomRange, LiveHeartSpawnResult } from '../../runtime/live/heartTypes.ts';
import { createLiveHeartRuntimeState, spawnLiveHearts } from '../../runtime/live/heartRuntime.ts';
import { validatePresentationState } from './heartState.ts';

export function createStarGatherHeartRuntimeState(
  musicFinishTimeSeconds: number,
): StarGatherHeartRuntimeState {
  return {
    ...createLiveHeartRuntimeState(musicFinishTimeSeconds),
    generationCount: 0,
    collectionSoundCount: 0,
    collectionSoundDelays: [],
  };
}

export function spawnStarGatherBeatHearts(
  state: StarGatherHeartRuntimeState,
  requestedCount: number,
  randomRange: LiveHeartRandomRange,
): LiveHeartSpawnResult<StarGatherHeartRuntimeState> {
  return spawnStarGatherHearts(state, requestedCount, state.baseLifeTimeSeconds, randomRange);
}

export function spawnStarGatherHearts(
  state: StarGatherHeartRuntimeState,
  requestedCount: number,
  lifeTimeSeconds: number,
  randomRange: LiveHeartRandomRange,
): LiveHeartSpawnResult<StarGatherHeartRuntimeState> {
  validatePresentationState(state);
  return spawnLiveHearts(
    { ...state, generationCount: state.generationCount + Number(requestedCount > 0) },
    requestedCount,
    lifeTimeSeconds,
    randomRange,
  );
}
