import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { GameState } from '@/types/game';
import { generateNumber } from '@/lib/gameLogic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { playerName, playerId } = await req.json();
    if (!playerName || !playerId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    const raw = await redis.get(`game:${params.id}`);
    if (!raw) return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    const game: GameState = typeof raw === 'string' ? JSON.parse(raw) : (raw as GameState);
    if (game.status !== 'waiting') return NextResponse.json({ error: 'Game already started' }, { status: 400 });
    if (game.player1?.id === playerId) return NextResponse.json({ error: 'You are already in this game' }, { status: 400 });
    if (game.player2) return NextResponse.json({ error: 'Game is full' }, { status: 400 });
    const firstNumber = generateNumber(game.usedNumbers);
    const updated: GameState = { ...game, player2: {id: playerId, name: playerName, lockedNumber: null, rerollsUsed: 0, hasLocked: false, lastGeneratedNumber: null}, status: 'playing', currentTurn: 'player1', currentNumber: firstNumber, usedNumbers: [...game.usedNumbers, firstNumber], cycleP1Number: firstNumber };
    await redis.set(`game:${params.id}`, JSON.stringify(updated), { ex: 60 * 60 * 2 });
    return NextResponse.json({ success: true });
  } catch (e) { console.error(e); return NextResponse.json({ error: 'Server error' }, { status: 500 }); }
}
