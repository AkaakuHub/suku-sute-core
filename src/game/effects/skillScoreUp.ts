import { rules } from '../model.ts';
import { durationSeconds } from '../projection.ts';
import { moodValue } from '../projection.ts';
import type { Card, GameState } from '../model.ts';
import type { SkillScoreUpEffect } from '../skillScoreUpTypes.ts';
import { applyLoveUpAdditionalBuffs } from './loveUpAdditionalBuff.ts';
import { applyAction52SkillBoostForCard } from './action52SkillBoost.ts';
import { absorbSkillEffect } from './proxySkill.ts';
import { calculateLiveSkillMoodCorrection } from '../../runtime/live/skillMood.ts';

export function activateSkillScoreUp(
  state: GameState,
  effect: SkillScoreUpEffect,
  card: Card | undefined,
  multiplier: number,
  addValue: number,
  effectPower: number,
): GameState {
  if (effect.calculation !== 1) return state;
  if (!card) throw new Error('STAR上昇スキルの発動元カードがありません。');
  const moodCorrection = effect.moodBonus
    ? calculateLiveSkillMoodCorrection(
        effect.moodBonus.target,
        moodValue(state),
        effect.moodBonus.perPoint,
      )
    : 0;
  const amount = Math.fround(effect.amount);
  const base = Math.fround(
    Math.fround(
      Math.fround(moodCorrection + Math.fround(Math.fround(amount) / Math.fround(10_000))) +
        Math.fround(addValue),
    ) * Math.fround(multiplier),
  );
  const scaled = Math.fround(int32(base) * Math.fround(effectPower));
  const loveUp = applyLoveUpAdditionalBuffs(state, card, scaled);
  let value = int32(loveUp.value);
  let next = loveUp.state;
  if (value > 0) {
    const boosted = applyAction52SkillBoostForCard(next, card, value);
    next = boosted.state;
    value = int32(boosted.value);
  }
  if (value >= 0) {
    const proxy = absorbSkillEffect(next, 2, BigInt.asIntN(64, BigInt(value)));
    if (proxy.absorbed) return proxy.state;
    next = proxy.state;
  }
  const suppressDuration = effect.invocationType === 0x388 || effect.invocationType === 0x38b;
  const hasEffectAmount = value !== 0;
  return {
    ...next,
    skillScoreUps: [
      ...next.skillScoreUps,
      {
        percent: value,
        untilTick: Math.round(durationSeconds(state) * rules.ticksPerSecond),
        remainingSeconds:
          !hasEffectAmount || suppressDuration || effect.duration.kind !== 'milliseconds'
            ? null
            : Math.fround(effect.duration.value / 1000),
        remainingSections:
          !hasEffectAmount || suppressDuration || effect.duration.kind !== 'sections'
            ? null
            : effect.duration.value,
        removeOnHeartCollect:
          hasEffectAmount && effect.disabledType > 0 && effect.disabledType <= 2,
        deactivationKey: hasEffectAmount ? (effect.deactivationKey ?? null) : null,
      },
    ],
  };
}

function int32(value: number): number {
  return Number(BigInt.asIntN(32, BigInt(Math.trunc(value))));
}
