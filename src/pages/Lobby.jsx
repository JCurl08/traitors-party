import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { subscribeToGame, removePlayer, movePlayerTeam, startGame } from "../firebase/gameService";

const TEAM_COLORS = { A: "#3b82f6", B: "#ef4444" };

export default function Lobby() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [game, setGame] = useState(null);

  const playerData = JSON.parse(sessionStorage.getItem("player_" + code) || "{}");
  const myName = playerData?.name || "";

  useEffect(() => {
    if (!myName) {
      navigate("/");
      return;
    }
    const unsub = subscribeToGame(code, (data) => {
      // If this player was removed by the host, send them home
      if (data.players && !data.players.some((p) => p.name === myName)) {
        navigate("/");
        return;
      }
      setGame(data);
      if (data.status !== "lobby") {
        navigate(`/game/${code}`);
      }
    });
    return () => unsub();
  }, [code, myName, navigate]);

  if (!game) return <div style={{ textAlign: "center", padding: "2rem" }}><p>Loading…</p></div>;

  const players = game.players || [];
  const isHost = myName === game.host;

  // Sort: host first within each team, then by name
  const sorted = [...players].sort((a, b) => {
    if (a.isHost && !b.isHost) return -1;
    if (!a.isHost && b.isHost) return 1;
    return a.name.localeCompare(b.name);
  });
  const teamA = sorted.filter((p) => p.team === "A");
  const teamB = sorted.filter((p) => p.team === "B");

  return (
    <div style={{ textAlign: "center", padding: "2rem" }}>
      <h1>🎭 {game.gameName || "Lobby"}</h1>
      <div
        style={{
          display: "inline-block",
          background: "#f3f4f6",
          borderRadius: "8px",
          padding: "0.5rem 1.5rem",
          marginBottom: "1.5rem",
        }}
      >
        <span style={{ fontSize: "0.85rem", color: "#6b7280" }}>Lobby Code</span>
        <div style={{ fontSize: "2rem", fontWeight: "bold", letterSpacing: "0.15em" }}>{code}</div>
        <span style={{ fontSize: "0.8rem", color: "#9ca3af" }}>Share with friends</span>
      </div>

      {/* Team columns */}
      <div style={{ display: "flex", justifyContent: "center", gap: "2rem", marginBottom: "2rem" }}>
        {[{ team: "A", list: teamA }, { team: "B", list: teamB }].map(({ team, list }) => (
          <div
            key={team}
            style={{
              minWidth: "160px",
              border: `2px solid ${TEAM_COLORS[team]}`,
              borderRadius: "8px",
              padding: "0.75rem",
            }}
          >
            <h3 style={{ color: TEAM_COLORS[team], margin: "0 0 0.75rem" }}>Team {team}</h3>
            {list.length === 0 && <p style={{ color: "#9ca3af", fontSize: "0.85rem" }}>No players</p>}
            {list.map((p) => (
              <div
                key={p.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "0.5rem",
                  marginBottom: "0.4rem",
                }}
              >
                <span>
                  {p.name} {p.isHost ? "👑" : ""}
                </span>
                {isHost && (
                  <span style={{ display: "flex", gap: "0.25rem" }}>
                    <button
                      onClick={() => movePlayerTeam(code, p.name)}
                      title={`Move to Team ${team === "A" ? "B" : "A"}`}
                      style={{ fontSize: "0.75rem", padding: "2px 6px", cursor: "pointer" }}
                    >
                      ⇄
                    </button>
                    {!p.isHost && (
                      <button
                        onClick={() => removePlayer(code, p.name)}
                        title="Remove player"
                        style={{ fontSize: "0.75rem", padding: "2px 6px", cursor: "pointer", color: "red" }}
                      >
                        ✕
                      </button>
                    )}
                  </span>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      {isHost ? (
        <button
          onClick={() => startGame(code)}
          disabled={players.length < 2}
          style={{ padding: "0.75rem 2rem", fontSize: "1rem", cursor: "pointer" }}
        >
          Start Game
        </button>
      ) : (
        <p style={{ color: "#6b7280" }}>Waiting for the host to start…</p>
      )}
    </div>
  );
}

