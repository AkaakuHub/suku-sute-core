import type { LiveHeartShowState } from './heartTypes.ts';
import type { LiveHeartRandomRange } from './heartTypes.ts';
import type { LiveStageHeart } from './heartTypes.ts';
import type { LiveHeartRuntimeState } from './heartTypes.ts';
import type { LiveHeartSpawnResult } from './heartTypes.ts';
import type { LiveHeartAdvanceResult } from './heartTypes.ts';
import type { LiveHeartCollectResult } from './heartTypes.ts';
import type { LiveHeartLimitChangeResult } from './heartTypes.ts';
import { validateState } from './heartState.ts';
import { randomValue } from './heartState.ts';

const defaultHeartLimit = 100;
const defaultShowLimit = 50;
const defaultShowPercentage = 50;
const flashThresholdSeconds = 3;
export const spawnDurationSeconds = 0.5;

export function calculateLiveHeartBaseLifeTimeSeconds(musicFinishTimeSeconds: number): number {
  if (!Number.isFinite(musicFinishTimeSeconds) || musicFinishTimeSeconds < 0) {
    throw new Error('Live Heart music finish time is invalid');
  }
  const finishMilliseconds = Math.fround(Math.fround(musicFinishTimeSeconds) * Math.fround(1000));
  const scaled = Math.fround(
    Math.fround(finishMilliseconds * Math.fround(10_000)) / Math.fround(120_000),
  );
  return Math.trunc(scaled) / 1000;
}

export function createLiveHeartRuntimeState(musicFinishTimeSeconds: number): LiveHeartRuntimeState {
  return {
    heartLimit: defaultHeartLimit,
    showLimit: defaultShowLimit,
    throwLimit: defaultHeartLimit,
    showPercentage: defaultShowPercentage,
    baseLifeTimeSeconds: calculateLiveHeartBaseLifeTimeSeconds(musicFinishTimeSeconds),
    stageHearts: [],
    hiddenHeartBatches: [],
  };
}

export function spawnLiveBeatHearts<State extends LiveHeartRuntimeState>(
  state: State,
  requestedCount: number,
  randomRange: LiveHeartRandomRange,
): LiveHeartSpawnResult<State> {
  return spawnLiveHearts(state, requestedCount, state.baseLifeTimeSeconds, randomRange);
}

export function spawnLiveHearts<State extends LiveHeartRuntimeState>(
  state: State,
  requestedCount: number,
  lifeTimeSeconds: number,
  randomRange: LiveHeartRandomRange,
): LiveHeartSpawnResult<State> {
  validateState(state);
  if (
    !Number.isSafeInteger(requestedCount) ||
    requestedCount < 0 ||
    !Number.isFinite(lifeTimeSeconds) ||
    lifeTimeSeconds < 0
  ) {
    throw new Error('Live Heart spawn count is invalid');
  }
  const createdCount = Math.min(
    requestedCount,
    Math.max(state.heartLimit - liveHeartCount(state), 0),
  );
  const displayCount = Math.ceil(
    Math.fround(Math.fround(createdCount * state.showPercentage) * Math.fround(0.01)),
  );
  const currentShowCount = state.stageHearts.filter((heart) => heart.showState === 'show').length;
  const showCount = Math.min(displayCount, Math.max(state.showLimit - currentShowCount, 0));
  const throwCount = Math.min(displayCount, state.throwLimit);
  const hideAfterThrowCount = throwCount - showCount;
  const hiddenCount = createdCount - throwCount;
  const createStageHeart = (showState: LiveHeartShowState): LiveStageHeart => {
    const waitPosition = {
      x: randomValue(randomRange, -5.5, 5.5),
      y: randomValue(randomRange, -1.5, 0.5),
    };
    const spawnStartPosition = {
      x: waitPosition.x,
      y: Math.fround(waitPosition.y - randomValue(randomRange, 0.8, 1.2)),
    };
    return {
      lifeTimeSeconds,
      phase: 'throw',
      showState,
      spawnElapsedSeconds: 0,
      spawnDurationSeconds: Math.fround(randomValue(randomRange, 0.9, 1.1) * spawnDurationSeconds),
      spawnStartPosition,
      waitPosition,
      flashElapsedSeconds: 0,
      collectElapsedSeconds: 0,
      collectMoveDurationSeconds: 1,
      collectJumpHeight: 0.5,
    };
  };
  return {
    state: {
      ...state,
      stageHearts: [
        ...state.stageHearts,
        ...Array.from({ length: showCount }, () => createStageHeart('show')),
        ...Array.from({ length: hideAfterThrowCount }, () => createStageHeart('hide-after-throw')),
      ],
      hiddenHeartBatches:
        hiddenCount === 0
          ? state.hiddenHeartBatches
          : [
              ...state.hiddenHeartBatches,
              {
                count: hiddenCount,
                lifeTimeSeconds,
              },
            ],
    },
    overflowCount: requestedCount - createdCount,
  };
}

