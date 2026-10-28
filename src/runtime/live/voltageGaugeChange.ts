import type { LiveVoltageGaugeState } from './voltageGauge.ts';
import { int64ToFloat32 } from '../numeric.ts';
import { addLiveGenesisGauge, type LiveGenesisState } from '../skills/genesisSkill.ts';

export function setLiveVoltageGaugeValue<
  T extends Readonly<{ voltage: LiveVoltageGaugeState; genesis: LiveGenesisState }>,
>(state: T, requestedVoltage: bigint, voltageInfinity: boolean): T {
  const value = BigInt.asIntN(64, requestedVoltage);
  if (state.genesis.effects.length > 0)
    return {
      ...state,
      genesis: addLiveGenesisGauge(state.genesis, {
        actionType: 0,
        gaugeType: 1,
        effectValue: int64ToFloat32(BigInt.asIntN(64, value - state.voltage.currentVoltage)),
      }),
    };
  if (voltageInfinity) return state;
  return { ...state, voltage: { ...state.voltage, currentVoltage: value < 0n ? 0n : value } };
}
