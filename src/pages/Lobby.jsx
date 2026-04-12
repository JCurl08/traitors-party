import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { subscribeToGame } from "../firebase/gameService";

export default function Lobby() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [game, setGame] = useState(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  const playerName = sessionStorage.getItem(`playerName_${code}`) || "";

  useEffect(() => {
    const unsubscribe = subscribeToGame(code, (data) => {
      setGame(data);
    });
    return () => unsubscribe();
  }, [code]);

  // When the game moves out of "waiting", navigate to the appropriate game page
  useEffect(() => {
    if (!game) return;
    if (game.status === "submitting" || game.status === "playing" || game.status === "finished") {
      if (game.gameType === "monikers") {
        navigate(`/monikers/${code}`);
      }
    }
  }, [game, code, navigate]);

  async function handleStart() {
    setStarting(true);
    setError("");
    try {
      const gameRef = doc(db, "games", code);
      await updateDoc(gameRef, { status: "submitting" });
    } catch (err) {
      setError(err.message);
    } finally {
      setStarting(false);
    }
  }

  if (!game) return <p style={{ textAlign: "center", padding: "2rem" }}>Loading…</p>;

  const isHost = playerName === game.host;

  return (
    <div style={{ textAlign: "center", padding: "2rem", maxWidth: "480px", margin: "0 auto" }}>
      <h1>🎭 Lobby</h1>
      <div style={{ marginBottom: "1.5rem" }}>
        <p style={{ margin: "0.25rem 0" }}>
          Game Code:{" "}
          <strong style={{ fontSize: "1.4rem", letterSpacing: "0.15em" }}>{code}</strong>
        </p>
        <p style={{ margin: "0.25rem 0", fontSize: "0.9rem", color: "#555" }}>
          Share this code with friends so they can join!
        </p>
        {game.gameType && (
          <p style={{ margin: "0.5rem 0", fontSize: "0.9rem" }}>
            Game: <strong>{game.gameType === "monikers" ? "🎭 Monikers" : game.gameType}</strong>
          </p>
        )}
      </div>

      <div style={{ marginBottom: "2rem" }}>
        <h3>Players ({game.players?.length || 0})</h3>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {(game.players || []).map((p) => (
            <li key={p} style={{ padding: "0.25rem 0" }}>
              {p}
              {p === game.host ? " 👑" : ""}
              {p === playerName ? " (you)" : ""}
            </li>
          ))}
        </ul>
      </div>

      {isHost && (
        <>
          <button
            onClick={handleStart}
            disabled={starting || (game.players?.length || 0) < 2}
            style={{ padding: "0.75rem 2rem", fontSize: "1rem", minWidth: "160px" }}
          >
            {starting ? "Starting…" : "Start Game"}
          </button>
          {(game.players?.length || 0) < 2 && (
            <p style={{ color: "#888", fontSize: "0.85rem", marginTop: "0.5rem" }}>
              Need at least 2 players to start.
            </p>
          )}
        </>
      )}

      {!isHost && (
        <p style={{ color: "#666" }}>Waiting for the host to start the game…</p>
      )}

      {error && <p style={{ color: "red", marginTop: "1rem" }}>{error}</p>}
    </div>
  );
}


