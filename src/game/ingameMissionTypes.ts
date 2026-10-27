export type IngameMissionRecord = Readonly<{
  missionType: 1 | 2 | 3 | 4 | 5;
  probability: number;
  rare: boolean;
  param1: number;
  param2: number;
  addParam: number;
  baseScore: number;
  addScore: number;
  text: string;
}>;

export type IngameMissionGroup = Readonly<{
  id: number;
  records: readonly IngameMissionRecord[];
}>;

export type IngameMission = Readonly<{
  groupId: bigint;
  records: readonly IngameMissionRecord[];
  currentIndex: number;
  target: number;
  count: number;
  clearCount: number;
  cooldownSeconds: number;
}>;

export function validateIngameMissionGroups(groups: readonly IngameMissionGroup[]): void {
  const groupIds = new Set<number>();
  for (const group of groups) {
    if (!Number.isSafeInteger(group.id) || groupIds.has(group.id))
      throw new Error('ミッションのグループIDが正しくありません。');
    groupIds.add(group.id);
    for (const record of group.records) {
      if (
        ![1, 2, 3, 4, 5].includes(record.missionType) ||
        !Number.isSafeInteger(record.probability) ||
        record.probability < 0 ||
        !Number.isSafeInteger(record.param1) ||
        !Number.isSafeInteger(record.param2) ||
        !Number.isSafeInteger(record.addParam) ||
        !Number.isSafeInteger(record.baseScore) ||
        !Number.isSafeInteger(record.addScore) ||
        typeof record.rare !== 'boolean' ||
        typeof record.text !== 'string'
      )
        throw new Error('ミッションの設定が正しくありません。');
    }
  }
}
