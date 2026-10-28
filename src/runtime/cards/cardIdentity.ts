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
