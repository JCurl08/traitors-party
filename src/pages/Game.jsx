import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  subscribeToGame,
  submitEntries,
  beginPlay,
  startRound,
  passCard,
  gotItCard,
  endTurn,
  startPhase2,
} from "../firebase/gameService";

const TEAM_COLORS = { A: "#3b82f6", B: "#ef4444" };

// ─── Root game router ─────────────────────────────────────────────────────────

export default function Game() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [game, setGame] = useState(null);

  const playerData = JSON.parse(sessionStorage.getItem("player_" + code) || "{}");
  const myName = playerData?.name || "";

  useEffect(() => {
    if (!myName) {
      navigate("/");
      return;
    }
    const unsub = subscribeToGame(code, setGame);
    return () => unsub();
  }, [code, myName, navigate]);

  if (!game) {
    return (
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <p>Loading…</p>
      </div>
    );
  }

  const isHost = myName === game.host;
  const currentPlayerName = (game.playerOrder || [])[game.currentTurnIndex || 0];
  const isCurrentPlayer = myName === currentPlayerName;

  if (game.status === "entry") {
    if ((game.entryDone || []).includes(myName)) {
      return <WaitingScreen game={game} />;
    }
    return <EntryForm code={code} myName={myName} />;
  }

  if (game.status === "rules") {
    return <RulesScreen code={code} isHost={isHost} />;
  }

  if (game.status === "playing") {
    return (
      <GamePlay
        code={code}
        game={game}
        myName={myName}
        isCurrentPlayer={isCurrentPlayer}
        currentPlayerName={currentPlayerName}
      />
    );
  }

  if (game.status === "score") {
    return <ScoreScreen code={code} game={game} isHost={isHost} />;
  }

  return (
    <div style={{ textAlign: "center", padding: "2rem" }}>
      <p>Unknown game state: {game.status}</p>
    </div>
  );
}

// ─── Entry phase ──────────────────────────────────────────────────────────────

