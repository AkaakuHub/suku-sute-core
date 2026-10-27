import { expect, it } from 'vite-plus/test';
import { createDisableMentalDownEffect } from '../../src/game/actionTypeEffects/disableMentalDown.ts';

it('ActionType34は期限種別をint32化し、long期限を保持する', () => {
  const effect = createDisableMentalDownEffect({
    skillEffectId: 34n,
    details: [
      {
        id: 1n,
        detailType: 'DISABLE_MENTAL_DOWN_DISPLAY_TIME_TYPE',
        value: (1n << 32n) + 2n,
      },
      {
        id: 2n,
        detailType: 'DISABLE_MENTAL_DOWN_DISPLAY_TIME',
        value: (1n << 53n) + 1n,
      },
    ],
  });

  expect(effect).toEqual({
    kind: 'disable-mental-down',
    duration: { kind: 'sections', value: (1n << 53n) + 1n },
  });
});
