import type { Card, GameState } from '../model.ts';
import type {
  AddSpecialAppealTokenEffect,
  SpecialAppealToken,
} from '../specialAppealTokenTypes.ts';

export function activateSpecialAppealToken(
  state: GameState,
  effect: AddSpecialAppealTokenEffect,
): GameState {
  const tokenCardSets = effect.tokenCardSets
    .filter(
      (tokenCardSet) =>
        tokenCardSet.tokenSetId === effect.tokenSetId &&
        effect.memberOrder.includes(tokenCardSet.targetParameter),
    )
    .sort(
      (left, right) =>
        effect.memberOrder.indexOf(left.targetParameter) -
        effect.memberOrder.indexOf(right.targetParameter),
    );
  const additions: SpecialAppealToken[] = [];

  for (const tokenCardSet of tokenCardSets) {
    if (
      state.specialAppealTokens.some((token) => token.recordId === tokenCardSet.id) ||
      additions.some((token) => token.recordId === tokenCardSet.id)
    )
      continue;

    const skillLevel =
      effect.levelType === 2
        ? effect.sourceSkillLevel
        : effect.levelType === 1
          ? effect.sourceSpecialAppealSkillLevel
          : 1;
    const cardForLevel = tokenCardSet.cardsBySkillLevel.find(
      (candidate) => candidate.skillLevel === skillLevel,
    );
    if (!cardForLevel)
      throw new Error(`特別アピールトークンのスキルレベル${skillLevel}がありません。`);

    let remainingCoolTime = 0;
    for (const token of state.specialAppealTokens) {
      if (
        token.targetMember === effect.musicGenerationsId &&
        remainingCoolTime <= token.remainingCoolTime
      )
        remainingCoolTime = token.remainingCoolTime;
    }

    const card: Card = {
      ...cardForLevel.card,
      cardInstanceId: String(tokenCardSet.resourceId),
      cardDatasId: String(tokenCardSet.resourceId),
    };
    additions.push({
      recordId: tokenCardSet.id,
      tokenSetId: tokenCardSet.tokenSetId,
      targetMember: tokenCardSet.targetParameter,
      card,
      coolTime: Math.fround(effect.coolTime),
      remainingCoolTime,
    });
  }

  return {
    ...state,
    specialAppealTokens: [...state.specialAppealTokens, ...additions],
  };
}

export function advanceSpecialAppealTokenCooldowns(
  state: GameState,
  elapsedSeconds: number,
): GameState {
  return {
    ...state,
    specialAppealTokens: state.specialAppealTokens.map((token) => ({
      ...token,
      remainingCoolTime: Math.fround(
        Math.max(Math.fround(token.remainingCoolTime - Math.fround(elapsedSeconds)), 0),
      ),
    })),
  };
}

export function startSpecialAppealTokenCooldown(
  state: GameState,
  token: SpecialAppealToken,
): GameState {
  const timeRatio = Math.fround(Math.fround(state.track.songTime) / 10_000);
  return {
    ...state,
    specialAppealTokens: state.specialAppealTokens.map((current) =>
      current.tokenSetId === token.tokenSetId
        ? {
            ...current,
            remainingCoolTime: Math.max(
              current.remainingCoolTime,
              Math.fround(Math.fround(current.coolTime) * timeRatio),
            ),
          }
        : current,
    ),
  };
}
