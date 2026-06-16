'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { GameState, PlayerKey, ActionType } from '@/types/game';

const MAX_REROLLS = 5;

function getPlayerId(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('nb_player_id') ?? '';
}

function actionLabel(action: ActionType): string {
  if (action === 'accept_x') return 'accepted their number';
  if (action === 'accept_complement') return 'accepted the complement (100−x)';
  return 'rerolled';
}

function PlayerCard({
  label,
  player,
  isYou,
  isActive,
  status,
}: {
  label: string;
  player: NonNullable<GameState['player1']>;
  isYou: boolean;
  isActive: boolean;
  status: GameState['status'];
}) {
  const rerollsLeft = MAX_REROLLS - player.rerollsUsed;
  return (
    <div
      className="rounded-2xl p-4 flex-1 transition-all duration-300"
      style={{
        background: isActive ? 'rgba(108,99,255,0.08)' : 'var(--surface)',
        border: `1px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
        boxShadow: isActive ? '0 0 24px rgba(108,99,255,0.15)' : 'none',
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        {isActive && (
          <span className="w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} />
        )}
        <span className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>{label}</span>
        {isYou && (
          <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
            style={{ background: 'rgba(108,99,255,0.2)', color: 'var(--accent)' }}>YOU</span>
        )}
      </div>
      <p className="font-bold text-lg mb-3" style={{ color: 'var(--text)' }}>{player.name}</p>
      <div className="flex gap-2 flex-wrap">
        <div className="rounded-lg px-3 py-2 text-center"
          style={{ background: 'var(--bg)', border: '1px solid var(--border)', minWidth: 64 }}>
          <p className="text-xs mb-1" style={{ color: 'var(--muted)' }}>Number</p>
          <p className="font-black text-xl" style={{ color: 'var(--text)' }}>
            {status === 'finished'
              ? player.lockedNumber
              : player.hasLocked
              ? '🔒'
              : '—'}
          </p>
        </div>
        <div className="rounded-lg px-3 py-2 text-center"
          style={{ background: 'var(--bg)', border: '1px solid var(--border)', minWidth: 64 }}>
          <p className="text-xs mb-1" style={{ color: 'var(--muted)' }}>Rerolls</p>
          <p className="font-black text-xl" style={{ color: rerollsLeft <= 1 ? 'var(--accent2)' : 'var(--text)' }}>
            {rerollsLeft}/{MAX_REROLLS}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function GamePage() {
  const router = useRouter();
  const params = useParams();
  const gameId = params.id as string;

  const [game, setGame] = useState<GameState | null>(null);
  const [myKey, setMyKey] = useState<PlayerKey | null>(null);
  const [error, setError] = useState('');
  const [acting, setActing] = useState(false);
  const [hintVisible, setHintVisible] = useState(false);
  const [prevHint, setPrevHint] = useState<number | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchGame = useCallback(async () => {
    try {
      const res = await fetch(`/api/game/${gameId}`);
      if (!res.ok) { setError('Game not found'); return; }
      const data: GameState = await res.json();
      setGame(prev => {
        // Detect new hint
        if (data.hintNumber !== null && data.hintNumber !== prev?.hintNumber) {
          setHintVisible(true);
          setPrevHint(data.hintNumber);
          setTimeout(() => setHintVisible(false), 4000);
        }
        return data;
      });

      const pid = getPlayerId();
      if (data.player1?.id === pid) setMyKey('player1');
      else if (data.player2?.id === pid) setMyKey('player2');
    } catch {
      // silent
    }
  }, [gameId]);

  useEffect(() => {
    fetchGame();
    pollRef.current = setInterval(fetchGame, 2000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchGame]);

  async function doAction(action: ActionType) {
    if (acting) return;
    setActing(true); setError('');
    try {
      const res = await fetch(`/api/game/${gameId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: getPlayerId(), action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await fetchGame();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setActing(false);
    }
  }

  const copyCode = () => navigator.clipboard.writeText(gameId);
  const copyLink = () => navigator.clipboard.writeText(window.location.href);

  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-2 border-t-transparent mx-auto mb-4"
            style={{ borderColor: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
          <p style={{ color: 'var(--muted)' }}>Loading game…</p>
        </div>
      </div>
    );
  }

  const isMyTurn = game.currentTurn === myKey && game.status === 'playing';
  const myPlayer = myKey ? game[myKey] : null;
  const oppKey: PlayerKey = myKey === 'player1' ? 'player2' : 'player1';
  const oppPlayer = game[oppKey];
  const rerollsLeft = myPlayer ? MAX_REROLLS - myPlayer.rerollsUsed : 0;
  const canReroll = rerollsLeft > 0 && isMyTurn && !myPlayer?.hasLocked;

  // ─── WAITING ──────────────────────────────────────────────────────────
  if (game.status === 'waiting') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{ background: 'rgba(108,99,255,0.15)', border: '1px solid var(--accent)' }}>
            <span className="text-3xl">⏳</span>
          </div>
          <h2 className="text-2xl font-black mb-2">Waiting for opponent</h2>
          <p className="text-sm mb-8" style={{ color: 'var(--muted)' }}>
            Share the code or link below
          </p>

          <div className="rounded-2xl p-5 mb-4 text-left"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--muted)' }}>GAME CODE</p>
            <div className="flex items-center gap-3">
              <span className="font-black text-3xl tracking-widest" style={{ color: 'var(--accent)' }}>
                {gameId}
              </span>
              <button onClick={copyCode}
                className="ml-auto text-xs px-3 py-1.5 rounded-lg font-semibold transition-all"
                style={{ background: 'rgba(108,99,255,0.15)', color: 'var(--accent)' }}>
                Copy code
              </button>
            </div>
          </div>

          <button onClick={copyLink}
            className="w-full py-3 rounded-xl text-sm font-semibold"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}>
            📋 Copy invite link
          </button>
        </div>
      </div>
    );
  }

  // ─── FINISHED ─────────────────────────────────────────────────────────
  if (game.status === 'finished') {
    const youWon = game.winner === myKey;
    const tied = game.winner === 'tie';
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm text-center animate-float">
          <div className="text-6xl mb-4">{tied ? '🤝' : youWon ? '🏆' : '💀'}</div>
          <h2 className="text-3xl font-black mb-1">
            {tied ? "It's a tie!" : youWon ? 'You win!' : 'You lose!'}
          </h2>
          <p className="text-sm mb-8" style={{ color: 'var(--muted)' }}>
            {tied ? 'Both players tied.' : youWon
              ? `${game[myKey!]?.name} beats ${game[oppKey]?.name}`
              : `${game[oppKey]?.name} beats ${game[myKey!]?.name}`}
          </p>

          <div className="flex gap-3 mb-8">
            {[
              { key: 'player1' as PlayerKey, label: 'Player 1' },
              { key: 'player2' as PlayerKey, label: 'Player 2' },
            ].map(({ key, label }) => {
              const p = game[key];
              if (!p) return null;
              const won = game.winner === key;
              return (
                <div key={key} className="flex-1 rounded-2xl p-4"
                  style={{
                    background: won ? 'rgba(108,99,255,0.12)' : 'var(--surface)',
                    border: `1px solid ${won ? 'var(--accent)' : 'var(--border)'}`,
                  }}>
                  <p className="text-xs font-semibold mb-1" style={{ color: 'var(--muted)' }}>{label}</p>
                  <p className="font-bold mb-2">{p.name} {key === myKey ? '(you)' : ''}</p>
                  <p className="text-4xl font-black" style={{ color: won ? 'var(--accent)' : 'var(--text)' }}>
                    {p.lockedNumber}
                  </p>
                </div>
              );
            })}
          </div>

          <button onClick={() => router.push('/')}
            className="w-full py-3 rounded-xl font-bold text-sm"
            style={{ background: 'var(--accent)', color: '#fff' }}>
            Play again
          </button>
        </div>
      </div>
    );
  }

  // ─── PLAYING ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col p-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pt-2">
        <h1 className="font-black text-lg" style={{ color: 'var(--text)' }}>Number Battle</h1>
        <span className="text-xs px-3 py-1 rounded-full font-mono"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--muted)' }}>
          {gameId}
        </span>
      </div>

      {/* Player cards */}
      {game.player1 && game.player2 && (
        <div className="flex gap-3 mb-4">
          <PlayerCard
            label="Player 1"
            player={game.player1}
            isYou={myKey === 'player1'}
            isActive={game.currentTurn === 'player1'}
            status={game.status}
          />
          <PlayerCard
            label="Player 2"
            player={game.player2}
            isYou={myKey === 'player2'}
            isActive={game.currentTurn === 'player2'}
            status={game.status}
          />
        </div>
      )}

      {/* Hint banner */}
      {hintVisible && prevHint !== null && (
        <div className="rounded-xl p-3 mb-4 text-center animate-float"
          style={{ background: 'rgba(255,101,132,0.1)', border: '1px solid var(--accent2)' }}>
          <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--accent2)' }}>ROUND HINT</p>
          <p className="text-sm" style={{ color: 'var(--text)' }}>
            A number between this round's two draws:{' '}
            <span className="font-black text-lg">{prevHint}</span>
          </p>
        </div>
      )}

      {/* Action log */}
      {game.actionLog && game.actionLog.length > 0 && (
        <div className="rounded-xl p-3 mb-4"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-xs font-semibold mb-2" style={{ color: 'var(--muted)' }}>ACTION LOG</p>
          <div className="space-y-1 max-h-24 overflow-y-auto">
            {[...game.actionLog].reverse().map((entry, i) => {
              const pName = game[entry.player]?.name ?? entry.player;
              return (
                <p key={i} className="text-xs" style={{ color: 'var(--muted)' }}>
                  <span style={{ color: 'var(--text)' }}>{pName}</span> {actionLabel(entry.action)}
                </p>
              );
            })}
          </div>
        </div>
      )}

      {/* Main action area */}
      <div className="flex-1 flex flex-col items-center justify-center">
        {isMyTurn && !myPlayer?.hasLocked ? (
          <div className="w-full text-center animate-float">
            <p className="text-xs font-semibold mb-3" style={{ color: 'var(--accent)' }}>YOUR TURN</p>

            {/* Big number */}
            <div className="w-36 h-36 rounded-3xl flex items-center justify-center mx-auto mb-6 glow-pulse"
              style={{ background: 'rgba(108,99,255,0.12)', border: '2px solid var(--accent)' }}>
              <span className="font-black text-6xl animate-spin-in" style={{ color: 'var(--accent)' }}>
                {game.currentNumber}
              </span>
            </div>

            <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
              Complement would be <span className="font-bold" style={{ color: 'var(--text)' }}>
                {100 - (game.currentNumber ?? 0)}
              </span>
            </p>

            {/* Buttons */}
            <div className="flex flex-col gap-3 w-full max-w-xs mx-auto">
              <button onClick={() => doAction('accept_x')} disabled={acting}
                className="py-4 rounded-xl font-bold text-base transition-all disabled:opacity-50"
                style={{ background: 'var(--accent)', color: '#fff' }}>
                ✅ Accept {game.currentNumber}
              </button>
              <button onClick={() => doAction('accept_complement')} disabled={acting}
                className="py-4 rounded-xl font-bold text-base transition-all disabled:opacity-50"
                style={{ background: 'rgba(108,99,255,0.15)', border: '1px solid var(--accent)', color: 'var(--accent)' }}>
                🔄 Accept {100 - (game.currentNumber ?? 0)} (complement)
              </button>
              <button onClick={() => doAction('reroll')} disabled={acting || !canReroll}
                className="py-4 rounded-xl font-bold text-base transition-all disabled:opacity-50"
                style={{
                  background: canReroll ? 'rgba(255,101,132,0.12)' : 'var(--surface)',
                  border: `1px solid ${canReroll ? 'var(--accent2)' : 'var(--border)'}`,
                  color: canReroll ? 'var(--accent2)' : 'var(--muted)',
                }}>
                🎲 Reroll ({rerollsLeft} left)
              </button>
            </div>

            {error && <p className="mt-4 text-sm" style={{ color: 'var(--accent2)' }}>{error}</p>}
          </div>
        ) : myPlayer?.hasLocked ? (
          <div className="text-center animate-float">
            <div className="w-24 h-24 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <span className="text-4xl">🔒</span>
            </div>
            <p className="font-bold text-lg mb-1">You're locked in</p>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              Watching {oppPlayer?.name ?? 'opponent'} play…
            </p>
          </div>
        ) : (
          <div className="text-center animate-float">
            <div className="w-24 h-24 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(108,99,255,0.08)', border: '1px solid var(--border)' }}>
              <div className="w-8 h-8 rounded-full border-2 border-t-transparent"
                style={{ borderColor: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
            </div>
            <p className="font-bold text-lg mb-1">
              {oppPlayer?.name ?? 'Opponent'}'s turn
            </p>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>Waiting for their move…</p>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
