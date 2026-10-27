import { expect, it } from 'vite-plus/test';
import { createIngameMissionEffect } from '../../src/game/actionTypeEffects/ingameMission.ts';

it('ActionType44はlongのミッション群IDを保持する', () => {
  expect(
    createIngameMissionEffect({
      skillEffectId: 44n,
      details: [{ id: 1n, detailType: 'INGAME_MISSION_SKILL_GROUP_ID', value: (1n << 53n) + 2n }],
    }),
  ).toEqual({ kind: 'ingame-mission', groupId: (1n << 53n) + 2n });
});

it('ActionType44は省略されたミッション群IDを0にする', () => {
  expect(createIngameMissionEffect({ skillEffectId: 44n, details: [] })).toEqual({
    kind: 'ingame-mission',
    groupId: 0n,
  });
});
