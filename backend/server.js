import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import dns from "dns";
import { connectDB } from "./config/db.js";

import authRoutes           from "./routes/authRoutes.js";
import adminRoutes          from "./routes/adminRoutes.js";
import userRoutes           from "./routes/userRoutes.js";
import propertyRoutes       from "./routes/propertyRoutes.js";
import bookingRoutes        from "./routes/bookingRoutes.js";
import paymentRoutes        from "./routes/paymentRoutes.js";
import maintenanceRoutes    from "./routes/maintenanceRoutes.js";
import guestLogRoutes       from "./routes/guestLogRoutes.js";
import noticeRoutes         from "./routes/noticeRoutes.js";
import compatibilityRoutes  from "./routes/compatibilityRoutes.js";
import conversationRoutes   from "./routes/conversationRoutes.js";
import utilityBillRoutes    from "./routes/utilityBillRoutes.js";
import agreementRoutes      from "./routes/agreementRoutes.js";
import { stripeWebhook }    from "./controllers/paymentController.js";
import alertRoutes         from "./routes/alertRoutes.js";

dns.setServers(["1.1.1.1", "8.8.8.8"]);
dotenv.config({ override: true });

const app = express();

app.use(cors({ origin: "http://localhost:3000", credentials: true }));

// Stripe webhook must come before express.json()
app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhook
);

app.use(express.json());

connectDB();

// ── Routes ─────────────────────────────────────────────────
app.use("/api/auth",          authRoutes);
app.use("/api/admin",         adminRoutes);
app.use("/api/users",         userRoutes);
app.use("/api/properties",    propertyRoutes);
app.use("/api/bookings",      bookingRoutes);
app.use("/api/payments",      paymentRoutes);
app.use("/api/maintenance",   maintenanceRoutes);
app.use("/api/guests",        guestLogRoutes);
app.use("/api/notices",       noticeRoutes);
app.use("/api/compatibility", compatibilityRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/bills",         utilityBillRoutes);
app.use("/api/agreements",    agreementRoutes);
app.use("/api/alerts",         alertRoutes);

app.get("/api/health", (req, res) => res.json({ status: "CoLive API running" }));

const PORT = process.env.PORT || 1494;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));