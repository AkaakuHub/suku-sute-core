import { expect, test } from 'vite-plus/test';
import { projectLiveScoreRankLightCounts } from '../../src/runtime/live/scoreRankLight.ts';

const thresholds = {
  bRankScore: 1_000n,
  aRankScore: 2_000n,
  sRankScore: 3_000n,
};

test('Liveランクlightは各score区間の到達率を35／21／15枚へ切り捨て投影する', () => {
  expect(projectLiveScoreRankLightCounts(999n, thresholds)).toEqual({
    blue: 34,
    green: 0,
    yellow: 0,
  });
  expect(projectLiveScoreRankLightCounts(1_999n, thresholds)).toEqual({
    blue: 35,
    green: 20,
    yellow: 0,
  });
  expect(projectLiveScoreRankLightCounts(2_999n, thresholds)).toEqual({
    blue: 35,
    green: 21,
    yellow: 14,
  });
});

test('Liveランクlightは各rank到達時に直前区間を全点灯する', () => {
  expect(projectLiveScoreRankLightCounts(1_000n, thresholds)).toEqual({
    blue: 35,
    green: 0,
    yellow: 0,
  });
  expect(projectLiveScoreRankLightCounts(2_000n, thresholds)).toEqual({
    blue: 35,
    green: 21,
    yellow: 0,
  });
  expect(projectLiveScoreRankLightCounts(4_000n, thresholds)).toEqual({
    blue: 35,
    green: 21,
    yellow: 15,
  });
});
