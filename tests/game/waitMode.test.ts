import { describe, expect, it } from 'vite-plus/test';
import {
  advanceWaitMode,
  createWaitMode,
  releaseWaitMode,
  notifyWaitModeSkillUse,
} from '../../src/game/live/waitMode.ts';

const available = {
  enabled: true,
  availableCards: 3,
  skillPoint: 10,
  ableUseSkill: true,
  mentalDown: false,
  allSkillsCostOver: false,
  deltaTimeSeconds: 0,
};
const waiting = () => advanceWaitMode({ ...createWaitMode(), kind: 'force-reserved' }, available);

describe('本家のカード待ち状態遷移', () => {
  it('使用可能な手札の位置を記録して停止する', () => {
    expect(waiting()).toMatchObject({ kind: 'waiting', previousAvailableCards: 3 });
  });
  it('手動解除後は同じ使用可能手札では再停止しない', () => {
    const released = releaseWaitMode(waiting(), false);
    const advanced = advanceWaitMode(released, {
      ...available,
      skillPoint: 11,
      deltaTimeSeconds: 0.4,
    });
    expect(advanced.kind).toBe('initial');
    expect(advanceWaitMode(advanced, { ...available, skillPoint: 11 }).kind).toBe('initial');
    expect(
      advanceWaitMode(advanced, { ...available, skillPoint: 12, availableCards: 7 }).kind,
    ).toBe('waiting');
  });
  it('カード使用後は同じ位置でも再停止し、使用間隔と解除後0.35秒を守る', () => {
    const released = releaseWaitMode(waiting(), true);
    const cooldown = advanceWaitMode(released, {
      ...available,
      skillPoint: 9,
      deltaTimeSeconds: 0.2,
      ableUseSkill: false,
    });
    expect(cooldown.kind).toBe('force-reserved');
    const noPointChange = advanceWaitMode(cooldown, {
      ...available,
      skillPoint: 9,
      deltaTimeSeconds: 0.2,
    });
    expect(noPointChange.kind).toBe('waiting');
    expect(advanceWaitMode(noPointChange, { ...available, skillPoint: 10 }).kind).toBe('waiting');
  });
  it('メンタルダウン中は使用可能なカードがあっても停止しない', () => {
    expect(
      advanceWaitMode(
        { ...createWaitMode(), kind: 'force-reserved' },
        { ...available, mentalDown: true },
      ).kind,
    ).toBe('force-reserved');
  });
  it('全て消費不足なら強制予約を初期状態へ戻してAP変化を待つ', () => {
    const next = advanceWaitMode(
      { ...createWaitMode(), kind: 'force-reserved' },
      { ...available, availableCards: 0, allSkillsCostOver: true },
    );
    expect(next.kind).toBe('initial');
    expect(next.previousAvailableCards).toBe(0);
  });
});

it('停止中でなくても通常カード使用後は0.35秒を設定し、同じ手札も再判定する', () => {
  const initial = {
    ...createWaitMode(),
    kind: 'initial' as const,
    previousAvailableCards: 3,
    previousSkillPoint: 10,
  };
  const used = notifyWaitModeSkillUse(initial, true);
  expect(used.kind).toBe('force-reserved');
  expect(used.remainingCoolTimeSeconds).toBe(0.35);
  const below = advanceWaitMode(used, { ...available, deltaTimeSeconds: 0.34 });
  expect(below.kind).toBe('force-reserved');
  expect(advanceWaitMode(below, { ...available, deltaTimeSeconds: 0.02 }).kind).toBe('waiting');
});

it('待ちOFFの通常カードは待ちを有効化せず、停止中でない共鳴は待ち時間を変更しない', () => {
  const disabled = notifyWaitModeSkillUse(createWaitMode(), true);
  expect(disabled.kind).toBe('disabled');
  expect(disabled.remainingCoolTimeSeconds).toBe(0.35);
  const initial = { ...createWaitMode(), kind: 'initial' as const };
  expect(notifyWaitModeSkillUse(initial, false)).toBe(initial);
  expect(notifyWaitModeSkillUse(waiting(), false).kind).toBe('force-reserved');
});
