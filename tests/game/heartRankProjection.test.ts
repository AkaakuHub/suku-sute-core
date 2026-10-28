import { expect, test } from 'vite-plus/test';
import { projectHeartRank } from '../../src/game/live/heartRank.ts';
import {
  createLiveGenesisState,
  activateLiveGenesisEffect,
} from '../../src/runtime/skills/genesisSkill.ts';

test('ハートの表示と得点は内部Voltageポイントではなくレベルを使う', () => {
  const state = {
    voltage: { currentVoltage: 31n, timerSeconds: 0 },
    maximumVoltageLevel: 1000,
    genesis: createLiveGenesisState(),
  };
  expect(projectHeartRank(state, 100)).toEqual({ rank: 2, magnification: 2.5 });
});

test('Genesis中のハートは通常Voltageではなく専用ゲージでランクを判定する', () => {
  const state = {
    voltage: { currentVoltage: 5001n, timerSeconds: 0 },
    maximumVoltageLevel: 1000,
    genesis: createLiveGenesisState(),
  };
  const genesis = activateLiveGenesisEffect(
    state.genesis,
    { effectId: 'genesis', effectValue: 1, duration: { kind: 'full-end' } },
    { currentAp: 0, currentMental: 100, currentVoltage: 5001n, currentVoltageLevel: 11 },
  );
  expect(projectHeartRank({ ...state, genesis: { ...genesis, currentGauge: 0 } }, 100)).toEqual({
    rank: 0,
    magnification: 1,
  });
});
