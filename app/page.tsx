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

const STEPS = [
  {
    icon: '🎲',
    title: 'Get a random number',
    desc: 'Each turn you receive a secret number between 0 and 100. Your opponent can\'t see it.',
    visual: (
      <div className="flex gap-2 justify-center mt-3">
        {[42, '?', '?'].map((n, i) => (
          <div key={i} className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg"
            style={{
              background: i === 0 ? 'rgba(108,99,255,0.18)' : 'var(--bg)',
              border: `1.5px solid ${i === 0 ? 'var(--accent)' : 'var(--border)'}`,
              color: i === 0 ? 'var(--accent)' : 'var(--muted)',
            }}>
            {n}
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: '⚡',
    title: 'Choose your move',
    desc: 'You have 3 options every turn:',
    visual: (
      <div className="flex flex-col gap-1.5 mt-3">
        <div className="rounded-lg px-3 py-2 text-left"
          style={{ background: 'rgba(108,99,255,0.12)', border: '1px solid var(--accent)' }}>
          <span className="text-xs font-bold" style={{ color: 'var(--accent)' }}>✅ Lock in 42</span>
          <span className="text-xs ml-2" style={{ color: 'var(--muted)' }}>— keep this number</span>
        </div>
        <div className="rounded-lg px-3 py-2 text-left"
          style={{ background: 'rgba(108,99,255,0.06)', border: '1px solid var(--border)' }}>
          <span className="text-xs font-bold" style={{ color: 'var(--accent)' }}>🔄 Lock in 58</span>
          <span className="text-xs ml-2" style={{ color: 'var(--muted)' }}>— flip it (100−42)</span>
        </div>
        <div className="rounded-lg px-3 py-2 text-left"
          style={{ background: 'rgba(255,101,132,0.08)', border: '1px solid var(--border)' }}>
          <span className="text-xs font-bold" style={{ color: 'var(--accent2)' }}>🎲 Pass & Reroll</span>
          <span className="text-xs ml-2" style={{ color: 'var(--muted)' }}>— skip, max 5×</span>
        </div>
      </div>
    ),
  },
  {
    icon: '🔍',
    title: 'Watch for hints',
    desc: 'After both players have had a turn in a round, a hint number is revealed — it falls somewhere between both draws. Use it to bluff or strategise.',
    visual: (
      <div className="mt-3 rounded-lg px-3 py-2 text-center"
        style={{ background: 'rgba(255,101,132,0.1)', border: '1px solid var(--accent2)' }}>
        <p className="text-xs font-semibold" style={{ color: 'var(--accent2)' }}>🔍 ROUND HINT</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
          A number between both draws: <span className="font-black text-base" style={{ color: 'var(--accent2)' }}>67</span>
        </p>
      </div>
    ),
  },
  {
    icon: '🏆',
    title: 'Highest number wins',
    desc: 'Once both players lock in a number, they\'re revealed. The higher number wins. Your number is hidden until the very end — so bluff wisely!',
    visual: (
      <div className="flex gap-2 mt-3 justify-center">
        <div className="rounded-xl p-3 text-center flex-1"
          style={{ background: 'rgba(108,99,255,0.12)', border: '2px solid var(--accent)' }}>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>You</p>
          <p className="text-2xl font-black" style={{ color: 'var(--accent)' }}>83</p>
          <p className="text-xs font-bold" style={{ color: 'var(--accent)' }}>Winner!</p>
        </div>
        <div className="rounded-xl p-3 text-center flex-1"
          style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>Them</p>
          <p className="text-2xl font-black" style={{ color: 'var(--text)' }}>61</p>
        </div>
      </div>
    ),
  },
];

export default function Home() {
  const router = useRouter();
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showHow, setShowHow] = useState(false);

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
      <div className="mb-8 text-center">
        <h1 className="text-5xl font-black tracking-tight mb-2"
          style={{ background: 'linear-gradient(135deg, #6c63ff, #ff6584)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Number Battle
        </h1>
        <p style={{ color: 'var(--muted)' }} className="text-sm">
          Two players. One winner. Pure strategy.
        </p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm rounded-2xl p-6 mb-4"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>

        {/* Tabs */}
        <div className="flex rounded-xl mb-6