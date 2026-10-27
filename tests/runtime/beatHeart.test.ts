import { expect, test } from 'vite-plus/test';
import { calculateLiveBeatHeart } from '../../src/runtime/live/beatHeart.ts';

test('Live Beat Heartはcardごとに0方向へ切り捨てて平均しbuffとratioを順番どおり適用する', () => {
  const calls: Array<readonly [string, number]> = [];
  const result = calculateLiveBeatHeart(
    {
      cards: [
        { beatPoint: 150, goodMood: 3 },
        { beatPoint: 250, goodMood: 3 },
      ],
      musicBeatPoint: 1,
      moodValue: 100,
      heartAppearRatio: 0.75,
    },
    {
      applyBeatPointBuff: (value) => {
        calls.push(['beat-point', value]);
        return value * 2;
      },
      applyBeatHeartBuff: (value) => {
        calls.push(['beat-heart', value]);
        return value + 0.75;
      },
    },
  );

  expect(calls).toEqual([
    ['beat-point', 1.5],
    ['beat-heart', 2],
  ]);
  expect(result).toEqual({ value: 2.75, createCount: 2 });
});

test('Live Beat HeartはBeat Heart buffが空ならratio適用後の整数をcountにする', () => {
  expect(
    calculateLiveBeatHeart(
      {
        cards: [{ beatPoint: 120, goodMood: 1 }],
        musicBeatPoint: 100,
        moodValue: 50,
        heartAppearRatio: 0.5,
      },
      {
        applyBeatPointBuff: (value) => value,
        applyBeatHeartBuff: null,
      },
    ),
  ).toEqual({ value: 90, createCount: 90 });
});

test('Live Beat Heartはruntimeと同じGoodMood分岐でmood倍率を決める', () => {
  const createCount = (moodValue: number, goodMood: 1 | 2 | 3) =>
    calculateLiveBeatHeart(
      {
        cards: [{ beatPoint: 100, goodMood }],
        musicBeatPoint: 100,
        moodValue,
        heartAppearRatio: 1,
      },
      {
        applyBeatPointBuff: (value) => value,
        applyBeatHeartBuff: null,
      },
    ).createCount;

  expect([createCount(40, 1), createCount(40, 2), createCount(40, 3)]).toEqual([140, 120, 100]);
  expect([createCount(-40, 1), createCount(-40, 2), createCount(-40, 3)]).toEqual([100, 120, 140]);
});
