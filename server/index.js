import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// API routes
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// TODO: Add your game/party API routes here
// import apiRouter from "./routes/api.js";
// app.use("/api", apiRouter);

// Serve static frontend files (from Vite build output)
const distPath = path.join(__dirname, "..", "dist");
app.use(express.static(distPath));

// Fallback to index.html for client-side routing
app.get("/{*splat}", (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
