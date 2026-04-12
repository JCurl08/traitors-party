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

/** Generate a random 6-letter uppercase game code (e.g. "XKQZTM"). */
function generateCode() {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return Array.from({ length: 6 }, () => letters[Math.floor(Math.random() * 26)]).join("");
}

// ─── Service Functions ───────────────────────────────────────────────────────

/**
 * createGame – called by the host on the New Game page.
 * Returns the game code.
 */
export async function createGame(hostName, gameName) {
  const code = generateCode();
  const gameRef = doc(collection(db, "games"), code);
  await setDoc(gameRef, {
    code,
    gameName: gameName || "Monikers",
    host: hostName,
    status: "lobby",
    phase: 1,
    players: [{ name: hostName, team: "A", isHost: true }],
    playerOrder: [],
    currentTurnIndex: 0,
    scores: { A: 0, B: 0 },
    deck: [],
    phase2Deck: [],
    acceptedEntries: [],
    entryDone: [],
    roundActive: false,
    roundStartedAt: null,
    timerSeconds: 60,
    createdAt: new Date().toISOString(),
  });
  return code;
}

/**
 * joinGame – called by a player on the Join Game page.
 * Throws if the game does not exist, already started, or the name is taken.
 */
export async function joinGame(code, playerName) {
  const gameRef = doc(db, "games", code);
  const snap = await getDoc(gameRef);
  if (!snap.exists()) throw new Error("Game not found");
  const data = snap.data();
  if (data.status !== "lobby") throw new Error("Game already started");
  const nameTaken = (data.players || []).some((p) => p.name === playerName);
  if (nameTaken) throw new Error("Name already taken");
  // Assign to the team with fewer players to keep teams balanced
  const teamA = (data.players || []).filter((p) => p.team === "A").length;
  const teamB = (data.players || []).filter((p) => p.team === "B").length;
  const team = teamA <= teamB ? "A" : "B";
  await updateDoc(gameRef, {
    players: arrayUnion({ name: playerName, team, isHost: false }),
  });
}

/**
 * removePlayer – host removes a player from the lobby.
 */
export async function removePlayer(code, playerName) {
  const gameRef = doc(db, "games", code);
  const snap = await getDoc(gameRef);
  const data = snap.data();
  const newPlayers = (data.players || []).filter((p) => p.name !== playerName);
  await updateDoc(gameRef, { players: newPlayers });
}

/**
 * movePlayerTeam – host moves a player to the opposite team.
 */
export async function movePlayerTeam(code, playerName) {
  const gameRef = doc(db, "games", code);
  const snap = await getDoc(gameRef);
  const data = snap.data();
  const newPlayers = (data.players || []).map((p) =>
    p.name === playerName ? { ...p, team: p.team === "A" ? "B" : "A" } : p
  );
  await updateDoc(gameRef, { players: newPlayers });
}

/**
 * startGame – host starts the game from the lobby.
 * Builds an interleaved player order (Team A, Team B, A, B…) then sets status to "entry".
 */
export async function startGame(code) {
  const gameRef = doc(db, "games", code);
  const snap = await getDoc(gameRef);
  const data = snap.data();
  const players = data.players || [];
  const teamA = players
    .filter((p) => p.team === "A")
    .map((p) => p.name)
    .sort(() => Math.random() - 0.5);
  const teamB = players
    .filter((p) => p.team === "B")
    .map((p) => p.name)
    .sort(() => Math.random() - 0.5);

  // Interleave A, B, A, B…
  const playerOrder = [];
  const maxLen = Math.max(teamA.length, teamB.length);
  for (let i = 0; i < maxLen; i++) {
    if (teamA[i]) playerOrder.push(teamA[i]);
    if (teamB[i]) playerOrder.push(teamB[i]);
  }

  await updateDoc(gameRef, {
    status: "entry",
    playerOrder,
    currentTurnIndex: 0,
    scores: { A: 0, B: 0 },
    deck: [],
    phase2Deck: [],
    acceptedEntries: [],
    entryDone: [],
    roundActive: false,
    roundStartedAt: null,
    phase: 1,
  });
}

/**
 * submitEntries – a player submits their card entries.
 * Returns { duplicates: string[] } if any entry collides with the accepted pool,
 * otherwise { ok: true }.  When all players are done the deck is shuffled and
 * status moves to "rules".
 */
