export type LiveSkillEffect = Readonly<{
  id: string;
  actionType: number;
  orderId: number;
  details: readonly Readonly<{
    id: string;
    detailType: string;
    targetMood: number;
    effectValue: number;
    params: readonly Readonly<{ paramType: string; paramValue: string }>[];
  }>[];
}>;

export type LiveCardSkillSeries = Readonly<{
  seriesId: number;
  name: string;
  mainEffect: number;
  skillIcon: number;
  levels: readonly Readonly<{
    skillLevel: number;
    consumeAp: number;
    appearanceType: number;
    description: string;
    effects: readonly LiveSkillEffect[];
  }>[];
}>;
