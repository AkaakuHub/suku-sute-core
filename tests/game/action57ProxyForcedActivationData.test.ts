import { expect, it } from 'vite-plus/test';
import { createProxyForcedActivationEffect } from '../../src/game/actionTypeEffects/proxyForcedActivation.ts';

it('ActionType57はlongの対象種別を保持し、実行時castへ渡す', () => {
  expect(
    createProxyForcedActivationEffect({
      skillEffectId: 57n,
      details: [{ id: 1n, detailType: 'TARGET_PROXY_SKILL_TYPE', value: (1n << 53n) + 5n }],
    }),
  ).toEqual({ kind: 'proxy-skill-forced-activation', targetType: (1n << 53n) + 5n });
});

it('ActionType57は対象種別がない場合に0を使う', () => {
  expect(createProxyForcedActivationEffect({ skillEffectId: 57n, details: [] })).toEqual({
    kind: 'proxy-skill-forced-activation',
    targetType: 0n,
  });
});
