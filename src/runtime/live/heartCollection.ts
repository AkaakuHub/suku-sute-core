import { appendLivePlayReportScore, type LivePlayReportScore } from '../report/playReportScore.ts';
import { formatLiveLoveScore } from './scoreText.ts';

export type LiveScoreDisplayState = Readonly<{
  totalScore: bigint;
  displayScore: bigint;
  reportScores: readonly LivePlayReportScore[];
  pendingDisplayUpdates: readonly LivePendingScoreDisplayUpdate[];
}>;

export type LivePendingScoreDisplayUpdate = Readonly<{
  dueTimeSeconds: number;
  addScore: bigint;
}>;

export type LiveHeartCollectionEvent = Readonly<
  | { kind: 'play-collect-animation'; heartIndex: number }
  | { kind: 'total-score-added'; addScore: bigint; totalScore: bigint }
  | { kind: 'play-report-recorded'; addScore: bigint }
  | { kind: 'delta-score-effect-started'; addScore: bigint }
  | { kind: 'heart-collect-event'; collectCount: number; heartRank: number }
>;

export type LiveScoreDisplayEvent = Readonly<
  | { kind: 'display-score-added'; addScore: bigint; displayScore: bigint }
  | { kind: 'score-text-updated'; text: string }
  | { kind: 'love-text-updated'; text: string }
>;

export type LiveHeartCollectionResult =
  | Readonly<{
      kind: 'unresolved';
      reason: 'verified-client-score-input-missing';
      knownPrefixEvents: readonly LiveHeartCollectionEvent[];
    }>
  | Readonly<{
      kind: 'collected';
      state: LiveScoreDisplayState;
      events: readonly LiveHeartCollectionEvent[];
    }>;

const heartScoreDisplayDelaySeconds = 0.8;

export function collectLiveHearts(
  state: LiveScoreDisplayState,
  input: Readonly<{
    currentTimeSeconds: number;
    collectCount: number;
    animationHeartCount: number;
    heartRank: number;
    clientScore:
      | Readonly<{ kind: 'unresolved' }>
      | Readonly<{
          kind: 'verified';
          addScore: bigint;
          deltaScoreEffectStarted: boolean;
        }>;
  }>,
): LiveHeartCollectionResult {
  validateState(state);
  validateCollectionInput(input);
  const animationEvents = collectAnimationEvents(input.animationHeartCount);
  if (input.clientScore.kind === 'unresolved') {
    return {
      kind: 'unresolved',
      reason: 'verified-client-score-input-missing',
      knownPrefixEvents: animationEvents,
    };
  }
  if (input.collectCount === 0) {
    return { kind: 'collected', state, events: animationEvents };
  }

  const totalScore = state.totalScore + input.clientScore.addScore;
  const events: LiveHeartCollectionEvent[] = [
    ...animationEvents,
    {
      kind: 'total-score-added',
      addScore: input.clientScore.addScore,
      totalScore,
    },
    { kind: 'play-report-recorded', addScore: input.clientScore.addScore },
  ];
  if (input.clientScore.deltaScoreEffectStarted) {
    events.push({
      kind: 'delta-score-effect-started',
      addScore: input.clientScore.addScore,
    });
  }
  events.push({
    kind: 'heart-collect-event',
    collectCount: input.collectCount,
    heartRank: input.heartRank,
  });
  return {
    kind: 'collected',
    events,
    state: {
      ...state,
      totalScore,
      reportScores: appendLivePlayReportScore(
        state.reportScores,
        input.currentTimeSeconds,
        totalScore,
      ),
      pendingDisplayUpdates: [
        ...state.pendingDisplayUpdates,
        {
          dueTimeSeconds: Math.fround(
            Math.fround(input.currentTimeSeconds) + heartScoreDisplayDelaySeconds,
          ),
          addScore: input.clientScore.addScore,
        },
      ],
    },
  };
}

export function advanceLiveScoreDisplay(
  state: LiveScoreDisplayState,
  currentTimeSeconds: number,
): Readonly<{
  state: LiveScoreDisplayState;
  events: readonly LiveScoreDisplayEvent[];
}> {
  validateState(state);
  validateTime(currentTimeSeconds);
  let displayScore = state.displayScore;
  const pendingDisplayUpdates: LivePendingScoreDisplayUpdate[] = [];
  const events: LiveScoreDisplayEvent[] = [];
  for (const update of state.pendingDisplayUpdates) {
    if (currentTimeSeconds < update.dueTimeSeconds) {
      pendingDisplayUpdates.push(update);
      continue;
    }
    displayScore += update.addScore;
    events.push(
      {
        kind: 'display-score-added',
        addScore: update.addScore,
        displayScore,
      },
      { kind: 'score-text-updated', text: displayScore.toString() },
      {
        kind: 'love-text-updated',
        text: formatLiveLoveScore(displayScore),
      },
    );
  }
  return {
    events,
    state: { ...state, displayScore, pendingDisplayUpdates },
  };
}

function collectAnimationEvents(collectCount: number): LiveHeartCollectionEvent[] {
  const events: LiveHeartCollectionEvent[] = [];
  for (let heartIndex = collectCount - 1; heartIndex >= 0; heartIndex -= 1) {
    events.push({ kind: 'play-collect-animation', heartIndex });
  }
  return events;
}

function validateState(state: LiveScoreDisplayState): void {
  if (state.totalScore < 0n || state.displayScore < 0n) {
    throw new Error('Live score state is invalid');
  }
  for (const update of state.pendingDisplayUpdates) {
    validateTime(update.dueTimeSeconds);
    if (update.addScore < 0n) {
      throw new Error('Live pending display score is invalid');
    }
  }
}

function validateCollectionInput(
  input: Readonly<{
    currentTimeSeconds: number;
    collectCount: number;
    animationHeartCount: number;
    heartRank: number;
    clientScore:
      | Readonly<{ kind: 'unresolved' }>
      | Readonly<{ kind: 'verified'; addScore: bigint }>;
  }>,
): void {
  validateTime(input.currentTimeSeconds);
  if (!Number.isSafeInteger(input.collectCount) || input.collectCount < 0) {
    throw new Error('Live Heart collect count is invalid');
  }
  if (
    !Number.isSafeInteger(input.animationHeartCount) ||
    input.animationHeartCount < 0 ||
    input.animationHeartCount > input.collectCount
  ) {
    throw new Error('Live Heart animation count is invalid');
  }
  if (!Number.isSafeInteger(input.heartRank) || input.heartRank < 0) {
    throw new Error('Live Heart rank is invalid');
  }
  if (input.clientScore.kind === 'verified' && input.clientScore.addScore < 0n) {
    throw new Error('Live client score is invalid');
  }
}

function validateTime(value: number): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error('Live score time is invalid');
  }
}
