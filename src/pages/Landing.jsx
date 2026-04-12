import { useNavigate } from "react-router-dom";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div style={{ textAlign: "center", padding: "4rem 2rem" }}>
      <h1>🎭 Traitors Party</h1>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1rem",
          marginTop: "2.5rem",
        }}
      >
        <button
          onClick={() => navigate("/new-game")}
          style={{ padding: "1rem 3rem", fontSize: "1.2rem", cursor: "pointer", minWidth: "200px" }}
        >
          New Game
        </button>
        <button
          onClick={() => navigate("/join-game")}
          style={{ padding: "1rem 3rem", fontSize: "1.2rem", cursor: "pointer", minWidth: "200px" }}
        >
          Join Game
        </button>
      </div>
    </div>
  );
}
