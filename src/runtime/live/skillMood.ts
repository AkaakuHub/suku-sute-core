export function calculateLiveSkillMoodCorrection(
  targetMood: number,
  currentMoodValue: number,
  bonusMoodValue: number,
): number {
  switch (targetMood) {
    case 0:
      return 0;
    case 1:
      return currentMoodValue > 0 ? Math.fround(bonusMoodValue * currentMoodValue) : 0;
    case 2:
      return Math.fround(Math.fround(Math.abs(currentMoodValue) * bonusMoodValue) * 0.5);
    case 3:
      return currentMoodValue < 0 ? Math.fround(bonusMoodValue * -currentMoodValue) : 0;
    default:
      throw new Error('空模様の補正対象が正しくありません。');
  }
}
