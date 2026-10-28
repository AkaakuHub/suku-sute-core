import type { TokenCardEffect } from '../tokenRequestTypes.ts';
import { isInt64 } from '../../runtime/numeric.ts';

type Detail = Readonly<{
  id: bigint;
  detailType: string;
  value: bigint;
  paramValues?: readonly bigint[];
}>;

type Input = Readonly<{
  skillEffectId: bigint;
  details: readonly Detail[];
  skillType: number;
  skillLevel: number;
  specialAppealSkillLevel: number;
  skillSkillLevel: number;
}>;

export function createTokenCardEffect(input: Input): TokenCardEffect {
  if (!isInt64(input.skillEffectId)) throw new Error('スキル効果IDが正しくありません。');
  const countDetail = find(input.details, 'TOKEN_CARD_CARD_COUNT');
  const count = countDetail?.value ?? 1n;
  const resourceId = int32(find(input.details, 'TOKEN_CARD_RESOURCE_ID')?.value ?? 0n);
  const styleType = int32(find(input.details, 'TOKEN_CARD_STYLE_TYPE')?.value ?? 1n);
  const mood = int32(find(input.details, 'TOKEN_CARD_MOOD_TYPE')?.value ?? 1n);
  const skillSeriesId = int32(
    find(input.details, 'TOKEN_CARD_SKILL_CARD_SKILL_SERIES_ID')?.value ?? 0n,
  );
  const abilitySeriesId = int32(
    find(input.details, 'TOKEN_CARD_ABILITY_CARD_SKILL_SERIES_ID')?.value ?? 0n,
  );
  const sourceSkillType = input.skillType;
  const sourceSkillLevel = input.skillLevel;
  const sourceSpecialAppealSkillLevel = input.specialAppealSkillLevel;
  const sourceSkillSkillLevel = input.skillSkillLevel;
  const abilityLevelReference = int32(
    find(input.details, 'TOKEN_CARD_ABILITY_LEVEL_REFERENCE')?.value ?? 0n,
  );
  const skillLevel =
    sourceSkillType === 3 &&
    (abilityLevelReference === 1 || abilityLevelReference === 2) &&
    sourceSkillSkillLevel !== 0
      ? sourceSkillSkillLevel
      : sourceSkillLevel;
  const seriesDetail = input.details.find((detail) => detail.detailType === 'TOKEN_CARD_SERIES_ID');
  if (seriesDetail && (!isInt64(seriesDetail.id) || !isInt64(seriesDetail.value)))
    throw new Error('詳細値が正しくありません。');
  const seriesIds = seriesDetail?.paramValues?.map((value) => {
    if (!isInt64(value)) throw new Error('詳細値が正しくありません。');
    return value;
  });
  return {
    kind: 'token-card',
    resourceId,
    count,
    styleType,
    mood,
    skillSeriesId,
    skillLevel,
    abilitySeriesId,
    abilityLevel: 1,
    sourceSkillType,
    sourceSkillLevel,
    sourceSpecialAppealSkillLevel,
    sourceSkillSkillLevel,
    ...(countDetail
      ? { parameterDetails: { count: { id: countDetail.id, value: count, unitsPerValue: 1 } } }
      : {}),
    ...(seriesIds && seriesIds.length > 0 ? { seriesIds } : {}),
  };
}

function find(details: readonly Detail[], type: string): Detail | undefined {
  const detail = details.find((item) => item.detailType === type);
  if (detail && (!isInt64(detail.id) || !isInt64(detail.value)))
    throw new Error('詳細値が正しくありません。');
  return detail;
}

function int32(value: bigint): number {
  return Number(BigInt.asIntN(32, value));
}
