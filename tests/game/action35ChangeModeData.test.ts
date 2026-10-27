import { expect, it } from 'vite-plus/test';
import { createChangeModeEffect } from '../../src/game/actionTypeEffects/changeMode.ts';

it('ActionType35はlongの切替種別とModeIdをint32化する', () => {
  expect(
    createChangeModeEffect({
      skillEffectId: 35n,
      details: [
        { id: 1n, detailType: 'CHANGE_MODE_TYPE', value: (1n << 32n) + 3n },
        { id: 2n, detailType: 'CHANGE_MODE_ID', value: (1n << 32n) + 17n },
      ],
    }),
  ).toEqual({ kind: 'mode', modeId: 17n, change: 'alternate' });
});
