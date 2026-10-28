import { resetHandCardCount } from '../cards/drawing.ts';
import { checkLiveDeckOut } from '../../runtime/cards/deckActionQueue.ts';
import type { GameState } from '../model.ts';
import type { EffectApplier } from './induceSkillEffect.ts';

export function completeDeckOutChecks(state: GameState, applyEffect?: EffectApplier): GameState {
  return checkLiveDeckOut(
    state,
    (current) => notifyDeckReload(current, applyEffect),
    resetHandCardCount,
  );
}

export function notifyDeckReload(state: GameState, applyEffect?: EffectApplier): GameState {
  let next = { ...state, afterDeckReloadEvents: state.afterDeckReloadEvents + 1 };
  for (const effect of next.track.afterDeckReloadEffects) {
    if (!applyEffect) throw new Error('AfterDeckReload効果の実行経路がありません。');
    next = applyEffect(next, effect);
  }
  return next;
}