function EntryForm({ code, myName }) {
  const [fields, setFields] = useState(["", "", ""]);
  const [goodEntries, setGoodEntries] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = fields.map((f) => f.trim());
    if (trimmed.some((f) => !f)) return setError("Fill in all fields");
    setLoading(true);
    setError("");
    const allEntries = [...goodEntries, ...trimmed];
    const result = await submitEntries(code, myName, allEntries);
    setLoading(false);
    if (result.duplicates) {
      const dupSet = new Set(result.duplicates.map((d) => d.toLowerCase()));
      const kept = allEntries.filter((e) => !dupSet.has(e.toLowerCase()));
      setGoodEntries(kept);
      setFields(Array(result.duplicates.length).fill(""));
      setError(
        `Already taken: ${result.duplicates.join(", ")}. ` +
          `Enter ${result.duplicates.length} replacement${result.duplicates.length !== 1 ? "s" : ""}.`
      );
    }
  };

  return (
    <div style={{ textAlign: "center", padding: "2rem" }}>
      <h1>📝 Add Your Cards</h1>
      <p>Enter {fields.length} unique card{fields.length !== 1 ? "s" : ""} for the deck</p>
      {goodEntries.length > 0 && (
        <p style={{ color: "green" }}>
          ✓ {goodEntries.length} entr{goodEntries.length !== 1 ? "ies" : "y"} accepted
        </p>
      )}
      {error && <p style={{ color: "red" }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        {fields.map((val, i) => (
          <div key={i} style={{ marginTop: "0.5rem" }}>
            <input
              placeholder={`Card ${goodEntries.length + i + 1}`}
              value={val}
              onChange={(ev) => {
                const next = [...fields];
                next[i] = ev.target.value;
                setFields(next);
              }}
              required
            />
          </div>
        ))}
        <button type="submit" disabled={loading} style={{ marginTop: "1rem" }}>
          {loading ? "Submitting…" : "Submit"}
        </button>
      </form>
    </div>
  );
}

function WaitingScreen({ game }) {
  const total = (game.players || []).length;
  const done = (game.entryDone || []).length;
  return (
    <div style={{ textAlign: "center", padding: "2rem" }}>
      <h1>⏳ Waiting for Others</h1>
      <p>Your cards have been added to the deck!</p>
      <p>
        {done} / {total} players ready
      </p>
    </div>
  );
}

// ─── Rules screen ─────────────────────────────────────────────────────────────

function RulesScreen({ code, isHost }) {
  return (
    <div style={{ textAlign: "center", padding: "2rem" }}>
      <h1>📖 Round 1 Rules</h1>
      <div
        style={{
          maxWidth: "480px",
          margin: "0 auto",
          textAlign: "left",
          lineHeight: "1.7",
        }}
      >
        <p>Players take turns trying to get their team to guess cards from the deck.</p>
        <p>
          <strong>On your turn:</strong> you have <strong>60 seconds</strong>. Say anything to get
          your team to guess the card!
        </p>
        <p>
          <strong>Pass</strong> — the card goes to the bottom of the deck and you get a new one.
        </p>
        <p>
          <strong>Got It!</strong> — your team guessed correctly. The card moves to the next
          round&apos;s deck and your team scores a point.
        </p>
        <p>
          After time runs out the next player from the opposite team takes a turn. The phase ends
          when all cards have been guessed. Most points wins!
        </p>
      </div>
      {isHost ? (
        <button
          onClick={() => beginPlay(code)}
          style={{ marginTop: "2rem", padding: "0.75rem 2rem", fontSize: "1rem", cursor: "pointer" }}
        >
          Start Round 1
        </button>
      ) : (
        <p style={{ marginTop: "2rem", color: "#6b7280" }}>Waiting for the host to start…</p>
      )}
    </div>
  );
}

// ─── Gameplay screen ──────────────────────────────────────────────────────────

function GamePlay({ code, game, myName, isCurrentPlayer, currentPlayerName }) {
  const [timeLeft, setTimeLeft] = useState(null);
  const endTurnFired = useRef(false);

  const currentPlayer = (game.players || []).find((p) => p.name === currentPlayerName);
  const teamColor = TEAM_COLORS[currentPlayer?.team] || "#888";
  const card = (game.deck || [])[0];

  // Reset the endTurn guard whenever the turn changes
  useEffect(() => {
    endTurnFired.current = false;
  }, [game.currentTurnIndex]);

  // Client-side countdown timer
  useEffect(() => {
    if (!game.roundActive || !game.roundStartedAt) {
      setTimeLeft(null);
      return;
    }
    const timerSecs = game.timerSeconds || 60;
    const startMs = new Date(game.roundStartedAt).getTime();

    const tick = () => {
      const elapsed = (Date.now() - startMs) / 1000;
      const remaining = Math.max(0, timerSecs - elapsed);
      setTimeLeft(Math.ceil(remaining));
      if (remaining <= 0 && isCurrentPlayer && !endTurnFired.current) {
        endTurnFired.current = true;
        endTurn(code);
      }
    };

    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [game.roundActive, game.roundStartedAt, game.timerSeconds, isCurrentPlayer, code]);

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: teamColor,
        color: "white",
        textAlign: "center",
        padding: "2rem",
      }}
    >
      <h1 style={{ marginBottom: "0.25rem" }}>{currentPlayerName}&apos;s Turn</h1>
      <h3 style={{ marginTop: 0, marginBottom: "0.5rem" }}>Team {currentPlayer?.team}</h3>
      <p style={{ margin: "0 0 0.25rem" }}>
        Score — Team A: {game.scores?.A || 0} &nbsp;|&nbsp; Team B: {game.scores?.B || 0}
      </p>
      <p style={{ margin: "0 0 1.5rem", opacity: 0.85 }}>Cards remaining: {(game.deck || []).length}</p>

      {/* Pre-round: waiting for current player to start */}
      {!game.roundActive && (
        <div>
          {isCurrentPlayer ? (
            <button
              onClick={() => startRound(code)}
              style={{ padding: "1rem 2.5rem", fontSize: "1.1rem", cursor: "pointer" }}
            >
              Start Round
            </button>
          ) : (
            <p style={{ fontSize: "1.1rem" }}>
              Waiting for {currentPlayerName} to start their round…
            </p>
          )}
        </div>
      )}

      {/* Active round */}
      {game.roundActive && (
        <div>
          <div style={{ fontSize: "1.4rem", fontWeight: "bold", marginBottom: "1rem" }}>
            ⏱ {timeLeft !== null ? `${timeLeft}s` : "…"}
          </div>
          {isCurrentPlayer ? (
            <div>
              <div
                style={{
                  background: "rgba(255,255,255,0.2)",
                  borderRadius: "12px",
                  padding: "2rem",
                  margin: "0 auto 1.5rem",
                  maxWidth: "360px",
                  fontSize: "1.6rem",
                  fontWeight: "bold",
                  minHeight: "80px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {card || "—"}
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: "1rem" }}>
                <button
                  onClick={() => passCard(code, card)}
                  disabled={timeLeft === 0}
                  style={{ padding: "0.75rem 2rem", fontSize: "1rem", cursor: "pointer" }}
                >
                  Pass
                </button>
                <button
                  onClick={() => gotItCard(code, card)}
                  disabled={timeLeft === 0}
                  style={{ padding: "0.75rem 2rem", fontSize: "1rem", cursor: "pointer" }}
                >
                  Got It! ✓
                </button>
              </div>
            </div>
          ) : (
            <p style={{ fontSize: "1.1rem" }}>{currentPlayerName} is cluing now…</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Score screen ─────────────────────────────────────────────────────────────

function ScoreScreen({ code, game, isHost }) {
  const scoreA = game.scores?.A || 0;
  const scoreB = game.scores?.B || 0;
  const winner =
    scoreA > scoreB ? "Team A" : scoreB > scoreA ? "Team B" : null;

  return (
    <div style={{ textAlign: "center", padding: "2rem" }}>
      <h1>🏆 Round {game.phase} Complete!</h1>
      <div style={{ display: "flex", justifyContent: "center", gap: "3rem", margin: "2rem 0" }}>
        <div>
          <h2 style={{ color: TEAM_COLORS.A, margin: "0 0 0.25rem" }}>Team A</h2>
          <p style={{ fontSize: "2.5rem", margin: 0, fontWeight: "bold" }}>{scoreA}</p>
        </div>
        <div>
          <h2 style={{ color: TEAM_COLORS.B, margin: "0 0 0.25rem" }}>Team B</h2>
          <p style={{ fontSize: "2.5rem", margin: 0, fontWeight: "bold" }}>{scoreB}</p>
        </div>
      </div>

      {game.phase === 1 && (
        <>
          {isHost ? (
            <button
              onClick={() => startPhase2(code)}
              style={{ padding: "0.75rem 2rem", fontSize: "1rem", cursor: "pointer" }}
            >
              Start Round 2
            </button>
          ) : (
            <p style={{ color: "#6b7280" }}>Waiting for the host to start Round 2…</p>
          )}
        </>
      )}

      {game.phase === 2 && (
        <h2 style={{ marginTop: "1rem" }}>
          {winner ? `${winner} wins! 🎉` : "It's a tie! 🤝"}
        </h2>
      )}
    </div>
  );
}
