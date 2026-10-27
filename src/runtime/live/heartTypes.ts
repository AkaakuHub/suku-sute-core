export type LiveHeartPhase = 'throw' | 'wait' | 'flash' | 'collect';
export type LiveHeartShowState = 'show' | 'hide-after-throw';
export type LiveHeartRandomRange = (minimum: number, maximum: number) => number;

export type LiveHeartPosition = Readonly<{ x: number; y: number }>;

export type LiveStageHeart = Readonly<{
  lifeTimeSeconds: number;
  phase: LiveHeartPhase;
  showState: LiveHeartShowState;
  spawnElapsedSeconds: number;
  spawnDurationSeconds: number;
  spawnStartPosition: LiveHeartPosition;
  waitPosition: LiveHeartPosition;
  flashElapsedSeconds: number;
  collectElapsedSeconds: number;
  collectMoveDurationSeconds: number;
  collectJumpHeight: number;
}>;

export type LiveHeartRuntimeState = Readonly<{
  heartLimit: number;
  showLimit: number;
  throwLimit: number;
  showPercentage: number;
  baseLifeTimeSeconds: number;
  stageHearts: readonly LiveStageHeart[];
  hiddenHeartBatches: readonly Readonly<{
    count: number;
    lifeTimeSeconds: number;
  }>[];
}>;

export type LiveHeartSpawnResult<State extends LiveHeartRuntimeState = LiveHeartRuntimeState> =
  Readonly<{
    state: State;
    overflowCount: number;
  }>;

export type LiveHeartAdvanceResult<State extends LiveHeartRuntimeState = LiveHeartRuntimeState> =
  Readonly<{
    state: State;
    lapsedCount: number;
    lapsedBatches: readonly number[];
    autoCollectCount: number;
  }>;

export type LiveHeartCollectResult<State extends LiveHeartRuntimeState = LiveHeartRuntimeState> =
  Readonly<{
    state: State;
    collectCount: number;
    animationHeartCount: number;
  }>;

export type LiveHeartLimitChangeResult<
  State extends LiveHeartRuntimeState = LiveHeartRuntimeState,
> = Readonly<{
  state: State;
  lapsedCount: number;
}>;
