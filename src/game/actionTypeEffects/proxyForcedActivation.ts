import type { ProxyForcedActivationEffect } from '../proxySkillTypes.ts';
import { isInt64 } from '../../runtime/numeric.ts';

type Input = Readonly<{
  skillEffectId: bigint;
  details: readonly Readonly<{ id: bigint; detailType: string; value: bigint }>[];
}>;

export function createProxyForcedActivationEffect(input: Input): ProxyForcedActivationEffect {
  if (!isInt64(input.skillEffectId)) throw new Error('スキル効果IDが正しくありません。');
  const detail = input.details.find((item) => item.detailType === 'TARGET_PROXY_SKILL_TYPE');
  if (detail && (!isInt64(detail.id) || !isInt64(detail.value)))
    throw new Error('詳細値が正しくありません。');
  return { kind: 'proxy-skill-forced-activation', targetType: detail?.value ?? 0n };
}
