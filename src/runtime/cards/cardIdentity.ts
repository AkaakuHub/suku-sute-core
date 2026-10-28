export type LiveCardIdentity = Readonly<{
  charactersId: number;
  unitIds: readonly number[];
}>;

export type LiveSkillCardIdentity = Readonly<
  LiveCardIdentity & {
    skillMainEffect: number | null;
    styleType: number | null;
  }
>;

export type LiveSkillIdentity = Readonly<{
  skillType: 1 | 2 | 3;
  skillMainEffect: number | null;
}>;