export async function submitEntries(code, playerName, entries) {
  const gameRef = doc(db, "games", code);
  const snap = await getDoc(gameRef);
  const data = snap.data();
  const accepted = data.acceptedEntries || [];

  // Check for duplicates within the submitted list itself
  const seen = new Set();
  const internalDups = entries.filter((e) => {
    const lower = e.toLowerCase();
    if (seen.has(lower)) return true;
    seen.add(lower);
    return false;
  });

  // Check against globally accepted entries
  const lowerAccepted = accepted.map((e) => e.toLowerCase());
  const externalDups = entries.filter((e) => lowerAccepted.includes(e.toLowerCase()));

  const duplicates = [...new Set([...internalDups, ...externalDups])];
  if (duplicates.length > 0) {
    return { duplicates };
  }

  const newAccepted = [...accepted, ...entries];
  const newEntryDone = [...(data.entryDone || []), playerName];
  const allDone = (data.players || []).every((p) => newEntryDone.includes(p.name));

  const update = {
    acceptedEntries: newAccepted,
    entryDone: newEntryDone,
  };

  if (allDone) {
    // Shuffle all entries into the deck and advance to rules screen
    const shuffled = [...newAccepted].sort(() => Math.random() - 0.5);
    update.deck = shuffled;
    update.status = "rules";
  }

  await updateDoc(gameRef, update);
  return { ok: true };
}

/**
 * beginPlay – host advances from the rules screen to active gameplay.
 */
export async function beginPlay(code) {
  await updateDoc(doc(db, "games", code), { status: "playing" });
}

/**
 * startRound – current player starts their timed round.
 */
export async function startRound(code) {
  await updateDoc(doc(db, "games", code), {
    roundActive: true,
    roundStartedAt: new Date().toISOString(),
  });
}

/**
 * passCard – moves the current card to the bottom of the deck.
 */
export async function passCard(code, card) {
  const gameRef = doc(db, "games", code);
  const snap = await getDoc(gameRef);
  const data = snap.data();
  const deck = [...(data.deck || [])];
  if (deck[0] !== card) return; // Card already changed (race condition guard)
  const newDeck = [...deck.slice(1), card];
  await updateDoc(gameRef, { deck: newDeck });
}

/**
 * gotItCard – removes the card from the active deck, adds it to phase2Deck,
 * increments the current player's team score.  When the deck empties the phase ends.
 */
export async function gotItCard(code, card) {
  const gameRef = doc(db, "games", code);
  const snap = await getDoc(gameRef);
  const data = snap.data();
  const deck = [...(data.deck || [])];
  if (deck[0] !== card) return; // Race condition guard

  const newDeck = deck.slice(1);
  const phase2Deck = [...(data.phase2Deck || []), card];

  const currentPlayerName = (data.playerOrder || [])[data.currentTurnIndex || 0];
  const player = (data.players || []).find((p) => p.name === currentPlayerName);
  const team = player?.team || "A";
  const scores = { ...(data.scores || { A: 0, B: 0 }) };
  scores[team] = (scores[team] || 0) + 1;

  const update = { deck: newDeck, phase2Deck, scores };

  if (newDeck.length === 0) {
    update.status = "score";
    update.roundActive = false;
    update.roundStartedAt = null;
  }

  await updateDoc(gameRef, update);
}

/**
 * endTurn – timer expired; advance to the next player and deactivate the round.
 */
export async function endTurn(code) {
  const gameRef = doc(db, "games", code);
  const snap = await getDoc(gameRef);
  const data = snap.data();
  if (!data.roundActive) return; // Already ended (idempotency guard)
  const orderLen = (data.playerOrder || []).length;
  if (orderLen === 0) return;
  const nextIndex = ((data.currentTurnIndex || 0) + 1) % orderLen;
  await updateDoc(gameRef, {
    roundActive: false,
    roundStartedAt: null,
    currentTurnIndex: nextIndex,
  });
}

/**
 * startPhase2 – host starts the second round, using the phase-1 success cards as the new deck.
 */
export async function startPhase2(code) {
  const gameRef = doc(db, "games", code);
  const snap = await getDoc(gameRef);
  const data = snap.data();
  const shuffled = [...(data.phase2Deck || [])].sort(() => Math.random() - 0.5);
  await updateDoc(gameRef, {
    status: "playing",
    phase: 2,
    deck: shuffled,
    phase2Deck: [],
    scores: { A: 0, B: 0 },
    currentTurnIndex: 0,
    roundActive: false,
    roundStartedAt: null,
  });
}

/**
 * subscribeToGame – attaches a real-time Firestore listener.
 * Returns an unsubscribe function – call it in useEffect cleanup.
 */
export function subscribeToGame(code, callback) {
  const gameRef = doc(db, "games", code);
  return onSnapshot(gameRef, (snap) => {
    if (snap.exists()) callback(snap.data());
  });
}
