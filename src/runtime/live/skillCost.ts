import type { LiveApGaugeState } from './apGauge.ts';
import type { LiveGenesisState } from '../skills/genesisSkill.ts';

export type LiveSkillCostInput = Readonly<{
  ap: LiveApGaugeState;
  genesis: LiveGenesisState;
  apInfinity: boolean;
  consumeAp: number;
}>;

export function isLiveSkillCostOver(input: LiveSkillCostInput): boolean {
  if (
    !Number.isSafeInteger(input.ap.currentAp) ||
    input.ap.currentAp < 0 ||
    !Number.isSafeInteger(input.consumeAp) ||
    input.consumeAp < 0
  ) {
    throw new Error('Live card skill AP is invalid');
  }
  return (
    !input.apInfinity && input.genesis.effects.length === 0 && input.ap.currentAp < input.consumeAp
  );
}
