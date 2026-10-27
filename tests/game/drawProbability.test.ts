import { expect, it } from 'vite-plus/test';
import {
  drawProbability,
  type DrawProbabilityCondition,
  type DrawProbabilityContext,
} from '../../src/game/cards/drawProbability.ts';

const context: DrawProbabilityContext = {
  initial: false,
  skill: true,
  member: 1031,
  unit: 1,
  icon: 8,
  section: 2,
};

for (const condition of [
  { kind: 'member', value: 1031 },
  { kind: 'unit', value: 1 },
  { kind: 'icon', value: 8 },
  { kind: 'section', value: 2 },
] satisfies readonly DrawProbabilityCondition[]) {
  it(`${condition.kind}の一致条件と反転条件を判定する`, () => {
    expect(drawProbability([{ condition, negated: false, weight: -1 }], context)).toBe(-1);
    expect(drawProbability([{ condition, negated: true, weight: 0 }], context)).toBe(10_000);
  });
}

it('開始時条件は最初の補充だけ一致し、通常の引き直しで開始扱いに戻らない', () => {
  const rules = [{ condition: { kind: 'initial' as const }, negated: true, weight: -1 }];
  expect(drawProbability(rules, { ...context, initial: true, skill: false })).toBe(10_000);
  expect(drawProbability(rules, { ...context, skill: false })).toBe(-1);
});

it('効果以外の補充では前回使用者が残っていてもメンバー条件に一致しない', () => {
  expect(
    drawProbability(
      [
        { condition: { kind: 'member', value: 1031 }, negated: true, weight: 0 },
        { condition: { kind: 'member', value: 1031 }, negated: false, weight: -1 },
      ],
      { ...context, skill: false },
    ),
  ).toBe(0);
});

it('確率補正を登録順に1万分率で乗算し、各段階で切り捨てる', () => {
  expect(
    drawProbability(
      [
        { condition: { kind: 'section', value: 2 }, negated: false, weight: 3333 },
        { condition: { kind: 'section', value: 2 }, negated: false, weight: 3333 },
      ],
      context,
    ),
  ).toBe(1110);
});

it('優先指定に通常倍率を掛けても優先を保持し、禁止指定が来たら解除されない', () => {
  const condition = { kind: 'section' as const, value: 2 };
  expect(
    drawProbability(
      [
        { condition, negated: false, weight: -1 },
        { condition, negated: false, weight: 50_000 },
      ],
      context,
    ),
  ).toBe(-1);
  for (const weights of [
    [-1, 0, -1],
    [0, -1],
  ])
    expect(
      drawProbability(
        weights.map((weight) => ({ condition, negated: false, weight })),
        context,
      ),
    ).toBe(0);
});
