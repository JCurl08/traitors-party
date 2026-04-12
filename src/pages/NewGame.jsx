import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createGame } from "../firebase/gameService";

const GAME_TYPES = ["Monikers"];

export default function NewGame() {
  const [name, setName] = useState("");
  const [gameType, setGameType] = useState(GAME_TYPES[0]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return setError("Enter your name");
    setLoading(true);
    setError("");
    try {
      const code = await createGame(name.trim(), gameType);
      sessionStorage.setItem("player_" + code, JSON.stringify({ name: name.trim(), isHost: true }));
      navigate(`/lobby/${code}`);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div style={{ textAlign: "center", padding: "2rem" }}>
      <h1>🎭 New Game</h1>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <form onSubmit={handleCreate}>
        <div>
          <input
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div style={{ marginTop: "1rem" }}>
          <label>
            Game:{" "}
            <select value={gameType} onChange={(e) => setGameType(e.target.value)}>
              {GAME_TYPES.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </label>
        </div>
        <div style={{ marginTop: "1rem" }}>
          <button type="submit" disabled={loading}>
            {loading ? "Creating…" : "Create Game"}
          </button>
        </div>
      </form>
      <button onClick={() => navigate("/")} style={{ marginTop: "1rem" }}>
        ← Back
      </button>
    </div>
  );
}
