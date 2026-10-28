export type HandUseTrigger =
  | Readonly<{ kind: 'member'; member: bigint }>
  | Readonly<{ kind: 'skill-main-effect'; mainEffect: bigint }>
  | Readonly<{ kind: 'unit'; unit: bigint }>
  | Readonly<{ kind: 'heart-quantity-count'; count: bigint }>
  | Readonly<{ kind: 'voltage-increase' | 'section-change' }>
  | Readonly<{ kind: 'same-card' | 'any-skill' }>;
