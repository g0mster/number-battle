import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { GameState } from '@/types/game';

function randomId(len = 6) {
  return Math.random().toString(36).substring(2, 2 + len).toUpperCase();
}

export async function POST(req: NextRequest) {
  try {
    const { playerName, playerId } = await req.json();
    if (!playerName || !playerId) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const id = randomId();

    const game: GameState = {
      id,
      status: 'waiting',
      player1: {
        id: playerId,
        name: playerName,
        lockedNumber: null,
        rerollsUsed: 0,
        hasLocked: false,
        lastGeneratedNumber: null,
      },
      player2: null,
      currentTurn: 'player1',
      currentNumber: null,
      usedNumbers: [],
      lastAction: null,
      actionLog: [],
      hintNumber: null,
      cycleP1Number: null,
      cycleP2Number: null,
      winner: null,
      createdAt: Date.now(),
      rematchVotes: { player1: false, player2: false },
      rematchGameId: null,
    };

    await redis.set(`game:${id}`, JSON.stringify(game), { ex: 60 * 60 * 2 });
    return NextResponse.json({ gameId: id });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
