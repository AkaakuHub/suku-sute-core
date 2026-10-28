import type { LiveChangeSkillCostContext } from '../../runtime/skills/changeSkillCostCondition.ts';
import { conditionContext } from '../conditions/gameContext.ts';
import type { Card, GameState } from '../model.ts';

export function skillCostContext(state: GameState, source: Card): LiveChangeSkillCostContext {
  return {
    ...conditionContext(state),
    useCount: state.cardUseCounts[source.id] ?? 0,
    handCardStats: state.handCardStats[source.id] ?? null,
    handCards: state.hand.map((id) => {
      const card = state.deck.find((candidate) => candidate.id === id);
      if (!card) throw new Error('手札のカードがありません。');
      return {
        charactersId: card.member,
        skillMainEffect: card.mainEffect ?? null,
        styleType: card.style ?? null,
        unitIds: card.unit === null ? [] : [card.unit],
      };
    }),
    isUnitMember: (unitId, charactersId) =>
      state.cardPool.some((card) => card.member === charactersId && card.unit === unitId),
    loveUpEffect: Math.fround(
      state.boosts.reduce((sum, boost) => sum + boost.percent, 0) +
        state.skillScoreUps.reduce((sum, boost) => sum + boost.percent, 0) +
        state.temporaryScoreBoosts.reduce((sum, boost) => sum + boost.percent, 0),
    ),
  };
}
