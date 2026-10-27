import { durationSeconds } from '../projection.ts';
import { rules } from '../model.ts';
import type { Card, GameState } from '../model.ts';
import { applyAction52SkillBoostForCard } from './action52SkillBoost.ts';
import { applyLoveUpAdditionalBuffs } from './loveUpAdditionalBuff.ts';
import { absorbSkillEffect } from './proxySkill.ts';

export function applyScoreBoost(
  state: GameState,
  amount: number,
  card: Card | undefined,
  deactivationKey?: string,
): GameState {
  const loveUp = applyLoveUpAdditionalBuffs(state, card, amount);
  const action52 = applyAction52SkillBoostForCard(loveUp.state, card, Math.trunc(loveUp.value));
  const proxy = absorbSkillEffect(
    action52.state,
    2,
    Number.isFinite(action52.value)
      ? BigInt.asIntN(64, BigInt(Math.trunc(action52.value)))
      : -(1n << 63n),
  );
  if (proxy.absorbed) return proxy.state;
  return {
    ...proxy.state,
    boosts: [
      ...action52.state.boosts,
      {
        percent: Math.trunc(action52.value),
        untilTick: Math.round(durationSeconds(state) * rules.ticksPerSecond),
        deactivationKey: deactivationKey ?? null,
      },
    ],
  };
}
