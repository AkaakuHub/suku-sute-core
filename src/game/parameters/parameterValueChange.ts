import type { Card, Effect, GameState } from '../model.ts';
import type { ParameterValueChangeEffect } from '../modelTypes.ts';

export function applyParameterValueChange(
  state: GameState,
  card: Card | undefined,
  effect: ParameterValueChangeEffect,
  reset = false,
): GameState {
  if (!card) throw new Error('詳細値変更の発動元カードがありません。');
  if (!effect.sourceEffectId) throw new Error('詳細値変更の識別子がありません。');
  const useCount = reset
    ? 0
    : (state.parameterValueChangeCounts[card.cardInstanceId]?.[effect.sourceEffectId] ?? 0);
  let factor: number;
  switch (effect.calculation) {
    case 'add':
      factor = Math.fround(
        Math.fround(effect.base / 10_000) +
          Math.fround(Math.fround(effect.increment / 10_000) * (useCount + (reset ? 0 : 1))),
      );
      break;
    case 'multiply': {
      if (reset) {
        factor = 1;
        break;
      }
      const values = effect.values;
      const value = values?.[Math.min(useCount, values.length - 1)];
      if (value === undefined) {
        throw new Error('詳細値変更の倍率がありません。');
      }
      factor = Math.fround(1 + Math.fround(Math.fround(value / 10_000) / 100));
      break;
    }
    case 'fan-level': {
      const total = (effect.members ?? []).reduce<number>(
        (sum, member) => sum + (state.supportLevels[member] ?? 0),
        0,
      );
      factor = Math.fround(
        Math.fround(effect.base / 10_000) +
          Math.fround(Math.fround(effect.increment / 10_000) * (reset ? 0 : total)),
      );
      break;
    }
  }
  const targetKey = parameterKey(effect.targetDetailId);
  const counts = state.parameterValueChangeCounts[card.cardInstanceId] ?? {};
  return {
    ...state,
    parameterValueChangeCounts: {
      ...state.parameterValueChangeCounts,
      [card.cardInstanceId]: {
        ...counts,
        [effect.sourceEffectId]: reset ? 0 : useCount + 1,
      },
    },
    parameterValueFactors: [
      ...state.parameterValueFactors.filter(
        (item) =>
          item.cardId !== card.cardInstanceId || parameterKey(item.targetDetailId) !== targetKey,
      ),
      {
        cardId: card.cardInstanceId,
        sourceEffectId: effect.sourceEffectId,
        targetDetailId: effect.targetDetailId,
        factor,
      },
    ],
  };
}

export function initializeParameterValueFactors(
  state: GameState,
  cards: readonly Card[] = state.deck,
): GameState {
  let next = state;
  for (const card of cards) {
    const effects = [
      ...card.effects,
      ...(card.ability893Effects ?? []),
      ...(card.ability894Effects ?? []),
      ...(card.drawEffects ?? []),
      ...(card.beforeUseEffects ?? []),
      ...(card.handInducers?.flatMap((inducer) => inducer.effects) ?? []),
      ...(card.modeParameterChanges?.off ?? []),
      ...(card.modeParameterChanges?.on ?? []),
      ...(card.collectionEffects?.effects ?? []),
      ...(card.special?.effects ?? []),
    ].flatMap(collectNestedEffects);
    for (const effect of effects) {
      if (effect.kind === 'parameter-value-change')
        next = applyParameterValueChange(next, card, effect, true);
    }
  }
  return next;
}

export function deactivateParameterValueChanges(
  state: GameState,
  card: Card,
  effects: readonly ParameterValueChangeEffect[],
): GameState {
  if (!effects.length) return state;
  const targets = new Set(effects.map((effect) => parameterKey(effect.targetDetailId)));
  return {
    ...state,
    parameterValueFactors: state.parameterValueFactors.filter(
      (factor) =>
        factor.cardId !== card.cardInstanceId || !targets.has(parameterKey(factor.targetDetailId)),
    ),
  };
}

export function activateModeParameterChanges(
  state: GameState,
  card: Card,
  isOn: boolean,
): GameState {
  return ((isOn ? card.modeParameterChanges?.on : card.modeParameterChanges?.off) ?? []).reduce(
    (next, effect) => applyParameterValueChange(next, card, effect),
    state,
  );
}

function collectNestedEffects(effect: Effect): readonly Effect[] {
  const nested =
    effect.kind === 'branch'
      ? [...effect.whenTrue, ...effect.whenFalse]
      : effect.kind === 'conditional' || effect.kind === 'mode-reaction'
        ? effect.effects
        : effect.kind === 'draw-success-induce'
          ? [...effect.whenTrue, ...effect.whenFalse]
          : effect.kind === 'voltage-tier'
            ? effect.tiers.flat()
            : [];
  return [effect, ...nested.flatMap(collectNestedEffects)];
}

