import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { joinGame } from "../firebase/gameService";

export default function JoinGame() {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return setError("Enter your name and game code");
    setLoading(true);
    setError("");
    try {
      const upperCode = code.trim().toUpperCase();
      await joinGame(upperCode, name.trim());
      sessionStorage.setItem("player_" + upperCode, JSON.stringify({ name: name.trim(), isHost: false }));
      navigate(`/lobby/${upperCode}`);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div style={{ textAlign: "center", padding: "2rem" }}>
      <h1>🎭 Join Game</h1>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <form onSubmit={handleJoin}>
        <div>
          <input
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div style={{ marginTop: "0.75rem" }}>
          <input
            placeholder="Lobby code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={6}
            style={{ textTransform: "uppercase" }}
            required
          />
        </div>
        <div style={{ marginTop: "1rem" }}>
          <button type="submit" disabled={loading}>
            {loading ? "Joining…" : "Join Game"}
          </button>
        </div>
      </form>
      <button onClick={() => navigate("/")} style={{ marginTop: "1rem" }}>
        ← Back
      </button>
    </div>
  );
}
