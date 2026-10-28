import { expect, test } from 'vite-plus/test';
import {
  canActivateLiveHandCardSkill,
  createLiveSkillCooldownState,
} from '../../src/runtime/live/skillActivation.ts';
import { isLiveSkillCostOver } from '../../src/runtime/live/skillCost.ts';
import {
  activateLiveGenesisEffect,
  createLiveGenesisState,
} from '../../src/runtime/skills/genesisSkill.ts';

function initial() {
  return {
    ap: { currentAp: 0, maxAp: 20, timerSeconds: 0 },
    genesis: createLiveGenesisState(),
    apInfinity: false,
    consumeAp: 30,
    isHand: true,
    mentalDown: false,
    skillCooldown: createLiveSkillCooldownState(),
  };
}

test('AP不足は現在APとコストを比較し、同額なら使用できる', () => {
  const state = initial();
  expect(isLiveSkillCostOver(state)).toBe(true);
  expect(isLiveSkillCostOver({ ...state, consumeAp: 0 })).toBe(false);
  expect(isLiveSkillCostOver({ ...state, ap: { ...state.ap, currentAp: 30 } })).toBe(false);
});

test('Infinityでは現在APも最大APも超えるカードを使用できる', () => {
  const state = { ...initial(), apInfinity: true };
  expect(isLiveSkillCostOver(state)).toBe(false);
  expect(canActivateLiveHandCardSkill(state)).toBe(true);
});

test('Genesisでは通常APが0でもカードを使用できる', () => {
  const state = initial();
  const genesis = activateLiveGenesisEffect(
    state.genesis,
    {
      effectId: 'genesis',
      effectValue: 1,
      duration: { kind: 'full-end' },
    },
    { currentAp: 0, currentMental: 100, currentVoltage: 0n, currentVoltageLevel: 1 },
  );
  const active = { ...state, genesis };
  expect(isLiveSkillCostOver(active)).toBe(false);
  expect(canActivateLiveHandCardSkill(active)).toBe(true);
});

test('AP不足を解除してもMental Down・手札外・cooldownは使用を止める', () => {
  const state = { ...initial(), apInfinity: true };
  expect(canActivateLiveHandCardSkill({ ...state, mentalDown: true })).toBe(false);
  expect(canActivateLiveHandCardSkill({ ...state, isHand: false })).toBe(false);
  expect(
    canActivateLiveHandCardSkill({
      ...state,
      skillCooldown: { currentSeconds: 1, remainingSeconds: 1 },
    }),
  ).toBe(false);
});