function resolveParameterDetailValue(
  state: GameState,
  card: Card | undefined,
  effect: Readonly<{
    parameterDetails?: Readonly<
      Record<string, { id: bigint; value: bigint; unitsPerValue: number }>
    >;
  }>,
  key: string,
  fallback: number,
): number {
  const detail = effect.parameterDetails?.[key];
  if (!detail) return fallback;
  if (!Number.isFinite(detail.unitsPerValue) || detail.unitsPerValue <= 0)
    throw new Error('詳細値の換算単位が正しくありません。');
  const factor = card
    ? state.parameterValueFactors.find(
        (item) =>
          item.cardId === card.cardInstanceId &&
          parameterKey(item.targetDetailId) === parameterKey(detail.id),
      )?.factor
    : undefined;
  if (factor === undefined) return Number(detail.value) / detail.unitsPerValue;
  const multiplied = Number(detail.value) * factor;
  const adjusted =
    multiplied === Infinity
      ? -2147483648
      : Math.max(
          -2147483648,
          Math.min(2147483647, Number.isNaN(multiplied) ? 0 : Math.ceil(multiplied)),
        );
  return adjusted / detail.unitsPerValue;
}

function resolveParameterDetailInteger(
  state: GameState,
  card: Card | undefined,
  effect: Readonly<{
    parameterDetails?: Readonly<
      Record<string, { id: bigint; value: bigint; unitsPerValue: number }>
    >;
  }>,
  key: string,
  fallback: bigint,
): bigint {
  const detail = effect.parameterDetails?.[key];
  if (!detail) return fallback;
  if (detail.unitsPerValue !== 1) throw new Error('整数詳細値の換算単位が正しくありません。');
  const factor = card
    ? state.parameterValueFactors.find(
        (item) =>
          item.cardId === card.cardInstanceId &&
          parameterKey(item.targetDetailId) === parameterKey(detail.id),
      )?.factor
    : undefined;
  if (factor === undefined) return detail.value;
  const multiplied = Number(detail.value) * factor;
  const adjusted =
    multiplied === Infinity
      ? -2147483648
      : Math.max(
          -2147483648,
          Math.min(2147483647, Number.isNaN(multiplied) ? 0 : Math.ceil(multiplied)),
        );
  return BigInt(adjusted);
}

export function resolveEffectParameterDetails(
  state: GameState,
  card: Card | undefined,
  effect: Effect,
): Effect {
  if (!effect.parameterDetails) return effect;
  if (effect.kind === 'hand-limit') {
    return {
      ...effect,
      calculationType: int32(
        resolveParameterDetailInteger(
          state,
          card,
          effect,
          'calculationType',
          BigInt(effect.calculationType),
        ),
      ),
      amount: Number(
        BigInt.asIntN(
          32,
          resolveParameterDetailInteger(state, card, effect, 'amount', BigInt(effect.amount)),
        ),
      ),
      displayTimeType: int32(
        resolveParameterDetailInteger(
          state,
          card,
          effect,
          'displayTimeType',
          BigInt(effect.displayTimeType),
        ),
      ),
      displayTime: resolveParameterDetailInteger(
        state,
        card,
        effect,
        'displayTime',
        effect.displayTime,
      ),
    };
  }
  if (effect.kind === 'ap-speed-change') {
    const calculationType = int32(
      resolveParameterDetailInteger(
        state,
        card,
        effect,
        'calculationType',
        BigInt(effect.calculationType),
      ),
    );
    if (calculationType !== 1 && calculationType !== 2)
      throw new Error('AP回復速度変更の計算種別が正しくありません。');
    return {
      ...effect,
      calculationType,
      num: resolveParameterDetailInteger(state, card, effect, 'num', effect.num),
      bonusMoodValue: resolveParameterDetailInteger(
        state,
        card,
        effect,
        'bonusMoodValue',
        effect.bonusMoodValue,
      ),
      displayTimeType: resolveParameterDetailInteger(
        state,
        card,
        effect,
        'displayTimeType',
        effect.displayTimeType,
      ),
      displayTime: resolveParameterDetailInteger(
        state,
        card,
        effect,
        'displayTime',
        effect.displayTime,
      ),
    };
  }
  if (effect.kind === 'heart-limit-change') {
    const calculationType = int32(
      resolveParameterDetailInteger(
        state,
        card,
        effect,
        'calculationType',
        BigInt(effect.calculationType),
      ),
    );
    if (calculationType !== 1 && calculationType !== 2)
      throw new Error('きらめき上限変更の計算種別が正しくありません。');
    return {
      ...effect,
      calculationType,
      num: resolveParameterDetailInteger(state, card, effect, 'num', effect.num),
      bonusMoodValue: resolveParameterDetailInteger(
        state,
        card,
        effect,
        'bonusMoodValue',
        effect.bonusMoodValue,
      ),
      duration:
        effect.duration.kind === 'stage'
          ? effect.duration
          : {
              ...effect.duration,
              value: resolveParameterDetailInteger(
                state,
                card,
                effect,
                'displayTime',
                effect.duration.value,
              ),
            },
    };
  }
  const resolved = { ...effect };
  for (const [key] of Object.entries(effect.parameterDetails)) {
    const value = Object.getOwnPropertyDescriptor(effect, key)?.value;
    if (typeof value === 'number') {
      Object.defineProperty(resolved, key, {
        value: resolveParameterDetailValue(state, card, effect, key, value),
      });
      continue;
    }
    if (typeof value === 'bigint') {
      Object.defineProperty(resolved, key, {
        value: resolveParameterDetailInteger(state, card, effect, key, value),
      });
    }
  }
  return resolved;
}

function parameterKey(id: bigint): bigint {
  return (id / 10_000n) * 10_000n + (id % 100n);
}

function int32(value: bigint): number {
  return Number(BigInt.asIntN(32, value));
}
