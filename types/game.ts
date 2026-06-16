export type GameStatus = 'waiting' | 'playing' | 'finished';
export type PlayerKey = 'player1' | 'player2';
export type ActionType = 'accept_x' | 'accept_complement' | 'reroll';

export interface PlayerState {
  id: string;
  name: string;
  lockedNumber: number | null;
  rerollsUsed: number;
  hasLocked: boolean;
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
  currentNumber: number | null;
  usedNumbers: number[];
  lastAction: LastAction | null;
  actionLog: LastAction[];
  hintNumber: number | null;
  cycleP1Number: number | null;
  cycleP2Number: number | null;
  winner: PlayerKey | 'tie' | null;
  createdAt: number;
}
