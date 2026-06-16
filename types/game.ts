export type GameStatus = 'waiting' | 'playing' | 'finished';
export type PlayerKey = 'player1' | 'player2';
export type ActionType = 'accept_x' | 'accept_complement' | 'reroll';

export interface PlayerState {
  id: string;
  name: string;
  lockedNumber: number | null;
  rerollsUsed: number;
  hasLocked: boolean;
  // The number generated for this player in the current/last cycle (for hint calc)
  lastGeneratedNumber: number | null;
}

export interface LastAction {
  player: PlayerKey;
  action: ActionType;
}

export interface GameState {
  id: string;
  status: GameStatus;
  player1: PlayerState | null;
  player2: PlayerState | null;
  currentTurn: PlayerKey;
  currentNumber: number | null;      // shown to the current turn's player
  usedNumbers: number[];
  lastAction: LastAction | null;
  actionLog: LastAction[];           // full history visible to both
  hintNumber: number | null;         // revealed after full cycle
  // Track if each player has participated in the current cycle
  cycleP1Number: number | null;
  cycleP2Number: number | null;
  winner: PlayerKey | 'tie' | null;
  createdAt: number;
  // Rematch (optional for backwards compat with existing games)
  rematchVotes?: { player1: boolean; player2: boolean };
  rematchGameId?: string | null;
}
