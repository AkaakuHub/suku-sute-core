import { expect, test } from 'vite-plus/test';
import {
  advanceLiveMentalGauge,
  calculateLiveInitialMental,
  type LiveMentalGaugePorts,
} from '../../src/runtime/live/mentalGauge.ts';

const mentalPorts: LiveMentalGaugePorts = {
  setMental: (requestedMental) => Math.max(requestedMental, 0),
  subMentalOne: (currentMental) => Math.max(currentMental - 1, 0),
};

const frameInput = {
  deltaTimeSeconds: 2,
  decreaseIntervalSeconds: 1,
  recoveryMentalDownTimeSeconds: 2,
  recoveryValueFromMentalDown: 5,
  mentalInfinity: false,
  disableMentalDown: false,
  genesisSkillActive: false,
};

test('Genesis単独ではtimerを進めて自然減少を通知し、Mental値とDown状態は保つ', () => {
  const decreases: number[] = [];
  const state = { currentMental: 1, timerSeconds: 0.75, mentalDown: false };
  const frame = advanceLiveMentalGauge(
    state,
    { ...frameInput, genesisSkillActive: true },
    {
      ...mentalPorts,
      subMentalOne: (currentMental) => {
        decreases.push(currentMental);
        return 0;
      },
    },
  );
  expect(decreases).toEqual([1, 1]);
  expect(frame.state).toEqual(state);
});

test('GenesisとDisableMentalDownの併用中だけtimerと自然減少を停止する', () => {
  const state = { currentMental: 1, timerSeconds: 0.75, mentalDown: false };
  expect(
    advanceLiveMentalGauge(
      state,
      { ...frameInput, genesisSkillActive: true, disableMentalDown: true },
      {
        setMental: () => {
          throw new Error('停止中に設定してはいけません。');
        },
        subMentalOne: () => {
          throw new Error('停止中に減少してはいけません。');
        },
      },
    ).state,
  ).toEqual(state);
});

test('Genesis中の間隔0はMentalを0へ設定せずtimerだけを進める', () => {
  expect(
    advanceLiveMentalGauge(
      { currentMental: 3, timerSeconds: 0.5, mentalDown: false },
      { ...frameInput, genesisSkillActive: true, decreaseIntervalSeconds: 0 },
      mentalPorts,
    ).state,
  ).toEqual({ currentMental: 3, timerSeconds: 2.5, mentalDown: false });
});

test('自然減少でDownへ入った時点でtimerを0へ戻し、残り時間分を減少しない', () => {
  let count = 0;
  const frame = advanceLiveMentalGauge(
    { currentMental: 1, timerSeconds: 0.75, mentalDown: false },
    { ...frameInput, deltaTimeSeconds: 5 },
    {
      ...mentalPorts,
      subMentalOne: () => {
        count++;
        return 0;
      },
    },
  );
  expect(frame.state).toEqual({ currentMental: 0, timerSeconds: 0, mentalDown: true });
  expect(count).toBe(1);
});

test('Down回復量の乗算・除算をそれぞれFloat32で丸める', () => {
  expect(
    advanceLiveMentalGauge(
      { currentMental: 0, timerSeconds: 0, mentalDown: true },
      {
        ...frameInput,
        deltaTimeSeconds: 1 / 60,
        recoveryMentalDownTimeSeconds: 0.7,
        recoveryValueFromMentalDown: 3,
      },
      mentalPorts,
    ).state.currentMental,
  ).toBe(0.071428582072258);
});

test('Live初期Mentalは育成済みcard Mental平均を0方向へ切り捨てる', () => {
  expect(calculateLiveInitialMental([{ mental: 100 }, { mental: 101 }, { mental: 103 }])).toBe(101);
  expect(() => calculateLiveInitialMental([])).toThrow('Mental cards are absent');
});

