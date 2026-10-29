import type {
  LiveHeartRuntimeState,
  LiveHeartRandomRange,
  LiveHeartSpawnResult,
} from './heartTypes.ts';
import { ceilToInt32 } from '../numeric.ts';
import { absorbLiveProxySkill, type LiveProxySkillLifecycle } from '../skills/proxyLifecycle.ts';

export function calculateLiveHeartCreateCount(value: number, effectPower: number): number {
  return Math.max(1, ceilToInt32(Math.ceil(value) * Math.fround(effectPower)));
}

export function createLiveHearts<
  Hearts extends LiveHeartRuntimeState,
  Proxy extends LiveProxySkillLifecycle,
>(
  state: Readonly<{ hearts: Hearts; proxySkills: readonly Proxy[] }>,
  requestedCount: number,
  lifeTimeSeconds: number,
  randomRange: LiveHeartRandomRange,
  spawn: (
    hearts: Hearts,
    count: number,
    lifeTimeSeconds: number,
    randomRange: LiveHeartRandomRange,
  ) => LiveHeartSpawnResult<Hearts>,
): Readonly<{
  hearts: Hearts;
  proxySkills: readonly Proxy[];
  proxyAbsorption: ReturnType<typeof absorbLiveProxySkill<Proxy>>;
  overflowCount: number;
  createdCount: number;
}> {
  if (!Number.isSafeInteger(requestedCount) || requestedCount < 0)
    throw new Error('Live Heart creation count is invalid');
  const proxyAbsorption = absorbLiveProxySkill(state.proxySkills, 1, BigInt(requestedCount));
  if (proxyAbsorption.absorbed || requestedCount === 0)
    return {
      hearts: state.hearts,
      proxySkills: proxyAbsorption.states,
      proxyAbsorption,
      overflowCount: 0,
      createdCount: 0,
    };
  const created = spawn(state.hearts, requestedCount, lifeTimeSeconds, randomRange);
  return {
    hearts: created.state,
    proxySkills: proxyAbsorption.states,
    proxyAbsorption,
    overflowCount: created.overflowCount,
    createdCount: requestedCount - created.overflowCount,
  };
}
