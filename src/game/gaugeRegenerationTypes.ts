import type { LiveRegenGaugeApplication } from '../runtime/skills/regenGaugeSkill.ts';

export type GameRegenGaugeApplication = LiveRegenGaugeApplication &
  Readonly<{
    sourceCardId: string | null;
    deactivationKey: string | null;
  }>;

export type GaugeRegenerationEffect = Pick<
  LiveRegenGaugeApplication,
  'gauge' | 'calculationType' | 'value'
> &
  Readonly<{
    kind: 'gauge-regeneration';
    moodBonus?: Readonly<{ target: 1 | 2 | 3; perPoint: number }>;
    intervalType: 1 | 2;
    intervalValue: number;
    duration: Readonly<{ kind: 'milliseconds' | 'sections'; value: number }>;
    invocationType?: number;
    deactivationKey?: string;
  }>;

export function validateGaugeRegenerationEffect(effect: GaugeRegenerationEffect): void {
  if (
    !Number.isSafeInteger(effect.calculationType) ||
    !Number.isFinite(effect.value) ||
    !Number.isSafeInteger(effect.intervalValue) ||
    !Number.isSafeInteger(effect.duration.value) ||
    (effect.duration.kind === 'sections' && effect.duration.value === 0) ||
    (effect.invocationType !== undefined && !Number.isSafeInteger(effect.invocationType)) ||
    (effect.deactivationKey !== undefined && typeof effect.deactivationKey !== 'string')
  )
    throw new Error('ゲージ継続回復の設定が正しくありません。');
}
