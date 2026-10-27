import { describe, expect, it } from 'vite-plus/test';
import { counterScale } from '../../src/game/parameters/counterScale.ts';
import {
  effectDetailValue,
  effectDetailMood,
  effectDetailArray,
  setParameterFactor,
  removeParameterFactor,
  type EffectParameters,
} from '../../src/game/parameters/effectDetails.ts';

const parameters: EffectParameters = {
  details: [{ id: 12340123n, name: 'value', value: 10000n, mood: 3, values: [1n, 2n] }],
  defaults: [{ name: 'default', value: 50n, mood: 1 }],
  factors: new Map(),
};

describe('カード効果の可変パラメータ', () => {
  it('加算型は発動済み回数と今回分を使い、リセットでは今回分を足さない', () => {
    const rule = { kind: 'add' as const, base: 10000, increment: 10000 };
    expect(counterScale(rule, 0, true, {})).toBe(1);
    expect(counterScale(rule, 0, false, {})).toBe(2);
    expect(counterScale(rule, 2, false, {})).toBe(4);
  });
  it('倍率配列は回数に応じて選び、上限後は最後の値を継続する', () => {
    const rule = { kind: 'multiply' as const, values: [1000000, 2000000] };
    expect(counterScale(rule, 0, true, {})).toBe(1);
    expect(counterScale(rule, 0, false, {})).toBe(2);
    expect(counterScale(rule, 10, false, {})).toBe(3);
    expect(() => counterScale({ ...rule, values: [] }, 0, false, {})).toThrow();
  });
  it('対象メンバーのサポート値だけを合計し、リセット時は基礎値に戻る', () => {
    const rule = { kind: 'support' as const, base: 10000, increment: 5000, members: [1021, 1031] };
    const levels = { 1021: 10, 1031: 20, 1032: 100 };
    expect(counterScale(rule, 0, false, levels)).toBe(16);
    expect(counterScale(rule, 0, true, levels)).toBe(1);
  });
  it('レベル部分の異なる詳細IDも同じパラメータとして倍率を上書きする', () => {
    let scaled = setParameterFactor(parameters, 12349923n, 2);
    expect(effectDetailValue(scaled, 'value')).toBe(20000n);
    scaled = setParameterFactor(scaled, 12340223n, 3);
    expect(effectDetailValue(scaled, 'value')).toBe(30000n);
    expect(scaled.factors.size).toBe(1);
    expect(effectDetailValue(removeParameterFactor(scaled, 12340323n), 'value')).toBe(10000n);
  });
  it('既定値・未定義の0・空模様対象・配列の取得を分ける', () => {
    expect(effectDetailValue(parameters, 'default')).toBe(50n);
    expect(effectDetailValue(parameters, 'missing')).toBe(0n);
    expect(effectDetailMood(parameters, 'value')).toBe(3);
    expect(effectDetailMood(parameters, 'default')).toBe(1);
    expect(() => effectDetailMood(parameters, 'missing')).toThrow();
    expect(effectDetailArray(parameters, 'value')).toEqual([1n, 2n]);
    expect(effectDetailArray(parameters, 'default')).toBeNull();
  });
  it('倍率適用後は正の無限大方向へ32bit整数に変換し、無限大は最小値にする', () => {
    expect(effectDetailValue(setParameterFactor(parameters, 12340123n, 0.125), 'value')).toBe(
      1250n,
    );
    expect(effectDetailValue(setParameterFactor(parameters, 12340123n, 0.123456), 'value')).toBe(
      1235n,
    );
    expect(effectDetailValue(setParameterFactor(parameters, 12340123n, -0.123456), 'value')).toBe(
      -1234n,
    );
    expect(effectDetailValue(setParameterFactor(parameters, 12340123n, NaN), 'value')).toBe(0n);
    expect(effectDetailValue(setParameterFactor(parameters, 12340123n, 1e20), 'value')).toBe(
      2147483647n,
    );
    expect(effectDetailValue(setParameterFactor(parameters, 12340123n, Infinity), 'value')).toBe(
      -2147483648n,
    );
  });
});
