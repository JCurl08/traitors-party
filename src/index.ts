import express from "express";
import { db } from "./firebaseAdmin";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get("/", (_req, res) => {
  res.send("Traitors Party server is running!");
});

// Example: Get all documents from a "players" collection
app.get("/players", async (_req, res) => {
  try {
    const snapshot = await db.collection("players").get();
    const players = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json(players);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch players" });
  }
});

// Example: Add a player
app.post("/players", async (req, res) => {
  try {
    const docRef = await db.collection("players").add(req.body);
    res.status(201).json({ id: docRef.id });
  } catch (error) {
    res.status(500).json({ error: "Failed to add player" });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
