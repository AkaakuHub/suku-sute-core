export type BuffGroup = 'deck' | 'mastery' | 'skill' | 'section' | 'grade' | 'challenge';
export type ParameterBuff = Readonly<{
  kind: 'add' | 'multiply' | 'multiply-percent' | 'fixed';
  value: number;
  group: BuffGroup;
}>;

export function applyOrderedBuffs(base: number, buffs: readonly ParameterBuff[]): number {
  return buffs.reduce((value, buff) => {
    const amount = Math.fround(buff.value);
    switch (buff.kind) {
      case 'add':
        return value + amount;
      case 'multiply':
        return value * amount;
      case 'fixed':
        return amount;
      case 'multiply-percent':
        throw new Error('順序付きパラメータは割合加算に対応していません。');
    }
  }, base);
}

export function applyGroupedBuffs(base: number, buffs: readonly ParameterBuff[]): number {
  let value = base;
  const groups = new Map<BuffGroup, number[]>();
  for (const buff of buffs) {
    const amount = Math.fround(buff.value);
    if (buff.kind === 'add') value += amount;
    else if (buff.kind === 'multiply') {
      const group = groups.get(buff.group);
      if (group) group.push(amount);
      else groups.set(buff.group, [amount]);
    } else throw new Error('パラメータのグループに未対応の計算種別です。');
  }
  for (const factors of groups.values()) {
    const sum = factors.reduce((total, factor) => Math.fround(total + Math.fround(factor - 1)), 0);
    value *= Math.fround(Math.max(-1, sum) + 1);
  }
  return value;
}

export function applyPercentBuffs(base: number, percentages: readonly number[]): number {
  const sum = percentages.reduce((total, percent) => Math.fround(total + Math.fround(percent)), 0);
  return (Math.max(-100, sum) * base) / 100 + base;
}

type ParameterValue = Readonly<{
  base: number;
  minimumBase: number;
  maximumBase: number;
  minimum: number;
  maximum: number;
  buffs: readonly ParameterBuff[];
}>;

export function parameterValue(
  parameter: ParameterValue,
): Readonly<{ value: number; unclamped: number }> {
  const base = Math.max(parameter.minimumBase, Math.min(parameter.maximumBase, parameter.base));
  const unclamped = applyGroupedBuffs(base, parameter.buffs);
  return { value: Math.max(parameter.minimum, Math.min(parameter.maximum, unclamped)), unclamped };
}
