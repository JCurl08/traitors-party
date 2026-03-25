// src/screens/Home.jsx
// Landing screen: the host can create a new game, or a player can join one.

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createGame, joinGame } from '../firebase/gameService';

export default function Home() {
  const navigate = useNavigate();

  // ── Create-game form state ──────────────────────────────────────────────
  const [hostName, setHostName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // ── Join-game form state ────────────────────────────────────────────────
  const [joinName, setJoinName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');

  // Create a new game and navigate the host to /host/:gameId
  async function handleCreate(e) {
    e.preventDefault();
    if (!hostName.trim()) return;
    setCreating(true);
    setCreateError('');
    try {
      const { gameId, hostId } = await createGame(hostName.trim());
      // Store the host's player ID in sessionStorage so HostLobby can read it
      sessionStorage.setItem(`playerId_${gameId}`, hostId);
      navigate(`/host/${gameId}`);
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  }

  // Join an existing game and navigate the player to /play/:gameId
  async function handleJoin(e) {
    e.preventDefault();
    if (!joinName.trim() || !joinCode.trim()) return;
    setJoining(true);
    setJoinError('');
    try {
      const code = joinCode.trim().toUpperCase();
      const playerId = await joinGame(code, joinName.trim());
      // Store the player's ID so PlayerLobby can identify this user
      sessionStorage.setItem(`playerId_${code}`, playerId);
      navigate(`/play/${code}`);
    } catch (err) {
      setJoinError(err.message);
    } finally {
      setJoining(false);
    }
  }

  return (
    <div>
      <h1>🗡️ Traitors Party</h1>

      {/* ── Create a game ───────────────────────────────────────────────── */}
      <section>
        <h2>Host a Game</h2>
        <form onSubmit={handleCreate}>
          <input
            type="text"
            placeholder="Your name"
            value={hostName}
            onChange={(e) => setHostName(e.target.value)}
            required
          />
          <button type="submit" disabled={creating}>
            {creating ? 'Creating…' : 'Create Game'}
          </button>
        </form>
        {createError && <p style={{ color: 'red' }}>{createError}</p>}
      </section>

      <hr />

      {/* ── Join a game ─────────────────────────────────────────────────── */}
      <section>
        <h2>Join a Game</h2>
        <form onSubmit={handleJoin}>
          <input
            type="text"
            placeholder="Your name"
            value={joinName}
            onChange={(e) => setJoinName(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="4-letter game code"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            maxLength={4}
            required
          />
          <button type="submit" disabled={joining}>
            {joining ? 'Joining…' : 'Join Game'}
          </button>
        </form>
        {joinError && <p style={{ color: 'red' }}>{joinError}</p>}
      </section>
    </div>
  );
}
