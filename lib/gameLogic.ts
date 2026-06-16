import { GameState, PlayerKey, ActionType } from '@/types/game';

export const MAX_REROLLS = 5;

/** Pick a random integer 0-100 not in usedNumbers */
export function generateNumber(usedNumbers: number[]): number {
  const available: number[] = [];
  for (let i = 0; i <= 100; i++) {
    if (!usedNumbers.includes(i)) available.push(i);
  }
  if (available.length === 0) throw new Error('No numbers left');
  return available[Math.floor(Math.random() * available.length)];
}

/** Pick a random number strictly between min and max (exclusive) */
function hintBetween(a: number, b: number): number | null {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  if (hi - lo <= 1) return null; // no integer between them
  const options: number[] = [];
  for (let i = lo + 1; i < hi; i++) options.push(i);
  return options[Math.floor(Math.random() * options.length)];
}

export function other(player: PlayerKey): PlayerKey {
  return player === 'player1' ? 'player2' : 'player1';
}

export function applyAction(
  game: GameState,
  playerId: string,
  action: ActionType
): GameState {
  const actingKey: PlayerKey =
    game.player1?.id === playerId ? 'player1' : 'player2';

  if (actingKey !== game.currentTurn) {
    throw new Error("Not your turn");
  }

  const actingPlayer = game[actingKey]!;
  const otherKey = other(actingKey);
  const otherPlayer = game[otherKey]!;

  if (actingPlayer.hasLocked) throw new Error("You've already locked");

  const current = game.currentNumber!;
  let newGame: GameState = JSON.parse(JSON.stringify(game));

  const newAction = { player: actingKey, action };
  newGame.lastAction = newAction;
  newGame.actionLog = [...(newGame.actionLog ?? []), newAction];

  if (action === 'accept_x' || action === 'accept_complement') {
    const locked = action === 'accept_x' ? current : 100 - current;
    newGame[actingKey]!.lockedNumber = locked;
    newGame[actingKey]!.hasLocked = true;
    newGame.usedNumbers = [...newGame.usedNumbers, current];
    if (actingKey === 'player1') newGame.cycleP1Number = current;
    else newGame.cycleP2Number = current;
    if (otherPlayer.hasLocked) {
      newGame.status = 'finished';
      newGame.currentNumber = null;
      const p1n = newGame.player1!.lockedNumber!;
      const p2n = newGame.player2!.lockedNumber!;
      newGame.winner = p1n > p2n ? 'player1' : p2n > p1n ? 'player2' : 'tie';
    } else {
      newGame.currentTurn = otherKey;
      const next = generateNumber(newGame.usedNumbers);
      newGame.currentNumber = next;
      newGame.usedNumbers = [...newGame.usedNumbers, next];
      if (otherKey === 'player1') newGame.cycleP1Number = next;
      else newGame.cycleP2Number = next;
    }
  } else {
    if (actingPlayer.rerollsUsed >= MAX_REROLLS) throw new Error("No rerolls left");
    newGame[actingKey]!.rerollsUsed += 1;
    newGame.usedNumbers = [...newGame.usedNumbers, current];
    if (actingKey === 'player1') newGame.cycleP1Number = current;
    else newGame.cycleP2Number = current;
    if (newGame.cycleP1Number !== null && newGame.cycleP2Number !== null) {
      const hint = hintBetween(newGame.cycleP1Number, newGame.cycleP2Number);
      newGame.hintNumber = hint;
      newGame.cycleP1Number = null;
      newGame.cycleP2Number = null;
    } else newGame.hintNumber = null;
    if (otherPlayer.hasLocked) newGame.currentTurn = actingKey;
    else newGame.currentTurn = otherKey;
    const next = generateNumber(newGame.usedNumbers);
    newGame.currentNumber = next;
    newGame.usedNumbers = [...newGame.usedNumbers, next];
    if (newGame.currentTurn === 'player1') newGame.cycleP1Number = next;
    else newGame.cycleP2Number = next;
  }
  return newGame;
}
