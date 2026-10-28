import { type Card, type GameState, type TokenId, rules } from '../model.ts';
import type { TokenRequest, TokenTemplateReference } from '../tokenRequestTypes.ts';
import { boostTokenRequests } from './tokenBoost.ts';
import { initializeParameterValueFactors } from '../parameters/parameterValueChange.ts';
import { int64ToFloat32 } from '../../runtime/numeric.ts';
import { registerMissionAction } from '../ingameMissions.ts';
import { validateCard } from '../deck.ts';
import type { TokenCardEffect } from '../tokenRequestTypes.ts';
import type { ModeAbilityVariant, ModeSkillVariant } from './cardTypes.ts';

export function addTokens(state: GameState, kind: TokenId, count: number): GameState {
  return addTokenCards(state, { kind: 'token-id', token: kind }, count, true);
}

export function beginTokenGeneration(state: GameState, sourceId: string): GameState {
  return { ...state, tokenGroups: [...state.tokenGroups, { sourceId, requests: [] }] };
}

export function requestTokens(
  state: GameState,
  token: TokenId,
  count: number,
  sourceId: string | null,
  seriesIds?: readonly number[],
): GameState {
  if (count < 1) return state;
  const request: TokenRequest = {
    template: { kind: 'token-id', token },
    count,
    ...(seriesIds === undefined ? {} : { seriesIds: seriesIds.map(BigInt) }),
  };
  return requestToken(state, request, sourceId);
}

export function applyTokenCardEffect(
  state: GameState,
  effect: TokenCardEffect,
  sourceId: string | null,
): GameState {
  const grouped = state.tokenGroups.some((group) => group.sourceId === sourceId);
  const count = grouped ? Number(BigInt.asIntN(32, effect.count)) : int64ToFloat32(effect.count);
  if (!Number.isFinite(count) || count < 1) return state;
  return requestToken(
    state,
    {
      template: { kind: 'action-token-card', effect },
      count,
      ...(effect.seriesIds === undefined ? {} : { seriesIds: effect.seriesIds }),
    },
    sourceId,
  );
}

export function finishTokenGeneration(
  state: GameState,
  sourceId: string,
): Readonly<{ state: GameState; actionType28Count: number }> {
  const group = state.tokenGroups.at(-1);
  if (!group || group.sourceId !== sourceId)
    throw new Error('追加カードの生成順序が正しくありません。');
  const boosted = boostTokenRequests(state, group.requests, sourceId, true);
  let next: GameState = { ...boosted.state, tokenGroups: state.tokenGroups.slice(0, -1) };
  let actionType28Count = 0;
  const pending = group.requests.map((request, index) => ({
    template: request.template,
    isActionType28: request.template.kind === 'action-token-card',
    count: boosted.counts[index] ?? 0,
  }));
  while (next.deck.length < rules.maxDeckSize) {
    let added = false;
    for (const request of pending) {
      if (request.count < 1 || next.deck.length >= rules.maxDeckSize) continue;
      next = addTokenCards(next, request.template, 1, false);
      request.count--;
      if (request.isActionType28) actionType28Count++;
      if (next.deck.length < rules.maxDeckSize) added = true;
    }
    if (!added) break;
  }
  if (actionType28Count > 0) next = registerMissionAction(next, 28, actionType28Count);
  return { state: next, actionType28Count };
}

function requestToken(state: GameState, request: TokenRequest, sourceId: string | null): GameState {
  if (request.count < 1) return state;
  const index = state.tokenGroups.findLastIndex((group) => group.sourceId === sourceId);
  if (index >= 0) {
    if (state.deck.length >= rules.maxDeckSize) return state;
    return {
      ...state,
      tokenGroups: state.tokenGroups.map((group, position) =>
        position === index ? { ...group, requests: [...group.requests, request] } : group,
      ),
    };
  }
  const boosted = boostTokenRequests(state, [request], sourceId, false);
  return addTokenCards(boosted.state, request.template, boosted.counts[0] ?? 0, true);
}

