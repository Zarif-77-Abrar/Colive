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
import mealRoutes           from "./routes/mealRoutes.js";
import compatibilityRoutes  from "./routes/compatibilityRoutes.js";
import conversationRoutes   from "./routes/conversationRoutes.js";
import utilityBillRoutes    from "./routes/utilityBillRoutes.js";
import agreementRoutes      from "./routes/agreementRoutes.js";
import { stripeWebhook }    from "./controllers/paymentController.js";
import alertRoutes          from "./routes/alertRoutes.js";
import recommendationRoutes from "./routes/recommendationRoutes.js";
import listingRoutes        from "./routes/listingRoutes.js";
import messageRoutes        from "./routes/messageRoutes.js";
import auth                 from "./middleware/auth.js";
import { registerFcmToken } from "./controllers/listingController.js";

dns.setServers(["1.1.1.1", "8.8.8.8"]);
dotenv.config({ override: true });

const app = express();

app.use(cors({ origin: true, credentials: true }));
// app.use(cors({
//   origin: function (origin, callback) {
//     // Allow requests from localhost on any port (dev mode)
//     if (!origin || /localhost:|127\.0\.0\.1:|192\.168\./.test(origin)) {
//       callback(null, true);
//     } else {
//       callback(new Error("Not allowed by CORS"));
//     }
//   },
//   credentials: true,
// }));

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
app.use("/api/meals",         mealRoutes);
app.use("/api/compatibility", compatibilityRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/bills",         utilityBillRoutes);
app.use("/api/agreements",    agreementRoutes);
app.use("/api/alerts",        alertRoutes);
app.use("/api/recommendations",  recommendationRoutes);
app.use("/api/listing",          listingRoutes);
app.use("/api/messages",         messageRoutes);
app.use("/api/conversations",    conversationRoutes);
// FCM token registration (auth protected)
app.post("/api/auth/fcm-token",  auth, registerFcmToken);

app.get("/api/health", (req, res) => res.json({ status: "CoLive API running" }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
