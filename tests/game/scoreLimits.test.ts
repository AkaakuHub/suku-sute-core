import { describe, expect, it } from 'vite-plus/test';
import { additionalScoreLimit } from '../../src/game/live/scoreLimit.ts';
import { calculateLiveAddScoreMax } from '../../src/runtime/live/clientScoreInput.ts';

const ordinary = {
  additionalEnabled: false,
  bonusScoreValue: 0,
  voltageMultiplier: 0n,
  genesisActive: false,
  currentGenesisGauge: 0,
};

describe('回収得点の上限補正', () => {
  it('追加設定がOFFでも開花中は専用値の平方根で上限を加算する', () => {
    expect(additionalScoreLimit({ ...ordinary, genesisActive: true, currentGenesisGauge: 4 })).toBe(
      3,
    );
    expect(
      calculateLiveAddScoreMax(100, [], {
        ...ordinary,
        genesisActive: true,
        currentGenesisGauge: 4,
      }),
    ).toBe(4n * 2147483647n);
    expect(
      calculateLiveAddScoreMax(100, [], {
        ...ordinary,
        genesisActive: true,
        currentGenesisGauge: 2147483647,
      }),
    ).toBe(65537n * 2147483647n);
  });
  it('開花中は通常の熱気による上限補正を置き換え、ゲージ0なら0で置き換える', () => {
    const enabled = { ...ordinary, additionalEnabled: true, voltageMultiplier: 50000n };
    expect(additionalScoreLimit(enabled)).toBe(5);
    expect(additionalScoreLimit({ ...enabled, genesisActive: true, currentGenesisGauge: 4 })).toBe(
      3,
    );
    expect(additionalScoreLimit({ ...enabled, genesisActive: true, currentGenesisGauge: 0 })).toBe(
      0,
    );
  });
  it('STAR増加による上限補正は6区間の式を使い、小数第1位へ切り上げる', () => {
    const check = (bonusScoreValue: number) =>
      additionalScoreLimit({ ...ordinary, additionalEnabled: true, bonusScoreValue });
    expect(check(1)).toBe(0.1);
    expect(check(10000000)).toBe(100);
    expect(check(100000000)).toBe(200);
    expect(check(1000000000)).toBe(300);
    expect(check(10000000000)).toBe(400);
    expect(check(100000000000)).toBe(800);
    expect(check(1e20)).toBe(1600);
    expect(additionalScoreLimit({ ...ordinary, bonusScoreValue: 1e20 })).toBe(0);
  });
});
