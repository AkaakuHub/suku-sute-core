import { expect, it } from 'vite-plus/test';
import { createGenesisSkillEffect } from '../../src/game/actionTypeEffects/genesisSkill.ts';

it('ActionType51はlong値を保ち、FullEndをstage期限へ変換する', () => {
  expect(
    createGenesisSkillEffect({
      skillEffectId: 51n,
      details: [
        { id: 1n, detailType: 'GENESIS_EFFECT_BASE_NUM', value: (1n << 53n) + 1n },
        { id: 2n, detailType: 'GENESIS_DISPLAY_TIME_TYPE', value: 3n },
        { id: 3n, detailType: 'GENESIS_DISPLAY_TIME', value: 100n },
      ],
    }),
  ).toEqual({
    kind: 'genesis-skill',
    effectBaseNum: (1n << 53n) + 1n,
    duration: { kind: 'stage', value: 0n },
  });
});

it('ActionType51は既定値としてmillisecond 0を使う', () => {
  expect(createGenesisSkillEffect({ skillEffectId: 51n, details: [] })).toEqual({
    kind: 'genesis-skill',
    effectBaseNum: 0n,
    duration: { kind: 'milliseconds', value: 0n },
  });
});
