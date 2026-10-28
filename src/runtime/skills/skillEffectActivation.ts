export type LiveSkillActivationContext = Readonly<{
  isSkill: boolean;
  activeAllHandSkill: boolean;
}>;

export function canActivateLiveSkillEffect(
  actionType: number,
  context: LiveSkillActivationContext,
): boolean {
  return actionType !== 42 || (context.isSkill && !context.activeAllHandSkill);
}
