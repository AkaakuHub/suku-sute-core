export type DrawProbabilityCondition =
  | Readonly<{ kind: 'member' | 'icon' | 'unit' | 'section'; value: number }>
  | Readonly<{ kind: 'initial' }>;

export type DrawProbabilityRule = Readonly<{
  condition: DrawProbabilityCondition;
  negated: boolean;
  weight: number;
}>;

export type DrawProbabilityContext = Readonly<{
  initial: boolean;
  skill: boolean;
  member: number | null;
  unit: number | null;
  icon: number | null;
  section: number;
}>;

function matches(condition: DrawProbabilityCondition, context: DrawProbabilityContext): boolean {
  switch (condition.kind) {
    case 'initial':
      return context.initial;
    case 'section':
      return context.section === condition.value;
    case 'member':
      return context.skill && context.member === condition.value;
    case 'unit':
      return context.skill && context.unit === condition.value;
    case 'icon':
      return context.skill && context.icon === condition.value;
  }
}

export function drawProbability(
  rules: readonly DrawProbabilityRule[],
  context: DrawProbabilityContext,
): number {
  let weight = 10_000;
  for (const rule of rules) {
    if (weight === 0) break;
    if (!Number.isInteger(rule.weight) || rule.weight < -1 || rule.weight > 2_147_483_647)
      throw new Error('ドロー確率が正しくありません。');
    if (matches(rule.condition, context) === rule.negated) continue;
    if (weight < 0) {
      if (rule.weight === 0) weight = 0;
    } else if (rule.weight < 0) {
      weight = rule.weight;
    } else {
      weight = Number(BigInt.asIntN(32, (BigInt(weight) * BigInt(rule.weight)) / 10_000n));
    }
  }
  return weight;
}
