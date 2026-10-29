import {
  advanceLiveRegenGaugeClock,
  notifyLiveRegenGaugeBeatHeartCreated,
} from '../../src/runtime/skills/regenGaugeRuntime.ts';
import type { LiveRegenGaugeApplication } from '../../src/runtime/skills/regenGaugeSkill.ts';
import { expect, test } from 'vite-plus/test';
import type { LiveSkillEffect } from '../../src/runtime/skills/skillTypes.ts';
import {
  activateLiveRegenGaugeEffect,
  createLiveRegenGaugeState,
} from '../../src/runtime/skills/regenGaugeSkill.ts';

test('Regen Mentalは発動時に適用し、MSEC間隔では1frameに1回だけ再適用する', () => {
  const activated = activateLiveRegenGaugeEffect(
    createLiveRegenGaugeState(),
    regenEffect(6, 'REGEN_MENTAL', 1, 1_000, 1, 5_000),
    {
      registrationId: 1,
      currentMoodValue: 5,
      power: { addValue: 1, multiplyFactor: 2, effectPower: 0.5 },
      applySkillBoost: (value) => value,
    },
  );
  expect(activated.application).toEqual({
    actionType: 6,
    gauge: 'mental',
    calculationType: 1,
    value: 11.5,
  });
  const applications: LiveRegenGaugeApplication[] = [];
  const apply = (
    state: { regenGaugeEffects: typeof activated.state },
    effect: LiveRegenGaugeApplication,
  ) => {
    applications.push({
      actionType: effect.actionType,
      gauge: effect.gauge,
      calculationType: effect.calculationType,
      value: effect.value,
    });
    return state;
  };
  const delayed = advanceLiveRegenGaugeClock(
    { regenGaugeEffects: activated.state },
    {
      deltaTimeSeconds: 2.5,
      sectionChangeCount: 0,
      musicEnded: false,
    },
    apply,
  );
  expect(applications).toEqual([activated.application]);
  advanceLiveRegenGaugeClock(
    delayed,
    { deltaTimeSeconds: 0.1, sectionChangeCount: 0, musicEnded: false },
    apply,
  );
  expect(applications).toEqual([activated.application, activated.application]);
});

test('Regen Voltageは自然発生のBeat Heart通知で再適用し、section寿命で終了する', () => {
  const activated = activateLiveRegenGaugeEffect(
    createLiveRegenGaugeState(),
    regenEffect(11, 'REGEN_VOLTAGE', 2, 2, 2, 2),
    {
      registrationId: 1,
      currentMoodValue: 0,
      power: { addValue: 0, multiplyFactor: 1, effectPower: 1 },
      applySkillBoost: (value) => value,
    },
  );
  let applications = 0;
  const apply = (state: { regenGaugeEffects: typeof activated.state }) => {
    applications++;
    return state;
  };
  const first = notifyLiveRegenGaugeBeatHeartCreated({ regenGaugeEffects: activated.state }, apply);
  expect(applications).toBe(0);
  const second = notifyLiveRegenGaugeBeatHeartCreated(first, apply);
  expect(applications).toBe(1);
  const section = advanceLiveRegenGaugeClock(
    second,
    { deltaTimeSeconds: 1, sectionChangeCount: 1, musicEnded: false },
    apply,
  );
  expect(section.regenGaugeEffects).toHaveLength(1);
  const ended = advanceLiveRegenGaugeClock(
    section,
    { deltaTimeSeconds: 1, sectionChangeCount: 1, musicEnded: false },
    apply,
  );
  expect(ended.regenGaugeEffects).toEqual([]);
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
