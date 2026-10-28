import { type LiveConditionContext, liveConditionVoltageLevel } from '../live/conditionContext.ts';
import { liveMentalRatio } from '../live/mentalGauge.ts';
import { type LiveHandCardStats, liveHandCardStatsUnitUseCount } from '../cards/handCardStats.ts';
import type { LiveChangeApEffect } from '../cards/deckActionTypes.ts';
import { liveSkillCostMoodValue } from './changeSkillCostValue.ts';

export type LiveChangeSkillCostCard = Readonly<{
  charactersId: number;
  skillMainEffect: number | null;
  styleType: number | null;
  unitIds: readonly number[];
}>;

export type LiveChangeSkillCostContext = Readonly<
  LiveConditionContext & {
    useCount: number;
    handCardStats: LiveHandCardStats | null;
    handCards: readonly LiveChangeSkillCostCard[];
    isUnitMember: (unitId: number, charactersId: number) => boolean;
    loveUpEffect: number;
  }
>;

export function liveChangeSkillCostConditionValue(
  effect: Pick<LiveChangeApEffect, 'conditionType' | 'conditionId'>,
  context: LiveChangeSkillCostContext,
): number {
  switch (effect.conditionType) {
    case 1:
      return 1;
    case 2:
      return context.useCount;
    case 3:
      return liveConditionVoltageLevel(context);
    case 4:
      return Math.min(liveMentalRatio(context.mental, context.maximumMental), 1);
    case 5:
      return requireStats(context).sectionCount;
    case 6:
      return requireStats(context).skillUseCountsByMember[effect.conditionId] ?? 0;
    case 7:
      return requireStats(context).skillUseCountsByMainEffect[effect.conditionId] ?? 0;
    case 8:
      return context.handCards.filter((card) => card.skillMainEffect === effect.conditionId).length;
    case 9:
      return context.loveUpEffect;
    case 10:
      return context.handCards.filter((card) => card.styleType === effect.conditionId).length;
    case 11:
      return context.handCards.filter((card) => card.charactersId === effect.conditionId).length;
    case 12:
      return liveSkillCostMoodValue(context.moodValue, effect.conditionId);
    case 13:
      return liveHandCardStatsUnitUseCount(
        requireStats(context),
        effect.conditionId,
        context.isUnitMember,
      );
    case 14:
      return context.handCards.filter((card) => card.unitIds.includes(effect.conditionId)).length;
    case 15:
      return context.exclusionCount;
  }
}

function requireStats(context: LiveChangeSkillCostContext): LiveHandCardStats {
  if (context.handCardStats === null) throw new Error('Live skill cost hand statistics are absent');
  return context.handCardStats;
}
