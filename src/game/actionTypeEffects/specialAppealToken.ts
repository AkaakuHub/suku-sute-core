import type {
  AddSpecialAppealTokenEffect,
  SpecialAppealTokenCardSet,
} from '../specialAppealTokenTypes.ts';
import type { MemberId } from '../model.ts';
import { isInt64 } from '../../runtime/numeric.ts';

type Input = Readonly<{
  skillEffectId: bigint;
  details: readonly Readonly<{ id: bigint; detailType: string; value: bigint }>[];
  musicGenerationsId: number;
  sourceSkillLevel: number;
  sourceSpecialAppealSkillLevel: number;
  memberOrder: readonly MemberId[];
  tokenCardSets: readonly SpecialAppealTokenCardSet[];
}>;

export function createSpecialAppealTokenEffect(input: Input): AddSpecialAppealTokenEffect {
  if (!isInt64(input.skillEffectId)) throw new Error('スキル効果IDが正しくありません。');
  const tokenSetId = int32(value(input, 'SPECIAL_APPEAL_TOKEN_SET_ID', 0n));
  const coolTime = int32(value(input, 'SPECIAL_APPEAL_TOKEN_COOLTIME', 0n));
  const targetType = int32(value(input, 'SPECIAL_APPEAL_TOKEN_TARGET_TYPE', 1n));
  const levelType = int32(value(input, 'SPECIAL_APPEAL_TOKEN_LEVEL_TYPE', 0n));
  return {
    kind: 'special-appeal-token',
    tokenSetId,
    coolTime,
    targetType,
    levelType,
    musicGenerationsId: input.musicGenerationsId,
    sourceSkillLevel: input.sourceSkillLevel,
    sourceSpecialAppealSkillLevel: input.sourceSpecialAppealSkillLevel,
    memberOrder: input.memberOrder,
    tokenCardSets: input.tokenCardSets.filter((item) => item.tokenSetId === tokenSetId),
  };
}

function value(input: Input, type: string, fallback: bigint): bigint {
  const detail = input.details.find((item) => item.detailType === type);
  if (detail && (!isInt64(detail.id) || !isInt64(detail.value)))
    throw new Error('詳細値が正しくありません。');
  return detail?.value ?? fallback;
}

function int32(value: bigint): number {
  return Number(BigInt.asIntN(32, value));
}
