import type { LiveHeartRandomRange } from './heartTypes.ts';
import type { LiveHeartRuntimeState } from './heartTypes.ts';

export function validateState(state: LiveHeartRuntimeState): void {
  for (const [label, value] of [
    ['limit', state.heartLimit],
    ['show limit', state.showLimit],
    ['throw limit', state.throwLimit],
    ['show percentage', state.showPercentage],
  ] as const) {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new Error(`Live Heart ${label} is invalid`);
    }
  }
  if (
    state.showPercentage > 100 ||
    !Number.isFinite(state.baseLifeTimeSeconds) ||
    state.baseLifeTimeSeconds < 0 ||
    state.stageHearts.some(
      (heart) =>
        !Number.isFinite(heart.lifeTimeSeconds) ||
        !Number.isFinite(heart.spawnElapsedSeconds) ||
        heart.spawnElapsedSeconds < 0 ||
        !Number.isFinite(heart.spawnDurationSeconds) ||
        heart.spawnDurationSeconds <= 0 ||
        ![heart.spawnStartPosition, heart.waitPosition].every(
          (position) => Number.isFinite(position.x) && Number.isFinite(position.y),
        ) ||
        !Number.isFinite(heart.flashElapsedSeconds) ||
        heart.flashElapsedSeconds < 0 ||
        !Number.isFinite(heart.collectElapsedSeconds) ||
        heart.collectElapsedSeconds < 0 ||
        !Number.isFinite(heart.collectMoveDurationSeconds) ||
        heart.collectMoveDurationSeconds < Math.fround(0.9) ||
        heart.collectMoveDurationSeconds > Math.fround(1.1) ||
        !Number.isFinite(heart.collectJumpHeight) ||
        heart.collectJumpHeight < 0.5 ||
        heart.collectJumpHeight > 1 ||
        !['throw', 'wait', 'flash', 'collect'].includes(heart.phase) ||
        !['show', 'hide-after-throw'].includes(heart.showState),
    ) ||
    state.hiddenHeartBatches.some(
      (batch) =>
        !Number.isSafeInteger(batch.count) ||
        batch.count < 1 ||
        !Number.isFinite(batch.lifeTimeSeconds) ||
        batch.lifeTimeSeconds < 0,
    )
  ) {
    throw new Error('Live Heart state is invalid');
  }
  const hiddenHeartCount = state.hiddenHeartBatches.reduce(
    (total, batch) => total + batch.count,
    0,
  );
  const logicalStageHeartCount = state.stageHearts.filter(
    (heart) => heart.phase !== 'collect',
  ).length;
  if (logicalStageHeartCount + hiddenHeartCount > state.heartLimit) {
    throw new Error('Live Heart count exceeds limit');
  }
}

export function randomValue(
  randomRange: LiveHeartRandomRange,
  minimum: number,
  maximum: number,
): number {
  const value = randomRange(minimum, maximum);
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error('Live Heart random value is invalid');
  }
  return Math.fround(value);
}
