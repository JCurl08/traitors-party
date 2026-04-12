import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { subscribeToGame } from "../../firebase/gameService";
import CardSubmission from "./CardSubmission";
import MonikersGame from "./MonikersGame";

export default function Monikers() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [game, setGame] = useState(null);

  const playerName = sessionStorage.getItem(`playerName_${code}`) || "";

  useEffect(() => {
    const unsubscribe = subscribeToGame(code, setGame);
    return () => unsubscribe();
  }, [code]);

  // Redirect if player name is unknown (e.g. direct URL access without joining)
  useEffect(() => {
    if (game && !playerName) {
      navigate(`/join?code=${code}`);
    }
  }, [game, playerName, code, navigate]);

  if (!game) {
    return <p style={{ textAlign: "center", padding: "2rem" }}>Loading…</p>;
  }

  if (!playerName) {
    return <p style={{ textAlign: "center", padding: "2rem" }}>Redirecting…</p>;
  }

  if (game.status === "submitting") {
    return <CardSubmission code={code} playerName={playerName} game={game} />;
  }

  if (game.status === "playing") {
    return <MonikersGame code={code} playerName={playerName} game={game} />;
  }

  if (game.status === "finished") {
    return <FinishedScreen game={game} onHome={() => navigate("/")} />;
  }

  // Fallback for "waiting" status (shouldn't normally be seen here)
  return (
    <div style={{ textAlign: "center", padding: "2rem" }}>
      <p>Waiting for the game to start…</p>
    </div>
  );
}

function FinishedScreen({ game, onHome }) {
  const sortedPlayers = [...(game.players || [])].sort(
    (a, b) => (game.scores?.[b] || 0) - (game.scores?.[a] || 0)
  );
  const winner = sortedPlayers[0];

  return (
    <div style={{ textAlign: "center", padding: "2rem", maxWidth: "480px", margin: "0 auto" }}>
      <h1>🎭 Monikers</h1>
      <h2>🏆 Game Over!</h2>
      {winner && (
        <p style={{ fontSize: "1.2rem" }}>
          🥇 <strong>{winner}</strong> wins with {game.scores?.[winner] || 0} points!
        </p>
      )}

      <div
        style={{
          background: "#f5f5f5",
          borderRadius: "8px",
          padding: "1rem",
          marginBottom: "2rem",
        }}
      >
        <h3 style={{ margin: "0 0 0.75rem" }}>Final Scores</h3>
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
              {i === 0 ? "🥇 " : i === 1 ? "🥈 " : i === 2 ? "🥉 " : `${i + 1}. `}
              {p}
            </span>
            <strong>{game.scores?.[p] || 0}</strong>
          </div>
        ))}
      </div>

      <button
        onClick={onHome}
        style={{ padding: "0.75rem 2rem", fontSize: "1rem" }}
      >
        Back to Home
      </button>
    </div>
  );
}
