import type { Card, Effect, GameState } from '../model.ts';

export function applySpecialReset(
  state: GameState,
  effect: Extract<Effect, { kind: 'reset-special' }>,
  sourceCard?: Card,
): GameState {
  return {
    ...state,
    specialUsed: state.specialUsed.filter((id) => {
      const card = state.deck.find((item) => item.cardInstanceId === id);
      if (!card?.special || card.token !== undefined) return true;
      const isNormalSpecial = state.deck[0]?.cardInstanceId === card.cardInstanceId;
      const isExtraSpecial = card.special.extra === true;
      if (effect.scope === 'normal' && !isNormalSpecial) return true;
      if (effect.scope === 'extra' && !isExtraSpecial) return true;
      if (effect.scope === 'all' && !isNormalSpecial && !isExtraSpecial) return true;
      const matchesTarget =
        effect.target.kind === 'all' ||
        (effect.target.kind === 'source' && card.cardInstanceId === sourceCard?.cardInstanceId) ||
        (effect.target.kind === 'others' && card.cardInstanceId !== sourceCard?.cardInstanceId) ||
        (effect.target.kind === 'member' && card.charactersId === effect.target.member) ||
        (effect.target.kind === 'unit' && card.unitIds.includes(effect.target.unit));
      return (
        !matchesTarget ||
        (state.currentSkillType === 1 && card.cardInstanceId === sourceCard?.cardInstanceId)
      );
    }),
  };
}
