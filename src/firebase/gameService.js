import { db } from "./config";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  arrayUnion,
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
  const code = generateCode();
  const gameRef = doc(collection(db, "games"), code);
  await setDoc(gameRef, {
    code,
    host: hostName,
    players: [hostName],
    status: "waiting",
    createdAt: new Date().toISOString(),
  });
  return code;
}

/**
 * joinGame – called by a player to join an existing game by code.
 * Returns the new playerId, or throws if the game does not exist.
 */
export async function joinGame(code, playerName) {
  const gameRef = doc(db, "games", code);
  const snap = await getDoc(gameRef);
  if (!snap.exists()) throw new Error("Game not found");
  const data = snap.data();
  if (data.players.includes(playerName)) throw new Error("Name already taken");
  await updateDoc(gameRef, { players: arrayUnion(playerName) });
  return data;
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
