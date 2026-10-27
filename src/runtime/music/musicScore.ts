import { z } from 'zod';

const header = 'id,song_time,key_type,key_value,heart_appear_ratio';
const keyKindByType = {
  1: 'heart',
  10: 'mood',
  20: 'section-change',
  99: 'music-end',
} as const;

const musicScoreKeySchema = z
  .object({
    id: z.number().int().positive(),
    songTime: z.number().int().nonnegative(),
    songTimeSeconds: z.number().nonnegative().finite(),
    keyType: z.union([z.literal(1), z.literal(10), z.literal(20), z.literal(99)]),
    kind: z.enum(['heart', 'mood', 'section-change', 'music-end']),
    keyValue: z.number().int(),
    heartAppearRatio: z.number().int().min(0).max(10_000),
  })
  .strict();

export type LiveMusicScoreKey = z.infer<typeof musicScoreKeySchema>;

export const liveMusicScoreSchema = z
  .object({
    keys: z.array(musicScoreKeySchema).min(1),
    moodKeys: z.array(musicScoreKeySchema),
    sectionChangeKeys: z.array(musicScoreKeySchema),
    musicEndTimeSeconds: z.number().nonnegative().finite(),
    unresolvedReferences: z.array(
      z.object({
        kind: z.literal('stage-calculation'),
        reason: z.enum([
          'gauge-formula-unobserved',
          'score-formula-unobserved',
          'skill-formula-unobserved',
        ]),
      }),
    ),
  })
  .strict();

export type LiveMusicScore = z.infer<typeof liveMusicScoreSchema>;

export function liveMusicScoreAssetLabel(musicId: number): string {
  if (!Number.isSafeInteger(musicId) || musicId <= 0) {
    throw new Error('Live music id must be a positive safe integer');
  }
  return `musicscore_${String(musicId).padStart(6, '0')}.csv`;
}

export function decodeLiveMusicScoreCsv(content: Uint8Array): LiveMusicScore {
  const source = new TextDecoder('utf-8', { fatal: true }).decode(content);
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  if (lines.at(-1) === '') lines.pop();
  if (lines[0] !== header) {
    throw new Error('Live MusicScore CSV header is invalid');
  }
  const keys = lines.slice(1).map((line, index) => decodeKey(line, index + 1));
  const musicEndKeys = keys.filter(({ kind }) => kind === 'music-end');
  const musicEnd = musicEndKeys.at(-1);
  return liveMusicScoreSchema.parse({
    keys,
    moodKeys: sortBySongTime(keys.filter(({ kind }) => kind === 'mood')),
    sectionChangeKeys: sortBySongTime(keys.filter(({ kind }) => kind === 'section-change')),
    musicEndTimeSeconds: musicEnd?.songTimeSeconds ?? 0,
    unresolvedReferences: [
      { kind: 'stage-calculation', reason: 'gauge-formula-unobserved' },
      { kind: 'stage-calculation', reason: 'score-formula-unobserved' },
      { kind: 'stage-calculation', reason: 'skill-formula-unobserved' },
    ],
  });
}

export function encodeLiveMusicScoreCsv(score: LiveMusicScore): Uint8Array {
  const validated = liveMusicScoreSchema.parse(score);
  return new TextEncoder().encode(
    `${[
      header,
      ...validated.keys.map((key) =>
        [key.id, key.songTime, key.keyType, key.keyValue, key.heartAppearRatio].join(','),
      ),
    ].join('\n')}\n`,
  );
}

function decodeKey(line: string, rowIndex: number): LiveMusicScoreKey {
  const columns = line.split(',');
  if (columns.length !== 5) {
    throw new Error(`Live MusicScore row ${String(rowIndex)} must have 5 columns`);
  }
  const [id, songTime, keyType, keyValue, heartAppearRatio] = columns.map((value) =>
    parseInteger(value, rowIndex),
  );
  if (
    id === undefined ||
    songTime === undefined ||
    keyType === undefined ||
    keyValue === undefined ||
    heartAppearRatio === undefined
  ) {
    throw new Error(`Live MusicScore row ${String(rowIndex)} is incomplete`);
  }
  const kind = keyKindByType[keyType as keyof typeof keyKindByType];
  if (kind === undefined) {
    throw new Error(`Live MusicScore key type is unknown: ${String(keyType)}`);
  }
  return musicScoreKeySchema.parse({
    id,
    songTime,
    songTimeSeconds: songTime / 1000,
    keyType,
    kind,
    keyValue,
    heartAppearRatio,
  });
}

function parseInteger(value: string | undefined, rowIndex: number): number {
  if (value === undefined || !/^-?\d+$/.test(value)) {
    throw new Error(`Live MusicScore row ${String(rowIndex)} contains a non-integer`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new Error(`Live MusicScore row ${String(rowIndex)} exceeds safe integer range`);
  }
  return parsed;
}

function sortBySongTime(keys: readonly LiveMusicScoreKey[]): LiveMusicScoreKey[] {
  return [...keys].sort((left, right) => left.songTime - right.songTime);
}
