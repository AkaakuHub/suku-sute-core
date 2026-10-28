import type { InduceSkillCondition, InduceSkillEffectInput } from '../induceSkillEffectTypes.ts';
import { isInt64 } from '../../runtime/numeric.ts';
import type { Effect } from '../model.ts';

type Detail = Readonly<{ id: bigint; detailType: string; value: bigint }>;
type Input = Readonly<{
  skillEffectId: bigint;
  details: readonly Detail[];
  deckCardMax: number;
  effects: InduceSkillEffectInput['effects'];
  invocationType?: number;
  deactivationKey?: string;
}>;

const detailTypes = {
  condition: 'INDUCE_SKILL_EFFECT_CONDITION_TYPE',
  num: 'INDUCE_SKILL_EFFECT_NUM',
  deckUnderAdd: 'INDUCE_SKILL_EFFECT_DECK_UNDER_ADD',
  deckOverAdd: 'INDUCE_SKILL_EFFECT_DECK_OVER_ADD',
  deckUnderLimit: 'INDUCE_SKILL_EFFECT_DECK_UNDER_LIMIT',
  deckOverLimit: 'INDUCE_SKILL_EFFECT_DECK_OVER_LIMIT',
  displayTimeType: 'INDUCE_SKILL_EFFECT_DISPLAY_TIME_TYPE',
  displayTime: 'INDUCE_SKILL_EFFECT_DISPLAY_TIME',
} as const;

export function createInduceSkillEffect(input: Input): Effect {
  if (!isInt64(input.skillEffectId)) throw new Error('スキル効果IDが正しくありません。');
  const condition = conditionFor(int32(detail(input.details, detailTypes.condition)?.value ?? 1n));
  const displayTimeType = int32(detail(input.details, detailTypes.displayTimeType)?.value ?? 1n);
  const displayTime = detail(input.details, detailTypes.displayTime)?.value ?? 0n;
  const duration =
    displayTimeType === 1
      ? { kind: 'milliseconds' as const, value: displayTime }
      : displayTimeType === 2
        ? { kind: 'sections' as const, value: displayTime }
        : displayTimeType === 3
          ? { kind: 'stage' as const }
          : null;
  if (duration === null) throw new Error('誘発スキル効果の期限種別が正しくありません。');
  return {
    kind: 'induce-skill-effect',
    condition,
    num: detail(input.details, detailTypes.num)?.value ?? 0n,
    deckUnderAdd: detail(input.details, detailTypes.deckUnderAdd)?.value ?? 0n,
    deckOverAdd: detail(input.details, detailTypes.deckOverAdd)?.value ?? 0n,
    deckUnderLimit: detail(input.details, detailTypes.deckUnderLimit)?.value ?? 0n,
    deckOverLimit: detail(input.details, detailTypes.deckOverLimit)?.value ?? 0n,
    deckCardMax: input.deckCardMax,
    effects: input.effects,
    duration,
    ...(input.invocationType !== undefined ? { invocationType: input.invocationType } : {}),
    ...(input.deactivationKey !== undefined ? { deactivationKey: input.deactivationKey } : {}),
  };
}

function conditionFor(value: number): InduceSkillCondition {
  if (value === 1) return 'voltage';
  if (value === 2) return 'mental-recover';
  if (value === 3) return 'mental-barrier';
  throw new Error('誘発スキル効果の条件種別が正しくありません。');
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
