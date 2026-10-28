import type { LiveApGaugeState } from './apGauge.ts';
import { addLiveGenesisGauge, type LiveGenesisState } from '../skills/genesisSkill.ts';

export function consumeLiveApGaugeValue<
  T extends Readonly<{ ap: LiveApGaugeState; genesis: LiveGenesisState }>,
>(state: T, consumeAp: number, apInfinity: boolean): T {
  const next =
    state.ap.currentAp >= state.ap.maxAp
      ? { ...state, ap: { ...state.ap, timerSeconds: 0 } }
      : state;
  return setLiveApGaugeValue(next, BigInt(state.ap.currentAp) - BigInt(consumeAp), apInfinity);
}

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
