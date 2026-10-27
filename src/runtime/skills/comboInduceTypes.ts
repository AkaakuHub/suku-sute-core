import type {
  LiveComboInduceMemberState,
  LiveComboInduceUiTimedEvent,
} from '../live/comboInduceUi.ts';

import type { LiveSkillEffect } from './skillTypes.ts';
import { type LiveSkillEffectDuration } from './skillEffectDuration.ts';
import type { LiveSkillEffectPower } from './skillEffectPower.ts';

export type LiveComboInduceRepeatAction = 'reset' | 'overwrite' | 'ignore';

export type LiveComboInduceCycle = Readonly<{
  activateAtSeconds: number;
  resetAtSeconds: number;
  totalAp: number;
  activated: boolean;
}>;

export type LiveComboInduceEffect = Readonly<{
  effectId: string;
  apPower: number;
  repeatAction: LiveComboInduceRepeatAction;
  embeddedEffects: readonly LiveSkillEffect[];
  power: LiveSkillEffectPower;
  duration: LiveSkillEffectDuration;
  members: readonly LiveComboInduceMemberState[];
  queuedAp: readonly Readonly<{ characterId: number; ap: number }>[];
  isPlaying: boolean;
  holdSetAp: boolean;
  showEffect: boolean;
  cycle: LiveComboInduceCycle | null;
}>;

export type LiveComboInduceState = Readonly<{
  active: LiveComboInduceEffect | null;
  uiEvents: readonly LiveComboInduceUiTimedEvent[];
}>;

export type LiveComboInduceApplication = Readonly<{
  effect: LiveSkillEffect;
  power: LiveSkillEffectPower;
}>;

export type LiveComboInduceTransition = Readonly<{
  state: LiveComboInduceState;
  applications: readonly LiveComboInduceApplication[];
}>;
