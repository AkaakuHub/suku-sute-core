import { matchingMentalRecoverAdditionalBuffs } from './mentalRecoverAdditionalBuff.ts';
import { matchingVoltageUpAdditionalBuffs } from './voltageUpAdditionalBuff.ts';
import { consumeHeartBoosts } from '../live/heartBoosts.ts';
import type { Card, GameState, ResourceBoost } from '../model.ts';

export function applyAdditionalBuff(
  state: GameState,
  target: ResourceBoost['target'],
  value: number,
  card?: Card,
): Readonly<{ state: GameState; value: number }> {
  if (!(value > 0)) return { state, value };
  const matches = (boost: ResourceBoost) =>
    boost.target === target &&
    (!boost.members || (card !== undefined && boost.members.includes(card.member)));
  const voltageBuffs = target === 'excitement' ? matchingVoltageUpAdditionalBuffs(state, card) : [];
  const mentalBuffs = target === 'stamina' ? matchingMentalRecoverAdditionalBuffs(state, card) : [];
  const percent = Math.max(
    -100,
    state.resourceBoosts.reduce(
      (sum, boost) => (matches(boost) ? Math.fround(sum + boost.percent) : sum),
      [...voltageBuffs, ...mentalBuffs].reduce((sum, buff) => Math.fround(sum + buff.percent), 0),
    ),
  );
  const additionalValue = Math.fround(value + Math.fround((value * percent) / 100));
  const heartBoost =
    target === 'attract' ? consumeHeartBoosts(state, card, additionalValue) : { state, percent: 0 };
  const boostedValue =
    target === 'attract'
      ? Math.fround(additionalValue + Math.fround((additionalValue * heartBoost.percent) / 100))
      : additionalValue;
  return {
    value: boostedValue,
    state: {
      ...heartBoost.state,
      mentalRecoverAdditionalBuffs: heartBoost.state.mentalRecoverAdditionalBuffs.flatMap(
        (buff) => {
          if (!mentalBuffs.some((item) => item.id === buff.id) || buff.remainingUses === null)
            return [buff];
          const remainingUses = buff.remainingUses - 1n;
          return remainingUses > 0n ? [{ ...buff, remainingUses }] : [];
        },
      ),
      resourceBoosts: heartBoost.state.resourceBoosts.flatMap((boost) =>
        !matches(boost) || boost.uses === null
          ? [boost]
          : boost.uses > 1
            ? [{ ...boost, uses: boost.uses - 1 }]
            : [],
      ),
    },
  };
}
