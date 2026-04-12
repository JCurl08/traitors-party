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
  startPhase3,
} from "../firebase/gameService";

const TEAM_COLORS = { A: "#3b82f6", B: "#ef4444" };

const ROUND_RULES = {
  1: {
    title: "📖 Round 1 — Free Describe",
    intro: "Players take turns getting their team to guess as mnay cards from the deck as possible within the time limit.",
    turnRule: "Say anything — words, sounds, gestures — to get your team to guess the word or phrase on the card. You cannot say the word itself.",
    gotItNote: "The card moves to Round 2's deck and your team scores a point.",
    extra: "After time runs out the next player from the opposite team takes a turn. The round ends when all cards have been guessed.",
  },
  2: {
    title: "🔤 Round 2 — One Word",
    intro: "Same cards, new challenge! The deck contains all the same cards as Round 1.",
    turnRule: "You may only say ONE word to get your team to guess the card. No gestures, no extra sounds — just one word!",
    gotItNote: "The card moves to Round 3's deck and your team scores a point.",
    extra: "The round ends when all cards have been guessed.",
  },
  3: {
    title: "🎭 Round 3 — Charades",
    intro: "Final round! Same cards again, but now you cannot say a single word.",
    turnRule: "No talking or soundeffects — act it out, mime, use gestures. Your team should know these cards well by now!",
    gotItNote: "Your team scores a point.",
    extra: "The round ends when all cards have been guessed.",
  },
};

// ─── Root game router ─────────────────────────────────────────────────────────

