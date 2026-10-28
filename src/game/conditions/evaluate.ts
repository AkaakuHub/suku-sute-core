import {
  type LiveConditionContext,
  liveConditionVoltageLevel,
  liveConditionSectionNumber,
  liveConditionMoodValue,
  liveConditionMoodType,
} from '../../runtime/live/conditionContext.ts';
import { liveMentalRatio } from '../../runtime/live/mentalGauge.ts';
import type { GameCondition } from './model.ts';

export function evaluateCondition(
  condition: GameCondition,
  context: LiveConditionContext,
): boolean {
  switch (condition.kind) {
    case 'always':
      return true;
    case 'mental-at-most':
      return (
        liveMentalRatio(context.mental, context.maximumMental) <= Math.fround(condition.fraction)
      );
    case 'mood-at-most':
      return liveConditionMoodValue(context) <= condition.value;
    case 'mood-at-least':
      return liveConditionMoodValue(context) >= condition.value;
    case 'mood-equal':
      return Math.trunc(liveConditionMoodValue(context)) === Math.trunc(condition.value);
    case 'voltage-level-at-most':
      return liveConditionVoltageLevel(context) <= condition.level;
    case 'part-at-most':
      return context.currentSection + 1 <= condition.number;
    case 'relative-part':
      return liveConditionSectionNumber(context) === condition.number;
    case 'heat':
      return liveConditionVoltageLevel(context) >= condition.minimum;
    case 'mental':
      return (
        liveMentalRatio(context.mental, context.maximumMental) >=
        Math.fround(Math.fround(condition.minimumPercent) / 100)
      );
    case 'weather':
      return liveConditionMoodValue(context) >= condition.minimum;
    case 'part-from':
      return context.currentSection + 1 >= condition.number;
    case 'part':
      return liveConditionSectionNumber(context) === condition.number;
    case 'cards':
      return cardCount(context, condition.zone) >= condition.minimum;
    case 'card-count-parity':
      return cardCount(context, condition.zone) % 2 === (condition.parity === 'even' ? 0 : 1);
    case 'token-series':
      return context.tokenCardSeriesCount(condition.series) >= condition.minimum;
    case 'support-level':
      return context.memberFanLevelTotal(condition.members) >= condition.minimum;
    case 'natural-stars':
      return context.beatHeartValue >= condition.minimum;
    case 'weather-type':
      return (
        liveConditionMoodType(context) ===
        (condition.weather === 'sun' ? 1 : condition.weather === 'rain' ? 3 : 2)
      );
  }
}

function cardCount(
  context: LiveConditionContext,
  zone: 'all' | 'draw' | 'discard' | 'excluded',
): number {
  switch (zone) {
    case 'all':
      return context.cardTotal;
    case 'draw':
      return context.deckCount;
    case 'discard':
      return context.graveyardCount;
    case 'excluded':
      return context.exclusionCount;
  }
}
