import type { LiveRegenGaugeApplication } from '../runtime/skills/regenGaugeSkill.ts';

export type GameRegenGaugeApplication = LiveRegenGaugeApplication &
  Readonly<{
    calculationType: number;
    sourceCardId: string | null;
    amountBasis: 'fixed' | 'maximum-gauge' | 'skill-fixed';
    deactivationKey: string | null;
  }>;

export type GaugeRegenerationEffect = Readonly<{
  kind: 'gauge-regeneration';
  gauge: LiveRegenGaugeApplication['gauge'];
  calculationType: number;
  amount: number;
  amountBasis: 'fixed' | 'maximum-gauge' | 'skill-fixed';
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
    !Number.isFinite(effect.amount) ||
    (effect.amountBasis !== 'fixed' &&
      effect.amountBasis !== 'maximum-gauge' &&
      effect.amountBasis !== 'skill-fixed') ||
    (effect.amountBasis === 'maximum-gauge' && effect.gauge !== 'mental') ||
    (effect.amountBasis === 'skill-fixed' && effect.gauge !== 'voltage') ||
    !Number.isSafeInteger(effect.intervalValue) ||
    !Number.isSafeInteger(effect.duration.value) ||
    (effect.duration.kind === 'sections' && effect.duration.value === 0) ||
    (effect.invocationType !== undefined && !Number.isSafeInteger(effect.invocationType)) ||
    (effect.deactivationKey !== undefined && typeof effect.deactivationKey !== 'string')
  )
    throw new Error('ゲージ継続回復の設定が正しくありません。');
}
