export function assertNeverActionEffect(value: never): never {
  throw new Error(`未対応のActionTypeです: ${String(value)}`);
}
