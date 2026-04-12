// src/App.jsx
// React Router configuration.
// Routes:
//   /              → Home (create or join a game)
//   /host/:gameId  → HostLobby (host control screen)
//   /play/:gameId  → PlayerLobby (player screen)

import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./screens/Home";
import HostLobby from "./screens/HostLobby";
import PlayerLobby from "./screens/PlayerLobby";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/host/:gameId" element={<HostLobby />} />
        <Route path="/play/:gameId" element={<PlayerLobby />} />
      </Routes>
    </BrowserRouter>
  );
}
