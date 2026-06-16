import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { GameState } from '@/types/game';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const raw = await redis.get(`game:${params.id}`);
    if (!raw) return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    const game: GameState = typeof raw === 'string' ? JSON.parse(raw) : raw as GameState;
    const safe = { ...game };
    if (safe.status !== 'finished') {
      if (safe.player1) safe.player1 = { ...safe.player1, lockedNumber: safe.player1.hasLocked ? -1 : null };
      if (safe.player2) safe.player2 = { ...safe.player2, lockedNumber: safe.player2.hasLocked ? -1 : null };
    }
    return NextResponse.json(safe);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
