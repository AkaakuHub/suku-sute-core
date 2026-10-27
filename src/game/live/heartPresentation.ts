import { liveHeartShowLimitSettings } from '../../runtime/live/heartPresentation.ts';

export const starGatherHeartShowLimitSettings = {
  ...liveHeartShowLimitSettings,
  defaultValue: 100,
} as const;