export function changeLiveHeartLimit<State extends LiveHeartRuntimeState>(
  state: State,
  heartLimit: number,
): LiveHeartLimitChangeResult<State> {
  validateState(state);
  if (!Number.isSafeInteger(heartLimit) || heartLimit < 0) {
    throw new Error('Live Heart limit is invalid');
  }
  let remainingRemovalCount = Math.max(liveHeartCount(state) - heartLimit, 0);
  const stageRemovalIndices = new Set(
    state.stageHearts
      .map((heart, index) => ({ heart, index }))
      .filter(({ heart }) => heart.phase !== 'collect')
      .sort(
        (left, right) =>
          right.heart.lifeTimeSeconds - left.heart.lifeTimeSeconds || right.index - left.index,
      )
      .slice(0, remainingRemovalCount)
      .map(({ index }) => index),
  );
  remainingRemovalCount -= stageRemovalIndices.size;
  let hiddenRemovalCount = 0;
  const hiddenHeartBatches = [...state.hiddenHeartBatches]
    .reverse()
    .flatMap((batch) => {
      if (remainingRemovalCount === 0) return [batch];
      const removedCount = Math.min(batch.count, remainingRemovalCount);
      remainingRemovalCount -= removedCount;
      hiddenRemovalCount += removedCount;
      const count = batch.count - removedCount;
      return count === 0 ? [] : [{ ...batch, count }];
    })
    .reverse();
  if (remainingRemovalCount !== 0) {
    throw new Error('Live Heart limit removal count differs');
  }
  return {
    state: {
      ...state,
      heartLimit,
      stageHearts: state.stageHearts.filter((_, index) => !stageRemovalIndices.has(index)),
      hiddenHeartBatches,
    },
    lapsedCount: stageRemovalIndices.size + hiddenRemovalCount,
  };
}

export function advanceLiveHeartRuntime<State extends LiveHeartRuntimeState>(
  state: State,
  deltaTimeSeconds: number,
  autoPlay: boolean,
): LiveHeartAdvanceResult<State> {
  validateState(state);
  if (!Number.isFinite(deltaTimeSeconds) || deltaTimeSeconds < 0) {
    throw new Error('Live Heart delta time is invalid');
  }
  const expiredBatches: number[] = [];
  const stageHearts = state.stageHearts.flatMap((heart) => {
    if (heart.phase === 'collect') {
      const collectElapsedSeconds = Math.fround(
        Math.fround(heart.collectElapsedSeconds) + Math.fround(deltaTimeSeconds),
      );
      return collectElapsedSeconds + Number.EPSILON >= heart.collectMoveDurationSeconds
        ? []
        : [{ ...heart, collectElapsedSeconds }];
    }
    const lifeTimeSeconds = Math.fround(
      Math.fround(heart.lifeTimeSeconds) - Math.fround(deltaTimeSeconds),
    );
    if (heart.phase === 'flash' && lifeTimeSeconds < 0) {
      expiredBatches.push(1);
      return [];
    }
    const spawnElapsedSeconds = Math.fround(
      Math.fround(heart.spawnElapsedSeconds) + Math.fround(deltaTimeSeconds),
    );
    const entersFlash = heart.phase !== 'flash' && lifeTimeSeconds < flashThresholdSeconds;
    return [
      {
        ...heart,
        lifeTimeSeconds,
        spawnElapsedSeconds,
        phase: entersFlash
          ? ('flash' as const)
          : heart.phase === 'throw' && spawnElapsedSeconds >= heart.spawnDurationSeconds
            ? ('wait' as const)
            : heart.phase,
        flashElapsedSeconds:
          heart.phase === 'flash'
            ? Math.fround(Math.fround(heart.flashElapsedSeconds) + Math.fround(deltaTimeSeconds))
            : 0,
      },
    ];
  });

  const hiddenHeartBatches = state.hiddenHeartBatches.flatMap((batch) => {
    const lifeTimeSeconds = Math.fround(
      Math.fround(batch.lifeTimeSeconds) - Math.fround(deltaTimeSeconds),
    );
    if (lifeTimeSeconds < 0) {
      expiredBatches.push(batch.count);
      return [];
    }
    return [{ ...batch, lifeTimeSeconds }];
  });
  const expiredCount = expiredBatches.reduce((sum, count) => sum + count, 0);
  return {
    state: { ...state, stageHearts, hiddenHeartBatches },
    lapsedCount: autoPlay ? 0 : expiredCount,
    lapsedBatches: autoPlay ? [] : expiredBatches,
    autoCollectCount: autoPlay ? expiredCount : 0,
  };
}

export function liveHeartCount(state: LiveHeartRuntimeState): number {
  validateState(state);
  return (
    state.stageHearts.filter((heart) => heart.phase !== 'collect').length +
    state.hiddenHeartBatches.reduce((total, batch) => total + batch.count, 0)
  );
}

export function collectLiveHeartRuntime<State extends LiveHeartRuntimeState>(
  state: State,
  randomRange: LiveHeartRandomRange,
): LiveHeartCollectResult<State> {
  validateState(state);
  const collectCount = liveHeartCount(state);
  const collectingHearts = state.stageHearts.filter(
    (heart) => heart.phase !== 'collect' && heart.showState === 'show',
  );
  return {
    state: {
      ...state,
      stageHearts: collectingHearts.map((heart) => ({
        ...heart,
        phase: 'collect' as const,
        collectElapsedSeconds: 0,
        collectMoveDurationSeconds: Math.fround(randomValue(randomRange, 0.9, 1.1)),
        collectJumpHeight: Math.fround(randomValue(randomRange, 0.5, 1)),
      })),
      hiddenHeartBatches: [],
    },
    collectCount,
    animationHeartCount: collectingHearts.length,
  };
}
