// src/App.jsx
// React Router configuration.
// Routes:
//   /              → Home (two buttons: New Game / Join Game)
//   /new-game      → Create a new game (choose game type)
//   /join          → Join an existing game by code
//   /lobby/:code   → Lobby waiting room
//   /monikers/:code → Monikers game (card submission + rounds)

import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import NewGame from "./pages/NewGame";
import JoinGame from "./pages/JoinGame";
import Lobby from "./pages/Lobby";
import Monikers from "./pages/monikers/index";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/new-game" element={<NewGame />} />
        <Route path="/join" element={<JoinGame />} />
        <Route path="/lobby/:code" element={<Lobby />} />
        <Route path="/monikers/:code" element={<Monikers />} />
      </Routes>
    </BrowserRouter>
  );
}

