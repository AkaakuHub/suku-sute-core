import { expect, test } from 'vite-plus/test';
import {
  advanceLiveHeartRuntime,
  calculateLiveHeartBaseLifeTimeSeconds,
  changeLiveHeartLimit,
  collectLiveHeartRuntime,
  createLiveHeartRuntimeState,
  liveHeartCount,
  spawnLiveBeatHearts,
  spawnLiveHearts,
} from '../../src/runtime/live/heartRuntime.ts';

const midpointRandom = (minimum: number, maximum: number) => (minimum + maximum) / 2;

test('Music finish timeからbinary32演算順でHeart寿命を算出する', () => {
  expect(calculateLiveHeartBaseLifeTimeSeconds(139.259)).toBe(11.604);
  expect(createLiveHeartRuntimeState(139.259)).toMatchObject({
    heartLimit: 100,
    showLimit: 50,
    throwLimit: 100,
    showPercentage: 50,
    baseLifeTimeSeconds: 11.604,
  });
});

test('Beat Heartを表示率50%でstageとhidden batchへ分けて上限超過数を返す', () => {
  const initial = createLiveHeartRuntimeState(139.259);
  const first = spawnLiveBeatHearts(initial, 98, midpointRandom);
  const second = spawnLiveBeatHearts(first.state, 5, midpointRandom);
  expect(liveHeartCount(second.state)).toBe(100);
  expect(second.state.stageHearts).toHaveLength(50);
  expect(
    second.state.stageHearts.every(
      (heart) => heart.phase === 'throw' && heart.showState === 'show',
    ),
  ).toBe(true);
  expect(second.state.hiddenHeartBatches).toEqual([
    { count: 49, lifeTimeSeconds: 11.604 },
    { count: 1, lifeTimeSeconds: 11.604 },
  ]);
  expect(second.overflowCount).toBe(3);
});

test('Skill HeartはBeat Heartと同じ生成経路で指定寿命を使う', () => {
  const spawned = spawnLiveHearts(createLiveHeartRuntimeState(120), 3, 2.5, midpointRandom);
  expect(spawned.state.stageHearts.map((heart) => heart.lifeTimeSeconds)).toEqual([2.5, 2.5]);
  expect(spawned.state.hiddenHeartBatches).toEqual([{ count: 1, lifeTimeSeconds: 2.5 }]);
});

test('Heart上限低下時は残存寿命が長いstage Heartからlapseする', () => {
  const shortLived = spawnLiveHearts(
    {
      ...createLiveHeartRuntimeState(120),
      showPercentage: 100,
    },
    2,
    2,
    midpointRandom,
  ).state;
  const all = spawnLiveHearts(shortLived, 2, 9, midpointRandom).state;
  const changed = changeLiveHeartLimit(all, 2);

  expect(changed.lapsedCount).toBe(2);
  expect(changed.state.stageHearts.map(({ lifeTimeSeconds }) => lifeTimeSeconds)).toEqual([2, 2]);
});

test('Heart上限低下時は後から追加したhidden batchも上限へ収める', () => {
  const shortLived = spawnLiveHearts(
    {
      ...createLiveHeartRuntimeState(120),
      showPercentage: 0,
    },
    2,
    2,
    midpointRandom,
  ).state;
  const all = spawnLiveHearts(shortLived, 3, 9, midpointRandom).state;
  const changed = changeLiveHeartLimit(all, 2);

  expect(changed.lapsedCount).toBe(3);
  expect(changed.state.hiddenHeartBatches).toEqual([{ count: 2, lifeTimeSeconds: 2 }]);
});

test('表示枠を超えたThrow HeartをHideAfterThrowへ分類する', () => {
  const state = {
    ...createLiveHeartRuntimeState(120),
    showLimit: 2,
    showPercentage: 100,
  };
  const spawned = spawnLiveBeatHearts(state, 5, midpointRandom);
  expect(spawned.state.stageHearts.map((heart) => heart.showState)).toEqual([
    'show',
    'show',
    'hide-after-throw',
    'hide-after-throw',
    'hide-after-throw',
  ]);
  expect(spawned.state.hiddenHeartBatches).toEqual([]);
});

