import type { Effect } from './modelTypes.ts';
import type { UseCountInduceEffect, UseInduceEffect } from './induceSkillEffectTypes.ts';
import type { CardMoveInduceEffect, EffectInduceEffect } from './induceSkillEffectTypes.ts';

import { isInt64 } from '../runtime/numeric.ts';

export function validateUseInduceEffect(
  effect: UseInduceEffect,
  validateChild: (effect: Effect) => void,
): void {
  if (
    !effect.sourceEffectId ||
    (effect.targetEffectId !== null && !isInt64(effect.targetEffectId)) ||
    !isInt64(effect.limit) ||
    (effect.targetEffectId === null && effect.effects.length !== 0) ||
    (effect.targetEffectId !== null &&
      (effect.effects.length !== 1 || effect.effects[0]?.skillEffectId !== effect.targetEffectId))
  )
    throw new Error('使用誘発の設定が正しくありません。');
  for (const child of effect.effects) validateChild(child);
}

export function validateUseCountInduceEffect(
  effect: UseCountInduceEffect,
  validateChild: (effect: Effect) => void,
): void {
  if (
    !effect.sourceEffectId ||
    (effect.targetEffectId !== null && !isInt64(effect.targetEffectId)) ||
    !isInt64(effect.requireCount) ||
    !isInt64(effect.limit) ||
    (effect.targetEffectId === null && effect.effects.length !== 0) ||
    (effect.targetEffectId !== null &&
      (effect.effects.length !== 1 || effect.effects[0]?.skillEffectId !== effect.targetEffectId))
  )
    throw new Error('使用回数誘発の設定が正しくありません。');
  for (const child of effect.effects) validateChild(child);
}

export function validateEffectInduceEffect(
  effect: EffectInduceEffect,
  validateChild: (effect: Effect) => void,
): void {
  if (
    !effect.sourceEffectId ||
    !['mental-barrier', 'bonus-score'].includes(effect.target) ||
    !['none', 'at-least', 'at-most'].includes(effect.threshold.kind) ||
    !isInt64(effect.threshold.value) ||
    (effect.deactivationKey !== undefined && typeof effect.deactivationKey !== 'string') ||
    !effect.effects.length
  )
    throw new Error('効果誘発の設定が正しくありません。');
  for (const child of effect.effects) validateChild(child);
}

export function validateCardMoveInduceEffect(
  effect: CardMoveInduceEffect,
  validateChild: (effect: Effect) => void,
): void {
  if (
    !effect.sourceEffectId ||
    effect.timing !== 'stage-to-graveyard' ||
    (effect.targetEffectId !== null && !isInt64(effect.targetEffectId)) ||
    !isInt64(effect.limit) ||
    !isInt64(effect.requireCount) ||
    (effect.targetEffectId === null && effect.effects.length !== 0) ||
    (effect.targetEffectId !== null &&
      (effect.effects.length !== 1 || effect.effects[0]?.skillEffectId !== effect.targetEffectId))
  )
    throw new Error('カード移動誘発の設定が正しくありません。');
  for (const child of effect.effects) validateChild(child);
}
