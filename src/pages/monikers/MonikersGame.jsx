import { useState } from "react";
import { drawCard, guessCard, passCard, endTurn, startNextRound } from "../../firebase/gameService";

const ROUND_DESCRIPTIONS = {
  1: { label: "Round 1 – Free Clues", hint: "Describe the card using any words, sounds, or gestures." },
  2: { label: "Round 2 – One Word", hint: "You may only say ONE word as your clue." },
  3: { label: "Round 3 – Charades", hint: "No words allowed — act it out only!" },
};

export default function MonikersGame({ code, playerName, game }) {
  const [actionError, setActionError] = useState("");
  const [loading, setLoading] = useState(false);

  const activePlayer = game.players?.[game.currentActivePlayerIndex] ?? "";
  const isMyTurn = playerName === activePlayer;
  const round = game.round;
  const roundInfo = ROUND_DESCRIPTIONS[round] || {};
  const remainingCards = game.currentRoundCards?.length ?? 0;
  const currentCard = game.currentCard;
  const isHost = playerName === game.host;

  async function wrap(fn) {
    setActionError("");
    setLoading(true);
    try {
      await fn();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleDraw = () => wrap(() => drawCard(code, playerName));
  const handleGuessed = () => wrap(() => guessCard(code, playerName, currentCard));
  const handlePass = () => wrap(() => passCard(code, playerName, currentCard));
  const handleEndTurn = () => wrap(() => endTurn(code, playerName));
  const handleNextRound = () => wrap(() => startNextRound(code));

  // ── Round Over (no cards left and not holding one) ──────────────────────────
  const roundOver = remainingCards === 0 && currentCard === null;

  if (roundOver) {
    return (
      <RoundOverScreen
        code={code}
        game={game}
        round={round}
        isHost={isHost}
        onNextRound={handleNextRound}
        loading={loading}
        error={actionError}
      />
    );
  }

  return (
    <div style={{ textAlign: "center", padding: "2rem", maxWidth: "520px", margin: "0 auto" }}>
      {/* Header */}
      <h1>🎭 Monikers</h1>
      <h2 style={{ marginBottom: "0.25rem" }}>{roundInfo.label}</h2>
      <p style={{ color: "#555", fontSize: "0.9rem", marginBottom: "1.5rem" }}>{roundInfo.hint}</p>

      {/* Scoreboard */}
      <Scoreboard game={game} playerName={playerName} />

      {/* Cards remaining */}
      <p style={{ fontSize: "0.85rem", color: "#888", marginBottom: "1.5rem" }}>
        Cards remaining: <strong>{remainingCards + (currentCard ? 1 : 0)}</strong>
      </p>

      {isMyTurn ? (
        <ActivePlayerView
          currentCard={currentCard}
          round={round}
          onDraw={handleDraw}
          onGuessed={handleGuessed}
          onPass={handlePass}
          onEndTurn={handleEndTurn}
          loading={loading}
          error={actionError}
        />
      ) : (
        <WaitingView activePlayer={activePlayer} round={round} />
      )}
    </div>
  );
}

// ── Active Player View ────────────────────────────────────────────────────────
function ActivePlayerView({ currentCard, round, onDraw, onGuessed, onPass, onEndTurn, loading, error }) {
  return (
    <div>
      <p style={{ fontWeight: "bold", fontSize: "1.1rem", marginBottom: "1rem" }}>
        It&apos;s your turn! You&apos;re giving clues.
      </p>

      {currentCard === null ? (
        <div>
          <p style={{ color: "#555", marginBottom: "1rem" }}>
            Draw a card to start your turn.
          </p>
          <button
            onClick={onDraw}
            disabled={loading}
            style={{ padding: "0.75rem 2rem", fontSize: "1.1rem", marginBottom: "0.75rem" }}
          >
            {loading ? "…" : "Draw Card"}
          </button>
          <br />
          <button
            onClick={onEndTurn}
            disabled={loading}
            style={{
              background: "none",
              border: "none",
              color: "#888",
              cursor: "pointer",
              textDecoration: "underline",
              fontSize: "0.9rem",
            }}
          >
            End Turn
          </button>
        </div>
      ) : (
        <div>
          <div
            style={{
              border: "3px solid #333",
              borderRadius: "12px",
              padding: "2rem",
              marginBottom: "1.5rem",
              fontSize: "1.6rem",
              fontWeight: "bold",
              background: "#fffde7",
              minHeight: "80px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {currentCard}
          </div>
          {round === 2 && (
            <p style={{ color: "#c0392b", fontWeight: "bold", marginBottom: "0.5rem" }}>
              ⚠️ One word only!
            </p>
          )}
          {round === 3 && (
            <p style={{ color: "#c0392b", fontWeight: "bold", marginBottom: "0.5rem" }}>
              ⚠️ No words — charades only!
            </p>
          )}
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={onGuessed}
              disabled={loading}
              style={{
                padding: "0.75rem 1.5rem",
                fontSize: "1rem",
                background: "#4caf50",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
              }}
            >
              ✓ Got it!
            </button>
            <button
              onClick={onPass}
              disabled={loading}
              style={{
                padding: "0.75rem 1.5rem",
                fontSize: "1rem",
                background: "#e0e0e0",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
              }}
            >
              ↩ Pass
            </button>
          </div>
          <div style={{ marginTop: "1rem" }}>
            <button
              onClick={onEndTurn}
              disabled={loading}
              style={{
                background: "none",
                border: "none",
                color: "#888",
                cursor: "pointer",
                textDecoration: "underline",
                fontSize: "0.9rem",
              }}
            >
              End Turn (put card back)
            </button>
          </div>
        </div>
      )}

      {error && <p style={{ color: "red", marginTop: "1rem" }}>{error}</p>}
    </div>
  );
}

// ── Waiting View ──────────────────────────────────────────────────────────────
function WaitingView({ activePlayer, round }) {
  return (
    <div>
      <p style={{ fontSize: "1.1rem", color: "#555" }}>
        <strong>{activePlayer}</strong> is giving clues…
      </p>
      {round === 2 && (
        <p style={{ color: "#888", fontSize: "0.9rem" }}>(One-word clues only)</p>
      )}
      {round === 3 && (
        <p style={{ color: "#888", fontSize: "0.9rem" }}>(Charades — no words!)</p>
      )}
      <p style={{ marginTop: "1.5rem", color: "#aaa", fontSize: "0.9rem" }}>
        Shout out the answer when you know it!
      </p>
    </div>
  );
}

// ── Round Over Screen ─────────────────────────────────────────────────────────
function RoundOverScreen({ code, game, round, isHost, onNextRound, loading, error }) {
  const isLastRound = round >= 3;

  const sortedPlayers = [...(game.players || [])].sort(
    (a, b) => (game.scores?.[b] || 0) - (game.scores?.[a] || 0)
  );

  return (
    <div style={{ textAlign: "center", padding: "2rem", maxWidth: "480px", margin: "0 auto" }}>
      <h1>🎭 Monikers</h1>
      {isLastRound ? (
        <>
          <h2>🏆 Game Over!</h2>
          <p style={{ color: "#555" }}>Final Scores:</p>
        </>
      ) : (
        <>
          <h2>Round {round} Complete!</h2>
          <p style={{ color: "#555" }}>
            Round score: <strong>{game.roundScores?.[round] || 0}</strong> cards guessed
          </p>
        </>
      )}

      <div
        style={{
          background: "#f5f5f5",
          borderRadius: "8px",
          padding: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <h3 style={{ margin: "0 0 0.75rem" }}>Scores</h3>
        {sortedPlayers.map((p, i) => (
          <div
            key={p}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "0.3rem 0.5rem",
              background: i === 0 ? "#fff9c4" : "transparent",
              borderRadius: "4px",
            }}
          >
            <span>
              {i === 0 && !isLastRound ? "" : ""}
              {p}
            </span>
            <strong>{game.scores?.[p] || 0}</strong>
          </div>
        ))}
      </div>

      {!isLastRound && isHost && (
        <button
          onClick={onNextRound}
          disabled={loading}
          style={{ padding: "0.75rem 2rem", fontSize: "1rem" }}
        >
          {loading ? "…" : `▶ Start Round ${round + 1}`}
        </button>
      )}
      {!isLastRound && !isHost && (
        <p style={{ color: "#888" }}>Waiting for the host to start Round {round + 1}…</p>
      )}
      {error && <p style={{ color: "red", marginTop: "0.5rem" }}>{error}</p>}
    </div>
  );
}

// ── Scoreboard ────────────────────────────────────────────────────────────────
function Scoreboard({ game, playerName }) {
  const players = game.players || [];
  if (players.length === 0) return null;

  return (
    <div
      style={{
        display: "flex",
        gap: "0.5rem",
        justifyContent: "center",
        flexWrap: "wrap",
        marginBottom: "1rem",
      }}
    >
      {players.map((p) => (
        <span
          key={p}
          style={{
            padding: "0.2rem 0.6rem",
            borderRadius: "20px",
            fontSize: "0.85rem",
            background: p === playerName ? "#333" : "#e0e0e0",
            color: p === playerName ? "white" : "#333",
          }}
        >
          {p}: {game.scores?.[p] || 0}
        </span>
      ))}
    </div>
  );
}