test('残り3秒未満でFlashへ移り次の更新で通常lapseする', () => {
  const spawned = spawnLiveBeatHearts(
    {
      ...createLiveHeartRuntimeState(12),
      showPercentage: 100,
    },
    2,
    midpointRandom,
  ).state;
  const flashing = advanceLiveHeartRuntime(spawned, 0.8, false);
  expect(
    flashing.state.stageHearts.map(({ phase, showState }) => ({
      phase,
      showState,
    })),
  ).toEqual([
    { phase: 'flash', showState: 'show' },
    { phase: 'flash', showState: 'show' },
  ]);
  const lapsed = advanceLiveHeartRuntime(flashing.state, 3, false);
  expect(liveHeartCount(lapsed.state)).toBe(0);
  expect(lapsed.lapsedCount).toBe(2);
  expect(lapsed.autoCollectCount).toBe(0);
});

test('Auto Playでは寿命切れHeartをlapseせず回収数へ渡す', () => {
  const spawned = spawnLiveBeatHearts(
    {
      ...createLiveHeartRuntimeState(12),
      showPercentage: 100,
    },
    3,
    midpointRandom,
  ).state;
  const flashing = advanceLiveHeartRuntime(spawned, 0.8, true);
  const collected = advanceLiveHeartRuntime(flashing.state, 3, true);
  expect(collected.lapsedCount).toBe(0);
  expect(collected.autoCollectCount).toBe(3);
});

test('hidden batchも寿命切れ時に全件をlapseへ渡す', () => {
  const spawned = spawnLiveBeatHearts(createLiveHeartRuntimeState(12), 3, midpointRandom).state;
  expect(spawned.stageHearts).toHaveLength(2);
  expect(spawned.hiddenHeartBatches).toEqual([{ count: 1, lifeTimeSeconds: 1 }]);
  const flashing = advanceLiveHeartRuntime(spawned, 0.8, false);
  const lapsed = advanceLiveHeartRuntime(flashing.state, 3, false);
  expect(liveHeartCount(lapsed.state)).toBe(0);
  expect(lapsed.lapsedCount).toBe(3);
});

test('Heart回収は表示中とhiddenを一括消費し表示中のanimation件数を分離する', () => {
  const spawned = spawnLiveBeatHearts(createLiveHeartRuntimeState(120), 5, midpointRandom).state;
  const collected = collectLiveHeartRuntime(spawned, midpointRandom);

  expect(collected.collectCount).toBe(5);
  expect(collected.animationHeartCount).toBe(3);
  expect(liveHeartCount(collected.state)).toBe(0);
  expect(collected.state.stageHearts).toHaveLength(3);
  expect(collected.state.stageHearts.every((heart) => heart.phase === 'collect')).toBe(true);

  const during = advanceLiveHeartRuntime(collected.state, 0.999, false);
  expect(during.state.stageHearts).toHaveLength(3);
  expect(during.lapsedCount).toBe(0);
  expect(during.autoCollectCount).toBe(0);

  const completed = advanceLiveHeartRuntime(during.state, 0.001, false);
  expect(completed.state.stageHearts).toHaveLength(0);
});

test('Heartごとに保存済み範囲から出現位置と移動時間を生成する', () => {
  const values = [-5.5, 0.5, 1.2, 1.1];
  const spawned = spawnLiveBeatHearts(
    {
      ...createLiveHeartRuntimeState(120),
      showPercentage: 100,
    },
    1,
    (minimum, maximum) => {
      const value = values.shift();
      if (value === undefined || value < minimum || value > maximum) {
        throw new Error('deterministic random value is invalid');
      }
      return value;
    },
  );
  expect(spawned.state.stageHearts[0]).toMatchObject({
    waitPosition: { x: -5.5, y: 0.5 },
    spawnElapsedSeconds: 0,
    phase: 'throw',
  });
  expect(spawned.state.stageHearts[0]?.spawnStartPosition.y).toBeCloseTo(-0.7);
  expect(spawned.state.stageHearts[0]?.spawnDurationSeconds).toBeCloseTo(0.55);

  const waiting = advanceLiveHeartRuntime(spawned.state, 0.55, false);
  expect(waiting.state.stageHearts[0]?.spawnElapsedSeconds).toBeCloseTo(0.55);
  expect(waiting.state.stageHearts[0]?.phase).toBe('wait');
});
