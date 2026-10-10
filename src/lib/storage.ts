import type { Lang } from './countries';
import { isPlayable } from './countries';
import { newDailyGame, replay, type GameState, type Mode, type Status } from './game';

// localStorage can be missing or throw (private mode, blocked storage):
// every access is guarded and the game still works without it.
function read<T>(key: string): T | undefined {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

const KEYS = {
  lang: 'ftc.lang',
  mode: 'ftc.mode',
  daily: 'ftc.daily',
  free: 'ftc.free',
  stats: 'ftc.stats',
};

interface StoredGame {
  target: string;
  puzzle?: number;
  guesses: string[];
  status: Status;
}

const toStored = (s: GameState): StoredGame => ({
  target: s.target,
  puzzle: s.puzzle,
  guesses: s.guesses.map((g) => g.code),
  status: s.status,
});

export function loadLang(): Lang | undefined {
  const lang = read<Lang>(KEYS.lang);
  return lang === 'en' || lang === 'fr' ? lang : undefined;
}
export const saveLang = (lang: Lang) => write(KEYS.lang, lang);

export function loadMode(): Mode {
  return read<Mode>(KEYS.mode) === 'free' ? 'free' : 'daily';
}
export const saveMode = (mode: Mode) => write(KEYS.mode, mode);

/** Today's daily game, restored if the player already started it. */
export function loadDaily(puzzle: number): GameState {
  const base = newDailyGame(puzzle);
  const stored = read<StoredGame>(KEYS.daily);
  if (!stored || stored.puzzle !== puzzle || stored.target !== base.target) return base;
  return replay(base, stored.guesses, stored.status);
}

export function loadFree(): GameState | undefined {
  const stored = read<StoredGame>(KEYS.free);
  if (!stored || !isPlayable(stored.target)) return undefined;
  return replay({ mode: 'free', target: stored.target, guesses: [], status: 'playing' }, stored.guesses, stored.status);
}

export function saveGame(state: GameState): void {
  write(state.mode === 'daily' ? KEYS.daily : KEYS.free, toStored(state));
}

export interface Stats {
  played: number;
  won: number;
  streak: number;
  bestStreak: number;
  lastPuzzle?: number;
  lastWonPuzzle?: number;
}

export function loadStats(): Stats {
  return { played: 0, won: 0, streak: 0, bestStreak: 0, ...read<Stats>(KEYS.stats) };
}

/** Record a finished daily puzzle once. */
export function recordDaily(state: GameState): Stats {
  const stats = loadStats();
  if (state.mode !== 'daily' || state.status === 'playing' || stats.lastPuzzle === state.puzzle) return stats;
  const puzzle = state.puzzle!;
  const won = state.status === 'won';
  const streak = won ? (stats.lastWonPuzzle === puzzle - 1 ? stats.streak + 1 : 1) : 0;
  const next: Stats = {
    played: stats.played + 1,
    won: stats.won + (won ? 1 : 0),
    streak,
    bestStreak: Math.max(stats.bestStreak, streak),
    lastPuzzle: puzzle,
    lastWonPuzzle: won ? puzzle : stats.lastWonPuzzle,
  };
  write(KEYS.stats, next);
  return next;
}
