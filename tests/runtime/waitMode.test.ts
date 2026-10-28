import { describe, expect, it } from 'vite-plus/test';
import {
  advanceLiveWaitMode,
  createLiveWaitMode,
  releaseLiveWaitMode,
  notifyLiveWaitModeSkillUse,
} from '../../src/runtime/live/waitMode.ts';

const available = {
  enabled: true,
  availableCards: 3,
  ap: { currentAp: 10, maxAp: 20, timerSeconds: 0 },
  ableUseSkill: true,
  mentalDown: false,
  allSkillsCostOver: false,
  deltaTimeSeconds: 0,
};
const waiting = () =>
  advanceLiveWaitMode({ ...createLiveWaitMode(), kind: 'force-reserved' }, available);

describe('本家のカード待ち状態遷移', () => {
  it('使用可能な手札の位置を記録して停止する', () => {
    expect(waiting()).toMatchObject({ kind: 'waiting', previousAvailableCards: 3 });
  });
  it('手動解除後は同じ使用可能手札では再停止しない', () => {
    const released = releaseLiveWaitMode(waiting(), false);
    const advanced = advanceLiveWaitMode(released, {
      ...available,
      ap: { currentAp: 11, maxAp: 20, timerSeconds: 0 },
      deltaTimeSeconds: 0.4,
    });
    expect(advanced.kind).toBe('initial');
    expect(
      advanceLiveWaitMode(advanced, {
        ...available,
        ap: { currentAp: 11, maxAp: 20, timerSeconds: 0 },
      }).kind,
    ).toBe('initial');
    expect(
      advanceLiveWaitMode(advanced, {
        ...available,
        ap: { currentAp: 12, maxAp: 20, timerSeconds: 0 },
        availableCards: 7,
      }).kind,
    ).toBe('waiting');
  });
  it('カード使用後は同じ位置でも再停止し、使用間隔と解除後0.35秒を守る', () => {
    const released = releaseLiveWaitMode(waiting(), true);
    const cooldown = advanceLiveWaitMode(released, {
      ...available,
      ap: { currentAp: 9, maxAp: 20, timerSeconds: 0 },
      deltaTimeSeconds: 0.2,
      ableUseSkill: false,
    });
    expect(cooldown.kind).toBe('force-reserved');
    const noPointChange = advanceLiveWaitMode(cooldown, {
      ...available,
      ap: { currentAp: 9, maxAp: 20, timerSeconds: 0 },
      deltaTimeSeconds: 0.2,
    });
    expect(noPointChange.kind).toBe('waiting');
    expect(
      advanceLiveWaitMode(noPointChange, {
        ...available,
        ap: { currentAp: 10, maxAp: 20, timerSeconds: 0 },
      }).kind,
    ).toBe('waiting');
  });
  it('メンタルダウン中は使用可能なカードがあっても停止しない', () => {
    expect(
      advanceLiveWaitMode(
        { ...createLiveWaitMode(), kind: 'force-reserved' },
        { ...available, mentalDown: true },
      ).kind,
    ).toBe('force-reserved');
  });
  it('全て消費不足なら強制予約を初期状態へ戻してAP変化を待つ', () => {
    const next = advanceLiveWaitMode(
      { ...createLiveWaitMode(), kind: 'force-reserved' },
      { ...available, availableCards: 0, allSkillsCostOver: true },
    );
    expect(next.kind).toBe('initial');
    expect(next.previousAvailableCards).toBe(0);
  });
});

it('停止中でなくても通常カード使用後は0.35秒を設定し、同じ手札も再判定する', () => {
  const initial = {
    ...createLiveWaitMode(),
    kind: 'initial' as const,
    previousAvailableCards: 3,
    previousAp: 10,
  };
  const used = notifyLiveWaitModeSkillUse(initial, true);
  expect(used.kind).toBe('force-reserved');
  expect(used.remainingCoolTimeSeconds).toBe(Math.fround(0.35));
  const below = advanceLiveWaitMode(used, { ...available, deltaTimeSeconds: 0.34 });
  expect(below.kind).toBe('force-reserved');
  expect(advanceLiveWaitMode(below, { ...available, deltaTimeSeconds: 0.02 }).kind).toBe('waiting');
});

it('待ちOFFの通常カードは待ちを有効化せず、停止中でない共鳴は待ち時間を変更しない', () => {
  const disabled = notifyLiveWaitModeSkillUse(createLiveWaitMode(), true);
  expect(disabled.kind).toBe('disabled');
  expect(disabled.remainingCoolTimeSeconds).toBe(Math.fround(0.35));
  const initial = { ...createLiveWaitMode(), kind: 'initial' as const };
  expect(notifyLiveWaitModeSkillUse(initial, false)).toBe(initial);
  expect(notifyLiveWaitModeSkillUse(waiting(), false).kind).toBe('force-reserved');
});

it('有効化したフレームで強制予約し、使用可能な手札を評価する', () => {
  expect(advanceLiveWaitMode(createLiveWaitMode(), available).kind).toBe('waiting');
});

it('手札の枚数が同じでも使用可能な位置が変わった場合は再停止する', () => {
  const released = releaseLiveWaitMode(waiting(), false);
  const advanced = advanceLiveWaitMode(released, {
    ...available,
    ap: { ...available.ap, currentAp: 11 },
    availableCards: 5,
    deltaTimeSeconds: 0.4,
  });
  expect(advanced.kind).toBe('waiting');
  expect(advanced.previousAvailableCards).toBe(5);
});

it('APKと同じFloat32の21フレームで待機クールタイムが終わり、負数を保持する', () => {
  let advanced = releaseLiveWaitMode(waiting(), false);
  const input = { ...available, ap: { ...available.ap, currentAp: 11 }, deltaTimeSeconds: 1 / 60 };
  for (let frame = 0; frame < 20; frame++) advanced = advanceLiveWaitMode(advanced, input);
  expect(advanced.remainingCoolTimeSeconds).toBe(0.016666604205965996);
  expect(advanced.kind).toBe('reserved');
  advanced = advanceLiveWaitMode(advanced, input);
  expect(advanced.remainingCoolTimeSeconds).toBe(-6.332993507385254e-8);
  expect(advanced.kind).toBe('initial');
  expect(advanceLiveWaitMode(advanced, input).remainingCoolTimeSeconds).toBe(-6.332993507385254e-8);
});
