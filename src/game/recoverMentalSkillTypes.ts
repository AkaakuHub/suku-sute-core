export type RecoverMentalSkillEffect = Readonly<{
  kind: 'recover-mental-skill';
  amount: number;
  numberType: number;
  moodBonus?: Readonly<{ target: 1 | 2 | 3; perPoint: number }>;
}>;
