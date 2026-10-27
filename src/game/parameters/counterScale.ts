type CounterScale =
  | Readonly<{ kind: 'add'; base: number; increment: number }>
  | Readonly<{ kind: 'multiply'; values: readonly number[] }>
  | Readonly<{ kind: 'support'; base: number; increment: number; members: readonly number[] }>;

export function counterScale(
  rule: CounterScale,
  count: number,
  reset: boolean,
  supportLevels: Readonly<Record<number, number>>,
): number {
  const raw = (value: number) => Math.fround(Math.fround(value) / 10000);
  switch (rule.kind) {
    case 'add':
      return Math.fround(
        raw(rule.base) + Math.fround(raw(rule.increment) * Math.fround(count + (reset ? 0 : 1))),
      );
    case 'multiply': {
      if (reset) return 1;
      const value = rule.values[Math.min(count, rule.values.length - 1)];
      if (value === undefined) throw new Error('パラメータ倍率の配列が空です。');
      return Math.fround(Math.fround(raw(value) / 100) + 1);
    }
    case 'support': {
      const total = rule.members.reduce((sum, id) => sum + (supportLevels[id] ?? 0), 0);
      return Math.fround(
        raw(rule.base) +
          Math.fround(Math.fround(raw(rule.increment) * Math.fround(total)) * (reset ? 0 : 1)),
      );
    }
  }
}
