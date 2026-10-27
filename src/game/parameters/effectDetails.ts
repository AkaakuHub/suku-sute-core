type EffectDetail = Readonly<{
  id: bigint;
  name: string;
  value: bigint;
  mood: 0 | 1 | 2 | 3;
  values: readonly bigint[] | null;
}>;
type DefaultDetail = Readonly<{ name: string; value: bigint; mood: 0 | 1 | 2 | 3 }>;
export type EffectParameters = Readonly<{
  details: readonly EffectDetail[];
  defaults: readonly DefaultDetail[];
  factors: ReadonlyMap<bigint, number>;
}>;

function parameterKey(id: bigint): bigint {
  return (id % 100n) + (id / 10000n) * 10000n;
}

export function setParameterFactor(
  parameters: EffectParameters,
  id: bigint,
  value: number,
): EffectParameters {
  const factors = new Map(parameters.factors);
  factors.set(parameterKey(id), Math.fround(value));
  return { ...parameters, factors };
}

export function removeParameterFactor(parameters: EffectParameters, id: bigint): EffectParameters {
  const factors = new Map(parameters.factors);
  factors.delete(parameterKey(id));
  return { ...parameters, factors };
}

export function effectDetailValue(parameters: EffectParameters, name: string): bigint {
  const detail = parameters.details.find((detail) => detail.name === name);
  if (!detail) return parameters.defaults.find((detail) => detail.name === name)?.value ?? 0n;
  const factor = parameters.factors.get(parameterKey(detail.id));
  if (factor === undefined) return detail.value;
  const value = Number(detail.value) * factor;
  if (value === Infinity) return -2147483648n;
  const rounded = Number.isNaN(value) ? 0 : Math.ceil(value);
  return BigInt(Math.max(-2147483648, Math.min(2147483647, rounded)));
}

export function effectDetailMood(parameters: EffectParameters, name: string): 0 | 1 | 2 | 3 {
  const detail =
    parameters.details.find((detail) => detail.name === name) ??
    parameters.defaults.find((detail) => detail.name === name);
  if (!detail) throw new Error('空模様の補正対象が未定義です。');
  return detail.mood;
}

export function effectDetailArray(
  parameters: EffectParameters,
  name: string,
): readonly bigint[] | null {
  return parameters.details.find((detail) => detail.name === name)?.values ?? null;
}
