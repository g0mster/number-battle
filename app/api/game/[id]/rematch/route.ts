import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { GameState, PlayerKey, PlayerState } from '@/types/game';
import { generateNumber } from '@/lib/gameLogic';

function randomId(len = 6) {
  return Math.random().toString(36).substring(2, 2 + len).toUpperCase();
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { playerId } = await req.json() as { playerId: string };
    if (!playerId) return NextResponse.json({ error: 'Missing playerId' }, { status: 400 });

    const raw = await redis.get(`game:${params.id}`);
    if (!raw) return NextResponse.json({ error: 'Game not found' }, { status: 404 });

    const game: GameState = typeof raw === 'string' ? JSON.parse(raw) : (raw as GameState);

    if (game.status !== 'finished') {
      return NextResponse.json({ error: 'Game not finished' }, { status: 400 });
    }

    // If rematch already created, just return the ID
    if (game.rematchGameId) {
      return NextResponse.json({ rematchGameId: game.rematchGameId });
    }

    // Identify player
    let myKey: PlayerKey | null = null;
    if (game.player1?.id === playerId) myKey = 'player1';
    else if (game.player2?.id === playerId) myKey = 'player2';
    if (!myKey) return NextResponse.json({ error: 'Player not in game' }, { status: 403 });

    const votes = { ...(game.rematchVotes ?? { player1: false, player2: false }) };
    votes[myKey] = true;

    let rematchGameId: string | null = null;

    if (votes.player1 && votes.player2) {
      // Both voted — create new game with swapped roles (old P2 → new P1)
      const newP1: PlayerState = {
        id: game.player2!.id,
        name: game.player2!.name,
        lockedNumber: null,
        rerollsUsed: 0,
        hasLocked: false,
        lastGeneratedNumber: null,
      };
      const newP2: PlayerState = {
        id: game.player1!.id,
        name: game.player1!.name,
        lockedNumber: null,
        rerollsUsed: 0,
        hasLocked: false,
        lastGeneratedNumber: null,
      };

      rematchGameId = randomId();
      const firstNum = generateNumber([]);
      const newGame: GameState = {
        id: rematchGameId,
        status: 'playing',
        player1: newP1,
        player2: newP2,
        currentTurn: 'player1',
        currentNumber: firstNum,
        usedNumbers: [firstNum],
        lastAction: null,
        actionLog: [],
        hintNumber: null,
        cycleP1Number: firstNum,
        cycleP2Number: null,
        winner: null,
        createdAt: Date.now(),
        rematchVotes: { player1: false, player2: false },
        rematchGameId: null,
      };

      await redis.set(`game:${rematchGameId}`, JSON.stringify(newGame), { ex: 60 * 60 * 2 });
    }

    const updated: GameState = { ...game, rematchVotes: votes, rematchGameId };
    await redis.set(`game:${params.id}`, JSON.stringify(updated), { ex: 60 * 60 * 2 });

    return NextResponse.json({ rematchGameId, voted: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error';
    console.error(e);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
