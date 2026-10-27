import type { Effect } from '../model.ts';
import { int64ToFloat32, isInt64 } from '../numeric.ts';

type Detail = Readonly<{ id: bigint; detailType: string; value: bigint }>;
type Input = Readonly<{
  skillEffectId: bigint;
  details: readonly Detail[];
  deckCardMax: number | null;
  invocationType?: number;
  deactivationKey?: string;
}>;

const detailTypes = {
  num: 'SKILL_COOL_TIME_NUM',
  deckUnderAdd: 'SKILL_COOL_TIME_DECK_UNDER_ADD',
  deckOverAdd: 'SKILL_COOL_TIME_DECK_OVER_ADD',
  deckUnderLimit: 'SKILL_COOL_TIME_DECK_UNDER_LIMIT',
  deckOverLimit: 'SKILL_COOL_TIME_DECK_OVER_LIMIT',
  displayTimeType: 'SKILL_COOL_TIME_DISPLAY_TIME_TYPE',
  displayTime: 'SKILL_COOL_TIME_DISPLAY_TIME',
} as const;

export function createSkillCooldownEffect(input: Input): Effect {
  if (!isInt64(input.skillEffectId)) throw new Error('スキル効果IDが正しくありません。');
  const displayTimeType = int32(detail(input.details, detailTypes.displayTimeType)?.value ?? 1n);
  const displayTime = detail(input.details, detailTypes.displayTime)?.value ?? 0n;
  const duration =
    displayTimeType === 1
      ? { kind: 'milliseconds' as const, value: int64ToFloat32(displayTime) }
      : displayTimeType === 2
        ? { kind: 'sections' as const, value: displayTime }
        : displayTimeType === 3
          ? { kind: 'stage' as const, value: 0 }
          : null;
  if (duration === null) throw new Error('スキルクールタイムの期限種別が正しくありません。');
  return {
    kind: 'skill-cooldown',
    num: floatDetail(input.details, detailTypes.num),
    deckUnderAdd: floatDetail(input.details, detailTypes.deckUnderAdd),
    deckOverAdd: floatDetail(input.details, detailTypes.deckOverAdd),
    deckUnderLimit: int32(detail(input.details, detailTypes.deckUnderLimit)?.value ?? 0n),
    deckOverLimit: int32(detail(input.details, detailTypes.deckOverLimit)?.value ?? 0n),
    deckCardMax: input.deckCardMax,
    duration,
    ...(input.invocationType !== undefined ? { invocationType: input.invocationType } : {}),
    ...(input.deactivationKey !== undefined ? { deactivationKey: input.deactivationKey } : {}),
  };
}

function floatDetail(details: readonly Detail[], type: string): number {
  return int64ToFloat32(detail(details, type)?.value ?? 0n);
}

function detail(details: readonly Detail[], type: string): Detail | undefined {
  const item = details.find((value) => value.detailType === type);
  if (item && (!isInt64(item.id) || !isInt64(item.value)))
    throw new Error('詳細値が正しくありません。');
  return item;
}

function int32(value: bigint): number {
  return Number(BigInt.asIntN(32, value));
}
