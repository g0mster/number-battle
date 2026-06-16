import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { GameState, ActionType } from '@/types/game';
import { applyAction } from '@/lib/gameLogic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { playerId, action } = await req.json() as { playerId: string; action: ActionType };
    if (!playerId || !action) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    const raw = await redis.get(`game:${params.id}`);
    if (!raw) return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    const game: GameState = typeof raw === 'string' ? JSON.parse(raw) : (raw as GameState);
    if (game.status !== 'playing') return NextResponse.json({ error: 'Game not in progress' }, { status: 400 });
    const updated = applyAction(game, playerId, action);
    await redis.set(`game:${params.id}`, JSON.stringify(updated), { ex: 60 * 60 * 2 });
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error';
    console.error(e);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
