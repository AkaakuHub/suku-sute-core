import type {
  FixedParameterExtend,
  FixedParameterExtendEffect,
} from '../fixedParameterExtendTypes.ts';
import type { Card, GameState } from '../model.ts';
import { energyMaximum, changeMaximum } from '../parameters/maximum.ts';
import { voltageThreshold } from '../live/voltageLevel.ts';
import { applyAction52SkillBoostForCard } from './action52SkillBoost.ts';
import { int64ToFloat32 } from '../../runtime/numeric.ts';
import stageVoltageLevelSettingCount from '../../master/stageVoltageLevelSettingCount.json';

export function activateFixedParameterExtend(
  state: GameState,
  effect: FixedParameterExtendEffect,
  card: Card | undefined,
): GameState {
  if (effect.calculation !== 'fixed' && !card)
    throw new Error('固定パラメーター上限変更の発動元カードがありません。');
  const value = int32(effect.value);
  const boosted =
    effect.calculation === 'fixed'
      ? { state, value }
      : applyAction52SkillBoostForCard(state, card, value);
  const durationValue = effect.duration.kind === 'stage' ? 0 : int32(effect.duration.value);
  const fixedParameterExtend: FixedParameterExtend = {
    id: boosted.state.nextFixedParameterExtendId,
    target: effect.target,
    calculation: effect.calculation,
    value: int32(boosted.value),
    remainingSeconds:
      effect.duration.kind === 'milliseconds'
        ? Math.fround(int64ToFloat32(effect.duration.value) / 1000)
        : null,
    remainingSections: effect.duration.kind === 'sections' ? durationValue : null,
    deactivationKey: effect.deactivationKey ?? null,
  };
  return recalculateFixedParameters({
    ...boosted.state,
    fixedParameterExtends: [...boosted.state.fixedParameterExtends, fixedParameterExtend],
    nextFixedParameterExtendId: boosted.state.nextFixedParameterExtendId + 1,
  });
}

export function deactivateFixedParameterExtends(
  state: GameState,
  deactivationKey: string,
): GameState {
  const fixedParameterExtends = state.fixedParameterExtends.filter(
    (effect) => effect.deactivationKey !== deactivationKey,
  );
  return fixedParameterExtends.length === state.fixedParameterExtends.length
    ? state
    : recalculateFixedParameters({ ...state, fixedParameterExtends });
}

function int32(value: number | bigint): number {
  return Number(BigInt.asIntN(32, typeof value === 'bigint' ? value : BigInt(Math.trunc(value))));
}

export function advanceFixedParameterExtends(state: GameState, elapsedSeconds: number): GameState {
  const retained = state.fixedParameterExtends.flatMap((effect) => {
    if (effect.remainingSeconds === null) return [effect];
    const remainingSeconds = Math.fround(effect.remainingSeconds - Math.fround(elapsedSeconds));
    return remainingSeconds > 0 ? [{ ...effect, remainingSeconds }] : [];
  });
  return retained.length === state.fixedParameterExtends.length
    ? state
    : recalculateFixedParameters({ ...state, fixedParameterExtends: retained });
}

export function expireFixedParameterExtendSections(state: GameState): GameState {
  const retained = state.fixedParameterExtends.flatMap((effect) => {
    if (effect.remainingSections === null) return [effect];
    const remainingSections = effect.remainingSections - 1;
    return remainingSections > 0 ? [{ ...effect, remainingSections }] : [];
  });
  return retained.length === state.fixedParameterExtends.length
    ? state
    : recalculateFixedParameters({ ...state, fixedParameterExtends: retained });
}

export function changeFixedParameterBase(
  state: GameState,
  target: 'ap' | 'voltage',
  amount: number,
): GameState {
  return recalculateFixedParameters({
    ...state,
    fixedParameterBase: {
      ...state.fixedParameterBase,
      [target]: state.fixedParameterBase[target] + amount,
    },
  });
}

function recalculateFixedParameters(state: GameState): GameState {
  const maximum = (target: FixedParameterExtend['target'], origin: number) =>
    changeMaximum(
      origin,
      state.fixedParameterExtends
        .filter((effect) => effect.target === target)
        .map((effect) => ({ calculation: effect.calculation, value: effect.value })),
    );
  const maxAp = energyMaximum(
    state.fixedParameterBase.ap,
    state.fixedParameterExtends
      .filter((effect) => effect.target === 'ap')
      .map((effect) => ({ calculation: effect.calculation, value: effect.value })),
  );
  const maximumVoltageLevel = Math.max(
    1,
    Math.min(stageVoltageLevelSettingCount, maximum('voltage', state.fixedParameterBase.voltage)),
  );
  const mental = maximum('mental', state.fixedParameterBase.mental);
  const maximumMental = Math.max(1, Math.min(mental, state.fixedParameterBase.mental * 10));
  const apInfinite = state.gaugeInfinities.some(
    (infinity) => infinity.gauge === 'ap' && !infinity.suspended,
  );
  const voltageInfinite = state.gaugeInfinities.some(
    (infinity) => infinity.gauge === 'voltage' && !infinity.suspended,
  );
  return {
    ...state,
    maximumVoltageLevel,
    maximumMental,
    ap: {
      ...state.ap,
      maxAp: maxAp,
      currentAp: apInfinite ? maxAp : Math.min(state.ap.currentAp, maxAp),
    },
    voltage: {
      ...state.voltage,
      currentVoltage: voltageInfinite
        ? voltageThreshold(maximumVoltageLevel)
        : state.voltage.currentVoltage,
    },
  };
}
