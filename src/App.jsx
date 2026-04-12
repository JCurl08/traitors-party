// src/App.jsx
// React Router configuration.
// Routes:
//   /            → Landing (two-button home screen)
//   /new-game    → NewGame (enter name + pick game type → lobby)
//   /join-game   → JoinGame (enter name + code → lobby)
//   /lobby/:code → Lobby (team view, host controls)
//   /game/:code  → Game (entry → rules → play → score)

import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import NewGame from "./pages/NewGame";
import JoinGame from "./pages/JoinGame";
import Lobby from "./pages/Lobby";
import Game from "./pages/Game";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/new-game" element={<NewGame />} />
        <Route path="/join-game" element={<JoinGame />} />
        <Route path="/lobby/:code" element={<Lobby />} />
        <Route path="/game/:code" element={<Game />} />
      </Routes>
    </BrowserRouter>
  );
}