function addTokenCards(
  state: GameState,
  templateReference: TokenTemplateReference,
  count: number,
  throwIfMissing: boolean,
): GameState {
  const template =
    templateReference.kind === 'token-id'
      ? state.tokenCatalog.find((card) => card.token === templateReference.token)
      : null;
  if (!template && templateReference.kind !== 'action-token-card') {
    if (throwIfMissing) throw new Error('追加カードの定義がありません。');
    return state;
  }
  const addable = Math.max(0, rules.maxDeckSize - state.deck.length);
  const generated: Card[] = Array.from(
    { length: Math.min(Math.max(0, Math.trunc(count)), addable) },
    (_, index) => {
      const generatedId = state.nextTokenId + index;
      if (templateReference.kind === 'action-token-card')
        return createActionTokenCard(
          templateReference.effect,
          tokenCardId(templateReference.effect.resourceId, generatedId),
          templateReference.effect.seriesIds,
        );
      if (!template) throw new Error('追加カードの定義がありません。');
      return { ...template, id: `${template.id}-${generatedId}` };
    },
  );
  for (const card of generated) validateCard(card);
  const split = state.tokenDeckSplit;
  const splitMatches = (card: (typeof generated)[number]) =>
    split?.seriesIds !== null &&
    split?.seriesIds !== undefined &&
    (card.tokenSeriesIds ?? []).some((id) => split.seriesIds?.includes(id));
  const activeMatches = generated.filter(splitMatches);
  const activeOther = generated.filter((card) => !splitMatches(card));
  const activeIds = [...activeMatches, ...activeOther]
    .filter((card) => !split || split.active === (splitMatches(card) ? 'sub' : 'main'))
    .map((card) => card.id);
  const inactiveIds = generated
    .filter((card) => split && split.active !== (splitMatches(card) ? 'sub' : 'main'))
    .map((card) => card.id);
  const tokenDeckSplit = split
    ? {
        ...split,
        [split.active]: {
          ...split[split.active],
          drawPile: [...split[split.active].drawPile, ...activeIds],
        },
        [split.active === 'main' ? 'sub' : 'main']: {
          ...split[split.active === 'main' ? 'sub' : 'main'],
          drawPile: [...split[split.active === 'main' ? 'sub' : 'main'].drawPile, ...inactiveIds],
        },
      }
    : null;
  return initializeParameterValueFactors(
    {
      ...state,
      deck: [...state.deck, ...generated],
      cardPool: [...state.cardPool, ...generated],
      cardSkillUseStates: {
        ...state.cardSkillUseStates,
        ...Object.fromEntries(
          generated.map((card) => [card.id, { skillUseAtBoardState: 3 as const }]),
        ),
      },
      drawPile: [...state.drawPile, ...activeIds],
      tokenDeckSplit,
      nextTokenId: state.nextTokenId + generated.length,
    },
    generated,
  );
}

function createActionTokenCard(
  effect: TokenCardEffect,
  id: string,
  seriesIds?: readonly bigint[],
): Card {
  if (!effect.skill) throw new Error('追加カードのSkill系列Masterがありません。');
  const skill = skillVariant(effect.skill.variant);
  const ability =
    effect.ability === null || effect.ability === undefined
      ? null
      : abilityVariant(effect.ability.variant);
  return {
    id,
    name: '',
    costume: null,
    performer: null,
    charactersId: 0,
    unitIds: [],
    mainEffect: effect.skill.mainEffect,
    cost: skill.cost,
    style: effect.style,
    mood: effect.mood,
    appeal: { smile: 0, pure: 0, cool: 0 },
    beatPoint: 0,
    tokenCardAbilitySeriesId: ability === null ? null : BigInt(effect.ability?.seriesId ?? 0),
    ...(seriesIds === undefined ? {} : { tokenSeriesIds: seriesIds.map(int32) }),
    effects: skill.effects,
    ...(skill.special === null ? {} : { special: skill.special }),
    ...(ability === null
      ? {}
      : {
          ability893Effects: ability.ability893Effects,
          ability894Effects: ability.ability894Effects,
        }),
    tokenCard: true as const,
    skillIcon: effect.skill.skillIcon,
  };
}

function tokenCardId(resourceId: number, sequence: number): string {
  if (!Number.isSafeInteger(resourceId))
    throw new Error('TokenCard ResourceIDが正しくありません。');
  const sign = resourceId < 0 ? 'negative' : 'positive';
  return `token-card-${sign}-${Math.abs(resourceId)}-${sequence}`;
}

function skillVariant(variant: ModeSkillVariant | ModeAbilityVariant): ModeSkillVariant {
  if (!('cost' in variant)) throw new Error('追加カードのSkill variantが正しくありません。');
  return variant;
}

function abilityVariant(variant: ModeSkillVariant | ModeAbilityVariant): ModeAbilityVariant {
  if (!('modeEffects' in variant))
    throw new Error('追加カードのAbility variantが正しくありません。');
  return variant;
}

function int32(value: bigint): number {
  return Number(BigInt.asIntN(32, value));
}
