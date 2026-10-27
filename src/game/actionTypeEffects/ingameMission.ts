import type { Effect } from '../model.ts';
import { isInt64 } from '../numeric.ts';

type Input = Readonly<{
  skillEffectId: bigint;
  details: readonly Readonly<{ id: bigint; detailType: string; value: bigint }>[];
}>;

export function createIngameMissionEffect(input: Input): Effect {
  if (!isInt64(input.skillEffectId)) throw new Error('スキル効果IDが正しくありません。');
  const detail = input.details.find((item) => item.detailType === 'INGAME_MISSION_SKILL_GROUP_ID');
  if (detail && (!isInt64(detail.id) || !isInt64(detail.value)))
    throw new Error('詳細値が正しくありません。');
  return { kind: 'ingame-mission', groupId: detail?.value ?? 0n };
}
