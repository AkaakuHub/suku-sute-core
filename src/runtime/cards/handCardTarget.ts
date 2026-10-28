import type { LiveCardIdentifier } from './deckBoardState.ts';
import type { LiveTokenCardDeckState } from './tokenCardDeck.ts';

export function addLiveHandCardTargetCount<Id extends LiveCardIdentifier>(
  state: LiveTokenCardDeckState<Id>,
  amount: number,
): LiveTokenCardDeckState<Id> {
  validateAmount(amount);
  return {
    ...state,
    handTargetCounts: {
      ...state.handTargetCounts,
      current: (state.handTargetCounts.current + amount) | 0,
    },
  };
}

export function addLiveSavedHandCardTargetCount<Id extends LiveCardIdentifier>(
  state: LiveTokenCardDeckState<Id>,
  amount: number,
): LiveTokenCardDeckState<Id> {
  validateAmount(amount);
  return state.maxHandSkillActiveCount > 0
    ? { ...state, handMaxCardSkillInfo: addSavedTarget(state, amount) }
    : state;
}

export function resetLiveHandCardTargetCount<Id extends LiveCardIdentifier>(
  state: LiveTokenCardDeckState<Id>,
  amount: number,
): LiveTokenCardDeckState<Id> {
  validateAmount(amount);
  if (amount === 0) return state;
  const changed = addLiveHandCardTargetCount(
    addLiveSavedHandCardTargetCount(state, amount),
    amount,
  );
  return state.maxHandSkillActiveCount > 0
    ? { ...changed, handTargetCounts: { ...changed.handTargetCounts, current: 8 } }
    : changed;
}

export function activateLiveHandCardMax<Id extends LiveCardIdentifier>(
  state: LiveTokenCardDeckState<Id>,
): LiveTokenCardDeckState<Id> {
  return {
    ...state,
    maxHandSkillActiveCount: (state.maxHandSkillActiveCount + 1) | 0,
    handMaxCardSkillInfo: { targetHandCount: state.handTargetCounts.current },
    handTargetCounts: { ...state.handTargetCounts, current: 8 },
  };
}

export function deactivateLiveHandCardMax<Id extends LiveCardIdentifier>(
  state: LiveTokenCardDeckState<Id>,
): LiveTokenCardDeckState<Id> {
  const remaining = Math.max(0, state.maxHandSkillActiveCount - 1);
  if (remaining > 0) return { ...state, maxHandSkillActiveCount: remaining };
  const saved = state.handMaxCardSkillInfo;
  if (saved === null) throw new Error('Live HandCardMax saved target is absent');
  return {
    ...state,
    maxHandSkillActiveCount: 0,
    handMaxCardSkillInfo: null,
    handTargetCounts: { ...state.handTargetCounts, current: saved.targetHandCount },
  };
}

function addSavedTarget<Id extends LiveCardIdentifier>(
  state: LiveTokenCardDeckState<Id>,
  amount: number,
): Readonly<{ targetHandCount: number }> {
  const saved = state.handMaxCardSkillInfo;
  if (saved === null) throw new Error('Live HandCardMax saved target is absent');
  return { targetHandCount: (saved.targetHandCount + amount) | 0 };
}

function validateAmount(amount: number): void {
  if (!Number.isInteger(amount) || (amount | 0) !== amount) {
    throw new Error('Live hand target amount is invalid');
  }
}
