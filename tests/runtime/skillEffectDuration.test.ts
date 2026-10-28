import { expect, test } from 'vite-plus/test';
import {
  advanceLiveSkillEffectDuration,
  createLiveSkillEffectDuration,
  type LiveSkillEffectDuration,
} from '../../src/runtime/skills/skillEffectDuration.ts';

test('時間期限はFloat32の残り時間を毎フレーム減算して判定する', () => {
  let duration: LiveSkillEffectDuration | null = createLiveSkillEffectDuration(1, 1000n, 'test');
  for (let frame = 0; frame < 60; frame += 1) {
    if (duration === null) throw new Error('期限が早く終了しました。');
    duration = advanceLiveSkillEffectDuration(duration, {
      deltaTimeSeconds: 1 / 60,
      sectionChangeCount: 0,
      musicEnded: false,
    });
  }
  expect(duration).toEqual({ kind: 'milliseconds', remainingSeconds: 2.7939677238464355e-7 });
  if (duration === null) throw new Error('残り時間がありません。');
  expect(
    advanceLiveSkillEffectDuration(duration, {
      deltaTimeSeconds: 1 / 60,
      sectionChangeCount: 0,
      musicEnded: false,
    }),
  ).toBeNull();
});

test('時間の初期値はint64からFloat32へ変換してから秒へ換算する', () => {
  expect(createLiveSkillEffectDuration(1, 16_777_217n, 'test')).toEqual({
    kind: 'milliseconds',
    remainingSeconds: Math.fround(Math.fround(16_777_217) / 1000),
  });
});

test('セクション期限は2の53乗を超えても1回ずつ正確に減算する', () => {
  const duration = createLiveSkillEffectDuration(2, (1n << 53n) + 1n, 'test');
  expect(
    advanceLiveSkillEffectDuration(duration, {
      deltaTimeSeconds: 0,
      sectionChangeCount: 1,
      musicEnded: false,
    }),
  ).toEqual({ kind: 'sections', remainingChanges: 1n << 53n });
  expect(
    advanceLiveSkillEffectDuration(
      { kind: 'sections', remainingChanges: 1n },
      { deltaTimeSeconds: 0, sectionChangeCount: 1, musicEnded: false },
    ),
  ).toBeNull();
});

test('曲終了の期限は経過時間とセクション変更で終了しない', () => {
  const duration = createLiveSkillEffectDuration(3, 0n, 'test');
  expect(
    advanceLiveSkillEffectDuration(duration, {
      deltaTimeSeconds: 100,
      sectionChangeCount: 100,
      musicEnded: false,
    }),
  ).toBe(duration);
  expect(
    advanceLiveSkillEffectDuration(duration, {
      deltaTimeSeconds: 0,
      sectionChangeCount: 0,
      musicEnded: true,
    }),
  ).toBeNull();
});

test('失われた整数精度と負の経過時間を受け入れない', () => {
  expect(() => createLiveSkillEffectDuration(2, 2 ** 53, 'test')).toThrow();
  expect(() => createLiveSkillEffectDuration(2, 1n << 63n, 'test')).toThrow();
  expect(() =>
    advanceLiveSkillEffectDuration(
      { kind: 'full-end' },
      { deltaTimeSeconds: -1, sectionChangeCount: 0, musicEnded: false },
    ),
  ).toThrow();
});

test.each([0n, -1n])('時間期限%sは次の時間通知で終了する', (milliseconds) => {
  const duration = createLiveSkillEffectDuration(1, milliseconds, 'test');
  expect(duration.kind).toBe('milliseconds');
  expect(
    advanceLiveSkillEffectDuration(duration, {
      deltaTimeSeconds: 0,
      sectionChangeCount: 0,
      musicEnded: false,
    }),
  ).toBeNull();
});

test('負のセクション数は64bitの値として保持して次の変更通知で終了する', () => {
  const duration = createLiveSkillEffectDuration(2, -1n, 'test');
  expect(duration).toEqual({ kind: 'sections', remainingChanges: -1n });
  expect(
    advanceLiveSkillEffectDuration(duration, {
      deltaTimeSeconds: 0,
      sectionChangeCount: 1,
      musicEnded: false,
    }),
  ).toBeNull();
});
