export type GameCondition =
  | Readonly<{ kind: 'always' }>
  | Readonly<{ kind: 'mental-at-most'; fraction: number }>
  | Readonly<{ kind: 'mood-at-most'; value: number }>
  | Readonly<{ kind: 'mood-at-least'; value: number }>
  | Readonly<{ kind: 'mood-equal'; value: number }>
  | Readonly<{ kind: 'voltage-level-at-most'; level: number }>
  | Readonly<{ kind: 'part-at-most' | 'relative-part'; number: number }>
  | Readonly<{ kind: 'heat'; minimum: number }>
  | Readonly<{ kind: 'stamina'; minimumPercent: number }>
  | Readonly<{ kind: 'weather'; minimum: number }>
  | Readonly<{ kind: 'part-from' | 'part'; number: number }>
  | Readonly<{ kind: 'cards'; zone: 'all' | 'draw' | 'discard' | 'excluded'; minimum: number }>
  | Readonly<{ kind: 'token-series'; series: readonly number[]; minimum: number }>
  | Readonly<{ kind: 'support-level'; members: readonly number[]; minimum: number }>
  | Readonly<{ kind: 'natural-stars'; minimum: number }>
  | Readonly<{ kind: 'weather-type'; weather: 'sun' | 'cloud' | 'rain' }>;

export type ConditionContext = Readonly<{
  heatLevel: number;
  mentalFraction: number;
  moodValue: number;
  staminaPercent: number;
  weather: number;
  partIndex: number;
  partNumber: number;
  cardCounts: Readonly<Record<'all' | 'draw' | 'discard' | 'excluded', number>>;
  tokenSeries: readonly (readonly number[])[];
  supportLevels: Readonly<Record<number, number>>;
  naturalStars: number;
  bloomActive: boolean;
}>;
