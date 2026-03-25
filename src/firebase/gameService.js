// src/firebase/gameService.js
// All Firestore interactions for the Traitors Party game.

import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from './config';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Generate a random 4-letter uppercase game code (e.g. "XKQZ"). */
function generateGameCode() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return Array.from({ length: 4 }, () =>
    letters[Math.floor(Math.random() * letters.length)]
  ).join('');
}

/** Generate a simple random player ID string. */
function generatePlayerId() {
  return Math.random().toString(36).slice(2, 10);
}

// ─── Service Functions ───────────────────────────────────────────────────────

/**
 * createGame – called by the host to create a new game.
 * Returns { gameId, hostId } so the host can navigate to /host/:gameId.
 */
export async function createGame(hostName) {
  const gameId = generateGameCode();
  const hostId = generatePlayerId();

  const gameData = {
    id: gameId,
    phase: 'LOBBY',
    round: 1,
    players: {
      [hostId]: {
        id: hostId,
        name: hostName,
        alive: true,
        role: null,
        isHost: true,
      },
    },
    votes: {},
    nightActions: {},
  };

  // Use the game code as the Firestore document ID so players can look it up
  await setDoc(doc(db, 'games', gameId), gameData);

  return { gameId, hostId };
}

/**
 * joinGame – called by a player to join an existing game by code.
 * Returns the new playerId, or throws if the game does not exist.
 */
export async function joinGame(gameId, playerName) {
  const gameRef = doc(db, 'games', gameId);
  const snapshot = await getDoc(gameRef);

  if (!snapshot.exists()) {
    throw new Error(`Game "${gameId}" not found.`);
  }

  const playerId = generatePlayerId();

  // Add the new player to the players object using dot-notation path so we
  // don't overwrite existing players.
  await updateDoc(gameRef, {
    [`players.${playerId}`]: {
      id: playerId,
      name: playerName,
      alive: true,
      role: null,
      isHost: false,
    },
  });

  return playerId;
}

/**
 * subscribeToGame – attaches a real-time Firestore listener.
 * Calls `callback` with the latest game data whenever it changes.
 * Returns an unsubscribe function – call it in useEffect cleanup.
 */
export function subscribeToGame(gameId, callback) {
  const gameRef = doc(db, 'games', gameId);
  return onSnapshot(gameRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data());
    }
  });
}

/**
 * updateGamePhase – host advances the game to the next phase.
 * Valid phases: "LOBBY" | "ROLES" | "DISCUSSION" | "VOTING" | "NIGHT" | "RESULTS"
 */
export async function updateGamePhase(gameId, phase) {
  const gameRef = doc(db, 'games', gameId);
  await updateDoc(gameRef, { phase });
}
