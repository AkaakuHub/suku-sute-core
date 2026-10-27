import { expect, test } from 'vite-plus/test';
import {
  projectLiveHeartPresentations,
  liveHeartShowLimitSettings,
  resolveLiveHeartDrawCount,
} from '../../src/runtime/live/heartPresentation.ts';
import type { LiveStageHeart } from '../../src/runtime/live/heartTypes.ts';

const heart = (overrides: Partial<LiveStageHeart> = {}): LiveStageHeart => ({
  lifeTimeSeconds: 10,
  phase: 'throw',
  showState: 'show',
  spawnElapsedSeconds: 0,
  spawnDurationSeconds: 0.5,
  spawnStartPosition: { x: 1, y: -1 },
  waitPosition: { x: 1, y: 0 },
  flashElapsedSeconds: 0,
  collectElapsedSeconds: 0,
  collectMoveDurationSeconds: 1,
  collectJumpHeight: 0.5,
  ...overrides,
});

test('公式設定範囲でHeart event順の先頭から描画数だけを制限する', () => {
  expect(liveHeartShowLimitSettings).toEqual({
    minimum: 10,
    maximum: 100,
    step: 10,
    defaultValue: 50,
  });
  expect(resolveLiveHeartDrawCount(100, 50)).toBe(50);
  expect(resolveLiveHeartDrawCount(8, 50)).toBe(8);
  expect(() => resolveLiveHeartDrawCount(100, 55)).toThrow('Live Heart show limit is invalid');
});

test('Throw中はOutExpoで待機位置へ移動して0.5秒で表示する', () => {
  const [presentation] = projectLiveHeartPresentations([heart({ spawnElapsedSeconds: 0.25 })], 2);
  expect(presentation).toBeDefined();
  expect(presentation?.rank).toBe(2);
  expect(presentation?.position.x).toBe(1);
  expect(presentation?.position.y).toBeCloseTo(-0.03125);
  expect(presentation?.alpha).toBe(0.5);
});

test('Wait中は毎秒0.2の速度で落下する', () => {
  const [presentation] = projectLiveHeartPresentations(
    [
      heart({
        phase: 'wait',
        spawnElapsedSeconds: 2.5,
      }),
    ],
    0,
  );
  expect(presentation?.position).toEqual({ x: 1, y: -0.4 });
  expect(presentation?.alpha).toBe(1);
});

test('HideAfterThrowはThrow後0.2秒で消えてFlashは0.2秒ごとに明滅する', () => {
  const fading = projectLiveHeartPresentations(
    [
      heart({
        phase: 'wait',
        showState: 'hide-after-throw',
        spawnElapsedSeconds: 0.6,
      }),
    ],
    0,
  );
  expect(fading[0]?.alpha).toBeCloseTo(0.5);
  expect(
    projectLiveHeartPresentations(
      [
        heart({
          phase: 'wait',
          showState: 'hide-after-throw',
          spawnElapsedSeconds: 0.7,
        }),
      ],
      0,
    ),
  ).toEqual([]);
  expect(
    projectLiveHeartPresentations(
      [
        heart({
          phase: 'flash',
          spawnElapsedSeconds: 1,
          flashElapsedSeconds: 0.1,
        }),
      ],
      4,
    )[0]?.alpha,
  ).toBe(0.5);
});

test('Collectは収束中に1回跳躍し後半だけ0.5倍まで縮小する', () => {
  const [presentation] = projectLiveHeartPresentations(
    [
      heart({
        phase: 'collect',
        collectElapsedSeconds: 0.5,
        collectJumpHeight: 0.75,
      }),
    ],
    2,
  );
  expect(presentation?.collectionProgress).toBe(0.75);
  expect(presentation?.collectionJumpHeight).toBeCloseTo(Math.SQRT1_2 * 0.75);
  expect(presentation?.collectionScale).toBe(1);
});
