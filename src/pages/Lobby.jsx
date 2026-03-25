import { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { subscribeToGame } from "../firebase/gameService";

export default function Lobby() {
  const { code } = useParams();
  const { state } = useLocation();
  const [game, setGame] = useState(null);

  useEffect(() => {
    const unsubscribe = subscribeToGame(code, setGame);
    return () => unsubscribe();
  }, [code]);

  if (!game) return <p>Loading...</p>;

  return (
    <div style={{ textAlign: "center", padding: "2rem" }}>
      <h1>🎭 Lobby</h1>
      <h2>Code: {code}</h2>
      <p>Share this code with friends!</p>
      <h3>Players ({game.players.length})</h3>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {game.players.map((p) => (
          <li key={p}>
            {p} {p === game.host ? "👑" : ""}
          </li>
        ))}
      </ul>
      {state?.playerName === game.host && (
        <button onClick={() => alert("TODO: Start game")}>Start Game</button>
      )}
    </div>
  );
}
