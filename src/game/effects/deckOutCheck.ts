import type { GameState } from '../model.ts';
import type { EffectApplier } from './induceSkillEffect.ts';

export function completeDeckOutChecks(state: GameState, applyEffect?: EffectApplier): GameState {
  if (state.deckOutCount <= 0)
    return state.deckOutCount === 0 ? state : { ...state, deckOutCount: 0 };
  let next: GameState = {
    ...state,
    deckOutCount: state.deckOutCount - 1,
    afterMentalDownEvents: state.afterMentalDownEvents + 1,
  };
  for (const effect of state.track.afterMentalDownEffects) {
    if (!applyEffect) throw new Error('AfterMentalDown効果の実行経路がありません。');
    next = applyEffect(next, effect);
  }
  return next;
}
