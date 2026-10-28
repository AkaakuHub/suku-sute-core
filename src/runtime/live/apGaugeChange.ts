import type { LiveApGaugeState } from './apGauge.ts';
import { addLiveGenesisGauge, type LiveGenesisState } from '../skills/genesisSkill.ts';

export function setLiveApGaugeValue<
  T extends Readonly<{ ap: LiveApGaugeState; genesis: LiveGenesisState }>,
>(state: T, requestedAp: bigint, apInfinity: boolean): T {
  const value = Number(BigInt.asIntN(32, requestedAp));
  if (state.genesis.effects.length > 0)
    return {
      ...state,
      genesis: addLiveGenesisGauge(state.genesis, {
        actionType: 0,
        gaugeType: 3,
        effectValue: Number(BigInt.asIntN(32, BigInt(value) - BigInt(state.ap.currentAp))),
      }),
    };
  if (apInfinity) return state;
  return { ...state, ap: { ...state.ap, currentAp: Math.max(0, Math.min(state.ap.maxAp, value)) } };
}
