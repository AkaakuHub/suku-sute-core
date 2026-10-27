type DeactivationAction = Readonly<{
  type:
    | 'deactivate-token-deck'
    | 'deactivate-hand-limit'
    | 'deactivate-hand-max-card'
    | 'deactivate-ap-speed'
    | 'deactivate-skill-boost'
    | 'deactivate-voltage-convert'
    | 'deactivate-mental-heart-induce'
    | 'deactivate-combo-induce'
    | 'deactivate-heart-limit'
    | 'deactivate-voltage-increase'
    | 'deactivate-additional-heart'
    | 'deactivate-love-up-additional-buff'
    | 'deactivate-mental-recover-additional-buff'
    | 'deactivate-mental-barrier-additional-buff'
    | 'deactivate-mental-down'
    | 'deactivate-token-boost'
    | 'deactivate-infinity-gauge'
    | 'deactivate-skill-cooldown'
    | 'deactivate-induced-skill-effect'
    | 'deactivate-beat-heart-value-buff'
    | 'deactivate-mood-change-skill'
    | 'deactivate-heart-limit-boost'
    | 'deactivate-mood-value-boost'
    | 'deactivate-beat-point-buff'
    | 'deactivate-gauge-regeneration'
    | 'deactivate-search'
    | 'deactivate-heart-boost'
    | 'deactivate-skill-cost-change'
    | 'deactivate-skill-score-up'
    | 'deactivate-fixed-parameter-extend';
  deactivationKey: string;
}>;

export type Action =
  | Readonly<{ type: 'start' | 'pause' | 'resume' | 'collect' }>
  | Readonly<{ type: 'special'; cardId: string }>
  | Readonly<{ type: 'card'; index: number }>
  | Readonly<{ type: 'switch-token-deck' }>
  | Readonly<{ type: 'skip-ingame-mission' }>
  | DeactivationAction;
