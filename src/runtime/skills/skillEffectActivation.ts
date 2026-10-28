export type LiveSkillActivationContext = Readonly<{
  isSkill: boolean;
  activeAllHandSkill: boolean;
}>;

type LiveSkillEffectIdentity = Readonly<{ id: string; actionType: number }>;

export type LiveSkillEffectActivationState = Readonly<{
  useAllHandSkillEffectId: string | null;
}>;

export function createLiveSkillEffectActivationState(
  rootEffects: readonly LiveSkillEffectIdentity[],
): LiveSkillEffectActivationState {
  return {
    useAllHandSkillEffectId: rootEffects.find((effect) => effect.actionType === 42)?.id ?? null,
  };
}

export function isLiveSkillEffectEnabled(
  state: LiveSkillEffectActivationState,
  effect: LiveSkillEffectIdentity,
): boolean {
  return effect.actionType !== 42 || effect.id === state.useAllHandSkillEffectId;
}

export function canActivateLiveSkillEffect(
  effect: LiveSkillEffectIdentity,
  state: LiveSkillEffectActivationState,
  context: LiveSkillActivationContext,
): boolean {
  return (
    isLiveSkillEffectEnabled(state, effect) &&
    (effect.actionType !== 42 || (context.isSkill && !context.activeAllHandSkill))
  );
}
