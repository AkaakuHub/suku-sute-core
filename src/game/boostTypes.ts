import type { MemberId } from './model.ts';

export type Boost = Readonly<{
  percent: number;
  untilTick: number;
  deactivationKey?: string | null;
}>;

export type SkillScoreUp = Readonly<{
  percent: number;
  untilTick: number;
  remainingSeconds: number | null;
  remainingSections: number | null;
  removeOnHeartCollect: boolean;
  deactivationKey: string | null;
}>;

export type ResourceBoost = Readonly<{
  target: 'excitement' | 'stamina' | 'attract';
  members?: readonly MemberId[];
  percent: number;
  uses: number | null;
}>;

export type TargetBoost = Readonly<{
  members: readonly MemberId[];
  percent: number;
  duration: 'stage' | 'section';
  deactivationKey?: string;
}>;
