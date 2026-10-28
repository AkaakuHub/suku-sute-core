import type { GameState, Track } from '../model.ts';

export function createInitialEffectState(
  track: Track,
): Pick<
  GameState,
  | 'fixedParameterBase'
  | 'maximumMental'
  | 'fixedParameterExtends'
  | 'nextFixedParameterExtendId'
  | 'specialAppealTokens'
  | 'handMaxCardEffects'
  | 'mentalShields'
  | 'handCollectionActivationCounts'
  | 'handUseActivationCounts'
  | 'handUseHeartCollectionCounts'
> {
  return {
    fixedParameterBase: { ap: track.stage.maxAp, voltage: 1000, mental: 100 },
    maximumMental: 100,
    fixedParameterExtends: [],
    nextFixedParameterExtendId: 1,
    specialAppealTokens: [],
    handMaxCardEffects: [],
    mentalShields: [],
    handCollectionActivationCounts: {},
    handUseActivationCounts: {},
    handUseHeartCollectionCounts: {},
  };
}
