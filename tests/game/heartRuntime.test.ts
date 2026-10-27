import { describe, expect, it } from 'vite-plus/test';
import {
  createStarGatherHeartRuntimeState,
  spawnStarGatherBeatHearts,
} from '../../src/game/live/heartSpawn.ts';
import {
  advanceStarGatherHeartRuntime,
  collectStarGatherHeartRuntime,
} from '../../src/game/live/heartRuntime.ts';
import { liveHeartCount } from '../../src/runtime/live/heartRuntime.ts';
import { projectLiveHeartPresentations } from '../../src/runtime/live/heartPresentation.ts';
import { createRangeRandom } from '../../src/game/random.ts';

describe('きらめきの生成と移動', () => {
  it('生成音は個数や表示上限ではなく非0の生成要求ごとに数える', () => {
    const maximum = (_minimum: number, upper: number) => upper;
    const initial = createStarGatherHeartRuntimeState(30);
    const empty = spawnStarGatherBeatHearts(initial, 0, maximum);
    expect(empty.state.generationCount).toBe(0);
    const full = spawnStarGatherBeatHearts(empty.state, 100, maximum);
    expect(full.state.generationCount).toBe(1);
    const overflow = spawnStarGatherBeatHearts(full.state, 100, maximum);
    expect(overflow.state.generationCount).toBe(2);
    expect(liveHeartCount(overflow.state)).toBe(100);
  });

  it('回収時間のFloat32上端でも連打の次の更新を受け付ける', () => {
    const maximum = (_minimum: number, upper: number) => upper;
    const spawned = spawnStarGatherBeatHearts(createStarGatherHeartRuntimeState(30), 1, maximum);
    const collected = collectStarGatherHeartRuntime(spawned.state, maximum);
    expect(collected.state.stageHearts[0]?.collectMoveDurationSeconds).toBe(Math.fround(1.1));
    expect(() => advanceStarGatherHeartRuntime(collected.state, 1 / 60, false)).not.toThrow();
  });

  it('回収音は表示分だけ到着前70〜100%で鳴り、連打で前の予約が消えない', () => {
    const maximum = (_minimum: number, upper: number) => upper;
    const initial = {
      ...createStarGatherHeartRuntimeState(30),
      showPercentage: 100,
      showLimit: 10,
    };
    const first = spawnStarGatherBeatHearts(initial, 100, maximum);
    const collected = collectStarGatherHeartRuntime(first.state, maximum);
    expect(collected.state.collectionSoundDelays).toHaveLength(10);
    expect(
      advanceStarGatherHeartRuntime(collected.state, 1, false).state.collectionSoundCount,
    ).toBe(0);
    const second = spawnStarGatherBeatHearts(collected.state, 5, maximum);
    const recollected = collectStarGatherHeartRuntime(second.state, maximum);
    expect(recollected.state.collectionSoundDelays).toHaveLength(10);
    const arrived = advanceStarGatherHeartRuntime(recollected.state, 1.2, false);
    expect(arrived.state.collectionSoundCount).toBe(10);
    expect(arrived.state.collectionSoundDelays).toHaveLength(0);
    expect(advanceStarGatherHeartRuntime(arrived.state, 1, false).state.collectionSoundCount).toBe(
      10,
    );
  });

  it('本家の生成範囲・飛び出す距離・時間を乱数で決める', () => {
    const random = createRangeRandom(7);
    const spawned = spawnStarGatherBeatHearts(
      createStarGatherHeartRuntimeState(30),
      100,
      random.range,
    );
    expect(spawned.state.baseLifeTimeSeconds).toBe(2.5);
    expect(spawned.state.stageHearts).toHaveLength(50);
    expect(liveHeartCount(spawned.state)).toBe(100);
    const positions = new Set(spawned.state.stageHearts.map((heart) => heart.waitPosition.x));
    expect(positions.size).toBe(50);
    for (const heart of spawned.state.stageHearts) {
      expect(heart.waitPosition.x).toBeGreaterThanOrEqual(-5.5);
      expect(heart.waitPosition.x).toBeLessThanOrEqual(5.5);
      expect(heart.waitPosition.y).toBeGreaterThanOrEqual(-1.5);
      expect(heart.waitPosition.y).toBeLessThanOrEqual(0.5);
      expect(heart.waitPosition.y - heart.spawnStartPosition.y).toBeCloseTo(1, 0);
      expect(heart.spawnDurationSeconds).toBeGreaterThanOrEqual(0.45);
      expect(heart.spawnDurationSeconds).toBeLessThanOrEqual(0.55);
    }
  });

  it('IDに依存せず、異なる乱数seedでは異なる位置となる', () => {
    const first = createRangeRandom(7);
    const second = createRangeRandom(8);
    const base = createStarGatherHeartRuntimeState(30);
    expect(spawnStarGatherBeatHearts(base, 10, first.range).state).not.toEqual(
      spawnStarGatherBeatHearts(base, 10, second.range).state,
    );
  });

  it('出現時は透明で下から飛び出し、回収後は個数から除いて移動を続ける', () => {
    const random = createRangeRandom(7);
    const spawned = spawnStarGatherBeatHearts(
      createStarGatherHeartRuntimeState(30),
      10,
      random.range,
    );
    const initial = projectLiveHeartPresentations(spawned.state.stageHearts, 0);
    expect(initial[0]?.alpha).toBe(0);
    const advanced = advanceStarGatherHeartRuntime(spawned.state, 0.5, false);
    const visible = projectLiveHeartPresentations(advanced.state.stageHearts, 0);
    expect(visible[0]?.position.y).toBeGreaterThan(initial[0]?.position.y ?? 0);
    const collected = collectStarGatherHeartRuntime(advanced.state, random.range);
    expect(liveHeartCount(collected.state)).toBe(0);
    expect(collected.state.stageHearts.length).toBeGreaterThan(0);
    expect(
      advanceStarGatherHeartRuntime(collected.state, 1.2, false).state.stageHearts,
    ).toHaveLength(0);
  });
});
