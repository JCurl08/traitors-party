// src/screens/PlayerLobby.jsx
// Player screen shown on the player's phone.
// - Shows the player's name and role (once revealed)
// - Shows the current game phase
// - Shows a list of other players (alive/dead)

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { subscribeToGame } from '../firebase/gameService';

export default function PlayerLobby() {
  const { gameId } = useParams();
  const [game, setGame] = useState(null);

  // Retrieve the player's own ID that was stored when they joined
  const playerId = sessionStorage.getItem(`playerId_${gameId}`);

  // Subscribe to real-time Firestore updates for this game
  useEffect(() => {
    const unsubscribe = subscribeToGame(gameId, (data) => {
      setGame(data);
    });
    // Clean up listener on unmount
    return () => unsubscribe();
  }, [gameId]);

  if (!game) {
    return <p>Loading game…</p>;
  }

  const me = playerId ? game.players[playerId] : null;
  const allPlayers = Object.values(game.players);

  return (
    <div>
      <h1>🗡️ Traitors Party</h1>
      <p>
        Room: <strong>{gameId}</strong>
      </p>

      {/* ── This player's info ──────────────────────────────────────────── */}
      {me ? (
        <section>
          <h2>You: {me.name}</h2>
          {me.role ? (
            <p>
              Your role: <strong>{me.role}</strong>
            </p>
          ) : (
            <p>Waiting for the host to reveal roles…</p>
          )}
          {!me.alive && <p style={{ color: 'red' }}>You have been eliminated.</p>}
        </section>
      ) : (
        <p>Could not find your player data.</p>
      )}

      {/* ── Current game phase ──────────────────────────────────────────── */}
      <section>
        <h2>Phase: {game.phase}</h2>
        <p>Round: {game.round}</p>
      </section>

      {/* ── All players ─────────────────────────────────────────────────── */}
      <section>
        <h2>Players ({allPlayers.length})</h2>
        <ul>
          {allPlayers.map((player) => (
            <li key={player.id}>
              {player.name}
              {player.id === playerId && ' (you)'}
              {player.isHost && ' 👑'}
              {!player.alive && ' 💀'}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
