import type { StarGatherHeartRuntimeState } from './heartTypes.ts';

export function validatePresentationState(state: StarGatherHeartRuntimeState): void {
  if (
    !Number.isSafeInteger(state.generationCount) ||
    state.generationCount < 0 ||
    !Number.isSafeInteger(state.collectionSoundCount) ||
    state.collectionSoundCount < 0 ||
    state.collectionSoundDelays.some((delay) => !Number.isFinite(delay) || delay < 0)
  ) {
    throw new Error('Heart presentation state is invalid');
  }
}
