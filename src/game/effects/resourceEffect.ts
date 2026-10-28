import type { Card, GameState } from '../model.ts';
import { floatToInt32 } from '../../runtime/numeric.ts';
import { changeResource } from '../resources.ts';
import { applyAction52SkillBoostForCard } from './action52SkillBoost.ts';
import { applyAdditionalBuff } from './additionalBuff.ts';
import type { EffectApplier } from './induceSkillEffect.ts';

export function applyResourceEffect(
  state: GameState,
  resource: 'mental' | 'voltage',
  card: Card | undefined,
  value: number,
  effectPower: number,
  apply: EffectApplier,
): GameState {
  const base = Math.fround(Math.trunc(value) * effectPower);
  const boosted = applyAdditionalBuff(state, resource, base, card);
  const action52 = applyAction52SkillBoostForCard(boosted.state, card, Math.trunc(boosted.value));
  return changeResource(
    action52.state,
    resource,
    BigInt(floatToInt32(action52.value)),
    'skill',
    card,
    apply,
    resource === 'voltage',
  );
}
