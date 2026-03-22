import express from "express";
import { connectDB } from "./config/db.js";
import dotenv from "dotenv";
import dns from "dns";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";


dns.setServers(["1.1.1.1", "8.8.8.8"]);
dotenv.config();

const app = express();

app.use(cors({
  origin: "http://localhost:3000",
  credentials: true,
}));

app.use(express.json());

connectDB();

// ── Routes ─────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);


// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "CoLive API running" });
});

const PORT = process.env.PORT || 1494;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});