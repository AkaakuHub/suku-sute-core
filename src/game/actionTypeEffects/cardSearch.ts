import type { Effect, SearchTarget } from '../modelTypes.ts';
import type { MemberId, UnitId } from '../model.ts';
import { isInt64 } from '../numeric.ts';

type Input = Readonly<{
  skillEffectId: bigint;
  details: readonly Readonly<{ id: bigint; detailType: string; value: bigint }>[];
  deactivationKey?: string;
}>;

export function createCardSearchEffect(input: Input): Effect {
  if (!isInt64(input.skillEffectId)) throw new Error('スキル効果IDが正しくありません。');
  const type = int32(detail(input, 'CARD_SEARCH_TYPE')?.value ?? 1n);
  const id = int32(detail(input, 'CARD_SEARCH_ID')?.value ?? 0n);
  let target: SearchTarget;
  switch (type) {
    case 1:
      target = { kind: 'skill-icon', icon: id };
      break;
    case 2:
      target = { kind: 'member', member: memberId(id) };
      break;
    case 3:
      target = { kind: 'unit', unit: unitId(id) };
      break;
    case 4:
      target = { kind: 'token-series', seriesId: id };
      break;
    default:
      throw new Error('カード検索種別が正しくありません。');
  }
  return {
    kind: 'search',
    scope: 'skill',
    target,
    count: 1,
    ...(input.deactivationKey !== undefined ? { deactivationKey: input.deactivationKey } : {}),
    skillEffectId: input.skillEffectId,
  };
}

function detail(input: Input, type: string): Input['details'][number] | undefined {
  const item = input.details.find((value) => value.detailType === type);
  if (item && (!isInt64(item.id) || !isInt64(item.value)))
    throw new Error('詳細値が正しくありません。');
  return item;
}

function memberId(value: number): MemberId {
  if ([0, 1021, 1022, 1030, 1031, 1032, 1033, 1041, 1042, 1053].includes(value))
    return value as MemberId;
  throw new Error('カード検索のメンバーIDが正しくありません。');
}

function unitId(value: number): UnitId {
  if (value === 1 || value === 2 || value === 3) return value;
  throw new Error('カード検索のUnitIdが正しくありません。');
}

function int32(value: bigint): number {
  return Number(BigInt.asIntN(32, value));
}
