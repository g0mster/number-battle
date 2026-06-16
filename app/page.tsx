'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

function genPlayerId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function getOrCreatePlayerId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem('nb_player_id');
  if (!id) {
    id = genPlayerId();
    localStorage.setItem('nb_player_id', id);
  }
  return id;
}

export default function Home() {
  const router = useRouter();
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { getOrCreatePlayerId(); }, []);

  async function handleCreate() {
    if (!name.trim()) { setError('Enter your name'); return; }
    setLoading(true); setError('');
    try {
      const playerId = getOrCreatePlayerId();
      const res = await fetch('/api/game/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName: name.trim(), playerId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      localStorage.setItem('nb_player_name', name.trim());
      router.push(`/game/${data.gameId}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create game');
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    if (!name.trim()) { setError('Enter your name'); return; }
    if (!code.trim()) { setError('Enter a game code'); return; }
    setLoading(true); setError('');
    try {
      const playerId = getOrCreatePlayerId();
      const gameId = code.trim().toUpperCase();
      const res = await fetch(`/api/game/${gameId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName: name.trim(), playerId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      localStorage.setItem('nb_player_name', name.trim());
      router.push(`/game/${gameId}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to join game');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      {/* Title */}
      <div className="mb-10 text-center">
        <h1 className="text-5xl font-black tracking-tight mb-2"
          style={{ background: 'linear-gradient(135deg, #6c63ff, #ff6584)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Number Battle
        </h1>
        <p style={{ color: 'var(--muted)' }} className="text-sm">
          Two players. One winner. Pure strategy.
        </p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm rounded-2xl p-6"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>

        {/* Tabs */}
        <div className="flex rounded-xl mb-6 overflow-hidden"
          style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
          {(['create', 'join'] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); setError(''); }}
              className="flex-1 py-2.5 text-sm font-semibold capitalize transition-all duration-200"
              style={{
                background: tab === t ? 'var(--accent)' : 'transparent',
                color: tab === t ? '#fff' : 'var(--muted)',
              }}>
              {t === 'create' ? 'Create Game' : 'Join Game'}
            </button>
          ))}
        </div>

        {/* Name input */}
        <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--muted)' }}>
          YOUR NAME
        </label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (tab === 'create' ? handleCreate() : handleJoin())}
          placeholder="Enter your name"
          className="w-full rounded-lg px-4 py-3 text-sm mb-4 outline-none transition-all"
          style={{
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
          }}
          onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
          onBlur={e => (e.target.style.borderColor = 'var(--border)')}
        />

        {/* Code input (join only) */}
        {tab === 'join' && (
          <>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--muted)' }}>
              GAME CODE
            </label>
            <input
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
              placeholder="e.g. AB12CD"
              maxLength={6}
              className="w-full rounded-lg px-4 py-3 text-sm mb-4 outline-none font-mono tracking-widest"
              style={{
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
              }}
              onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
          </>
        )}

        {error && (
          <p className="text-xs mb-4 text-center" style={{ color: 'var(--accent2)' }}>{error}</p>
        )}

        <button
          onClick={tab === 'create' ? handleCreate : handleJoin}
          disabled={loading}
          className="w-full py-3 rounded-xl font-bold text-sm transition-all duration-200 disabled:opacity-50"
          style={{ background: 'var(--accent)', color: '#fff' }}
          onMouseEnter={e => !loading && ((e.target as HTMLElement).style.filter = 'brightness(1.15)')}
          onMouseLeave={e => ((e.target as HTMLElement).style.filter = '')}
        >
          {loading ? '...' : tab === 'create' ? 'Create Game' : 'Join Game'}
        </button>
      </div>

      {/* Rules */}
      <div className="mt-8 w-full max-w-sm rounded-xl p-4 text-xs"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--muted)' }}>
        <p className="font-semibold mb-2" style={{ color: 'var(--text)' }}>How to play</p>
        <p className="mb-1">• Each turn you receive a number (0–100)</p>
        <p className="mb-1">• Accept it, take its complement (100−x), or reroll</p>
        <p className="mb-1">• Rerolling passes the turn — you get your next number after your opponent moves</p>
        <p className="mb-1">• A hint is revealed between both numbers after each full round of rerolls</p>
        <p>• Max 5 rerolls per player — highest locked number wins!</p>
      </div>
    </div>
  );
}
