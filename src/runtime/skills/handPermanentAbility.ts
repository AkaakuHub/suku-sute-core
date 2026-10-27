import { liveAdditionalHeartEmbeddedSkillEffectIds } from './additionalHeartInduce.ts';
import { liveBranchEmbeddedSkillEffectIds } from './branchSkill.ts';
import { liveComboInduceEmbeddedSkillEffectIds } from './comboInduceSkill.ts';
import { liveDrawSuccessEmbeddedSkillEffectIds } from './drawSuccessInduce.ts';
import { liveEffectInduceEmbeddedSkillEffectIds } from './effectInduceAbility.ts';
import { liveInduceSkillEmbeddedEffectIds } from './induceSkillEffect.ts';
import { liveModeChangeInduceEmbeddedSkillEffectIds } from './modeRuntime.ts';
import type { LiveSkillEffect } from './skillTypes.ts';

export type LiveHandPermanentEntry = Readonly<{
  cardInstanceId: number;
  parentEffectId: string;
  effect: LiveSkillEffect;
  activeEffectId: string | null;
}>;

export type LiveHandPermanentState = readonly LiveHandPermanentEntry[];

export type LiveHandPermanentTransition = Readonly<{
  state: LiveHandPermanentState;
  activated: readonly LiveHandPermanentEntry[];
  deactivated: readonly LiveHandPermanentEntry[];
}>;

export function advanceLiveHandPermanentState(
  state: LiveHandPermanentState,
  abilities: readonly Readonly<{
    cardInstanceId: number;
    effects: readonly LiveSkillEffect[];
  }>[],
  handCardInstanceIds: readonly number[],
): LiveHandPermanentTransition {
  if (new Set(handCardInstanceIds).size !== handCardInstanceIds.length) {
    throw new Error('Live HandPermanent hand cards are duplicated');
  }
  const hand = new Set(handCardInstanceIds);
  const expected = abilities.flatMap((ability) =>
    hand.has(ability.cardInstanceId)
      ? resolveLiveHandPermanentEntries(ability.cardInstanceId, ability.effects)
      : [],
  );
  const expectedKeys = new Set(expected.map(entryKey));
  if (expectedKeys.size !== expected.length) {
    throw new Error('Live HandPermanent effects are duplicated');
  }
  const currentKeys = new Set(state.map(entryKey));
  if (currentKeys.size !== state.length) {
    throw new Error('Live HandPermanent state is duplicated');
  }
  const currentByKey = new Map(state.map((entry) => [entryKey(entry), entry]));
  return {
    state: expected.map((entry) => ({
      ...entry,
      activeEffectId: currentByKey.get(entryKey(entry))?.activeEffectId ?? null,
    })),
    activated: expected.filter((entry) => !currentKeys.has(entryKey(entry))),
    deactivated: state.filter((entry) => !expectedKeys.has(entryKey(entry))),
  };
}

export function liveEmbeddedSkillEffectIds(
  effects: readonly LiveSkillEffect[],
): ReadonlySet<string> {
  const embedded = new Set(liveBranchEmbeddedSkillEffectIds(effects));
  for (const effectId of liveAdditionalHeartEmbeddedSkillEffectIds(effects)) {
    embedded.add(effectId);
  }
  for (const effectId of liveComboInduceEmbeddedSkillEffectIds(effects)) {
    embedded.add(effectId);
  }
  for (const effectId of liveModeChangeInduceEmbeddedSkillEffectIds(effects)) {
    embedded.add(effectId);
  }
  for (const effectId of liveDrawSuccessEmbeddedSkillEffectIds(effects)) {
    embedded.add(effectId);
  }
  for (const effectId of liveEffectInduceEmbeddedSkillEffectIds(effects)) {
    embedded.add(effectId);
  }
  for (const effectId of liveInduceSkillEmbeddedEffectIds(effects)) {
    embedded.add(effectId);
  }
  for (const effectId of effects
    .filter((effect) => effect.actionType === 904)
    .map((effect) => requireHandPermanentEffect(effect, effects).id)) {
    embedded.add(effectId);
  }
  return embedded;
}

function resolveLiveHandPermanentEntries(
  cardInstanceId: number,
  effects: readonly LiveSkillEffect[],
): readonly LiveHandPermanentEntry[] {
  return [
    ...effects
      .filter((effect) => effect.actionType === 904)
      .map((permanent) => ({
        cardInstanceId,
        parentEffectId: permanent.id,
        effect: requireHandPermanentEffect(permanent, effects),
        activeEffectId: null,
      })),
    ...effects
      .filter((effect) => effect.actionType === 901)
      .map((effect) => ({
        cardInstanceId,
        parentEffectId: effect.id,
        effect,
        activeEffectId: null,
      })),
  ];
}

function requireHandPermanentEffect(
  permanent: LiveSkillEffect,
  effects: readonly LiveSkillEffect[],
): LiveSkillEffect {
  const detail = permanent.details[0];
  if (
    permanent.details.length !== 1 ||
    detail === undefined ||
    detail.detailType !== 'HAND_PERMANENT_EFFECT_ID1' ||
    detail.targetMood !== 0 ||
    !Number.isSafeInteger(detail.effectValue) ||
    detail.effectValue <= 0 ||
    detail.params.length !== 0
  ) {
    throw new Error('Live HandPermanent skill effect details differ');
  }
  const effectId = String(detail.effectValue);
  const matches = effects.filter((effect) => effect.id === effectId);
  const embedded = matches[0];
  if (matches.length !== 1 || embedded === undefined) {
    throw new Error(`Live HandPermanent embedded effect must resolve once:${effectId}`);
  }
  return embedded;
}

function entryKey(entry: LiveHandPermanentEntry): string {
  return `${String(entry.cardInstanceId)}:${entry.parentEffectId}:${entry.effect.id}`;
}
