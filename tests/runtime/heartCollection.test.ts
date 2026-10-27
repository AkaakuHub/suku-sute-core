import { expect, test } from 'vite-plus/test';
import {
  advanceLiveScoreDisplay,
  collectLiveHearts,
  type LiveScoreDisplayState,
} from '../../src/runtime/live/heartCollection.ts';

const initialState: LiveScoreDisplayState = {
  totalScore: 100n,
  displayScore: 100n,
  reportScores: [{ timeMilliseconds: 0, totalScore: 100n }],
  pendingDisplayUpdates: [],
};

test('Live Heartは末尾からanimation後にtotal scoreとeventを同一frameで処理する', () => {
  const result = collectLiveHearts(initialState, {
    currentTimeSeconds: 1,
    collectCount: 3,
    animationHeartCount: 2,
    heartRank: 2,
    clientScore: {
      kind: 'verified',
      addScore: 40n,
      deltaScoreEffectStarted: true,
    },
  });

  if (result.kind !== 'collected') throw new Error('Heart was not collected');
  expect(result.events).toEqual([
    { kind: 'play-collect-animation', heartIndex: 1 },
    { kind: 'play-collect-animation', heartIndex: 0 },
    { kind: 'total-score-added', addScore: 40n, totalScore: 140n },
    { kind: 'play-report-recorded', addScore: 40n },
    { kind: 'delta-score-effect-started', addScore: 40n },
    { kind: 'heart-collect-event', collectCount: 3, heartRank: 2 },
  ]);
  expect(result.state).toEqual({
    totalScore: 140n,
    displayScore: 100n,
    reportScores: [
      { timeMilliseconds: 0, totalScore: 100n },
      { timeMilliseconds: 1000, totalScore: 100n },
      { timeMilliseconds: 1000, totalScore: 140n },
    ],
    pendingDisplayUpdates: [{ dueTimeSeconds: Math.fround(1.8), addScore: 40n }],
  });
});

test('Live display scoreは0.8秒後に更新しruntimeのLOVE形式を反映する', () => {
  const collected = collectLiveHearts(initialState, {
    currentTimeSeconds: 1,
    collectCount: 1,
    animationHeartCount: 1,
    heartRank: 0,
    clientScore: {
      kind: 'verified',
      addScore: 40n,
      deltaScoreEffectStarted: false,
    },
  });
  if (collected.kind !== 'collected') throw new Error('Heart was not collected');

  expect(advanceLiveScoreDisplay(collected.state, 1.79).events).toEqual([]);
  const displayed = advanceLiveScoreDisplay(collected.state, 1.8);
  expect(displayed.state.displayScore).toBe(140n);
  expect(displayed.events).toEqual([
    { kind: 'display-score-added', addScore: 40n, displayScore: 140n },
    { kind: 'score-text-updated', text: '140' },
    { kind: 'love-text-updated', text: '000,000,000,140' },
  ]);
});

test('Live Heartはclient score入力不足時にanimation以降を推測しない', () => {
  expect(
    collectLiveHearts(initialState, {
      currentTimeSeconds: 1,
      collectCount: 2,
      animationHeartCount: 1,
      heartRank: 1,
      clientScore: { kind: 'unresolved' },
    }),
  ).toEqual({
    kind: 'unresolved',
    reason: 'verified-client-score-input-missing',
    knownPrefixEvents: [{ kind: 'play-collect-animation', heartIndex: 0 }],
  });
});
