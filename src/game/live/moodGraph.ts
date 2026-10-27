type MoodPoint = Readonly<{ x: number; y: number }>;

export function projectMoodStepPoints(
  keys: readonly Readonly<{ songTimeSeconds: number; keyValue: number }>[],
  durationSeconds: number,
  graph: Readonly<{ x: number; y: number; width: number; height: number }>,
): readonly MoodPoint[] {
  if (durationSeconds <= 0) throw new Error('空模様グラフの再生時間が正しくありません。');
  const sorted = [...keys].sort((left, right) => left.songTimeSeconds - right.songTimeSeconds);
  if (sorted.length === 0) return [];
  const graphPoints = sorted.flatMap((key, index) => {
    const next = sorted[index + 1];
    return next === undefined
      ? [{ x: key.songTimeSeconds, y: key.keyValue }]
      : [
          { x: key.songTimeSeconds, y: key.keyValue },
          { x: next.songTimeSeconds, y: key.keyValue },
        ];
  });
  const first = graphPoints[0];
  const last = graphPoints.at(-1);
  if (first === undefined || last === undefined) return [];
  if (first.x > 0) graphPoints.unshift({ x: 0, y: first.y });
  if (last.x < durationSeconds) {
    graphPoints.push({ x: durationSeconds, y: last.y });
  }
  return graphPoints.map((point) => ({
    x: graph.x + (point.x / durationSeconds) * graph.width,
    y: graph.y + (1 - (point.y + 100) / 200) * graph.height,
  }));
}
