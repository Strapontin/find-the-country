import { capitalDistanceKm, isPlayable } from './countries';
import { dailyCountry, randomCountry } from './daily';
import { shareSquare } from './closeness';

export type Mode = 'daily' | 'free';
export type Status = 'playing' | 'won' | 'gaveUp';

export interface Guess {
  code: string;
  /** Capital-to-capital flying distance to the target, km. */
  km: number;
}

export interface GameState {
  mode: Mode;
  target: string;
  /** Daily puzzle number (daily mode only). */
  puzzle?: number;
  guesses: Guess[];
  status: Status;
}

export function newDailyGame(puzzle: number): GameState {
  return { mode: 'daily', puzzle, target: dailyCountry(puzzle), guesses: [], status: 'playing' };
}

export function newFreeGame(previousTarget?: string): GameState {
  return { mode: 'free', target: randomCountry(previousTarget), guesses: [], status: 'playing' };
}

export function makeGuess(state: GameState, code: string): GameState {
  if (state.status !== 'playing' || !isPlayable(code)) return state;
  if (state.guesses.some((g) => g.code === code)) return state;
  const guess: Guess = { code, km: code === state.target ? 0 : capitalDistanceKm(code, state.target) };
  return {
    ...state,
    guesses: [...state.guesses, guess],
    status: code === state.target ? 'won' : 'playing',
  };
}

export function giveUp(state: GameState): GameState {
  return state.status === 'playing' ? { ...state, status: 'gaveUp' } : state;
}

/** Rebuild a game from stored guess codes (distances are recomputed). */
export function replay(base: GameState, codes: string[], status: Status): GameState {
  const state = codes.reduce(makeGuess, base);
  return status === 'gaveUp' ? giveUp(state) : state;
}

export function closestGuess(state: GameState): Guess | undefined {
  return state.guesses.reduce<Guess | undefined>((best, g) => (!best || g.km < best.km ? g : best), undefined);
}

export function shareText(state: GameState, title: string): string {
  const squares = state.guesses.map((g) => shareSquare(g.km)).join('');
  const result = state.status === 'won' ? `${state.guesses.length}` : 'X';
  return `${title} #${state.puzzle} — ${result}\n${squares}`;
}
