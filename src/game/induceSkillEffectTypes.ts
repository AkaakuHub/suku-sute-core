export type InduceSkillCondition = 'voltage' | 'mental-recover' | 'mental-barrier';

export type UseInduceEffect = Readonly<{
  kind: 'use-induce';
  sourceEffectId: string;
  targetEffectId: bigint | null;
  limit: bigint;
  effects: readonly import('./modelTypes').Effect[];
}>;

export type UseCountInduceEffect = Readonly<{
  kind: 'use-count-induce';
  sourceEffectId: string;
  targetEffectId: bigint | null;
  requireCount: bigint;
  limit: bigint;
  effects: readonly import('./modelTypes').Effect[];
}>;

export type EffectInduceEffect = Readonly<{
  kind: 'effect-induce';
  sourceEffectId: string;
  deactivationKey?: string;
  target: 'mental-barrier' | 'bonus-score';
  threshold: Readonly<{ kind: 'none' | 'at-least' | 'at-most'; value: bigint }>;
  effects: readonly import('./modelTypes').Effect[];
}>;

export type CardMoveInduceEffect = Readonly<{
  kind: 'card-move-induce';
  sourceEffectId: string;
  targetEffectId: bigint | null;
  timing: 'stage-to-graveyard';
  limit: bigint;
  requireCount: bigint;
  effects: readonly import('./modelTypes').Effect[];
}>;

export type InduceEffect =
  | EffectInduceEffect
  | CardMoveInduceEffect
  | UseCountInduceEffect
  | UseInduceEffect;

export type ActiveEffectInducer = Readonly<{
  sourceCardId: string;
  sourceEffectId: string;
  target: EffectInduceEffect['target'];
  threshold: Readonly<{ kind: EffectInduceEffect['threshold']['kind']; value: number }>;
  effects: EffectInduceEffect['effects'];
  active: boolean;
  deactivationKey: string | null;
}>;

export type ActiveCardMoveInducer = Readonly<{
  sourceCardId: string;
  sourceEffectId: string;
  targetEffectId: bigint | null;
  timing: CardMoveInduceEffect['timing'];
  limit: bigint;
  requireCount: bigint;
  effects: CardMoveInduceEffect['effects'];
  useCount: number;
}>;

export type InduceSkillEffectInput = Readonly<{
  kind: 'induce-skill-effect';
  condition: InduceSkillCondition;
  num: bigint;
  deckUnderAdd: bigint;
  deckOverAdd: bigint;
  deckUnderLimit: bigint;
  deckOverLimit: bigint;
  deckCardMax: number;
  effects: readonly Readonly<{ actionType: number; effect: import('./modelTypes').Effect }>[];
  duration:
    | Readonly<{ kind: 'stage' }>
    | Readonly<{ kind: 'milliseconds' | 'sections'; value: bigint }>;
  invocationType?: number;
  deactivationKey?: string;
}>;

export type InducedSkillEffect = Readonly<{
  id: number;
  condition: InduceSkillCondition;
  num: bigint;
  deckUnderAdd: bigint;
  deckOverAdd: bigint;
  deckUnderLimit: bigint;
  deckOverLimit: bigint;
  deckCardMax: number;
  addValue: number;
  multiplier: number;
  effects: InduceSkillEffectInput['effects'];
  remainingSeconds: number | null;
  remainingSections: bigint | null;
  sourceCardId: string | null;
  deactivationKey: string | null;
}>;

export function validateInduceSkillEffect(effect: InduceSkillEffectInput): void {
  const validLong = (value: bigint) => value >= -(1n << 63n) && value < 1n << 63n;
  const validDuration =
    effect.duration.kind === 'stage' ||
    (validLong(effect.duration.value) &&
      effect.duration.value >= (effect.duration.kind === 'sections' ? 1n : 0n));
  if (
    !['voltage', 'mental-recover', 'mental-barrier'].includes(effect.condition) ||
    !validLong(effect.num) ||
    !validLong(effect.deckUnderAdd) ||
    !validLong(effect.deckOverAdd) ||
    !validLong(effect.deckUnderLimit) ||
    effect.deckUnderLimit < 0n ||
    !validLong(effect.deckOverLimit) ||
    effect.deckOverLimit < 0n ||
    !Number.isSafeInteger(effect.deckCardMax) ||
    effect.deckCardMax < 1 ||
    !validDuration ||
    (effect.invocationType !== undefined && !Number.isSafeInteger(effect.invocationType)) ||
    (effect.deactivationKey !== undefined && typeof effect.deactivationKey !== 'string')
  )
    throw new Error('誘発スキル効果の設定が正しくありません。');
}
