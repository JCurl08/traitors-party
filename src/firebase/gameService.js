// src/firebase/gameService.js
// All Firestore interactions for the Traitors Party game.

import { db } from "./config";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  arrayUnion,
  onSnapshot,
  runTransaction,
} from "firebase/firestore";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Generate a random 6-character uppercase game code (e.g. "XKQZ42"). */
function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

/** Normalize a card string for uniqueness comparison. */
export function normalizeCard(text) {
  return text.toLowerCase().trim().replace(/\s+/g, " ");
}

/** Fisher-Yates shuffle – returns a new shuffled array. */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Service Functions ───────────────────────────────────────────────────────

/**
 * createGame – called by the host to create a new game.
 * @param {string} hostName
 * @param {"monikers"} gameType – type of game to play
 * Returns the game code so the host can navigate to /lobby/:code.
 */
export async function createGame(hostName, gameType = "monikers") {
  const code = generateCode();
  const gameRef = doc(collection(db, "games"), code);
  await setDoc(gameRef, {
    code,
    host: hostName,
    players: [hostName],
    gameType,
    status: "waiting",
    createdAt: new Date().toISOString(),
    // Monikers card submission
    cardSubmissions: {},
    // Monikers gameplay (populated when game starts)
    deck: [],
    round: 0,
    currentRoundCards: [],
    currentActivePlayerIndex: 0,
    currentCard: null,
    scores: {},
    roundScores: {},
  });
  return code;
}

/**
 * joinGame – called by a player to join an existing game by code.
 * Throws if the game does not exist, name is taken, or game has already started.
 */
export async function joinGame(code, playerName) {
  const gameRef = doc(db, "games", code);
  const snap = await getDoc(gameRef);
  if (!snap.exists()) throw new Error("Game not found");
  const data = snap.data();
  if (data.status !== "waiting") throw new Error("Game has already started");
  if (data.players.includes(playerName)) throw new Error("Name already taken");
  await updateDoc(gameRef, { players: arrayUnion(playerName) });
  return data;
}

/**
 * subscribeToGame – attaches a real-time Firestore listener.
 * Calls `callback` with the latest game data whenever it changes.
 * Returns an unsubscribe function.
 */
export function subscribeToGame(code, callback) {
  const gameRef = doc(db, "games", code);
  return onSnapshot(gameRef, (snap) => {
    if (snap.exists()) callback(snap.data());
  });
}

// ─── Monikers: Card Submission ───────────────────────────────────────────────

/**
 * submitCards – a player submits their 3 cards for the deck.
 * Enforces:
 *  - exactly 3 non-empty cards
 *  - no duplicate within the submission
 *  - no duplicate against cards already submitted by other players
 * Throws a descriptive error on violation.
 */
export async function submitCards(code, playerName, cards) {
  if (!Array.isArray(cards) || cards.length !== 3) {
    throw new Error("You must submit exactly 3 cards.");
  }

  // Validate each card is non-empty
  const trimmed = cards.map((c) => c.trim());
  for (const c of trimmed) {
    if (!c) throw new Error("Card text cannot be empty.");
  }

  // Check for duplicates within this submission
  const normalized = trimmed.map(normalizeCard);
  const unique = new Set(normalized);
  if (unique.size !== 3) {
    throw new Error("Your 3 cards must all be different.");
  }

  // Atomically check against existing submissions and save
  const gameRef = doc(db, "games", code);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(gameRef);
    if (!snap.exists()) throw new Error("Game not found");
    const data = snap.data();

    // Collect all already-submitted normalized cards (from other players)
    const existing = new Set();
    for (const [player, submitted] of Object.entries(
      data.cardSubmissions || {}
    )) {
      if (player === playerName) continue; // will be replaced
      for (const c of submitted) {
        existing.add(normalizeCard(c));
      }
    }

    // Check for duplicates against existing cards
    for (const n of normalized) {
      if (existing.has(n)) {
        throw new Error(
          `"${n}" is already in the deck. Choose a different card.`
        );
      }
    }

    // Save the submission
    tx.update(gameRef, {
      [`cardSubmissions.${playerName}`]: trimmed,
    });
  });
}

/**
 * startGame – host locks the submissions and starts round 1.
 * Builds the full deck from all player submissions.
 * Throws if not all players have submitted.
 */
