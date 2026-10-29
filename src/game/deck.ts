import { validateEffect } from './effectValidation.ts';
import { type Card, costumeIds, rules } from './model.ts';
export function validateDeck(
  deck: readonly Card[],
): asserts deck is readonly [Card, Card, Card, ...Card[]] {
  if (
    deck.length < 3 ||
    deck.length > rules.maxDeckSize ||
    new Set(deck.map((card) => card.cardInstanceId)).size !== deck.length
  ) {
    throw new Error('編成の枚数またはカードの識別子が正しくありません。');
  }
  for (const card of deck) {
    validateCard(card);
  }
}
export function validateCard(card: Card): void {
  if (
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(card.cardInstanceId) ||
    card.cardDatasId.length === 0 ||
    (!card.tokenCard && !card.name.trim()) ||
    (card.costume !== null && !costumeIds.includes(card.costume)) ||
    (!card.tokenCard && (card.costume === null || card.performer === null)) ||
    !Number.isInteger(card.consumeAp) ||
    card.consumeAp < 0 ||
    (card.skillMainEffect !== null && !Number.isSafeInteger(card.skillMainEffect)) ||
    Object.values(card.appeal).some(
      (value) => !Number.isSafeInteger(value) || (card.tokenCard ? value < 0 : value <= 0),
    ) ||
    (!card.tokenCard &&
      card.effects.length === 0 &&
      !card.handPermanentEffects?.length &&
      !card.modeSkillChanges &&
      !card.modeAbilityChanges)
  ) {
    throw new Error('カードの設定が正しくありません。');
  }
  for (const effect of [
    ...card.effects,
    ...(card.drawEffects ?? []),
    ...(card.beforeUseEffects ?? []),
    ...(card.handInducers?.flatMap((inducer) => inducer.effects) ?? []),
    ...(card.modeParameterChanges?.off ?? []),
    ...(card.modeParameterChanges?.on ?? []),
    ...(card.modeSkillChanges?.off.effects ?? []),
    ...(card.modeSkillChanges?.on.effects ?? []),
    ...(card.modeSkillChanges?.off.special?.effects ?? []),
    ...(card.modeSkillChanges?.on.special?.effects ?? []),
    ...(card.modeAbilityChanges?.off.modeEffects ?? []),
    ...(card.modeAbilityChanges?.off.ability893Effects ?? []),
    ...(card.modeAbilityChanges?.off.ability894Effects ?? []),
    ...(card.modeAbilityChanges?.on.modeEffects ?? []),
    ...(card.modeAbilityChanges?.on.ability893Effects ?? []),
    ...(card.modeAbilityChanges?.on.ability894Effects ?? []),
    ...(card.handPermanentEffects ?? []),
    ...(card.collectionEffects?.effects ?? []),
  ])
    validateEffect(effect);
  if (card.special) {
    if (!Number.isSafeInteger(card.special.consumeAp) || card.special.consumeAp < 0)
      throw new Error('共鳴の消費量が正しくありません。');
    for (const effect of card.special.effects) validateEffect(effect);
  }
  if (card.modeSkillChanges) {
    if (
      !Number.isSafeInteger(card.modeSkillChanges.modeId) ||
      card.modeSkillChanges.modeId < 1 ||
      !Number.isSafeInteger(card.modeSkillChanges.off.consumeAp) ||
      !Number.isSafeInteger(card.modeSkillChanges.on.consumeAp) ||
      card.modeSkillChanges.off.consumeAp < 0 ||
      card.modeSkillChanges.on.consumeAp < 0 ||
      (card.modeSkillChanges.off.skillIcon !== null &&
        !Number.isSafeInteger(card.modeSkillChanges.off.skillIcon)) ||
      (card.modeSkillChanges.on.skillIcon !== null &&
        !Number.isSafeInteger(card.modeSkillChanges.on.skillIcon)) ||
      (card.modeSkillChanges.off.special !== null &&
        (!Number.isSafeInteger(card.modeSkillChanges.off.special.consumeAp) ||
          card.modeSkillChanges.off.special.consumeAp < 0)) ||
      (card.modeSkillChanges.on.special !== null &&
        (!Number.isSafeInteger(card.modeSkillChanges.on.special.consumeAp) ||
          card.modeSkillChanges.on.special.consumeAp < 0))
    )
      throw new Error('スキルモードの設定が正しくありません。');
    for (const variant of [card.modeSkillChanges.off, card.modeSkillChanges.on]) {
      for (const effect of variant.effects) validateEffect(effect);
      if (variant.special) for (const effect of variant.special.effects) validateEffect(effect);
    }
  }
  if (card.modeAbilityChanges) {
    if (!Number.isSafeInteger(card.modeAbilityChanges.modeId) || card.modeAbilityChanges.modeId < 1)
      throw new Error('能力モードの設定が正しくありません。');
    for (const variant of [card.modeAbilityChanges.off, card.modeAbilityChanges.on])
      for (const effect of [
        ...variant.modeEffects,
        ...variant.ability893Effects,
        ...variant.ability894Effects,
      ])
        validateEffect(effect);
  }
  if (card.modeParameterChanges) {
    if (
      !Number.isSafeInteger(card.modeParameterChanges.modeId) ||
      card.modeParameterChanges.modeId < 1
    )
      throw new Error('能力モードの設定が正しくありません。');
    for (const effect of [...card.modeParameterChanges.off, ...card.modeParameterChanges.on])
      validateEffect(effect);
  }
}
