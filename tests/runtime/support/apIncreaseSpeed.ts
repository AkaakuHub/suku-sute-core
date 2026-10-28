import type { LiveApIncreaseSpeedState } from '../../../src/runtime/skills/apIncreaseSpeed.ts';

export function apSpeedRuntime(apIncreaseSpeedEffects: LiveApIncreaseSpeedState) {
  return {
    apIncreaseSpeedEffects,
    ap: { currentAp: 0, maxAp: 20, timerSeconds: Math.fround(0.3) },
  };
}
