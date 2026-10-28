import { createLiveGenesisState } from '../../src/runtime/skills/genesisSkill.ts';
import { expect, test } from 'vite-plus/test';
import {
  advanceLiveSkillCooldown,
  calculateLiveBaseSkillCooldownSeconds,
  calculateLiveSkillCoolTime,
  canActivateLiveHandCardSkill,
  createLiveSkillCooldownState,
  resolveLiveSkillActivation,
  startLiveSkillCooldown,
} from '../../src/runtime/live/skillActivation.ts';

test('Live基礎cooldownはMusics.PlayTimeをruntimeのfloat32順で変換する', () => {
  expect(calculateLiveBaseSkillCooldownSeconds(139_259)).toBe(0.5439804792404175);
});

test('ActionType40はruntimeのdeck差分clampとfloat32式でcool timeを算出する', () => {
  const profile = {
    baseSeconds: 14.5,
    underAddFactor: 2,
    overAddFactor: -0.4,
    underLimit: 10,
    overLimit: 10,
  } as const;
  expect(calculateLiveSkillCoolTime(profile, 2, 4)).toBe(72.5);
  expect(calculateLiveSkillCoolTime(profile, 14, 4)).toBe(-43.5);
});

test('Live skill cooldownは全hand共通で0以下になるまで発動を止める', () => {
  const cooldown = startLiveSkillCooldown(0.5);
  expect(
    canActivateLiveHandCardSkill({
      isHand: true,
      mentalDown: false,
      ap: { currentAp: 10, maxAp: 20, timerSeconds: 0 },
      genesis: createLiveGenesisState(),
      apInfinity: false,
      consumeAp: 3,
      skillCooldown: cooldown,
    }),
  ).toBe(false);
  const elapsed = advanceLiveSkillCooldown(cooldown, 0.6);
  expect(elapsed).toEqual({
    currentSeconds: 0.5,
    remainingSeconds: -0.09999999999999998,
  });
  expect(
    canActivateLiveHandCardSkill({
      isHand: true,
      mentalDown: false,
      ap: { currentAp: 10, maxAp: 20, timerSeconds: 0 },
      genesis: createLiveGenesisState(),
      apInfinity: false,
      consumeAp: 3,
      skillCooldown: elapsed,
    }),
  ).toBe(true);
});

test('Live card skillはMental Down、AP不足、hand外で発動しない', () => {
  const availableInput = {
    isHand: true,
    mentalDown: false,
    ap: { currentAp: 3, maxAp: 20, timerSeconds: 0 },
    genesis: createLiveGenesisState(),
    apInfinity: false,
    consumeAp: 3,
    skillCooldown: createLiveSkillCooldownState(),
  };
  expect(canActivateLiveHandCardSkill(availableInput)).toBe(true);
  expect(
    canActivateLiveHandCardSkill({
      ...availableInput,
      mentalDown: true,
    }),
  ).toBe(false);
  expect(
    canActivateLiveHandCardSkill({
      ...availableInput,
      ap: { ...availableInput.ap, currentAp: 2 },
    }),
  ).toBe(false);
  expect(
    canActivateLiveHandCardSkill({
      ...availableInput,
      isHand: false,
    }),
  ).toBe(false);
});

test('Live通常skillはcooldownからResetSearch後の確認まで公式順で処理する', () => {
  const result = resolveLiveSkillActivation({
    livePhase: 3,
    deckActionRunning: false,
    registeredCooldownSeconds: null,
    baseCooldownSeconds: 1.5,
    skillCost: { kind: 'verified', consumeAp: 3 },
    drawPlan: {
      kind: 'verified',
      hasUseAllHandSkill: false,
      drawCard: true,
    },
  });

  expect(result).toEqual({
    kind: 'activated',
    commands: [
      {
        kind: 'set-skill-cooldown',
        currentSeconds: 1.5,
        remainingSeconds: 1.5,
        source: 'base',
      },
      { kind: 'set-card-board-state', state: 5 },
      { kind: 'consume-skill-cost', consumeAp: 3 },
      { kind: 'activate-card-skill' },
      { kind: 'activate-card-ability' },
      { kind: 'draw-card' },
      { kind: 'enqueue-board-action', action: 4 },
      { kind: 'enqueue-board-action', action: 5 },
      { kind: 'notify-skill-use' },
      { kind: 'enqueue-board-action', action: 6 },
      { kind: 'enqueue-board-action', action: 2 },
    ],
  });
});

test('Live all-hand skillはDrawAllHandとEndをenqueueしてから共通actionへ進む', () => {
  const result = resolveLiveSkillActivation({
    livePhase: 3,
    deckActionRunning: false,
    registeredCooldownSeconds: null,
    baseCooldownSeconds: calculateLiveBaseSkillCooldownSeconds(139_259),
    skillCost: { kind: 'verified', consumeAp: 2 },
    drawPlan: {
      kind: 'verified',
      hasUseAllHandSkill: true,
      drawCard: false,
    },
  });

  if (result.kind !== 'activated') throw new Error('skill was not activated');
  expect(result.commands[0]).toEqual({
    kind: 'set-skill-cooldown',
    currentSeconds: 0.5439804792404175,
    remainingSeconds: 0.5439804792404175,
    source: 'base',
  });
  expect(result.commands.slice(5)).toEqual([
    { kind: 'enqueue-board-action', action: 7 },
    { kind: 'enqueue-board-action', action: 8 },
    { kind: 'enqueue-board-action', action: 5 },
    { kind: 'notify-skill-use' },
    { kind: 'enqueue-board-action', action: 6 },
    { kind: 'enqueue-board-action', action: 2 },
  ]);
});

test('Live skillは未確定costとcard draw planを推測しない', () => {
  const baseInput = {
    livePhase: 3,
    deckActionRunning: false,
    registeredCooldownSeconds: 1,
    baseCooldownSeconds: 1.5,
  };
  expect(
    resolveLiveSkillActivation({
      ...baseInput,
      skillCost: { kind: 'unresolved' },
      drawPlan: { kind: 'unresolved' },
    }),
  ).toEqual({
    kind: 'unresolved',
    reason: 'verified-skill-cost-missing',
  });
  expect(
    resolveLiveSkillActivation({
      ...baseInput,
      skillCost: { kind: 'verified', consumeAp: 1 },
      drawPlan: { kind: 'unresolved' },
    }),
  ).toEqual({
    kind: 'unresolved',
    reason: 'verified-card-draw-plan-missing',
  });
});
