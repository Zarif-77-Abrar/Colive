import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import dns from "dns";
import { connectDB } from "./config/db.js";

import authRoutes           from "./routes/authRoutes.js";
import adminRoutes          from "./routes/adminRoutes.js";
import propertyRoutes       from "./routes/propertyRoutes.js";
import bookingRoutes        from "./routes/bookingRoutes.js";
import paymentRoutes        from "./routes/paymentRoutes.js";
import maintenanceRoutes    from "./routes/maintenanceRoutes.js";
import noticeRoutes         from "./routes/noticeRoutes.js";
// ── My feature routes (do not modify groupmates' routes above) ──
import recommendationRoutes from "./routes/recommendationRoutes.js";
import listingRoutes        from "./routes/listingRoutes.js";
import messageRoutes        from "./routes/messageRoutes.js";
import auth                 from "./middleware/auth.js";
import { registerFcmToken } from "./controllers/listingController.js";

dns.setServers(["1.1.1.1", "8.8.8.8"]);
dotenv.config();

const app = express();

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests from localhost on any port (dev mode)
    if (!origin || /localhost:|127\.0\.0\.1:|192\.168\./.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));
app.use(express.json());

connectDB();

// ── Routes ─────────────────────────────────────────────────
app.use("/api/auth",        authRoutes);
app.use("/api/admin",       adminRoutes);
app.use("/api/properties",  propertyRoutes);
app.use("/api/bookings",    bookingRoutes);
app.use("/api/payments",    paymentRoutes);
app.use("/api/maintenance", maintenanceRoutes);
app.use("/api/notices",          noticeRoutes);
// ── My feature endpoints ────────────────────────────────────
app.use("/api/recommendations",  recommendationRoutes);
app.use("/api/listing",          listingRoutes);
app.use("/api/messages",         messageRoutes);
// FCM token registration (auth protected)
app.post("/api/auth/fcm-token",  auth, registerFcmToken);

// Health check
app.get("/api/health", (req, res) => res.json({ status: "CoLive API running" }));

const PORT = process.env.PORT || 9209;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
