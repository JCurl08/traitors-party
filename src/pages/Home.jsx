import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div style={{ textAlign: "center", padding: "4rem 2rem" }}>
      <h1>🎭 Traitors Party</h1>
      <p style={{ marginBottom: "2rem", color: "#555" }}>
        A collection of party games for groups
      </p>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
        <button
          onClick={() => navigate("/new-game")}
          style={{ padding: "0.75rem 2rem", fontSize: "1.1rem", minWidth: "180px" }}
        >
          New Game
        </button>
        <button
          onClick={() => navigate("/join")}
          style={{ padding: "0.75rem 2rem", fontSize: "1.1rem", minWidth: "180px" }}
        >
          Join Game
        </button>
      </div>
    </div>
  );
}

