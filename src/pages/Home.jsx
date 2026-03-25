import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createGame, joinGame } from "../firebase/gameService";

export default function Home() {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleCreate = async () => {
    if (!name.trim()) return setError("Enter your name");
    try {
      const gameCode = await createGame(name.trim());
      navigate(`/lobby/${gameCode}`, { state: { playerName: name.trim() } });
    } catch (e) {
      setError(e.message);
    }
  };

  const handleJoin = async () => {
    if (!name.trim() || !code.trim()) return setError("Enter name and code");
    try {
      await joinGame(code.trim().toUpperCase(), name.trim());
      navigate(`/lobby/${code.trim().toUpperCase()}`, {
        state: { playerName: name.trim() },
      });
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div style={{ textAlign: "center", padding: "2rem" }}>
      <h1>🎭 Traitors Party</h1>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <input
        placeholder="Your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <div style={{ marginTop: "1rem" }}>
        <button onClick={handleCreate}>Create Game</button>
      </div>
      <hr />
      <input
        placeholder="Game code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />
      <div style={{ marginTop: "1rem" }}>
        <button onClick={handleJoin}>Join Game</button>
      </div>
    </div>
  );
}
