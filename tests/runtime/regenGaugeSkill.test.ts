import { expect, test } from 'vite-plus/test';
import type { LiveSkillEffect } from '../../src/runtime/skills/skillTypes.ts';
import {
  activateLiveRegenGaugeEffect,
  advanceLiveRegenGaugeClock,
  createLiveRegenGaugeState,
  notifyLiveRegenGaugeBeatHeartCreated,
} from '../../src/runtime/skills/regenGaugeSkill.ts';

test('Regen Mentalは発動時に適用し、MSEC間隔では1frameに1回だけ再適用する', () => {
  const activated = activateLiveRegenGaugeEffect(
    createLiveRegenGaugeState(),
    regenEffect(6, 'REGEN_MENTAL', 1, 1_000, 1, 5_000),
    {
      currentTimeSeconds: 10,
      currentMoodValue: 5,
      power: { addValue: 1, multiplyFactor: 2, effectPower: 0.5 },
      applySkillBoost: (value) => value,
    },
  );
  expect(activated.application).toEqual({
    actionType: 6,
    gauge: 'mental',
    amount: 11,
  });
  const delayed = advanceLiveRegenGaugeClock(activated.state, {
    currentTimeSeconds: 12.5,
    deltaTimeSeconds: 2.5,
    sectionChangeCount: 0,
    musicEnded: false,
  });
  expect(delayed.applications).toEqual([activated.application]);
  expect(
    advanceLiveRegenGaugeClock(delayed.state, {
      currentTimeSeconds: 12.6,
      deltaTimeSeconds: 0.1,
      sectionChangeCount: 0,
      musicEnded: false,
    }).applications,
  ).toEqual([activated.application]);
});

test('Regen VoltageはskillによるHeart生成回数で再適用し、section寿命で終了する', () => {
  const activated = activateLiveRegenGaugeEffect(
    createLiveRegenGaugeState(),
    regenEffect(11, 'REGEN_VOLTAGE', 2, 2, 2, 2),
    {
      currentTimeSeconds: 0,
      currentMoodValue: 0,
      power: { addValue: 0, multiplyFactor: 1, effectPower: 1 },
      applySkillBoost: (value) => value,
    },
  );
  const firstHeart = notifyLiveRegenGaugeBeatHeartCreated(activated.state);
  expect(firstHeart.applications).toEqual([]);
  const secondHeart = notifyLiveRegenGaugeBeatHeartCreated(firstHeart.state);
  expect(secondHeart.applications).toEqual([activated.application]);
  const firstSection = advanceLiveRegenGaugeClock(secondHeart.state, {
    currentTimeSeconds: 1,
    deltaTimeSeconds: 1,
    sectionChangeCount: 1,
    musicEnded: false,
  });
  expect(firstSection.state).toHaveLength(1);
  const secondSection = advanceLiveRegenGaugeClock(firstSection.state, {
    currentTimeSeconds: 2,
    deltaTimeSeconds: 1,
    sectionChangeCount: 1,
    musicEnded: false,
  });
  expect(secondSection.state).toEqual([]);
});

function regenEffect(
  actionType: 6 | 11,
  prefix: 'REGEN_MENTAL' | 'REGEN_VOLTAGE',
  intervalType: 1 | 2,
  intervalValue: number,
  displayTimeType: 1 | 2 | 3,
  displayTime: number,
): LiveSkillEffect {
  return {
    id: String(actionType),
    actionType,
    orderId: 1,
    details: [
      detail('1', `${prefix}_TYPE`, 1),
      detail('2', `${prefix}_NUM_BASE`, 100_000),
      {
        ...detail('3', `${prefix}_NUM_BONUS_MOOD`, 1_000),
        targetMood: 1,
      },
      detail('4', `${prefix}_INTERVAL_TYPE`, intervalType),
      detail('5', `${prefix}_INTERVAL_NUM`, intervalValue),
      detail('6', `${prefix}_DISPLAY_TIME_TYPE`, displayTimeType),
      detail('7', `${prefix}_DISPLAY_TIME`, displayTime),
    ],
  };
}

function detail(id: string, detailType: string, effectValue: number) {
  return { id, detailType, targetMood: 0, effectValue, params: [] };
}
