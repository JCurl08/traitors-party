import { useState } from "react";
import { submitCards, startGame, normalizeCard } from "../../firebase/gameService";

const CARDS_PER_PLAYER = 3;

export default function CardSubmission({ code, playerName, game }) {
  const mySubmission = game.cardSubmissions?.[playerName] || null;
  const [cards, setCards] = useState(["", "", ""]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const totalPlayers = game.players?.length || 0;
  const submittedCount = Object.keys(game.cardSubmissions || {}).length;
  const allSubmitted = submittedCount === totalPlayers;
  const alreadySubmitted = !!mySubmission;
  const isHost = playerName === game.host;

  function updateCard(index, value) {
    const next = [...cards];
    next[index] = value;
    setCards(next);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const trimmed = cards.map((c) => c.trim());
    for (let i = 0; i < trimmed.length; i++) {
      if (!trimmed[i]) {
        return setError(`Card ${i + 1} cannot be empty.`);
      }
    }

    // Check for duplicates within this submission (client-side fast path)
    const normalized = trimmed.map(normalizeCard);
    const seen = new Set();
    for (const n of normalized) {
      if (seen.has(n)) {
        return setError("Your 3 cards must all be different.");
      }
      seen.add(n);
    }

    setSubmitting(true);
    try {
      await submitCards(code, playerName, trimmed);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ textAlign: "center", padding: "2rem", maxWidth: "480px", margin: "0 auto" }}>
      <h1>🎭 Monikers</h1>
      <h2>Build the Deck</h2>

      <div
        style={{
          background: "#f5f5f5",
          borderRadius: "8px",
          padding: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <p style={{ margin: "0 0 0.5rem" }}>
          <strong>
            {submittedCount} / {totalPlayers}
          </strong>{" "}
          players have submitted their cards
        </p>
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {game.players?.map((p) => (
            <span
              key={p}
              style={{
                padding: "0.2rem 0.6rem",
                borderRadius: "20px",
                fontSize: "0.85rem",
                background: game.cardSubmissions?.[p] ? "#4caf50" : "#e0e0e0",
                color: game.cardSubmissions?.[p] ? "white" : "#333",
              }}
            >
              {p} {game.cardSubmissions?.[p] ? "✓" : "…"}
            </span>
          ))}
        </div>
      </div>

      {alreadySubmitted ? (
        <div>
          <p style={{ color: "#4caf50", fontWeight: "bold" }}>
            ✓ Your cards have been submitted!
          </p>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {mySubmission.map((c, i) => (
              <li key={i} style={{ padding: "0.2rem 0", color: "#555" }}>
                {i + 1}. {c}
              </li>
            ))}
          </ul>
          {!allSubmitted && (
            <p style={{ color: "#888", marginTop: "1rem" }}>
              Waiting for other players to submit their cards…
            </p>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <p style={{ marginBottom: "1rem", color: "#555" }}>
            Submit <strong>{CARDS_PER_PLAYER} unique cards</strong> — names, phrases, or famous
            things that others will try to guess.
          </p>
          {cards.map((c, i) => (
            <div key={i} style={{ marginBottom: "0.75rem" }}>
              <input
                type="text"
                placeholder={`Card ${i + 1}`}
                value={c}
                onChange={(e) => updateCard(i, e.target.value)}
                maxLength={60}
                style={{
                  padding: "0.5rem",
                  fontSize: "1rem",
                  width: "100%",
                  boxSizing: "border-box",
                }}
                required
              />
            </div>
          ))}
          {error && <p style={{ color: "red", marginBottom: "0.75rem" }}>{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            style={{ padding: "0.75rem 2rem", fontSize: "1rem" }}
          >
            {submitting ? "Submitting…" : "Submit Cards"}
          </button>
        </form>
      )}

      {allSubmitted && isHost && <StartGameSection code={code} game={game} />}
      {allSubmitted && !isHost && (
        <p style={{ color: "#4caf50", marginTop: "1.5rem", fontWeight: "bold" }}>
          All cards submitted! Waiting for the host to start the game…
        </p>
      )}
    </div>
  );
}

function StartGameSection({ code, game }) {
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  async function handle() {
    setStarting(true);
    setError("");
    try {
      await startGame(code);
    } catch (err) {
      setError(err.message);
    } finally {
      setStarting(false);
    }
  }

  return (
    <div style={{ marginTop: "1.5rem" }}>
      <p style={{ color: "#4caf50", fontWeight: "bold" }}>
        All {game.players?.length} players have submitted their cards!
      </p>
      <button
        onClick={handle}
        disabled={starting}
        style={{ padding: "0.75rem 2rem", fontSize: "1rem", marginTop: "0.5rem" }}
      >
        {starting ? "Starting…" : "▶ Start Game"}
      </button>
      {error && <p style={{ color: "red", marginTop: "0.5rem" }}>{error}</p>}
    </div>
  );
}

