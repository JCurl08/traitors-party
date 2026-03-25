// src/App.jsx
// React Router configuration.
// Routes:
//   /            → Home (create or join a game)
//   /lobby/:code → Lobby (lobby screen)

import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Lobby from "./pages/Lobby";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/lobby/:code" element={<Lobby />} />
      </Routes>
    </BrowserRouter>
  );
}