export async function startGame(code) {
  const gameRef = doc(db, "games", code);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(gameRef);
    if (!snap.exists()) throw new Error("Game not found");
    const data = snap.data();

    const { players, cardSubmissions = {} } = data;

    // Ensure all players have submitted
    const missing = players.filter((p) => !cardSubmissions[p]);
    if (missing.length > 0) {
      throw new Error(
        `Waiting for ${missing.join(", ")} to submit their cards.`
      );
    }

    // Build and shuffle deck
    const deck = shuffle(
      players.flatMap((p) => cardSubmissions[p])
    );

    // Initialize scores
    const scores = Object.fromEntries(players.map((p) => [p, 0]));

    tx.update(gameRef, {
      status: "playing",
      deck,
      round: 1,
      currentRoundCards: [...deck],
      currentActivePlayerIndex: 0,
      currentCard: null,
      scores,
      roundScores: { 1: 0, 2: 0, 3: 0 },
    });
  });
}

// ─── Monikers: Gameplay ──────────────────────────────────────────────────────

/**
 * drawCard – active player draws the next card from currentRoundCards.
 * Atomically moves the first card out of currentRoundCards into currentCard.
 */
export async function drawCard(code, playerName) {
  const gameRef = doc(db, "games", code);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(gameRef);
    if (!snap.exists()) throw new Error("Game not found");
    const data = snap.data();

    const activePlayer = data.players[data.currentActivePlayerIndex];
    if (activePlayer !== playerName) throw new Error("It is not your turn.");
    if (data.currentCard !== null) throw new Error("Already holding a card.");
    if (data.currentRoundCards.length === 0) {
      throw new Error("No cards remaining.");
    }

    const [next, ...rest] = data.currentRoundCards;
    tx.update(gameRef, {
      currentCard: next,
      currentRoundCards: rest,
    });
  });
}

/**
 * guessCard – active player marks the current card as correctly guessed.
 * Increments the active player's score and clears currentCard.
 */
export async function guessCard(code, playerName, card) {
  const gameRef = doc(db, "games", code);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(gameRef);
    if (!snap.exists()) throw new Error("Game not found");
    const data = snap.data();

    const activePlayer = data.players[data.currentActivePlayerIndex];
    if (activePlayer !== playerName) throw new Error("It is not your turn.");
    if (data.currentCard !== card) throw new Error("Card mismatch.");

    const newScore = (data.scores[playerName] || 0) + 1;
    const newRoundScore = (data.roundScores[data.round] || 0) + 1;

    tx.update(gameRef, {
      currentCard: null,
      [`scores.${playerName}`]: newScore,
      [`roundScores.${data.round}`]: newRoundScore,
    });
  });
}

/**
 * passCard – active player puts the current card back at the end of the deck.
 */
export async function passCard(code, playerName, card) {
  const gameRef = doc(db, "games", code);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(gameRef);
    if (!snap.exists()) throw new Error("Game not found");
    const data = snap.data();

    const activePlayer = data.players[data.currentActivePlayerIndex];
    if (activePlayer !== playerName) throw new Error("It is not your turn.");
    if (data.currentCard !== card) throw new Error("Card mismatch.");

    tx.update(gameRef, {
      currentCard: null,
      currentRoundCards: [...data.currentRoundCards, card],
    });
  });
}

/**
 * endTurn – active player ends their turn; advances to next player.
 * If currentCard is held, it goes back to the deck.
 */
export async function endTurn(code, playerName) {
  const gameRef = doc(db, "games", code);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(gameRef);
    if (!snap.exists()) throw new Error("Game not found");
    const data = snap.data();

    const activePlayer = data.players[data.currentActivePlayerIndex];
    if (activePlayer !== playerName) throw new Error("It is not your turn.");

    const nextIndex =
      (data.currentActivePlayerIndex + 1) % data.players.length;

    // If holding a card, put it back
    const roundCards =
      data.currentCard !== null
        ? [...data.currentRoundCards, data.currentCard]
        : data.currentRoundCards;

    tx.update(gameRef, {
      currentCard: null,
      currentActivePlayerIndex: nextIndex,
      currentRoundCards: roundCards,
    });
  });
}

/**
 * startNextRound – advances the game to the next round.
 * Re-shuffles the full deck.
 */
export async function startNextRound(code) {
  const gameRef = doc(db, "games", code);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(gameRef);
    if (!snap.exists()) throw new Error("Game not found");
    const data = snap.data();

    if (data.round >= 3) {
      // Game over
      tx.update(gameRef, { status: "finished" });
      return;
    }

    const nextRound = data.round + 1;
    const reshuffled = shuffle(data.deck);

    tx.update(gameRef, {
      round: nextRound,
      currentRoundCards: reshuffled,
      currentActivePlayerIndex: 0,
      currentCard: null,
    });
  });
}

/**
 * updateGamePhase – legacy helper kept for backward compatibility.
 */
export async function updateGamePhase(gameId, phase) {
  const gameRef = doc(db, "games", gameId);
  await updateDoc(gameRef, { phase });
}
