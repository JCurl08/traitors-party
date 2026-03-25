// src/screens/HostLobby.jsx
// Host control screen shown on the laptop / TV.
// - Displays the room code so players can join
// - Shows a real-time list of players
// - Lets the host advance the game phase

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { subscribeToGame, updateGamePhase } from '../firebase/gameService';

// Ordered list of phases the host can advance through
const PHASES = ['LOBBY', 'ROLES', 'DISCUSSION', 'VOTING', 'NIGHT', 'RESULTS'];

export default function HostLobby() {
  const { gameId } = useParams();
  const [game, setGame] = useState(null);
  const [error, setError] = useState('');

  // Subscribe to real-time Firestore updates for this game
  useEffect(() => {
    const unsubscribe = subscribeToGame(gameId, (data) => {
      setGame(data);
    });
    // Clean up the listener when the component unmounts
    return () => unsubscribe();
  }, [gameId]);

  // Advance to the next phase in the PHASES array
  async function handleNextPhase() {
    if (!game) return;
    const currentIndex = PHASES.indexOf(game.phase);
    const nextPhase = PHASES[currentIndex + 1];
    if (!nextPhase) return; // already at the last phase
    try {
      await updateGamePhase(gameId, nextPhase);
    } catch (err) {
      setError(err.message);
    }
  }

  if (!game) {
    return <p>Loading game…</p>;
  }

  // Convert the players object to an array for rendering
  const players = Object.values(game.players);
  const currentPhaseIndex = PHASES.indexOf(game.phase);
  const isLastPhase = currentPhaseIndex === PHASES.length - 1;

  return (
    <div>
      <h1>Host Dashboard</h1>

      {/* Room code – display large so players across the room can see it */}
      <section>
        <h2>Room Code</h2>
        <p style={{ fontSize: '3rem', fontWeight: 'bold', letterSpacing: '0.2em' }}>
          {gameId}
        </p>
        <p>Share this code with your players at <strong>/play/{gameId}</strong></p>
      </section>

      {/* Current phase */}
      <section>
        <h2>Phase: {game.phase}</h2>
        <p>Round: {game.round}</p>
        <button onClick={handleNextPhase} disabled={isLastPhase}>
          {isLastPhase ? 'Game Over' : `Advance to ${PHASES[currentPhaseIndex + 1]}`}
        </button>
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </section>

      {/* Real-time player list */}
      <section>
        <h2>Players ({players.length})</h2>
        {players.length === 0 ? (
          <p>No players yet…</p>
        ) : (
          <ul>
            {players.map((player) => (
              <li key={player.id}>
                {player.name}
                {player.isHost && ' 👑'}
                {!player.alive && ' 💀'}
                {player.role && ` — ${player.role}`}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
