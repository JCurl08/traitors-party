import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createGame } from "../firebase/gameService";

const GAME_TYPES = [
  {
    id: "monikers",
    label: "🎭 Monikers",
    description:
      "Build a shared deck with your group and guess names across 3 hilarious rounds: free clues, one word, then charades!",
  },
];

export default function NewGame() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [gameType, setGameType] = useState("monikers");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate(e) {
    e.preventDefault();
    if (!name.trim()) return setError("Enter your name.");
    setCreating(true);
    setError("");
    try {
      const code = await createGame(name.trim(), gameType);
      sessionStorage.setItem(`playerName_${code}`, name.trim());
      navigate(`/lobby/${code}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div style={{ textAlign: "center", padding: "2rem", maxWidth: "480px", margin: "0 auto" }}>
      <h1>🎭 New Game</h1>
      <form onSubmit={handleCreate}>
        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: "bold" }}>
            Your Name
          </label>
          <input
            type="text"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ padding: "0.5rem", fontSize: "1rem", width: "100%", boxSizing: "border-box" }}
            required
          />
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: "bold" }}>
            Choose a Game
          </label>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {GAME_TYPES.map((g) => (
              <label
                key={g.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.75rem",
                  padding: "0.75rem",
                  border: `2px solid ${gameType === g.id ? "#333" : "#ccc"}`,
                  borderRadius: "8px",
                  cursor: "pointer",
                  textAlign: "left",
                  background: gameType === g.id ? "#f0f0f0" : "white",
                }}
              >
                <input
                  type="radio"
                  name="gameType"
                  value={g.id}
                  checked={gameType === g.id}
                  onChange={() => setGameType(g.id)}
                  style={{ marginTop: "0.2rem" }}
                />
                <div>
                  <strong>{g.label}</strong>
                  <p style={{ margin: "0.25rem 0 0", fontSize: "0.9rem", color: "#555" }}>
                    {g.description}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {error && <p style={{ color: "red", marginBottom: "1rem" }}>{error}</p>}

        <button
          type="submit"
          disabled={creating}
          style={{ padding: "0.75rem 2rem", fontSize: "1rem", minWidth: "160px" }}
        >
          {creating ? "Creating…" : "Create Game"}
        </button>
      </form>

      <div style={{ marginTop: "1.5rem" }}>
        <button onClick={() => navigate("/")} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", textDecoration: "underline" }}>
          ← Back
        </button>
      </div>
    </div>
  );
}
