export type AppealValues = Readonly<{ smile: number; pure: number; cool: number }>;
export type StyleParameters = Readonly<{ appeal: AppealValues; mental: number; beatPoint: number }>;
type CardParameters = Readonly<{
  appeal: AppealValues;
  mental: number;
  beatPoint: number;
  highestAppeal: 1 | 2 | 3;
}>;

export function cardParameters(
  main: StyleParameters,
  sides: readonly StyleParameters[],
): CardParameters {
  const combined = (property: (style: StyleParameters) => number) =>
    Math.fround(
      Math.fround(
        Math.fround(sides.reduce((sum, style) => sum + property(style), 0)) * Math.fround(0.1),
      ) + Math.fround(property(main)),
    );
  const appeal = {
    smile: combined((style) => style.appeal.smile),
    pure: combined((style) => style.appeal.pure),
    cool: combined((style) => style.appeal.cool),
  };
  let highestAppeal: 1 | 2 | 3 = 1;
  if (appeal.smile <= appeal.pure && appeal.cool <= appeal.pure) highestAppeal = 2;
  if (appeal.pure <= appeal.cool && appeal.smile <= appeal.cool) highestAppeal = 3;
  return {
    appeal,
    mental: combined((style) => style.mental),
    beatPoint: combined((style) => style.beatPoint),
    highestAppeal,
  };
}

export function appealParameter(
  base: number,
  additional: number,
  attributeFactor: number,
  durationSeconds: number,
): Readonly<{ value: number; simulation: number }> {
  const simulation = Math.fround(
    Math.fround(Math.fround(base) + Math.fround(additional)) * Math.fround(attributeFactor),
  );
  return {
    simulation,
    value: Math.fround(Math.fround(simulation / Math.fround(durationSeconds)) / 1000),
  };
}
