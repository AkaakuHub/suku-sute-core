import type { Card } from '../model.ts';
export type ModeChange = Readonly<{ modeId: number; change: 'off' | 'on' | 'alternate' }>;
export type ModeEntry = Readonly<{
  id: number;
  on: boolean;
  displayInduce: boolean;
  induceValue: number;
}>;
export type ModeState = Readonly<{
  entries: readonly ModeEntry[];
  queue: readonly ModeChange[];
  held: boolean;
  changing: boolean;
}>;

export function createModes(ids: readonly number[]): ModeState {
  if (ids.some((id) => !Number.isSafeInteger(id) || id < 1))
    throw new Error('モードIDが正しくありません。');
  return {
    entries: [...new Set(ids)]
      .sort((a, b) => a - b)
      .map((id) => ({ id, on: false, displayInduce: false, induceValue: 0 })),
    queue: [],
    held: false,
    changing: false,
  };
}

export function enqueueModeChange(state: ModeState, change: ModeChange): ModeState {
  return { ...state, queue: [...state.queue, change] };
}

export function takeModeChange(state: ModeState): Readonly<{
  state: ModeState;
  changed: ModeEntry | null;
}> {
  if (state.held) return { state, changed: null };
  let queue = state.queue;
  while (queue.length) {
    const next = queue[0];
    if (!next) throw new Error('モード切替の指定がありません。');
    queue = queue.slice(1);
    const entry = state.entries.find((item) => item.id === next.modeId);
    if (!entry || (entry.on && next.change === 'on') || (!entry.on && next.change === 'off'))
      continue;
    const changed = { ...entry, on: !entry.on };
    return {
      state: {
        ...state,
        queue,
        entries: state.entries.map((item) => (item.id === changed.id ? changed : item)),
      },
      changed,
    };
  }
  return { state: { ...state, queue }, changed: null };
}

export function resolveModeSkill(card: Card, modes: ModeState): Card {
  const changes = card.modeSkillChanges;
  if (!changes) return card;
  const mode = modes.entries.find((entry) => entry.id === changes.modeId);
  if (!mode) return card;
  const { special, skillIcon, ...variant } = mode.on ? changes.on : changes.off;
  const { special: _special, skillIcon: _skillIcon, ...base } = card;
  return {
    ...base,
    ...variant,
    ...(special === null ? {} : { special }),
    ...(skillIcon === null ? {} : { skillIcon }),
  };
}

export function resolveModeAbility(card: Card, modes: ModeState): Card {
  const changes = card.modeAbilityChanges;
  if (!changes) return card;
  const mode = modes.entries.find((entry) => entry.id === changes.modeId);
  if (!mode) return card;
  const variant = mode.on ? changes.on : changes.off;
  return {
    ...card,
    ability893Effects: variant.ability893Effects,
    ability894Effects: variant.ability894Effects,
  };
}
