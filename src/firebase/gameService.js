// src/firebase/gameService.js
// All Firestore interactions for the Traitors Party game.

import { db } from "./config";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
} from "firebase/firestore";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Generate a random 4-letter uppercase game code (e.g. "XKQZ"). */
function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
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
  const gameId = generateCode();
  const hostId = generatePlayerId();
  const gameRef = doc(collection(db, "games"), gameId);
  await setDoc(gameRef, {
    code: gameId,
    phase: "LOBBY",
    round: 1,
    createdAt: new Date().toISOString(),
    players: {
      [hostId]: { id: hostId, name: hostName, isHost: true, alive: true },
    },
  });
  return { gameId, hostId };
}

/**
 * joinGame – called by a player to join an existing game by code.
 * Returns the new playerId, or throws if the game does not exist or the name is taken.
 */
export async function joinGame(code, playerName) {
  const gameRef = doc(db, "games", code);
  const snap = await getDoc(gameRef);
  if (!snap.exists()) throw new Error("Game not found");
  const data = snap.data();
  const nameTaken = Object.values(data.players).some(
    (p) => p.name === playerName
  );
  if (nameTaken) throw new Error("Name already taken");
  const playerId = generatePlayerId();
  await updateDoc(gameRef, {
    [`players.${playerId}`]: { id: playerId, name: playerName, isHost: false, alive: true },
  });
  return playerId;
}

/**
 * subscribeToGame – attaches a real-time Firestore listener.
 * Calls `callback` with the latest game data whenever it changes.
 * Returns an unsubscribe function – call it in useEffect cleanup.
 */
export function subscribeToGame(code, callback) {
  const gameRef = doc(db, "games", code);
  return onSnapshot(gameRef, (snap) => {
    if (snap.exists()) callback(snap.data());
  });
}

/**
 * updateGamePhase – host advances the game to the next phase.
 * Valid phases: "LOBBY" | "ROLES" | "DISCUSSION" | "VOTING" | "NIGHT" | "RESULTS"
 */
export async function updateGamePhase(gameId, phase) {
  const gameRef = doc(db, "games", gameId);
  await updateDoc(gameRef, { phase });
}
