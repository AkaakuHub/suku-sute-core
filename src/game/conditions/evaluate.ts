import type { ConditionContext, GameCondition } from './model.ts';

export function evaluateCondition(condition: GameCondition, context: ConditionContext): boolean {
  switch (condition.kind) {
    case 'always':
      return true;
    case 'mental-at-most':
      return context.mentalFraction <= condition.fraction;
    case 'mood-at-most':
      return context.moodValue <= condition.value;
    case 'mood-at-least':
      return context.moodValue >= condition.value;
    case 'mood-equal':
      return Math.trunc(context.moodValue) === Math.trunc(condition.value);
    case 'voltage-level-at-most':
      return context.heatLevel <= condition.level;
    case 'part-at-most':
      return context.partIndex + 1 <= condition.number;
    case 'relative-part':
      return context.partNumber === condition.number;
    case 'heat':
      return context.heatLevel >= condition.minimum;
    case 'mental':
      return context.staminaPercent >= condition.minimumPercent;
    case 'weather':
      return context.weather >= condition.minimum;
    case 'part-from':
      return context.partIndex + 1 >= condition.number;
    case 'part':
      return context.partNumber === condition.number;
    case 'cards':
      return context.cardCounts[condition.zone] >= condition.minimum;
    case 'token-series':
      return (
        context.tokenSeries.filter((series) => condition.series.some((id) => series.includes(id)))
          .length >= condition.minimum
      );
    case 'support-level':
      return (
        condition.members.reduce((sum, id) => sum + (context.supportLevels[id] ?? 0), 0) >=
        condition.minimum
      );
    case 'natural-stars':
      return context.naturalStars >= condition.minimum;
    case 'weather-type':
      return (
        (context.weather > 0 ? 'sun' : context.weather < 0 ? 'rain' : 'cloud') === condition.weather
      );
  }
}
