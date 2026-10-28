import type {
  LiveProxySkillState,
  LiveProxySkillPeriodType,
} from '../runtime/skills/proxyLifecycle.ts';
import type { Effect } from './modelTypes.ts';

export type ProxySkillState = LiveProxySkillState<
  string,
  Readonly<{ actionType: number; effect: Effect }>
> &
  Readonly<{ id: number }>;

export type ProxySkillEffect = Readonly<{
  kind: 'proxy-skill';
  absorbLimit: number;
  periodType: LiveProxySkillPeriodType;
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