test('Live Mentalは通常時に厳密なdecrease interval超過ごとに1減少する', () => {
  const equalInterval = advanceLiveMentalGauge(
    { currentMental: 10, timerSeconds: 0, mentalDown: false },
    {
      deltaTimeSeconds: 1,
      decreaseIntervalSeconds: 1,
      recoveryMentalDownTimeSeconds: 2,
      recoveryValueFromMentalDown: 5,
      genesisSkillActive: false,
      mentalInfinity: false,
      disableMentalDown: false,
    },
    mentalPorts,
  );
  expect(equalInterval).toEqual({
    state: { currentMental: 10, timerSeconds: 1, mentalDown: false },
    gaugeDisplayValue: 10,
  });

  const multipleIntervals = advanceLiveMentalGauge(
    equalInterval.state,
    {
      deltaTimeSeconds: 2.5,
      decreaseIntervalSeconds: 1,
      recoveryMentalDownTimeSeconds: 2,
      recoveryValueFromMentalDown: 5,
      genesisSkillActive: false,
      mentalInfinity: false,
      disableMentalDown: false,
    },
    mentalPorts,
  );
  expect(multipleIntervals).toEqual({
    state: { currentMental: 7, timerSeconds: 0.5, mentalDown: false },
    gaugeDisplayValue: 7,
  });
});

test('Live Mentalはdecrease intervalが0以下なら0へ設定してMental Downへ遷移する', () => {
  expect(
    advanceLiveMentalGauge(
      { currentMental: 10, timerSeconds: 0.25, mentalDown: false },
      {
        deltaTimeSeconds: 0.5,
        decreaseIntervalSeconds: 0,
        recoveryMentalDownTimeSeconds: 2,
        recoveryValueFromMentalDown: 5,
        genesisSkillActive: false,
        mentalInfinity: false,
        disableMentalDown: false,
      },
      mentalPorts,
    ),
  ).toEqual({
    state: { currentMental: 0, timerSeconds: 0, mentalDown: true },
    gaugeDisplayValue: 0,
  });
});

test('DisableMentalDown有効中はMentalが0でもDownへ遷移しない', () => {
  expect(
    advanceLiveMentalGauge(
      { currentMental: 1, timerSeconds: 0, mentalDown: false },
      {
        deltaTimeSeconds: 2,
        decreaseIntervalSeconds: 1,
        recoveryMentalDownTimeSeconds: 2,
        recoveryValueFromMentalDown: 5,
        genesisSkillActive: false,
        mentalInfinity: false,
        disableMentalDown: true,
      },
      mentalPorts,
    ).state,
  ).toEqual({
    currentMental: 0,
    timerSeconds: 1,
    mentalDown: false,
  });
});

test('Live Mental Down中は指定時間でrecovery valueまで回復してDownを解除する', () => {
  const recovering = advanceLiveMentalGauge(
    { currentMental: 0, timerSeconds: 4, mentalDown: true },
    {
      deltaTimeSeconds: 1,
      decreaseIntervalSeconds: 1,
      recoveryMentalDownTimeSeconds: 2,
      recoveryValueFromMentalDown: 6,
      genesisSkillActive: false,
      mentalInfinity: false,
      disableMentalDown: false,
    },
    mentalPorts,
  );
  expect(recovering).toEqual({
    state: { currentMental: 3, timerSeconds: 5, mentalDown: true },
    gaugeDisplayValue: 3,
  });

  const recovered = advanceLiveMentalGauge(
    recovering.state,
    {
      deltaTimeSeconds: 1,
      decreaseIntervalSeconds: 1,
      recoveryMentalDownTimeSeconds: 2,
      recoveryValueFromMentalDown: 6,
      genesisSkillActive: false,
      mentalInfinity: true,
      disableMentalDown: false,
    },
    mentalPorts,
  );
  expect(recovered).toEqual({
    state: { currentMental: 6, timerSeconds: 0, mentalDown: false },
    gaugeDisplayValue: null,
  });
});
