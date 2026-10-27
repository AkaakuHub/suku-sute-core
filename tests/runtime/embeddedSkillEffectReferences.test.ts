import { expect, test } from 'vite-plus/test';
import { liveEmbeddedSkillEffectReferenceIds } from '../../src/runtime/skills/embeddedSkillEffectReferences.ts';
import type { LiveSkillEffect } from '../../src/runtime/skills/skillTypes.ts';

test('ActionType907の直接参照とparam形式の内包effect参照を解決する', () => {
  expect(
    liveEmbeddedSkillEffectReferenceIds(
      effect(907, [detail('EFFECT_INDUCE_EFFECT_ID1', 30315010012)]),
    ),
  ).toEqual(new Set(['30315010012']));
  expect(
    liveEmbeddedSkillEffectReferenceIds(
      effect(41, [
        {
          ...detail('INDUCE_SKILL_EFFECT_PARAMS_ID', 1),
          params: [
            {
              paramType: 'INDUCE_SKILL_EFFECT_PARAMS_ID',
              paramValue: '10001,10002',
            },
          ],
        },
      ]),
    ),
  ).toEqual(new Set(['10001', '10002']));
});

function effect(actionType: number, details: LiveSkillEffect['details']): LiveSkillEffect {
  return { id: '1', actionType, orderId: 1, details };
}

function detail(detailType: string, effectValue: number): LiveSkillEffect['details'][number] {
  return {
    id: '2',
    detailType,
    targetMood: 0,
    effectValue,
    params: [],
  };
}
