import type { LiveProxyAbsorbInfo } from '../runtime/skills/proxyAbsorption.ts';
import type { Effect } from './modelTypes.ts';

type ProxySkillStateBase = LiveProxyAbsorbInfo<string> &
  Readonly<{
    id: number;
    induceTiming: 1 | 2 | 3;
    induceCondition: 1 | 2;
    inducePowerType: 1 | 2 | 3;
    inducePowerParam: bigint;
    inducedEffects: readonly Readonly<{ actionType: number; effect: Effect }>[];
  }>;

export type ProxySkillState =
  | (ProxySkillStateBase & Readonly<{ periodType: 1; remainingPeriod: number }>)
  | (ProxySkillStateBase & Readonly<{ periodType: 2 | 3 | 4 | 5; remainingPeriod: bigint }>);

export type ProxySkillEffect = Readonly<{
  kind: 'proxy-skill';
  absorbLimit: number;
  periodType: 1 | 2 | 3 | 4 | 5;
  periodParam: bigint;
  induceTiming: 1 | 2 | 3;
  induceCondition: 1 | 2;
  inducePowerType: 1 | 2 | 3;
  inducePowerParam: bigint;
  targets: readonly Readonly<{ actionType: number; targetAmount: number }>[];
  effects: readonly Readonly<{ actionType: number; effect: Effect }>[];
}>;

export type ProxyForcedActivationEffect = Readonly<{
  kind: 'proxy-skill-forced-activation';
  targetType: bigint;
}>;

export function validateProxyForcedActivationEffect(effect: ProxyForcedActivationEffect): void {
  if (effect.targetType < -(1n << 63n) || effect.targetType >= 1n << 63n)
    throw new Error('Proxyスキル強制発動の設定が正しくありません。');
}