export default function Game() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [game, setGame] = useState(null);
  const [devMode, setDevMode] = useState(() => localStorage.getItem("devMode") === "true");

  const toggleDevMode = () => {
    setDevMode((prev) => {
      const next = !prev;
      localStorage.setItem("devMode", String(next));
      return next;
    });
  };

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

  const renderScreen = () => {
    if (game.status === "entry") {
      if ((game.entryDone || []).includes(myName)) {
        return <WaitingScreen game={game} />;
      }
      return <EntryForm code={code} myName={myName} />;
    }

    if (game.status === "rules") return <RulesScreen code={code} isHost={isHost} phase={1} />;
    if (game.status === "rules2") return <RulesScreen code={code} isHost={isHost} phase={2} />;
    if (game.status === "rules3") return <RulesScreen code={code} isHost={isHost} phase={3} />;

    if (game.status === "playing") {
      return (
        <GamePlay
          code={code}
          game={game}
          myName={myName}
          isCurrentPlayer={isCurrentPlayer}
          currentPlayerName={currentPlayerName}
          devMode={devMode}
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
  };

  return (
    <>
      {renderScreen()}
      <DevModeToggle devMode={devMode} onToggle={toggleDevMode} />
    </>
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

function RulesScreen({ code, isHost, phase }) {
  const rules = ROUND_RULES[phase];
  return (
    <div style={{ textAlign: "center", padding: "2rem" }}>
      <h1>{rules.title}</h1>
      <div
        style={{
          maxWidth: "480px",
          margin: "0 auto",
          textAlign: "left",
          lineHeight: "1.7",
        }}
      >
        <p>{rules.intro}</p>
        <p>
          <strong>On your turn:</strong> you have <strong>60 seconds</strong>. {rules.turnRule}
        </p>
        <p>
          <strong>Pass</strong> — the card goes to the bottom of the deck and you get a new one.
        </p>
        <p>
          <strong>Got It!</strong> — your team guessed correctly. {rules.gotItNote}
        </p>
        <p>{rules.extra}</p>
      </div>
      {isHost ? (
        <button
          onClick={() => beginPlay(code)}
          style={{ marginTop: "2rem", padding: "0.75rem 2rem", fontSize: "1rem", cursor: "pointer" }}
        >
          Start Round {phase}
        </button>
      ) : (
        <p style={{ marginTop: "2rem", color: "#6b7280" }}>Waiting for the host to start…</p>
      )}
    </div>
  );
}

// ─── Gameplay screen ──────────────────────────────────────────────────────────

function GamePlay({ code, game, myName, isCurrentPlayer, currentPlayerName, devMode }) {
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
      <p style={{ margin: "0 0 0.25rem", fontSize: "0.85rem", opacity: 0.8 }}>
        Round {game.phase}
      </p>
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
          {/* Dev mode: skip timer button visible to all players */}
          {devMode && (
            <div style={{ marginTop: "1.5rem" }}>
              <button
                onClick={() => endTurn(code)}
                style={{
                  padding: "0.4rem 1.2rem",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  background: "#fbbf24",
                  border: "none",
                  borderRadius: "4px",
                  color: "#1f2937",
                }}
              >
                ⏭ Skip Timer
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Score screen ─────────────────────────────────────────────────────────────

function ScoreScreen({ code, game, isHost }) {
  const currentScores = game.scores || { A: 0, B: 0 };
  // Build full history: all previous rounds + the just-completed round
  const roundHistory = [...(game.roundScores || []), currentScores];

  const totalA = roundHistory.reduce((sum, r) => sum + (r.A || 0), 0);
  const totalB = roundHistory.reduce((sum, r) => sum + (r.B || 0), 0);
  const winner = totalA > totalB ? "Team A" : totalB > totalA ? "Team B" : null;
  const isLastRound = game.phase === 3;

  return (
    <div style={{ textAlign: "center", padding: "2rem" }}>
      <h1>🏆 Round {game.phase} Complete!</h1>

      {/* Per-round breakdown + totals */}
      <table
        style={{
          margin: "1.5rem auto",
          borderCollapse: "collapse",
          minWidth: "260px",
          fontSize: "1rem",
        }}
      >
        <thead>
          <tr>
            <th style={{ padding: "0.4rem 1.2rem", textAlign: "left" }}>Round</th>
            <th style={{ padding: "0.4rem 1.2rem", color: TEAM_COLORS.A }}>Team A</th>
            <th style={{ padding: "0.4rem 1.2rem", color: TEAM_COLORS.B }}>Team B</th>
          </tr>
        </thead>
        <tbody>
          {roundHistory.map((r, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? "#f9fafb" : "white" }}>
              <td style={{ padding: "0.4rem 1.2rem", color: "#6b7280", textAlign: "left" }}>
                Round {i + 1}
              </td>
              <td style={{ padding: "0.4rem 1.2rem", fontWeight: "bold", textAlign: "center" }}>
                {r.A || 0}
              </td>
              <td style={{ padding: "0.4rem 1.2rem", fontWeight: "bold", textAlign: "center" }}>
                {r.B || 0}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ borderTop: "2px solid #e5e7eb" }}>
            <td style={{ padding: "0.5rem 1.2rem", fontWeight: "bold", textAlign: "left" }}>
              Total
            </td>
            <td
              style={{
                padding: "0.5rem 1.2rem",
                fontWeight: "bold",
                fontSize: "1.4rem",
                textAlign: "center",
                color: TEAM_COLORS.A,
              }}
            >
              {totalA}
            </td>
            <td
              style={{
                padding: "0.5rem 1.2rem",
                fontWeight: "bold",
                fontSize: "1.4rem",
                textAlign: "center",
                color: TEAM_COLORS.B,
              }}
            >
              {totalB}
            </td>
          </tr>
        </tfoot>
      </table>

      {isLastRound ? (
        <h2 style={{ marginTop: "1rem" }}>
          {winner ? `${winner} wins! 🎉` : "It's a tie! 🤝"}
        </h2>
      ) : isHost ? (
        <button
          onClick={() => (game.phase === 1 ? startPhase2(code) : startPhase3(code))}
          style={{ padding: "0.75rem 2rem", fontSize: "1rem", cursor: "pointer" }}
        >
          Start Round {game.phase + 1}
        </button>
      ) : (
        <p style={{ color: "#6b7280" }}>Waiting for the host to start Round {game.phase + 1}…</p>
      )}
    </div>
  );
}

// ─── Dev mode toggle ──────────────────────────────────────────────────────────

function DevModeToggle({ devMode, onToggle }) {
  return (
    <button
      onClick={onToggle}
      style={{
        position: "fixed",
        bottom: "1rem",
        right: "1rem",
        fontSize: "0.75rem",
        padding: "0.25rem 0.6rem",
        opacity: 0.5,
        cursor: "pointer",
        background: devMode ? "#fbbf24" : "#e5e7eb",
        border: "1px solid #d1d5db",
        borderRadius: "4px",
        color: "#374151",
        zIndex: 1000,
      }}
    >
      {devMode ? "🛠 Dev ON" : "🛠"}
    </button>
  );
}
