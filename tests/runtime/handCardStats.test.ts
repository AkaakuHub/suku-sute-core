import { expect, test } from 'vite-plus/test';
import {
  createLiveHandCardStats,
  advanceLiveHandCardStatsSection,
  notifyLiveHandCardStatsSkillUse,
  liveHandCardStatsUnitUseCount,
  reconcileLiveHandCardStats,
} from '../../src/runtime/cards/handCardStats.ts';

test('手札に入った時点から使用したメンバーと主効果を数える', () => {
  const initial = createLiveHandCardStats(2);
  const first = notifyLiveHandCardStatsSkillUse(initial, 101, 14);
  const second = notifyLiveHandCardStatsSkillUse(first, 101, 15);
  expect(initial.skillUseCountsByMember).toEqual({});
  expect(second.skillUseCountsByMember).toEqual({ 101: 2 });
  expect(second.skillUseCountsByMainEffect).toEqual({ 14: 1, 15: 1 });
  expect(advanceLiveHandCardStatsSection(second, 4).sectionCount).toBe(2);
});

test('非操作側の手札は通知を無視し、再開後のセクション通知で初期との差を更新する', () => {
  const initial = createLiveHandCardStats(1);
  const inactive = { ...advanceLiveHandCardStatsSection(initial, 2), isActive: false };
  expect(notifyLiveHandCardStatsSkillUse(inactive, 101, 14)).toBe(inactive);
  expect(advanceLiveHandCardStatsSection(inactive, 4)).toBe(inactive);
  const resumed = reconcileLiveHandCardStats({ card: inactive }, ['card'], ['card'], 4);
  const stats = resumed.card;
  if (!stats) throw new Error('Hand statistics are absent');
  expect(stats.sectionCount).toBe(1);
  expect(advanceLiveHandCardStatsSection(stats, 5).sectionCount).toBe(4);
});

test('手札に戻ったカードは以前の統計を引き継がない', () => {
  const used = notifyLiveHandCardStatsSkillUse(createLiveHandCardStats(0), 101, 14);
  const removed = reconcileLiveHandCardStats({ card: used }, [], [], 1);
  expect(removed).toEqual({});
  const reentered = reconcileLiveHandCardStats(removed, ['card'], ['card'], 2);
  expect(reentered.card).toEqual(createLiveHandCardStats(2));
});

test('ユニット使用回数はメンバー別の回数を所属判定で合計する', () => {
  const initial = createLiveHandCardStats(0);
  const state = [101, 101, 102, 103].reduce(
    (next, id) => notifyLiveHandCardStatsSkillUse(next, id, 14),
    initial,
  );
  expect(
    liveHandCardStatsUnitUseCount(
      state,
      1,
      (unitId, id) => unitId === 1 && (id === 101 || id === 103),
    ),
  ).toBe(3);
});

test('メンバーと主効果の回数はint32で加算する', () => {
  const state = {
    ...createLiveHandCardStats(0),
    skillUseCountsByMember: { 101: 2_147_483_647 },
    skillUseCountsByMainEffect: { 14: 2_147_483_647 },
  };
  const next = notifyLiveHandCardStatsSkillUse(state, 101, 14);
  expect(next.skillUseCountsByMember[101]).toBe(-2_147_483_648);
  expect(next.skillUseCountsByMainEffect[14]).toBe(-2_147_483_648);
});
