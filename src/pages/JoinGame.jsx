import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { joinGame } from "../firebase/gameService";

export default function JoinGame() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [name, setName] = useState("");
  const [code, setCode] = useState(searchParams.get("code") || "");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  async function handleJoin(e) {
    e.preventDefault();
    if (!name.trim()) return setError("Enter your name.");
    if (!code.trim()) return setError("Enter the game code.");
    setJoining(true);
    setError("");
    try {
      const upperCode = code.trim().toUpperCase();
      await joinGame(upperCode, name.trim());
      sessionStorage.setItem(`playerName_${upperCode}`, name.trim());
      navigate(`/lobby/${upperCode}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setJoining(false);
    }
  }

  return (
    <div style={{ textAlign: "center", padding: "2rem", maxWidth: "400px", margin: "0 auto" }}>
      <h1>🎭 Join Game</h1>
      <form onSubmit={handleJoin}>
        <div style={{ marginBottom: "1rem" }}>
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
            Game Code
          </label>
          <input
            type="text"
            placeholder="e.g. XKQZ42"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={8}
            style={{
              padding: "0.5rem",
              fontSize: "1.4rem",
              letterSpacing: "0.2em",
              width: "100%",
              boxSizing: "border-box",
              textAlign: "center",
            }}
            required
          />
        </div>

        {error && <p style={{ color: "red", marginBottom: "1rem" }}>{error}</p>}

        <button
          type="submit"
          disabled={joining}
          style={{ padding: "0.75rem 2rem", fontSize: "1rem", minWidth: "160px" }}
        >
          {joining ? "Joining…" : "Join Game"}
        </button>
      </form>

      <div style={{ marginTop: "1.5rem" }}>
        <button
          onClick={() => navigate("/")}
          style={{ background: "none", border: "none", color: "#666", cursor: "pointer", textDecoration: "underline" }}
        >
          ← Back
        </button>
      </div>
    </div>
  );
}
