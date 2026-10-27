import type { LiveHeartRuntimeState } from '../../runtime/live/heartTypes.ts';

export type StarGatherHeartRuntimeState = LiveHeartRuntimeState &
  Readonly<{
    generationCount: number;
    collectionSoundCount: number;
    collectionSoundDelays: readonly number[];
  }>;
